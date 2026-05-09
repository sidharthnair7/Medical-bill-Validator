package com.example.medbillhackathon.insurance.rules;

import com.example.medbillhackathon.insurance.model.BillLineItem;
import com.example.medbillhackathon.insurance.model.InsuranceBill;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Detects the same billing code appearing more than once on a bill
 * when quantity=1 each time (likely a duplicate charge, not a legitimate
 * multi-service scenario).
 */
@Component
public class DuplicateCodeRule implements BillingRule {

    @Override
    public String getRuleCode() {
        return "DUPLICATE_CODE";
    }

    @Override
    public String getRuleName() {
        return "Duplicate Billing Code";
    }

    @Override
    public List<RuleViolation> evaluate(InsuranceBill bill, List<BillLineItem> lineItems) {
        List<RuleViolation> violations = new ArrayList<>();

        Map<String, List<BillLineItem>> byCode = lineItems.stream()
                .filter(item -> item.getCode() != null && !item.getCode().isBlank())
                .collect(Collectors.groupingBy(BillLineItem::getCode));

        for (Map.Entry<String, List<BillLineItem>> entry : byCode.entrySet()) {
            List<BillLineItem> items = entry.getValue();

            boolean likelyDuplicate = items.size() > 1 &&
                    items.stream().allMatch(i -> i.getQuantity() == null || i.getQuantity() == 1);

            if (likelyDuplicate) {
                List<UUID> ids = items.stream().map(BillLineItem::getId).collect(Collectors.toList());
                List<String> codes = items.stream().map(BillLineItem::getCode).collect(Collectors.toList());

                violations.add(RuleViolation.builder()
                        .ruleCode(getRuleCode())
                        .ruleName(getRuleName())
                        .severity(RuleViolation.Severity.HIGH)
                        .explanation(String.format(
                                "Billing code '%s' (%s) appears %d times on your bill. " +
                                        "This is likely a duplicate charge — you may have been billed " +
                                        "twice for the same service.",
                                entry.getKey(),
                                items.get(0).getDescription() != null ? items.get(0).getDescription() : "unknown service",
                                items.size()))
                        .recommendation("Request an itemized bill from your provider and dispute " +
                                "the duplicate charge with your insurer. Keep a copy of this report.")
                        .reimbursementEligible(true)
                        .affectedLineItemIds(ids)
                        .affectedCodes(codes)
                        .build());
            }
        }

        return violations;
    }
}