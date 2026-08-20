package com.canchalibre.booking;

import com.canchalibre.slot.Slot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    List<Booking> findByPlayerIdOrderBySlotStartAtAsc(Long playerId);

    List<Booking> findByComplexIdAndSlotStartAtBetween(Long complexId, Instant from, Instant to);

    Optional<Booking> findBySlotAndStatus(Slot slot, BookingStatus status);
}
