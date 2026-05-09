/**
 * InsurCheck AI — React Three Fiber Landing Page
 *
 * Install deps:
 *   npm install three @react-three/fiber @react-three/drei
 *
 * Usage in your app:
 *   import InsurCheck from './InsurCheck'
 *   <InsurCheck />
 *
 * Font (add to your index.html or global CSS):
 *   <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
 */

import { useRef, useEffect, useState, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { extend } from "@react-three/fiber";

// ─── GLSL SHADER MATERIAL ────────────────────────────────────────────────────

const LiquidMetalMaterial = shaderMaterial(
    { uTime: 0, uMouse: new THREE.Vector2(0.5, 0.5) },
    /* vertex */
    `varying vec2 vUv;
   void main() {
     vUv = uv;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
   }`,
    /* fragment */
    `varying vec2 vUv;
   uniform float uTime;
   uniform vec2 uMouse;

   vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
   vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
   vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
   float snoise(vec2 v){
     const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
     vec2 i=floor(v+dot(v,C.yy));
     vec2 x0=v-i+dot(i,C.xx);
     vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
     vec4 x12=x0.xyxy+C.xxzz;
     x12.xy-=i1;
     i=mod289(i);
     vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
     vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
     m=m*m;m=m*m;
     vec3 x2=2.*fract(p*C.www)-1.;
     vec3 h=abs(x2)-.5;
     vec3 ox=floor(x2+.5);
     vec3 a0=x2-ox;
     m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
     vec3 g;
     g.x=a0.x*x0.x+h.x*x0.y;
     g.yz=a0.yz*x12.xz+h.yz*x12.yw;
     return 130.*dot(m,g);
   }

   void main(){
     vec2 uv=vUv;
     vec2 mouse=uMouse;

     float n1=snoise(uv*3.2+uTime*.12);
     float n2=snoise(uv*6.5-uTime*.22+n1*.38);
     float n3=snoise(uv*11.+uTime*.32-n2*.28);
     float n4=snoise(uv*19.-uTime*.17+n3*.18);

     float d=distance(uv,mouse);
     float mInf=smoothstep(.6,0.,d)*.75;
     float ripple=sin(d*24.-uTime*5.)*mInf*.28;

     float I=n1*.37+n2*.29+n3*.20+n4*.14;
     I=I*.5+.5+ripple+mInf*.14;

     vec3 void_=vec3(.012,.012,.018);
     vec3 shadow=vec3(.052,.052,.070);
     vec3 steel=vec3(.128,.128,.162);
     vec3 chrome=vec3(.255,.255,.308);
     vec3 glint=vec3(.475,.475,.528);

     vec3 col=void_;
     col=mix(col,shadow,smoothstep(.10,.28,I));
     col=mix(col,steel, smoothstep(.28,.50,I));
     col=mix(col,chrome,smoothstep(.50,.72,I));
     col=mix(col,glint, smoothstep(.72,.93,I));
     col+=mInf*.055;

     float grain=snoise(uv*520.+uTime*12.)*.016;
     col=clamp(col+grain,0.,1.);
     gl_FragColor=vec4(col,1.);
   }`
);

extend({ LiquidMetalMaterial });

// ─── R3F BACKGROUND PLANE ────────────────────────────────────────────────────

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

// ─── FLOATING PARTICLE FIELD ─────────────────────────────────────────────────

function Particles({ count = 80, mouseRef }) {
    const meshRef = useRef();
    const positions = useRef(
        Float32Array.from({ length: count * 3 }, (_, i) => {
            const axis = i % 3;
            if (axis === 0) return (Math.random() - 0.5) * 24;
            if (axis === 1) return (Math.random() - 0.5) * 14;
            return (Math.random() - 0.5) * 3;
        })
    );
    const speeds = useRef(
        Float32Array.from({ length: count }, () => 0.2 + Math.random() * 0.5)
    );

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        const pos = meshRef.current.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
            const base = i * 3;
            pos[base + 1] += speeds.current[i] * 0.003;
            pos[base] += Math.sin(t * speeds.current[i] + i) * 0.001;
            if (pos[base + 1] > 7) pos[base + 1] = -7;
        }
        meshRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions.current, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.025}
                color="#ffffff"
                transparent
                opacity={0.18}
                sizeAttenuation
            />
        </points>
    );
}

// ─── R3F CANVAS SCENE ────────────────────────────────────────────────────────

function Scene({ mouseRef }) {
    return (
        <>
            <Background mouseRef={mouseRef} />
            <Particles mouseRef={mouseRef} />
        </>
    );
}

// ─── BILL ROW COMPONENT ───────────────────────────────────────────────────────

