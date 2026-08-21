package com.canchalibre.payment;

import com.canchalibre.booking.Booking;
import com.canchalibre.booking.BookingRepository;
import com.canchalibre.booking.BookingStatus;
import com.canchalibre.common.EmailService;
import com.canchalibre.complex.SportsComplex;
import com.canchalibre.court.Court;
import com.canchalibre.slot.Slot;
import com.canchalibre.slot.SlotStatus;
import com.canchalibre.user.User;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private MercadoPagoGateway mercadoPagoGateway;
    @Mock private EmailService emailService;

    @InjectMocks private PaymentService paymentService;

    private Booking booking;
    private Slot slot;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "simulation", true);
        ReflectionTestUtils.setField(paymentService, "frontendUrl", "http://localhost:5173");

        User player = new User();
        player.setId(10L);

        SportsComplex complex = new SportsComplex();
        complex.setId(1L);

        Court court = new Court();
        court.setId(100L);
        court.setComplex(complex);

        slot = new Slot();
        slot.setId(1000L);
        slot.setCourt(court);
        slot.setStartAt(Instant.now().plusSeconds(7200));
        slot.setEndAt(Instant.now().plusSeconds(10800));
        slot.setStatus(SlotStatus.EN_PROCESO_PAGO);
        slot.setLockExpiresAt(Instant.now().plusSeconds(600));

        booking = new Booking();
        booking.setId(7L);
        booking.setSlot(slot);
        booking.setPlayer(player);
        booking.setComplex(complex);
        booking.setTotalAmount(new BigDecimal("20000"));
        booking.setDepositAmount(new BigDecimal("6000"));
        booking.setRemainingAmount(new BigDecimal("14000"));
        booking.setStatus(BookingStatus.PENDIENTE_PAGO);
    }

    @Test
    void checkoutEnModoSimulacionConfirmaLaReserva() {
        when(bookingRepository.findById(7L)).thenReturn(Optional.of(booking));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> res = paymentService.checkout(7L, 10L);

        assertThat(res.get("simulacion")).isEqualTo(true);
        assertThat((String) res.get("initPoint"))
                .isEqualTo("http://localhost:5173/reserva/exito?bookingId=7");
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMADA);
        assertThat(slot.getStatus()).isEqualTo(SlotStatus.CONFIRMADO);
        verify(emailService).sendBookingReceipt(booking);
    }

    @Test
    void checkoutRechazaAjenoALaReserva() {
        when(bookingRepository.findById(7L)).thenReturn(Optional.of(booking));
        assertThatThrownBy(() -> paymentService.checkout(7L, 99L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void checkoutRechazaReservaYaConfirmada() {
        booking.setStatus(BookingStatus.CONFIRMADA);
        when(bookingRepository.findById(7L)).thenReturn(Optional.of(booking));
        assertThatThrownBy(() -> paymentService.checkout(7L, 10L))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void checkoutRechazaRetencionExpirada() {
        slot.setLockExpiresAt(Instant.now().minusSeconds(60));
        when(bookingRepository.findById(7L)).thenReturn(Optional.of(booking));
        assertThatThrownBy(() -> paymentService.checkout(7L, 10L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("expir");
    }

    @Test
    void checkoutConReservaInexistenteDa404() {
        when(bookingRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> paymentService.checkout(99L, 10L))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
