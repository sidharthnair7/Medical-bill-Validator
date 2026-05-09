package com.example.medbillhackathon.insurance.rules;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleViolation {

    private String ruleCode;
    private String ruleName;
    private Severity severity;
    private String explanation;
    private String recommendation;
    private boolean reimbursementEligible;
    private List<UUID> affectedLineItemIds;
    private List<String> affectedCodes;

    public enum Severity {
        LOW,
        MEDIUM,
        HIGH
    }
}