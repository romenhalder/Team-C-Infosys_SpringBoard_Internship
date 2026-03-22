package com.romen.inventory.dto;

import com.romen.inventory.entity.Medication;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicationRequest {

    @NotBlank(message = "Medication name is required")
    private String name;

    private String chemicalName;

    private String description;

    private String productCode;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @NotNull(message = "Medication type is required")
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

    private String hsnCode;

    private MultipartFile image;

    @Min(value = 0, message = "Minimum stock level cannot be negative")
    private Integer minStockLevel = 10;

    @Min(value = 0, message = "Maximum stock level cannot be negative")
    private Integer maxStockLevel = 1000;

    @Min(value = 0, message = "Reorder point cannot be negative")
    private Integer reorderPoint = 20;

    private Integer expiryDays;

    private Boolean isActive = true;

    private Boolean isSellable = true;

    private Long supplierId;

    private Integer initialStock;
}
