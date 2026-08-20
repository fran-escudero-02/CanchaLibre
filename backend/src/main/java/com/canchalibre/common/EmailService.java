package com.canchalibre.common;

import com.canchalibre.booking.Booking;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    // MVP: el comprobante se registra en el log. Produccion: integrar SendGrid/Resend.
    public void sendBookingReceipt(Booking booking) {
        log.info("[COMPROBANTE] Reserva #{} confirmada | Complejo: {} | Cancha: {} | Inicio: {} | "
                        + "Sena online: ${} | Saldo a pagar en mostrador: ${} | Jugador: {}",
                booking.getId(), booking.getComplex().getName(), booking.getSlot().getCourt().getName(),
                booking.getSlot().getStartAt(), booking.getDepositAmount(), booking.getRemainingAmount(),
                booking.getPlayer() != null ? booking.getPlayer().getEmail() : booking.getGuestName());
    }
}
