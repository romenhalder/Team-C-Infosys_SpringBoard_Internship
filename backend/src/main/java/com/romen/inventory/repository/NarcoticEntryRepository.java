package com.romen.inventory.repository;

import com.romen.inventory.entity.NarcoticEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NarcoticEntryRepository extends JpaRepository<NarcoticEntry, Long> {

    List<NarcoticEntry> findByApprovalStatus(NarcoticEntry.ApprovalStatus status);

    @Query("SELECT n FROM NarcoticEntry n WHERE n.createdAt BETWEEN :startDate AND :endDate ORDER BY n.createdAt DESC")
    List<NarcoticEntry> findByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query("SELECT n FROM NarcoticEntry n ORDER BY n.createdAt DESC")
    List<NarcoticEntry> findAllOrderByDateDesc();
}
