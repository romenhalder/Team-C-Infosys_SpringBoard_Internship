// service/AlertService.java
package com.romen.inventory.service;

import com.romen.inventory.dto.AlertResponse;
import com.romen.inventory.entity.Alert;
import com.romen.inventory.entity.Inventory;
import com.romen.inventory.entity.Medication;
import com.romen.inventory.entity.User;
import com.romen.inventory.exception.ResourceNotFoundException;
import com.romen.inventory.repository.AlertRepository;
import com.romen.inventory.repository.InventoryRepository;
import com.romen.inventory.repository.MedicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;
    private final MedicationRepository medicationRepository;
    private final InventoryRepository inventoryRepository;

    @Transactional
    public void checkAndCreateStockAlerts(Medication medication, int currentStock) {
        if (medication == null) return;

        int minLevel = medication.getMinStockLevel() != null ? medication.getMinStockLevel() : 10;
        int reorderPoint = medication.getReorderPoint() != null ? medication.getReorderPoint() : 20;

        if (currentStock <= 0) {
            createAlertIfNotExists(medication, Alert.AlertType.OUT_OF_STOCK, currentStock, minLevel,
                    medication.getName() + " is out of stock!",
                    "Current stock: 0. Immediate restocking required.");
        } else if (currentStock <= minLevel) {
            createAlertIfNotExists(medication, Alert.AlertType.LOW_STOCK, currentStock, minLevel,
                    medication.getName() + " is running low on stock",
                    "Current stock: " + currentStock + " (Min level: " + minLevel + "). Please restock soon.");
            autoResolveAlerts(medication.getId(), Alert.AlertType.OUT_OF_STOCK);
        } else if (currentStock <= reorderPoint) {
            createAlertIfNotExists(medication, Alert.AlertType.REORDER_POINT, currentStock, reorderPoint,
                    medication.getName() + " reached reorder point",
                    "Current stock: " + currentStock + " (Reorder point: " + reorderPoint + "). Consider placing an order.");
            autoResolveAlerts(medication.getId(), Alert.AlertType.OUT_OF_STOCK);
            autoResolveAlerts(medication.getId(), Alert.AlertType.LOW_STOCK);
        } else {
            autoResolveAlerts(medication.getId(), Alert.AlertType.OUT_OF_STOCK);
            autoResolveAlerts(medication.getId(), Alert.AlertType.LOW_STOCK);
            autoResolveAlerts(medication.getId(), Alert.AlertType.REORDER_POINT);
        }
    }

    private void createAlertIfNotExists(Medication medication, Alert.AlertType type, int currentQty, int threshold,
            String message, String description) {
        if (alertRepository.existsByMedicationIdAndAlertTypeAndIsResolvedFalse(medication.getId(), type)) {
            return;
        }
        Alert alert = Alert.builder()
                .medication(medication)
                .alertType(type)
                .message(message)
                .description(description)
                .currentQuantity(currentQty)
                .thresholdQuantity(threshold)
                .build();
        alertRepository.save(alert);
        log.info("Created {} alert for medication: {} (stock: {})", type, medication.getName(), currentQty);
    }

    private void autoResolveAlerts(Long medicationId, Alert.AlertType type) {
        List<Alert> unresolvedAlerts = alertRepository.findUnresolvedByType(type).stream()
                .filter(a -> a.getMedication() != null && a.getMedication().getId().equals(medicationId))
                .collect(Collectors.toList());
        for (Alert alert : unresolvedAlerts) {
            alert.setIsResolved(true);
            alert.setResolvedAt(java.time.LocalDateTime.now());
            alertRepository.save(alert);
        }
    }

    @Scheduled(fixedRate = 1800000) // 30 minutes
    @Transactional
    public void checkAllMedicationAlerts() {
        log.info("Running scheduled alert check for all medications...");
        List<Medication> activeMedications = medicationRepository.findByIsActiveTrue();
        for (Medication medication : activeMedications) {
            Inventory inventory = inventoryRepository.findByMedicationId(medication.getId()).orElse(null);
            int currentStock = (inventory != null) ? inventory.getCurrentQuantity() : 0;
            checkAndCreateStockAlerts(medication, currentStock);
        }
        log.info("Scheduled alert check completed. Checked {} medications.", activeMedications.size());
    }

    // ====================== CRUD OPERATIONS ======================

    public List<AlertResponse> getAllAlerts() {
        return alertRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::mapToAlertResponse)
                .collect(Collectors.toList());
    }

    public List<AlertResponse> getUnreadAlerts() {
        return alertRepository.findByIsReadFalseOrderByCreatedAtDesc().stream()
                .map(this::mapToAlertResponse)
                .collect(Collectors.toList());
    }

    public List<AlertResponse> getUnresolvedAlerts() {
        return alertRepository.findByIsResolvedFalseOrderByCreatedAtDesc().stream()
                .map(this::mapToAlertResponse)
                .collect(Collectors.toList());
    }

    public Long getUnreadCount() {
        return alertRepository.countUnread();
    }

    @Transactional
    public AlertResponse markAsRead(Long alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found"));
        alert.markAsRead();
        alert = alertRepository.save(alert);
        return mapToAlertResponse(alert);
    }

    @Transactional
    public void markAllAsRead() {
        List<Alert> unreadAlerts = alertRepository.findByIsReadFalseOrderByCreatedAtDesc();
        unreadAlerts.forEach(Alert::markAsRead);
        alertRepository.saveAll(unreadAlerts);
        log.info("Marked {} alerts as read", unreadAlerts.size());
    }

    @Transactional
    public AlertResponse resolveAlert(Long alertId, User resolvedBy) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found"));
        alert.markAsResolved(resolvedBy);
        alert = alertRepository.save(alert);
        return mapToAlertResponse(alert);
    }

    @Transactional
    public void deleteAlert(Long alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found"));
        alertRepository.delete(alert);
    }

    public List<AlertResponse> getAlertsByMedication(Long medicationId) {
        return alertRepository.findByMedicationIdOrderByCreatedAtDesc(medicationId).stream()
                .map(this::mapToAlertResponse)
                .collect(Collectors.toList());
    }

    public List<AlertResponse> getRecentAlerts() {
        return alertRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(this::mapToAlertResponse)
                .collect(Collectors.toList());
    }

    private AlertResponse mapToAlertResponse(Alert alert) {
        return AlertResponse.builder()
                .id(alert.getId())
                .productId(alert.getMedication() != null ? alert.getMedication().getId() : null)
                .productName(alert.getMedication() != null ? alert.getMedication().getName() : null)
                .productCode(alert.getMedication() != null ? alert.getMedication().getProductCode() : null)
                .alertType(alert.getAlertType())
                .message(alert.getMessage())
                .description(alert.getDescription())
                .currentQuantity(alert.getCurrentQuantity())
                .thresholdQuantity(alert.getThresholdQuantity())
                .isRead(alert.getIsRead())
                .isResolved(alert.getIsResolved())
                .resolvedById(alert.getResolvedBy() != null ? alert.getResolvedBy().getId() : null)
                .resolvedByName(alert.getResolvedBy() != null ? alert.getResolvedBy().getFullName() : null)
                .resolvedAt(alert.getResolvedAt())
                .createdAt(alert.getCreatedAt())
                .updatedAt(alert.getUpdatedAt())
                .build();
    }
}
