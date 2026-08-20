package com.canchalibre.booking;

import com.canchalibre.common.PaymentGatewayException;
import com.canchalibre.common.SlotNotAvailableException;
import com.canchalibre.payment.MercadoPagoGateway;
import com.canchalibre.payment.PaymentRepository;
import com.canchalibre.payment.PaymentStatus;
import com.canchalibre.slot.Slot;
import com.canchalibre.slot.SlotRepository;
import com.canchalibre.slot.SlotStatus;
import com.canchalibre.user.Role;
import com.canchalibre.user.User;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final SlotRepository slotRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final MercadoPagoGateway mercadoPagoGateway;

    @Value("${app.slot.lock-minutes}")
    private int lockMinutes;

    @Value("${app.cancellation.refund-window-hours}")
    private int refundWindowHours;

    @Value("${app.mp.simulation}")
    private boolean mpSimulation;

    public record BookingInitiateDTO(Long bookingId, BigDecimal sena, BigDecimal saldoMostrador,
                                     Instant expiraEn, String complejo, String cancha, Instant inicio) {}

    @Transactional
    public BookingInitiateDTO initiate(Long slotId, User player) {
        // SELECT FOR UPDATE: dos jugadores simultaneos se serializan aca (anti-colision).
        Slot slot = slotRepository.findByIdForUpdate(slotId)
                .orElseThrow(() -> new EntityNotFoundException("El turno no existe"));

        if (slot.getStatus() != SlotStatus.DISPONIBLE) {
            throw new SlotNotAvailableException("El turno no esta disponible (retenido, ocupado o bloqueado)");
        }

        BigDecimal total = slot.getCourt().getPrice();
        BigDecimal deposit = total.multiply(BigDecimal.valueOf(slot.getCourt().getDepositPercentage()))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        Instant lockExpiry = Instant.now().plus(lockMinutes, ChronoUnit.MINUTES);
        slot.setStatus(SlotStatus.EN_PROCESO_PAGO);
        slot.setLockExpiresAt(lockExpiry);
        slot.setLockedByUserId(player.getId());

        Booking booking = new Booking();
        booking.setSlot(slot);
        booking.setPlayer(player);
        booking.setComplex(slot.getCourt().getComplex());
        booking.setTotalAmount(total);
        booking.setDepositAmount(deposit);
        booking.setRemainingAmount(total.subtract(deposit));
        booking.setStatus(BookingStatus.PENDIENTE_PAGO);
        booking.setSource(BookingSource.ONLINE);
        bookingRepository.save(booking);

        return new BookingInitiateDTO(booking.getId(), deposit, booking.getRemainingAmount(),
                lockExpiry, booking.getComplex().getName(), slot.getCourt().getName(), slot.getStartAt());
    }

    @Transactional
    public Booking createManualBooking(Long slotId, String guestName, String guestPhone, Long complexId) {
        Slot slot = slotRepository.findByIdForUpdate(slotId)
                .orElseThrow(() -> new EntityNotFoundException("El turno no existe"));
        if (!slot.getCourt().getComplex().getId().equals(complexId)) {
            throw new AccessDeniedException("Slot ajeno");
        }
        if (slot.getStatus() != SlotStatus.DISPONIBLE) {
            throw new SlotNotAvailableException("El turno no esta disponible");
        }
        BigDecimal total = slot.getCourt().getPrice();
        Booking booking = new Booking();
        booking.setSlot(slot);
        booking.setComplex(slot.getCourt().getComplex());
        booking.setGuestName(guestName);
        booking.setGuestPhone(guestPhone);
        booking.setTotalAmount(total);
        booking.setDepositAmount(BigDecimal.ZERO);
        booking.setRemainingAmount(total);
        booking.setStatus(BookingStatus.CONFIRMADA);
        booking.setSource(BookingSource.MOSTRADOR);
        bookingRepository.save(booking);
        slot.setStatus(SlotStatus.CONFIRMADO);
        slot.setLockExpiresAt(null);
        slot.setLockedByUserId(null);
        return booking;
    }

    @Transactional
    public String cancel(Long bookingId, User requester) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Reserva inexistente"));

        boolean owner = booking.getPlayer() != null
                && booking.getPlayer().getId().equals(requester.getId());
        boolean complexAdmin = booking.getComplex().getOwner().getId().equals(requester.getId());
        if (!owner && !complexAdmin && requester.getRole() != Role.ROLE_SUPERADMIN) {
            throw new AccessDeniedException("No autorizado para cancelar esta reserva");
        }
        if (booking.getStatus() != BookingStatus.CONFIRMADA) {
            throw new IllegalStateException("Solo se pueden cancelar reservas confirmadas");
        }

        Duration margin = Duration.between(Instant.now(), booking.getSlot().getStartAt());
        if (margin.toHours() >= refundWindowHours) {
            // Margen > 2 hs: reembolso de la sena via Mercado Pago
            paymentRepository.findFirstByBookingIdAndStatusOrderByIdDesc(bookingId, PaymentStatus.APPROVED)
                    .ifPresent(payment -> {
                        if (!mpSimulation) {
                            try {
                                mercadoPagoGateway.refund(payment.getMpPaymentId(), booking.getDepositAmount());
                            } catch (Exception e) {
                                throw new PaymentGatewayException("No se pudo ejecutar el reembolso en Mercado Pago", e);
                            }
                        }
                        payment.setStatus(PaymentStatus.REFUNDED);
                    });
            booking.setStatus(BookingStatus.CANCELADA_REEMBOLSADA);
        } else {
            // Margen <= 2 hs: la sena queda retenida por el complejo
            booking.setStatus(BookingStatus.CANCELADA_RETENIDA);
        }

        Slot slot = booking.getSlot();
        slot.setStatus(SlotStatus.DISPONIBLE);
        slot.setLockExpiresAt(null);
        slot.setLockedByUserId(null);
        return booking.getStatus().name();
    }
}
