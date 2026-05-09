package com.example.medbillhackathon.insurance.rules;

import com.example.medbillhackathon.insurance.model.BillLineItem;
import com.example.medbillhackathon.insurance.model.InsuranceBill;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class UnbundlingRule implements BillingRule {

    private static final Map<String, List<String>> BUNDLED_SETS = new HashMap<>() {{
        put("SURGICAL_PACKAGE", List.of("99024", "99025"));
        put("EM_ESCALATION", List.of("99211", "99212", "99213"));
        put("BASIC_METABOLIC_PANEL", List.of("82310", "82374", "82435", "82565", "84132", "84295", "84520", "84550"));
        put("COMPREHENSIVE_METABOLIC", List.of("80048", "84460", "84450"));
        put("WOUND_CARE", List.of("97597", "97598"));
    }};

    @Override
    public String getRuleCode() {
        return "UNBUNDLING";
    }

    @Override
    public String getRuleName() {
        return "Potential Unbundling of Services";
    }

    @Override
    public List<RuleViolation> evaluate(InsuranceBill bill, List<BillLineItem> lineItems) {
        List<RuleViolation> violations = new ArrayList<>();

        Set<String> billedCodes = lineItems.stream()
                .filter(i -> i.getCode() != null)
                .map(BillLineItem::getCode)
                .collect(Collectors.toSet());

        for (Map.Entry<String, List<String>> entry : BUNDLED_SETS.entrySet()) {
            List<String> bundleComponents = entry.getValue();
            List<String> foundComponents = bundleComponents.stream()
                    .filter(billedCodes::contains)
                    .collect(Collectors.toList());
            if (foundComponents.size() >= 2) {
                List<UUID> affectedIds = lineItems.stream()
                        .filter(i -> i.getCode() != null && foundComponents.contains(i.getCode()))
                        .map(BillLineItem::getId)
                        .collect(Collectors.toList());

                violations.add(RuleViolation.builder()
                        .ruleCode(getRuleCode())
                        .ruleName(getRuleName())
                        .severity(RuleViolation.Severity.MEDIUM)
                        .explanation(String.format(
                                "Multiple codes from the '%s' group were billed separately: %s. " +
                                        "These services are typically required to be billed together under " +
                                        "a single comprehensive code, which costs less.",
                                entry.getKey(),
                                String.join(", ", foundComponents)))
                        .recommendation("Ask your provider why these services were billed separately. " +
                                "If they should be bundled, you may be owed a refund of the price difference.")
                        .reimbursementEligible(true)
                        .affectedLineItemIds(affectedIds)
                        .affectedCodes(foundComponents)
                        .build());
            }
        }

        return violations;
    }
}