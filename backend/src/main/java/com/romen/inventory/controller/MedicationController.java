package com.romen.inventory.controller;

import com.romen.inventory.dto.MedicationRequest;
import com.romen.inventory.dto.MedicationResponse;
import com.romen.inventory.entity.Medication;
import com.romen.inventory.entity.User;
import com.romen.inventory.service.MedicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/medications")
@RequiredArgsConstructor
public class MedicationController {

    private final MedicationService medicationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<MedicationResponse> createMedication(
            @Valid @ModelAttribute MedicationRequest request,
            Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        MedicationResponse response = medicationService.createMedication(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<List<MedicationResponse>> getAllMedications() {
        return ResponseEntity.ok(medicationService.getAllMedications());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<MedicationResponse> getMedicationById(@PathVariable Long id) {
        return ResponseEntity.ok(medicationService.getMedicationById(id));
    }

    @GetMapping("/category/{categoryId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<List<MedicationResponse>> getMedicationsByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(medicationService.getMedicationsByCategory(categoryId));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<List<MedicationResponse>> getMedicationsByType(@PathVariable Medication.MedicationType type) {
        return ResponseEntity.ok(medicationService.getMedicationsByType(type));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<List<MedicationResponse>> searchMedications(@RequestParam String keyword) {
        return ResponseEntity.ok(medicationService.searchMedications(keyword));
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<MedicationResponse>> getLowStockMedications() {
        return ResponseEntity.ok(medicationService.getLowStockMedications());
    }

    @GetMapping("/filter")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<List<MedicationResponse>> filterMedications(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String therapeuticClass,
            @RequestParam(required = false) Medication.ScheduleCategory scheduleCategory,
            @RequestParam(required = false) Medication.MedicationType productType,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice) {
        return ResponseEntity.ok(medicationService.filterMedications(categoryId, therapeuticClass, scheduleCategory,
                productType, minPrice, maxPrice));
    }

    @PostMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<MedicationResponse> updateMedication(
            @PathVariable Long id,
            @Valid @ModelAttribute MedicationRequest request) {
        return ResponseEntity.ok(medicationService.updateMedication(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteMedication(@PathVariable Long id) {
        medicationService.deleteMedication(id);
        return ResponseEntity.noContent().build();
    }
}
