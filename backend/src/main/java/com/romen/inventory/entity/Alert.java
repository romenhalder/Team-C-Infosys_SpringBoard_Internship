// entity/Alert.java
package com.romen.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "alerts", indexes = {
        @Index(name = "idx_alerts_medication", columnList = "medication_id"),
        @Index(name = "idx_alerts_type", columnList = "alert_type"),
        @Index(name = "idx_alerts_status", columnList = "is_read"),
        @Index(name = "idx_alerts_created", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medication_id", nullable = true)
    private Medication medication;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private Batch batch;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false, length = 30)
    private AlertType alertType;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "current_quantity")
    private Integer currentQuantity;

    @Column(name = "threshold_quantity")
    private Integer thresholdQuantity;

    @Builder.Default
    @Column(name = "is_read")
    private Boolean isRead = false;

    @Builder.Default
    @Column(name = "is_resolved")
    private Boolean isResolved = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum AlertType {
        LOW_STOCK,              // Stock below minimum level
        OUT_OF_STOCK,           // No stock available
        EXPIRING_SOON,          // Medication expiring soon
        EXPIRED,                // Medication expired
        REORDER_POINT,          // Stock reached reorder point
        OVERSTOCK,              // Stock above maximum level
        BATCH_QUARANTINED,      // Batch quarantined (expired/recalled)
        SCHEDULE_H1_PENDING,    // Schedule H1 entry pending compliance
        USER_PASSWORD_RESET     // Employee/Manager requested password reset
    }

    public void markAsRead() {
        this.isRead = true;
    }

    public void markAsResolved(User user) {
        this.isResolved = true;
        this.resolvedBy = user;
        this.resolvedAt = LocalDateTime.now();
    }
}
