package com.romen.inventory.repository;

import com.romen.inventory.entity.Medication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicationRepository extends JpaRepository<Medication, Long> {

    Optional<Medication> findByProductCode(String productCode);

    List<Medication> findByCategoryId(Long categoryId);

    List<Medication> findByProductType(Medication.MedicationType productType);

    List<Medication> findByIsActiveTrue();

    List<Medication> findByCategoryIdAndIsActiveTrue(Long categoryId);

    @Query("SELECT m FROM Medication m WHERE m.isActive = true AND m.productType = :type")
    List<Medication> findActiveByProductType(@Param("type") Medication.MedicationType type);

    @Query("SELECT m FROM Medication m WHERE (LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(m.chemicalName) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND m.isActive = true")
    List<Medication> searchActiveMedications(@Param("keyword") String keyword);

    @Query("SELECT m FROM Medication m WHERE m.isActive = true AND (m.minStockLevel IS NULL OR m.id NOT IN (SELECT i.medication.id FROM Inventory i WHERE i.currentQuantity > m.minStockLevel))")
    List<Medication> findLowStockMedications();

    boolean existsByProductCode(String productCode);

    boolean existsByNameAndCategoryId(String name, Long categoryId);

    @Query("SELECT COUNT(m) FROM Medication m WHERE m.isActive = true")
    Long countActiveMedications();

    @Query("SELECT COUNT(m) FROM Medication m WHERE m.productType = :type AND m.isActive = true")
    Long countByProductType(@Param("type") Medication.MedicationType type);

    List<Medication> findByScheduleCategory(Medication.ScheduleCategory scheduleCategory);

    @Query("SELECT m FROM Medication m WHERE m.isActive = true AND m.scheduleCategory = :schedule")
    List<Medication> findActiveByScheduleCategory(@Param("schedule") Medication.ScheduleCategory schedule);

    @Query("SELECT m FROM Medication m WHERE m.isActive = true AND m.therapeuticClass = :therapeuticClass")
    List<Medication> findActiveByTherapeuticClass(@Param("therapeuticClass") String therapeuticClass);
}
