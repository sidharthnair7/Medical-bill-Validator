package com.example.medbillhackathon.insurance.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


@Entity
@Table(name = "insurance_bills")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InsuranceBill {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;
    private String originalFileName;
    @Column(columnDefinition = "TEXT")
    private String rawExtractedText;
    private String patientName;
    private String patientDOB;
    private String policyNumber;
    private String insurerName;
    private String providerName;
    private LocalDate serviceDate;
    @Column(precision = 10, scale = 2)
    private BigDecimal totalAmount;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BillStatus status = BillStatus.PENDING;
    @Column(columnDefinition = "TEXT")
    private String validationSummary;
    @Column(columnDefinition = "TEXT")
    private String aiAnalysis;
    private Boolean reimbursementEligible;
    @Column(updatable = false)
    private LocalDateTime uploadedAt;
    private LocalDateTime analyzedAt;
    @OneToMany(mappedBy = "bill", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<BillLineItem> lineItems = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        this.uploadedAt = LocalDateTime.now();
    }
}