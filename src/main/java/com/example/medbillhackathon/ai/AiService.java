package com.example.medbillhackathon.ai;

import com.example.medbillhackathon.insurance.rules.RuleViolation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private final WatsonX watsonX;


    private static final Map<String, String> CPT_KNOWLEDGE = new HashMap<>() {{
        put("99211", "CPT 99211: Minimal office visit. Typically a nurse visit for prescription refill or vitals check. No physician exam required. Average Medicare rate: $18. Commonly billed incorrectly when a physician actually examined the patient.");
        put("99212", "CPT 99212: Low-complexity office visit. Straightforward problem. 10-15 minutes. Average Medicare rate: $46. Appropriate for simple follow-ups.");
        put("99213", "CPT 99213: Moderate office visit. Most commonly billed E&M code. 15-20 minutes. Average Medicare rate: $76. Frequently upcoded to 99214.");
        put("99214", "CPT 99214: Moderate-high complexity visit. Requires medical decision making of moderate complexity. 25-40 minutes. Average Medicare rate: $110. Requires documented MDM or 25+ min time.");
        put("99215", "CPT 99215: Highest complexity office visit. Requires high complexity MDM or 40+ minutes. Average Medicare rate: $148. Should only appear for truly complex cases.");
        put("99281", "CPT 99281: Minimal ER visit. Self-limited or minor problem. Average Medicare rate: $28.");
        put("99283", "CPT 99283: Moderate ER visit. Moderate severity — e.g. asthma attack, closed fracture. Average Medicare rate: $97.");
        put("99285", "CPT 99285: Highest ER complexity. High severity with threat to life/function. Average Medicare rate: $226. Often fraudulently billed for moderate ER visits.");
        put("80053", "CPT 80053: Comprehensive metabolic panel (CMP). Includes 14 tests: glucose, calcium, electrolytes, kidney function, liver enzymes. Should NOT be billed alongside individual component codes (e.g. 82565, 84132). Billing components separately is unbundling.");
        put("85027", "CPT 85027: CBC without differential. Complete blood count measuring RBC, WBC, hemoglobin, hematocrit, platelets. Common routine test. Rarely needs to be repeated same day.");
        put("71046", "CPT 71046: Chest X-ray, 2 views. Includes both PA and lateral projections. Should be billed as single code. Billing 71045 and 71045 separately is unbundling.");
        put("70553", "CPT 70553: MRI brain with and without contrast. High-cost procedure ~$1,000-3,000. Verify contrast was actually administered (IV injection required).");
        put("45378", "CPT 45378: Diagnostic colonoscopy. If polyps were found and removed, code should be 45380 or 45385, not 45378. Wrong code means wrong coverage tier.");
        put("82310", "CPT 82310: Calcium blood test. Individual component of basic metabolic panel (BMP 80048). Should not be billed alone if BMP was ordered.");
    }};

    private static final Map<String, String> RULE_KNOWLEDGE = new HashMap<>() {{
        put("DUPLICATE_CODE", "DUPLICATE BILLING: CMS defines duplicate billing as submitting the same service more than once for the same patient on the same date. This is a form of healthcare fraud under the False Claims Act. Patients are entitled to a full refund of the duplicate charge. Step 1: Request itemized bill. Step 2: File formal dispute with insurer citing duplicate code. Step 3: If unresolved, file complaint with your state insurance commissioner.");
        put("UNBUNDLING", "UNBUNDLING: The practice of billing multiple component codes instead of a single comprehensive code to inflate reimbursement. Prohibited under CMS bundling rules (NCCI edits). Example: billing individual metabolic tests instead of the panel code. Patients should request the provider recode to the appropriate bundled code and recalculate the balance.");
        put("UPCODING", "UPCODING: Billing for a higher-complexity service than was actually rendered. One of the most common forms of medical billing fraud. CMS estimates upcoding costs Medicare billions annually. Patients can request visit notes to verify complexity level matches the billed code. If not, file a dispute citing the specific documentation requirements for the billed code.");
        put("UPCODING_PRICE", "PRICE OVERCHARGE: When billed amounts significantly exceed standard Medicare rates, patients can negotiate. Hospitals are required by the No Surprises Act (2022) to provide a Good Faith Estimate. Patients can request a line-item price breakdown and negotiate based on Medicare rates as a reference point.");
        put("MISSING_INFO", "INCOMPLETE BILL: A bill missing required information (policy number, diagnosis codes, provider NPI) can be legally rejected by insurers. Patients have the right to request a complete, itemized bill. Providers are required to supply this. An incomplete bill cannot be submitted to insurance and cannot be sent to collections until corrected.");
    }};

    private static final String DISPUTE_PROCEDURE_KNOWLEDGE =
            "HOW TO DISPUTE A MEDICAL BILL IN CANADA/USA:\n" +
                    "1. Request an itemized bill (not just a summary) — this is your legal right\n" +
                    "2. Request your Explanation of Benefits (EOB) from your insurer\n" +
                    "3. Compare each line item code against what services you actually received\n" +
                    "4. File a formal written dispute with your insurer within 180 days of the EOB\n" +
                    "5. If denied, request an internal appeal citing specific billing code errors\n" +
                    "6. Escalate to your provincial/state insurance regulator if still unresolved\n" +
                    "7. For amounts over $5,000, consider a patient advocate or healthcare attorney\n" +
                    "The No Surprises Act (US) and provincial billing standards (Canada) protect patients from unexpected charges.";

    private static final String REIMBURSEMENT_KNOWLEDGE =
            "REIMBURSEMENT ELIGIBILITY CRITERIA:\n" +
                    "- Duplicate charges: 100% reimbursable — you were charged twice for one service\n" +
                    "- Unbundled codes: Difference between component total and bundled code rate is reimbursable\n" +
                    "- Price overcharges: Amount above insurer's contracted rate is negotiable/reimbursable\n" +
                    "- Upcoding: If proven, the difference between billed code and correct code rate is reimbursable\n" +
                    "Timeline: Most insurers allow disputes within 12 months of service date.\n" +
                    "Keep all documentation: original bill, EOB, dispute letters, and responses.";


    public AiResponse analyzeBill(String rawBillText,
                                  List<RuleViolation> violations,
                                  List<String> billingCodes,
                                  String patientName,
                                  String providerName) {
        log.info("Starting RAG pipeline for patient='{}', codes={}, violations={}",
                patientName, billingCodes.size(), violations.size());

        List<String> retrievedChunks = retrieve(billingCodes, violations);
        log.info("RAG retrieved {} context chunks", retrievedChunks.size());

        String augmentedPrompt = buildAugmentedPrompt(
                rawBillText, violations, retrievedChunks, patientName, providerName);
        log.info("Augmented prompt built: {} chars", augmentedPrompt.length());

        try {
            String generated = watsonX.generate(augmentedPrompt, 600, 0.2);

            return AiResponse.builder()
                    .generatedText(generated)
                    .retrievedContextChunks(retrievedChunks)
                    .promptUsed(augmentedPrompt)
                    .aiGenerated(true)
                    .promptLength(augmentedPrompt.length())
                    .modelId(watsonX.getModelId())
                    .build();

        } catch (Exception e) {
            log.error("WatsonX generation failed, using fallback: {}", e.getMessage());
            String fallback = generateFallback(violations, retrievedChunks);

            return AiResponse.builder()
                    .generatedText(fallback)
                    .retrievedContextChunks(retrievedChunks)
                    .promptUsed(augmentedPrompt)
                    .aiGenerated(false)
                    .promptLength(augmentedPrompt.length())
                    .modelId("fallback")
                    .build();
        }
    }

    public AiResponse explainCode(String code) {
        List<String> context = new ArrayList<>();
        String knownInfo = CPT_KNOWLEDGE.get(code);
        if (knownInfo != null) {
            context.add(knownInfo);
        }

        String prompt = buildCodeExplanationPrompt(code, context);

        try {
            String generated = watsonX.generate(prompt, 300, 0.2);
            return AiResponse.builder()
                    .generatedText(generated)
                    .retrievedContextChunks(context)
                    .aiGenerated(true)
                    .modelId(watsonX.getModelId())
                    .build();
        } catch (Exception e) {
            String fallback = knownInfo != null ? knownInfo :
                    "Code " + code + " was not found in our database. " +
                            "Please ask your provider for a written description of this charge.";
            return AiResponse.builder()
                    .generatedText(fallback)
                    .retrievedContextChunks(context)
                    .aiGenerated(false)
                    .modelId("fallback")
                    .build();
        }
    }

    private List<String> retrieve(List<String> billingCodes, List<RuleViolation> violations) {
        List<String> chunks = new ArrayList<>();
        for (String code : billingCodes) {
            String knowledge = CPT_KNOWLEDGE.get(code);
            if (knowledge != null) {
                chunks.add(knowledge);
            }
        }


        Set<String> violationRuleCodes = violations.stream()
                .map(RuleViolation::getRuleCode)
                .collect(Collectors.toSet());

        for (String ruleCode : violationRuleCodes) {
            String knowledge = RULE_KNOWLEDGE.get(ruleCode);
            if (knowledge != null) {
                chunks.add(knowledge);
            }
        }

        if (!violations.isEmpty()) {
            chunks.add(DISPUTE_PROCEDURE_KNOWLEDGE);
        }

        boolean anyReimbursable = violations.stream()
                .anyMatch(RuleViolation::isReimbursementEligible);
        if (anyReimbursable) {
            chunks.add(REIMBURSEMENT_KNOWLEDGE);
        }

        return chunks.stream().distinct().limit(6).collect(Collectors.toList());
    }

    private String buildAugmentedPrompt(String rawBillText,
                                        List<RuleViolation> violations,
                                        List<String> retrievedChunks,
                                        String patientName,
                                        String providerName) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("You are MedBill AI, an expert medical billing analyst helping patients understand and dispute their insurance bills. You provide accurate, empathetic, and actionable advice.\n\n");

        if (!retrievedChunks.isEmpty()) {
            prompt.append("=== RETRIEVED MEDICAL BILLING KNOWLEDGE ===\n");
            prompt.append("Use the following verified medical billing information to ground your response:\n\n");
            for (int i = 0; i < retrievedChunks.size(); i++) {
                prompt.append("[Context ").append(i + 1).append("]\n");
                prompt.append(retrievedChunks.get(i)).append("\n\n");
            }
            prompt.append("=== END RETRIEVED KNOWLEDGE ===\n\n");
        }

        prompt.append("=== BILL CONTEXT ===\n");
        prompt.append("Patient: ").append(patientName != null ? patientName : "Patient").append("\n");
        prompt.append("Provider: ").append(providerName != null ? providerName : "Unknown Provider").append("\n\n");

        if (!violations.isEmpty()) {
            prompt.append("AUTOMATED RULE ENGINE DETECTED THESE ISSUES:\n");
            for (RuleViolation v : violations) {
                prompt.append("• [").append(v.getSeverity()).append("] ")
                        .append(v.getRuleName()).append(": ")
                        .append(v.getExplanation()).append("\n");
                if (v.getAffectedCodes() != null && !v.getAffectedCodes().isEmpty()) {
                    prompt.append("  Affected codes: ").append(String.join(", ", v.getAffectedCodes())).append("\n");
                }
            }
            prompt.append("\n");
        } else {
            prompt.append("RULE ENGINE: No automated violations detected.\n\n");
        }
        String billSnippet = rawBillText != null && rawBillText.length() > 1500
                ? rawBillText.substring(0, 1500) + "\n[...bill truncated...]"
                : rawBillText;
        if (billSnippet != null && !billSnippet.isBlank()) {
            prompt.append("BILL TEXT EXCERPT:\n").append(billSnippet).append("\n\n");
        }

        prompt.append("=== END BILL CONTEXT ===\n\n");
        prompt.append("Based on the retrieved medical billing knowledge and the bill context above, provide:\n");
        prompt.append("1. SUMMARY: A 2-sentence plain-language summary of what was found\n");
        prompt.append("2. ISSUES: Explain each detected issue in terms a non-expert patient can understand\n");
        prompt.append("3. ACTION STEPS: Numbered list of exactly what this patient should do next\n");
        prompt.append("4. WHAT TO SAY: A sample script of what to say when calling the insurance company\n");
        prompt.append("5. REIMBURSEMENT: Clearly state whether this patient may be owed money and approximately how much\n\n");
        prompt.append("Be specific, empathetic, and actionable. Do not use medical jargon without explaining it.\n");
        prompt.append("---END---");

        return prompt.toString();
    }

    private String buildCodeExplanationPrompt(String code, List<String> context) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a medical billing expert explaining billing codes to patients in plain language.\n\n");

        if (!context.isEmpty()) {
            prompt.append("RETRIEVED KNOWLEDGE:\n").append(context.get(0)).append("\n\n");
        }

        prompt.append("Explain billing code ").append(code).append(" to a patient who has no medical background. Include:\n");
        prompt.append("1. What service this code represents in simple terms\n");
        prompt.append("2. What it typically costs\n");
        prompt.append("3. Whether it is commonly misused or overbilled\n");
        prompt.append("4. What the patient should verify\n");
        prompt.append("Keep your response under 150 words and use simple language.\n");
        prompt.append("---END---");

        return prompt.toString();
    }

    private String generateFallback(List<RuleViolation> violations, List<String> retrievedChunks) {
        if (violations.isEmpty()) {
            return "Our automated analysis found no billing issues with your bill. " +
                    "We recommend comparing it with your Explanation of Benefits (EOB) from your insurer. " +
                    "If anything looks unfamiliar, you have the right to request an itemized bill from your provider.";
        }

        StringBuilder stringBuilder = new StringBuilder();
        long reimbursable = violations.stream().filter(RuleViolation::isReimbursementEligible).count();

        stringBuilder.append("SUMMARY: Our system found ").append(violations.size())
                .append(" potential billing issue(s). ");
        if (reimbursable > 0) {
            stringBuilder.append(reimbursable).append(" of these may entitle you to reimbursement.\n\n");
        }

        stringBuilder.append("ISSUES FOUND:\n");
        for (RuleViolation v : violations) {
            stringBuilder.append("• ").append(v.getRuleName()).append(": ").append(v.getExplanation()).append("\n");
        }

        stringBuilder.append("\nACTION STEPS:\n");
        stringBuilder.append("1. Request a complete itemized bill from your provider\n");
        stringBuilder.append("2. Request your Explanation of Benefits (EOB) from your insurer\n");
        stringBuilder.append("3. File a formal written dispute for each flagged charge\n");
       stringBuilder.append("4. Keep copies of all correspondence\n");

        if (!retrievedChunks.isEmpty()) {
            stringBuilder.append("\nRELEVANT INFORMATION:\n");
            retrievedChunks.stream()
                    .filter(c -> c.contains("DISPUTE") || c.contains("REIMBURSEMENT"))
                    .findFirst()
                    .ifPresent(c -> stringBuilder.append(c).append("\n"));
        }

        return stringBuilder.toString();
    }
}