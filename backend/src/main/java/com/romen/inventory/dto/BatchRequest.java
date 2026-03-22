package com.romen.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchRequest {

    @NotNull(message = "Medication ID is required")
    private Long medicationId;

    @NotBlank(message = "Batch number is required")
    private String batchNumber;

    private LocalDate manufacturerDate;

    @NotNull(message = "Expiry date is required")
    private LocalDate expiryDate;

    private BigDecimal mrp;

    private BigDecimal ptr;

    private BigDecimal pts;

    private Integer initialStock = 0;

    private String locationInStore;

    private Long supplierId;
}
