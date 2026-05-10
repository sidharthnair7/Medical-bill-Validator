import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import BillReconstruction from "./BillReconstruction.jsx";
import { uploadBill } from "../api.js";

import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

const font = "Syne, system-ui, sans-serif";
const mono = "DM Mono, monospace";

const textPrimary = "#ffffff";
const textSecondary = "rgba(255,255,255,0.96)";
const textMuted = "rgba(255,255,255,0.82)";
const textFaint = "rgba(255,255,255,0.68)";

const LiquidMetalMaterial = shaderMaterial(
    { uTime: 0, uMouse: new THREE.Vector2(0.5, 0.5) },
    `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    `varying vec2 vUv; uniform float uTime; uniform vec2 uMouse;
     vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;} vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;} vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
     float snoise(vec2 v){ const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439); vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx); vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.); vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i); vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.)); vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.); m=m*m;m=m*m; vec3 x2=2.*fract(p*C.www)-1.; vec3 h=abs(x2)-.5; vec3 ox=floor(x2+.5); vec3 a0=x2-ox; m*=1.79284291400159-0.85373472095314*(a0*a0+h*h); vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw; return 130.*dot(m,g); }
     void main(){ vec2 uv=vUv; vec2 mouse=uMouse; float n1=snoise(uv*3.2+uTime*.12); float n2=snoise(uv*6.5-uTime*.22+n1*.38); float n3=snoise(uv*11.+uTime*.32-n2*.28); float n4=snoise(uv*19.-uTime*.17+n3*.18); float d=distance(uv,mouse); float mInf=smoothstep(.6,0.,d)*.75; float ripple=sin(d*24.-uTime*5.)*mInf*.28; float I=n1*.37+n2*.29+n3*.20+n4*.14; I=I*.5+.5+ripple+mInf*.14; vec3 void_=vec3(.012,.012,.018); vec3 shadow=vec3(.052,.052,.070); vec3 steel=vec3(.128,.128,.162); vec3 chrome=vec3(.255,.255,.308); vec3 glint=vec3(.475,.475,.528); vec3 col=void_; col=mix(col,shadow,smoothstep(.10,.28,I)); col=mix(col,steel, smoothstep(.28,.50,I)); col=mix(col,chrome,smoothstep(.50,.72,I)); col=mix(col,glint, smoothstep(.72,.93,I)); col+=mInf*.055; float grain=snoise(uv*520.+uTime*12.)*.016; col=clamp(col+grain,0.,1.); gl_FragColor=vec4(col,1.); }`
);
extend({ LiquidMetalMaterial });

function Background({ mouseRef }) {
    const matRef = useRef();
    const { viewport } = useThree();
    useFrame(({ clock }) => {
        if (!matRef.current) return;
        matRef.current.uTime = clock.getElapsedTime();
        const target = mouseRef.current;
        matRef.current.uMouse.x += (target.x - matRef.current.uMouse.x) * 0.04;
        matRef.current.uMouse.y += (target.y - matRef.current.uMouse.y) * 0.04;
    });
    return (
        <mesh scale={[viewport.width, viewport.height, 1]}>
            <planeGeometry args={[1, 1]} />
            <liquidMetalMaterial ref={matRef} />
        </mesh>
    );
}

function Particles({ count = 80 }) {
    const meshRef = useRef();
    const positions = useRef(Float32Array.from({ length: count * 3 }, (_, i) => { const axis = i % 3; if (axis === 0) return (Math.random() - 0.5) * 24; if (axis === 1) return (Math.random() - 0.5) * 14; return (Math.random() - 0.5) * 3; }));
    const speeds = useRef(Float32Array.from({ length: count }, () => 0.2 + Math.random() * 0.5));
    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        const pos = meshRef.current.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) { const base = i * 3; pos[base + 1] += speeds.current[i] * 0.003; pos[base] += Math.sin(t * speeds.current[i] + i) * 0.001; if (pos[base + 1] > 7) pos[base + 1] = -7; }
        meshRef.current.geometry.attributes.position.needsUpdate = true;
    });
    return (
        <points ref={meshRef}>
            <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions.current, 3]} /></bufferGeometry>
            <pointsMaterial size={0.025} color="#ffffff" transparent opacity={0.18} sizeAttenuation />
        </points>
    );
}

function Scene({ mouseRef }) {
    return (
        <>
            <Background mouseRef={mouseRef} />
            <Particles />
        </>
    );
}



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

            <div style={{ fontFamily: mono, fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: loading ? textPrimary : textSecondary, marginBottom: "0.4rem", transition: "color 0.3s" }}>
                {loading ? "Parsing bill & running RAG pipeline…" : "Drop your bill PDF here or click to upload"}
            </div>
            {!loading && (
                <div style={{ fontFamily: mono, fontSize: "0.58rem", color: textPrimary, letterSpacing: "0.08em" }}>
                    PDF only · Max 20MB
                </div>
            )}
        </div>
    );
}


function MetricCard({ label, value, accent, sub }) {
    return (
        <div style={{
            background: "rgba(10,10,14,0.55)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16, padding: "1.2rem 1.5rem",
            backdropFilter: "blur(20px)",
        }}>
            <div style={{ fontFamily: mono, fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: textPrimary, marginBottom: "0.5rem" }}>
                {label}
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.04em", color: accent ?? "#fff", lineHeight: 1 }}>
                {value}
            </div>
            {sub && (
                <div style={{
                    fontFamily: mono,
                    fontSize: "0.62rem",
                    color: textMuted,
                    letterSpacing: "0.06em",
                    marginTop: "0.35rem",
                    fontWeight: 600
                }}>
                    {sub}
                </div>
            )}
        </div>
    );
}

export default function Workspace({ onShowAuth, onGoHome }) {
    const { token, user, logout, isLoggedIn } = useAuth();
    const [bill, setBill]     = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState("");

    // Mouse tracking for the liquid shader
    const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
    useEffect(() => {
        const onMove = (e) => {
            mouseRef.current.x = e.clientX / window.innerWidth;
            mouseRef.current.y = 1 - e.clientY / window.innerHeight;
        };
        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
    }, []);

    const handleSignOut = () => {
        logout();
        setBill(null);
        onGoHome?.();
    };

    const canvasBackground = (
        <>
            <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
                <Canvas camera={{ position: [0, 0, 1], near: 0.1, far: 10 }} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} dpr={Math.min(window.devicePixelRatio, 2)}>
                    <Suspense fallback={null}>
                        <Scene mouseRef={mouseRef} />
                    </Suspense>
                </Canvas>
            </div>
            <div style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.028) 2px,rgba(0,0,0,0.028) 4px)" }} />
        </>
    );

    if (!isLoggedIn) {
        return (
            <>
                {canvasBackground}
                <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1.5rem", fontFamily: font, color: "#e8e8ec" }}>
                    <div style={{ fontFamily: mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#a8a8b8" }}>Access Restricted</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Sign in to continue</div>
                    <button onClick={onShowAuth} style={{ padding: "0.85rem 2.4rem", background: "#fff", color: "#000", border: "none", borderRadius: 100, fontFamily: font, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                        Sign In
                    </button>
                </div>
            </>
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

            {canvasBackground}

            <div style={{ position: "relative", zIndex: 10, fontFamily: font, color: textPrimary, minHeight: "100vh" }}>

                {/* ── Navbar ── */}
                <nav style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0 2.8rem", height: 66,
                    background: "rgba(6,6,8,0.42)",
                    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    position: "sticky", top: 0, zIndex: 100,
                    animation: "fadeDown 0.8s cubic-bezier(0.16,1,0.3,1) both",
                }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.03em", textTransform: "uppercase", color: "#fff" }}>
                        INSUR<span style={{ color: "#444450", fontWeight: 500 }}>CHECK</span>
                    </div>

                    <div style={{ fontFamily: mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: textSecondary, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        Neural Workspace <span style={{ color: "rgba(255,255,255,0.12)" }}>/</span> Dashboard
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: textPrimary, background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 100, padding: "0.35rem 0.9rem" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.8)", display: "inline-block", animation: "pulse 2.5s infinite" }} />
                            Neural Active
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 100, padding: "0.3rem 1rem 0.3rem 0.3rem", fontSize: "0.8rem", fontWeight: 600 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#fff", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.7rem" }}>
                                {userInitials}
                            </div>
                            {user?.firstName ?? user?.email?.split("@")[0] ?? "User"}
                        </div>

                        <button onClick={handleSignOut} style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: textPrimary, background: "none", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 100, padding: "0.35rem 0.9rem", cursor: "pointer", transition: "all 0.2s" }}
                                onMouseEnter={e => { e.currentTarget.style.color="#fff"; e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"; }}
                                onMouseLeave={e => { e.currentTarget.style.color="#a8a8b8"; e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"; }}
                        >
                            Sign Out
                        </button>
                    </div>
                </nav>

                <div style={{ padding: "2.5rem 2.8rem", maxWidth: 1400, margin: "0 auto" }}>

                    {/* Page title */}
                    <div style={{ marginBottom: "2rem", animation: "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both" }}>
                        <div style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: textPrimary, marginBottom: "0.5rem" }}>
                            Analysis / Real-Time
                        </div>
                        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em", color: textPrimary, margin: 0 }}>
                            Bill Analysis
                        </h1>
                    </div>

                    {bill && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem", animation: "fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both" }}>
                            <MetricCard label="Overcharges Found" value={flagCount} accent={flagCount > 0 ? "#ff9999" : "#a8f0c6"} sub={flagCount > 0 ? "Tap a row for details" : "No issues detected"} />
                            <MetricCard label="Estimated Savings" value={savings > 0 ? `$${savings.toFixed(2)}` : "$0"} accent={savings > 0 ? "#a8f0c6" : "#fff"} sub={savings > 0 ? "Reimbursement eligible" : "Awaiting analysis"} />
                            <MetricCard label="System Status" value={statusLabel} accent={bill.status === "CLEAN" ? "#a8f0c6" : bill.status === "ISSUES_FOUND" ? "#ff9999" : "#fff"} sub="Neural network" />
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: bill ? "minmax(0, 1fr) 420px" : "1fr", gap: "1.5rem", alignItems: "start" }}>

                        {/* Left — Bill or Upload */}
                        <div style={{ animation: "fadeUp 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both" }}>
                            {bill ? (
                                <BillReconstruction bill={bill} token={token} />
                            ) : (
                                <div style={{ background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: "2rem", backdropFilter: "blur(30px)" }}>
                                    <div style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: textPrimary, marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                        Structured Extraction · RAG · Vector DB
                                    </div>
                                    <UploadZone onUpload={handleUpload} loading={loading} />
                                    {error && (
                                        <div style={{ marginTop: "1rem", background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 10, padding: "0.8rem 1rem", fontFamily: mono, fontSize: "0.66rem", color: textPrimary }}>
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {bill && (
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1rem",
                                position: "sticky",
                                top: 90,
                                maxHeight: "calc(100vh - 110px)",
                                animation: "fadeUp 0.7s 0.2s cubic-bezier(0.16,1,0.3,1) both"
                            }}>

                                {/* Upload another */}
                                <div style={{ background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.2rem 1.5rem", backdropFilter: "blur(20px)" }}>
                                    <div style={{ fontFamily: mono, fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: textPrimary, marginBottom: "0.8rem" }}>
                                        Upload Another Bill
                                    </div>
                                    <UploadZone onUpload={handleUpload} loading={loading} />
                                </div>

                                {bill.aiAnalysis && (
                                    <div style={{
                                        background: "rgba(3,3,7,0.84)",
                                        border: "1px solid rgba(255,255,255,0.16)",
                                        borderRadius: 16,
                                        padding: "1.5rem",
                                        backdropFilter: "blur(20px)",
                                        maxHeight: "520px",
                                        overflow: "hidden",
                                        display: "flex",
                                        flexDirection: "column"
                                    }}>
                                        <div style={{ fontFamily: mono, fontSize: "0.55rem", letterSpacing: "0.14em", textTransform: "uppercase", color: textPrimary, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a8f0c6", display: "inline-block", boxShadow: "0 0 8px rgba(168,240,198,0.6)", animation: "pulse 2s infinite" }} />
                                            Neural RAG Analysis
                                        </div>
                                        <div style={{
                                            fontSize: "0.86rem",
                                            color: textPrimary,
                                            lineHeight: 1.75,
                                            whiteSpace: "pre-wrap",
                                            fontWeight: 500,
                                            textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                                            overflowY: "auto",
                                            paddingRight: "0.5rem"
                                        }}>
                                            {bill.aiAnalysis}
                                        </div>
                                    </div>
                                )}

                                {bill.validationSummary && (
                                    <div style={{ background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.2rem 1.5rem", backdropFilter: "blur(20px)" }}>
                                        <div style={{ fontFamily: mono, fontSize: "0.55rem", letterSpacing: "0.14em", textTransform: "uppercase", color: textPrimary, marginBottom: "0.7rem" }}>
                                            Rule Engine Summary
                                        </div>
                                        <div style={{ fontSize: "0.78rem", color: textSecondary, lineHeight: 1.7 }}>
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