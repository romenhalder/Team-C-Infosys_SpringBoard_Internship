package com.romen.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "batches",
        indexes = {
                @Index(name = "idx_batches_medication", columnList = "medication_id"),
                @Index(name = "idx_batches_expiry", columnList = "expiry_date"),
                @Index(name = "idx_batches_quarantine", columnList = "is_quarantined"),
                @Index(name = "idx_batches_number", columnList = "batch_number")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_batch_medication", columnNames = {"batch_number", "medication_id"})
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Batch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medication_id", nullable = false)
    private Medication medication;

    @Column(name = "batch_number", nullable = false, length = 50)
    private String batchNumber;

    @Column(name = "manufacturer_date")
    private LocalDate manufacturerDate;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "mrp", precision = 10, scale = 2)
    private BigDecimal mrp;

    @Column(name = "ptr", precision = 10, scale = 2)
    private BigDecimal ptr;

    @Column(name = "pts", precision = 10, scale = 2)
    private BigDecimal pts;

    @Builder.Default
    @Column(name = "current_stock", nullable = false)
    private Integer currentStock = 0;

    @Builder.Default
    @Column(name = "reserved_stock")
    private Integer reservedStock = 0;

    @Column(name = "location_in_store", length = 100)
    private String locationInStore;

    @Builder.Default
    @Column(name = "is_quarantined")
    private Boolean isQuarantined = false;

    @Column(name = "quarantine_reason", length = 500)
    private String quarantineReason;

    @Column(name = "quarantined_at")
    private LocalDateTime quarantinedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Version
    private Long version;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Integer getAvailableStock() {
        int curr = currentStock != null ? currentStock : 0;
        int res = reservedStock != null ? reservedStock : 0;
        return curr - res;
    }

    public boolean isExpired() {
        return expiryDate != null && expiryDate.isBefore(LocalDate.now());
    }

    public boolean isExpiringSoon(int daysThreshold) {
        if (expiryDate == null) return false;
        LocalDate threshold = LocalDate.now().plusDays(daysThreshold);
        return expiryDate.isBefore(threshold) && !isExpired();
    }

    @PrePersist
    @PreUpdate
    private void validate() {
        if (currentStock == null) currentStock = 0;
        if (reservedStock == null) reservedStock = 0;
        if (currentStock < 0) {
            throw new IllegalArgumentException("Batch stock cannot be negative");
        }
        // Auto-quarantine expired batches
        if (isExpired() && !Boolean.TRUE.equals(isQuarantined)) {
            isQuarantined = true;
            quarantineReason = "AUTO: Batch expired on " + expiryDate;
            quarantinedAt = LocalDateTime.now();
        }
    }
}
