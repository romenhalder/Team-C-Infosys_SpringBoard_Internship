package com.romen.inventory.dto;

import com.romen.inventory.entity.Medication;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicationResponse {

    private Long id;
    private String name;
    private String chemicalName;
    private String description;
    private String sku;
    private String barcode;
    private String hsnCode;
    private String productCode;
    private Long categoryId;
    private String categoryName;
    private Medication.MedicationType productType;
    private String therapeuticClass;
    private Medication.ScheduleCategory scheduleCategory;
    private Medication.DosageForm dosageForm;
    private String strength;
    private String manufacturer;
    private BigDecimal gstSlab;
    private Boolean requiresPrescription;
    private Medication.StorageCondition storageCondition;
    private String unitOfMeasure;
    private BigDecimal price;
    private BigDecimal costPrice;
    private BigDecimal taxRate;
    private String imageUrl;
    private Integer minStockLevel;
    private Integer maxStockLevel;
    private Integer reorderPoint;
    private Integer expiryDays;
    private Boolean isActive;
    private Boolean isSellable;
    private Long supplierId;
    private String supplierName;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Inventory information
    private Integer currentStock;
    private Integer availableStock;
    private Boolean isLowStock;
    private Boolean isOutOfStock;
}
