package com.romen.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchResponse {
    private Long id;
    private Long medicationId;
    private String medicationName;
    private String batchNumber;
    private LocalDate manufacturerDate;
    private LocalDate expiryDate;
    private BigDecimal mrp;
    private BigDecimal ptr;
    private BigDecimal pts;
    private Integer currentStock;
    private Integer reservedStock;
    private Integer availableStock;
    private String locationInStore;
    private Boolean isQuarantined;
    private String quarantineReason;
    private LocalDateTime quarantinedAt;
    private String supplierName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Computed flags
    private Boolean isExpired;
    private Boolean isExpiringSoon;
    private Integer daysUntilExpiry;
}
