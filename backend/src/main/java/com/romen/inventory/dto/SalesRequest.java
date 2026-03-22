package com.romen.inventory.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesRequest {

    private String customerName;

    private String customerMobile;

    private String patientAddress;

    // Prescription / Doctor info
    private String doctorName;

    private String doctorRegNumber;

    private String prescriptionImageUrl;

    private Boolean insuranceClaim;

    @NotEmpty(message = "At least one item is required")
    private List<SalesItemRequest> items;

    private BigDecimal discountAmount;

    private String paymentMethod;

    private String notes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalesItemRequest {

        @NotNull(message = "Medication ID is required")
        private Long medicationId;

        private Long batchId;

        @NotNull(message = "Quantity is required")
        @Positive(message = "Quantity must be positive")
        private Integer quantity;

        private BigDecimal unitPrice;

        private BigDecimal discountAmount;
    }
}
