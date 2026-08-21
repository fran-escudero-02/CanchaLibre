package com.canchalibre.booking;

import com.canchalibre.slot.Slot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    // EntityGraph evita N+1 al mapear complejo y cancha del slot en el historial (HU-03).
    @EntityGraph(attributePaths = {"complex", "slot.court"})
    Page<Booking> findByPlayerIdOrderBySlotStartAtAsc(Long playerId, Pageable pageable);

    List<Booking> findByComplexIdAndSlotStartAtBetween(Long complexId, Instant from, Instant to);

    Optional<Booking> findBySlotAndStatus(Slot slot, BookingStatus status);
}
