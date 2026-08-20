package com.canchalibre.payment;

import com.canchalibre.booking.Booking;
import com.canchalibre.booking.BookingRepository;
import com.canchalibre.booking.BookingStatus;
import com.canchalibre.common.EmailService;
import com.canchalibre.slot.SlotStatus;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final MercadoPagoGateway mercadoPagoGateway;
    private final EmailService emailService;

    @Value("${app.mp.simulation}")
    private boolean simulation;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Transactional
    public Map<String, Object> checkout(Long bookingId, Long userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Reserva inexistente"));
        if (booking.getStatus() != BookingStatus.PENDIENTE_PAGO) {
            throw new IllegalStateException("La reserva no esta pendiente de pago");
        }
        if (!booking.getPlayer().getId().equals(userId)) {
            throw new AccessDeniedException("No autorizado");
        }
        if (booking.getSlot().getLockExpiresAt() != null
                && booking.getSlot().getLockExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("El tiempo de retencion del turno expiro");
        }

        if (simulation) {
            // Modo demo: confirma la sena sin llamar a Mercado Pago (permite probar el flujo completo).
            Payment payment = new Payment();
            payment.setBooking(booking);
            payment.setMpPaymentId(-System.currentTimeMillis());
            payment.setMpPreferenceId("SIMULACION");
            payment.setStatus(PaymentStatus.APPROVED);
            payment.setAmount(booking.getDepositAmount());
            payment.setRawPayload("{\"simulado\":true}");
            paymentRepository.save(payment);
            booking.setStatus(BookingStatus.CONFIRMADA);
            booking.getSlot().setStatus(SlotStatus.CONFIRMADO);
            booking.getSlot().setLockExpiresAt(null);
            emailService.sendBookingReceipt(booking);
            return Map.of("initPoint", frontendUrl + "/reserva/exito?bookingId=" + booking.getId(),
                    "simulacion", true);
        }

        String initPoint = mercadoPagoGateway.createDepositPreference(booking);
        return Map.of("initPoint", initPoint, "simulacion", false);
    }
}
