package com.example.medbillhackathon.insurance;

import com.example.medbillhackathon.insurance.model.BillStatus;
import com.example.medbillhackathon.insurance.model.CodeType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;


public class InsuranceDTO {

    public record BillAnalysisResponse(
            UUID id,
            String originalFileName,
            String patientName,
            String policyNumber,
            String providerName,
            LocalDate serviceDate,
            BigDecimal totalAmount,
            BillStatus status,
            String validationSummary,
            String aiAnalysis,
            Boolean reimbursementEligible,
            LocalDateTime uploadedAt,
            LocalDateTime analyzedAt,
            List<LineItemResponse> lineItems,
            List<ViolationResponse> violations
    ) {}

    public record LineItemResponse(
            UUID id,
            String code,
            CodeType codeType,
            String description,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            Boolean flagged,
            String flagReason,
            String flagExplanation,
            Boolean reimbursementEligible,
            Integer lineNumber,
            // Populated by code lookup endpoint
            String codeFullDescription,
            String codeCategory
    ) {}

    public record ViolationResponse(
            String ruleCode,
            String ruleName,
            String severity,
            String explanation,
            String recommendation,
            boolean reimbursementEligible,
            List<String> affectedCodes
    ) {}

    public record BillSummaryResponse(
            UUID id,
            String originalFileName,
            String providerName,
            LocalDate serviceDate,
            BigDecimal totalAmount,
            BillStatus status,
            Boolean reimbursementEligible,
            int issueCount,
            LocalDateTime uploadedAt
    ) {}

    public record CodeLookupResponse(
            String code,
            CodeType codeType,
            String shortDescription,
            String fullDescription,
            String category,
            String typicalUse,
            boolean commonlyMisbilled,
            String patientTip
    ) {}
}