package com.example.medbillhackathon.insurance;

import com.example.medbillhackathon.insurance.model.BillStatus;
import com.example.medbillhackathon.insurance.model.InsuranceBill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InsuranceRepository extends JpaRepository<InsuranceBill, UUID> {

    List<InsuranceBill> findByUserIdOrderByUploadedAtDesc(UUID userId);
    long countByUserId(UUID userId);
    List<InsuranceBill> findByUserIdAndStatus(UUID userId, BillStatus status);
    List<InsuranceBill> findByUserIdAndReimbursementEligibleTrue(UUID userId);
    boolean existsByIdAndUserId(UUID billId, UUID userId);
}