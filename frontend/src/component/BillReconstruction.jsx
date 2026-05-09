import { useState, useRef, useCallback } from "react";
import CodePopup from "./CodePopup.jsx";

const font = "Syne, system-ui, sans-serif";
const mono = "DM Mono, monospace";

const css = {
    wrapper: {
        background: "rgba(10,10,14,0.55)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 24,
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        overflow: "hidden",
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
        fontFamily: font,
        color: "#e8e8ec",
        animation: "fadeUp 0.7s 0.1s cubic-bezier(0.16,1,0.3,1) both",
    },
    billHeader: {
        padding: "2rem 2.4rem 1.4rem",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "1rem",
    },
    billMeta: {
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
    },
    providerName: {
        fontSize: "1.05rem",
        fontWeight: 700,
        letterSpacing: "-0.02em",
        color: "#fff",
    },
    metaLine: {
        fontFamily: mono,
        fontSize: "0.62rem",
        letterSpacing: "0.08em",
        color: "#666672",
        textTransform: "uppercase",
    },
    statusBadge: (status) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        fontFamily: mono,
        fontSize: "0.58rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        borderRadius: 100,
        padding: "0.3rem 0.8rem",
        border: "1px solid",
        ...(status === "ISSUES_FOUND"
            ? { background: "rgba(255,80,80,0.08)", borderColor: "rgba(255,80,80,0.25)", color: "#ff9999" }
            : status === "CLEAN"
                ? { background: "rgba(168,240,198,0.08)", borderColor: "rgba(168,240,198,0.25)", color: "#a8f0c6" }
                : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#888" }),
    }),
    tableHeader: {
        display: "grid",
        gridTemplateColumns: "90px 1fr 70px 90px 90px 36px",
        gap: "0.5rem",
        padding: "0.7rem 2.4rem",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        fontFamily: mono,
        fontSize: "0.55rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#444450",
    },
    summaryRow: {
        padding: "1.4rem 2.4rem",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: {
        fontFamily: mono,
        fontSize: "0.6rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#666672",
    },
    totalAmount: {
        fontSize: "1.6rem",
        fontWeight: 800,
        letterSpacing: "-0.04em",
        color: "#fff",
    },
    savingsBadge: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "0.2rem",
    },
    savingsLabel: {
        fontFamily: mono,
        fontSize: "0.55rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#a8f0c6",
    },
    savingsAmount: {
        fontSize: "1rem",
        fontWeight: 700,
        color: "#a8f0c6",
        letterSpacing: "-0.02em",
    },
    hintRow: {
        padding: "0.8rem 2.4rem",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        fontFamily: mono,
        fontSize: "0.58rem",
        letterSpacing: "0.1em",
        color: "#333340",
        textTransform: "uppercase",
        textAlign: "center",
    },
};

// ─── LINE ITEM ROW ─────────────────────────────────────────────────────────────

