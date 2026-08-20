package com.canchalibre.payment;

import com.canchalibre.booking.Booking;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payments", uniqueConstraints =
        @UniqueConstraint(name = "uk_payment_mp_id", columnNames = "mp_payment_id"))
@Getter @Setter @NoArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Booking booking;

    private String mpPreferenceId;
    private Long mpPaymentId;

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    @Column(precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(length = 4000)
    private String rawPayload;

    private Instant createdAt = Instant.now();
}
