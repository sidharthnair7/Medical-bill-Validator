# 🧾InsurCheck - Medical Bill Validation & Reimbursement Assistant

InsurCheck is a full-stack AI-powered medical bill validation platform built for the IBM × UNSA Hackathon.

It helps patients upload a medical bill, reconstruct the bill into readable line items, detect suspicious billing patterns, and receive plain-language guidance about possible reimbursement or dispute opportunities.

The project combines:

- PDF parsing
- structured bill reconstruction
- a custom medical billing rule engine
- a lightweight RAG pipeline
- IBM WatsonX generation
- an interactive React dashboard

Instead of simply sending a bill to an AI model, InsurCheck first performs deterministic backend validation. The AI is used after the system has already extracted bill data and detected issues. This makes the final explanation more grounded, more useful, and more transparent.



## UseCase

Imagine receiving a medical bill in the mail.

It has codes you do not understand, charges that look duplicated, unclear service descriptions, and a final balance that feels impossible to verify.

Most people do not know what to do next.

They may ask:

- Was I billed twice?
- Is this code correct?
- Is this charge unusually high?
- Can this be reimbursed?
- What should I say to my insurer or provider?
- Do I just pay it because I do not understand it?

InsurCheck was built around that moment.

The goal is to turn a confusing medical bill into a clear, structured, and actionable report.

Before:

> “I do not understand this bill, so I might just pay it.”

After:

> “This charge appears duplicated, this code may be overbilled, and here are the exact next steps I can take.”



## Problem

Medical billing systems are complex and difficult for ordinary patients to navigate.

A single medical bill can include:

- CPT codes
- provider information
- policy numbers
- service dates
- line item charges
- reimbursement rules
- insurer-specific requirements
- unclear descriptions
- possible duplicate or inflated charges

Patients are often expected to understand this information with little guidance.

This creates a major information gap, especially for:

- students
- newcomers
- low-income patients
- elderly patients
- people with limited insurance knowledge
- people dealing with unfamiliar healthcare systems

InsurCheck addresses this gap by giving users a first layer of structured understanding before they contact their provider, insurer, or a professional billing advocate.



## Solution

InsurCheck AI lets users upload a medical bill PDF and receive a clear analysis.

The system provides:

- a reconstructed bill view
- extracted patient and provider information
- line-by-line billing code breakdown
- suspicious charge detection
- custom rule-engine findings
- reimbursement eligibility indicators
- estimated savings
- IBM WatsonX-generated plain-language guidance
- next-step action recommendations

The result is a dashboard that helps users understand what may be wrong, why it matters, and what they can do next.



## Core Idea

InsurCheck AI is built around one principle:

> AI should explain and assist, but deterministic validation should lead.

The system does not blindly ask an LLM to decide whether a bill is correct.

Instead:

1. The backend parses the PDF.
2. The bill is converted into structured line items.
3. A custom rule engine checks for known billing issues.
4. Relevant billing knowledge is retrieved through a lightweight RAG pipeline.
5. IBM WatsonX generates a patient-friendly explanation based on the structured findings.

This makes the AI output more grounded and reduces the risk of unsupported responses.



## Live Analysis Flow

```text
User uploads medical bill PDF
        ↓
Spring Boot backend receives file
        ↓
PDFBox extracts raw text from the PDF
        ↓
Bill parser reconstructs patient, provider, total, and line items
        ↓
Custom rule engine validates the bill
        ↓
Rule violations are attached to affected line items
        ↓
RAG pipeline retrieves relevant billing/code knowledge
        ↓
IBM WatsonX Granite model generates plain-language guidance
        ↓
Frontend displays flagged charges, explanations, and action steps
