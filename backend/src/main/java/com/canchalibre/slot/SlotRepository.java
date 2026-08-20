package com.canchalibre.slot;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SlotRepository extends JpaRepository<Slot, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Slot s WHERE s.id = :id")
    Optional<Slot> findByIdForUpdate(@Param("id") Long id);

    List<Slot> findByCourtComplexIdAndStartAtBetweenOrderByCourtIdAscStartAtAsc(Long complexId, Instant from, Instant to);

    List<Slot> findByCourtIdAndStartAtBetweenOrderByStartAtAsc(Long courtId, Instant from, Instant to);

    List<Slot> findByStatusAndLockExpiresAtBefore(SlotStatus status, Instant instant);

    boolean existsByCourtIdAndStartAt(Long courtId, Instant startAt);
}
