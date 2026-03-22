package com.romen.inventory.repository;

import com.romen.inventory.entity.ScheduleH1Entry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ScheduleH1EntryRepository extends JpaRepository<ScheduleH1Entry, Long> {

    List<ScheduleH1Entry> findBySalesOrderId(Long salesOrderId);

    List<ScheduleH1Entry> findByMedicationId(Long medicationId);

    @Query("SELECT s FROM ScheduleH1Entry s WHERE s.createdAt BETWEEN :startDate AND :endDate ORDER BY s.createdAt DESC")
    List<ScheduleH1Entry> findByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query("SELECT s FROM ScheduleH1Entry s ORDER BY s.createdAt DESC")
    List<ScheduleH1Entry> findAllOrderByDateDesc();
}
