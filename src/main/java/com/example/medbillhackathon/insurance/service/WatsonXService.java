package com.example.medbillhackathon.insurance.service;

import com.example.medbillhackathon.ai.AiResponse;
import com.example.medbillhackathon.ai.AiService;
import com.example.medbillhackathon.insurance.rules.RuleViolation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;


@Slf4j
@Service
@RequiredArgsConstructor
public class WatsonXService {

    private final AiService aiService;

    public String analyzeInsuranceBill(String rawBillText,
                                       List<RuleViolation> violations,
                                       List<String> billingCodes,
                                       String patientName,
                                       String providerName) {

        log.info("Delegating to RAG pipeline — {} billing codes, {} violations",
                billingCodes.size(), violations.size());

        AiResponse response = aiService.analyzeBill(
                rawBillText,
                violations,
                billingCodes,
                patientName,
                providerName
        );

        if (response.isAiGenerated()) {
            log.info("RAG pipeline complete — model: {}, prompt was {} chars, {} context chunks retrieved",
                    response.getModelId(),
                    response.getPromptLength(),
                    response.getRetrievedContextChunks() != null
                            ? response.getRetrievedContextChunks().size() : 0);
        } else {
            log.warn("WatsonX was unavailable — rule-based fallback response used");
        }

        return response.getGeneratedText();
    }

    public String explainBillingCode(String code) {
        log.info("Looking up billing code: {}", code);
        AiResponse response = aiService.explainCode(code);
        return response.getGeneratedText();
    }
}