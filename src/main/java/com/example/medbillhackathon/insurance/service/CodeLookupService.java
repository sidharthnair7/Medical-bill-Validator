package com.example.medbillhackathon.insurance.service;

import com.example.medbillhackathon.insurance.InsuranceDTO;
import com.example.medbillhackathon.insurance.model.CodeType;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Provides human-readable explanations of billing codes.
 * This powers the "click a code to learn more" feature.
 *
 * Currently uses a static map for common CPT codes.
 * In production: integrate with CMS API or a medical coding database.
 * WatsonX can also be called as fallback for unknown codes.
 */
@Service
public class CodeLookupService {

    /**
     * Static lookup for the most common CPT codes seen on medical bills.
     * Format: code → CodeInfo record
     */
    private static final Map<String, CodeInfo> CPT_DESCRIPTIONS = new HashMap<>() {{
        // Office Visits - Established Patients
        put("99211", new CodeInfo("Office Visit — Minimal", "Office or other outpatient visit — minimal complexity. " +
                "Typically a quick nurse visit or prescription refill.", "Evaluation & Management",
                "Quick check-in, usually 5-10 minutes. No physician exam typically required.", true,
                "This is the lowest-level office visit code. If you saw a doctor and had a real conversation, " +
                        "you may have been underbilled (which can still cause issues with your insurer)."));
        put("99212", new CodeInfo("Office Visit — Low Complexity", "Office visit for established patient — straightforward problem.",
                "Evaluation & Management", "Simple visit, typically 10-15 minutes.", false,
                "Standard for simple follow-ups. Check that this matches the length and complexity of your visit."));
        put("99213", new CodeInfo("Office Visit — Moderate", "Office visit for established patient — low to moderate complexity.",
                "Evaluation & Management", "The most commonly billed office visit code.", true,
                "This is the most frequent E&M code. Often gets 'upcoded' to 99214. Verify it matches your visit."));
        put("99214", new CodeInfo("Office Visit — Moderate-High", "Office visit for established patient — moderate to high complexity.",
                "Evaluation & Management", "Complex problem, typically 25-40 minutes.", true,
                "Requires documented medical decision-making. Ask for your visit notes if this seems too high."));
        put("99215", new CodeInfo("Office Visit — High Complexity", "Office visit for established patient — high complexity.",
                "Evaluation & Management", "Most complex outpatient visit, typically 40-60 minutes.", true,
                "This is the highest-level office visit. It requires extensive documentation. If your visit was brief, this may be upcoding."));

        // Office Visits - New Patients
        put("99202", new CodeInfo("New Patient Visit — Low", "Office visit for new patient — straightforward problem.",
                "Evaluation & Management", "New patient, simple problem.", false, "First visit for a simple condition."));
        put("99203", new CodeInfo("New Patient Visit — Low-Moderate", "New patient visit — low to moderate complexity.",
                "Evaluation & Management", "New patient, routine problem.", false, "Standard new patient visit."));
        put("99204", new CodeInfo("New Patient Visit — Moderate", "New patient visit — moderate complexity.",
                "Evaluation & Management", "New patient, complex history.", true, "Requires detailed history and exam."));
        put("99205", new CodeInfo("New Patient Visit — High", "New patient visit — high complexity.",
                "Evaluation & Management", "New patient, highly complex problem.", true,
                "Highest new patient code. Requires extensive documentation."));

        // Emergency
        put("99283", new CodeInfo("Emergency Visit — Moderate", "Emergency department visit — moderate severity.",
                "Emergency Medicine", "Moderate emergency, e.g. fracture or asthma attack.", false,
                "Common ER code. Verify complexity matches your actual visit."));
        put("99284", new CodeInfo("Emergency Visit — High", "Emergency department visit — high severity.",
                "Emergency Medicine", "High-severity emergency requiring urgent intervention.", true,
                "High-level ER visit. Check that procedures performed match this severity."));
        put("99285", new CodeInfo("Emergency Visit — Highest", "Emergency department visit — highest severity.",
                "Emergency Medicine", "Critical emergency, often involving potential threats to life.", true,
                "Highest ER code. If your visit was not life-threatening, this may be upcoded."));

        // Common Lab
        put("85027", new CodeInfo("Complete Blood Count (CBC)", "CBC without differential — common blood test.",
                "Laboratory", "Routine blood panel checking red cells, white cells, platelets.", false,
                "Very common test. Usually billed once. If you see it twice, it may be a duplicate."));
        put("80053", new CodeInfo("Comprehensive Metabolic Panel", "14-test blood chemistry panel.",
                "Laboratory", "Tests kidney function, liver function, electrolytes, glucose.", false,
                "Should be billed as one code. If you see individual component codes alongside this, that's unbundling."));
        put("82306", new CodeInfo("Vitamin D Test", "25-hydroxyvitamin D level.",
                "Laboratory", "Tests Vitamin D levels.", false,
                "Often ordered routinely. Not always covered by insurance as preventive."));

        // Radiology
        put("71046", new CodeInfo("Chest X-Ray — 2 Views", "Standard chest X-ray, frontal and lateral views.",
                "Radiology", "The most common chest X-ray, taken from two angles.", false,
                "Should typically be billed as one code. Two codes for two views can indicate unbundling."));
        put("70553", new CodeInfo("MRI Brain with and without contrast", "MRI of the brain, both contrast sequences.",
                "Radiology", "Comprehensive brain MRI. Expensive but often medically necessary.", true,
                "High-cost procedure. Verify you actually received contrast (an injection) during the scan."));

        // Surgery / Procedures
        put("43239", new CodeInfo("Upper GI Endoscopy with Biopsy", "EGD with biopsy — upper GI scope.",
                "Surgery/GI", "Stomach and esophagus scope with tissue sample.", false,
                "Should include both the scope and biopsy. Don't pay separately for each component."));
        put("45378", new CodeInfo("Colonoscopy — Diagnostic", "Colonoscopy without intervention.",
                "Surgery/GI", "Routine or diagnostic colon examination.", false,
                "If polyps were removed, the code changes. Verify you received the right code."));
    }};

