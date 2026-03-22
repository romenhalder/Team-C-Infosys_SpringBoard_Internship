package com.romen.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "narcotic_entries",
        indexes = {
                @Index(name = "idx_narc_sales_order", columnList = "sales_order_id"),
                @Index(name = "idx_narc_medication", columnList = "medication_id"),
                @Index(name = "idx_narc_date", columnList = "created_at"),
                @Index(name = "idx_narc_status", columnList = "approval_status")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NarcoticEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_order_id")
    private SalesOrder salesOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medication_id", nullable = false)
    private Medication medication;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private Batch batch;

    @Column(name = "patient_name", nullable = false, length = 200)
    private String patientName;

    @Column(name = "patient_address", columnDefinition = "TEXT")
    private String patientAddress;

    @Column(name = "doctor_name", nullable = false, length = 200)
    private String doctorName;

    @Column(name = "doctor_reg_number", nullable = false, length = 50)
    private String doctorRegNumber;

    @Column(nullable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(name = "id_proof_type", length = 20)
    private IdProofType idProofType;

    @Column(name = "id_proof_number", length = 50)
    private String idProofNumber;

    // Double-approval workflow
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pharmacist_id")
    private User pharmacist;

    @Column(name = "pharmacist_approved")
    @Builder.Default
    private Boolean pharmacistApproved = false;

    @Column(name = "pharmacist_approved_at")
    private LocalDateTime pharmacistApprovedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supervisor_id")
    private User supervisor;

    @Column(name = "supervisor_approved")
    @Builder.Default
    private Boolean supervisorApproved = false;

    @Column(name = "supervisor_approved_at")
    private LocalDateTime supervisorApprovedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", length = 20)
    @Builder.Default
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum IdProofType {
        AADHAR,
        PAN,
        PASSPORT,
        VOTER_ID,
        DRIVING_LICENSE
    }

    public enum ApprovalStatus {
        PENDING,
        PHARMACIST_APPROVED,
        FULLY_APPROVED,
        REJECTED
    }
}
