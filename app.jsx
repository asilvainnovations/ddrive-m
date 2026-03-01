import { useState, useEffect, useRef } from "react";

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

const icons = {
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  radar: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 12l9-9",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  alertTriangle: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  check: "M20 6L9 17l-5-5",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  cpu: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  map: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16",
  messageSquare: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  fileText: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  trending: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  database: "M12 2C6.48 2 2 4.69 2 8v8c0 3.31 4.48 6 10 6s10-2.69 10-6V8c0-3.31-4.48-6-10-6zM2 12c0 3.31 4.48 6 10 6s10-2.69 10-6M2 8c0 3.31 4.48 6 10 6s10-2.69 10-6",
  globe: "M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  play: "M5 3l14 9-14 9V3z",
  xCircle: "M12 2a10 10 0 100 20A10 10 0 0012 2zM15 9l-6 6M9 9l6 6",
  checkCircle: "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
  minus: "M5 12h14",
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
  barChart: "M18 20V10M12 20V4M6 20v-6",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  wind: "M9.59 4.59A2 2 0 1111 8H2M17.59 11.59A2 2 0 1119 15H2M14.83 16.83A2 2 0 1116 20H2",
  droplets: "M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z",
  thermometer: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PHASES = [
  { id: 1, label: "Detection", icon: "radar", color: "#00d4ff", desc: "Multi-agency hazard monitoring with PHIVOLCS, PAGASA & NOAH APIs" },
  { id: 2, label: "Diagnosis", icon: "activity", color: "#ff6b35", desc: "ISO 31000-aligned AI risk analysis across strategic, operational & financial domains" },
  { id: 3, label: "Response", icon: "shield", color: "#ff3366", desc: "Structured treatment options with OCD protocol-aligned controls" },
  { id: 4, label: "Integration", icon: "layers", color: "#a855f7", desc: "UNDRR 10 Essentials with customizable DRRM plan templates" },
  { id: 5, label: "Validation", icon: "check", color: "#10b981", desc: "Simulation-based validation with performance scoring & gap analysis" },
  { id: 6, label: "Enhancement", icon: "zap", color: "#f59e0b", desc: "AI-generated DANA, DRRM Plans, Contingency Plans, PSCP & BCP" },
  { id: 7, label: "Monitoring", icon: "eye", color: "#06b6d4", desc: "Real-time collaborative command center with SMS, video & chat" },
];

const HAZARDS = [
  { name: "Typhoon MAWAR", level: "WARNING", intensity: 85, agency: "PAGASA", time: "2m ago", trend: "↑", color: "#ff3366" },
  { name: "Seismic Activity M4.2", level: "WATCH", intensity: 42, agency: "PHIVOLCS", time: "15m ago", trend: "→", color: "#f59e0b" },
  { name: "Flood Risk Zone A", level: "ADVISORY", intensity: 67, agency: "NOAH", time: "1h ago", trend: "↓", color: "#06b6d4" },
  { name: "Landslide Potential", level: "ADVISORY", intensity: 55, agency: "MGB", time: "3h ago", trend: "→", color: "#a855f7" },
];

const RISKS = [
  { category: "Strategic", level: "High", score: 8.2, trend: "up", controls: 12 },
  { category: "Operational", level: "Medium", score: 5.7, trend: "down", controls: 18 },
  { category: "Financial", level: "Medium", score: 4.9, trend: "stable", controls: 9 },
  { category: "Compliance", level: "Low", score: 2.1, trend: "down", controls: 24 },
  { category: "Environmental", level: "High", score: 7.8, trend: "up", controls: 15 },
  { category: "Reputational", level: "Low", score: 1.8, trend: "stable", controls: 6 },
];

const LGUS = [
  { name: "Cabanatuan City", province: "Nueva Ecija", compliance: 94, phase: "Monitoring", status: "active" },
  { name: "Naga City", province: "Camarines Sur", compliance: 98, phase: "Enhancement", status: "active" },
  { name: "Iloilo City", province: "Iloilo", compliance: 87, phase: "Validation", status: "active" },
  { name: "Cagayan de Oro", province: "Misamis Oriental", compliance: 91, phase: "Integration", status: "active" },
  { name: "Legazpi City", province: "Albay", compliance: 76, phase: "Response", status: "warning" },
  { name: "Dagupan City", province: "Pangasinan", compliance: 62, phase: "Diagnosis", status: "alert" },
];

const DOCS = [
  { name: "Damage Assessment (DANA)", desc: "Post-disaster needs assessment report", status: "Ready", phase: "Enhancement" },
  { name: "DRRM Plan 2024-2026", desc: "3-year comprehensive DRRM plan", status: "Draft", phase: "Integration" },
  { name: "Contingency Plan - Typhoon", desc: "Typhoon response contingency plan", status: "Ready", phase: "Enhancement" },
  { name: "PSCP Template", desc: "Pre-disaster Assessment checklist", status: "Draft", phase: "Enhancement" },
  { name: "BCP - Critical Services", desc: "Business Continuity Plan for LGU", status: "Ready", phase: "Enhancement" },
];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function DDRiVE() {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [activePhase, setActivePhase] = useState(null);
  const [alerts, setAlerts] = useState(3);
  const [time, setTime] = useState(new Date());
  const [pulseActive, setPulseActive] = useState(true);
  const [selectedLGU, setSelectedLGU] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { from: "system", text: "DDRiVE-M AI Assistant online. How can I assist your disaster resilience operations?" }
  ]);
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    const msg = chatMsg;
    setChatMsg("");
    setChatHistory(h => [...h, { from: "user", text: msg }]);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are DDRiVE-M AI Assistant, an expert in Philippine disaster risk reduction and management (DRRM), RA 10121, ISO 31000, UNDRR MCR2030, and DILG MC 2020-161. You help LGU officials with disaster preparedness, risk assessment, and DRRM compliance. Be concise, authoritative, and practical.",
          messages: [{ role: "user", content: msg }]
        })
      });
      const data = await res.json();
      const reply = data.content?.map(c => c.text || "").join("\n") || "Processing...";
      setChatHistory(h => [...h, { from: "ai", text: reply }]);
    } catch {
      setChatHistory(h => [...h, { from: "ai", text: "Connecting to AI backend... Please ensure API access is configured." }]);
    }
  };

  const generateDocument = async (docName) => {
    setGenerating(true);
    setGeneratedDoc(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are a Philippine DRRM compliance expert. Generate concise, professional document templates compliant with RA 10121 and relevant DILG standards.",
          messages: [{ role: "user", content: `Generate a brief template outline for: ${docName}. Include key sections and their purpose. Format it professionally.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("\n") || "";
      setGeneratedDoc({ name: docName, content: text });
    } catch {
      setGeneratedDoc({ name: docName, content: "Document generation requires API connectivity. Please check configuration." });
    }
    setGenerating(false);
  };

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "detection", label: "Detection", icon: "radar" },
    { id: "diagnosis", label: "Diagnosis", icon: "activity" },
    { id: "response", label: "Response", icon: "shield" },
    { id: "integration", label: "Integration", icon: "layers" },
    { id: "validation", label: "Validation", icon: "check" },
    { id: "enhancement", label: "Enhancement", icon: "zap" },
    { id: "monitoring", label: "Command Center", icon: "eye" },
    { id: "lgus", label: "LGU Registry", icon: "users" },
  ];

  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      background: "#060a0f",
      color: "#c8d8e8",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1520; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        .scan-line {
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px);
          pointer-events: none;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes scanIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes radarSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes waveBar { 0%,100%{height:4px} 50%{height:20px} }
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:none;opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        .pulse { animation: pulse 2s infinite; }
        .scan-in { animation: scanIn 0.4s ease forwards; }
        .slide-in { animation: slideIn 0.3s ease forwards; }
        .fade-in { animation: fadeIn 0.5s ease forwards; }
        .nav-btn:hover { background: rgba(0,212,255,0.08) !important; color: #00d4ff !important; }
        .nav-btn.active { background: rgba(0,212,255,0.12) !important; color: #00d4ff !important; border-left: 2px solid #00d4ff !important; }
        .card { background: #0d1a26; border: 1px solid #1a3352; border-radius: 4px; transition: all 0.2s; }
        .card:hover { border-color: #00d4ff44; }
        .btn-primary { background: #00d4ff; color: #060a0f; border: none; padding: 8px 20px; font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 1px; cursor: pointer; border-radius: 2px; transition: all 0.2s; text-transform: uppercase; }
        .btn-primary:hover { background: #00b8d9; transform: translateY(-1px); }
        .btn-outline { background: transparent; color: #00d4ff; border: 1px solid #00d4ff44; padding: 7px 16px; font-family: inherit; font-size: 11px; letter-spacing: 1px; cursor: pointer; border-radius: 2px; transition: all 0.2s; text-transform: uppercase; }
        .btn-outline:hover { background: rgba(0,212,255,0.1); border-color: #00d4ff; }
        .phase-btn { background: #0a1520; border: 1px solid #1a3352; border-radius: 3px; padding: 12px; cursor: pointer; transition: all 0.25s; }
        .phase-btn:hover { transform: translateY(-2px); }
        .tag { display: inline-block; padding: 2px 8px; border-radius: 2px; font-size: 10px; letter-spacing: 1px; font-weight: 600; text-transform: uppercase; }
        .input-field { background: #0a1520; border: 1px solid #1a3352; color: #c8d8e8; padding: 8px 12px; font-family: inherit; font-size: 12px; border-radius: 2px; outline: none; transition: border-color 0.2s; }
        .input-field:focus { border-color: #00d4ff44; }
        .progress-bar { background: #0a1520; border-radius: 2px; height: 4px; overflow: hidden; }
        .blink { animation: blink 1s infinite; }
        .radar-sweep { animation: radarSpin 4s linear infinite; transform-origin: center; }
        .gauge-ring { stroke-dasharray: 226; stroke-dashoffset: 226; transition: stroke-dashoffset 1.5s ease; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: "#080e17", borderBottom: "1px solid #1a3352", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#00d4ff,#0066cc)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#fff", fontFamily: "'Orbitron',sans-serif" }}>D</span>
          </div>
          <div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 700, color: "#00d4ff", letterSpacing: 3 }}>DDRiVE-M</div>
            <div style={{ fontSize: 9, color: "#4a7a9b", letterSpacing: 1 }}>AI DISASTER RESILIENCE PLATFORM</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {[
            { label: "RA 10121", active: true },
            { label: "ISO 31000", active: true },
            { label: "UNDRR", active: true },
            { label: "DILG", active: true },
          ].map(b => (
            <span key={b.label} className="tag" style={{ background: "rgba(0,212,255,0.1)", color: "#00d4ff", border: "1px solid #00d4ff33" }}>{b.label}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, color: "#00d4ff" }}>{time.toLocaleTimeString()}</div>
            <div style={{ fontSize: 10, color: "#4a7a9b" }}>Philippines Standard Time</div>
          </div>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setAlerts(0)}>
            <Icon d={icons.bell} size={20} color={alerts > 0 ? "#ff3366" : "#4a7a9b"} />
            {alerts > 0 && <span className="pulse" style={{ position: "absolute", top: -4, right: -4, background: "#ff3366", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{alerts}</span>}
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#1a3352,#0d2040)", border: "1px solid #1a3352", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon d={icons.users} size={14} color="#4a7a9b" />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* SIDEBAR */}
        <div style={{ width: 200, background: "#080e17", borderRight: "1px solid #1a3352", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
          <div style={{ padding: "12px 8px", borderBottom: "1px solid #1a3352" }}>
            <div style={{ fontSize: 9, color: "#2a5a7b", letterSpacing: 2, padding: "4px 8px", marginBottom: 4 }}>NAVIGATION</div>
            {nav.map(n => (
              <button key={n.id} className={`nav-btn ${activeModule === n.id ? "active" : ""}`}
                onClick={() => setActiveModule(n.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "transparent", border: "none", borderLeft: "2px solid transparent", color: "#5a8aab", fontSize: 11, cursor: "pointer", textAlign: "left", letterSpacing: 0.5 }}>
                <Icon d={icons[n.icon]} size={14} color="currentColor" />
                {n.label}
              </button>
            ))}
          </div>
          <div style={{ padding: "12px 8px" }}>
            <div style={{ fontSize: 9, color: "#2a5a7b", letterSpacing: 2, padding: "4px 8px", marginBottom: 8 }}>SYSTEM STATUS</div>
            {[
              { label: "PHIVOLCS API", ok: true },
              { label: "PAGASA Feed", ok: true },
              { label: "NOAH Data", ok: true },
              { label: "SMS Gateway", ok: false },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px" }}>
                <span style={{ fontSize: 10, color: "#4a7a9b" }}>{s.label}</span>
                <span className={!s.ok ? "pulse" : ""} style={{ width: 6, height: 6, borderRadius: "50%", background: s.ok ? "#10b981" : "#f59e0b" }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: "auto", padding: 12, borderTop: "1px solid #1a3352" }}>
            <button className="btn-primary" style={{ width: "100%", fontSize: 10 }}
              onClick={() => setChatOpen(true)}>
              ⚡ AI Assistant
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, overflow: "auto", position: "relative" }} className="scan-line">
          {activeModule === "dashboard" && <Dashboard setActiveModule={setActiveModule} />}
          {activeModule === "detection" && <Detection />}
          {activeModule === "diagnosis" && <Diagnosis />}
          {activeModule === "response" && <Response />}
          {activeModule === "integration" && <Integration />}
          {activeModule === "validation" && <Validation />}
          {activeModule === "enhancement" && <Enhancement generateDocument={generateDocument} generating={generating} generatedDoc={generatedDoc} />}
          {activeModule === "monitoring" && <Monitoring />}
          {activeModule === "lgus" && <LGURegistry />}
        </div>
      </div>

      {/* AI CHAT PANEL */}
      {chatOpen && (
        <div className="slide-in" style={{ position: "fixed", right: 20, bottom: 20, width: 380, height: 520, background: "#0d1a26", border: "1px solid #00d4ff44", borderRadius: 6, display: "flex", flexDirection: "column", zIndex: 1000, boxShadow: "0 0 40px rgba(0,212,255,0.15)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a3352", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#00d4ff", letterSpacing: 1 }}>⚡ DDRiVE-M AI ASSISTANT</div>
              <div style={{ fontSize: 9, color: "#4a7a9b" }}>DRRM EXPERT · RA 10121 COMPLIANT</div>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", color: "#4a7a9b", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {chatHistory.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: 3, fontSize: 11, lineHeight: 1.6,
                  background: m.from === "user" ? "rgba(0,212,255,0.15)" : m.from === "system" ? "rgba(16,185,129,0.1)" : "#0a1520",
                  border: `1px solid ${m.from === "user" ? "#00d4ff33" : m.from === "system" ? "#10b98133" : "#1a3352"}`,
                  color: m.from === "system" ? "#10b981" : "#c8d8e8" }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 16px", borderTop: "1px solid #1a3352", display: "flex", gap: 8 }}>
            <input className="input-field" style={{ flex: 1, fontSize: 11 }}
              placeholder="Ask about DRRM, risk assessment..."
              value={chatMsg} onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()} />
            <button className="btn-primary" onClick={sendChat} style={{ padding: "8px 14px", fontSize: 11 }}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ setActiveModule }) {
  const stats = [
    { label: "Active LGUs", value: "120+", sub: "+8 this month", icon: "users", color: "#00d4ff" },
    { label: "Compliance Rate", value: "98%", sub: "ISO 31000 avg", icon: "check", color: "#10b981" },
    { label: "Active Alerts", value: "3", sub: "2 critical", icon: "alertTriangle", color: "#ff3366" },
    { label: "Risk Score Avg", value: "4.2", sub: "↓ from 5.1", icon: "activity", color: "#f59e0b" },
  ];

  return (
    <div className="fade-in" style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>MISSION CONTROL</div>
        <div style={{ fontSize: 11, color: "#4a7a9b", marginTop: 4 }}>DDRiVE-M Intelligence Resilience Dashboard · Philippine LGU Operations Center</div>
      </div>

      {/* ALERT BANNER */}
      <div style={{ background: "rgba(255,51,102,0.08)", border: "1px solid #ff336633", borderRadius: 4, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <span className="pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3366", flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: "#ff6688" }}>⚠ ACTIVE ALERT: Typhoon MAWAR — Warning Signal No.2 affecting 12 LGUs in Region V. PAGASA update 14 min ago.</span>
        <button className="btn-outline" style={{ marginLeft: "auto", flexShrink: 0, borderColor: "#ff336644", color: "#ff6688" }} onClick={() => setActiveModule("detection")}>VIEW →</button>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 1, marginBottom: 8 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "#4a7a9b", marginTop: 4 }}>{s.sub}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${s.color}15`, border: `1px solid ${s.color}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d={icons[s.icon]} size={16} color={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 7-PHASE GRID */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>7-PHASE INTELLIGENCE RESILIENCE CYCLE</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10 }}>
          {PHASES.map(p => (
            <button key={p.id} className="phase-btn" onClick={() => setActiveModule(p.label.toLowerCase())}
              style={{ border: `1px solid ${p.color}33`, textAlign: "center" }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 900, color: p.color, marginBottom: 6 }}>{p.id}</div>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${p.color}15`, border: `1px solid ${p.color}33`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                <Icon d={icons[p.icon]} size={14} color={p.color} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#c8d8e8", letterSpacing: 0.5 }}>{p.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* HAZARD FEED */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>LIVE HAZARD FEED</div>
          {HAZARDS.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < HAZARDS.length - 1 ? "1px solid #1a3352" : "none" }}>
              <span className={h.level === "WARNING" ? "pulse" : ""} style={{ width: 8, height: 8, borderRadius: "50%", background: h.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#c8d8e8", fontWeight: 600 }}>{h.name}</div>
                <div style={{ fontSize: 9, color: "#4a7a9b", marginTop: 2 }}>{h.agency} · {h.time}</div>
              </div>
              <span className="tag" style={{ background: `${h.color}15`, color: h.color, border: `1px solid ${h.color}33` }}>{h.level}</span>
              <div style={{ width: 50 }}>
                <div style={{ fontSize: 9, color: "#4a7a9b", textAlign: "right", marginBottom: 2 }}>{h.intensity}%</div>
                <div className="progress-bar">
                  <div style={{ width: `${h.intensity}%`, height: "100%", background: h.color, transition: "width 1s" }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* LGU COMPLIANCE */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>LGU COMPLIANCE OVERVIEW</div>
          {LGUS.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < LGUS.length - 1 ? "1px solid #1a3352" : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#c8d8e8" }}>{l.name}</div>
                <div style={{ fontSize: 9, color: "#4a7a9b" }}>{l.province} · {l.phase}</div>
              </div>
              <div style={{ width: 80 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 9, color: "#4a7a9b" }}>Compliance</span>
                  <span style={{ fontSize: 9, color: l.compliance >= 90 ? "#10b981" : l.compliance >= 75 ? "#f59e0b" : "#ff3366", fontWeight: 700 }}>{l.compliance}%</span>
                </div>
                <div className="progress-bar">
                  <div style={{ width: `${l.compliance}%`, height: "100%", background: l.compliance >= 90 ? "#10b981" : l.compliance >= 75 ? "#f59e0b" : "#ff3366" }} />
                </div>
              </div>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.status === "active" ? "#10b981" : l.status === "warning" ? "#f59e0b" : "#ff3366" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DETECTION ────────────────────────────────────────────────────────────────
function Detection() {
  const [wind] = useState(142);
  const [rain] = useState(89);
  const [seismic] = useState(4.2);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAngle(a => (a + 3) % 360), 50);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fade-in" style={{ padding: 24 }}>
      <ModuleHeader title="PHASE 1 — DETECTION" subtitle="Multi-agency real-time hazard monitoring with PHIVOLCS, PAGASA & NOAH APIs" color="#00d4ff" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* RADAR */}
        <div className="card" style={{ padding: 20, gridRow: "span 2" }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 16 }}>METEOROLOGICAL RADAR</div>
          <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto 16px" }}>
            <svg width={200} height={200} style={{ position: "absolute" }}>
              {[1, 2, 3, 4].map(r => (
                <circle key={r} cx={100} cy={100} r={r * 24} fill="none" stroke="#1a3352" strokeWidth="1" />
              ))}
              <line x1="100" y1="4" x2="100" y2="196" stroke="#1a3352" strokeWidth="0.5" />
              <line x1="4" y1="100" x2="196" y2="100" stroke="#1a3352" strokeWidth="0.5" />
              {/* Sweep */}
              <defs>
                <radialGradient id="sweep" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path d={`M100,100 L${100 + 96 * Math.cos((angle - 90) * Math.PI / 180)},${100 + 96 * Math.sin((angle - 90) * Math.PI / 180)} A96,96 0 0,0 ${100 + 96 * Math.cos((angle - 150) * Math.PI / 180)},${100 + 96 * Math.sin((angle - 150) * Math.PI / 180)} Z`}
                fill="url(#sweep)" />
              <line x1="100" y1="100"
                x2={100 + 96 * Math.cos((angle - 90) * Math.PI / 180)}
                y2={100 + 96 * Math.sin((angle - 90) * Math.PI / 180)}
                stroke="#00d4ff" strokeWidth="1.5" />
              {/* Blips */}
              <circle cx={140} cy={70} r={4} fill="#ff3366" opacity="0.9" className="pulse" />
              <circle cx={60} cy={130} r={3} fill="#f59e0b" opacity="0.7" />
              <circle cx={110} cy={150} r={2.5} fill="#10b981" opacity="0.6" />
            </svg>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[{ l: "Wind", v: `${wind}kph`, c: "#ff3366" }, { l: "Rain", v: `${rain}mm`, c: "#00d4ff" }, { l: "Seismic", v: `M${seismic}`, c: "#f59e0b" }].map(m => (
              <div key={m.l} style={{ textAlign: "center", background: "#0a1520", borderRadius: 3, padding: 8 }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 700, color: m.c }}>{m.v}</div>
                <div style={{ fontSize: 9, color: "#4a7a9b", marginTop: 2 }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVE ALERTS */}
        <div className="card" style={{ padding: 16, gridColumn: "span 2" }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>ACTIVE HAZARD ALERTS</div>
          {HAZARDS.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", borderBottom: i < HAZARDS.length - 1 ? "1px solid #1a3352" : "none" }}>
              <div style={{ width: 48, height: 48, borderRadius: 3, background: `${h.color}15`, border: `1px solid ${h.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon d={h.name.includes("Typhoon") ? icons.wind : h.name.includes("Seismic") ? icons.activity : icons.droplets} size={20} color={h.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#c8d8e8" }}>{h.name}</div>
                <div style={{ fontSize: 10, color: "#4a7a9b", marginTop: 2 }}>Source: {h.agency} · Updated {h.time}</div>
                <div className="progress-bar" style={{ marginTop: 6 }}>
                  <div style={{ width: `${h.intensity}%`, height: "100%", background: `linear-gradient(90deg, ${h.color}88, ${h.color})` }} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 700, color: h.color }}>{h.intensity}%</div>
                <span className="tag" style={{ background: `${h.color}15`, color: h.color, border: `1px solid ${h.color}33`, marginTop: 4 }}>{h.level}</span>
              </div>
            </div>
          ))}
        </div>

        {/* AGENCY STATUS */}
        <div className="card" style={{ padding: 16, gridColumn: "span 2" }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>MONITORING AGENCY APIs</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              { name: "PHIVOLCS", type: "Seismic/Volcanic", latency: "234ms", active: true, feeds: 18 },
              { name: "PAGASA", type: "Weather/Typhoon", latency: "189ms", active: true, feeds: 42 },
              { name: "NOAH", type: "Floods/Rainfall", latency: "312ms", active: true, feeds: 127 },
              { name: "MGB", type: "Landslide/Ground", latency: "441ms", active: true, feeds: 34 },
            ].map(a => (
              <div key={a.name} style={{ background: "#0a1520", borderRadius: 3, padding: 12, border: "1px solid #1a3352" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#00d4ff" }}>{a.name}</span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "block" }} />
                </div>
                <div style={{ fontSize: 10, color: "#4a7a9b", marginBottom: 6 }}>{a.type}</div>
                <div style={{ fontSize: 10, color: "#c8d8e8" }}>Feeds: <span style={{ color: "#00d4ff" }}>{a.feeds}</span></div>
                <div style={{ fontSize: 10, color: "#c8d8e8" }}>Latency: <span style={{ color: "#10b981" }}>{a.latency}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DIAGNOSIS ────────────────────────────────────────────────────────────────
function Diagnosis() {
  return (
    <div className="fade-in" style={{ padding: 24 }}>
      <ModuleHeader title="PHASE 2 — DIAGNOSIS" subtitle="ISO 31000-aligned AI risk analysis — strategic, operational, financial, compliance & environmental" color="#ff6b35" />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 16 }}>RISK REGISTER — ISO 31000 FRAMEWORK</div>
          <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "6px 0", borderBottom: "1px solid #1a3352" }}>
            {["Risk Category", "Level", "Score", "Trend", "Controls"].map(h => (
              <div key={h} style={{ fontSize: 9, color: "#4a7a9b", letterSpacing: 1 }}>{h}</div>
            ))}
          </div>
          {RISKS.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "10px 0", borderBottom: "1px solid #0d1520", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: "#c8d8e8", fontWeight: 600 }}>{r.category}</div>
              <span className="tag" style={{
                background: r.level === "High" ? "#ff336615" : r.level === "Medium" ? "#f59e0b15" : "#10b98115",
                color: r.level === "High" ? "#ff3366" : r.level === "Medium" ? "#f59e0b" : "#10b981",
                border: `1px solid ${r.level === "High" ? "#ff336633" : r.level === "Medium" ? "#f59e0b33" : "#10b98133"}`,
              }}>{r.level}</span>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 700, color: r.score >= 7 ? "#ff3366" : r.score >= 4 ? "#f59e0b" : "#10b981" }}>{r.score}</div>
              <div style={{ fontSize: 14, color: r.trend === "up" ? "#ff3366" : r.trend === "down" ? "#10b981" : "#f59e0b" }}>
                {r.trend === "up" ? "↑" : r.trend === "down" ? "↓" : "→"}
              </div>
              <div style={{ fontSize: 11, color: "#00d4ff" }}>{r.controls}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>OVERALL RISK MATRIX</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 3 }}>
              {Array.from({ length: 25 }, (_, i) => {
                const row = Math.floor(i / 5);
                const col = i % 5;
                const risk = (5 - row) * (col + 1);
                const color = risk >= 20 ? "#ff3366" : risk >= 12 ? "#f59e0b" : risk >= 6 ? "#ffdd00" : "#10b981";
                return <div key={i} style={{ height: 28, background: `${color}${Math.floor(0.7 * 255).toString(16)}`, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#000", fontWeight: 700 }}>{risk}</div>;
              })}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {[["#ff3366", "High"], ["#f59e0b", "Med-High"], ["#ffdd00", "Medium"], ["#10b981", "Low"]].map(([c, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, background: c, borderRadius: 1 }} />
                  <span style={{ fontSize: 9, color: "#4a7a9b" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>AI ASSESSMENT</div>
            <div style={{ background: "#0a1520", borderRadius: 3, padding: 12, border: "1px solid #ff6b3533", fontSize: 11, lineHeight: 1.7, color: "#c8d8e8" }}>
              <span style={{ color: "#ff6b35", fontWeight: 700 }}>AI ANALYSIS:</span> Environmental and strategic risk categories show elevated scores (7.8 and 8.2 respectively). Recommend immediate activation of <span style={{ color: "#00d4ff" }}>Phase 3 Response protocols</span> for high-risk categories. Compliance risk remains well-controlled at 2.1.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RESPONSE ─────────────────────────────────────────────────────────────────
function Response() {
  const controls = [
    { type: "Preventive", count: 18, color: "#10b981", items: ["Evacuation pre-positioning", "Early warning SMS", "Stockpile maintenance", "Training drills"] },
    { type: "Detective", count: 12, color: "#00d4ff", items: ["Sensor network monitoring", "Community watchers", "Social media monitoring", "Damage reporting"] },
    { type: "Corrective", count: 9, color: "#f59e0b", items: ["Emergency response teams", "Search and rescue", "Medical surge plans", "Debris clearing"] },
    { type: "Directive", count: 15, color: "#a855f7", items: ["OCD coordination protocol", "Mandatory evacuation orders", "Price freeze declaration", "LDRRMO activation"] },
  ];

  return (
    <div className="fade-in" style={{ padding: 24 }}>
      <ModuleHeader title="PHASE 3 — RESPONSE" subtitle="Risk treatment options with preventive, detective, corrective & directive controls aligned to OCD protocols" color="#ff3366" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        {controls.map(c => (
          <div key={c.type} className="card" style={{ padding: 20, borderLeft: `3px solid ${c.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.color, letterSpacing: 1 }}>{c.type.toUpperCase()} CONTROLS</div>
                <div style={{ fontSize: 10, color: "#4a7a9b", marginTop: 2 }}>OCD Protocol Aligned</div>
              </div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 28, fontWeight: 900, color: `${c.color}66` }}>{c.count}</div>
            </div>
            {c.items.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < c.items.length - 1 ? "1px solid #1a3352" : "none" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${c.color}15`, border: `1px solid ${c.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.color }} />
                </div>
                <span style={{ fontSize: 11, color: "#c8d8e8" }}>{item}</span>
                <button className="btn-outline" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 9, borderColor: `${c.color}33`, color: c.color }}>ACTIVATE</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── INTEGRATION ──────────────────────────────────────────────────────────────
function Integration() {
  const essentials = [
    { no: 1, title: "Organize for DRR", score: 92, status: "Compliant" },
    { no: 2, "title": "Identify, Understand, Use", score: 88, status: "Compliant" },
    { no: 3, "title": "Strengthen Fiscal Capacity", score: 71, status: "In Progress" },
    { no: 4, "title": "Pursue Resilient Urban Development", score: 85, status: "Compliant" },
    { no: 5, "title": "Safeguard Natural Buffers", score: 79, status: "In Progress" },
    { no: 6, "title": "Strengthen Institutional Capacity", score: 94, status: "Compliant" },
    { no: 7, "title": "Understand & Strengthen Capacity", score: 68, status: "In Progress" },
    { no: 8, "title": "Increase Infrastructure Resilience", score: 82, status: "Compliant" },
    { no: 9, "title": "Ensure Effective Response", score: 96, status: "Compliant" },
    { no: 10, "title": "Expedite Recovery", score: 74, status: "In Progress" },
  ];

  return (
    <div className="fade-in" style={{ padding: 24 }}>
      <ModuleHeader title="PHASE 4 — INTEGRATION" subtitle="UNDRR MCR2030 10 Essentials assessment with barangay, municipal & provincial DRRM plan templates" color="#a855f7" />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 16 }}>UNDRR MCR2030 — 10 ESSENTIALS SCORECARD</div>
          {essentials.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < essentials.length - 1 ? "1px solid #1a3352" : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: "#a855f7" }}>{e.no}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#c8d8e8" }}>Essential {e.no}: {e.title}</div>
                <div className="progress-bar" style={{ marginTop: 5 }}>
                  <div style={{ width: `${e.score}%`, height: "100%", background: e.score >= 85 ? "#10b981" : e.score >= 70 ? "#f59e0b" : "#ff3366" }} />
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 70 }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 700, color: e.score >= 85 ? "#10b981" : e.score >= 70 ? "#f59e0b" : "#ff3366" }}>{e.score}%</div>
                <span className="tag" style={{ fontSize: 9, marginTop: 2, background: e.status === "Compliant" ? "#10b98115" : "#f59e0b15", color: e.status === "Compliant" ? "#10b981" : "#f59e0b", border: `1px solid ${e.status === "Compliant" ? "#10b98133" : "#f59e0b33"}` }}>{e.status}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>DRRM PLAN TEMPLATES</div>
          {[
            { name: "Barangay DRRM Plan", level: "Barangay", pages: 24 },
            { name: "Municipal DRRM Plan", level: "Municipal", pages: 68 },
            { name: "Provincial DRRM Plan", level: "Provincial", pages: 112 },
            { name: "City DRRM Plan", level: "City", pages: 89 },
          ].map((t, i) => (
            <div key={i} style={{ background: "#0a1520", borderRadius: 3, padding: 12, marginBottom: 8, border: "1px solid #1a3352", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "#c8d8e8", fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 9, color: "#4a7a9b", marginTop: 2 }}>{t.level} · {t.pages} pages</div>
              </div>
              <button className="btn-outline" style={{ fontSize: 9 }}>USE</button>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: 12, background: "rgba(168,85,247,0.08)", borderRadius: 3, border: "1px solid rgba(168,85,247,0.2)" }}>
            <div style={{ fontSize: 10, color: "#a855f7", fontWeight: 700, marginBottom: 6 }}>OVERALL MCR2030 SCORE</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 32, fontWeight: 900, color: "#a855f7" }}>82.9%</div>
            <div style={{ fontSize: 10, color: "#4a7a9b", marginTop: 4 }}>Above national average of 74.3%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────
