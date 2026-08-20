package com.canchalibre.slot;

import com.canchalibre.court.Court;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "slots", uniqueConstraints =
        @UniqueConstraint(name = "uk_slot_court_start", columnNames = {"court_id", "start_at"}))
@Getter @Setter @NoArgsConstructor
public class Slot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Court court;

    @Column(nullable = false)
    private Instant startAt;

    @Column(nullable = false)
    private Instant endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SlotStatus status = SlotStatus.DISPONIBLE;

    private Instant lockExpiresAt;
    private Long lockedByUserId;
    private String blockReason;
}
