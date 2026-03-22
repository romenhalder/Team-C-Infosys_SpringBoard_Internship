package com.romen.inventory.service;

import com.romen.inventory.dto.MedicationRequest;
import com.romen.inventory.dto.MedicationResponse;
import com.romen.inventory.entity.Category;
import com.romen.inventory.entity.Inventory;
import com.romen.inventory.entity.Medication;
import com.romen.inventory.entity.StockTransaction;
import com.romen.inventory.entity.User;
import com.romen.inventory.exception.ResourceNotFoundException;
import com.romen.inventory.repository.CategoryRepository;
import com.romen.inventory.repository.InventoryRepository;
import com.romen.inventory.repository.MedicationRepository;
import com.romen.inventory.repository.StockTransactionRepository;
import com.romen.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicationService {

    private final MedicationRepository medicationRepository;
    private final CategoryRepository categoryRepository;
    private final InventoryRepository inventoryRepository;
    private final StockTransactionRepository stockTransactionRepository;
    private final SupplierRepository supplierRepository;
    private final FileStorageService fileStorageService;

    @Transactional
    public MedicationResponse createMedication(MedicationRequest request, User createdBy) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        if (request.getProductCode() != null && !request.getProductCode().isEmpty()) {
            if (medicationRepository.existsByProductCode(request.getProductCode())) {
                throw new IllegalArgumentException("Product code already exists");
            }
        }

        String imageUrl = null;
        if (request.getImage() != null && !request.getImage().isEmpty()) {
            try {
                imageUrl = fileStorageService.storeFile(request.getImage(), "medications");
            } catch (IOException e) {
                log.error("Failed to upload medication image", e);
                throw new RuntimeException("Failed to upload image");
            }
        }

        Medication medication = Medication.builder()
                .name(request.getName())
                .chemicalName(request.getChemicalName())
                .description(request.getDescription())
                .productCode(request.getProductCode())
                .category(category)
                .productType(request.getProductType())
                .therapeuticClass(request.getTherapeuticClass())
                .scheduleCategory(request.getScheduleCategory())
                .dosageForm(request.getDosageForm())
                .strength(request.getStrength())
                .manufacturer(request.getManufacturer())
                .gstSlab(request.getGstSlab())
                .requiresPrescription(request.getRequiresPrescription())
                .storageCondition(request.getStorageCondition())
                .hsnCode(request.getHsnCode())
                .unitOfMeasure(request.getUnitOfMeasure())
                .price(request.getPrice())
                .costPrice(request.getCostPrice())
                .imageUrl(imageUrl)
                .minStockLevel(request.getMinStockLevel())
                .maxStockLevel(request.getMaxStockLevel())
                .reorderPoint(request.getReorderPoint())
                .expiryDays(request.getExpiryDays())
                .isActive(request.getIsActive())
                .isSellable(request.getIsSellable())
                .createdBy(createdBy)
                .supplier(request.getSupplierId() != null
                        ? supplierRepository.findById(request.getSupplierId()).orElse(null)
                        : null)
                .build();

        medication = medicationRepository.save(medication);

        Integer initialStock = request.getInitialStock();
        if (initialStock == null) initialStock = 0;

        Inventory inventory = Inventory.builder()
                .medication(medication)
                .currentQuantity(initialStock)
                .availableQuantity(initialStock)
                .isOutOfStock(initialStock <= 0)
                .isLowStock(initialStock > 0 && initialStock <= medication.getMinStockLevel())
                .build();
        inventoryRepository.save(inventory);

        if (initialStock > 0) {
            StockTransaction transaction = StockTransaction.builder()
                    .medication(medication)
                    .transactionType(StockTransaction.TransactionType.STOCK_IN)
                    .quantity(initialStock)
                    .previousQuantity(0)
                    .newQuantity(initialStock)
                    .unitPrice(request.getCostPrice())
                    .reason("Initial stock at medication creation")
                    .referenceNumber("NEW-" + medication.getProductCode())
                    .user(createdBy)
                    .supplier(medication.getSupplier())
                    .notes("Medication created with initial stock of " + initialStock)
                    .build();
            stockTransactionRepository.save(transaction);
        }

        return mapToResponse(medication, inventory);
    }

    public MedicationResponse getMedicationById(Long id) {
        Medication medication = medicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication not found with id: " + id));
        Inventory inventory = inventoryRepository.findByMedicationId(id).orElse(null);
        return mapToResponse(medication, inventory);
    }

    public List<MedicationResponse> getAllMedications() {
        return medicationRepository.findByIsActiveTrue().stream()
                .map(med -> {
                    Inventory inventory = inventoryRepository.findByMedicationId(med.getId()).orElse(null);
                    return mapToResponse(med, inventory);
                })
                .collect(Collectors.toList());
    }

    public List<MedicationResponse> getMedicationsByCategory(Long categoryId) {
        return medicationRepository.findByCategoryIdAndIsActiveTrue(categoryId).stream()
                .map(med -> {
                    Inventory inventory = inventoryRepository.findByMedicationId(med.getId()).orElse(null);
                    return mapToResponse(med, inventory);
                })
                .collect(Collectors.toList());
    }

    public List<MedicationResponse> getMedicationsByType(Medication.MedicationType type) {
        return medicationRepository.findActiveByProductType(type).stream()
                .map(med -> {
                    Inventory inventory = inventoryRepository.findByMedicationId(med.getId()).orElse(null);
                    return mapToResponse(med, inventory);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public MedicationResponse updateMedication(Long id, MedicationRequest request) {
        Medication medication = medicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication not found with id: " + id));

        if (request.getCategoryId() != null && !request.getCategoryId().equals(medication.getCategory().getId())) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
            medication.setCategory(category);
        }

        if (request.getProductCode() != null && !request.getProductCode().equals(medication.getProductCode())) {
            if (medicationRepository.existsByProductCode(request.getProductCode())) {
                throw new IllegalArgumentException("Product code already exists");
            }
            medication.setProductCode(request.getProductCode());
        }

        if (request.getImage() != null && !request.getImage().isEmpty()) {
            try {
                if (medication.getImageUrl() != null) {
                    fileStorageService.deleteFile(medication.getImageUrl());
                }
                String imageUrl = fileStorageService.storeFile(request.getImage(), "medications");
                medication.setImageUrl(imageUrl);
            } catch (IOException e) {
                log.error("Failed to update medication image", e);
                throw new RuntimeException("Failed to update image");
            }
        }

        medication.setName(request.getName());
        medication.setChemicalName(request.getChemicalName());
        medication.setDescription(request.getDescription());
        medication.setProductType(request.getProductType());
        medication.setTherapeuticClass(request.getTherapeuticClass());
        medication.setScheduleCategory(request.getScheduleCategory());
        medication.setDosageForm(request.getDosageForm());
        medication.setStrength(request.getStrength());
        medication.setManufacturer(request.getManufacturer());
        medication.setGstSlab(request.getGstSlab());
        medication.setRequiresPrescription(request.getRequiresPrescription());
        medication.setStorageCondition(request.getStorageCondition());
        medication.setHsnCode(request.getHsnCode());
        medication.setUnitOfMeasure(request.getUnitOfMeasure());
        medication.setPrice(request.getPrice());
        medication.setCostPrice(request.getCostPrice());
        medication.setMinStockLevel(request.getMinStockLevel());
        medication.setMaxStockLevel(request.getMaxStockLevel());
        medication.setReorderPoint(request.getReorderPoint());
        medication.setExpiryDays(request.getExpiryDays());
        medication.setIsActive(request.getIsActive());
        medication.setIsSellable(request.getIsSellable());

        if (request.getSupplierId() != null) {
            medication.setSupplier(supplierRepository.findById(request.getSupplierId()).orElse(null));
        }

        medication = medicationRepository.save(medication);
        Inventory inventory = inventoryRepository.findByMedicationId(id).orElse(null);
        return mapToResponse(medication, inventory);
    }

    @Transactional
    public void deleteMedication(Long id) {
        Medication medication = medicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication not found with id: " + id));
        medication.setIsActive(false);
        medicationRepository.save(medication);

        inventoryRepository.findByMedicationId(id).ifPresent(inventory -> {
            inventory.setCurrentQuantity(0);
            inventory.setAvailableQuantity(0);
            inventory.setIsOutOfStock(true);
            inventory.setIsLowStock(false);
            inventoryRepository.save(inventory);
        });

        if (medication.getImageUrl() != null) {
            fileStorageService.deleteFile(medication.getImageUrl());
        }
    }

    public List<MedicationResponse> searchMedications(String keyword) {
        return medicationRepository.searchActiveMedications(keyword).stream()
                .map(med -> {
                    Inventory inventory = inventoryRepository.findByMedicationId(med.getId()).orElse(null);
                    return mapToResponse(med, inventory);
                })
                .collect(Collectors.toList());
    }

    public List<MedicationResponse> getLowStockMedications() {
        return medicationRepository.findLowStockMedications().stream()
                .map(med -> {
                    Inventory inventory = inventoryRepository.findByMedicationId(med.getId()).orElse(null);
                    return mapToResponse(med, inventory);
                })
                .collect(Collectors.toList());
    }

    public List<MedicationResponse> filterMedications(Long categoryId, String therapeuticClass,
            Medication.ScheduleCategory scheduleCategory, Medication.MedicationType productType,
            BigDecimal minPrice, BigDecimal maxPrice) {
        return medicationRepository.findAll().stream()
                .filter(medication -> {
                    if (!medication.getIsActive()) return false;
                    if (categoryId != null && !medication.getCategory().getId().equals(categoryId)) return false;
                    if (therapeuticClass != null && !therapeuticClass.isEmpty() &&
                            (medication.getTherapeuticClass() == null
                                    || !medication.getTherapeuticClass().toLowerCase().contains(therapeuticClass.toLowerCase())))
                        return false;
                    if (scheduleCategory != null && medication.getScheduleCategory() != scheduleCategory) return false;
                    if (productType != null && medication.getProductType() != productType) return false;
                    if (minPrice != null && (medication.getPrice() == null || medication.getPrice().compareTo(minPrice) < 0))
                        return false;
                    if (maxPrice != null && (medication.getPrice() == null || medication.getPrice().compareTo(maxPrice) > 0))
                        return false;
                    return true;
                })
                .map(med -> {
                    Inventory inventory = inventoryRepository.findByMedicationId(med.getId()).orElse(null);
                    return mapToResponse(med, inventory);
                })
                .collect(Collectors.toList());
    }

    private MedicationResponse mapToResponse(Medication medication, Inventory inventory) {
        return MedicationResponse.builder()
                .id(medication.getId())
                .name(medication.getName())
                .chemicalName(medication.getChemicalName())
                .description(medication.getDescription())
                .sku(medication.getSku())
                .barcode(medication.getBarcode())
                .hsnCode(medication.getHsnCode())
                .productCode(medication.getProductCode())
                .categoryId(medication.getCategory().getId())
                .categoryName(medication.getCategory().getName())
                .productType(medication.getProductType())
                .therapeuticClass(medication.getTherapeuticClass())
                .scheduleCategory(medication.getScheduleCategory())
                .dosageForm(medication.getDosageForm())
                .strength(medication.getStrength())
                .manufacturer(medication.getManufacturer())
                .gstSlab(medication.getGstSlab())
                .requiresPrescription(medication.getRequiresPrescription())
                .storageCondition(medication.getStorageCondition())
                .unitOfMeasure(medication.getUnitOfMeasure())
                .price(medication.getPrice())
                .costPrice(medication.getCostPrice())
                .taxRate(medication.getTaxRate())
                .imageUrl(medication.getImageUrl())
                .minStockLevel(medication.getMinStockLevel())
                .maxStockLevel(medication.getMaxStockLevel())
                .reorderPoint(medication.getReorderPoint())
                .expiryDays(medication.getExpiryDays())
                .isActive(medication.getIsActive())
                .isSellable(medication.getIsSellable())
                .supplierId(medication.getSupplier() != null ? medication.getSupplier().getId() : null)
                .supplierName(medication.getSupplier() != null ? medication.getSupplier().getName() : null)
                .createdByName(medication.getCreatedBy() != null ? medication.getCreatedBy().getFullName() : null)
                .createdAt(medication.getCreatedAt())
                .updatedAt(medication.getUpdatedAt())
                .currentStock(inventory != null ? inventory.getCurrentQuantity() : 0)
                .availableStock(inventory != null ? inventory.getAvailableQuantity() : 0)
                .isLowStock(inventory != null ? inventory.getIsLowStock() : false)
                .isOutOfStock(inventory != null ? inventory.getIsOutOfStock() : true)
                .build();
    }
}
