package com.romen.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "medications",
        indexes = {
                @Index(name = "idx_medications_name", columnList = "name"),
                @Index(name = "idx_medications_sku", columnList = "sku"),
                @Index(name = "idx_medications_barcode", columnList = "barcode"),
                @Index(name = "idx_medications_category", columnList = "category_id"),
                @Index(name = "idx_medications_type", columnList = "product_type"),
                @Index(name = "idx_medications_schedule", columnList = "schedule_category"),
                @Index(name = "idx_medications_therapeutic", columnList = "therapeutic_class"),
                @Index(name = "idx_medications_active", columnList = "is_active")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "chemical_name", length = 200)
    private String chemicalName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sku", unique = true, length = 50)
    private String sku;

    @Column(name = "barcode", length = 100)
    private String barcode;

    @Column(name = "hsn_code", length = 20)
    private String hsnCode;

    @Column(name = "product_code", unique = true, length = 50)
    private String productCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", nullable = false, length = 20)
    private MedicationType productType;

    // --- Pharmaceutical-specific fields ---

    @Column(name = "therapeutic_class", length = 100)
    private String therapeuticClass;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_category", length = 10)
    @Builder.Default
    private ScheduleCategory scheduleCategory = ScheduleCategory.OTC;

    @Enumerated(EnumType.STRING)
    @Column(name = "dosage_form", length = 20)
    private DosageForm dosageForm;

    @Column(name = "strength", length = 50)
    private String strength;

    @Column(name = "manufacturer", length = 200)
    private String manufacturer;

    @Column(name = "gst_slab", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal gstSlab = new BigDecimal("12.0");

    @Builder.Default
    @Column(name = "requires_prescription")
    private Boolean requiresPrescription = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_condition", length = 20)
    @Builder.Default
    private StorageCondition storageCondition = StorageCondition.ROOM_TEMP;

    @Column(name = "unit_of_measure", length = 20)
    private String unitOfMeasure;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "cost_price", precision = 10, scale = 2)
    private BigDecimal costPrice;

    @Column(name = "tax_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal taxRate = BigDecimal.ZERO;

    @Column(name = "image_url")
    private String imageUrl;

    @Builder.Default
    @Column(name = "min_stock_level")
    private Integer minStockLevel = 10;

    @Builder.Default
    @Column(name = "max_stock_level")
    private Integer maxStockLevel = 1000;

    @Builder.Default
    @Column(name = "reorder_point")
    private Integer reorderPoint = 20;

    @Column(name = "expiry_days")
    private Integer expiryDays;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "is_sellable")
    private Boolean isSellable = true;

    @OneToMany(mappedBy = "medication", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Batch> batches = new ArrayList<>();

    @Version
    private Long version;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // --- Enums ---

    public enum MedicationType {
        BRANDED,
        GENERIC,
        RAW_MATERIAL
    }

    public enum ScheduleCategory {
        OTC,    // Over the Counter
        G,      // General
        H,      // Schedule H
        H1,     // Schedule H1 (stricter)
        X       // Narcotics / Schedule X
    }

    public enum DosageForm {
        TABLET,
        CAPSULE,
        SYRUP,
        INJECTION,
        OINTMENT,
        DROPS,
        INHALER,
        CREAM,
        GEL,
        POWDER,
        SUSPENSION,
        SOLUTION
    }

    public enum StorageCondition {
        ROOM_TEMP,
        REFRIGERATED,
        FROZEN
    }

    @PrePersist
    @PreUpdate
    private void validate() {
        if (minStockLevel != null && maxStockLevel != null && minStockLevel > maxStockLevel) {
            throw new IllegalArgumentException("Minimum stock level cannot be greater than maximum stock level");
        }
        if (reorderPoint != null && maxStockLevel != null && reorderPoint > maxStockLevel) {
            throw new IllegalArgumentException("Reorder point cannot be greater than maximum stock level");
        }
        if (taxRate == null) {
            taxRate = BigDecimal.ZERO;
        }
        if (sku == null || sku.isEmpty()) {
            sku = generateSKU();
        }
        // Auto-set requiresPrescription for scheduled drugs
        if (scheduleCategory != null && scheduleCategory != ScheduleCategory.OTC && scheduleCategory != ScheduleCategory.G) {
            requiresPrescription = true;
        }
    }

    private String generateSKU() {
        String categoryPrefix = category != null ? category.getName().substring(0, Math.min(3, category.getName().length())).toUpperCase() : "MED";
        String timestamp = String.valueOf(System.currentTimeMillis()).substring(6);
        return categoryPrefix + "-" + timestamp;
    }
}
