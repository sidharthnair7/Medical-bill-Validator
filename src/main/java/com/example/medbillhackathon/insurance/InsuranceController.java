package com.example.medbillhackathon.insurance;

import com.example.medbillhackathon.insurance.model.BillLineItem;
import com.example.medbillhackathon.insurance.model.InsuranceBill;
import com.example.medbillhackathon.insurance.service.BillAnalysisService;
import com.example.medbillhackathon.insurance.service.CodeLookupService;
import com.example.medbillhackathon.user.User;
import com.example.medbillhackathon.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;


@Slf4j
@RestController
@RequestMapping("/api/v1/insurance")
@RequiredArgsConstructor
public class InsuranceController {

    private final BillAnalysisService billAnalysisService;
    private final CodeLookupService codeLookupService;
    private final UserRepository userRepository;


    @PostMapping(value = "/bills/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<InsuranceDTO.BillAnalysisResponse> uploadBill(
            @RequestParam("file") MultipartFile file) throws Exception {

        UUID userId = getCurrentUserId();

        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }
        if (!isPdf(file)) {
            throw new IllegalArgumentException("Only PDF files are supported. Please upload your bill as a PDF.");
        }

        log.info("Bill upload request from user {} — file: {} ({} bytes)",
                userId, file.getOriginalFilename(), file.getSize());

        InsuranceBill bill = billAnalysisService.analyzeUploadedBill(file, userId);
        return ResponseEntity.ok(toAnalysisResponse(bill));
    }


    @GetMapping("/bills")
    public ResponseEntity<List<InsuranceDTO.BillSummaryResponse>> getUserBills() {
        UUID userId = getCurrentUserId();
        List<InsuranceBill> bills = billAnalysisService.getUserBills(userId);

        List<InsuranceDTO.BillSummaryResponse> summaries = bills.stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(summaries);
    }


    @GetMapping("/bills/{id}")
    public ResponseEntity<InsuranceDTO.BillAnalysisResponse> getBill(@PathVariable UUID id) {
        InsuranceBill bill = billAnalysisService.getBill(id);
        UUID userId = getCurrentUserId();
        if (!bill.getUserId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(toAnalysisResponse(bill));
    }


    @GetMapping("/codes/{code}")
    public ResponseEntity<InsuranceDTO.CodeLookupResponse> lookupCode(@PathVariable String code) {
        InsuranceDTO.CodeLookupResponse result = codeLookupService.lookup(code);
        return ResponseEntity.ok(result);
    }


    private InsuranceDTO.BillAnalysisResponse toAnalysisResponse(InsuranceBill bill) {
        List<InsuranceDTO.LineItemResponse> lineItems = bill.getLineItems().stream()
                .map(this::toLineItemResponse)
                .collect(Collectors.toList());


        List<InsuranceDTO.ViolationResponse> violations = bill.getLineItems().stream()
                .filter(i -> Boolean.TRUE.equals(i.getFlagged()))
                .collect(Collectors.groupingBy(BillLineItem::getFlagReason))
                .entrySet().stream()
                .map(entry -> new InsuranceDTO.ViolationResponse(
                        entry.getKey(),
                        entry.getKey(),
                        "HIGH",
                        entry.getValue().get(0).getFlagExplanation(),
                        "Contact your insurer to dispute this charge.",
                        Boolean.TRUE.equals(entry.getValue().get(0).getReimbursementEligible()),
                        entry.getValue().stream().map(BillLineItem::getCode).collect(Collectors.toList())
                ))
                .collect(Collectors.toList());

        return new InsuranceDTO.BillAnalysisResponse(
                bill.getId(),
                bill.getOriginalFileName(),
                bill.getPatientName(),
                bill.getPolicyNumber(),
                bill.getProviderName(),
                bill.getServiceDate(),
                bill.getTotalAmount(),
                bill.getStatus(),
                bill.getValidationSummary(),
                bill.getAiAnalysis(),
                bill.getReimbursementEligible(),
                bill.getUploadedAt(),
                bill.getAnalyzedAt(),
                lineItems,
                violations
        );
    }

    private InsuranceDTO.LineItemResponse toLineItemResponse(BillLineItem item) {
        return new InsuranceDTO.LineItemResponse(
                item.getId(),
                item.getCode(),
                item.getCodeType(),
                item.getDescription(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getLineTotal(),
                item.getFlagged(),
                item.getFlagReason(),
                item.getFlagExplanation(),
                item.getReimbursementEligible(),
                item.getLineNumber(),
                null,
                null
        );
    }

    private InsuranceDTO.BillSummaryResponse toSummaryResponse(InsuranceBill bill) {
        long issueCount = bill.getLineItems().stream()
                .filter(i -> Boolean.TRUE.equals(i.getFlagged()))
                .count();

        return new InsuranceDTO.BillSummaryResponse(
                bill.getId(),
                bill.getOriginalFileName(),
                bill.getProviderName(),
                bill.getServiceDate(),
                bill.getTotalAmount(),
                bill.getStatus(),
                bill.getReimbursementEligible(),
                (int) issueCount,
                bill.getUploadedAt()
        );
    }

    private UUID getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    private boolean isPdf(MultipartFile file) {
        String contentType = file.getContentType();
        String name = file.getOriginalFilename();
        return (contentType != null && contentType.equals("application/pdf")) ||
                (name != null && name.toLowerCase().endsWith(".pdf"));
    }
}