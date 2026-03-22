// entity/Inventory.java
package com.romen.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "inventory",
        indexes = {
                @Index(name = "idx_inventory_medication", columnList = "medication_id"),
                @Index(name = "idx_inventory_low_stock", columnList = "is_low_stock")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medication_id", nullable = false, unique = true)
    private Medication medication;

    @Builder.Default
    @Column(name = "current_quantity", nullable = false)
    private Integer currentQuantity = 0;

    @Builder.Default
    @Column(name = "reserved_quantity")
    private Integer reservedQuantity = 0;

    @Builder.Default
    @Column(name = "available_quantity")
    private Integer availableQuantity = 0;

    @Column(name = "last_stock_in")
    private LocalDateTime lastStockIn;

    @Column(name = "last_stock_out")
    private LocalDateTime lastStockOut;

    @Builder.Default
    @Column(name = "is_low_stock")
    private Boolean isLowStock = false;

    @Builder.Default
    @Column(name = "is_out_of_stock")
    private Boolean isOutOfStock = true;

    @Version
    private Long version;

    @Column(name = "location", length = 100)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    private void calculateAvailableQuantity() {
        if (currentQuantity == null) currentQuantity = 0;
        if (reservedQuantity == null) reservedQuantity = 0;
        this.availableQuantity = currentQuantity - reservedQuantity;

        // Update stock status flags
        if (medication != null && medication.getMinStockLevel() != null) {
            this.isLowStock = currentQuantity <= medication.getMinStockLevel();
        }
        this.isOutOfStock = currentQuantity <= 0;
    }

    public Integer getAvailableQuantity() {
        if (currentQuantity == null) currentQuantity = 0;
        if (reservedQuantity == null) reservedQuantity = 0;
        return currentQuantity - reservedQuantity;
    }
}
