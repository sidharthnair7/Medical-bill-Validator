package com.example.medbillhackathon.insurance.service;

import com.example.medbillhackathon.insurance.model.BillLineItem;
import com.example.medbillhackathon.insurance.model.CodeType;
import com.example.medbillhackathon.insurance.model.InsuranceBill;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.pdfbox.Loader;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class BillPdfParserService {



    private static final Pattern CPT_PATTERN =
            Pattern.compile("\\b([0-9]{5})\\b");

    private static final Pattern HCPCS_PATTERN =
            Pattern.compile("\\b([A-Z][0-9]{4})\\b");

    private static final Pattern ICD10_PATTERN =
            Pattern.compile("\\b([A-Z][0-9]{2}\\.?[0-9A-Z]{0,4})\\b");


    private static final Pattern DOLLAR_PATTERN =
            Pattern.compile("\\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{2}))");


    private static final Pattern TOTAL_PATTERN =
            Pattern.compile("(?i)(?:total|amount\\s+due|balance\\s+due|total\\s+charges?)\\s*[:\\-]?\\s*\\$?([0-9,]+\\.?[0-9]*)");


    private static final Pattern POLICY_PATTERN =
            Pattern.compile("(?i)(?:policy|member|group|plan)\\s*(?:no|number|#|id)?[:\\s]+([A-Z0-9\\-]{5,20})");


    private static final Pattern PATIENT_PATTERN =
            Pattern.compile("(?i)(?:patient|member|insured)\\s*(?:name)?[:\\s]+([A-Za-z]+(?:\\s+[A-Za-z]+){1,3})");


    private static final Pattern PROVIDER_PATTERN =
            Pattern.compile("(?i)(?:provider|physician|hospital|clinic|facility)[:\\s]+([A-Za-z0-9\\s,\\.]+?)(?:\\n|$)");


    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("MM-dd-yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("MMMM d, yyyy"),
            DateTimeFormatter.ofPattern("MMM d, yyyy")
    );


    private static final Pattern SERVICE_DATE_PATTERN =
            Pattern.compile("(?i)(?:service|date\\s+of\\s+service|dos|date)[:\\s]+([0-9]{1,2}[/\\-][0-9]{1,2}[/\\-][0-9]{2,4})");


    private static final Pattern LINE_ITEM_PATTERN =
            Pattern.compile("([0-9]{5}|[A-Z][0-9]{4})\\s+([A-Za-z][\\w\\s,\\(\\)\\-\\.]{3,50}?)\\s+([0-9]+)\\s+\\$?([0-9,]+\\.?[0-9]*)\\s+\\$?([0-9,]+\\.?[0-9]*)");


    public InsuranceBill parsePdf(MultipartFile file, java.util.UUID userId) throws IOException {
        String rawText = extractText(file);
        log.info("Extracted {} characters from PDF '{}'", rawText.length(), file.getOriginalFilename());

        InsuranceBill bill = InsuranceBill.builder()
                .userId(userId)
                .originalFileName(file.getOriginalFilename())
                .rawExtractedText(rawText)
                .build();


        bill.setPatientName(extractFirst(PATIENT_PATTERN, rawText, 1));
        bill.setPolicyNumber(extractFirst(POLICY_PATTERN, rawText, 1));
        bill.setProviderName(extractFirst(PROVIDER_PATTERN, rawText, 1));
        bill.setServiceDate(extractDate(rawText));
        bill.setTotalAmount(extractTotal(rawText));


        List<BillLineItem> lineItems = parseLineItems(rawText, bill);
        bill.setLineItems(lineItems);

        log.info("Parsed bill: patient='{}', provider='{}', {} line items, total={}",
                bill.getPatientName(), bill.getProviderName(),
                lineItems.size(), bill.getTotalAmount());

        return bill;
    }


    public String extractText(MultipartFile file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper pdfTextExtract = new PDFTextStripper();
            pdfTextExtract.setSortByPosition(true);
            return pdfTextExtract.getText(document);
        }
    }


    private List<BillLineItem> parseLineItems(String text, InsuranceBill bill) {
        List<BillLineItem> items = new ArrayList<>();
        int lineNumber = 1;


        Matcher fullMatcher = LINE_ITEM_PATTERN.matcher(text);
        while (fullMatcher.find()) {
            BillLineItem item = BillLineItem.builder()
                    .bill(bill)
                    .code(fullMatcher.group(1).trim())
                    .codeType(detectCodeType(fullMatcher.group(1).trim()))
                    .description(fullMatcher.group(2).trim())
                    .quantity(parseIntSafe(fullMatcher.group(3)))
                    .unitPrice(parseMoney(fullMatcher.group(4)))
                    .lineTotal(parseMoney(fullMatcher.group(5)))
                    .lineNumber(lineNumber++)
                    .flagged(false)
                    .build();
            items.add(item);
        }


        if (items.isEmpty()) {
            log.info("Structured line item parsing found nothing — falling back to code scan");
            items = fallbackCodeScan(text, bill);
        }

        return items;
    }


    private List<BillLineItem> fallbackCodeScan(String text, InsuranceBill bill) {
        List<BillLineItem> items = new ArrayList<>();
        int lineNumber = 1;


        Matcher cptMatcher = CPT_PATTERN.matcher(text);
        while (cptMatcher.find()) {
            String code = cptMatcher.group(1);

            if (isLikelyCptCode(code)) {
                items.add(BillLineItem.builder()
                        .bill(bill)
                        .code(code)
                        .codeType(CodeType.CPT)
                        .lineNumber(lineNumber++)
                        .flagged(false)
                        .build());
            }
        }

        Matcher hcpcsMatcher = HCPCS_PATTERN.matcher(text);
        while (hcpcsMatcher.find()) {
            items.add(BillLineItem.builder()
                    .bill(bill)
                    .code(hcpcsMatcher.group(1))
                    .codeType(CodeType.HCPCS)
                    .lineNumber(lineNumber++)
                    .flagged(false)
                    .build());
        }

        return items;
    }

    private String extractFirst(Pattern pattern, String text, int group) {
        Matcher m = pattern.matcher(text);
        if (m.find()) {
            return m.group(group).trim();
        }
        return null;
    }

    private BigDecimal extractTotal(String text) {
        Matcher m = TOTAL_PATTERN.matcher(text);
        if (m.find()) {
            return parseMoney(m.group(1));
        }
        return null;
    }

    private LocalDate extractDate(String text) {
        Matcher m = SERVICE_DATE_PATTERN.matcher(text);
        if (m.find()) {
            String dateStr = m.group(1);
            for (DateTimeFormatter fmt : DATE_FORMATTERS) {
                try {
                    return LocalDate.parse(dateStr, fmt);
                } catch (DateTimeParseException ignored) {}
            }
        }
        return null;
    }

    private CodeType detectCodeType(String code) {
        if (code == null) return CodeType.UNKNOWN;
        if (code.matches("[0-9]{5}")) return CodeType.CPT;
        if (code.matches("[A-Z][0-9]{4}")) return CodeType.HCPCS;
        if (code.matches("[A-Z][0-9]{2}\\.?[0-9A-Z]+")) return CodeType.ICD10;
        return CodeType.UNKNOWN;
    }

    private boolean isLikelyCptCode(String code) {
        int val = Integer.parseInt(code);
        return val >= 10000 && val <= 99999;
    }

    private BigDecimal parseMoney(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return new BigDecimal(s.replace(",", "").replace("$", "").trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parseIntSafe(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}