function BillRow({ code, desc, amount, flagged }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex",
                alignItems: "center",
                padding: "0.75rem 1rem",
                borderRadius: 10,
                border: `1px solid ${hovered || flagged ? "rgba(255,255,255,0.12)" : "transparent"}`,
                background: hovered
                    ? "rgba(255,255,255,0.06)"
                    : flagged
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,255,255,0.025)",
                fontSize: "0.82rem",
                gap: "0.75rem",
                transition: "all 0.3s ease",
                cursor: "none",
            }}
        >
      <span style={{ fontFamily: "DM Mono, monospace", color: "#666672", fontSize: "0.7rem", flexShrink: 0 }}>
        {code}
      </span>
            <span style={{ flex: 1, color: "#c0c0cc" }}>{desc}</span>
            <span style={{ fontWeight: 600, color: "#fff" }}>{amount}</span>
            <div
                style={{
                    width: 20, height: 20, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.55rem", flexShrink: 0,
                    background: flagged ? "rgba(255,80,80,0.15)" : "rgba(255,255,255,0.08)",
                    border: flagged ? "1px solid rgba(255,80,80,0.35)" : "none",
                    color: flagged ? "#ff8888" : "#666672",
                    animation: flagged ? "flagPulse 2s infinite" : "none",
                }}
            >
                {flagged ? "!" : "✓"}
            </div>
        </div>
    );
}

// ─── MAGNETIC BUTTON ──────────────────────────────────────────────────────────

function MagneticBtn({ children, variant = "solid", style = {}, onClick }) {
    const ref = useRef();
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const handleMouseMove = useCallback((e) => {
        const rect = ref.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 100;
        if (dist < radius) {
            const s = (1 - dist / radius) * 0.45;
            setOffset({ x: dx * s, y: dy * s });
        } else {
            setOffset({ x: 0, y: 0 });
        }
    }, []);

    const handleMouseLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);

    const base = {
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontFamily: "Syne, system-ui, sans-serif",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        borderRadius: 100,
        padding: "0.9rem 2.2rem",
        cursor: "none",
        overflow: "hidden",
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: offset.x === 0 && offset.y === 0
            ? "transform 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease, border-color 0.3s ease"
            : "transform 0.1s ease",
        border: variant === "solid"
            ? "1px solid rgba(255,255,255,0.3)"
            : "1px solid rgba(255,255,255,0.2)",
        background: variant === "solid"
            ? "#ffffff"
            : "rgba(10,10,14,0.55)",
        color: variant === "solid" ? "#000" : "#ccc",
        backdropFilter: variant === "outline" ? "blur(20px)" : "none",
        ...style,
    };

    return (
        <button
            ref={ref}
            style={base}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

// ─── ANALYSIS CARD ────────────────────────────────────────────────────────────

const BILLS = [
    { code: "CPT 99213", desc: "Office Visit — Level 3", amount: "$180", flagged: false },
    { code: "CPT 99214", desc: "Office Visit — Level 4", amount: "$520", flagged: true },
    { code: "CPT 93000", desc: "Electrocardiogram", amount: "$95", flagged: false },
    { code: "CPT 80053", desc: "Comprehensive Metabolic Panel", amount: "$210", flagged: true },
];

function AnalysisCard() {
    const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
    const [isHover, setIsHover] = useState(false);
    const [savings, setSavings] = useState(0);
    const [chatVal, setChatVal] = useState("");
    const [chatPlaceholder, setChatPlaceholder] = useState("Ask about your bill…");
    const [uploadLabel, setUploadLabel] = useState("↑  Drop your bill PDF here or click to upload");
    const cardRef = useRef();
    const fileRef = useRef();

    // Savings counter
    useEffect(() => {
        const target = 547;
        let cur = 0;
        const id = setTimeout(() => {
            const tick = () => {
                cur += Math.ceil((target - cur) * 0.08);
                setSavings(Math.min(cur, target));
                if (cur < target) requestAnimationFrame(tick);
            };
            tick();
        }, 900);
        return () => clearTimeout(id);
    }, []);

    const handleMouseMove = (e) => {
        const rect = cardRef.current.getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width / 2;
        const cy = e.clientY - rect.top - rect.height / 2;
        setTilt({ rx: (cy / rect.height) * 10, ry: -(cx / rect.width) * 10 });
    };

    const handleChat = () => {
        if (!chatVal.trim()) return;
        setChatVal("");
        setChatPlaceholder("Querying neural database…");
        setTimeout(() => setChatPlaceholder("✓ CPT 99214 overcharged by $310 above fair-market rate"), 1400);
    };

    const handleFile = (file) => {
        setUploadLabel(`📄 ${file.name} — Parsing…`);
        setTimeout(() => setUploadLabel("✓ Analysis complete — 3 discrepancies found. Savings: $547"), 1800);
    };

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => { setTilt({ rx: 0, ry: 0 }); setIsHover(false); }}
            style={{
                background: "rgba(10,10,14,0.55)",
                border: `1px solid ${isHover ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 28,
                padding: "2rem",
                backdropFilter: "blur(30px)",
                WebkitBackdropFilter: "blur(30px)",
                boxShadow: isHover
                    ? "0 60px 120px -20px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : "0 40px 80px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
                transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${isHover ? 8 : 0}px)`,
                transition: isHover && (tilt.rx !== 0 || tilt.ry !== 0)
                    ? "transform 0.05s ease, border-color 0.4s ease, box-shadow 0.4s ease"
                    : "transform 0.7s cubic-bezier(0.16,1,0.3,1), border-color 0.4s ease, box-shadow 0.4s ease",
                cursor: "none",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.63rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#666672" }}>Live Bill Analysis</span>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.1em", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, padding: "0.2rem 0.6rem", color: "#888", textTransform: "uppercase" }}>RAG Active</span>
            </div>

            {/* Bill rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {BILLS.map((b) => <BillRow key={b.code} {...b} />)}
            </div>

            {/* Savings */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "1rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#666672" }}>Estimated Savings</span>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>${savings}</span>
            </div>

            {/* Chat */}
            <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.75rem" }}>
                <input
                    value={chatVal}
                    onChange={e => setChatVal(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleChat()}
                    placeholder={chatPlaceholder}
                    style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0.7rem 1rem", fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#e8e8ec", outline: "none", cursor: "none" }}
                />
                <button onClick={handleChat} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 10, padding: "0.7rem 1rem", color: "#fff", cursor: "none", fontSize: "0.8rem" }}>→</button>
            </div>

            {/* Upload */}
            <div
                onClick={() => fileRef.current?.click()}
                style={{ border: "1.5px dashed rgba(255,255,255,0.18)", borderRadius: 10, padding: "1.2rem", textAlign: "center", fontFamily: "DM Mono, monospace", fontSize: "0.63rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#666672", cursor: "none", transition: "all 0.3s ease" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "#666672"; }}
            >
                {uploadLabel}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.png" style={{ display: "none" }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            </div>
        </div>
    );
}

