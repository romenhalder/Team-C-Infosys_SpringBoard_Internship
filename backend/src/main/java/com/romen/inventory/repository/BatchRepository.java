package com.romen.inventory.repository;

import com.romen.inventory.entity.Batch;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BatchRepository extends JpaRepository<Batch, Long> {

    List<Batch> findByMedicationId(Long medicationId);

    @Query("SELECT b FROM Batch b WHERE b.medication.id = :medicationId AND b.isQuarantined = false AND (b.currentStock - COALESCE(b.reservedStock, 0)) > 0 ORDER BY b.expiryDate ASC")
    List<Batch> findActiveBatchesFEFO(@Param("medicationId") Long medicationId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Batch b WHERE b.medication.id = :medicationId AND b.isQuarantined = false AND (b.currentStock - COALESCE(b.reservedStock, 0)) > 0 ORDER BY b.expiryDate ASC")
    List<Batch> findActiveBatchesFEFOWithLock(@Param("medicationId") Long medicationId);

    @Query("SELECT b FROM Batch b WHERE b.expiryDate < :date AND b.isQuarantined = false AND b.currentStock > 0")
    List<Batch> findExpiredUnquarantined(@Param("date") LocalDate date);

    @Query("SELECT b FROM Batch b WHERE b.expiryDate BETWEEN :today AND :threshold AND b.isQuarantined = false AND b.currentStock > 0")
    List<Batch> findExpiringSoon(@Param("today") LocalDate today, @Param("threshold") LocalDate threshold);

    @Query("SELECT b FROM Batch b WHERE b.expiryDate < :threshold AND b.isQuarantined = false AND b.currentStock > 0")
    List<Batch> findExpiringBefore(@Param("threshold") LocalDate threshold);

    @Query("SELECT b FROM Batch b WHERE b.isQuarantined = true ORDER BY b.quarantinedAt DESC")
    List<Batch> findQuarantinedBatches();

    @Query("SELECT COALESCE(SUM(b.currentStock), 0) FROM Batch b WHERE b.medication.id = :medicationId AND b.isQuarantined = false")
    Integer getTotalActiveStock(@Param("medicationId") Long medicationId);

    List<Batch> findByBatchNumberAndMedicationId(String batchNumber, Long medicationId);

    Optional<Batch> findByBatchNumberAndMedicationIdAndIsQuarantinedFalse(String batchNumber, Long medicationId);

    @Query("SELECT SUM(b.currentStock * b.mrp) FROM Batch b WHERE b.expiryDate BETWEEN :today AND :threshold AND b.isQuarantined = false")
    java.math.BigDecimal calculateExpiryRiskValue(@Param("today") LocalDate today, @Param("threshold") LocalDate threshold);

    @Query("SELECT COALESCE(SUM(b.currentStock - COALESCE(b.reservedStock, 0)), 0) FROM Batch b WHERE b.medication.id = :medicationId AND b.isQuarantined = false")
    Integer getTotalAvailableStock(@Param("medicationId") Long medicationId);
}
