package com.romen.inventory.controller;

import com.romen.inventory.entity.NarcoticEntry;
import com.romen.inventory.entity.User;
import com.romen.inventory.exception.ResourceNotFoundException;
import com.romen.inventory.repository.NarcoticEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/narcotic-entries")
@RequiredArgsConstructor
@Slf4j
public class NarcoticEntryController {

    private final NarcoticEntryRepository narcoticEntryRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<NarcoticEntry>> getAllEntries() {
        List<NarcoticEntry> entries = narcoticEntryRepository.findAll();
        entries.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<NarcoticEntry>> getPendingApprovals() {
        List<NarcoticEntry> entries = narcoticEntryRepository
                .findByApprovalStatus(NarcoticEntry.ApprovalStatus.PENDING);
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/pharmacist-approved")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<NarcoticEntry>> getPharmacistApproved() {
        List<NarcoticEntry> entries = narcoticEntryRepository
                .findByApprovalStatus(NarcoticEntry.ApprovalStatus.PHARMACIST_APPROVED);
        return ResponseEntity.ok(entries);
    }

    @PostMapping("/{id}/pharmacist-approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<NarcoticEntry> pharmacistApprove(
            @PathVariable Long id,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();
        NarcoticEntry entry = narcoticEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Narcotic entry not found: " + id));

        if (entry.getApprovalStatus() != NarcoticEntry.ApprovalStatus.PENDING) {
            throw new IllegalArgumentException("Entry is not in PENDING status");
        }

        entry.setPharmacist(currentUser);
        entry.setPharmacistApproved(true);
        entry.setPharmacistApprovedAt(LocalDateTime.now());
        entry.setApprovalStatus(NarcoticEntry.ApprovalStatus.PHARMACIST_APPROVED);
        entry = narcoticEntryRepository.save(entry);

        log.info("Narcotic entry {} pharmacist-approved by {}", id, currentUser.getFullName());
        return ResponseEntity.ok(entry);
    }

    @PostMapping("/{id}/supervisor-approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<NarcoticEntry> supervisorApprove(
            @PathVariable Long id,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();
        NarcoticEntry entry = narcoticEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Narcotic entry not found: " + id));

        if (entry.getApprovalStatus() != NarcoticEntry.ApprovalStatus.PHARMACIST_APPROVED) {
            throw new IllegalArgumentException("Entry must be pharmacist-approved first");
        }

        entry.setSupervisor(currentUser);
        entry.setSupervisorApproved(true);
        entry.setSupervisorApprovedAt(LocalDateTime.now());
        entry.setApprovalStatus(NarcoticEntry.ApprovalStatus.FULLY_APPROVED);
        entry = narcoticEntryRepository.save(entry);

        log.info("Narcotic entry {} fully approved by supervisor {}", id, currentUser.getFullName());
        return ResponseEntity.ok(entry);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<NarcoticEntry> reject(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            Authentication authentication) {

        User currentUser = (User) authentication.getPrincipal();
        NarcoticEntry entry = narcoticEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Narcotic entry not found: " + id));

        entry.setApprovalStatus(NarcoticEntry.ApprovalStatus.REJECTED);
        entry.setNotes((entry.getNotes() != null ? entry.getNotes() + " | " : "") +
                "REJECTED by " + currentUser.getFullName() + ": " + (reason != null ? reason : "No reason given"));
        entry = narcoticEntryRepository.save(entry);

        log.info("Narcotic entry {} rejected by {}", id, currentUser.getFullName());
        return ResponseEntity.ok(entry);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getSummary() {
        long total = narcoticEntryRepository.count();
        long pending = narcoticEntryRepository.findByApprovalStatus(NarcoticEntry.ApprovalStatus.PENDING).size();
        long pharmacistApproved = narcoticEntryRepository.findByApprovalStatus(NarcoticEntry.ApprovalStatus.PHARMACIST_APPROVED).size();
        long fullyApproved = narcoticEntryRepository.findByApprovalStatus(NarcoticEntry.ApprovalStatus.FULLY_APPROVED).size();

        return ResponseEntity.ok(Map.of(
                "total", total,
                "pending", pending,
                "pharmacistApproved", pharmacistApproved,
                "fullyApproved", fullyApproved
        ));
    }
}
