package com.romen.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "schedule_h1_entries",
        indexes = {
                @Index(name = "idx_h1_sales_order", columnList = "sales_order_id"),
                @Index(name = "idx_h1_medication", columnList = "medication_id"),
                @Index(name = "idx_h1_date", columnList = "created_at"),
                @Index(name = "idx_h1_doctor", columnList = "doctor_reg_number")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleH1Entry {

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

    @Column(name = "invoice_number", length = 50)
    private String invoiceNumber;

    @Column(name = "patient_name", nullable = false, length = 200)
    private String patientName;

    @Column(name = "patient_address", columnDefinition = "TEXT")
    private String patientAddress;

    @Column(name = "drug_name", nullable = false, length = 200)
    private String drugName;

    @Column(name = "batch_number", length = 50)
    private String batchNumber;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "doctor_name", nullable = false, length = 200)
    private String doctorName;

    @Column(name = "doctor_reg_number", nullable = false, length = 50)
    private String doctorRegNumber;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
