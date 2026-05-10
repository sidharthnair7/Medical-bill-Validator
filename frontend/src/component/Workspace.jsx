/**
 * Workspace.jsx — Protected dashboard
 * Place in: src/component/Workspace.jsx
 */

import { useState, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import BillReconstruction from "./BillReconstruction.jsx";
import { uploadBill } from "../api.js";

const font = "Syne, system-ui, sans-serif";
const mono = "DM Mono, monospace";

// ─── UPLOAD ZONE ──────────────────────────────────────────────────────────────

function UploadZone({ onUpload, loading }) {
    const fileRef = useRef();
    const [dragging, setDragging] = useState(false);

    const handleDrop = (e) => {
        e.preventDefault(); setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onUpload(file);
    };

    return (
        <div
            onClick={() => !loading && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
                border: `1.5px dashed ${dragging ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 16, padding: "2.5rem 2rem",
                textAlign: "center", cursor: loading ? "default" : "pointer",
                transition: "all 0.3s ease",
                background: dragging ? "rgba(255,255,255,0.04)" : "transparent",
            }}
        >
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
                   onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])} />

            <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem", margin: "0 auto 1.2rem",
                animation: loading ? "spin 1s linear infinite" : "none",
            }}>
                {loading ? "⟳" : "↑"}
            </div>

            <div style={{ fontFamily: mono, fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: loading ? "#a8f0c6" : "#666672", marginBottom: "0.4rem", transition: "color 0.3s" }}>
                {loading ? "Parsing bill & running RAG pipeline…" : "Drop your bill PDF here or click to upload"}
            </div>
            {!loading && (
                <div style={{ fontFamily: mono, fontSize: "0.58rem", color: "#333340", letterSpacing: "0.08em" }}>
                    PDF only · Max 20MB
                </div>
            )}
        </div>
    );
}

// ─── METRIC CARD ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, accent, sub }) {
    return (
        <div style={{
            background: "rgba(10,10,14,0.55)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16, padding: "1.2rem 1.5rem",
            backdropFilter: "blur(20px)",
        }}>
            <div style={{ fontFamily: mono, fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#444450", marginBottom: "0.5rem" }}>
                {label}
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.04em", color: accent ?? "#fff", lineHeight: 1 }}>
                {value}
            </div>
            {sub && <div style={{ fontFamily: mono, fontSize: "0.58rem", color: "#444450", letterSpacing: "0.06em", marginTop: "0.3rem" }}>{sub}</div>}
        </div>
    );
}

// ─── MAIN WORKSPACE ───────────────────────────────────────────────────────────

export default function Workspace({ onShowAuth }) {
    const { token, user, logout, isLoggedIn } = useAuth();
    const [bill, setBill]     = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState("");

    // Guard — if not logged in show sign-in prompt
    if (!isLoggedIn) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1.5rem", fontFamily: font, color: "#e8e8ec", background: "#060608" }}>
                <div style={{ fontFamily: mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#444450" }}>Access Restricted</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Sign in to continue</div>
                <button onClick={onShowAuth} style={{ padding: "0.85rem 2.4rem", background: "#fff", color: "#000", border: "none", borderRadius: 100, fontFamily: font, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                    Sign In
                </button>
            </div>
        );
    }

    const handleUpload = useCallback(async (file) => {
        setLoading(true); setError(""); setBill(null);
        try {
            const data = await uploadBill(file, token);
            setBill(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const flagCount   = bill?.lineItems?.filter(i => i.flagged).length ?? 0;
    const savings     = bill?.lineItems?.filter(i => i.reimbursementEligible).reduce((s, i) => s + (i.lineTotal ?? 0), 0) ?? 0;
    const statusLabel = { CLEAN: "Clean", ISSUES_FOUND: "Issues Found", ANALYZING: "Analyzing", FAILED: "Failed", PENDING: "Pending" }[bill?.status] ?? "—";
    const userInitials = user?.firstName ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase() : user?.email?.[0]?.toUpperCase() ?? "U";

    return (
        <>
            <style>{`
        @keyframes fadeDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(24px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes pulse    { 0%,100%{opacity:1;box-shadow:0 0 8px rgba(255,255,255,0.8)} 50%{opacity:0.4;box-shadow:0 0 4px rgba(255,255,255,0.3)} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

            <div style={{ fontFamily: font, color: "#e8e8ec", minHeight: "100vh", background: "#060608" }}>

                {/* ── Navbar ── */}
                <nav style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0 2.8rem", height: 66,
                    background: "rgba(6,6,8,0.8)",
                    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    position: "sticky", top: 0, zIndex: 100,
                    animation: "fadeDown 0.8s cubic-bezier(0.16,1,0.3,1) both",
                }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.03em", textTransform: "uppercase", color: "#fff" }}>
                        INSUR<span style={{ color: "#444450", fontWeight: 500 }}>CHECK</span>
                    </div>

                    <div style={{ fontFamily: mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#444450", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        Neural Workspace <span style={{ color: "rgba(255,255,255,0.12)" }}>/</span> Dashboard
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#666672", background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 100, padding: "0.35rem 0.9rem" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.8)", display: "inline-block", animation: "pulse 2.5s infinite" }} />
                            Neural Active
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 100, padding: "0.3rem 1rem 0.3rem 0.3rem", fontSize: "0.8rem", fontWeight: 600 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#fff", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.7rem" }}>
                                {userInitials}
                            </div>
                            {user?.firstName ?? user?.email?.split("@")[0] ?? "User"}
                        </div>

                        <button onClick={logout} style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#444450", background: "none", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 100, padding: "0.35rem 0.9rem", cursor: "pointer", transition: "all 0.2s" }}
                                onMouseEnter={e => { e.currentTarget.style.color="#fff"; e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"; }}
                                onMouseLeave={e => { e.currentTarget.style.color="#444450"; e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"; }}
                        >
                            Sign Out
                        </button>
                    </div>
                </nav>

                {/* ── Content ── */}
                <div style={{ padding: "2.5rem 2.8rem", maxWidth: 1400, margin: "0 auto" }}>

                    {/* Page title */}
                    <div style={{ marginBottom: "2rem", animation: "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both" }}>
                        <div style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#444450", marginBottom: "0.5rem" }}>
                            Analysis / Real-Time
                        </div>
                        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em", color: "#fff", margin: 0 }}>
                            Bill Analysis
                        </h1>
                    </div>

                    {/* Metrics (only when bill loaded) */}
                    {bill && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem", animation: "fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both" }}>
                            <MetricCard label="Overcharges Found" value={flagCount} accent={flagCount > 0 ? "#ff9999" : "#a8f0c6"} sub={flagCount > 0 ? "Tap a row for details" : "No issues detected"} />
                            <MetricCard label="Estimated Savings" value={savings > 0 ? `$${savings.toFixed(2)}` : "$0"} accent={savings > 0 ? "#a8f0c6" : "#fff"} sub={savings > 0 ? "Reimbursement eligible" : "Awaiting analysis"} />
                            <MetricCard label="System Status" value={statusLabel} accent={bill.status === "CLEAN" ? "#a8f0c6" : bill.status === "ISSUES_FOUND" ? "#ff9999" : "#fff"} sub="Neural network" />
                        </div>
                    )}

                    {/* Main grid */}
                    <div style={{ display: "grid", gridTemplateColumns: bill ? "1fr 360px" : "1fr", gap: "1.5rem", alignItems: "start" }}>

                        {/* Left — Bill or Upload */}
                        <div style={{ animation: "fadeUp 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both" }}>
                            {bill ? (
                                <BillReconstruction bill={bill} token={token} />
                            ) : (
                                <div style={{ background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: "2rem", backdropFilter: "blur(30px)" }}>
                                    <div style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#444450", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                        Structured Extraction · RAG · Vector DB
                                    </div>
                                    <UploadZone onUpload={handleUpload} loading={loading} />
                                    {error && (
                                        <div style={{ marginTop: "1rem", background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 10, padding: "0.8rem 1rem", fontFamily: mono, fontSize: "0.66rem", color: "#ff9999" }}>
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right panel (only when bill loaded) */}
                        {bill && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", animation: "fadeUp 0.7s 0.2s cubic-bezier(0.16,1,0.3,1) both" }}>

                                {/* Upload another */}
                                <div style={{ background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.2rem 1.5rem", backdropFilter: "blur(20px)" }}>
                                    <div style={{ fontFamily: mono, fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#444450", marginBottom: "0.8rem" }}>
                                        Upload Another Bill
                                    </div>
                                    <UploadZone onUpload={handleUpload} loading={loading} />
                                </div>

                                {/* AI Analysis */}
                                {bill.aiAnalysis && (
                                    <div style={{ background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem", backdropFilter: "blur(20px)" }}>
                                        <div style={{ fontFamily: mono, fontSize: "0.55rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#444450", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a8f0c6", display: "inline-block", boxShadow: "0 0 8px rgba(168,240,198,0.6)", animation: "pulse 2s infinite" }} />
                                            Neural RAG Analysis
                                        </div>
                                        <div style={{ fontSize: "0.78rem", color: "#9090a0", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                                            {bill.aiAnalysis}
                                        </div>
                                    </div>
                                )}

                                {/* Rule engine summary */}
                                {bill.validationSummary && (
                                    <div style={{ background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.2rem 1.5rem", backdropFilter: "blur(20px)" }}>
                                        <div style={{ fontFamily: mono, fontSize: "0.55rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#444450", marginBottom: "0.7rem" }}>
                                            Rule Engine Summary
                                        </div>
                                        <div style={{ fontSize: "0.78rem", color: "#777788", lineHeight: 1.7 }}>
                                            {bill.validationSummary}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}