// ─── STAT ITEM ────────────────────────────────────────────────────────────────

function StatItem({ num, label, delay }) {
    const [visible, setVisible] = useState(false);
    const ref = useRef();
    useEffect(() => {
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
        if (ref.current) io.observe(ref.current);
        return () => io.disconnect();
    }, []);

    return (
        <div ref={ref} style={{ padding: "2.5rem 3.5rem", borderRight: "1px solid rgba(255,255,255,0.07)", transition: "background 0.3s ease", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)", transitionDuration: "0.8s", transitionDelay: `${delay}ms`, transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)", cursor: "none" }}
             onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
             onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
            <div style={{ fontSize: "2.8rem", fontWeight: 800, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1, marginBottom: "0.4rem" }}>{num}</div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.63rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#666672" }}>{label}</div>
        </div>
    );
}

// ─── FEATURE CARD ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, name, desc }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ background: hovered ? "rgba(255,255,255,0.025)" : "#060608", padding: "2.5rem", position: "relative", overflow: "hidden", transition: "background 0.3s ease", cursor: "none" }}
        >
            {hovered && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }} />
            )}
            <div style={{ width: 40, height: 40, background: hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${hovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", fontSize: "1.1rem", boxShadow: hovered ? "0 0 20px rgba(255,255,255,0.08)" : "none", transition: "all 0.3s ease" }}>
                {icon}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", marginBottom: "0.6rem" }}>{name}</div>
            <div style={{ fontSize: "0.83rem", color: "#666672", lineHeight: 1.65 }}>{desc}</div>
        </div>
    );
}

// ─── CUSTOM CURSOR ────────────────────────────────────────────────────────────

function CustomCursor() {
    const [pos, setPos] = useState({ x: -100, y: -100 });
    const [ring, setRing] = useState({ x: -100, y: -100 });
    const [big, setBig] = useState(false);
    const [clicking, setClicking] = useState(false);
    const ringRef = useRef({ x: -100, y: -100 });
    const posRef = useRef({ x: -100, y: -100 });

    useEffect(() => {
        const onMove = (e) => { posRef.current = { x: e.clientX, y: e.clientY }; setPos({ x: e.clientX, y: e.clientY }); };
        const onDown = () => setClicking(true);
        const onUp = () => setClicking(false);
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("mouseup", onUp);

        let raf;
        const lerp = () => {
            ringRef.current.x += (posRef.current.x - ringRef.current.x) * 0.1;
            ringRef.current.y += (posRef.current.y - ringRef.current.y) * 0.1;
            setRing({ x: ringRef.current.x, y: ringRef.current.y });
            raf = requestAnimationFrame(lerp);
        };
        lerp();

        // Hover detection
        const interactables = () => document.querySelectorAll("button, a, input, [data-cursor]");
        const over = () => setBig(true);
        const out  = () => setBig(false);
        const attach = () => interactables().forEach(el => { el.addEventListener("mouseenter", over); el.addEventListener("mouseleave", out); });
        attach();

        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("mouseup", onUp);
            cancelAnimationFrame(raf);
        };
    }, []);

    const dotSize = clicking ? 6 : 12;
    const ringSize = big ? 56 : clicking ? 28 : 44;

    return (
        <>
            <div style={{ position: "fixed", left: pos.x, top: pos.y, width: dotSize, height: dotSize, background: "#fff", borderRadius: "50%", pointerEvents: "none", zIndex: 99999, transform: "translate(-50%,-50%)", mixBlendMode: "difference", transition: "width 0.2s ease, height 0.2s ease" }} />
            <div style={{ position: "fixed", left: ring.x, top: ring.y, width: ringSize, height: ringSize, border: `1.5px solid rgba(255,255,255,${big ? 0.7 : 0.45})`, borderRadius: "50%", pointerEvents: "none", zIndex: 99998, transform: "translate(-50%,-50%)", transition: "width 0.35s cubic-bezier(0.16,1,0.3,1), height 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease" }} />
        </>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const STATUSES = ["System Secure", "RAG Active", "Neural Ready", "98% Accuracy", "Live Analysis"];
const FEATURES = [
    { icon: "⬡", name: "RAG Pipeline", desc: "Fetches your specific policy clauses and cross-references them against billing codes in milliseconds." },
    { icon: "◈", name: "CPT Code Audit", desc: "Compares 10,000+ CPT codes against national benchmarks and your plan's negotiated rates." },
    { icon: "◎", name: "Real-Time Flags", desc: "Anomalies are surfaced instantly with detailed explanations and dispute letter generation." },
    { icon: "⬕", name: "Neural OCR", desc: "Gemini-powered document parsing that handles even the most complex hospital bill formats." },
    { icon: "◉", name: "Policy Matching", desc: "Upload your EOB once. We remember your coverage for every future analysis." },
    { icon: "⬙", name: "Dispute Assist", desc: "One-click generation of formal appeal letters citing exact policy sections and CPT code mismatches." },
];

export default function InsurCheck() {
    const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
    const [statusIdx, setStatusIdx] = useState(0);
    const [statusVisible, setStatusVisible] = useState(true);
    const [featVisible, setFeatVisible] = useState(false);
    const featRef = useRef();

    useEffect(() => {
        const onMove = (e) => {
            mouseRef.current.x = e.clientX / window.innerWidth;
            mouseRef.current.y = 1 - e.clientY / window.innerHeight;
        };
        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
    }, []);

    useEffect(() => {
        const id = setInterval(() => {
            setStatusVisible(false);
            setTimeout(() => { setStatusIdx(i => (i + 1) % STATUSES.length); setStatusVisible(true); }, 220);
        }, 3500);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setFeatVisible(true); }, { threshold: 0.1 });
        if (featRef.current) io.observe(featRef.current);
        return () => io.disconnect();
    }, []);

    const globalStyle = `
    * { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior: smooth; }
    body { background:#060608; cursor:none; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
    @keyframes flagPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
    @keyframes pulse { 0%,100%{opacity:1;box-shadow:0 0 8px rgba(255,255,255,0.8)} 50%{opacity:0.4;box-shadow:0 0 4px rgba(255,255,255,0.3)} }
    @keyframes breathe { 0%,100%{opacity:0.2} 50%{opacity:0.55} }
    @keyframes fadeDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
  `;

    const font = "Syne, system-ui, sans-serif";

    return (
        <>
            <style>{globalStyle}</style>
            <CustomCursor />

            {/* R3F Canvas — fixed fullscreen background */}
            <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
                <Canvas
                    camera={{ position: [0, 0, 1], near: 0.1, far: 10 }}
                    gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
                    dpr={Math.min(window.devicePixelRatio, 2)}
                >
                    <Suspense fallback={null}>
                        <Scene mouseRef={mouseRef} />
                    </Suspense>
                </Canvas>
            </div>

            {/* Scanlines */}
            <div style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.028) 2px,rgba(0,0,0,0.028) 4px)" }} />

            {/* Spotlight */}
            <div id="r3f-spotlight" style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }} />

            {/* UI */}
            <div style={{ position: "relative", zIndex: 10, minHeight: "100vh", fontFamily: font, color: "#e8e8ec" }}>

                {/* NAV */}
                <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2rem 3.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", background: "rgba(6,6,8,0.42)", position: "sticky", top: 0, zIndex: 100, animation: "fadeDown 0.8s cubic-bezier(0.16,1,0.3,1) both" }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.03em", textTransform: "uppercase", color: "#fff", cursor: "none" }}>
                        INSUR<span style={{ color: "#666672", fontWeight: 500 }}>CHECK</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                        {["How It Works", "Pricing", "Enterprise"].map(l => (
                            <a key={l} href="#" style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "#666672", textDecoration: "none", cursor: "none", transition: "color 0.2s" }}
                               onMouseEnter={e => e.target.style.color="#fff"}
                               onMouseLeave={e => e.target.style.color="#666672"}
                            >{l}</a>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "DM Mono, monospace", fontSize: "0.63rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#888", background: "rgba(10,10,14,0.55)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", borderRadius: 100, padding: "0.45rem 1rem" }}>
                            <div style={{ width: 6, height: 6, background: "#fff", borderRadius: "50%", boxShadow: "0 0 8px rgba(255,255,255,0.8)", animation: "pulse 2.5s infinite" }} />
                            <span style={{ opacity: statusVisible ? 1 : 0, transition: "opacity 0.25s ease" }}>{STATUSES[statusIdx]}</span>
                        </div>
                    </div>
                </nav>

                {/* HERO */}
                <div style={{ padding: "7rem 3.5rem 5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center", maxWidth: 1400, margin: "0 auto" }}>
                    <div style={{ animation: "fadeUp 1s 0.15s cubic-bezier(0.16,1,0.3,1) both" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", fontFamily: "DM Mono, monospace", fontSize: "0.66rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#666672", marginBottom: "1.8rem" }}>
                            <span style={{ display: "inline-block", width: 24, height: 1, background: "#666672" }} />
                            RAG-Powered Insurance Intelligence
                        </div>
                        <h1 style={{ fontSize: "clamp(3rem,5vw,5.5rem)", fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.04em", marginBottom: "1.5rem", background: "linear-gradient(160deg,#ffffff 0%,#9090a0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                            Neural<br/>Bill<br/>Analysis
                        </h1>
                        <p style={{ fontSize: "1.05rem", color: "#666672", lineHeight: 1.65, maxWidth: 420, marginBottom: "2.8rem", fontWeight: 400 }}>
                            Decoding insurance complexity through AI. Enterprise-grade black&nbsp;&amp;&nbsp;white architecture that flags overcharges in real-time.
                        </p>
                        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                            <MagneticBtn variant="solid">Upload Bill</MagneticBtn>
                            <MagneticBtn variant="outline">Ask AI</MagneticBtn>
                        </div>
                    </div>
                    <div style={{ animation: "fadeUp 1s 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
                        <AnalysisCard />
                    </div>
                </div>

                {/* STATS */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
                    {[["90%","Bills Contain Errors",0],["$547","Avg Savings / Bill",100],["98%","Detection Accuracy",200],["<2s","Analysis Time",300]].map(([n,l,d]) => (
                        <StatItem key={n} num={n} label={l} delay={d} />
                    ))}
                </div>

                {/* FEATURES */}
                <div ref={featRef} style={{ padding: "7rem 3.5rem", maxWidth: 1400, margin: "0 auto", opacity: featVisible ? 1 : 0, transform: featVisible ? "translateY(0)" : "translateY(30px)", transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.63rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#666672", marginBottom: "1rem" }}>What We Do</div>
                    <h2 style={{ fontSize: "clamp(2rem,3.5vw,3.5rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, color: "#fff", maxWidth: 500, marginBottom: "4rem" }}>
                        Enterprise intelligence built for medical billing
                    </h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, overflow: "hidden" }}>
                        {FEATURES.map(f => <FeatureCard key={f.name} {...f} />)}
                    </div>
                </div>

                {/* FOOTER */}
                <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "2rem 3.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.08em", color: "#666672", textTransform: "uppercase" }}>© 2026 InsurCheck AI — All rights reserved</div>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", animation: "breathe 4s infinite" }}>● Neural Network Active</div>
                </footer>
            </div>
        </>
    );
}