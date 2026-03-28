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
import java.util.Map;
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
     * FIXED: Now properly syncs inventory to prevent negative values.
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

            // Create alert for expired batch
            Alert alert = Alert.builder()
                    .medication(batch.getMedication())
                    .batch(batch)
                    .alertType(Alert.AlertType.BATCH_QUARANTINED)
                    .message("Batch " + batch.getBatchNumber() + " of " + batch.getMedication().getName() +
                            " quarantined - expired on " + batch.getExpiryDate())
                    .currentQuantity(batch.getCurrentStock())
                    .thresholdQuantity(0)
                    .build();
            alertRepository.save(alert);

            // Create EXPIRED alert if not exists
            alertRepository.findByMedicationIdOrderByCreatedAtDesc(batch.getMedication().getId()).stream()
                    .filter(a -> a.getAlertType() == Alert.AlertType.EXPIRED && !a.getIsResolved())
                    .findFirst()
                    .ifPresentOrElse(
                            existingAlert -> {
                                existingAlert.setCurrentQuantity(0);
                                alertRepository.save(existingAlert);
                            },
                            () -> {
                                Alert expiredAlert = Alert.builder()
                                        .medication(batch.getMedication())
                                        .batch(batch)
                                        .alertType(Alert.AlertType.EXPIRED)
                                        .message(batch.getMedication().getName() + " has expired stock in batch " + batch.getBatchNumber())
                                        .currentQuantity(0)
                                        .thresholdQuantity(0)
                                        .build();
                                alertRepository.save(expiredAlert);
                            }
                    );

            // Update aggregate inventory - FIXED: Use actual deducted quantity
            inventoryRepository.findByMedicationId(batch.getMedication().getId()).ifPresent(inv -> {
                Integer totalActive = batchRepository.getTotalActiveStock(batch.getMedication().getId());
                Integer totalAvailable = batchRepository.getTotalAvailableStock(batch.getMedication().getId());
                inv.setCurrentQuantity(totalActive != null ? totalActive : 0);
                inv.setAvailableQuantity(totalAvailable != null ? totalAvailable : 0);
                inv.setIsOutOfStock(inv.getCurrentQuantity() <= 0);
                inventoryRepository.save(inv);
            });

            log.info("Quarantined batch {} of {} ({} units removed from active stock)",
                    batch.getBatchNumber(), batch.getMedication().getName(), batch.getCurrentStock());
        }
        log.info("Quarantine job complete. {} batches quarantined.", expiredBatches.size());
    }

    /**
     * Hourly job: Check for batches expiring soon and create alerts.
     */
    @Scheduled(fixedRate = 3600000) // Every hour
    @Transactional
    public void checkExpiringBatchAlerts() {
        log.info("Running scheduled expiry alert check...");
        LocalDate today = LocalDate.now();
        LocalDate[] thresholds = {today.plusDays(30), today.plusDays(60), today.plusDays(90)};

        for (LocalDate threshold : thresholds) {
            List<Batch> expiringBatches = batchRepository.findExpiringBefore(threshold);

            for (Batch batch : expiringBatches) {
                if (Boolean.TRUE.equals(batch.getIsQuarantined())) continue;

                Alert.AlertType alertType = getExpiryAlertType(batch.getExpiryDate(), today);
                String message = generateExpiryAlertMessage(batch, today);

                boolean exists = alertRepository.existsByMedicationIdAndAlertTypeAndIsResolvedFalse(
                        batch.getMedication().getId(), alertType);

                if (!exists) {
                    Alert alert = Alert.builder()
                            .medication(batch.getMedication())
                            .batch(batch)
                            .alertType(alertType)
                            .message(message)
                            .currentQuantity(batch.getCurrentStock())
                            .thresholdQuantity(batch.getCurrentStock())
                            .build();
                    alertRepository.save(alert);
                    log.info("Created {} alert for batch {} of {}",
                            alertType, batch.getBatchNumber(), batch.getMedication().getName());
                }
            }
        }
        log.info("Expiry alert check completed.");
    }

    private Alert.AlertType getExpiryAlertType(LocalDate expiryDate, LocalDate today) {
        long daysUntilExpiry = ChronoUnit.DAYS.between(today, expiryDate);
        if (daysUntilExpiry <= 30) {
            return Alert.AlertType.EXPIRING_SOON;
        }
        return Alert.AlertType.EXPIRING_SOON; // All expiring within 90 days
    }

    private String generateExpiryAlertMessage(Batch batch, LocalDate today) {
        long daysUntilExpiry = ChronoUnit.DAYS.between(today, batch.getExpiryDate());
        String urgency = daysUntilExpiry <= 30 ? "CRITICAL" : (daysUntilExpiry <= 60 ? "WARNING" : "NOTICE");
        return String.format("[%s] Batch %s of %s expires in %d days (%s) - %d units at risk",
                urgency, batch.getBatchNumber(), batch.getMedication().getName(),
                daysUntilExpiry, batch.getExpiryDate(), batch.getCurrentStock());
    }

    /**
     * Manually quarantine a batch (for recalls or manual decisions).
     */
    @Transactional
    public BatchResponse quarantineBatch(Long batchId, String reason, User quarantinedBy) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));

        if (Boolean.TRUE.equals(batch.getIsQuarantined())) {
            throw new IllegalArgumentException("Batch is already quarantined");
        }

        batch.setIsQuarantined(true);
        batch.setQuarantineReason("MANUAL: " + (reason != null ? reason : "Manual quarantine"));
        batch.setQuarantinedAt(LocalDateTime.now());
        batch = batchRepository.save(batch);

        // Create alert
        Alert alert = Alert.builder()
                .medication(batch.getMedication())
                .batch(batch)
                .alertType(Alert.AlertType.BATCH_QUARANTINED)
                .message("Batch " + batch.getBatchNumber() + " manually quarantined: " + reason)
                .currentQuantity(batch.getCurrentStock())
                .thresholdQuantity(0)
                .build();
        alertRepository.save(alert);

        // Sync inventory
        recalculateInventoryForMedication(batch.getMedication().getId());

        log.info("Batch {} manually quarantined by {}: {}",
                batch.getBatchNumber(), quarantinedBy.getFullName(), reason);

        return mapToResponse(batch);
    }

    /**
     * Release a batch from quarantine (after inspection/return).
     */
    @Transactional
    public BatchResponse releaseFromQuarantine(Long batchId, User releasedBy) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));

        if (!Boolean.TRUE.equals(batch.getIsQuarantined())) {
            throw new IllegalArgumentException("Batch is not quarantined");
        }

        // Check if batch is actually expired
        if (batch.isExpired()) {
            throw new IllegalArgumentException("Cannot release expired batch. Batch must be disposed or returned.");
        }

        batch.setIsQuarantined(false);
        batch.setQuarantineReason(null);
        batch.setQuarantinedAt(null);
        batch = batchRepository.save(batch);

        // Sync inventory
        recalculateInventoryForMedication(batch.getMedication().getId());

        log.info("Batch {} released from quarantine by {}",
                batch.getBatchNumber(), releasedBy.getFullName());

        return mapToResponse(batch);
    }

    private void recalculateInventoryForMedication(Long medicationId) {
        inventoryRepository.findByMedicationId(medicationId).ifPresent(inv -> {
            Integer totalActive = batchRepository.getTotalActiveStock(medicationId);
            Integer totalAvailable = batchRepository.getTotalAvailableStock(medicationId);
            inv.setCurrentQuantity(totalActive != null ? totalActive : 0);
            inv.setAvailableQuantity(totalAvailable != null ? totalAvailable : 0);
            inv.setIsOutOfStock(inv.getCurrentQuantity() <= 0);
            inventoryRepository.save(inv);
        });
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

    @Transactional
    public BatchResponse updateBatch(Long id, BatchRequest request) {
        Batch batch = batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + id));

        if (request.getBatchNumber() != null) {
            batch.setBatchNumber(request.getBatchNumber());
        }
        if (request.getManufacturerDate() != null) {
            batch.setManufacturerDate(request.getManufacturerDate());
        }
        if (request.getExpiryDate() != null) {
            batch.setExpiryDate(request.getExpiryDate());
        }
        if (request.getMrp() != null) {
            batch.setMrp(request.getMrp());
        }
        if (request.getPtr() != null) {
            batch.setPtr(request.getPtr());
        }
        if (request.getPts() != null) {
            batch.setPts(request.getPts());
        }
        if (request.getLocationInStore() != null) {
            batch.setLocationInStore(request.getLocationInStore());
        }
        if (request.getSupplierId() != null) {
            Supplier supplier = supplierRepository.findById(request.getSupplierId()).orElse(null);
            batch.setSupplier(supplier);
        }

        batch = batchRepository.save(batch);

        log.info("Updated batch {} for medication {}",
                batch.getBatchNumber(), batch.getMedication().getName());

        return mapToResponse(batch);
    }

    @Transactional
    public void deleteBatch(Long id) {
        Batch batch = batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + id));

        if (batch.getCurrentStock() > 0) {
            throw new IllegalArgumentException(
                    "Cannot delete batch with stock. Quarantine and consume remaining stock first.");
        }

        batchRepository.delete(batch);

        log.info("Deleted batch {} of {}",
                batch.getBatchNumber(), batch.getMedication().getName());
    }

    public Map<String, Object> getBatchSummary(Long medicationId) {
        List<Batch> batches = batchRepository.findByMedicationId(medicationId);

        int totalBatches = batches.size();
        int activeBatches = (int) batches.stream()
                .filter(b -> !Boolean.TRUE.equals(b.getIsQuarantined()) && b.getCurrentStock() > 0)
                .count();
        int quarantinedBatches = (int) batches.stream()
                .filter(b -> Boolean.TRUE.equals(b.getIsQuarantined()))
                .count();

        int totalStock = batches.stream()
                .filter(b -> !Boolean.TRUE.equals(b.getIsQuarantined()))
                .mapToInt(b -> b.getCurrentStock() != null ? b.getCurrentStock() : 0)
                .sum();

        int expiringIn30Days = (int) batches.stream()
                .filter(b -> !Boolean.TRUE.equals(b.getIsQuarantined()))
                .filter(b -> b.isExpiringSoon(30))
                .count();

        LocalDate oldestExpiry = batches.stream()
                .filter(b -> !Boolean.TRUE.equals(b.getIsQuarantined()))
                .map(Batch::getExpiryDate)
                .filter(d -> d != null)
                .min(LocalDate::compareTo)
                .orElse(null);

        Map<String, Object> summary = new java.util.HashMap<>();
        summary.put("medicationId", medicationId);
        summary.put("totalBatches", totalBatches);
        summary.put("activeBatches", activeBatches);
        summary.put("quarantinedBatches", quarantinedBatches);
        summary.put("totalStock", totalStock);
        summary.put("expiringIn30Days", expiringIn30Days);
        summary.put("oldestExpiry", oldestExpiry);
        summary.put("batches", batches.stream().map(this::mapToResponse).collect(Collectors.toList()));

        return summary;
    }
}
