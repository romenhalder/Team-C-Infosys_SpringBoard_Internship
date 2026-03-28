// service/InventoryService.java
package com.romen.inventory.service;

import com.romen.inventory.dto.InventoryResponse;
import com.romen.inventory.dto.StockTransactionResponse;
import com.romen.inventory.dto.StockUpdateRequest;
import com.romen.inventory.entity.Alert;
import com.romen.inventory.entity.Batch;
import com.romen.inventory.entity.Inventory;
import com.romen.inventory.entity.Medication;
import com.romen.inventory.entity.StockTransaction;
import com.romen.inventory.entity.Supplier;
import com.romen.inventory.entity.User;
import com.romen.inventory.exception.ResourceNotFoundException;
import com.romen.inventory.repository.AlertRepository;
import com.romen.inventory.repository.BatchRepository;
import com.romen.inventory.repository.InventoryRepository;
import com.romen.inventory.repository.MedicationRepository;
import com.romen.inventory.repository.StockTransactionRepository;
import com.romen.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final MedicationRepository medicationRepository;
    private final StockTransactionRepository transactionRepository;
    private final BatchRepository batchRepository;
    private final AlertRepository alertRepository;
    private final SupplierRepository supplierRepository;

    public List<InventoryResponse> getAllInventory() {
        return inventoryRepository.findAll().stream()
                .filter(inv -> inv.getMedication().getIsActive())
                .map(this::mapToInventoryResponse)
                .collect(Collectors.toList());
    }

    public InventoryResponse getInventoryByMedication(Long medicationId) {
        Inventory inventory = inventoryRepository.findByMedicationId(medicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for medication"));
        return mapToInventoryResponse(inventory);
    }

    public List<InventoryResponse> getLowStockItems() {
        return inventoryRepository.findAllLowStock().stream()
                .filter(inv -> inv.getMedication().getIsActive())
                .map(this::mapToInventoryResponse)
                .collect(Collectors.toList());
    }

    public List<InventoryResponse> getOutOfStockItems() {
        return inventoryRepository.findByIsOutOfStockTrue().stream()
                .filter(inv -> inv.getMedication().getIsActive())
                .map(this::mapToInventoryResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public InventoryResponse updateStock(StockUpdateRequest request, User user) {
        Medication medication = medicationRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Medication not found"));

        Inventory inventory = inventoryRepository.findByMedicationId(request.getProductId())
                .orElse(Inventory.builder()
                        .medication(medication)
                        .currentQuantity(0)
                        .availableQuantity(0)
                        .isOutOfStock(true)
                        .isLowStock(false)
                        .build());

        Supplier supplier = request.getSupplierId() != null
                ? supplierRepository.findById(request.getSupplierId()).orElse(null)
                : null;

        Integer previousQuantity = inventory.getCurrentQuantity();
        Integer transactionQuantity = 0;
        List<Batch> affectedBatches = new ArrayList<>();

        switch (request.getType()) {
            case STOCK_IN:
                transactionQuantity = handleStockIn(request, medication, inventory, supplier);
                break;
            case STOCK_OUT:
                transactionQuantity = handleStockOut(request, medication, inventory, affectedBatches);
                break;
            case RETURN:
                transactionQuantity = handleReturn(request, medication, inventory, affectedBatches);
                break;
            case WASTAGE:
                transactionQuantity = handleWastage(request, medication, inventory, affectedBatches);
                break;
            case ADJUSTMENT:
                handleAdjustment(request, medication, inventory);
                transactionQuantity = request.getQuantity();
                break;
            default:
                throw new IllegalArgumentException("Invalid transaction type: " + request.getType());
        }

        recalculateInventoryFromBatches(medication.getId(), inventory);

        StockTransaction transaction = StockTransaction.builder()
                .medication(medication)
                .transactionType(request.getType())
                .quantity(transactionQuantity)
                .previousQuantity(previousQuantity)
                .newQuantity(inventory.getCurrentQuantity())
                .unitPrice(request.getUnitPrice())
                .reason(request.getReason())
                .referenceNumber(request.getReferenceNumber())
                .batchNumber(request.getBatchNumber())
                .user(user)
                .supplier(supplier)
                .notes(request.getNotes())
                .build();
        transactionRepository.save(transaction);

        checkAndCreateAlerts(medication, inventory, previousQuantity, inventory.getCurrentQuantity());

        return mapToInventoryResponse(inventory);
    }

    private int handleStockIn(StockUpdateRequest request, Medication medication, Inventory inventory, Supplier supplier) {
        int qty = request.getQuantity();

        Batch batch;
        if (Boolean.TRUE.equals(request.getCreateNewBatch()) || request.getBatchId() == null) {
            batch = Batch.builder()
                    .medication(medication)
                    .batchNumber(request.getBatchNumber())
                    .manufacturerDate(request.getManufacturerDate())
                    .expiryDate(request.getExpiryDate())
                    .mrp(request.getMrp())
                    .ptr(request.getPtr())
                    .pts(request.getPts())
                    .currentStock(qty)
                    .locationInStore(request.getLocationInStore())
                    .supplier(supplier)
                    .isQuarantined(false)
                    .build();
        } else {
            batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + request.getBatchId()));
            batch.setCurrentStock(batch.getCurrentStock() + qty);
        }

        batch = batchRepository.save(batch);
        inventory.setLastStockIn(LocalDateTime.now());
        log.info("STOCK_IN: Added {} units to batch {} for medication {}",
                qty, batch.getBatchNumber(), medication.getName());

        return qty;
    }

    private int handleStockOut(StockUpdateRequest request, Medication medication, Inventory inventory,
                              List<Batch> affectedBatches) {
        int qtyToDeduct = request.getQuantity();
        int totalAvailable = batchRepository.getTotalAvailableStock(medication.getId());

        if (totalAvailable < qtyToDeduct) {
            throw new IllegalArgumentException(
                    String.format("Insufficient stock for %s. Available: %d, Requested: %d",
                            medication.getName(), totalAvailable, qtyToDeduct));
        }

        List<Batch> batches = batchRepository.findActiveBatchesFEFO(medication.getId());
        int remaining = qtyToDeduct;

        for (Batch batch : batches) {
            if (remaining <= 0) break;

            int available = batch.getCurrentStock() - (batch.getReservedStock() != null ? batch.getReservedStock() : 0);
            int toDeduct = Math.min(remaining, available);

            if (toDeduct > 0) {
                batch.setCurrentStock(batch.getCurrentStock() - toDeduct);
                batchRepository.save(batch);
                affectedBatches.add(batch);
                remaining -= toDeduct;

                log.info("STOCK_OUT: Deducted {} from batch {} (exp: {}) for medication {}",
                        toDeduct, batch.getBatchNumber(), batch.getExpiryDate(), medication.getName());
            }
        }

        inventory.setLastStockOut(LocalDateTime.now());
        return qtyToDeduct;
    }

    private int handleReturn(StockUpdateRequest request, Medication medication, Inventory inventory,
                            List<Batch> affectedBatches) {
        int qtyToReturn = request.getQuantity();

        Batch batch;
        if (request.getBatchId() != null) {
            batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + request.getBatchId()));
        } else {
            List<Batch> batches = batchRepository.findActiveBatchesFEFO(medication.getId());
            if (batches.isEmpty()) {
                throw new IllegalArgumentException("No active batches found for return: " + medication.getName());
            }
            batch = batches.get(0);
        }

        batch.setCurrentStock(batch.getCurrentStock() + qtyToReturn);
        batchRepository.save(batch);
        affectedBatches.add(batch);

        log.info("RETURN: Added {} units to batch {} for medication {}",
                qtyToReturn, batch.getBatchNumber(), medication.getName());

        return -qtyToReturn;
    }

    private int handleWastage(StockUpdateRequest request, Medication medication, Inventory inventory,
                             List<Batch> affectedBatches) {
        int qtyToWastage = request.getQuantity();
        List<Batch> batches = batchRepository.findActiveBatchesFEFO(medication.getId());

        if (batches.isEmpty()) {
            throw new IllegalArgumentException("No active batches found for wastage: " + medication.getName());
        }

        int remaining = qtyToWastage;
        for (Batch batch : batches) {
            if (remaining <= 0) break;

            int available = batch.getCurrentStock();
            int toWastage = Math.min(remaining, available);

            if (toWastage > 0) {
                batch.setCurrentStock(batch.getCurrentStock() - toWastage);
                batchRepository.save(batch);
                affectedBatches.add(batch);
                remaining -= toWastage;
            }
        }

        log.info("WASTAGE: Recorded {} units wastage for medication {}",
                qtyToWastage, medication.getName());

        return -qtyToWastage;
    }

    private void handleAdjustment(StockUpdateRequest request, Medication medication, Inventory inventory) {
        log.info("ADJUSTMENT: Setting stock to {} for medication {}",
                request.getQuantity(), medication.getName());
    }

    private void recalculateInventoryFromBatches(Long medicationId, Inventory inventory) {
        Integer totalStock = batchRepository.getTotalActiveStock(medicationId);
        Integer availableStock = batchRepository.getTotalAvailableStock(medicationId);

        if (totalStock == null) totalStock = 0;
        if (availableStock == null) availableStock = 0;

        inventory.setCurrentQuantity(totalStock);
        inventory.setAvailableQuantity(availableStock);
        inventory.setIsOutOfStock(totalStock <= 0);

        if (inventory.getMedication() != null && inventory.getMedication().getMinStockLevel() != null) {
            inventory.setIsLowStock(totalStock > 0 && totalStock <= inventory.getMedication().getMinStockLevel());
        }

        inventoryRepository.save(inventory);
    }

    @Transactional
    public Map<String, Object> reconcileInventory(Long medicationId) {
        Medication medication = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Medication not found: " + medicationId));

        Inventory inventory = inventoryRepository.findByMedicationId(medicationId)
                .orElse(Inventory.builder()
                        .medication(medication)
                        .currentQuantity(0)
                        .availableQuantity(0)
                        .build());

        Integer totalBatchStock = batchRepository.getTotalActiveStock(medicationId);
        Integer totalAvailable = batchRepository.getTotalAvailableStock(medicationId);

        if (totalBatchStock == null) totalBatchStock = 0;
        if (totalAvailable == null) totalAvailable = 0;

        Integer previousQuantity = inventory.getCurrentQuantity();

        inventory.setCurrentQuantity(totalBatchStock);
        inventory.setAvailableQuantity(totalAvailable);
        inventory.setIsOutOfStock(totalBatchStock <= 0);
        if (medication.getMinStockLevel() != null) {
            inventory.setIsLowStock(totalBatchStock > 0 && totalBatchStock <= medication.getMinStockLevel());
        }
        inventoryRepository.save(inventory);

        List<Batch> batches = batchRepository.findByMedicationId(medicationId);
        List<Map<String, Object>> batchSummary = batches.stream()
                .map(b -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("batchNumber", b.getBatchNumber());
                    m.put("currentStock", b.getCurrentStock());
                    m.put("availableStock", b.getAvailableStock());
                    m.put("isQuarantined", b.getIsQuarantined());
                    m.put("expiryDate", b.getExpiryDate());
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("medicationId", medicationId);
        result.put("medicationName", medication.getName());
        result.put("previousQuantity", previousQuantity);
        result.put("newQuantity", totalBatchStock);
        result.put("adjustment", totalBatchStock - previousQuantity);
        result.put("batches", batchSummary);
        result.put("syncedAt", LocalDateTime.now());

        log.info("RECONCILE: {} - {} (prev: {}, new: {}, diff: {})",
                medication.getName(), previousQuantity, totalBatchStock, totalBatchStock - previousQuantity);

        return result;
    }

    @Transactional
    public void checkAndCreateAlerts(Medication medication, Inventory inventory, Integer previousQty, Integer newQty) {
        if (newQty <= 0) {
            boolean hasAlert = alertRepository.existsByMedicationIdAndAlertTypeAndIsResolvedFalse(medication.getId(),
                    Alert.AlertType.OUT_OF_STOCK);
            if (!hasAlert) {
                createAlert(medication, Alert.AlertType.OUT_OF_STOCK,
                        "Out of stock: " + medication.getName() + " is now out of stock",
                        newQty, 0);
            }
            alertRepository.findByMedicationIdOrderByCreatedAtDesc(medication.getId()).stream()
                    .filter(a -> a.getAlertType() == Alert.AlertType.LOW_STOCK && !a.getIsResolved())
                    .forEach(a -> {
                        a.setIsResolved(true);
                        alertRepository.save(a);
                    });
        } else {
            alertRepository.findByMedicationIdOrderByCreatedAtDesc(medication.getId()).stream()
                    .filter(a -> a.getAlertType() == Alert.AlertType.OUT_OF_STOCK && !a.getIsResolved())
                    .forEach(a -> {
                        a.setIsResolved(true);
                        alertRepository.save(a);
                    });

            if (newQty <= medication.getMinStockLevel()) {
                boolean hasAlert = alertRepository.existsByMedicationIdAndAlertTypeAndIsResolvedFalse(medication.getId(),
                        Alert.AlertType.LOW_STOCK);
                if (!hasAlert) {
                    createAlert(medication, Alert.AlertType.LOW_STOCK,
                            "Low stock alert: " + medication.getName() + " has only " + newQty + " units remaining",
                            newQty, medication.getMinStockLevel());
                }
            } else {
                alertRepository.findByMedicationIdOrderByCreatedAtDesc(medication.getId()).stream()
                        .filter(a -> a.getAlertType() == Alert.AlertType.LOW_STOCK && !a.getIsResolved())
                        .forEach(a -> {
                            a.setIsResolved(true);
                            alertRepository.save(a);
                        });
            }
        }

        if (newQty <= medication.getReorderPoint() && previousQty > medication.getReorderPoint()) {
            createAlert(medication, Alert.AlertType.REORDER_POINT,
                    "Reorder point reached: " + medication.getName() + " has " + newQty + " units",
                    newQty, medication.getReorderPoint());
        }
    }

    @Transactional
    public void createAlert(Medication medication, Alert.AlertType type, String message, Integer currentQty,
            Integer threshold) {
        Alert alert = Alert.builder()
                .medication(medication)
                .alertType(type)
                .message(message)
                .currentQuantity(currentQty)
                .thresholdQuantity(threshold)
                .isRead(false)
                .isResolved(false)
                .build();
        alertRepository.save(alert);
        log.info("Alert created: {} for medication {}", type, medication.getName());
    }

    public List<StockTransactionResponse> getAllTransactions() {
        return transactionRepository.findAll().stream()
                .map(this::mapToTransactionResponse)
                .collect(Collectors.toList());
    }

    public List<StockTransactionResponse> getTransactionsByMedication(Long medicationId) {
        return transactionRepository.findByMedicationIdOrderByTransactionDateDesc(medicationId).stream()
                .map(this::mapToTransactionResponse)
                .collect(Collectors.toList());
    }

    public List<StockTransactionResponse> getRecentTransactions() {
        return transactionRepository.findTop10ByOrderByTransactionDateDesc().stream()
                .map(this::mapToTransactionResponse)
                .collect(Collectors.toList());
    }

    public InventoryResponse mapToInventoryResponse(Inventory inventory) {
        Medication medication = inventory.getMedication();
        return InventoryResponse.builder()
                .id(inventory.getId())
                .productId(medication.getId())
                .productName(medication.getName())
                .productCode(medication.getProductCode())
                .categoryName(medication.getCategory().getName())
                .productType(medication.getProductType().name())
                .currentQuantity(inventory.getCurrentQuantity())
                .reservedQuantity(inventory.getReservedQuantity())
                .availableQuantity(inventory.getAvailableQuantity())
                .lastStockIn(inventory.getLastStockIn())
                .lastStockOut(inventory.getLastStockOut())
                .isLowStock(inventory.getIsLowStock())
                .isOutOfStock(inventory.getIsOutOfStock())
                .location(inventory.getLocation())
                .notes(inventory.getNotes())
                .createdAt(inventory.getCreatedAt())
                .updatedAt(inventory.getUpdatedAt())
                .build();
    }

    private StockTransactionResponse mapToTransactionResponse(StockTransaction transaction) {
        return StockTransactionResponse.builder()
                .id(transaction.getId())
                .productId(transaction.getMedication().getId())
                .productName(transaction.getMedication().getName())
                .productCode(transaction.getMedication().getProductCode())
                .transactionType(transaction.getTransactionType())
                .quantity(transaction.getQuantity())
                .previousQuantity(transaction.getPreviousQuantity())
                .newQuantity(transaction.getNewQuantity())
                .unitPrice(transaction.getUnitPrice())
                .totalAmount(transaction.getTotalAmount())
                .reason(transaction.getReason())
                .referenceNumber(transaction.getReferenceNumber())
                .batchNumber(transaction.getBatchNumber())
                .expiryDate(transaction.getExpiryDate())
                .userId(transaction.getUser().getId())
                .userName(transaction.getUser().getFullName())
                .supplierId(transaction.getSupplier() != null ? transaction.getSupplier().getId() : null)
                .supplierName(transaction.getSupplier() != null ? transaction.getSupplier().getName() : null)
                .transactionDate(transaction.getTransactionDate())
                .notes(transaction.getNotes())
                .build();
    }
}
