package com.canchalibre.payment;

import com.canchalibre.booking.Booking;
import com.canchalibre.booking.BookingRepository;
import com.canchalibre.booking.BookingStatus;
import com.canchalibre.common.EmailService;
import com.canchalibre.complex.SportsComplex;
import com.canchalibre.court.Court;
import com.canchalibre.slot.Slot;
import com.canchalibre.slot.SlotStatus;
import com.mercadopago.exceptions.MPException;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * HU-11: webhooks idempotentes. La lógica de MP no se modifica, solo se testea.
 * Nota: com.mercadopago.resources.payment.Payment se usa siempre cualificado
 * para no chocar con la entidad Payment de este paquete.
 */
@ExtendWith(MockitoExtension.class)
class WebhookServiceTest {

    @Mock private MercadoPagoGateway mercadoPagoGateway;
    @Mock private BookingRepository bookingRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private EmailService emailService;

    @InjectMocks private WebhookService webhookService;

    private Booking booking;
    private Slot slot;

    @BeforeEach
    void setUp() {
        SportsComplex complex = new SportsComplex();
        complex.setId(1L);
        complex.setName("Club Test");

        Court court = new Court();
        court.setId(100L);
        court.setName("Cancha 1");
        court.setComplex(complex);

        slot = new Slot();
        slot.setId(1000L);
        slot.setCourt(court);
        slot.setStartAt(Instant.now().plusSeconds(3600));
        slot.setEndAt(Instant.now().plusSeconds(7200));
        slot.setStatus(SlotStatus.EN_PROCESO_PAGO);

        booking = new Booking();
        booking.setId(7L);
        booking.setSlot(slot);
        booking.setComplex(complex);
        booking.setTotalAmount(new BigDecimal("20000"));
        booking.setDepositAmount(new BigDecimal("6000"));
        booking.setRemainingAmount(new BigDecimal("14000"));
        booking.setStatus(BookingStatus.PENDIENTE_PAGO);
    }

    /**
     * El SDK de MP no expone setters y Mockito no puede stubbear sus metodos
     * finales, asi que llenamos los campos privados por reflexion (el SDK y
     * este test viven en el modulo sin nombre, setAccessible permitido).
     */
    private com.mercadopago.resources.payment.Payment mpPayment(String status, Long mpId, String externalReference) {
        com.mercadopago.resources.payment.Payment mp = new com.mercadopago.resources.payment.Payment();
        setField(mp, "id", mpId);
        setField(mp, "status", status);
        setField(mp, "externalReference", externalReference);
        setField(mp, "transactionAmount", new BigDecimal("6000"));
        return mp;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field field = null;
            for (Class<?> c = target.getClass(); c != null; c = c.getSuperclass()) {
                try {
                    field = c.getDeclaredField(name);
                    break;
                } catch (NoSuchFieldException ignored) {
                }
            }
            if (field == null) throw new NoSuchFieldException(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("No se pudo poblar el Payment del SDK: " + name, e);
        }
    }

    @Test
    void notificacionDuplicadaNoHaceNada() throws Exception {
        when(paymentRepository.existsByMpPaymentId(555L)).thenReturn(true);

        webhookService.processPaymentNotification(555L);

        verifyNoInteractions(mercadoPagoGateway);
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void pagoNoAprobadoSeIgnora() throws Exception {
        when(paymentRepository.existsByMpPaymentId(556L)).thenReturn(false);
        when(mercadoPagoGateway.getPayment(556L)).thenReturn(mpPayment("pending", 556L, "7"));

        webhookService.processPaymentNotification(556L);

        verify(paymentRepository, never()).save(any());
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDIENTE_PAGO);
    }

    @Test
    void pagoAprobadoConfirmaReservaYSlotYEmiteComprobante() throws Exception {
        when(paymentRepository.existsByMpPaymentId(555L)).thenReturn(false);
        when(mercadoPagoGateway.getPayment(555L)).thenReturn(mpPayment("approved", 555L, "7"));
        when(bookingRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(booking));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        webhookService.processPaymentNotification(555L);

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMADA);
        assertThat(slot.getStatus()).isEqualTo(SlotStatus.CONFIRMADO);
        assertThat(slot.getLockExpiresAt()).isNull();

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getMpPaymentId()).isEqualTo(555L);
        assertThat(captor.getValue().getStatus()).isEqualTo(PaymentStatus.APPROVED);

        verify(emailService).sendBookingReceipt(booking);
    }

    @Test
    void segundaNotificacionSobreReservaYaConfirmadaNoDuplica() throws Exception {
        booking.setStatus(BookingStatus.CONFIRMADA);
        when(paymentRepository.existsByMpPaymentId(557L)).thenReturn(false);
        when(mercadoPagoGateway.getPayment(557L)).thenReturn(mpPayment("approved", 557L, "7"));
        when(bookingRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(booking));

        webhookService.processPaymentNotification(557L);

        verify(paymentRepository, never()).save(any());
        verify(emailService, never()).sendBookingReceipt(any());
    }

    @Test
    void externalReferenceInexistenteDa404() throws Exception {
        when(paymentRepository.existsByMpPaymentId(558L)).thenReturn(false);
        when(mercadoPagoGateway.getPayment(558L)).thenReturn(mpPayment("approved", 558L, "999"));
        when(bookingRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> webhookService.processPaymentNotification(558L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void errorDeLaApiDeMpSePropagaComoConflicto() throws Exception {
        when(paymentRepository.existsByMpPaymentId(559L)).thenReturn(false);
        when(mercadoPagoGateway.getPayment(559L)).thenThrow(new MPException("boom"));

        assertThatThrownBy(() -> webhookService.processPaymentNotification(559L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Mercado Pago");
    }
}
