package com.romen.inventory.service;

import com.romen.inventory.dto.SalesRequest;
import com.romen.inventory.dto.SalesReturnRequest;
import com.romen.inventory.dto.SalesResponse;
import com.romen.inventory.entity.*;
import com.romen.inventory.exception.ResourceNotFoundException;
import com.romen.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalesService {

    private final SalesOrderRepository salesOrderRepository;
    private final SalesItemRepository salesItemRepository;
    private final MedicationRepository medicationRepository;
    private final InventoryRepository inventoryRepository;
    private final BatchRepository batchRepository;
    private final StockTransactionRepository stockTransactionRepository;
    private final ScheduleH1EntryRepository scheduleH1EntryRepository;
    private final NarcoticEntryRepository narcoticEntryRepository;
    private final AlertService alertService;

    @Transactional
    public SalesResponse createSale(SalesRequest request, User currentUser) {
        log.info("Creating new sale by user: {}", currentUser.getEmail());

        // Validate prescription info for scheduled drugs
        boolean hasScheduledDrugs = false;
        for (SalesRequest.SalesItemRequest itemReq : request.getItems()) {
            Medication med = medicationRepository.findById(itemReq.getMedicationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Medication not found: " + itemReq.getMedicationId()));
            if (med.getScheduleCategory() != null &&
                    (med.getScheduleCategory() == Medication.ScheduleCategory.H ||
                     med.getScheduleCategory() == Medication.ScheduleCategory.H1 ||
                     med.getScheduleCategory() == Medication.ScheduleCategory.X)) {
                hasScheduledDrugs = true;
                break;
            }
        }

        if (hasScheduledDrugs) {
            if (request.getDoctorName() == null || request.getDoctorName().isBlank()) {
                throw new IllegalArgumentException("Doctor name is required for scheduled drugs");
            }
            if (request.getDoctorRegNumber() == null || request.getDoctorRegNumber().isBlank()) {
                throw new IllegalArgumentException("Doctor registration number is required for scheduled drugs");
            }
        }

        SalesOrder order = SalesOrder.builder()
                .customerName(request.getCustomerName())
                .customerMobile(request.getCustomerMobile())
                .patientAddress(request.getPatientAddress())
                .doctorName(request.getDoctorName())
                .doctorRegNumber(request.getDoctorRegNumber())
                .prescriptionImageUrl(request.getPrescriptionImageUrl())
                .insuranceClaim(request.getInsuranceClaim() != null ? request.getInsuranceClaim() : false)
                .discountAmount(request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO)
                .paymentMethod(request.getPaymentMethod() != null
                        ? SalesOrder.PaymentMethod.valueOf(request.getPaymentMethod())
                        : SalesOrder.PaymentMethod.CASH)
                .soldBy(currentUser)
                .notes(request.getNotes())
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalCgst = BigDecimal.ZERO;
        BigDecimal totalSgst = BigDecimal.ZERO;

        for (SalesRequest.SalesItemRequest itemRequest : request.getItems()) {
            Medication medication = medicationRepository.findById(itemRequest.getMedicationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Medication not found: " + itemRequest.getMedicationId()));

            if (!medication.getIsSellable()) {
                throw new IllegalArgumentException("Medication is not for sale: " + medication.getName());
            }

            // *** FEFO Logic: Pick oldest-expiry batches first ***
            List<BatchAllocation> batchAllocations = allocateBatchesFEFO(medication, itemRequest.getQuantity());

            BigDecimal unitPrice = itemRequest.getUnitPrice() != null ? itemRequest.getUnitPrice() : medication.getPrice();
            BigDecimal gstSlab = medication.getGstSlab() != null ? medication.getGstSlab() : BigDecimal.ZERO;

            // Create SalesItem per batch allocation
            for (BatchAllocation allocation : batchAllocations) {
                BigDecimal lineTotal = unitPrice.multiply(new BigDecimal(allocation.quantity));
                BigDecimal gstAmount = lineTotal.multiply(gstSlab).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                BigDecimal cgst = gstAmount.divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
                BigDecimal sgst = gstAmount.subtract(cgst);
                BigDecimal discount = itemRequest.getDiscountAmount() != null ? itemRequest.getDiscountAmount() : BigDecimal.ZERO;

                SalesItem salesItem = SalesItem.builder()
                        .medication(medication)
                        .batch(allocation.batch)
                        .quantity(allocation.quantity)
                        .unitPrice(unitPrice)
                        .mrp(allocation.batch.getMrp())
                        .cgstAmount(cgst)
                        .sgstAmount(sgst)
                        .discountAmount(discount)
                        .totalPrice(lineTotal.add(gstAmount).subtract(discount))
                        .gstSlab(gstSlab)
                        .hsnCode(medication.getHsnCode())
                        .build();

                order.addItem(salesItem);
                subtotal = subtotal.add(lineTotal);
                totalCgst = totalCgst.add(cgst);
                totalSgst = totalSgst.add(sgst);

                // Update batch stock
                int prevBatchStock = allocation.batch.getCurrentStock();
                allocation.batch.setCurrentStock(prevBatchStock - allocation.quantity);
                batchRepository.save(allocation.batch);

                // Update inventory aggregate
                Inventory inventory = inventoryRepository.findByMedicationIdWithLock(medication.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for: " + medication.getName()));
                int prevQty = inventory.getCurrentQuantity();
                int newQty = prevQty - allocation.quantity;
                inventory.setCurrentQuantity(newQty);
                inventory.setLastStockOut(LocalDateTime.now());
                inventoryRepository.save(inventory);

                // Create stock transaction
                StockTransaction transaction = StockTransaction.builder()
                        .medication(medication)
                        .batch(allocation.batch)
                        .transactionType(StockTransaction.TransactionType.STOCK_OUT)
                        .quantity(-allocation.quantity)
                        .previousQuantity(prevQty)
                        .newQuantity(newQty)
                        .unitPrice(unitPrice)
                        .totalAmount(lineTotal)
                        .reason("SALE - Order: " + order.getOrderNumber())
                        .batchNumber(allocation.batch.getBatchNumber())
                        .user(currentUser)
                        .notes("POS Sale - FEFO batch: " + allocation.batch.getBatchNumber())
                        .build();
                stockTransactionRepository.save(transaction);

                alertService.checkAndCreateStockAlerts(medication, newQty);
            }

            // Auto-create Schedule H1 entry for compliance
            if (medication.getScheduleCategory() == Medication.ScheduleCategory.H1) {
                for (BatchAllocation alloc : batchAllocations) {
                    ScheduleH1Entry h1Entry = ScheduleH1Entry.builder()
                            .salesOrder(order)
                            .medication(medication)
                            .batch(alloc.batch)
                            .invoiceNumber(order.getOrderNumber())
                            .patientName(request.getCustomerName())
                            .patientAddress(request.getPatientAddress())
                            .drugName(medication.getName() + " " + (medication.getStrength() != null ? medication.getStrength() : ""))
                            .batchNumber(alloc.batch.getBatchNumber())
                            .quantity(alloc.quantity)
                            .doctorName(request.getDoctorName())
                            .doctorRegNumber(request.getDoctorRegNumber())
                            .build();
                    scheduleH1EntryRepository.save(h1Entry);
                }
            }

            // Auto-create NarcoticEntry for Schedule X drugs (regulatory requirement)
            if (medication.getScheduleCategory() == Medication.ScheduleCategory.X) {
                for (BatchAllocation alloc : batchAllocations) {
                    NarcoticEntry narcoticEntry = NarcoticEntry.builder()
                            .salesOrder(order)
                            .medication(medication)
                            .batch(alloc.batch)
                            .patientName(request.getCustomerName() != null ? request.getCustomerName() : "N/A")
                            .patientAddress(request.getPatientAddress())
                            .doctorName(request.getDoctorName())
                            .doctorRegNumber(request.getDoctorRegNumber())
                            .quantity(alloc.quantity)
                            .pharmacist(currentUser)
                            .pharmacistApproved(true)
                            .pharmacistApprovedAt(LocalDateTime.now())
                            .approvalStatus(NarcoticEntry.ApprovalStatus.PHARMACIST_APPROVED)
                            .notes("Auto-created during POS sale: " + order.getOrderNumber())
                            .build();
                    narcoticEntryRepository.save(narcoticEntry);
                    log.info("Created NarcoticEntry for Schedule X drug: {} batch: {}",
                            medication.getName(), alloc.batch.getBatchNumber());
                }
            }
        }

        order.setSubtotal(subtotal);
        order.setCgstAmount(totalCgst);
        order.setSgstAmount(totalSgst);
        order.calculateTotals();

        SalesOrder savedOrder = salesOrderRepository.save(order);
        log.info("Sale created successfully: Order #{}", savedOrder.getOrderNumber());

        return SalesResponse.fromEntity(savedOrder);
    }

    /**
     * FEFO (First-Expiry-First-Out) batch allocation.
     * Picks batches with the oldest expiry date first to minimize wastage.
     */
    private List<BatchAllocation> allocateBatchesFEFO(Medication medication, int requestedQty) {
        List<Batch> activeBatches = batchRepository.findActiveBatchesFEFOWithLock(medication.getId());

        if (activeBatches.isEmpty()) {
            throw new IllegalArgumentException("No available batches for medication: " + medication.getName());
        }

        int totalAvailable = activeBatches.stream().mapToInt(Batch::getAvailableStock).sum();
        if (totalAvailable < requestedQty) {
            throw new IllegalArgumentException(
                    String.format("Insufficient stock for %s. Available: %d, Requested: %d",
                            medication.getName(), totalAvailable, requestedQty));
        }

        List<BatchAllocation> allocations = new ArrayList<>();
        int remaining = requestedQty;

        for (Batch batch : activeBatches) {
            if (remaining <= 0) break;

            int canFulfill = Math.min(remaining, batch.getAvailableStock());
            if (canFulfill > 0) {
                allocations.add(new BatchAllocation(batch, canFulfill));
                remaining -= canFulfill;
            }
        }

        return allocations;
    }

    private record BatchAllocation(Batch batch, int quantity) {}

    // --- Read methods ---

    @Transactional(readOnly = true)
    public SalesResponse getSaleById(Long id) {
        SalesOrder order = salesOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sale not found"));
        return SalesResponse.fromEntity(order);
    }

    @Transactional(readOnly = true)
    public SalesResponse getSaleByOrderNumber(String orderNumber) {
        SalesOrder order = salesOrderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Sale not found"));
        return SalesResponse.fromEntity(order);
    }

    @Transactional(readOnly = true)
    public List<SalesResponse> getAllSales() {
        return salesOrderRepository.findAll().stream()
                .map(SalesResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalesResponse> getRecentSales(int limit) {
        LocalDateTime since = LocalDate.now().atStartOfDay();
        return salesOrderRepository.findRecentSales(since).stream()
                .limit(limit)
                .map(SalesResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalesResponse> getRecentSalesByUser(Long userId, int limit) {
        LocalDateTime since = LocalDate.now().atStartOfDay();
        return salesOrderRepository.findRecentSalesByUser(userId, since).stream()
                .limit(limit)
                .map(SalesResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalesResponse> getSalesByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return salesOrderRepository.findByDateRange(startDate, endDate).stream()
                .map(SalesResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalesResponse> getSalesByCustomerMobile(String mobile) {
        return salesOrderRepository.findByCustomerMobile(mobile).stream()
                .map(SalesResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BigDecimal getTodaySales() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        BigDecimal total = salesOrderRepository.calculateTotalSales(startOfDay, endOfDay);
        return total != null ? total : BigDecimal.ZERO;
    }

    @Transactional(readOnly = true)
    public Long getTodaySalesCount() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        Long count = salesOrderRepository.countSalesToday(startOfDay);
        return count != null ? count : 0L;
    }

    @Transactional(readOnly = true)
    public BigDecimal getSalesSummary(LocalDateTime startDate, LocalDateTime endDate) {
        BigDecimal total = salesOrderRepository.calculateTotalSales(startDate, endDate);
        return total != null ? total : BigDecimal.ZERO;
    }

    // ======== SALES RETURN ========

    @Transactional
    public SalesResponse createSalesReturn(SalesReturnRequest request, User currentUser) {
        log.info("Processing sales return for order: {} by user: {}", request.getOrderNumber(), currentUser.getEmail());

        SalesOrder order = salesOrderRepository.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + request.getOrderNumber()));

        if (order.getOrderStatus() != SalesOrder.OrderStatus.COMPLETED) {
            throw new IllegalArgumentException("Only completed orders can be returned. Current status: " + order.getOrderStatus());
        }

        for (SalesReturnRequest.ReturnItemRequest returnItem : request.getItems()) {
            Medication medication = medicationRepository.findById(returnItem.getMedicationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Medication not found: " + returnItem.getMedicationId()));

            // Find the original sale item to validate quantity
            SalesItem originalItem = order.getItems().stream()
                    .filter(si -> si.getMedication().getId().equals(returnItem.getMedicationId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Medication " + medication.getName() + " was not part of this order"));

            if (returnItem.getQuantity() > originalItem.getQuantity()) {
                throw new IllegalArgumentException(
                        String.format("Return quantity (%d) exceeds sold quantity (%d) for %s",
                                returnItem.getQuantity(), originalItem.getQuantity(), medication.getName()));
            }

            // Add stock back to batch
            Batch batch = originalItem.getBatch();
            if (batch != null) {
                batch.setCurrentStock(batch.getCurrentStock() + returnItem.getQuantity());
                batchRepository.save(batch);
            }

            // Update inventory
            Inventory inventory = inventoryRepository.findByMedicationId(medication.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for: " + medication.getName()));
            int prevQty = inventory.getCurrentQuantity();
            int newQty = prevQty + returnItem.getQuantity();
            inventory.setCurrentQuantity(newQty);
            inventoryRepository.save(inventory);

            // Create RETURN stock transaction
            StockTransaction transaction = StockTransaction.builder()
                    .medication(medication)
                    .batch(batch)
                    .transactionType(StockTransaction.TransactionType.RETURN)
                    .quantity(returnItem.getQuantity())
                    .previousQuantity(prevQty)
                    .newQuantity(newQty)
                    .unitPrice(originalItem.getUnitPrice())
                    .reason("SALES RETURN - Order: " + order.getOrderNumber() + " - " + request.getReason())
                    .batchNumber(batch != null ? batch.getBatchNumber() : null)
                    .user(currentUser)
                    .notes("Return processed by " + currentUser.getFullName())
                    .build();
            stockTransactionRepository.save(transaction);

            alertService.checkAndCreateStockAlerts(medication, newQty);
        }

        order.setOrderStatus(SalesOrder.OrderStatus.RETURNED);
        order.setNotes((order.getNotes() != null ? order.getNotes() + " | " : "") +
                "RETURNED: " + request.getReason() + " by " + currentUser.getFullName());
        salesOrderRepository.save(order);

        log.info("Sales return completed for order: {}", order.getOrderNumber());
        return SalesResponse.fromEntity(order);
    }
}