function Validation() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);

  const runSim = () => {
    setRunning(true); setProgress(0); setResults(null);
    let p = 0;
    const t = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p >= 100) { p = 100; clearInterval(t); setRunning(false); setResults(true); }
      setProgress(Math.min(p, 100));
    }, 150);
  };

  return (
    <div className="fade-in" style={{ padding: 24 }}>
      <ModuleHeader title="PHASE 5 — VALIDATION" subtitle="Simulation-based validation of risk treatments and emergency operations with performance scoring" color="#10b981" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 16 }}>SIMULATION ENGINE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Scenario", value: "Typhoon Cat.4" },
              { label: "Population", value: "124,500" },
              { label: "Duration", value: "72 hours" },
              { label: "Resources", value: "85% deployed" },
            ].map(p => (
              <div key={p.label} style={{ background: "#0a1520", borderRadius: 3, padding: 10, border: "1px solid #1a3352" }}>
                <div style={{ fontSize: 9, color: "#4a7a9b", marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#00d4ff" }}>{p.value}</div>
              </div>
            ))}
          </div>
          {running && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "#10b981" }}>Running simulation...</span>
                <span style={{ fontSize: 10, color: "#10b981", fontFamily: "'Orbitron',sans-serif" }}>{Math.floor(progress)}%</span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#10b981,#00d4ff)", transition: "width 0.2s" }} />
              </div>
            </div>
          )}
          <button className="btn-primary" onClick={runSim} disabled={running} style={{ width: "100%", opacity: running ? 0.6 : 1 }}>
            {running ? "⟳ SIMULATING..." : "▶ RUN SIMULATION"}
          </button>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 16 }}>PERFORMANCE SCORING</div>
          {results ? (
            <div className="fade-in">
              {[
                { kpi: "Evacuation Speed", score: 87, grade: "A" },
                { kpi: "Resource Allocation", score: 72, grade: "B" },
                { kpi: "Communication", score: 94, grade: "A+" },
                { kpi: "Medical Response", score: 68, grade: "C+" },
                { kpi: "Recovery Timeline", score: 81, grade: "B+" },
              ].map((k, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #1a3352" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#c8d8e8", marginBottom: 4 }}>{k.kpi}</div>
                    <div className="progress-bar">
                      <div style={{ width: `${k.score}%`, height: "100%", background: k.score >= 85 ? "#10b981" : k.score >= 70 ? "#f59e0b" : "#ff3366" }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 900, color: k.score >= 85 ? "#10b981" : k.score >= 70 ? "#f59e0b" : "#ff3366", minWidth: 40 }}>{k.grade}</div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 12, background: "rgba(16,185,129,0.08)", borderRadius: 3, border: "1px solid rgba(16,185,129,0.2)", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#10b981", marginBottom: 4 }}>OVERALL PERFORMANCE</div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 36, fontWeight: 900, color: "#10b981" }}>B+</div>
                <div style={{ fontSize: 10, color: "#4a7a9b" }}>80.4% — Above Threshold</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "#4a7a9b" }}>
              <Icon d={icons.play} size={48} color="#1a3352" />
              <div style={{ marginTop: 12, fontSize: 11 }}>Run a simulation to see results</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ENHANCEMENT ──────────────────────────────────────────────────────────────
function Enhancement({ generateDocument, generating, generatedDoc }) {
  return (
    <div className="fade-in" style={{ padding: 24 }}>
      <ModuleHeader title="PHASE 6 — ENHANCEMENT" subtitle="AI-assisted generation of DANA, DRRM Plans, Contingency Plans, PSCP & BCP — RA 10121 compliant" color="#f59e0b" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 16 }}>AI DOCUMENT GENERATOR</div>
          {DOCS.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < DOCS.length - 1 ? "1px solid #1a3352" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 3, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon d={icons.fileText} size={16} color="#f59e0b" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#c8d8e8" }}>{d.name}</div>
                <div style={{ fontSize: 10, color: "#4a7a9b", marginTop: 2 }}>{d.desc}</div>
              </div>
              <span className="tag" style={{ background: d.status === "Ready" ? "#10b98115" : "#f59e0b15", color: d.status === "Ready" ? "#10b981" : "#f59e0b", border: `1px solid ${d.status === "Ready" ? "#10b98133" : "#f59e0b33"}` }}>{d.status}</span>
              <button className="btn-primary" style={{ fontSize: 9, padding: "6px 12px" }} onClick={() => generateDocument(d.name)} disabled={generating}>
                {generating && generatedDoc === null ? "⟳" : "⚡ AI GEN"}
              </button>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>GENERATED DOCUMENT PREVIEW</div>
          {generating && !generatedDoc && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300 }}>
              <div style={{ width: 48, height: 48, border: "3px solid #f59e0b33", borderTop: "3px solid #f59e0b", borderRadius: "50%", animation: "radarSpin 1s linear infinite", marginBottom: 16 }} />
              <div style={{ fontSize: 11, color: "#4a7a9b" }}>AI generating document...</div>
            </div>
          )}
          {generatedDoc && (
            <div className="fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{generatedDoc.name}</div>
                <button className="btn-outline" style={{ fontSize: 9 }}><Icon d={icons.download} size={10} color="currentColor" /> EXPORT</button>
              </div>
              <div style={{ background: "#0a1520", borderRadius: 3, padding: 14, border: "1px solid #1a3352", maxHeight: 380, overflowY: "auto", fontSize: 11, lineHeight: 1.8, color: "#c8d8e8", whiteSpace: "pre-wrap" }}>
                {generatedDoc.content}
              </div>
            </div>
          )}
          {!generating && !generatedDoc && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, color: "#4a7a9b" }}>
              <Icon d={icons.fileText} size={48} color="#1a3352" />
              <div style={{ marginTop: 12, fontSize: 11 }}>Click ⚡ AI GEN to generate a document</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MONITORING ───────────────────────────────────────────────────────────────
