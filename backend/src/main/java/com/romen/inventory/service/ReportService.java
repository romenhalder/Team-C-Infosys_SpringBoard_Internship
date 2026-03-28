// service/ReportService.java
package com.romen.inventory.service;

import com.romen.inventory.dto.InventoryResponse;
import com.romen.inventory.dto.StockTransactionResponse;
import com.romen.inventory.entity.Medication;
import com.romen.inventory.entity.SalesOrder;
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
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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

    public Map<String, Object> generateRevenueReport(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> report = new HashMap<>();

        List<SalesOrder> orders = salesOrderRepository.findByDateRange(startDate, endDate);

        BigDecimal grossRevenue = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        BigDecimal totalCgst = BigDecimal.ZERO;
        BigDecimal totalSgst = BigDecimal.ZERO;
        BigDecimal netRevenue = BigDecimal.ZERO;
        int totalOrders = orders.size();
        int totalItemsSold = 0;
        Map<String, BigDecimal> revenueByPaymentMethod = new HashMap<>();
        Map<String, BigDecimal> revenueByCategory = new HashMap<>();
        List<Map<String, Object>> dailyRevenue = new ArrayList<>();

        for (SalesOrder order : orders) {
            grossRevenue = grossRevenue.add(order.getSubtotal() != null ? order.getSubtotal() : BigDecimal.ZERO);
            totalDiscount = totalDiscount.add(order.getDiscountAmount() != null ? order.getDiscountAmount() : BigDecimal.ZERO);
            totalCgst = totalCgst.add(order.getCgstAmount() != null ? order.getCgstAmount() : BigDecimal.ZERO);
            totalSgst = totalSgst.add(order.getSgstAmount() != null ? order.getSgstAmount() : BigDecimal.ZERO);
            netRevenue = netRevenue.add(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);

            totalItemsSold += order.getItems() != null ? order.getItems().size() : 0;

            String paymentMethod = order.getPaymentMethod() != null ? order.getPaymentMethod().name() : "UNKNOWN";
            revenueByPaymentMethod.merge(paymentMethod, order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO, BigDecimal::add);

            if (order.getItems() != null) {
                for (var item : order.getItems()) {
                    if (item.getMedication() != null && item.getMedication().getCategory() != null) {
                        String category = item.getMedication().getCategory().getName();
                        revenueByCategory.merge(category, item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO, BigDecimal::add);
                    }
                }
            }
        }

        Map<LocalDate, BigDecimal> dailyTotals = new HashMap<>();
        for (SalesOrder order : orders) {
            if (order.getCreatedAt() != null) {
                LocalDate date = order.getCreatedAt().toLocalDate();
                dailyTotals.merge(date, order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO, BigDecimal::add);
            }
        }

        for (Map.Entry<LocalDate, BigDecimal> entry : dailyTotals.entrySet()) {
            Map<String, Object> dayData = new HashMap<>();
            dayData.put("date", entry.getKey().format(DateTimeFormatter.ISO_DATE));
            dayData.put("revenue", entry.getValue());
            dailyRevenue.add(dayData);
        }
        dailyRevenue.sort((a, b) -> ((String) a.get("date")).compareTo((String) b.get("date")));

        report.put("grossRevenue", grossRevenue);
        report.put("totalDiscount", totalDiscount);
        report.put("totalCgst", totalCgst);
        report.put("totalSgst", totalSgst);
        report.put("netRevenue", netRevenue);
        report.put("totalOrders", totalOrders);
        report.put("totalItemsSold", totalItemsSold);
        report.put("averageOrderValue", totalOrders > 0 ? netRevenue.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        report.put("revenueByPaymentMethod", revenueByPaymentMethod);
        report.put("revenueByCategory", revenueByCategory);
        report.put("dailyRevenue", dailyRevenue);

        report.put("startDate", startDate.format(DateTimeFormatter.ISO_DATE));
        report.put("endDate", endDate.format(DateTimeFormatter.ISO_DATE));
        report.put("generatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

        return report;
    }

    public byte[] generateRevenueReportCSV(LocalDateTime startDate, LocalDateTime endDate) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream, true, StandardCharsets.UTF_8);

        writer.println("Revenue Report - " + startDate.toLocalDate() + " to " + endDate.toLocalDate());
        writer.println("Generated at: " + LocalDateTime.now());
        writer.println();

        writer.println("Order Number,Date,Customer,Subtotal,GST,Discount,Total,Payment Method,Sold By");

        List<SalesOrder> orders = salesOrderRepository.findByDateRange(startDate, endDate);
        for (SalesOrder order : orders) {
            writer.printf("%s,%s,%s,%s,%s,%s,%s,%s,%s%n",
                    order.getOrderNumber(),
                    order.getCreatedAt() != null ? order.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME) : "",
                    order.getCustomerName() != null ? order.getCustomerName() : "",
                    order.getSubtotal() != null ? order.getSubtotal() : BigDecimal.ZERO,
                    (order.getCgstAmount().add(order.getSgstAmount())),
                    order.getDiscountAmount() != null ? order.getDiscountAmount() : BigDecimal.ZERO,
                    order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO,
                    order.getPaymentMethod(),
                    order.getSoldBy() != null ? order.getSoldBy().getFullName() : "");
        }

        BigDecimal total = orders.stream()
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        writer.println();
        writer.printf("TOTAL,,,,,,%s%n", total);

        writer.flush();
        return outputStream.toByteArray();
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

    // ========== PROFIT / LOSS REPORT ==========

    public Map<String, Object> generateProfitLossReport(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> report = new HashMap<>();

        List<SalesOrder> orders = salesOrderRepository.findByDateRange(startDate, endDate);

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;
        List<Map<String, Object>> productProfits = new ArrayList<>();
        Map<String, BigDecimal[]> categoryProfits = new HashMap<>();

        for (SalesOrder order : orders) {
            if (order.getItems() == null) continue;
            for (var item : order.getItems()) {
                BigDecimal sellingPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal costPrice = BigDecimal.ZERO;

                // Use PTR (Price to Retailer) as cost price if available from batch
                if (item.getBatch() != null && item.getBatch().getPtr() != null) {
                    costPrice = item.getBatch().getPtr();
                } else if (item.getBatch() != null && item.getBatch().getPts() != null) {
                    costPrice = item.getBatch().getPts();
                }

                int qty = item.getQuantity();
                BigDecimal lineRevenue = sellingPrice.multiply(BigDecimal.valueOf(qty));
                BigDecimal lineCost = costPrice.multiply(BigDecimal.valueOf(qty));
                BigDecimal lineProfit = lineRevenue.subtract(lineCost);

                totalRevenue = totalRevenue.add(lineRevenue);
                totalCost = totalCost.add(lineCost);

                Map<String, Object> productProfit = new HashMap<>();
                productProfit.put("productName", item.getMedication().getName());
                productProfit.put("productCode", item.getMedication().getProductCode());
                productProfit.put("quantitySold", qty);
                productProfit.put("sellingPrice", sellingPrice);
                productProfit.put("costPrice", costPrice);
                productProfit.put("revenue", lineRevenue);
                productProfit.put("cost", lineCost);
                productProfit.put("profit", lineProfit);
                productProfit.put("margin", lineRevenue.compareTo(BigDecimal.ZERO) > 0
                        ? lineProfit.multiply(BigDecimal.valueOf(100)).divide(lineRevenue, 2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO);
                productProfits.add(productProfit);

                String category = item.getMedication().getCategory() != null
                        ? item.getMedication().getCategory().getName() : "Uncategorized";
                categoryProfits.computeIfAbsent(category, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
                BigDecimal[] catValues = categoryProfits.get(category);
                catValues[0] = catValues[0].add(lineRevenue);
                catValues[1] = catValues[1].add(lineCost);
                catValues[2] = catValues[2].add(lineProfit);
            }
        }

        BigDecimal totalProfit = totalRevenue.subtract(totalCost);
        BigDecimal profitMargin = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? totalProfit.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        report.put("totalRevenue", totalRevenue);
        report.put("totalCost", totalCost);
        report.put("totalProfit", totalProfit);
        report.put("profitMargin", profitMargin);
        report.put("totalOrders", orders.size());

        List<Map<String, Object>> categoryList = new ArrayList<>();
        for (Map.Entry<String, BigDecimal[]> entry : categoryProfits.entrySet()) {
            Map<String, Object> cat = new HashMap<>();
            cat.put("category", entry.getKey());
            cat.put("revenue", entry.getValue()[0]);
            cat.put("cost", entry.getValue()[1]);
            cat.put("profit", entry.getValue()[2]);
            categoryList.add(cat);
        }
        report.put("categoryBreakdown", categoryList);
        report.put("productDetails", productProfits);
        report.put("startDate", startDate.format(DateTimeFormatter.ISO_DATE));
        report.put("endDate", endDate.format(DateTimeFormatter.ISO_DATE));
        report.put("generatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

        return report;
    }

    // ========== EXPIRY LOSS REPORT ==========

    public Map<String, Object> generateExpiryLossReport(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> report = new HashMap<>();

        List<com.romen.inventory.entity.Batch> allBatches = batchRepository.findAll();

        BigDecimal totalExpiredValue = BigDecimal.ZERO;
        BigDecimal totalAtRiskValue = BigDecimal.ZERO;
        List<Map<String, Object>> expiredBatches = new ArrayList<>();
        List<Map<String, Object>> atRiskBatches = new ArrayList<>();
        Map<String, BigDecimal> lossByCategory = new HashMap<>();

        LocalDate today = LocalDate.now();

        for (var batch : allBatches) {
            if (batch.getMedication() == null) continue;
            BigDecimal mrp = batch.getMrp() != null ? batch.getMrp() : BigDecimal.ZERO;
            BigDecimal batchValue = mrp.multiply(BigDecimal.valueOf(batch.getCurrentStock()));

            if (batch.isExpired() || Boolean.TRUE.equals(batch.getIsQuarantined())) {
                totalExpiredValue = totalExpiredValue.add(batchValue);

                Map<String, Object> expData = new HashMap<>();
                expData.put("batchNumber", batch.getBatchNumber());
                expData.put("medicationName", batch.getMedication().getName());
                expData.put("expiryDate", batch.getExpiryDate());
                expData.put("currentStock", batch.getCurrentStock());
                expData.put("mrp", mrp);
                expData.put("lossValue", batchValue);
                expData.put("isQuarantined", batch.getIsQuarantined());
                expData.put("quarantineReason", batch.getQuarantineReason());
                expiredBatches.add(expData);

                String category = batch.getMedication().getCategory() != null
                        ? batch.getMedication().getCategory().getName() : "Uncategorized";
                lossByCategory.merge(category, batchValue, BigDecimal::add);
            } else if (batch.isExpiringSoon(90)) {
                totalAtRiskValue = totalAtRiskValue.add(batchValue);

                Map<String, Object> riskData = new HashMap<>();
                riskData.put("batchNumber", batch.getBatchNumber());
                riskData.put("medicationName", batch.getMedication().getName());
                riskData.put("expiryDate", batch.getExpiryDate());
                riskData.put("daysUntilExpiry", batch.getDaysUntilExpiry());
                riskData.put("expiryCategory", batch.getExpiryCategory().name());
                riskData.put("currentStock", batch.getCurrentStock());
                riskData.put("mrp", mrp);
                riskData.put("atRiskValue", batchValue);
                atRiskBatches.add(riskData);
            }
        }

        report.put("totalExpiredValue", totalExpiredValue);
        report.put("totalAtRiskValue", totalAtRiskValue);
        report.put("totalLoss", totalExpiredValue.add(totalAtRiskValue));
        report.put("expiredBatchCount", expiredBatches.size());
        report.put("atRiskBatchCount", atRiskBatches.size());
        report.put("expiredBatches", expiredBatches);
        report.put("atRiskBatches", atRiskBatches);
        report.put("lossByCategory", lossByCategory);
        report.put("generatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

        return report;
    }

    // ========== INVENTORY VALUATION REPORT ==========

    public Map<String, Object> generateInventoryValuation() {
        Map<String, Object> report = new HashMap<>();

        List<com.romen.inventory.entity.Batch> activeBatches = batchRepository.findAllActiveBatchesFEFO();

        BigDecimal totalMRPValue = BigDecimal.ZERO;
        BigDecimal totalCostValue = BigDecimal.ZERO;
        List<Map<String, Object>> valuationDetails = new ArrayList<>();
        Map<String, BigDecimal[]> categoryValuation = new HashMap<>();

        for (var batch : activeBatches) {
            if (batch.getMedication() == null) continue;
            BigDecimal mrp = batch.getMrp() != null ? batch.getMrp() : BigDecimal.ZERO;
            BigDecimal cost = batch.getPtr() != null ? batch.getPtr() : (batch.getPts() != null ? batch.getPts() : BigDecimal.ZERO);
            int stock = batch.getCurrentStock();

            BigDecimal mrpValue = mrp.multiply(BigDecimal.valueOf(stock));
            BigDecimal costValue = cost.multiply(BigDecimal.valueOf(stock));

            totalMRPValue = totalMRPValue.add(mrpValue);
            totalCostValue = totalCostValue.add(costValue);

            Map<String, Object> detail = new HashMap<>();
            detail.put("medicationName", batch.getMedication().getName());
            detail.put("batchNumber", batch.getBatchNumber());
            detail.put("currentStock", stock);
            detail.put("mrp", mrp);
            detail.put("costPrice", cost);
            detail.put("mrpValue", mrpValue);
            detail.put("costValue", costValue);
            detail.put("expiryDate", batch.getExpiryDate());
            detail.put("expiryCategory", batch.getExpiryCategory().name());
            valuationDetails.add(detail);

            String category = batch.getMedication().getCategory() != null
                    ? batch.getMedication().getCategory().getName() : "Uncategorized";
            categoryValuation.computeIfAbsent(category, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            BigDecimal[] catValues = categoryValuation.get(category);
            catValues[0] = catValues[0].add(mrpValue);
            catValues[1] = catValues[1].add(costValue);
        }

        List<Map<String, Object>> categoryList = new ArrayList<>();
        for (Map.Entry<String, BigDecimal[]> entry : categoryValuation.entrySet()) {
            Map<String, Object> cat = new HashMap<>();
            cat.put("category", entry.getKey());
            cat.put("mrpValue", entry.getValue()[0]);
            cat.put("costValue", entry.getValue()[1]);
            cat.put("potentialProfit", entry.getValue()[0].subtract(entry.getValue()[1]));
            categoryList.add(cat);
        }

        report.put("totalMRPValue", totalMRPValue);
        report.put("totalCostValue", totalCostValue);
        report.put("totalPotentialProfit", totalMRPValue.subtract(totalCostValue));
        report.put("totalBatches", activeBatches.size());
        report.put("categoryValuation", categoryList);
        report.put("valuationDetails", valuationDetails);
        report.put("generatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

        return report;
    }

    // ========== CSV EXPORTS FOR NEW REPORTS ==========

    public byte[] generateProfitLossReportCSV(LocalDateTime startDate, LocalDateTime endDate) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream, true, StandardCharsets.UTF_8);

        writer.println("Profit & Loss Report - " + startDate.toLocalDate() + " to " + endDate.toLocalDate());
        writer.println("Generated at: " + LocalDateTime.now());
        writer.println();
        writer.println("Product Name,Product Code,Qty Sold,Selling Price,Cost Price,Revenue,Cost,Profit,Margin %");

        Map<String, Object> report = generateProfitLossReport(startDate, endDate);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> details = (List<Map<String, Object>>) report.get("productDetails");
        if (details != null) {
            for (Map<String, Object> item : details) {
                writer.printf("%s,%s,%s,%s,%s,%s,%s,%s,%s%n",
                        item.get("productName"), item.get("productCode"),
                        item.get("quantitySold"), item.get("sellingPrice"),
                        item.get("costPrice"), item.get("revenue"),
                        item.get("cost"), item.get("profit"), item.get("margin"));
            }
        }

        writer.println();
        writer.printf("TOTALS,,,,,%s,%s,%s,%s%n",
                report.get("totalRevenue"), report.get("totalCost"),
                report.get("totalProfit"), report.get("profitMargin"));

        writer.flush();
        return outputStream.toByteArray();
    }

    public byte[] generateExpiryLossReportCSV(LocalDateTime startDate, LocalDateTime endDate) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream, true, StandardCharsets.UTF_8);

        writer.println("Expiry Loss Report");
        writer.println("Generated at: " + LocalDateTime.now());
        writer.println();
        writer.println("Batch Number,Medication,Expiry Date,Stock,MRP,Loss Value,Quarantined,Reason");

        Map<String, Object> report = generateExpiryLossReport(startDate, endDate);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> expired = (List<Map<String, Object>>) report.get("expiredBatches");
        if (expired != null) {
            for (Map<String, Object> item : expired) {
                writer.printf("%s,%s,%s,%s,%s,%s,%s,%s%n",
                        item.get("batchNumber"), item.get("medicationName"),
                        item.get("expiryDate"), item.get("currentStock"),
                        item.get("mrp"), item.get("lossValue"),
                        item.get("isQuarantined"), item.get("quarantineReason"));
            }
        }

        writer.println();
        writer.printf("Total Expired Value: %s%n", report.get("totalExpiredValue"));
        writer.printf("Total At-Risk Value: %s%n", report.get("totalAtRiskValue"));

        writer.flush();
        return outputStream.toByteArray();
    }

    public byte[] generateInventoryValuationCSV() {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream, true, StandardCharsets.UTF_8);

        writer.println("Inventory Valuation Report");
        writer.println("Generated at: " + LocalDateTime.now());
        writer.println();
        writer.println("Medication,Batch,Stock,MRP,Cost,MRP Value,Cost Value,Expiry,Category");

        Map<String, Object> report = generateInventoryValuation();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> details = (List<Map<String, Object>>) report.get("valuationDetails");
        if (details != null) {
            for (Map<String, Object> item : details) {
                writer.printf("%s,%s,%s,%s,%s,%s,%s,%s,%s%n",
                        item.get("medicationName"), item.get("batchNumber"),
                        item.get("currentStock"), item.get("mrp"),
                        item.get("costPrice"), item.get("mrpValue"),
                        item.get("costValue"), item.get("expiryDate"),
                        item.get("expiryCategory"));
            }
        }

        writer.println();
        writer.printf("Total MRP Value: %s%n", report.get("totalMRPValue"));
        writer.printf("Total Cost Value: %s%n", report.get("totalCostValue"));
        writer.printf("Potential Profit: %s%n", report.get("totalPotentialProfit"));

        writer.flush();
        return outputStream.toByteArray();
    }
}
