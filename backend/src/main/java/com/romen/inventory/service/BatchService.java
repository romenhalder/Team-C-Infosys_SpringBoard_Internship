package com.romen.inventory.service;

import com.romen.inventory.dto.BatchRequest;
import com.romen.inventory.dto.BatchResponse;
import com.romen.inventory.entity.*;
import com.romen.inventory.exception.ResourceNotFoundException;
import com.romen.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatchService {

    private final BatchRepository batchRepository;
    private final MedicationRepository medicationRepository;
    private final InventoryRepository inventoryRepository;
    private final StockTransactionRepository stockTransactionRepository;
    private final SupplierRepository supplierRepository;
    private final AlertRepository alertRepository;

    @Transactional
    public BatchResponse createBatch(BatchRequest request, User user) {
        Medication medication = medicationRepository.findById(request.getMedicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Medication not found"));

        Supplier supplier = null;
        if (request.getSupplierId() != null) {
            supplier = supplierRepository.findById(request.getSupplierId()).orElse(null);
        }

        Batch batch = Batch.builder()
                .medication(medication)
                .batchNumber(request.getBatchNumber())
                .manufacturerDate(request.getManufacturerDate())
                .expiryDate(request.getExpiryDate())
                .mrp(request.getMrp())
                .ptr(request.getPtr())
                .pts(request.getPts())
                .currentStock(request.getInitialStock() != null ? request.getInitialStock() : 0)
                .locationInStore(request.getLocationInStore())
                .supplier(supplier)
                .build();

        batch = batchRepository.save(batch);

        // Update aggregate inventory
        if (request.getInitialStock() != null && request.getInitialStock() > 0) {
            Inventory inventory = inventoryRepository.findByMedicationId(medication.getId())
                    .orElse(Inventory.builder().medication(medication).currentQuantity(0).build());
            int prevQty = inventory.getCurrentQuantity();
            int newQty = prevQty + request.getInitialStock();
            inventory.setCurrentQuantity(newQty);
            inventory.setLastStockIn(LocalDateTime.now());
            inventoryRepository.save(inventory);

            StockTransaction transaction = StockTransaction.builder()
                    .medication(medication)
                    .batch(batch)
                    .transactionType(StockTransaction.TransactionType.STOCK_IN)
                    .quantity(request.getInitialStock())
                    .previousQuantity(prevQty)
                    .newQuantity(newQty)
                    .unitPrice(request.getPts())
                    .reason("New batch received: " + batch.getBatchNumber())
                    .batchNumber(batch.getBatchNumber())
                    .user(user)
                    .supplier(supplier)
                    .notes("Batch creation with initial stock")
                    .build();
            stockTransactionRepository.save(transaction);
        }

        return mapToResponse(batch);
    }

    public List<BatchResponse> getBatchesByMedication(Long medicationId) {
        return batchRepository.findByMedicationId(medicationId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public BatchResponse getBatchById(Long id) {
        Batch batch = batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found"));
        return mapToResponse(batch);
    }

    public List<BatchResponse> getQuarantinedBatches() {
        return batchRepository.findQuarantinedBatches().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<BatchResponse> getExpiringSoonBatches(int days) {
        LocalDate today = LocalDate.now();
        LocalDate threshold = today.plusDays(days);
        return batchRepository.findExpiringSoon(today, threshold).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public BigDecimal getExpiryRiskValue(int days) {
        LocalDate today = LocalDate.now();
        LocalDate threshold = today.plusDays(days);
        BigDecimal value = batchRepository.calculateExpiryRiskValue(today, threshold);
        return value != null ? value : BigDecimal.ZERO;
    }

    /**
     * Daily midnight job: quarantines expired batches.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void quarantineExpiredBatches() {
        log.info("Running daily expired batch quarantine job...");
        List<Batch> expiredBatches = batchRepository.findExpiredUnquarantined(LocalDate.now());

        for (Batch batch : expiredBatches) {
            batch.setIsQuarantined(true);
            batch.setQuarantineReason("AUTO: Expired on " + batch.getExpiryDate());
            batch.setQuarantinedAt(LocalDateTime.now());
            batchRepository.save(batch);

            // Create alert
            Alert alert = Alert.builder()
                    .medication(batch.getMedication())
                    .batch(batch)
                    .alertType(Alert.AlertType.BATCH_QUARANTINED)
                    .message("Batch " + batch.getBatchNumber() + " of " + batch.getMedication().getName() +
                            " quarantined - expired on " + batch.getExpiryDate())
                    .currentQuantity(batch.getCurrentStock())
                    .build();
            alertRepository.save(alert);

            // Update aggregate inventory
            inventoryRepository.findByMedicationId(batch.getMedication().getId()).ifPresent(inv -> {
                int newQty = inv.getCurrentQuantity() - batch.getCurrentStock();
                inv.setCurrentQuantity(Math.max(0, newQty));
                inventoryRepository.save(inv);
            });

            log.info("Quarantined batch {} of {}", batch.getBatchNumber(), batch.getMedication().getName());
        }
        log.info("Quarantine job complete. {} batches quarantined.", expiredBatches.size());
    }

    private BatchResponse mapToResponse(Batch batch) {
        long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), batch.getExpiryDate());
        return BatchResponse.builder()
                .id(batch.getId())
                .medicationId(batch.getMedication().getId())
                .medicationName(batch.getMedication().getName())
                .batchNumber(batch.getBatchNumber())
                .manufacturerDate(batch.getManufacturerDate())
                .expiryDate(batch.getExpiryDate())
                .mrp(batch.getMrp())
                .ptr(batch.getPtr())
                .pts(batch.getPts())
                .currentStock(batch.getCurrentStock())
                .reservedStock(batch.getReservedStock())
                .availableStock(batch.getAvailableStock())
                .locationInStore(batch.getLocationInStore())
                .isQuarantined(batch.getIsQuarantined())
                .quarantineReason(batch.getQuarantineReason())
                .quarantinedAt(batch.getQuarantinedAt())
                .supplierName(batch.getSupplier() != null ? batch.getSupplier().getName() : null)
                .createdAt(batch.getCreatedAt())
                .updatedAt(batch.getUpdatedAt())
                .isExpired(batch.isExpired())
                .isExpiringSoon(batch.isExpiringSoon(30))
                .daysUntilExpiry((int) daysUntil)
                .build();
    }
}
