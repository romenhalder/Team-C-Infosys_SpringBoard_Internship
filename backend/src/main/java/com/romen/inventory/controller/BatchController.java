package com.romen.inventory.controller;

import com.romen.inventory.dto.BatchRequest;
import com.romen.inventory.dto.BatchResponse;
import com.romen.inventory.entity.User;
import com.romen.inventory.service.BatchService;
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
@RequestMapping("/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchService batchService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<BatchResponse> createBatch(
            @Valid @RequestBody BatchRequest request,
            Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        BatchResponse response = batchService.createBatch(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/medication/{medicationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<List<BatchResponse>> getBatchesByMedication(@PathVariable Long medicationId) {
        return ResponseEntity.ok(batchService.getBatchesByMedication(medicationId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<BatchResponse> getBatchById(@PathVariable Long id) {
        return ResponseEntity.ok(batchService.getBatchById(id));
    }

    @GetMapping("/quarantined")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<BatchResponse>> getQuarantinedBatches() {
        return ResponseEntity.ok(batchService.getQuarantinedBatches());
    }

    @GetMapping("/expiring-soon")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<List<BatchResponse>> getExpiringSoonBatches(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(batchService.getExpiringSoonBatches(days));
    }

    @GetMapping("/expiry-risk-value")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<BigDecimal> getExpiryRiskValue(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(batchService.getExpiryRiskValue(days));
    }
}
