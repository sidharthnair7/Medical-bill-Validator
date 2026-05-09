package com.example.medbillhackathon.insurance.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Represents a single line item on an insurance/medical bill.
 * Each line item has a billing code (e.g. CPT code) that users can click
 * to learn what it means and whether reimbursement is possible.
 */
@Entity
@Table(name = "bill_line_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillLineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id", nullable = false)
    private InsuranceBill bill;
    private String code;
    @Enumerated(EnumType.STRING)
    private CodeType codeType;
    private String description;
    private Integer quantity;
    @Column(precision = 10, scale = 2)
    private BigDecimal unitPrice;
    @Column(precision = 10, scale = 2)
    private BigDecimal lineTotal;

    @Builder.Default
    private Boolean flagged = false;
    private String flagReason;
    @Column(columnDefinition = "TEXT")
    private String flagExplanation;
    private Boolean reimbursementEligible;
    private Integer lineNumber;
}