    /**
     * Look up a billing code and return a patient-friendly explanation.
     */
    public InsuranceDTO.CodeLookupResponse lookup(String code) {
        CodeInfo info = CPT_DESCRIPTIONS.get(code.toUpperCase().trim());

        if (info != null) {
            return new InsuranceDTO.CodeLookupResponse(
                    code,
                    detectType(code),
                    info.shortDescription(),
                    info.fullDescription(),
                    info.category(),
                    info.typicalUse(),
                    info.commonlyMisbilled(),
                    info.patientTip()
            );
        }

        // Unknown code — return what we can
        return new InsuranceDTO.CodeLookupResponse(
                code,
                detectType(code),
                "Billing Code: " + code,
                "This code was not found in our database. You can look it up at cms.gov/medicare/coding-billing " +
                        "or ask your provider for a written description.",
                detectCategory(code),
                "Ask your provider what service this code represents.",
                false,
                "Always ask your provider for a written description of any code you don't recognize."
        );
    }

    private CodeType detectType(String code) {
        if (code.matches("[0-9]{5}")) return CodeType.CPT;
        if (code.matches("[A-Z][0-9]{4}")) return CodeType.HCPCS;
        if (code.matches("[A-Z][0-9]{2}\\.?.*")) return CodeType.ICD10;
        return CodeType.UNKNOWN;
    }

    private String detectCategory(String code) {
        if (!code.matches("[0-9]+")) return "Other";
        int val = Integer.parseInt(code);
        if (val >= 99201 && val <= 99499) return "Evaluation & Management";
        if (val >= 70000 && val <= 79999) return "Radiology";
        if (val >= 80000 && val <= 89999) return "Laboratory / Pathology";
        if (val >= 10000 && val <= 69999) return "Surgery / Procedures";
        if (val >= 90000 && val <= 99000) return "Medicine / Other";
        return "Other";
    }

    private record CodeInfo(
            String shortDescription,
            String fullDescription,
            String category,
            String typicalUse,
            boolean commonlyMisbilled,
            String patientTip
    ) {}
}