function Monitoring() {
  const [msgs, setMsgs] = useState([
    { from: "OCD-NCR", text: "Typhoon MAWAR - Coordination call in 30 min", time: "14:23" },
    { from: "LDRRMO-Cabanatuan", text: "Pre-emptive evacuation of 234 families complete", time: "14:18" },
    { from: "RDRRMC-V", text: "Signal #2 now includes Camarines Norte", time: "14:05" },
    { from: "DILG Region V", text: "Requesting DRRM Fund utilization report", time: "13:55" },
  ]);

  const [newMsg, setNewMsg] = useState("");

  const sendMsg = () => {
    if (!newMsg.trim()) return;
    setMsgs(m => [{ from: "You", text: newMsg, time: new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }) }, ...m]);
    setNewMsg("");
  };

  return (
    <div className="fade-in" style={{ padding: 24 }}>
      <ModuleHeader title="PHASE 7 — MONITORING" subtitle="Real-time collaborative command center — video conferencing, SMS alerts, chat & document sharing" color="#06b6d4" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* COMMAND CHAT */}
        <div className="card" style={{ padding: 16, gridRow: "span 2" }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>COMMAND CHAT</div>
          <div style={{ height: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ background: "#0a1520", borderRadius: 3, padding: 10, border: "1px solid #1a3352" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#06b6d4" }}>{m.from}</span>
                  <span style={{ fontSize: 9, color: "#4a7a9b" }}>{m.time}</span>
                </div>
                <div style={{ fontSize: 11, color: "#c8d8e8", lineHeight: 1.5 }}>{m.text}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input className="input-field" style={{ flex: 1, fontSize: 11 }}
              placeholder="Send command message..."
              value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMsg()} />
            <button className="btn-primary" onClick={sendMsg} style={{ padding: "8px 12px" }}>→</button>
          </div>
        </div>

        {/* VIDEO CONF */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>VIDEO CONFERENCING</div>
          <div style={{ background: "#050d14", borderRadius: 3, height: 120, border: "1px solid #1a3352", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, position: "relative" }}>
            <div style={{ textAlign: "center", color: "#4a7a9b" }}>
              <Icon d={icons.users} size={32} color="#1a3352" />
              <div style={{ fontSize: 11, marginTop: 8 }}>No active conference</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="btn-primary" style={{ fontSize: 10 }}>START CALL</button>
            <button className="btn-outline" style={{ fontSize: 10 }}>SCHEDULE</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: "#4a7a9b", marginBottom: 8 }}>PARTICIPANTS (6)</div>
            {["OCD-NCR", "LDRRMO Cabanatuan", "RDRRMC-V", "DILG Region V", "PHIVOLCS", "PAGASA"].map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: i < 3 ? "#10b981" : "#4a7a9b" }} />
                <span style={{ fontSize: 10, color: i < 3 ? "#c8d8e8" : "#4a7a9b" }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SMS */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>SMS MASS ALERT</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "#4a7a9b", marginBottom: 6 }}>COVERAGE AREA</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Barangay 1", "Barangay 2", "Poblacion", "San Roque"].map(b => (
                <span key={b} className="tag" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.3)" }}>{b}</span>
              ))}
            </div>
          </div>
          <textarea className="input-field" style={{ width: "100%", height: 70, resize: "none", fontSize: 11 }}
            defaultValue="BABALA: Typhoon Signal #2. Mangyaring lumikas na sa mga ligtas na lugar. -LDRRMO" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontSize: 10, color: "#4a7a9b" }}>Recipients: 34,512</span>
            <button className="btn-primary" style={{ fontSize: 10 }}>SEND ALERT</button>
          </div>
          <div style={{ marginTop: 12, background: "rgba(16,185,129,0.06)", borderRadius: 3, padding: 10, border: "1px solid rgba(16,185,129,0.2)" }}>
            <div style={{ fontSize: 10, color: "#10b981", marginBottom: 4 }}>LAST SENT · 14:05</div>
            <div style={{ fontSize: 10, color: "#4a7a9b" }}>Delivered: 31,204/34,512 (90.4%)</div>
          </div>
        </div>

        {/* DOCUMENT SHARING */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: "#4a7a9b", letterSpacing: 2, marginBottom: 12 }}>SHARED DOCUMENTS</div>
          {[
            { name: "MAWAR Sitrep #3", type: "PDF", shared: "14:20" },
            { name: "Evacuation Map Zone A", type: "PNG", shared: "13:40" },
            { name: "DRRM Fund Status", type: "XLSX", shared: "12:15" },
          ].map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 2 ? "1px solid #1a3352" : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 2, background: "#0a1520", border: "1px solid #1a3352", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#06b6d4" }}>{d.type}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#c8d8e8" }}>{d.name}</div>
                <div style={{ fontSize: 9, color: "#4a7a9b" }}>{d.shared}</div>
              </div>
              <button className="btn-outline" style={{ fontSize: 9, padding: "4px 8px" }}>↓</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LGU REGISTRY ─────────────────────────────────────────────────────────────
function LGURegistry() {
  const [filter, setFilter] = useState("");
  const filtered = LGUS.filter(l => l.name.toLowerCase().includes(filter.toLowerCase()) || l.province.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="fade-in" style={{ padding: 24 }}>
      <ModuleHeader title="LGU REGISTRY" subtitle="Philippine Local Government Unit DRRM compliance tracking — 120+ active LGUs" color="#00d4ff" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <input className="input-field" style={{ width: 280 }} placeholder="Search LGU or province..." value={filter} onChange={e => setFilter(e.target.value)} />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-outline">↓ EXPORT</button>
          <button className="btn-primary">+ ADD LGU</button>
        </div>
      </div>
      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 1fr 1fr", padding: "10px 20px", borderBottom: "1px solid #1a3352", gap: 12 }}>
          {["LGU Name", "Province", "Status", "Current Phase", "Compliance", "Actions"].map(h => (
            <div key={h} style={{ fontSize: 9, color: "#4a7a9b", letterSpacing: 1 }}>{h}</div>
          ))}
        </div>
        {filtered.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 1fr 1fr", padding: "14px 20px", borderBottom: "1px solid #0d1520", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#c8d8e8" }}>{l.name}</div>
            <div style={{ fontSize: 11, color: "#4a7a9b" }}>{l.province}</div>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.status === "active" ? "#10b981" : l.status === "warning" ? "#f59e0b" : "#ff3366", display: "block" }} />
            <span className="tag" style={{ background: "rgba(0,212,255,0.08)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.2)" }}>{l.phase}</span>
            <div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 700, color: l.compliance >= 90 ? "#10b981" : l.compliance >= 75 ? "#f59e0b" : "#ff3366" }}>{l.compliance}%</div>
              <div className="progress-bar" style={{ marginTop: 4 }}>
                <div style={{ width: `${l.compliance}%`, height: "100%", background: l.compliance >= 90 ? "#10b981" : l.compliance >= 75 ? "#f59e0b" : "#ff3366" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-outline" style={{ fontSize: 9, padding: "4px 8px" }}>VIEW</button>
              <button className="btn-outline" style={{ fontSize: 9, padding: "4px 8px" }}>EDIT</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {[
          { label: "Total LGUs Onboarded", value: "120+", color: "#00d4ff" },
          { label: "Average Compliance", value: "84.6%", color: "#10b981" },
          { label: "Pending Assessments", value: "14", color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#4a7a9b", marginTop: 6, letterSpacing: 1 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MODULE HEADER ────────────────────────────────────────────────────────────
function ModuleHeader({ title, subtitle, color }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 4, height: 32, background: color, borderRadius: 2 }} />
        <div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>{title}</div>
          <div style={{ fontSize: 11, color: "#4a7a9b", marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
