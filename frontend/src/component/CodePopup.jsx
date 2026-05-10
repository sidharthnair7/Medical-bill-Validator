/**
 * CodePopup.jsx
 * Place in: src/component/CodePopup.jsx
 */

import { useState, useEffect, useRef } from "react";
import { lookupCode } from "../api.js";

const font = "Syne, system-ui, sans-serif";
const mono = "DM Mono, monospace";

function SectionLabel({ children }) {
    return (
        <div style={{
            fontFamily: mono, fontSize: "0.55rem", letterSpacing: "0.14em",
            textTransform: "uppercase", color: "#444450", marginBottom: "0.5rem",
        }}>
            {children}
        </div>
    );
}

function StatPill({ label, value, accent }) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", gap: "0.25rem",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "0.75rem 1rem", flex: 1,
        }}>
            <div style={{ fontFamily: mono, fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#444450" }}>
                {label}
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, letterSpacing: "-0.02em", color: accent ?? "#e8e8ec" }}>
                {value}
            </div>
        </div>
    );
}

function AiExplanation({ code, token }) {
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState(false);

    useEffect(() => {
        if (!code) return;
        setLoading(true); setError(false); setData(null);

        lookupCode(code, token)
            .then(d => { setData(d); setLoading(false); })
            .catch(() => { setError(true); setLoading(false); });
    }, [code, token]);

    if (loading) return (
        <div style={{ fontFamily: mono, fontSize: "0.66rem", color: "#444450", letterSpacing: "0.06em", animation: "aiPulse 1.5s infinite" }}>
            Querying neural database…
        </div>
    );

    if (error || !data) return (
        <div style={{ fontFamily: mono, fontSize: "0.66rem", color: "#666672" }}>
            Code not found. Ask your provider for a written description of this charge.
        </div>
    );

    const parts = [
        data.fullDescription,
        data.typicalUse && `Typical use: ${data.typicalUse}`,
        data.patientTip  && `💡 ${data.patientTip}`,
    ].filter(Boolean).join("\n\n");

    return (
        <div style={{ fontSize: "0.8rem", color: "#9090a0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {parts}
        </div>
    );
}

export default function CodePopup({ item, token, onClose }) {
    useEffect(() => {
        const h = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", h);
        return () => document.removeEventListener("keydown", h);
    }, [onClose]);

    const fmt = (v) => v != null ? `$${Number(v).toFixed(2)}` : "—";

    const copyDispute = () => {
        const text = `I am writing to formally dispute the charge for CPT code ${item.code} (${item.description ?? "unknown service"}) billed at ${fmt(item.lineTotal)}. ${item.flagExplanation ?? ""} I request an immediate review and correction of this charge.`;
        navigator.clipboard?.writeText(text);
    };

    return (
        <>
            <style>{`
        @keyframes popupIn {
          from { opacity:0; transform:translate(-50%,-50%) scale(0.97); }
          to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
        }
        @keyframes overlayIn { from{opacity:0} to{opacity:1} }
        @keyframes aiPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>

            {/* Backdrop */}
            <div onClick={onClose} style={{
                position: "fixed", inset: 0, zIndex: 999,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
                animation: "overlayIn 0.2s ease both",
            }} />

            {/* Card */}
            <div style={{
                position: "fixed", top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
                zIndex: 1000,
                width: "min(520px, 92vw)",
                background: "rgba(8,8,12,0.97)",
                border: `1px solid ${item.flagged ? "rgba(255,80,80,0.25)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 20,
                backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
                boxShadow: item.flagged
                    ? "0 40px 100px -20px rgba(255,40,40,0.2)"
                    : "0 40px 100px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
                fontFamily: font, color: "#e8e8ec",
                animation: "popupIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
                overflow: "hidden",
                maxHeight: "90vh", overflowY: "auto",
            }}>
                {/* Accent line */}
                <div style={{ height: 2, background: item.flagged ? "linear-gradient(90deg,transparent,rgba(255,80,80,0.6),transparent)" : "linear-gradient(90deg,transparent,rgba(168,240,198,0.4),transparent)" }} />

                {/* Header */}
                <div style={{ padding: "1.4rem 1.8rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <div style={{ fontFamily: mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#555560" }}>
                            {item.codeType ?? "CPT"} Code
                        </div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>
                            {item.code}
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                        {item.flagged && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontFamily: mono, fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#ff9999", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 100, padding: "0.3rem 0.7rem" }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block", animation: "aiPulse 1.5s infinite" }} />
                                Flagged
                            </div>
                        )}
                        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#666672", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>
                            ✕
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: "1.2rem 1.8rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>

                    {/* Stats */}
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                        <StatPill label="Qty" value={item.quantity ?? 1} />
                        <StatPill label="Unit Price" value={fmt(item.unitPrice)} />
                        <StatPill label="Line Total" value={fmt(item.lineTotal)} accent={item.flagged ? "#ff9999" : "#fff"} />
                        {item.reimbursementEligible && <StatPill label="Reimbursable" value="Yes" accent="#a8f0c6" />}
                    </div>

                    {/* Description */}
                    {item.description && (
                        <div>
                            <SectionLabel>Service Description</SectionLabel>
                            <div style={{ fontSize: "0.86rem", color: "#b0b0bc", lineHeight: 1.6 }}>{item.description}</div>
                        </div>
                    )}

                    {/* Flag explanation */}
                    {item.flagged && item.flagExplanation && (
                        <div style={{ background: "rgba(255,60,60,0.06)", border: "1px solid rgba(255,80,80,0.18)", borderRadius: 12, padding: "1rem 1.2rem" }}>
                            <SectionLabel>⚠ Issue Detected</SectionLabel>
                            <div style={{ fontSize: "0.8rem", color: "#ffaaaa", lineHeight: 1.65 }}>{item.flagExplanation}</div>
                        </div>
                    )}

                    {/* Reimbursement banner */}
                    {item.reimbursementEligible && (
                        <div style={{ background: "rgba(168,240,198,0.05)", border: "1px solid rgba(168,240,198,0.18)", borderRadius: 12, padding: "0.85rem 1.2rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
                            <span style={{ fontSize: "1.1rem" }}>✓</span>
                            <div>
                                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#a8f0c6", marginBottom: "0.15rem" }}>Reimbursement Eligible</div>
                                <div style={{ fontFamily: mono, fontSize: "0.6rem", color: "#668877", letterSpacing: "0.06em" }}>You may be owed {fmt(item.lineTotal)} for this charge</div>
                            </div>
                        </div>
                    )}

                    {/* AI explanation */}
                    <div>
                        <SectionLabel>Neural RAG Analysis</SectionLabel>
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "1rem 1.2rem" }}>
                            <AiExplanation code={item.code} token={token} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "0.6rem", paddingTop: "0.2rem" }}>
                        {item.flagged && (
                            <button onClick={copyDispute} style={{ flex: 1, padding: "0.75rem 1rem", background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: 10, color: "#ff9999", fontFamily: mono, fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.25s" }}>
                                Copy Dispute Letter
                            </button>
                        )}
                        <button onClick={onClose} style={{ flex: item.flagged ? 0 : 1, padding: "0.75rem 1.4rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#888", fontFamily: mono, fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}