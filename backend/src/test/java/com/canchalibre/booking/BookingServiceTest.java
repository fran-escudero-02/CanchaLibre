package com.canchalibre.booking;

import com.canchalibre.common.SlotNotAvailableException;
import com.canchalibre.payment.MercadoPagoGateway;
import com.canchalibre.payment.Payment;
import com.canchalibre.payment.PaymentRepository;
import com.canchalibre.payment.PaymentStatus;
import com.canchalibre.complex.SportsComplex;
import com.canchalibre.court.Court;
import com.canchalibre.slot.Slot;
import com.canchalibre.slot.SlotRepository;
import com.canchalibre.slot.SlotStatus;
import com.canchalibre.user.Role;
import com.canchalibre.user.User;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Tests unitarios de la lógica crítica de reservas y cancelaciones (RNF-06, HU-08, HU-12).
 */
@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock private SlotRepository slotRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private MercadoPagoGateway mercadoPagoGateway;

    @InjectMocks private BookingService bookingService;

    private User player;
    private User owner;
    private User stranger;
    private User superadmin;
    private SportsComplex complex;
    private Court court;
    private Slot slot;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(bookingService, "lockMinutes", 5);
        ReflectionTestUtils.setField(bookingService, "refundWindowHours", 2);
        ReflectionTestUtils.setField(bookingService, "mpSimulation", false);

        player = user(10L, "player@test", Role.ROLE_PLAYER);
        owner = user(20L, "owner@test", Role.ROLE_ADMIN_COMPLEX);
        stranger = user(30L, "stranger@test", Role.ROLE_PLAYER);
        superadmin = user(40L, "super@test", Role.ROLE_SUPERADMIN);

        complex = new SportsComplex();
        complex.setId(1L);
        complex.setName("Club Test");
        complex.setOwner(owner);

        court = new Court();
        court.setId(100L);
        court.setName("Cancha 1");
        court.setComplex(complex);
        court.setPrice(new BigDecimal("20000"));
        court.setDepositPercentage(30);

        slot = new Slot();
        slot.setId(1000L);
        slot.setCourt(court);
        slot.setStartAt(Instant.now().plus(1, ChronoUnit.DAYS));
        slot.setEndAt(Instant.now().plus(1, ChronoUnit.DAYS).plus(1, ChronoUnit.HOURS));
        slot.setStatus(SlotStatus.DISPONIBLE);
    }

    private User user(Long id, String email, Role role) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setFullName("User " + id);
        u.setRole(role);
        return u;
    }

    // ── initiate (HU-08: bloqueo temporal anti-colisión) ──────────────

    @Test
    void initiateCreaReservaPendienteYBloqueaElSlot() {
        when(slotRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(slot));
        when(bookingRepository.save(any(Booking.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        var result = bookingService.initiate(1000L, player);

        assertThat(result.sena()).isEqualByComparingTo("6000.00");
        assertThat(result.saldoMostrador()).isEqualByComparingTo("14000.00");
        assertThat(result.complejo()).isEqualTo("Club Test");
        assertThat(result.cancha()).isEqualTo("Cancha 1");

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository).save(captor.capture());
        Booking saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(BookingStatus.PENDIENTE_PAGO);
        assertThat(saved.getSource()).isEqualTo(BookingSource.ONLINE);
        assertThat(saved.getPlayer().getId()).isEqualTo(10L);
        assertThat(saved.getDepositAmount()).isEqualByComparingTo("6000.00");

        assertThat(slot.getStatus()).isEqualTo(SlotStatus.EN_PROCESO_PAGO);
        assertThat(slot.getLockedByUserId()).isEqualTo(10L);
        assertThat(slot.getLockExpiresAt()).isAfter(Instant.now().plus(4, ChronoUnit.MINUTES));
    }

    @Test
    void initiateRechazaAlDuenoDeComplejo() {
        // El dueño solo registra turnos desde su agenda (manual), nunca via checkout.
        assertThatThrownBy(() -> bookingService.initiate(1000L, owner))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("agenda");
        verifyNoInteractions(slotRepository);
    }

    @Test
    void initiateRechazaTurnosYaIniciados() {
        slot.setStartAt(Instant.now().minus(30, ChronoUnit.MINUTES));
        when(slotRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(slot));

        assertThatThrownBy(() -> bookingService.initiate(1000L, player))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("ya comenzo");
    }

    @Test
    void initiateConSlotInexistenteDa404() {
        when(slotRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> bookingService.initiate(999L, player))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @ParameterizedTest
    @EnumSource(value = SlotStatus.class, names = {"EN_PROCESO_PAGO", "CONFIRMADO", "BLOQUEADO"})
    void initiateRechazaSlotsNoDisponibles(SlotStatus status) {
        slot.setStatus(status);
        when(slotRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(slot));

        assertThatThrownBy(() -> bookingService.initiate(1000L, player))
                .isInstanceOf(SlotNotAvailableException.class);
        verifyNoInteractions(bookingRepository);
    }

    // ── cancel (HU-12: motor de cancelación y reembolsos) ─────────────

    private Booking confirmedBooking(Instant startAt) {
        Booking booking = new Booking();
        booking.setId(7L);
        booking.setSlot(slot);
        booking.setPlayer(player);
        booking.setComplex(complex);
        booking.setTotalAmount(new BigDecimal("20000"));
        booking.setDepositAmount(new BigDecimal("6000"));
        booking.setRemainingAmount(new BigDecimal("14000"));
        booking.setStatus(BookingStatus.CONFIRMADA);
        booking.setSource(BookingSource.ONLINE);
        slot.setStatus(SlotStatus.CONFIRMADO);
        slot.setStartAt(startAt);
        return booking;
    }

    @Test
    void cancelConMargenMayorA2HsReembolsaYLiberarElSlot() throws Exception {
        Booking booking = confirmedBooking(Instant.now().plus(5, ChronoUnit.HOURS));
        when(bookingRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(booking));

        Payment payment = new Payment();
        payment.setId(3L);
        payment.setMpPaymentId(555L);
        payment.setStatus(PaymentStatus.APPROVED);
        payment.setAmount(new BigDecimal("6000"));
        when(paymentRepository.findFirstByBookingIdAndStatusOrderByIdDesc(7L, PaymentStatus.APPROVED))
                .thenReturn(Optional.of(payment));

        String resultado = bookingService.cancel(7L, player);

        assertThat(resultado).isEqualTo("CANCELADA_REEMBOLSADA");
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.REFUNDED);
        verify(mercadoPagoGateway).refund(555L, new BigDecimal("6000"));
        assertThat(slot.getStatus()).isEqualTo(SlotStatus.DISPONIBLE);
        assertThat(slot.getLockExpiresAt()).isNull();
        assertThat(slot.getLockedByUserId()).isNull();
    }

    @Test
    void cancelConMargenDe2HsExactasReembolsa() {
        // Politica: > 2 hs reembolsa, por eso el limite exacto tambien reembolsa.
        Booking booking = confirmedBooking(Instant.now().plus(2, ChronoUnit.HOURS).plusSeconds(30));
        when(bookingRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(booking));
        when(paymentRepository.findFirstByBookingIdAndStatusOrderByIdDesc(anyLong(), any()))
                .thenReturn(Optional.empty());

        String resultado = bookingService.cancel(7L, player);

        assertThat(resultado).isEqualTo("CANCELADA_REEMBOLSADA");
        verifyNoInteractions(mercadoPagoGateway);
    }

    @Test
    void cancelTardioRetieneLaSenaSinLlamarALaPasarela() {
        Booking booking = confirmedBooking(Instant.now().plus(90, ChronoUnit.MINUTES));
        when(bookingRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(booking));

        String resultado = bookingService.cancel(7L, player);

        assertThat(resultado).isEqualTo("CANCELADA_RETENIDA");
        verifyNoInteractions(paymentRepository);
        verifyNoInteractions(mercadoPagoGateway);
        assertThat(slot.getStatus()).isEqualTo(SlotStatus.DISPONIBLE);
    }

    @Test
    void cancelRechazaAJenosALaReserva() {
        Booking booking = confirmedBooking(Instant.now().plus(5, ChronoUnit.HOURS));
        when(bookingRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancel(7L, stranger))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMADA);
    }

    @Test
    void cancelPermitidoAlDuenoSoloParaTurnosManuales() {
        // Turno manual (player = dueño): el dueño puede darlo de baja.
        Booking manual = confirmedBooking(Instant.now().plus(5, ChronoUnit.HOURS));
        manual.setSource(BookingSource.MOSTRADOR);
        manual.setPlayer(owner);
        when(bookingRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(manual));
        assertThat(bookingService.cancel(7L, owner)).isEqualTo("CANCELADA_REEMBOLSADA");

        // Reserva online de un jugador: el dueño NO puede cancelarla (solo el jugador).
        Booking online = confirmedBooking(Instant.now().plus(5, ChronoUnit.HOURS));
        when(bookingRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(online));
        assertThatThrownBy(() -> bookingService.cancel(8L, owner))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("manualmente");
        assertThat(online.getStatus()).isEqualTo(BookingStatus.CONFIRMADA);

        // El propio jugador sí puede cancelar su reserva online.
        assertThat(bookingService.cancel(8L, player)).isEqualTo("CANCELADA_REEMBOLSADA");
    }

    @Test
    void cancelSoloAplicaAReservasConfirmadas() {
        Booking booking = confirmedBooking(Instant.now().plus(5, ChronoUnit.HOURS));
        booking.setStatus(BookingStatus.PENDIENTE_PAGO);
        when(bookingRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancel(7L, player))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void cancelConReservaInexistenteDa404() {
        when(bookingRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> bookingService.cancel(99L, player))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── createManualBooking (HU-14: registro manual en mostrador) ─────

    @Test
    void manualBookingConfirmaDirectamenteSinPagoOnlineYQuedaEnMisReservasDelDueno() {
        slot.setStartAt(Instant.now().plus(1, ChronoUnit.DAYS));
        when(slotRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(slot));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        Booking booking = bookingService.createManualBooking(1000L, "Juan Perez", "1133445566", 1L, owner);

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMADA);
        assertThat(booking.getSource()).isEqualTo(BookingSource.MOSTRADOR);
        assertThat(booking.getDepositAmount()).isEqualByComparingTo("0");
        assertThat(booking.getRemainingAmount()).isEqualByComparingTo("20000");
        // El titular cargado por el dueño queda como guest, y la reserva se
        // asigna al dueño para que figure en sus "Mis reservas".
        assertThat(booking.getGuestName()).isEqualTo("Juan Perez");
        assertThat(booking.getPlayer().getId()).isEqualTo(owner.getId());
        assertThat(slot.getStatus()).isEqualTo(SlotStatus.CONFIRMADO);
    }

    @Test
    void manualBookingRechazaSlotsAjenosAlComplejo() {
        when(slotRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(slot));

        assertThatThrownBy(() -> bookingService.createManualBooking(1000L, "Juan", "11", 2L, owner))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void manualBookingRechazaSlotsOcupados() {
        slot.setStatus(SlotStatus.CONFIRMADO);
        when(slotRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(slot));

        assertThatThrownBy(() -> bookingService.createManualBooking(1000L, "Juan", "11", 1L, owner))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    // ── updateManualBooking (HU-14: edición de titular/teléfono) ──────

    @Test
    void updateManualBookingCambiaTitularYTelefono() {
        Booking manual = confirmedBooking(Instant.now().plus(1, ChronoUnit.DAYS));
        manual.setSource(BookingSource.MOSTRADOR);
        manual.setPlayer(owner);
        manual.setGuestName("Viejo Nombre");
        manual.setGuestPhone("1100000000");
        when(bookingRepository.findById(7L)).thenReturn(Optional.of(manual));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        Booking actualizada = bookingService.updateManualBooking(7L, "Nuevo Nombre", "1199999999", 1L);

        assertThat(actualizada.getGuestName()).isEqualTo("Nuevo Nombre");
        assertThat(actualizada.getGuestPhone()).isEqualTo("1199999999");
    }

    @Test
    void updateManualBookingRechazaReservasOnline() {
        Booking online = confirmedBooking(Instant.now().plus(1, ChronoUnit.DAYS));
        online.setSource(BookingSource.ONLINE);
        when(bookingRepository.findById(7L)).thenReturn(Optional.of(online));

        assertThatThrownBy(() -> bookingService.updateManualBooking(7L, "X", "11", 1L))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void updateManualBookingRechazaReservasAjenas() {
        Booking manual = confirmedBooking(Instant.now().plus(1, ChronoUnit.DAYS));
        manual.setSource(BookingSource.MOSTRADOR);
        when(bookingRepository.findById(7L)).thenReturn(Optional.of(manual));

        assertThatThrownBy(() -> bookingService.updateManualBooking(7L, "X", "11", 2L))
                .isInstanceOf(AccessDeniedException.class);
    }
}
