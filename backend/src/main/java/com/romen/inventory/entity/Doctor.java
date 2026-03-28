package com.romen.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "doctors",
        indexes = {
                @Index(name = "idx_doctor_reg", columnList = "registration_number", unique = true),
                @Index(name = "idx_doctor_name", columnList = "name"),
                @Index(name = "idx_doctor_active", columnList = "is_active")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "registration_number", nullable = false, unique = true, length = 50)
    private String registrationNumber;

    @Column(name = "registration_state", length = 100)
    private String registrationState;

    @Column(name = "registration_valid_until")
    private LocalDateTime registrationValidUntil;

    @Column(length = 100)
    private String specialization;

    @Column(length = 15)
    private String phone;

    @Column(unique = true, length = 150)
    private String email;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "clinic_name", length = 200)
    private String clinicName;

    @Column(name = "clinic_address", columnDefinition = "TEXT")
    private String clinicAddress;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @PrePersist
    @PreUpdate
    private void validate() {
        if (registrationNumber != null && registrationNumber.length() < 5) {
            throw new IllegalArgumentException("Registration number must be at least 5 characters");
        }
        if (email != null && !email.isBlank() && !email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new IllegalArgumentException("Invalid email format");
        }
        if (phone != null && !phone.isBlank() && !phone.matches("^[0-9]{10,15}$")) {
            throw new IllegalArgumentException("Phone must be 10-15 digits");
        }
    }

    public boolean isRegistrationValid() {
        return isActive && (registrationValidUntil == null || registrationValidUntil.isAfter(LocalDateTime.now()));
    }
}
