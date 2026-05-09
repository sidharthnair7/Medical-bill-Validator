/**
 * AuthModal.jsx
 * Place in: src/component/AuthModal.jsx
 *
 * Login + Register modal that matches the InsurCheck dark design.
 * Appears when unauthenticated user tries to access the dashboard.
 */

import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const mono = "DM Mono, monospace";
const font = "Syne, system-ui, sans-serif";

function Field({ label, type = "text", value, onChange, placeholder }) {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{
                fontFamily: mono,
                fontSize: "0.55rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#444450",
            }}>
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${focused ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 10,
                    padding: "0.75rem 1rem",
                    fontFamily: mono,
                    fontSize: "0.72rem",
                    color: "#e8e8ec",
                    outline: "none",
                    transition: "border-color 0.2s",
                    width: "100%",
                    boxSizing: "border-box",
                }}
            />
        </div>
    );
}

export default function AuthModal({ onClose }) {
    const { login, register } = useAuth();
    const [mode, setMode]     = useState("login"); // "login" | "register"
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState("");

    // Form fields
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirst]   = useState("");
    const [lastName, setLast]     = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (mode === "login") {
                await login(email, password);
            } else {
                await register(firstName, lastName, email, password);
            }
            onClose?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%,-50%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    animation: "overlayIn 0.2s ease both",
                }}
            />

            {/* Modal */}
            <div style={{
                position: "fixed",
                top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
                zIndex: 1001,
                width: "min(440px, 92vw)",
                background: "rgba(8,8,12,0.97)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                backdropFilter: "blur(40px)",
                WebkitBackdropFilter: "blur(40px)",
                boxShadow: "0 40px 100px -20px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)",
                overflow: "hidden",
                fontFamily: font,
                color: "#e8e8ec",
                animation: "modalIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
            }}>
                {/* Top line */}
                <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)" }} />

                {/* Header */}
                <div style={{
                    padding: "1.8rem 2rem 1.2rem",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <div>
                        <div style={{ fontFamily: mono, fontSize: "0.55rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#444450", marginBottom: "0.4rem" }}>
                            InsurCheck AI
                        </div>
                        <div style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>
                            {mode === "login" ? "Welcome back" : "Create account"}
                        </div>
                    </div>

                    {/* Logo */}
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.03em", textTransform: "uppercase", color: "#fff" }}>
                        INSUR<span style={{ color: "#444450", fontWeight: 500 }}>CHECK</span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: "1.5rem 2rem 2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

                    {mode === "register" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                            <Field label="First Name" value={firstName} onChange={e => setFirst(e.target.value)} placeholder="Jane" />
                            <Field label="Last Name"  value={lastName}  onChange={e => setLast(e.target.value)}  placeholder="Doe"  />
                        </div>
                    )}

                    <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
                    <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />

                    {/* Error */}
                    {error && (
                        <div style={{
                            background: "rgba(255,60,60,0.08)",
                            border: "1px solid rgba(255,80,80,0.2)",
                            borderRadius: 8,
                            padding: "0.7rem 1rem",
                            fontFamily: mono,
                            fontSize: "0.66rem",
                            color: "#ff9999",
                            letterSpacing: "0.04em",
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: "0.4rem",
                            padding: "0.85rem",
                            background: loading ? "rgba(255,255,255,0.05)" : "#fff",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: 10,
                            fontFamily: font,
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: loading ? "#444" : "#000",
                            cursor: "none",
                            transition: "all 0.25s",
                        }}
                    >
                        {loading
                            ? "Processing…"
                            : mode === "login" ? "Sign In" : "Create Account"}
                    </button>

                    {/* Toggle */}
                    <div style={{
                        textAlign: "center",
                        fontFamily: mono,
                        fontSize: "0.63rem",
                        color: "#444450",
                        letterSpacing: "0.06em",
                    }}>
                        {mode === "login" ? "No account? " : "Already have one? "}
                        <span
                            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                            style={{ color: "#888898", cursor: "none", textDecoration: "underline", textUnderlineOffset: 3 }}
                        >
              {mode === "login" ? "Register" : "Sign in"}
            </span>
                    </div>
                </form>
            </div>
        </>
    );
}