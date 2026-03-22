// service/ReportService.java
package com.romen.inventory.service;

import com.romen.inventory.dto.InventoryResponse;
import com.romen.inventory.dto.StockTransactionResponse;
import com.romen.inventory.entity.Medication;
import com.romen.inventory.entity.StockTransaction;
import com.romen.inventory.repository.AlertRepository;
import com.romen.inventory.repository.BatchRepository;
import com.romen.inventory.repository.InventoryRepository;
import com.romen.inventory.repository.MedicationRepository;
import com.romen.inventory.repository.SalesItemRepository;
import com.romen.inventory.repository.SalesOrderRepository;
import com.romen.inventory.repository.StockTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final InventoryRepository inventoryRepository;
    private final StockTransactionRepository transactionRepository;
    private final MedicationRepository medicationRepository;
    private final AlertRepository alertRepository;
    private final InventoryService inventoryService;
    private final SalesOrderRepository salesOrderRepository;
    private final SalesItemRepository salesItemRepository;
    private final BatchRepository batchRepository;

    public Map<String, Object> generateAnalytics() {
        Map<String, Object> analytics = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();

        LocalDateTime todayStart = now.toLocalDate().atStartOfDay();
        LocalDateTime weekStart = now.minusDays(7);
        LocalDateTime monthStart = now.minusDays(30);

        // --- Sales KPIs ---
        BigDecimal todaySales = salesOrderRepository.calculateTotalSales(todayStart, now);
        Long todayCount = salesOrderRepository.countSalesToday(todayStart);
        analytics.put("todaySales", todaySales != null ? todaySales : BigDecimal.ZERO);
        analytics.put("todayOrderCount", todayCount != null ? todayCount : 0);

        BigDecimal weekSales = salesOrderRepository.calculateTotalSales(weekStart, now);
        Long weekCount = salesOrderRepository.countSalesToday(weekStart);
        analytics.put("weekSales", weekSales != null ? weekSales : BigDecimal.ZERO);
        analytics.put("weekOrderCount", weekCount != null ? weekCount : 0);

        BigDecimal monthSales = salesOrderRepository.calculateTotalSales(monthStart, now);
        Long monthCount = salesOrderRepository.countSalesToday(monthStart);
        analytics.put("monthSales", monthSales != null ? monthSales : BigDecimal.ZERO);
        analytics.put("monthOrderCount", monthCount != null ? monthCount : 0);

        // --- Top Selling Medications (last 30 days, top 10) ---
        List<Object[]> topProducts = salesItemRepository.findTopSellingProducts(monthStart, now);
        List<Map<String, Object>> topProductsList = new java.util.ArrayList<>();
        int limit = Math.min(topProducts.size(), 10);
        for (int i = 0; i < limit; i++) {
            Object[] row = topProducts.get(i);
            Map<String, Object> p = new HashMap<>();
            p.put("name", row[0]);
            p.put("quantity", row[1]);
            p.put("revenue", row[2]);
            topProductsList.add(p);
        }
        analytics.put("topProducts", topProductsList);

        // --- Category Breakdown (last 30 days) ---
        List<Object[]> categoryData = salesItemRepository.findSalesByCategory(monthStart, now);
        List<Map<String, Object>> categoryList = new java.util.ArrayList<>();
        for (Object[] row : categoryData) {
            Map<String, Object> c = new HashMap<>();
            c.put("category", row[0]);
            c.put("quantity", row[1]);
            c.put("revenue", row[2]);
            categoryList.add(c);
        }
        analytics.put("categoryBreakdown", categoryList);

        // --- Stock Health ---
        Long totalMedications = medicationRepository.countActiveMedications();
        Long lowStock = inventoryRepository.countLowStock();
        Long outOfStock = inventoryRepository.countOutOfStock();
        Long inStock = totalMedications - lowStock - outOfStock;
        analytics.put("totalProducts", totalMedications);
        analytics.put("inStockCount", inStock > 0 ? inStock : 0);
        analytics.put("lowStockCount", lowStock);
        analytics.put("outOfStockCount", outOfStock);
        analytics.put("totalStockQuantity", inventoryRepository.getTotalStockQuantity());

        // --- Expiry Risk ---
        BigDecimal expiryRisk30 = batchRepository.calculateExpiryRiskValue(LocalDate.now(), LocalDate.now().plusDays(30));
        BigDecimal expiryRisk90 = batchRepository.calculateExpiryRiskValue(LocalDate.now(), LocalDate.now().plusDays(90));
        analytics.put("expiryRisk30Days", expiryRisk30 != null ? expiryRisk30 : BigDecimal.ZERO);
        analytics.put("expiryRisk90Days", expiryRisk90 != null ? expiryRisk90 : BigDecimal.ZERO);

        // --- Wastage Summary ---
        Integer monthWastage = transactionRepository.getTotalWastage(monthStart, now);
        Integer weekWastage = transactionRepository.getTotalWastage(weekStart, now);
        analytics.put("monthWastage", monthWastage != null ? monthWastage : 0);
        analytics.put("weekWastage", weekWastage != null ? weekWastage : 0);

        // --- Transaction Counts (last 30 days) ---
        Integer totalStockIn = transactionRepository.getTotalStockIn(monthStart, now);
        Integer totalStockOut = transactionRepository.getTotalStockOut(monthStart, now);
        analytics.put("monthStockIn", totalStockIn != null ? totalStockIn : 0);
        analytics.put("monthStockOut", totalStockOut != null ? totalStockOut : 0);

        analytics.put("generatedAt", now.format(DateTimeFormatter.ISO_DATE_TIME));

        return analytics;
    }

    public Map<String, Object> generateStockReport(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> report = new HashMap<>();

        report.put("totalProducts", medicationRepository.countActiveMedications());
        report.put("brandedMedications",
                medicationRepository.countByProductType(Medication.MedicationType.BRANDED));
        report.put("genericMedications",
                medicationRepository.countByProductType(Medication.MedicationType.GENERIC));
        report.put("lowStockCount", inventoryRepository.countLowStock());
        report.put("outOfStockCount", inventoryRepository.countOutOfStock());
        report.put("totalStockQuantity", inventoryRepository.getTotalStockQuantity());

        List<InventoryResponse> inventory = inventoryRepository.findAll().stream()
                .filter(inv -> inv.getMedication() != null && inv.getMedication().getIsActive())
                .map(inventoryService::mapToInventoryResponse)
                .collect(Collectors.toList());
        report.put("inventoryDetails", inventory);

        report.put("startDate", startDate.format(DateTimeFormatter.ISO_DATE));
        report.put("endDate", endDate.format(DateTimeFormatter.ISO_DATE));
        report.put("generatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

        return report;
    }

    public Map<String, Object> generateSalesReport(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> report = new HashMap<>();

        Integer totalStockIn = transactionRepository.getTotalStockIn(startDate, endDate);
        Integer totalStockOut = transactionRepository.getTotalStockOut(startDate, endDate);
        BigDecimal totalSalesAmount = transactionRepository.getTotalSalesAmount(startDate, endDate);
        Long totalTransactions = transactionRepository.countTransactions(startDate, endDate);

        report.put("totalStockIn", totalStockIn != null ? totalStockIn : 0);
        report.put("totalStockOut", totalStockOut != null ? totalStockOut : 0);
        report.put("totalSalesAmount", totalSalesAmount != null ? totalSalesAmount : BigDecimal.ZERO);
        report.put("totalTransactions", totalTransactions != null ? totalTransactions : 0);

        List<StockTransaction> stockOutTransactions = transactionRepository.findByTypeAndDateRange(
                StockTransaction.TransactionType.STOCK_OUT, startDate, endDate);

        List<StockTransactionResponse> salesDetails = stockOutTransactions.stream()
                .map(this::mapToTransactionResponse)
                .collect(Collectors.toList());
        report.put("salesDetails", salesDetails);

        report.put("startDate", startDate.format(DateTimeFormatter.ISO_DATE));
        report.put("endDate", endDate.format(DateTimeFormatter.ISO_DATE));
        report.put("generatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

        return report;
    }

    public Map<String, Object> generateUsageReport(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> report = new HashMap<>();

        List<StockTransaction> transactions = transactionRepository.findByDateRange(startDate, endDate);

        Map<StockTransaction.TransactionType, List<StockTransaction>> byType = transactions.stream()
                .collect(Collectors.groupingBy(StockTransaction::getTransactionType));

        report.put("totalTransactions", transactions.size());
        report.put("stockInCount", byType.getOrDefault(StockTransaction.TransactionType.STOCK_IN, List.of()).size());
        report.put("stockOutCount", byType.getOrDefault(StockTransaction.TransactionType.STOCK_OUT, List.of()).size());
        report.put("adjustmentCount", byType.getOrDefault(StockTransaction.TransactionType.ADJUSTMENT, List.of()).size());
        report.put("wastageCount", byType.getOrDefault(StockTransaction.TransactionType.WASTAGE, List.of()).size());
        report.put("returnCount", byType.getOrDefault(StockTransaction.TransactionType.RETURN, List.of()).size());
        report.put("quarantineCount", byType.getOrDefault(StockTransaction.TransactionType.QUARANTINE, List.of()).size());

        List<StockTransactionResponse> transactionDetails = transactions.stream()
                .map(this::mapToTransactionResponse)
                .collect(Collectors.toList());
        report.put("transactionDetails", transactionDetails);

        report.put("startDate", startDate.format(DateTimeFormatter.ISO_DATE));
        report.put("endDate", endDate.format(DateTimeFormatter.ISO_DATE));
        report.put("generatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

        return report;
    }

    public byte[] generateStockReportCSV(LocalDateTime startDate, LocalDateTime endDate) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream, true, StandardCharsets.UTF_8);

        writer.println("Stock Report - " + startDate.toLocalDate() + " to " + endDate.toLocalDate());
        writer.println("Generated at: " + LocalDateTime.now());
        writer.println();

        writer.println("Medication ID,Product Code,Medication Name,Category,Type,Schedule,Current Stock,Min Stock,Max Stock,Status,Location");

        inventoryRepository.findAll().stream().filter(inv -> inv.getMedication().getIsActive()).forEach(inv -> {
            String status = inv.getIsOutOfStock() ? "OUT_OF_STOCK"
                    : (inv.getIsLowStock() ? "LOW_STOCK" : "IN_STOCK");
            writer.printf("%d,%s,%s,%s,%s,%s,%d,%d,%d,%s,%s%n",
                    inv.getMedication().getId(),
                    inv.getMedication().getProductCode(),
                    inv.getMedication().getName(),
                    inv.getMedication().getCategory().getName(),
                    inv.getMedication().getProductType(),
                    inv.getMedication().getScheduleCategory(),
                    inv.getCurrentQuantity(),
                    inv.getMedication().getMinStockLevel(),
                    inv.getMedication().getMaxStockLevel(),
                    status,
                    inv.getLocation() != null ? inv.getLocation() : "");
        });

        writer.flush();
        return outputStream.toByteArray();
    }

    public byte[] generateSalesReportCSV(LocalDateTime startDate, LocalDateTime endDate) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream, true, StandardCharsets.UTF_8);

        writer.println("Sales Report - " + startDate.toLocalDate() + " to " + endDate.toLocalDate());
        writer.println("Generated at: " + LocalDateTime.now());
        writer.println();

        writer.println("Transaction ID,Date,Medication,Product Code,Batch,Quantity,Unit Price,Total Amount,User,Reference");

        List<StockTransaction> transactions = transactionRepository.findByTypeAndDateRange(
                StockTransaction.TransactionType.STOCK_OUT, startDate, endDate);

        transactions.forEach(t -> {
            writer.printf("%d,%s,%s,%s,%s,%d,%s,%s,%s,%s%n",
                    t.getId(),
                    t.getTransactionDate().format(DateTimeFormatter.ISO_DATE_TIME),
                    t.getMedication().getName(),
                    t.getMedication().getProductCode(),
                    t.getBatchNumber() != null ? t.getBatchNumber() : "",
                    Math.abs(t.getQuantity()),
                    t.getUnitPrice() != null ? t.getUnitPrice() : "",
                    t.getTotalAmount() != null ? t.getTotalAmount() : "",
                    t.getUser().getFullName(),
                    t.getReferenceNumber() != null ? t.getReferenceNumber() : "");
        });

        writer.flush();
        return outputStream.toByteArray();
    }

    public byte[] generateUsageReportCSV(LocalDateTime startDate, LocalDateTime endDate) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream, true, StandardCharsets.UTF_8);

        writer.println("Usage Report - " + startDate.toLocalDate() + " to " + endDate.toLocalDate());
        writer.println("Generated at: " + LocalDateTime.now());
        writer.println();

        writer.println("Transaction ID,Date,Medication,Type,Quantity,Previous Qty,New Qty,User,Reason");

        List<StockTransaction> transactions = transactionRepository.findByDateRange(startDate, endDate);

        transactions.forEach(t -> {
            writer.printf("%d,%s,%s,%s,%d,%d,%d,%s,%s%n",
                    t.getId(),
                    t.getTransactionDate().format(DateTimeFormatter.ISO_DATE_TIME),
                    t.getMedication().getName(),
                    t.getTransactionType(),
                    t.getQuantity(),
                    t.getPreviousQuantity(),
                    t.getNewQuantity(),
                    t.getUser().getFullName(),
                    t.getReason() != null ? t.getReason() : "");
        });

        writer.flush();
        return outputStream.toByteArray();
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
