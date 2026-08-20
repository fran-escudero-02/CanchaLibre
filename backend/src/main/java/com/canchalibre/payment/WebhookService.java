package com.canchalibre.payment;

import com.canchalibre.booking.Booking;
import com.canchalibre.booking.BookingRepository;
import com.canchalibre.booking.BookingStatus;
import com.canchalibre.common.EmailService;
import com.canchalibre.slot.SlotStatus;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WebhookService {

    private final MercadoPagoGateway mercadoPagoGateway;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final EmailService emailService;

    @Transactional
    public void processPaymentNotification(Long mpPaymentId) {
        // Idempotencia (barrera 1): si este pago ya fue procesado, salir sin efectos.
        if (paymentRepository.existsByMpPaymentId(mpPaymentId)) {
            return;
        }
        try {
            // Regla de seguridad: consultar SIEMPRE la API de MP, nunca confiar en el payload del webhook.
            com.mercadopago.resources.payment.Payment mpPayment = mercadoPagoGateway.getPayment(mpPaymentId);
            if (!"approved".equals(mpPayment.getStatus())) {
                return;
            }
            Long bookingId = Long.valueOf(mpPayment.getExternalReference());

            // Idempotencia (barrera 2): lock pesimista + re-chequeo ante reintentos concurrentes.
            Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                    .orElseThrow(() -> new EntityNotFoundException("Reserva inexistente para el pago"));
            if (booking.getStatus() == BookingStatus.CONFIRMADA) {
                return;
            }

            Payment payment = new Payment();
            payment.setBooking(booking);
            payment.setMpPaymentId(mpPayment.getId());
            payment.setStatus(PaymentStatus.APPROVED);
            payment.setAmount(mpPayment.getTransactionAmount());
            payment.setRawPayload(mpPayment.toString());
            paymentRepository.save(payment);

            booking.setStatus(BookingStatus.CONFIRMADA);
            booking.getSlot().setStatus(SlotStatus.CONFIRMADO);
            booking.getSlot().setLockExpiresAt(null);
            booking.getSlot().setLockedByUserId(null);
            emailService.sendBookingReceipt(booking);
        } catch (MPException | MPApiException e) {
            throw new IllegalStateException("Error consultando Mercado Pago", e);
        }
    }
}