function LineItemRow({ item, index, onSelect, selected }) {
    const [hovered, setHovered] = useState(false);
    const isActive = hovered || selected;

    const fmt = (v) =>
        v != null ? `$${Number(v).toFixed(2)}` : "—";

    return (
        <div
            onClick={() => onSelect(item)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr 70px 90px 90px 36px",
                gap: "0.5rem",
                alignItems: "center",
                padding: "0.95rem 2.4rem",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
                cursor: "none",
                background: selected
                    ? "rgba(255,255,255,0.06)"
                    : hovered
                        ? "rgba(255,255,255,0.035)"
                        : item.flagged
                            ? "rgba(255,60,60,0.03)"
                            : "transparent",
                transition: "background 0.25s ease",
                animation: `fadeUp 0.5s ${index * 0.06}s cubic-bezier(0.16,1,0.3,1) both`,
                position: "relative",
            }}
        >
            {/* Left accent line when selected */}
            {selected && (
                <div style={{
                    position: "absolute",
                    left: 0, top: 0, bottom: 0,
                    width: 2,
                    background: item.flagged ? "#ff6666" : "#a8f0c6",
                    borderRadius: "0 2px 2px 0",
                }} />
            )}

            {/* Code */}
            <span style={{
                fontFamily: mono,
                fontSize: "0.68rem",
                letterSpacing: "0.06em",
                color: isActive ? "#fff" : "#888898",
                transition: "color 0.2s",
                fontWeight: selected ? 600 : 400,
            }}>
        {item.code || "—"}
      </span>

            {/* Description */}
            <span style={{
                fontSize: "0.82rem",
                color: isActive ? "#e8e8ec" : "#9090a0",
                transition: "color 0.2s",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
            }}>
        {item.description || item.codeFullDescription || "—"}
      </span>

            {/* Quantity */}
            <span style={{
                fontFamily: mono,
                fontSize: "0.68rem",
                color: "#555560",
                textAlign: "center",
            }}>
        {item.quantity ?? 1}
      </span>

            {/* Unit Price */}
            <span style={{
                fontFamily: mono,
                fontSize: "0.72rem",
                color: "#777788",
                textAlign: "right",
            }}>
        {fmt(item.unitPrice)}
      </span>

            {/* Line Total */}
            <span style={{
                fontFamily: mono,
                fontSize: "0.78rem",
                fontWeight: 600,
                color: isActive ? "#fff" : "#c0c0cc",
                textAlign: "right",
                transition: "color 0.2s",
            }}>
        {fmt(item.lineTotal)}
      </span>

            {/* Flag indicator */}
            <div style={{
                width: 24, height: 24,
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.52rem",
                flexShrink: 0,
                marginLeft: "auto",
                background: item.flagged
                    ? "rgba(255,80,80,0.12)"
                    : "rgba(168,240,198,0.08)",
                border: item.flagged
                    ? "1px solid rgba(255,80,80,0.3)"
                    : "1px solid rgba(168,240,198,0.2)",
                color: item.flagged ? "#ff8888" : "#a8f0c6",
                animation: item.flagged ? "flagPulse 2s infinite" : "none",
                transition: "all 0.2s",
                transform: isActive ? "scale(1.15)" : "scale(1)",
            }}>
                {item.flagged ? "!" : "✓"}
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function BillReconstruction({ bill, token }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef();

    const handleSelect = useCallback((item, e) => {
        // Toggle off if clicking same item
        if (selectedItem?.id === item.id) {
            setSelectedItem(null);
            return;
        }
        setSelectedItem(item);
    }, [selectedItem]);

    const handleClose = useCallback(() => setSelectedItem(null), []);

    // Derived stats
    const flaggedItems = bill.lineItems?.filter(i => i.flagged) ?? [];
    const reimbursableItems = bill.lineItems?.filter(i => i.reimbursementEligible) ?? [];
    const estimatedSavings = reimbursableItems.reduce((sum, i) => sum + (i.lineTotal ?? 0), 0);

    const statusLabel = {
        CLEAN: "No Issues",
        ISSUES_FOUND: "Issues Found",
        ANALYZING: "Analyzing…",
        FAILED: "Failed",
        PENDING: "Pending",
    }[bill.status] ?? bill.status;

    return (
        <>
            <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes flagPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>

            <div ref={containerRef} style={{ position: "relative" }}>
                <div style={css.wrapper}>

                    {/* ── Bill Header ── */}
                    <div style={css.billHeader}>
                        <div style={css.billMeta}>
                            <div style={css.providerName}>
                                {bill.providerName ?? "Medical Provider"}
                            </div>
                            {bill.patientName && (
                                <div style={css.metaLine}>Patient: {bill.patientName}</div>
                            )}
                            {bill.serviceDate && (
                                <div style={css.metaLine}>
                                    Date of Service: {new Date(bill.serviceDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                </div>
                            )}
                            {bill.policyNumber && (
                                <div style={css.metaLine}>Policy: {bill.policyNumber}</div>
                            )}
                            <div style={{ ...css.metaLine, marginTop: "0.2rem" }}>
                                {bill.originalFileName}
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.6rem" }}>
                            <div style={css.statusBadge(bill.status)}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                                {statusLabel}
                            </div>
                            {flaggedItems.length > 0 && (
                                <div style={{ fontFamily: mono, fontSize: "0.58rem", letterSpacing: "0.1em", color: "#ff9999", textTransform: "uppercase" }}>
                                    {flaggedItems.length} issue{flaggedItems.length > 1 ? "s" : ""} detected
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Table Header ── */}
                    <div style={css.tableHeader}>
                        <span>Code</span>
                        <span>Description</span>
                        <span style={{ textAlign: "center" }}>Qty</span>
                        <span style={{ textAlign: "right" }}>Unit Price</span>
                        <span style={{ textAlign: "right" }}>Total</span>
                        <span />
                    </div>

                    {/* ── Line Items ── */}
                    <div>
                        {(bill.lineItems ?? []).map((item, i) => (
                            <LineItemRow
                                key={item.id ?? i}
                                item={item}
                                index={i}
                                onSelect={handleSelect}
                                selected={selectedItem?.id === item.id}
                            />
                        ))}
                    </div>

                    {/* ── Summary ── */}
                    <div style={css.summaryRow}>
                        <div>
                            <div style={css.totalLabel}>Total Billed</div>
                            <div style={css.totalAmount}>
                                ${Number(bill.totalAmount ?? 0).toFixed(2)}
                            </div>
                        </div>

                        {estimatedSavings > 0 && (
                            <div style={css.savingsBadge}>
                                <div style={css.savingsLabel}>↓ Estimated Savings</div>
                                <div style={css.savingsAmount}>
                                    ${estimatedSavings.toFixed(2)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Hint ── */}
                    <div style={css.hintRow}>
                        ↑ Click any line item to inspect the billing code
                    </div>
                </div>

                {/* ── Code Popup ── */}
                {selectedItem && (
                    <CodePopup
                        item={selectedItem}
                        token={token}
                        onClose={handleClose}
                    />
                )}
            </div>
        </>
    );
}