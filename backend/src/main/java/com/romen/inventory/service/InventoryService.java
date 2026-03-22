// service/InventoryService.java
package com.romen.inventory.service;

import com.romen.inventory.dto.InventoryResponse;
import com.romen.inventory.dto.StockTransactionResponse;
import com.romen.inventory.dto.StockUpdateRequest;
import com.romen.inventory.entity.Alert;
import com.romen.inventory.entity.Inventory;
import com.romen.inventory.entity.Medication;
import com.romen.inventory.entity.StockTransaction;
import com.romen.inventory.entity.User;
import com.romen.inventory.exception.ResourceNotFoundException;
import com.romen.inventory.repository.AlertRepository;
import com.romen.inventory.repository.InventoryRepository;
import com.romen.inventory.repository.MedicationRepository;
import com.romen.inventory.repository.StockTransactionRepository;
import com.romen.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final MedicationRepository medicationRepository;
    private final StockTransactionRepository transactionRepository;
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
                        .build());

        Integer previousQuantity = inventory.getCurrentQuantity();
        Integer newQuantity;

        switch (request.getType()) {
            case STOCK_IN:
                newQuantity = previousQuantity + request.getQuantity();
                inventory.setLastStockIn(LocalDateTime.now());
                break;
            case STOCK_OUT:
                newQuantity = previousQuantity - request.getQuantity();
                if (newQuantity < 0) {
                    throw new IllegalArgumentException("Insufficient stock. Available: " + previousQuantity);
                }
                inventory.setLastStockOut(LocalDateTime.now());
                break;
            case ADJUSTMENT:
                newQuantity = request.getQuantity();
                break;
            case RETURN:
                newQuantity = previousQuantity - request.getQuantity();
                if (newQuantity < 0) {
                    throw new IllegalArgumentException("Insufficient stock for return");
                }
                break;
            case WASTAGE:
                newQuantity = previousQuantity - request.getQuantity();
                if (newQuantity < 0) {
                    throw new IllegalArgumentException("Insufficient stock to record wastage");
                }
                break;
            default:
                throw new IllegalArgumentException("Invalid transaction type");
        }

        inventory.setCurrentQuantity(newQuantity);
        inventory = inventoryRepository.save(inventory);

        StockTransaction transaction = StockTransaction.builder()
                .medication(medication)
                .transactionType(request.getType())
                .quantity(request.getType() == StockTransaction.TransactionType.STOCK_IN ? request.getQuantity()
                        : -request.getQuantity())
                .previousQuantity(previousQuantity)
                .newQuantity(newQuantity)
                .unitPrice(request.getUnitPrice())
                .reason(request.getReason())
                .referenceNumber(request.getReferenceNumber())
                .batchNumber(request.getBatchNumber())
                .expiryDate(request.getExpiryDate())
                .user(user)
                .supplier(request.getSupplierId() != null
                        ? supplierRepository.findById(request.getSupplierId()).orElse(null)
                        : null)
                .notes(request.getNotes())
                .build();

        transactionRepository.save(transaction);

        checkAndCreateAlerts(medication, inventory, previousQuantity, newQuantity);

        return mapToInventoryResponse(inventory);
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
