package com.example.medbillhackathon.insurance.rules;

import com.example.medbillhackathon.insurance.model.BillLineItem;
import com.example.medbillhackathon.insurance.model.InsuranceBill;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;


@Slf4j
@Service
@RequiredArgsConstructor
public class BillingRuleEngine {

    private final List<BillingRule> rules;



    public List<RuleViolation> run(InsuranceBill bill, List<BillLineItem> lineItems) {
        List<RuleViolation> allViolations = new ArrayList<>();

        log.info("Running {} billing rules on bill {}", rules.size(), bill.getId());

        for (BillingRule rule : rules) {
            try {
                List<RuleViolation> violations = rule.evaluate(bill, lineItems);
                if (!violations.isEmpty()) {
                    log.info("Rule '{}' found {} violation(s)", rule.getRuleCode(), violations.size());
                }
                allViolations.addAll(violations);
            } catch (Exception e) {

                log.error("Rule '{}' threw an exception and was skipped: {}", rule.getRuleCode(), e.getMessage());
            }
        }

        log.info("Rule engine complete. Total violations found: {}", allViolations.size());
        return allViolations;
    }


    public List<String> getRegisteredRules() {
        return rules.stream()
                .map(r -> r.getRuleCode() + " — " + r.getRuleName())
                .toList();
    }
}