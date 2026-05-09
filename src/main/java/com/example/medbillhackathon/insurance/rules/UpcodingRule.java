package com.example.medbillhackathon.insurance.rules;

import com.example.medbillhackathon.insurance.model.BillLineItem;
import com.example.medbillhackathon.insurance.model.InsuranceBill;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class UpcodingRule implements BillingRule {

    private static final Map<String, List<String>> COMPLEXITY_LEVELS = new HashMap<>() {{
        put("OFFICE_VISIT_NEW", List.of("99201", "99202", "99203", "99204", "99205"));
        put("OFFICE_VISIT_ESTABLISHED", List.of("99211", "99212", "99213", "99214", "99215"));
        put("HOSPITAL_INITIAL", List.of("99221", "99222", "99223"));
        put("HOSPITAL_SUBSEQUENT", List.of("99231", "99232", "99233"));
        put("EMERGENCY", List.of("99281", "99282", "99283", "99284", "99285"));
    }};

    private static final Map<String, BigDecimal> BASELINE_RATES = new HashMap<>() {{
        put("99211", new BigDecimal("18.00"));
        put("99212", new BigDecimal("46.00"));
        put("99213", new BigDecimal("76.00"));
        put("99214", new BigDecimal("110.00"));
        put("99215", new BigDecimal("148.00"));
        put("99281", new BigDecimal("28.00"));
        put("99282", new BigDecimal("55.00"));
        put("99283", new BigDecimal("97.00"));
        put("99284", new BigDecimal("163.00"));
        put("99285", new BigDecimal("226.00"));
    }};

    private static final BigDecimal OVERCHARGE_THRESHOLD = new BigDecimal("3.0");

    @Override
    public String getRuleCode() {
        return "UPCODING";
    }

    @Override
    public String getRuleName() {
        return "Possible Upcoding / Overcharge";
    }

    @Override
    public List<RuleViolation> evaluate(InsuranceBill bill, List<BillLineItem> lineItems) {
        List<RuleViolation> violations = new ArrayList<>();
        Set<String> billedCodes = lineItems.stream()
                .filter(i -> i.getCode() != null)
                .map(BillLineItem::getCode)
                .collect(Collectors.toSet());

        for (Map.Entry<String, List<String>> entry : COMPLEXITY_LEVELS.entrySet()) {
            List<String> levels = entry.getValue();
            String highestCode = levels.get(levels.size() - 1);

            if (billedCodes.contains(highestCode)) {
                long otherCodesInCategory = levels.stream()
                        .filter(c -> !c.equals(highestCode) && billedCodes.contains(c))
                        .count();


                if (otherCodesInCategory == 0) {
                    BillLineItem flaggedItem = lineItems.stream()
                            .filter(i -> highestCode.equals(i.getCode()))
                            .findFirst().orElse(null);

                    if (flaggedItem != null) {
                        violations.add(RuleViolation.builder()
                                .ruleCode(getRuleCode())
                                .ruleName(getRuleName())
                                .severity(RuleViolation.Severity.MEDIUM)
                                .explanation(String.format(
                                        "Code '%s' represents the highest complexity level in the '%s' " +
                                                "category. This level requires extensive documentation and time. " +
                                                "This may be appropriate, but is worth verifying against your " +
                                                "visit notes.",
                                        highestCode, entry.getKey()))
                                .recommendation("Request your visit notes and confirm the complexity level " +
                                        "matches what actually occurred during your appointment.")
                                .reimbursementEligible(false) // Needs manual review
                                .affectedLineItemIds(List.of(flaggedItem.getId()))
                                .affectedCodes(List.of(highestCode))
                                .build());
                    }
                }
            }
        }

        for (BillLineItem item : lineItems) {
            if (item.getCode() == null || item.getUnitPrice() == null) continue;

            BigDecimal baseline = BASELINE_RATES.get(item.getCode());
            if (baseline == null) continue;

            BigDecimal threshold = baseline.multiply(OVERCHARGE_THRESHOLD);
            if (item.getUnitPrice().compareTo(threshold) > 0) {
                violations.add(RuleViolation.builder()
                        .ruleCode(getRuleCode() + "_PRICE")
                        .ruleName("Significant Price Overcharge")
                        .severity(RuleViolation.Severity.HIGH)
                        .explanation(String.format(
                                "Code '%s' was billed at $%.2f, which is %.1fx above the standard " +
                                        "Medicare baseline rate of $%.2f. While private insurers and hospitals " +
                                        "may charge more, this gap is unusually large.",
                                item.getCode(),
                                item.getUnitPrice(),
                                item.getUnitPrice().divide(baseline, 1, java.math.RoundingMode.HALF_UP),
                                baseline))
                        .recommendation("Request a price justification from your provider and compare " +
                                "with your insurer's Explanation of Benefits (EOB).")
                        .reimbursementEligible(true)
                        .affectedLineItemIds(List.of(item.getId()))
                        .affectedCodes(List.of(item.getCode()))
                        .build());
            }
        }

        return violations;
    }
}