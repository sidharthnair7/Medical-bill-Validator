package com.example.medbillhackathon.insurance.service;

import com.example.medbillhackathon.insurance.model.BillLineItem;
import com.example.medbillhackathon.insurance.model.BillStatus;
import com.example.medbillhackathon.insurance.model.InsuranceBill;
import com.example.medbillhackathon.insurance.InsuranceRepository;
import com.example.medbillhackathon.insurance.rules.BillingRuleEngine;
import com.example.medbillhackathon.insurance.rules.RuleViolation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillAnalysisService {

    private final BillPdfParserService pdfParser;
    private final BillingRuleEngine ruleEngine;
    private final WatsonXService watsonXService;
    private final InsuranceRepository billRepository;

    public InsuranceBill analyzeUploadedBill(MultipartFile file, UUID userId) throws Exception {
        log.info("Starting bill analysis for user {} — file: {}", userId, file.getOriginalFilename());

        InsuranceBill bill;
        try {
            bill = pdfParser.parsePdf(file, userId);
            bill.setStatus(BillStatus.ANALYZING);
            bill = billRepository.save(bill);
        } catch (Exception e) {
            log.error("PDF parsing failed for file '{}': {}", file.getOriginalFilename(), e.getMessage());
            throw new RuntimeException("Could not read the uploaded file. Please ensure it is a valid PDF bill.", e);
        }

        try {
            List<BillLineItem> lineItems = bill.getLineItems();
            List<RuleViolation> violations = ruleEngine.run(bill, lineItems);
            applyViolationsToLineItems(violations, lineItems);
            String summary = buildValidationSummary(violations);
            bill.setValidationSummary(summary);

            List<String> billingCodes = lineItems.stream()
                    .filter(i -> i.getCode() != null)
                    .map(BillLineItem::getCode)
                    .distinct()
                    .collect(Collectors.toList());

            String aiAnalysis = watsonXService.analyzeInsuranceBill(
                    bill.getRawExtractedText(),
                    violations,
                    billingCodes,
                    bill.getPatientName(),
                    bill.getProviderName()
            );
            bill.setAiAnalysis(aiAnalysis);

            boolean anyReimbursable = violations.stream()
                    .anyMatch(RuleViolation::isReimbursementEligible);

            bill.setStatus(violations.isEmpty() ? BillStatus.CLEAN : BillStatus.ISSUES_FOUND);
            bill.setReimbursementEligible(anyReimbursable);
            bill.setAnalyzedAt(LocalDateTime.now());

            bill = billRepository.save(bill);
            log.info("Bill analysis complete for bill {}. Status: {}, Issues: {}, Reimbursable: {}",
                    bill.getId(), bill.getStatus(), violations.size(), anyReimbursable);

        } catch (Exception e) {
            bill.setStatus(BillStatus.FAILED);
            bill.setValidationSummary("Analysis failed: " + e.getMessage());
            billRepository.save(bill);
            log.error("Analysis failed for bill {}: {}", bill.getId(), e.getMessage());
            throw e;
        }

        return bill;
    }

    private void applyViolationsToLineItems(List<RuleViolation> violations, List<BillLineItem> lineItems) {
        for (RuleViolation violation : violations) {
            if (violation.getAffectedLineItemIds() == null) continue;
            for (BillLineItem item : lineItems) {
                if (violation.getAffectedLineItemIds().contains(item.getId())) {
                    item.setFlagged(true);
                    item.setFlagReason(violation.getRuleCode());
                    item.setFlagExplanation(violation.getExplanation());
                    item.setReimbursementEligible(violation.isReimbursementEligible());
                }
            }
        }
    }

    private String buildValidationSummary(List<RuleViolation> violations) {
        if (violations.isEmpty()) {
            return "No billing issues were detected by the automated rule engine.";
        }

        long high = violations.stream().filter(v -> v.getSeverity() == RuleViolation.Severity.HIGH).count();
        long medium = violations.stream().filter(v -> v.getSeverity() == RuleViolation.Severity.MEDIUM).count();
        long reimbursable = violations.stream().filter(RuleViolation::isReimbursementEligible).count();

        return String.format("Found %d issue(s): %d high severity, %d medium severity. " +
                        "%d issue(s) may qualify for reimbursement. Issues: %s",
                violations.size(), high, medium, reimbursable,
                violations.stream().map(RuleViolation::getRuleName).collect(Collectors.joining(", ")));
    }

    public InsuranceBill getBill(UUID billId) {
        return billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found: " + billId));
    }

    public List<InsuranceBill> getUserBills(UUID userId) {
        return billRepository.findByUserIdOrderByUploadedAtDesc(userId);
    }
}