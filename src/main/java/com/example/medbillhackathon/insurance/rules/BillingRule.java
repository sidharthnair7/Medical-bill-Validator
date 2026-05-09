package com.example.medbillhackathon.insurance.rules;

import com.example.medbillhackathon.insurance.model.BillLineItem;
import com.example.medbillhackathon.insurance.model.InsuranceBill;

import java.util.List;

public interface BillingRule {

    String getRuleCode();

    String getRuleName();

    default String getDescription() {
        return "";
    }

    List<RuleViolation> evaluate(InsuranceBill bill, List<BillLineItem> lineItems);
}