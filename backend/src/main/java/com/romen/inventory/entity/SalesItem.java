package com.romen.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sales_items",
        indexes = {
                @Index(name = "idx_sales_items_order", columnList = "sales_order_id"),
                @Index(name = "idx_sales_items_medication", columnList = "medication_id"),
                @Index(name = "idx_sales_items_batch", columnList = "batch_id")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_order_id", nullable = false)
    private SalesOrder salesOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medication_id", nullable = false)
    private Medication medication;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private Batch batch;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", precision = 10, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "mrp", precision = 10, scale = 2)
    private BigDecimal mrp;

    @Column(name = "tax_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "cgst_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal cgstAmount = BigDecimal.ZERO;

    @Column(name = "sgst_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal sgstAmount = BigDecimal.ZERO;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "total_price", precision = 10, scale = 2, nullable = false)
    private BigDecimal totalPrice;

    @Column(name = "gst_slab", precision = 5, scale = 2)
    private BigDecimal gstSlab;

    @Column(name = "hsn_code", length = 20)
    private String hsnCode;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    @PreUpdate
    private void calculateTotalPrice() {
        if (unitPrice != null && quantity != null) {
            BigDecimal lineTotal = unitPrice.multiply(new BigDecimal(quantity));
            BigDecimal discount = discountAmount != null ? discountAmount : BigDecimal.ZERO;
            BigDecimal cgst = cgstAmount != null ? cgstAmount : BigDecimal.ZERO;
            BigDecimal sgst = sgstAmount != null ? sgstAmount : BigDecimal.ZERO;
            this.taxAmount = cgst.add(sgst);
            this.totalPrice = lineTotal.add(taxAmount).subtract(discount);
        }
    }
}
