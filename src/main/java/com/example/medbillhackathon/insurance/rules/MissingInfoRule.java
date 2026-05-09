package com.example.medbillhackathon.insurance.rules;

import com.example.medbillhackathon.insurance.model.BillLineItem;
import com.example.medbillhackathon.insurance.model.InsuranceBill;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class MissingInfoRule implements BillingRule {

    @Override
    public String getRuleCode() {
        return "MISSING_INFO";
    }

    @Override
    public String getRuleName() {
        return "Missing or Incomplete Bill Information";
    }

    @Override
    public List<RuleViolation> evaluate(InsuranceBill bill, List<BillLineItem> lineItems) {
        List<RuleViolation> violations = new ArrayList<>();
        List<String> missingFields = new ArrayList<>();

        if (isBlank(bill.getPatientName()))   missingFields.add("Patient Name");
        if (isBlank(bill.getPolicyNumber()))   missingFields.add("Policy Number");
        if (isBlank(bill.getProviderName()))   missingFields.add("Provider / Hospital Name");
        if (bill.getServiceDate() == null)     missingFields.add("Service Date");
        if (bill.getTotalAmount() == null)     missingFields.add("Total Amount");

        long uncodedLines = lineItems.stream()
                .filter(i -> isBlank(i.getCode()))
                .count();
        if (uncodedLines > 0) {
            missingFields.add(uncodedLines + " line item(s) with no billing code");
        }

        if (!missingFields.isEmpty()) {
            violations.add(RuleViolation.builder()
                    .ruleCode(getRuleCode())
                    .ruleName(getRuleName())
                    .severity(RuleViolation.Severity.MEDIUM)
                    .explanation("The following required fields could not be found on your bill: " +
                            String.join(", ", missingFields) + ". " +
                            "Missing information can cause insurance claims to be denied.")
                    .recommendation("Contact your provider to get a corrected, itemized bill with " +
                            "all required fields filled in before submitting to insurance.")
                    .reimbursementEligible(false)
                    .affectedLineItemIds(List.of())
                    .affectedCodes(List.of())
                    .build());
        }

        return violations;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}