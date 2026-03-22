package com.romen.inventory.dto;

import com.romen.inventory.entity.SalesOrder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesResponse {

    private Long id;
    private String orderNumber;
    private String customerName;
    private String customerMobile;
    private String patientAddress;
    private String doctorName;
    private String doctorRegNumber;
    private Boolean insuranceClaim;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal cgstAmount;
    private BigDecimal sgstAmount;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private String paymentMethod;
    private String paymentStatus;
    private String orderStatus;
    private Long soldById;
    private String soldByName;
    private List<SalesItemResponse> items;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalesItemResponse {
        private Long id;
        private Long medicationId;
        private String medicationName;
        private String medicationSku;
        private Long batchId;
        private String batchNumber;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal mrp;
        private BigDecimal taxAmount;
        private BigDecimal cgstAmount;
        private BigDecimal sgstAmount;
        private BigDecimal discountAmount;
        private BigDecimal totalPrice;
        private String hsnCode;
        private BigDecimal gstSlab;
    }

    public static SalesResponse fromEntity(SalesOrder order) {
        return SalesResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .customerName(order.getCustomerName())
                .customerMobile(order.getCustomerMobile())
                .patientAddress(order.getPatientAddress())
                .doctorName(order.getDoctorName())
                .doctorRegNumber(order.getDoctorRegNumber())
                .insuranceClaim(order.getInsuranceClaim())
                .subtotal(order.getSubtotal())
                .taxAmount(order.getTaxAmount())
                .cgstAmount(order.getCgstAmount())
                .sgstAmount(order.getSgstAmount())
                .discountAmount(order.getDiscountAmount())
                .totalAmount(order.getTotalAmount())
                .paymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null)
                .paymentStatus(order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null)
                .orderStatus(order.getOrderStatus() != null ? order.getOrderStatus().name() : null)
                .soldById(order.getSoldBy() != null ? order.getSoldBy().getId() : null)
                .soldByName(order.getSoldBy() != null ? order.getSoldBy().getFullName() : null)
                .items(order.getItems() != null ? order.getItems().stream()
                        .map(item -> SalesItemResponse.builder()
                                .id(item.getId())
                                .medicationId(item.getMedication().getId())
                                .medicationName(item.getMedication().getName())
                                .medicationSku(item.getMedication().getSku())
                                .batchId(item.getBatch() != null ? item.getBatch().getId() : null)
                                .batchNumber(item.getBatch() != null ? item.getBatch().getBatchNumber() : null)
                                .quantity(item.getQuantity())
                                .unitPrice(item.getUnitPrice())
                                .mrp(item.getMrp())
                                .taxAmount(item.getTaxAmount())
                                .cgstAmount(item.getCgstAmount())
                                .sgstAmount(item.getSgstAmount())
                                .discountAmount(item.getDiscountAmount())
                                .totalPrice(item.getTotalPrice())
                                .hsnCode(item.getHsnCode())
                                .gstSlab(item.getGstSlab())
                                .build())
                        .collect(Collectors.toList()) : null)
                .notes(order.getNotes())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}
