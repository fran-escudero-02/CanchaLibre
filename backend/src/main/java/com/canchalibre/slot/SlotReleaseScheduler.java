package com.canchalibre.slot;

import com.canchalibre.booking.BookingRepository;
import com.canchalibre.booking.BookingStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SlotReleaseScheduler {

    private final SlotRepository slotRepository;
    private final BookingRepository bookingRepository;

    @Scheduled(fixedRateString = "${app.slot.release-rate-ms}")
    @Transactional
    public void releaseExpiredSlots() {
        List<Slot> expired = slotRepository
                .findByStatusAndLockExpiresAtBefore(SlotStatus.EN_PROCESO_PAGO, Instant.now());
        for (Slot slot : expired) {
            slot.setStatus(SlotStatus.DISPONIBLE);
            slot.setLockExpiresAt(null);
            slot.setLockedByUserId(null);
            bookingRepository.findBySlotAndStatus(slot, BookingStatus.PENDIENTE_PAGO)
                    .ifPresent(booking -> booking.setStatus(BookingStatus.EXPIRADA));
        }
    }
}
