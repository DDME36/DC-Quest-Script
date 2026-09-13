/**
 *
 *  ZENTYR Quest Engine v3.6 (Tri-Engine Edition 2026)
 *  Discord Quest Auto-Completer & Activity Spoofer
 *
 *  Features:
 *  - Tri-Engine: Safe (1 by 1), Balanced (2-3 tasks, optimal), Turbo (all concurrent)
 *  - Interactive Mode Switcher in Glassmorphism Floating UI
 *  - Dynamic Discord Client Theme Matcher (Light, Dark, Midnight, Darker)
 *  - Robust Heuristic Webpack Scraper (Resilient to Discord minified name updates)
 *  - Optimized Traffic Queue & Concurrency Controller
 *  - Secure Stealth Memory Runtime
 */

(async () => {
  "use strict";

  // ─── 1. TRI-ENGINE MODES & SYSTEM CONFIG ───
  const MODES = {
    SAFE: {
      key: "SAFE",
      label: "SAFE",
      nameTh: "โหมดปลอดภัย",
      badgeClass: "mode-safe",
      gameConcurrency: 1,
      videoConcurrency: 1,
      videoSpeed: 2.5,
      videoMaxFuture: 5,
      requestDelay: 3200,
      heartbeatStagger: 6500,
      desc: "ทำทีละ 1 เควสต์ · ความเร็วสมจริง · เซฟบัญชีสูงสุด"
    },
    BALANCED: {
      key: "BALANCED",
      label: "BALANCED",
      nameTh: "โหมดสมดุล",
      badgeClass: "mode-balanced",
      gameConcurrency: 2,
      videoConcurrency: 2,
      videoSpeed: 5.0,
      videoMaxFuture: 8,
      requestDelay: 2200,
      heartbeatStagger: 4500,
      desc: "ทำ 2 เควสต์พร้อมกัน · ความเร็วเหมาะสม · แนะนำทั่วไป"
    },
    TURBO: {
      key: "TURBO",
      label: "TURBO",
      nameTh: "โหมดเต็มพิกัด",
      badgeClass: "mode-turbo",
      gameConcurrency: 99,
      videoConcurrency: 5,
      videoSpeed: 8.0,
      videoMaxFuture: 12,
      requestDelay: 1200,
      heartbeatStagger: 2000,
      desc: "ทำทุกเควสต์พร้อมกัน · เร่งความเร็วสูงสุด · จบไวทันใจ"
    }
  };

  const CONFIG = {
    NAME: "ZENTYR",
    VERSION: "v3.6",
    RUNNING: true,
    MAX_TASK_TIME: 25 * 60 * 1000,
    MAX_RETRIES: 3,
    MAX_RATE_LIMIT_RETRIES: 8,
    GAME_CONCURRENCY: 2,
    VIDEO_CONCURRENCY: 2,
    REQUEST_DELAY: 2200,
    REMOVE_DELAY: 3500,
    HEARTBEAT_STAGGER: 4500,
    VIDEO_SPEED: 5.0,
    VIDEO_MAX_FUTURE: 8,
    
    // UI Theme Palette
    THEMES: {
      dark: {
        bg: "rgba(10, 10, 16, 0.65)",
        cardBg: "rgba(22, 22, 37, 0.45)",
        cardBorder: "rgba(255, 255, 255, 0.05)",
        textPrimary: "#f8fafc",
        textSecondary: "#94a3b8",
        logBg: "rgba(8, 8, 12, 0.6)",
        logText: "#64748b",
        glow: "rgba(167, 139, 250, 0.15)"
      },
      light: {
        bg: "rgba(245, 245, 250, 0.75)",
        cardBg: "rgba(255, 255, 255, 0.65)",
        cardBorder: "rgba(0, 0, 0, 0.06)",
        textPrimary: "#0f172a",
        textSecondary: "#475569",
        logBg: "rgba(240, 240, 245, 0.8)",
        logText: "#475569",
        glow: "rgba(167, 139, 250, 0.08)"
      }
    }
  };

  if (window.__zentyrLock) {
    const ui = document.getElementById("zentyr-root");
    if (ui) {
      ui.style.display = "flex";
      ui.style.animation = "pIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
    }
    return console.warn(`[${CONFIG.NAME}] Quest Engine is already active.`);
  }
  window.__zentyrLock = true;
  
  const _activeCleanups = new Set();
  const isApp = typeof DiscordNative !== "undefined";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  // ─── 2. STUNNING SVG ICONS ───
  const I = {
    SHIELD: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    SLIDERS: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
    BOLT: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    PLAY: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
    GAME: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01M15 10h.01M15 14h.01M6 12h4M8 10v4"/></svg>`,
    STREAM: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    ACTIVITY: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M4 12h4M16 12h4"/></svg>`,
    CHECK: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    CLOCK: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    STOP: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`,
    WARN: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>`,
    MINIMIZE: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  };

  // ─── 3. LOCAL STORAGE WIDGET COORDINATES ───
  const Store = {
    set(k, v) { try { localStorage.setItem(`zentyr_${k}`, JSON.stringify(v)); } catch {} },
    get(k) { try { const v = localStorage.getItem(`zentyr_${k}`); return v ? JSON.parse(v) : null; } catch { return null; } },
  };

  // ─── 4. TRI-ENGINE STATE CONTROLLER ───
  let currentModeKey = Store.get("mode");
  if (!MODES[currentModeKey]) currentModeKey = "BALANCED";

  function applyMode(modeKey) {
    if (!MODES[modeKey]) modeKey = "BALANCED";
    currentModeKey = modeKey;
    Store.set("mode", modeKey);
    const m = MODES[modeKey];
    CONFIG.GAME_CONCURRENCY = m.gameConcurrency;
    CONFIG.VIDEO_CONCURRENCY = m.videoConcurrency;
    CONFIG.VIDEO_SPEED = m.videoSpeed;
    CONFIG.VIDEO_MAX_FUTURE = m.videoMaxFuture;
    CONFIG.REQUEST_DELAY = m.requestDelay;
    CONFIG.HEARTBEAT_STAGGER = m.heartbeatStagger;
  }
  applyMode(currentModeKey);



  // ─── 5. GLASSMORPHISM UI ENGINE ───
  const UI = {
    el: null,
    tasks: new Map(),
    collapsed: false,
    themeObserver: null,

    init() {
      document.getElementById("zentyr-root")?.remove();
      document.getElementById("zentyr-style")?.remove();
      const pos = Store.get("pos") || { top: "24px", right: "24px", left: "auto" };

      const css = document.createElement("style");
      css.id = "zentyr-style";
      css.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

        @keyframes pIn { from{transform:translateY(-18px) scale(0.97);opacity:0;} to{transform:translateY(0) scale(1);opacity:1;} }
        @keyframes pOut { 0%{opacity:1;max-height:120px;} 100%{opacity:0;max-height:0;margin:0;padding:0;} }
        @keyframes pPulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
        @keyframes pGlow { 0%,100%{background-position:0% 50%;} 50%{background-position:100% 50%;} }
        @keyframes pLogoSpin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }

        :root {
          --zentyr-bg: ${CONFIG.THEMES.dark.bg};
          --zentyr-card-bg: ${CONFIG.THEMES.dark.cardBg};
          --zentyr-card-border: ${CONFIG.THEMES.dark.cardBorder};
          --zentyr-text-primary: ${CONFIG.THEMES.dark.textPrimary};
          --zentyr-text-secondary: ${CONFIG.THEMES.dark.textSecondary};
          --zentyr-log-bg: ${CONFIG.THEMES.dark.logBg};
          --zentyr-log-text: ${CONFIG.THEMES.dark.logText};
          --zentyr-glow: ${CONFIG.THEMES.dark.glow};
          
          --zentyr-accent: linear-gradient(135deg, #a78bfa, #c084fc, #f472b6);
          --zentyr-ok: #34d399;
          --zentyr-warn: #fbbf24;
          --zentyr-err: #f87171;
        }

        #zentyr-root {
          position:fixed; top:${pos.top}; left:${pos.left}; right:${pos.right};
          width:375px; background:var(--zentyr-bg); color:var(--zentyr-text-primary);
          border-radius:22px; font-family:'Geist','Inter',system-ui,sans-serif;
          z-index:99999; border:1px solid var(--zentyr-card-border);
          box-shadow: 0 32px 64px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.25), 0 0 40px var(--zentyr-glow);
          overflow:hidden; animation:pIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          display:flex; flex-direction:column;
          backdrop-filter: blur(24px) saturate(160%);
          transition: background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease, color 0.4s ease;
        }

        #zentyr-head {
          padding:16px 18px; background:rgba(0,0,0,0.18);
          display:flex; justify-content:space-between; align-items:center;
          border-bottom:1px solid var(--zentyr-card-border); cursor:grab; user-select:none;
        }
        #zentyr-head:active { cursor:grabbing; }

        .zentyr-brand { display:flex; align-items:center; gap:12px; }
        
        .zentyr-logo-container {
          position:relative; width:34px; height:34px; border-radius:11px;
          padding:1px; background:var(--zentyr-accent); background-size:200% 200%;
          animation:pGlow 4s ease infinite;
        }
        .zentyr-logo {
          width:100%; height:100%; border-radius:10px; background:#0f0f15;
          display:flex; align-items:center; justify-content:center;
          font-weight:900; font-size:14px; color:#fff; letter-spacing:1px;
          text-shadow: 0 0 8px rgba(167,139,250,0.6);
        }
        #zentyr-head:hover .zentyr-logo-container { animation: pLogoSpin 2s linear infinite; }

        .zentyr-title-wrap { display:flex; flex-direction:column; }
        .zentyr-title {
          font-weight:800; font-size:16px; letter-spacing:1.8px; color:var(--zentyr-text-primary);
          background: var(--zentyr-accent); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .zentyr-sub {
          font-size:10px; color:var(--zentyr-text-secondary); font-weight:600;
          letter-spacing:0.5px; opacity:0.8;
        }
        
        .zentyr-env {
          font-size:8px; padding:3px 8px; border-radius:8px; font-weight:800;
          letter-spacing:0.8px; text-transform:uppercase;
        }
        .zentyr-env-app { background:rgba(52,211,153,0.12); color:var(--zentyr-ok); }
        .zentyr-env-web { background:rgba(251,191,36,0.12); color:var(--zentyr-warn); }

        .zentyr-ctrl { display:flex; gap:8px; align-items:center; }
        #zentyr-mode-bar {
          padding:8px 12px; background:rgba(0,0,0,0.2);
          border-bottom:1px solid var(--zentyr-card-border);
          display:flex; gap:6px; transition:max-height 0.3s ease, padding 0.3s ease;
        }
        #zentyr-mode-bar.collapsed { max-height:0; padding:0 12px; overflow:hidden; border-bottom:none; }

        .zentyr-seg-btn {
          flex:1; display:flex; align-items:center; justify-content:center; gap:5px;
          padding:6px 4px; border-radius:9px; font-size:9.5px; font-weight:700;
          letter-spacing:0.7px; text-transform:uppercase; font-family:'JetBrains Mono',monospace;
          color:var(--zentyr-text-secondary); background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.05); cursor:pointer;
          transition:all 0.22s cubic-bezier(0.4, 0, 0.2, 1); user-select:none; outline:none;
        }
        .zentyr-seg-btn:hover {
          background:rgba(255,255,255,0.08); color:var(--zentyr-text-primary);
          border-color:rgba(255,255,255,0.12);
        }
        .zentyr-seg-btn.active.mode-safe {
          color:#34d399; background:rgba(52,211,153,0.12);
          border-color:rgba(52,211,153,0.35); box-shadow:0 0 12px rgba(52,211,153,0.2);
        }
        .zentyr-seg-btn.active.mode-balanced {
          color:#38bdf8; background:rgba(56,189,248,0.12);
          border-color:rgba(56,189,248,0.35); box-shadow:0 0 12px rgba(56,189,248,0.2);
        }
        .zentyr-seg-btn.active.mode-turbo {
          color:#f472b6; background:rgba(244,114,182,0.12);
          border-color:rgba(244,114,182,0.35); box-shadow:0 0 12px rgba(244,114,182,0.2);
        }
        .zentyr-seg-icon { display:flex; align-items:center; }
        .zentyr-btn {
          cursor:pointer; opacity:0.6; transition:all 0.25s cubic-bezier(0.4, 0, 0.2, 1); display:flex;
          align-items:center; justify-content:center; border-radius:9px;
          width:30px; height:30px; border:1px solid transparent;
        }
        .zentyr-btn:hover { opacity:1; background:rgba(255,255,255,0.06); border-color:var(--zentyr-card-border); }
        
        .zentyr-btn-stop {
          opacity:0.85; color:var(--zentyr-err);
          font-size:10px; font-weight:800; gap:5px; padding:0 12px; width:auto;
          letter-spacing:0.5px; border-radius:10px; background:rgba(248,113,113,0.08);
          border:1px solid rgba(248,113,113,0.15);
        }
        .zentyr-btn-stop:hover { background:rgba(248,113,113,0.15); opacity:1; box-shadow:0 0 10px rgba(248,113,113,0.25); }

        #zentyr-body {
          padding:12px 14px; max-height:240px; overflow-y:auto; flex-grow:1;
          display:flex; flex-direction:column; gap:8px;
          transition:max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #zentyr-body.collapsed { max-height:0; padding:0 14px; overflow:hidden; }
        #zentyr-body::-webkit-scrollbar { width:5px; }
        #zentyr-body::-webkit-scrollbar-thumb { background:var(--zentyr-card-border); border-radius:4px; }
        #zentyr-body::-webkit-scrollbar-thumb:hover { background:rgba(167,139,250,0.5); }

        .zentyr-empty {
          text-align:center; padding:36px; color:var(--zentyr-text-secondary);
          font-size:13px; font-weight:500; letter-spacing:0.5px; opacity:0.75;
        }

        .zentyr-card {
          display:flex; flex-direction:column; gap:10px; padding:12px 16px;
          background:var(--zentyr-card-bg); border-radius:16px;
          border:1px solid var(--zentyr-card-border);
          transition:all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); position:relative; overflow:hidden;
          flex-shrink:0;
        }
        .zentyr-card:hover { 
          background:rgba(255,255,255,0.02); 
          border-color:rgba(167,139,250,0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.15);
        }
        .zentyr-card::before {
          content:''; position:absolute; left:0; top:0; bottom:0; width:4px;
          background:linear-gradient(to bottom, #a78bfa, #f472b6); border-radius:4px 0 0 4px;
        }
        .zentyr-card.s-done::before { background:var(--zentyr-ok); }
        .zentyr-card.s-done { border-color:rgba(52,211,153,0.25); }
        .zentyr-card.s-queue { opacity:0.55; }
        .zentyr-card.s-queue::before { background:#64748b; }
        .zentyr-card.s-warn::before { background:var(--zentyr-warn); }
        .zentyr-card.s-warn { border-color:rgba(251,191,36,0.25); }
        .zentyr-card.s-claiming::before { background:var(--zentyr-warn); animation:pPulse 1.2s ease infinite; }
        .zentyr-card.s-rm { animation:pOut 0.4s ease forwards; }

        .p-meta { display:flex; gap:14px; align-items:center; width:100%; }

        .p-ico {
          min-width:40px; height:40px; border-radius:12px;
          display:flex; align-items:center; justify-content:center;
          background:rgba(0,0,0,0.25); color:#a78bfa;
          border:1px solid var(--zentyr-card-border);
          transition: all 0.3s ease;
        }
        .zentyr-card.s-done .p-ico { color:var(--zentyr-ok); border-color:rgba(52,211,153,0.3); background:rgba(52,211,153,0.05); }
        .zentyr-card.s-queue .p-ico { color:#64748b; border-color:transparent; }
        .zentyr-card.s-warn .p-ico { color:var(--zentyr-warn); border-color:rgba(251,191,36,0.3); background:rgba(251,191,36,0.05); }

        .p-body { flex:1; min-width:0; }
        .p-row1 { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
        
        .p-name {
          font-size:13.5px; font-weight:700; color:var(--zentyr-text-primary);
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;
        }
        
        .p-badge {
          font-size:8px; font-weight:800; padding:2px 8px; border-radius:6px;
          letter-spacing:0.8px; display:flex; align-items:center; gap:4px;
        }
        .p-b-live {
          background:rgba(167,139,250,0.12); color:#c084fc;
        }
        .p-b-live::before {
          content:''; width:5px; height:5px; border-radius:50%;
          background:#c084fc; animation:pPulse 1.5s ease infinite;
        }
        .p-b-done { background:rgba(52,211,153,0.12); color:var(--zentyr-ok); }
        .p-b-queue { background:rgba(100,116,139,0.15); color:#64748b; }
        .p-b-warn { background:rgba(251,191,36,0.12); color:var(--zentyr-warn); }

        .p-row2 {
          display:flex; justify-content:space-between; align-items:center;
          font-size:11px; color:var(--zentyr-text-secondary); margin-bottom:8px; font-weight:600;
        }
        
        .p-pct { 
          font-weight:700; font-size:11px; color:#a78bfa; 
          font-family:'JetBrains Mono',monospace; 
        }
        .zentyr-card.s-done .p-pct { color:var(--zentyr-ok); }

        .p-track {
          height:4px; background:rgba(255,255,255,0.06); border-radius:4px;
          overflow:hidden;
        }
        .p-fill {
          height:100%; border-radius:4px; transition:width 0.4s cubic-bezier(0.1, 0.8, 0.2, 1);
          background:linear-gradient(90deg, #a78bfa, #f472b6);
          box-shadow: 0 0 8px rgba(167, 139, 250, 0.4);
        }
        .zentyr-card.s-done .p-fill { background:var(--zentyr-ok); box-shadow: none; }

        #zentyr-log {
          padding:10px 16px; background:var(--zentyr-log-bg); max-height:110px;
          overflow-y:auto; border-top:1px solid var(--zentyr-card-border);
          font-family:'JetBrains Mono','Consolas',monospace;
          font-size:10px; color:var(--zentyr-log-text); scroll-behavior:smooth;
          transition:max-height 0.3s ease, background 0.3s ease;
        }
        #zentyr-log.collapsed { max-height:0; padding:0 16px; overflow:hidden; }
        #zentyr-log::-webkit-scrollbar { width:3px; }
        #zentyr-log::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:3px; }

        .p-log {
          margin-bottom:2px; display:flex; gap:10px; line-height:1.6;
          padding:2px 0;
        }
        .p-ts { opacity:0.45; min-width:50px; font-size:9.5px; }
        .p-l-info { color:#a78bfa; }
        .p-l-ok { color:var(--zentyr-ok); }
        .p-l-warn { color:var(--zentyr-warn); }
        .p-l-err { color:var(--zentyr-err); }
        .p-l-dim { color:#475569; }

        #zentyr-foot {
          padding:8px; text-align:center; font-size:8px; letter-spacing:2px;
          color:#475569; font-weight:700;
          background:rgba(0,0,0,0.22); border-top:1px solid var(--zentyr-card-border);
        }
      `;
      document.head.appendChild(css);

      this.el = document.createElement("div");
      this.el.id = "zentyr-root";
      const envTag = isApp
        ? `<span class="zentyr-env zentyr-env-app">APP</span>`
        : `<span class="zentyr-env zentyr-env-web">WEB</span>`;

      this.el.innerHTML = `
        <div id="zentyr-head">
          <div class="zentyr-brand">
            <div class="zentyr-logo-container">
              <div class="zentyr-logo">Z</div>
            </div>
            <div class="zentyr-title-wrap">
              <div class="zentyr-title">${CONFIG.NAME}</div>
              <div class="zentyr-sub">${CONFIG.VERSION} · Tri-Engine</div>
            </div>
            ${envTag}
          </div>
          <div class="zentyr-ctrl">
            <div class="zentyr-btn zentyr-btn-stop" id="zentyr-stop">${I.STOP} STOP</div>
            <div class="zentyr-btn" id="zentyr-min" title="Minimize">${I.MINIMIZE}</div>
          </div>
        </div>
        <div id="zentyr-mode-bar">
          <button class="zentyr-seg-btn ${currentModeKey === 'SAFE' ? 'active mode-safe' : ''}" data-mode="SAFE">
            <span class="zentyr-seg-icon">${I.SHIELD}</span>
            <span>Safe</span>
          </button>
          <button class="zentyr-seg-btn ${currentModeKey === 'BALANCED' ? 'active mode-balanced' : ''}" data-mode="BALANCED">
            <span class="zentyr-seg-icon">${I.SLIDERS}</span>
            <span>Balanced</span>
          </button>
          <button class="zentyr-seg-btn ${currentModeKey === 'TURBO' ? 'active mode-turbo' : ''}" data-mode="TURBO">
            <span class="zentyr-seg-icon">${I.BOLT}</span>
            <span>Turbo</span>
          </button>
        </div>
        <div id="zentyr-body"><div class="zentyr-empty">Booting Engine...</div></div>
        <div id="zentyr-log"></div>
        <div id="zentyr-foot">ZENTYR TECHNOLOGY · EST 2026</div>
      `;
      document.body.appendChild(this.el);

      // ── Drag & Drop ──
      const head = document.getElementById("zentyr-head");
      let drag = false, sx, sy, ix, iy;
      head.onmousedown = (e) => {
        if (e.target.closest(".zentyr-btn")) return;
        drag = true; sx = e.clientX; sy = e.clientY;
        const r = this.el.getBoundingClientRect();
        ix = r.left; iy = r.top;
        this.el.style.right = "auto";
        e.preventDefault();
      };
      const onMouseMove = (e) => {
        if (!drag) return;
        const rect = this.el.getBoundingClientRect();
        const nx = Math.max(0, Math.min(window.innerWidth - rect.width, ix + (e.clientX - sx)));
        const ny = Math.max(0, Math.min(window.innerHeight - rect.height, iy + (e.clientY - sy)));
        this.el.style.left = `${nx}px`;
        this.el.style.top = `${ny}px`;
      };
      const onMouseUp = () => {
        if (drag) {
          drag = false;
          Store.set("pos", { top: this.el.style.top, left: this.el.style.left, right: "auto" });
        }
      };

      document.getElementById("zentyr-min").onclick = () => this.toggleCollapse();
      document.getElementById("zentyr-stop").onclick = () => this.shutdown();

      const modeButtons = document.querySelectorAll(".zentyr-seg-btn");
      modeButtons.forEach((btn) => {
        btn.onclick = () => {
          const targetMode = btn.getAttribute("data-mode");
          if (!MODES[targetMode] || targetMode === currentModeKey) return;
          applyMode(targetMode);
          modeButtons.forEach((b) => {
            b.classList.remove("active", "mode-safe", "mode-balanced", "mode-turbo");
          });
          btn.classList.add("active", MODES[targetMode].badgeClass);
          UI.log(`[MODE] Switched to ${MODES[targetMode].label} (${MODES[targetMode].nameTh}): ${MODES[targetMode].desc}`, targetMode === "TURBO" ? "warn" : "ok");
        };
      });
      
      const onKeyDown = (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
        if (e.key === ">" || (e.shiftKey && e.key === ".")) {
          this.el.style.display = this.el.style.display === "none" ? "flex" : "none";
        }
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("keydown", onKeyDown);
      const removeDocumentHandlers = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("keydown", onKeyDown);
        _activeCleanups.delete(removeDocumentHandlers);
      };
      _activeCleanups.add(removeDocumentHandlers);

      // ── Dynamic Theme Switching Observer ──
      this.themeObserver = new MutationObserver(() => this.syncTheme());
      this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      this.syncTheme();
    },

    syncTheme() {
      const isLight = document.body.classList.contains("theme-light") || document.documentElement.classList.contains("theme-light");
      const root = document.getElementById("zentyr-root");
      if (!root) return;

      const theme = isLight ? CONFIG.THEMES.light : CONFIG.THEMES.dark;
      root.style.setProperty("--zentyr-bg", theme.bg);
      root.style.setProperty("--zentyr-card-bg", theme.cardBg);
      root.style.setProperty("--zentyr-card-border", theme.cardBorder);
      root.style.setProperty("--zentyr-text-primary", theme.textPrimary);
      root.style.setProperty("--zentyr-text-secondary", theme.textSecondary);
      root.style.setProperty("--zentyr-log-bg", theme.logBg);
      root.style.setProperty("--zentyr-log-text", theme.logText);
      root.style.setProperty("--zentyr-glow", theme.glow);
    },

    toggleCollapse() {
      this.collapsed = !this.collapsed;
      document.getElementById("zentyr-mode-bar")?.classList.toggle("collapsed", this.collapsed);
      document.getElementById("zentyr-body")?.classList.toggle("collapsed", this.collapsed);
      document.getElementById("zentyr-log")?.classList.toggle("collapsed", this.collapsed);
    },

    shutdown() {
      if (!CONFIG.RUNNING) return;
      CONFIG.RUNNING = false;
      window.__zentyrStatus = { state: "stopped", version: CONFIG.VERSION };
      this.log("Shutting down engine...", "warn");
      Traffic.stop(new Error("ZENTYR engine stopped by user"));
      _activeCleanups.forEach(fn => { try { fn(); } catch {} });
      _activeCleanups.clear();
      if (this.themeObserver) {
        try { this.themeObserver.disconnect(); } catch {}
      }
      Patcher.clean();
      setTimeout(() => { 
        this.el?.remove(); 
        document.getElementById("zentyr-style")?.remove(); 
        window.__zentyrLock = false; 
      }, 800);
    },

    setTask(id, data) {
      this.tasks.set(id, data);
      this.render();
    },

    removeTask(id) {
      const t = this.tasks.get(id);
      if (t) { 
        t._removing = true; 
        this.render(); 
        setTimeout(() => { this.tasks.delete(id); this.render(); }, 400); 
      }
    },

    log(msg, type = "info") {
      const colors = { info: "#a78bfa", ok: "#34d399", warn: "#fbbf24", err: "#f87171", dim: "#475569" };
      console.log(`%c[ZENTYR] %c${msg}`, `color:#a78bfa;font-weight:bold`, `color:${colors[type] || colors.info}`);
      const box = document.getElementById("zentyr-log");
      if (!box) return;
      const el = document.createElement("div");
      el.className = `p-log p-l-${type}`;
      const timestamp = document.createElement("span");
      timestamp.className = "p-ts";
      timestamp.textContent = new Date().toLocaleTimeString().split(" ")[0];
      const message = document.createElement("span");
      message.textContent = String(msg);
      el.append(timestamp, message);
      box.appendChild(el);
      box.scrollTop = box.scrollHeight;
      while (box.children.length > 50) box.firstChild.remove();
    },

    render() {
      const body = document.getElementById("zentyr-body");
      if (!body) return;
      if (!this.tasks.size) {
        body.innerHTML = `<div class="zentyr-empty">Waiting for quests...</div>`;
        return;
      }

      let cardsHtml = "";
      const sorted = [...this.tasks.entries()].sort((a, b) => {
        const order = (t) => 
          ["claimed", "claimed_no_code"].includes(t.status) ? 4 
          : t.status === "done" ? 3 
          : t.status === "warn" || t.status === "claim_failed" ? 2 
          : t.status === "queue" ? 1 : 0;
        return order(a[1]) - order(b[1]);
      });

      const isLight = document.body.classList.contains("theme-light") || document.documentElement.classList.contains("theme-light");

      for (const [id, t] of sorted) {
        const pct = t.max > 0 ? Math.min(100, (t.cur / t.max) * 100).toFixed(1) : 0;
        let icon = I.BOLT, badge = "", sc = "";

        if (t.status === "done") {
          icon = I.CHECK; badge = `<span class="p-badge p-b-done">DONE</span>`; sc = "s-done";
        } else if (t.status === "claiming") {
          icon = I.CLOCK; badge = `<span class="p-badge p-b-warn">claiming...</span>`; sc = "s-claiming";
        } else if (t.status === "claimed" || t.status === "claimed_no_code") {
          icon = I.CHECK; badge = `<span class="p-badge p-b-done">CLAIMED</span>`; sc = "s-done";
        } else if (t.status === "captcha") {
          icon = I.WARN; badge = `<span class="p-badge p-b-warn">captcha</span>`; sc = "s-warn";
        } else if (t.status === "claim_failed") {
          icon = I.WARN; badge = `<span class="p-badge p-b-warn">fail</span>`; sc = "s-warn";
        } else if (t.status === "warn") {
          icon = I.WARN; badge = `<span class="p-badge p-b-warn">skipped</span>`; sc = "s-warn";
        } else if (t.status === "queue") {
          icon = I.CLOCK; badge = `<span class="p-badge p-b-queue">queue</span>`; sc = "s-queue";
        } else {
          badge = `<span class="p-badge p-b-live">live</span>`;
          if (t.type === "VIDEO") icon = I.PLAY;
          else if (t.type === "GAME") icon = I.GAME;
          else if (t.type === "STREAM") icon = I.STREAM;
          else if (t.type === "ACTIVITY") icon = I.ACTIVITY;
        }

        const eta = t.status === "run" && t.cur > 0
          ? `~${fmt(Math.ceil(t.max - t.cur))}`
          : `${Math.floor(t.cur)}/${t.max}s`;
        const safeName = escapeHtml(t.name);
        const safeType = escapeHtml(t.type || "");
        const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, "");

        let contentHtml = `
          <div class="p-meta">
            <div class="p-ico">${icon}</div>
            <div class="p-body">
              <div class="p-row1">
                <div class="p-name" title="${safeName}">${safeName}</div>
                ${badge}
              </div>
              <div class="p-row2">
                <span>${safeType}</span>
                <span class="p-pct">${pct > 0 ? Math.floor(pct) + '%' : eta}</span>
              </div>
              <div class="p-track"><div class="p-fill" style="width:${pct}%"></div></div>
            </div>
          </div>
        `;

        if (t.status === "claimed" && t.code) {
          const safeCode = escapeHtml(t.code);
          contentHtml += `
            <div style="margin-top:10px; display:flex; gap:8px; width:100%; animation: pIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
              <input type="text" readonly value="${safeCode}" style="flex:1; background:${isLight ? '#e2e8f0' : '#09090b'}; border:1px solid var(--zentyr-card-border); color:#34d399; font-family:'JetBrains Mono',monospace; font-size:11px; padding:6px 10px; border-radius:8px; outline:none;" onclick="this.select()">
              <button data-zentyr-copy style="background:linear-gradient(135deg, #34d399, #059669); color:#fff; border:none; padding:6px 14px; border-radius:8px; font-size:10px; cursor:pointer; font-weight:800; transition:all 0.25s;">COPY</button>
            </div>
          `;
        } else if (t.status === "claimed_no_code") {
          contentHtml += `
            <div style="margin-top:8px; font-size:11px; color:var(--zentyr-ok); font-weight:600; animation: pIn 0.3s ease-out; display:flex; align-items:center; gap:6px;">
              <span>สิทธิ์ถูกบันทึกแล้ว ตรวจสอบและรับโค้ดได้ใน Gift Inventory บน Discord</span>
            </div>
          `;
        } else if (t.status === "captcha") {
          contentHtml += `
            <div style="margin-top:10px; display:flex; flex-direction:column; gap:8px; width:100%; animation: pIn 0.3s ease-out;">
              <span style="font-size:10.5px; color:var(--zentyr-warn); font-weight:700;">ระบบต้องการการยืนยันตัวตน (CAPTCHA) เพื่อดำเนินการต่อ:</span>
              <div id="zentyr-captcha-${safeId}" style="min-height:80px; display:flex; justify-content:center; background:rgba(0,0,0,0.15); border-radius:10px; padding:8px; border:1px dashed var(--zentyr-card-border);"></div>
            </div>
          `;
        } else if (t.status === "claim_failed") {
          contentHtml += `
            <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px; font-size:10px; color:var(--zentyr-err); animation: pIn 0.3s ease-out;">
              <span>ไม่สามารถรับรางวัลได้: ${escapeHtml(t.errMsg || "ข้อผิดพลาดที่ไม่รู้จัก")}</span>
              <button style="align-self:flex-start; background:rgba(248,113,113,0.1); color:var(--zentyr-err); border:1px solid rgba(248,113,113,0.25); padding:4px 10px; border-radius:8px; cursor:pointer; font-size:9px; font-weight:700; transition: all 0.2s;" onclick="window.open('https://discord.com/blog/discord-quests-guide', '_blank', 'noopener,noreferrer')">เปิดหน้าต่างเควสเพื่อเคลมเอง</button>
            </div>
          `;
        }

        cardsHtml += `
          <div class="zentyr-card ${sc} ${t._removing ? 's-rm' : ''}">
            ${contentHtml}
          </div>`;
      }
      body.innerHTML = cardsHtml;
      body.querySelectorAll("[data-zentyr-copy]").forEach((button) => {
        button.onclick = () => this.copyText(button);
      });
    },

    async copyText(button) {
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = "…";
      try {
        const input = button.previousElementSibling;
        if (!input || !navigator.clipboard?.writeText) {
          throw new Error("Clipboard unavailable");
        }
        await navigator.clipboard.writeText(input.value);
        button.textContent = "COPIED";
        button.title = "Copied";
      } catch {
        button.textContent = "COPY";
        button.title = "Copy failed. Select the text and copy manually.";
        this.log("คัดลอกไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกเอง", "warn");
      } finally {
        button.disabled = false;
      }
    },
  };

  // ─── 6. INTERACTIVE TRAFFIC QUEUE (ANTI-RATE LIMIT) ───
  const Traffic = {
    q: [], busy: false, stopped: false,
    async send(url, body, retries = 0) {
      if (!CONFIG.RUNNING || this.stopped) throw new Error("Engine stopped");
      return new Promise((ok, fail) => { this.q.push({ url, body, ok, fail, retries, rateLimitRetries: 0 }); this.run(); });
    },
    stop(reason = new Error("Traffic queue stopped")) {
      this.stopped = true;
      const pending = this.q.splice(0);
      pending.forEach((request) => request.fail(reason));
    },
    async run() {
      if (this.busy || !this.q.length) return;
      this.busy = true;
      while (this.q.length) {
        if (!CONFIG.RUNNING || this.stopped) {
          this.stop(new Error("Engine stopped before queued request completed"));
          this.busy = false;
          return;
        }
        const r = this.q.shift();
        try {
          r.ok(await Mods.API.post({ url: r.url, body: r.body }));
        } catch (e) {
          const status = Number(e?.status);
          if ([400, 401, 403, 404].includes(status)) {
            UI.log(`API rejected request (${status}) — not retrying`, "err");
            r.fail(e);
          } else if (status === 429 && r.rateLimitRetries < CONFIG.MAX_RATE_LIMIT_RETRIES) {
            r.rateLimitRetries++;
            const retryAfter = Number(e.body?.retry_after);
            const wait = Math.min(60000, Math.max(1000, (Number.isFinite(retryAfter) ? retryAfter : 6) * 1000));
            UI.log(`[RATE-LIMIT] Cooldown active — Waiting ${(wait/1000).toFixed(1)}s`, "warn");
            this.q.unshift(r);
            await sleep(wait + 1000);
          } else if (r.retries < CONFIG.MAX_RETRIES) {
            UI.log(`[RETRY] API call failed, retrying ${r.retries + 1}/${CONFIG.MAX_RETRIES}`, "dim");
            r.retries++;
            this.q.unshift(r);
            await sleep(2200);
          } else {
            r.fail(e);
          }
        }
        await sleep(CONFIG.REQUEST_DELAY + rnd(-600, 1000));
      }
      this.busy = false;
    },
  };

  // ─── 7. INTERFACES & DYNAMIC DISCORD WRAPPER ───
  const EVT = { HB: "QUESTS_SEND_HEARTBEAT_SUCCESS", GAME: "RUNNING_GAMES_CHANGE", RPC: "LOCAL_ACTIVITY_UPDATE" };
  let Mods = {};

  function loadModules() {
    try {
      const wp = webpackChunkdiscord_app.push([[Symbol()], {}, (r) => r]);
      webpackChunkdiscord_app.pop();

      const find = (fn) => Object.values(wp.c).find((m) => { try { return fn(m?.exports); } catch { return false; } })?.exports;
      const pick = (fns) => { for (const f of fns) { try { const r = f(); if (r) return r; } catch {} } return null; };

      Mods = {
        StreamStore: pick([
          () => find(e => e?.A?.__proto__?.getStreamerActiveStreamMetadata)?.A,
          () => find(e => e?.Z?.__proto__?.getStreamerActiveStreamMetadata)?.Z,
          () => find(e => e?.default?.__proto__?.getStreamerActiveStreamMetadata)?.default,
        ]),
        RunStore: pick([
          () => find(e => e?.Ay?.getRunningGames)?.Ay,
          () => find(e => e?.ZP?.getRunningGames)?.ZP,
          () => find(e => e?.default?.getRunningGames)?.default,
        ]),
        QuestStore: pick([
          () => find(e => e?.A?.__proto__?.getQuest)?.A,
          () => find(e => e?.Z?.__proto__?.getQuest)?.Z,
          () => find(e => e?.default?.__proto__?.getQuest)?.default,
        ]),
        ChanStore: pick([
          () => find(e => e?.A?.__proto__?.getAllThreadsForParent)?.A,
          () => find(e => e?.Z?.__proto__?.getAllThreadsForParent)?.Z,
          () => find(e => e?.default?.__proto__?.getAllThreadsForParent)?.default,
        ]),
        GuildChanStore: pick([
          () => find(e => e?.Ay?.getSFWDefaultChannel)?.Ay,
          () => find(e => e?.ZP?.getSFWDefaultChannel)?.ZP,
          () => find(e => e?.default?.getSFWDefaultChannel)?.default,
        ]),
        VoiceStateStore: pick([
          () => find(e => e?.A?.getVoiceStateForUser || e?.A?.getVoiceStatesForUser)?.A,
          () => find(e => e?.Z?.getVoiceStateForUser || e?.Z?.getVoiceStatesForUser)?.Z,
          () => find(e => e?.default?.getVoiceStateForUser || e?.default?.getVoiceStatesForUser)?.default,
        ]),
        UserStore: pick([
          () => find(e => e?.A?.getCurrentUser)?.A,
          () => find(e => e?.Z?.getCurrentUser)?.Z,
          () => find(e => e?.default?.getCurrentUser)?.default,
          () => find(e => e?.A?.__proto__?.getCurrentUser)?.A,
          () => find(e => e?.Z?.__proto__?.getCurrentUser)?.Z,
          () => find(e => e?.default?.__proto__?.getCurrentUser)?.default,
        ]),
        Dispatcher: pick([
          () => find(e => e?.h?.__proto__?.flushWaitQueue)?.h,
          () => find(e => e?.Z?.__proto__?.flushWaitQueue)?.Z,
          () => find(e => e?.default?.__proto__?.flushWaitQueue)?.default,
        ]),
        API: pick([
          () => find(e => e?.Bo?.get)?.Bo,
          () => find(e => e?.tn?.get)?.tn,
          () => find(e => e?.default?.get && e?.default?.post)?.default,
          () => {
            const mod = find(e => Object.keys(e || {}).some(k => e[k]?.get && e[k]?.post && e[k]?.patch));
            if (mod) { const k = Object.keys(mod).find(k => mod[k]?.get && mod[k]?.post); return mod[k]; }
          },
        ]),
      };

      const status = Object.entries(Mods).map(([k, v]) => `${k}:${v ? "OK" : "NO"}`).join(" ");
      UI.log(`Modules ${status}`, Mods.QuestStore && Mods.API ? "ok" : "err");

      if (!Mods.QuestStore || !Mods.API || !Mods.Dispatcher) throw "Core modules missing";
      Patcher.init(Mods.RunStore);
      return true;
    } catch (e) {
      UI.log(`Module load failed: ${e}`, "err");
      return false;
    }
  }



  // ─── 8. RUNTIME ACTIVITY PATCHER ───
  const Patcher = {
    games: [], origGet: null, origPID: null, on: false,
    init(store) {
      if (!store) return;
      this.origGet = store.getRunningGames;
      this.origPID = store.getGameForPID;
    },
    patch() {
      if (!Mods.RunStore || this.on) return;
      Mods.RunStore.getRunningGames = () => [...this.origGet.call(Mods.RunStore), ...this.games];
      Mods.RunStore.getGameForPID = (pid) => this.games.find(g => g.pid === pid) || this.origPID.call(Mods.RunStore, pid);
      this.on = true;
    },
    unpatch() {
      if (!this.on) return;
      Mods.RunStore.getRunningGames = this.origGet;
      Mods.RunStore.getGameForPID = this.origPID;
      this.on = false;
    },
    add(g) {
      this.games.push(g);
      this.patch();
      Mods.Dispatcher.dispatch({ type: EVT.GAME, added: [g], removed: [], games: Mods.RunStore.getRunningGames() });
    },
    remove(g) {
      this.games = this.games.filter(x => x.pid !== g.pid);
      Mods.Dispatcher.dispatch({ type: EVT.GAME, added: [], removed: [g], games: Mods.RunStore.getRunningGames() });
      if (!this.games.length) this.unpatch();
    },
    clean() { this.games = []; this.unpatch(); },
  };

  // ─── 9. QUESTER MODULE (TASK ENGINE) ───
  const Quester = {
    clean(n) { return String(n || "DiscordQuest").replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, " "); },

    async getAppInfo(id, name) {
      try {
        const r = await Mods.API.get({ url: `/applications/public?application_ids=${id}` });
        const a = r.body[0];
        const exe = a?.executables?.find(x => x.os === "win32")?.name?.replace(">", "") || `${this.clean(name).replace(/\s+/g, "")}.exe`;
        const cn = this.clean(a?.name || name);
        return { name: a?.name || name, icon: a?.icon, exe, cmd: `C:\\Program Files\\${cn}\\${exe}`, path: `c:/program files/${cn.toLowerCase()}/${exe}`, id };
      } catch {
        const cn = this.clean(name);
        const exe = `${cn.replace(/\s+/g, "")}.exe`;
        return { name, exe, cmd: `C:\\Program Files\\${cn}\\${exe}`, path: `c:/program files/${cn.toLowerCase()}/${exe}`, id };
      }
    },

    // ── VIDEO SPOOFING ──
    async doVideo(quest, task, userStatus) {
      let cur = userStatus.progress?.[task.taskKey]?.value ?? 0;
      const t0 = new Date(userStatus.enrolledAt).getTime();
      UI.setTask(quest.id, { name: task.name, type: "VIDEO", cur, max: task.target, status: "run" });

      const started = Date.now();
      let done = false;

      while (cur < task.target && CONFIG.RUNNING) {
        const maxOk = Math.floor((Date.now() - t0) / 1000) + CONFIG.VIDEO_MAX_FUTURE;
        const speed = CONFIG.VIDEO_SPEED + rnd(-1, 2);
        const next = cur + speed;

        if (maxOk - cur >= speed) {
          try {
            const r = await Traffic.send(`/quests/${quest.id}/video-progress`, {
              timestamp: Math.min(task.target, next + (Math.random() * 3 - 1.5)),
            });
            done = r.body.completed_at != null;
            cur = Math.min(task.target, next);
            if (done) break;
          } catch {}
        }

        if (next >= task.target) break;
        UI.setTask(quest.id, { name: task.name, type: "VIDEO", cur, max: task.target, status: "run" });
        if (Date.now() - started > CONFIG.MAX_TASK_TIME) { UI.log(`[TIMEOUT] Video limit exceeded: ${task.name}`, "err"); break; }
        await sleep(1000 + rnd(200, 800));
      }

      if (!done && CONFIG.RUNNING) {
        try {
          const result = await Traffic.send(`/quests/${quest.id}/video-progress`, { timestamp: task.target });
          done = result?.body?.completed_at != null || result?.body?.completedAt != null;
        } catch (error) {
          UI.log(`Video completion could not be confirmed: ${error?.message || error}`, "warn");
        }
      }
      if (CONFIG.RUNNING && done) {
        this.complete(quest, task);
      } else if (CONFIG.RUNNING) {
        UI.setTask(quest.id, { name: task.name, type: "VIDEO", cur, max: task.target, status: "warn" });
        UI.log(`Video progress was sent but completion was not confirmed: ${task.name}`, "warn");
      }
    },

    // ── GAME SPOOFING ──
    async doGame(quest, task, userStatus) {
      if (!isApp) {
        UI.log(`[DESKTOP-ONLY] Task requires desktop client: ${task.name}`, "warn");
        UI.setTask(quest.id, { name: task.name, type: "GAME", cur: 0, max: task.target, status: "warn" });
        return;
      }
      return this.doDesktop(quest, task, "GAME", task.taskKey, userStatus);
    },

    // ── STREAM SPOOFING ──
    async doStream(quest, task, userStatus) {
      if (!isApp) {
        UI.log(`[DESKTOP-ONLY] Task requires desktop client: ${task.name}`, "warn");
        UI.setTask(quest.id, { name: task.name, type: "STREAM", cur: 0, max: task.target, status: "warn" });
        return;
      }
      return this.doDesktop(quest, task, "STREAM", task.taskKey, userStatus);
    },

    // ── DESKTOP SPOOF MANAGER ──
    async doDesktop(quest, task, type, key, userStatus) {
      if (!CONFIG.RUNNING) return;
      const streamReady = typeof Mods.StreamStore?.getStreamerActiveStreamMetadata === "function";
      const gameReady = typeof Mods.RunStore?.getRunningGames === "function" && typeof Mods.RunStore?.getGameForPID === "function";
      if ((type === "STREAM" && !streamReady) || (type !== "STREAM" && !gameReady)) {
        UI.log(`${type} modules are unavailable in this Discord build: ${task.name}`, "warn");
        UI.setTask(quest.id, { name: task.name, type, cur: 0, max: task.target, status: "warn" });
        return;
      }
      const app = await this.getAppInfo(task.appId, task.name);
      const pid = rnd(12000, 52000);

      const game = {
        id: app.id, name: app.name, icon: app.icon,
        pid, pidPath: [pid], processName: app.name,
        start: Date.now(), exeName: app.exe, exePath: app.path, cmdLine: app.cmd,
        executables: [{ os: "win32", name: app.exe, is_launcher: false }],
        windowHandle: 0, fullscreenType: 0, overlay: true, sandboxed: false,
        hidden: false, isLauncher: false,
      };

      let cleanup;
      if (type === "STREAM") {
        const orig = Mods.StreamStore.getStreamerActiveStreamMetadata;
        Mods.StreamStore.getStreamerActiveStreamMetadata = () => ({ id: app.id, pid, sourceName: app.name });
        cleanup = () => { Mods.StreamStore.getStreamerActiveStreamMetadata = orig; };
      } else {
        Patcher.add(game);
        cleanup = () => Patcher.remove(game);
      }

      UI.setTask(quest.id, { name: task.name, type, cur: 0, max: task.target, status: "run" });
      UI.log(`[VIRTUAL-PID] Process mapped: ${app.name} [PID:${pid}]`, "dim");

      return new Promise((resolve) => {
        let staleCount = 0;
        let lastProg = -1;

        const timer = setTimeout(() => {
          UI.log(`[TIMEOUT] Process spoof timeout: ${task.name}`, "err");
          done(); resolve();
        }, CONFIG.MAX_TASK_TIME);

        const onHB = (d) => {
          if (!CONFIG.RUNNING) { done(); resolve(); return; }
          if (d.questId !== quest.id) return;

          let prog = quest.config.configVersion === 1 
            ? (d.userStatus.streamProgressSeconds ?? 0)
            : (d.userStatus.progress?.[key]?.value ?? 0);

          if (prog !== lastProg) {
            lastProg = prog;
            staleCount = 0;
          } else {
            staleCount++;
          }

          UI.setTask(quest.id, { name: task.name, type, cur: prog, max: task.target, status: "run" });

          if (prog >= task.target) {
            done();
            this.complete(quest, task);
            resolve();
          }
        };

        let _resolved = false;
        const done = () => {
          if (_resolved) return; _resolved = true;
          clearTimeout(timer); 
          cleanup(); 
          Mods.Dispatcher.unsubscribe(EVT.HB, onHB); 
          _activeCleanups.delete(done);
        };
        _activeCleanups.add(done);
        Mods.Dispatcher.subscribe(EVT.HB, onHB);
      });
    },

    // ── DISCORD ACTIVITY SPOOFING ──
    async doActivity(quest, task) {
      const currentUserId = Mods.UserStore?.getCurrentUser?.()?.id;
      const directVoiceState = currentUserId ? Mods.VoiceStateStore?.getVoiceStateForUser?.(currentUserId) : null;
      const voiceStates = currentUserId ? Mods.VoiceStateStore?.getVoiceStatesForUser?.(currentUserId) : null;
      const voiceState = directVoiceState ?? Object.values(voiceStates || {})[0];
      const chan = voiceState?.channelId ?? voiceState?.channel_id;
      
      if (!chan) {
        UI.setTask(quest.id, { name: task.name, type: "ACTIVITY", cur: 0, max: task.target, status: "warn" });
        return UI.log(`[VOICE-REQUIRED] Join an active voice channel to proceed: ${task.name}`, "err");
      }

      const sKey = `call:${chan}:${rnd(1000, 9999)}`;
      let cur = 0;
      UI.setTask(quest.id, { name: task.name, type: "ACTIVITY", cur, max: task.target, status: "run" });

      const t0 = Date.now();
      while (cur < task.target && CONFIG.RUNNING) {
        try {
          const r = await Traffic.send(`/quests/${quest.id}/heartbeat`, { stream_key: sKey, terminal: false });
          cur = r.body.progress?.[task.taskKey]?.value ?? cur + 20;
          UI.setTask(quest.id, { name: task.name, type: "ACTIVITY", cur, max: task.target, status: "run" });
          if (cur >= task.target) {
            await Traffic.send(`/quests/${quest.id}/heartbeat`, { stream_key: sKey, terminal: true });
            break;
          }
        } catch (error) {
          const status = Number(error?.status) || "unknown";
          const hint = status === 403 ? "Join a voice channel and confirm this quest is eligible for your account." : "Check the Discord quest status and try again.";
          UI.setTask(quest.id, { name: task.name, type: "ACTIVITY", cur, max: task.target, status: "warn" });
          UI.log(`Activity heartbeat rejected (${status}): ${hint}`, "err");
          return;
        }
        if (Date.now() - t0 > CONFIG.MAX_TASK_TIME) { UI.log(`[TIMEOUT] Activity limit exceeded`, "err"); break; }
        await sleep(20000 + rnd(-2000, 4000));
      }
      if (CONFIG.RUNNING && cur >= task.target) this.complete(quest, task);
    },

    complete(quest, task) {
      UI.setTask(quest.id, { name: task.name, type: task.type, cur: task.target, max: task.target, status: "done" });
      UI.log(`[COMPLETE] Quest completed: ${task.name} (กดรับรางวัลใน Gift Inventory)`, "ok");
      try { if (Notification.permission === "granted") new Notification(`ZENTYR: Quest Finished!`, { body: task.name }); } catch {}
    },

    // ── REWARD CLAIM PIPELINE (DISABLED) ──
    // Auto-claiming has been disabled. Quests can be claimed manually in Discord Settings -> Gift Inventory.
  };

  // ─── 10. POOL CONCURRENCY CONTROLLER ───
  async function runPool(tasks, limit) {
    const running = [];
    const remove = (promise) => {
      const index = running.indexOf(promise);
      if (index >= 0) running.splice(index, 1);
    };
    for (const fn of tasks) {
      if (!CONFIG.RUNNING) break;
      let p;
      p = Promise.resolve()
        .then(fn)
        .catch((error) => UI.log(`Task failed: ${error?.message || error}`, "err"))
        .finally(() => remove(p));
      running.push(p);
      await sleep(CONFIG.HEARTBEAT_STAGGER + rnd(-1000, 1500));
      if (running.length >= limit) await Promise.race(running);
    }
    await Promise.all(running);
  }

  // ─── 11. ENTRY SYSTEM MAIN ───
  const TASK_KEYS = ["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY"];

  function selectTaskKey(keys) {
    const exact = TASK_KEYS.find((key) => keys.includes(key));
    if (exact) return exact;
    const patterns = [/VIDEO/i, /STREAM/i, /ACTIVITY/i, /PLAY|GAME|DESKTOP/i];
    for (const pattern of patterns) {
      const match = keys.find((key) => pattern.test(key));
      if (match) return match;
    }
    return null;
  }

  function getTaskType(taskKey) {
    if (/VIDEO/i.test(taskKey || "")) return "VIDEO";
    if (/STREAM/i.test(taskKey || "")) return "STREAM";
    if (/ACTIVITY/i.test(taskKey || "")) return "ACTIVITY";
    return "GAME";
  }

  function extractApplicationId(candidate) {
    if (["string", "number"].includes(typeof candidate) && String(candidate).trim()) return String(candidate);
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const found = extractApplicationId(item);
        if (found) return found;
      }
      return null;
    }
    if (!candidate || typeof candidate !== "object") return null;
    const direct = candidate.id ?? candidate.applicationId ?? candidate.application_id ?? candidate.appId ?? candidate.app_id;
    return ["string", "number"].includes(typeof direct) && String(direct).trim() ? String(direct) : null;
  }

  function scanApplicationId(value, depth = 0, seen = new Set(), path = "") {
    if (!value || typeof value !== "object" || depth > 6 || seen.has(value)) return null;
    seen.add(value);
    for (const [key, candidate] of Object.entries(value)) {
      const normalized = key.replace(/_/g, "").toLowerCase();
      const nextPath = path ? `${path}.${normalized}` : normalized;
      if (normalized.includes("application") || normalized === "appid" || normalized === "appids") {
        const found = extractApplicationId(candidate);
        if (found) return found;
      }
      if (normalized === "id" && /(application|applications|gameapp)/i.test(path)) {
        const found = extractApplicationId(candidate);
        if (found) return found;
      }
      const nested = scanApplicationId(candidate, depth + 1, seen, nextPath);
      if (nested) return nested;
    }
    return null;
  }

  function resolveApplicationId(quest, cfg, taskKey) {
    const task = cfg?.tasks?.[taskKey];
    const directCandidates = [
      task?.application, task?.applications, task?.applicationId, task?.application_id, task?.applicationIds, task?.application_ids,
      cfg?.application, cfg?.applications, cfg?.applicationId, cfg?.application_id, cfg?.applicationIds, cfg?.application_ids,
      quest?.config?.application, quest?.config?.applications,
      quest?.config?.applicationId, quest?.config?.application_id, quest?.config?.applicationIds, quest?.config?.application_ids,
      quest?.application, quest?.applications, quest?.applicationId, quest?.application_id,
    ];
    for (const candidate of directCandidates) {
      const found = extractApplicationId(candidate);
      if (found) return found;
    }
    return scanApplicationId(task) || scanApplicationId(cfg) || scanApplicationId(quest?.config);
  }

  async function main() {
    UI.init();
    window.__zentyrStatus = { state: "loading", version: CONFIG.VERSION };
    UI.log(`${isApp ? "[CLIENT] Discord Desktop App" : "[CLIENT] Discord Web"} Hooked Successfully`, isApp ? "ok" : "warn");
    UI.log(`[PROFILE] Engine Mode: ${MODES[currentModeKey].label} (${MODES[currentModeKey].nameTh}) — ${MODES[currentModeKey].desc}`, "ok");
    if (!isApp) UI.log("[NOTE] Browser client detected — maintain tab focus to prevent throttling.", "warn");

    if (!loadModules()) {
      window.__zentyrStatus = { state: "error", version: CONFIG.VERSION, message: "Core modules missing" };
      return UI.log("Hooking rejected — Please relaunch or reload Discord", "err");
    }
    window.__zentyrStatus = { state: "ready", version: CONFIG.VERSION };

    let cycle = 1;
    while (CONFIG.RUNNING) {
      UI.log(`-- Processing Cycle ${cycle} --`, "info");

      const getQ = () => Mods.QuestStore.quests instanceof Map ? [...Mods.QuestStore.quests.values()] : Object.values(Mods.QuestStore.quests);
      let quests = getQ();
      const now = Date.now();

      // ── Auto Enroll Active Quests ──
      const toEnroll = quests.filter(q => !q.userStatus?.completedAt && new Date(q.config.expiresAt).getTime() > now && !q.userStatus?.enrolledAt);
      if (toEnroll.length) {
        UI.log(`[ENROLL] Registering ${toEnroll.length} eligible quests...`, "warn");
        for (const q of toEnroll) {
          if (!CONFIG.RUNNING) break;
          try { 
            await Traffic.send(`/quests/${q.id}/enroll`, { location: 1 }); 
            UI.log(`  [ENROLLED] ${q.config.messages.questName}`, "ok"); 
          } catch {}
        }
        await sleep(2000);
        quests = getQ();
      }

      // ── Show Completed but Unclaimed Quests in UI ──
      const completedUnclaimed = quests.filter(q =>
        q.userStatus?.completedAt &&
        !q.userStatus?.claimedAt &&
        new Date(q.config.expiresAt).getTime() > now
      );

      for (const q of completedUnclaimed) {
        const cfg = q.config.taskConfig ?? q.config.taskConfigV2;
        const keys = cfg?.tasks ? Object.keys(cfg.tasks) : [];
        const taskKey = selectTaskKey(keys) || keys[0];
        const target = cfg && taskKey ? cfg.tasks[taskKey].target : 1;
        const type = getTaskType(taskKey);

        const t = { id: q.id, appId: resolveApplicationId(q, cfg, taskKey), name: q.config.messages.questName, target, type, taskKey };
        if (!UI.tasks.has(q.id)) {
          UI.setTask(q.id, { name: t.name, type, cur: target, max: target, status: "done" });
        }
      }

      // ── Filter remaining active quests ──
      const active = quests.filter(q =>
        !q.userStatus?.completedAt &&
        q.userStatus?.enrolledAt &&
        new Date(q.config.expiresAt).getTime() > now
      );

      if (!active.length) {
        if (completedUnclaimed.length > 0) {
          await sleep(5000);
        } else {
          UI.log("[STANDBY] All quests processed. Monitoring for updates in 30s...", "dim");
          await sleep(30000);
        }
        cycle++;
        continue;
      }

      const videos = [], games = [];

      for (const q of active) {
        const cfg = q.config.taskConfig ?? q.config.taskConfigV2;
        if (!cfg?.tasks) {
          UI.log(`Quest configuration is unavailable: ${q.config?.messages?.questName || q.id}`, "warn");
          continue;
        }
        const keys = Object.keys(cfg.tasks);
        let taskKey = selectTaskKey(keys);
        if (!taskKey) {
          const fallbackKey = keys[0];
          const fallbackAppId = resolveApplicationId(q, cfg, fallbackKey);
          if (fallbackKey && fallbackAppId) {
            taskKey = fallbackKey;
            UI.log(`Inferred GAME task key ${fallbackKey}: ${q.config?.messages?.questName || q.id}`, "warn");
          }
        }
        if (!taskKey) {
          UI.log(`Unknown quest blueprint: ${q.config?.messages?.questName || q.id} [${keys.join(", ")}]`, "warn");
          continue;
        }

        const target = cfg.tasks[taskKey]?.target;
        if (!Number.isFinite(target) || target <= 0) {
          UI.log(`Invalid quest target: ${q.config?.messages?.questName || q.id} [${taskKey}]`, "warn");
          continue;
        }
        const prog = q.userStatus?.progress?.[taskKey]?.value ?? q.userStatus?.streamProgressSeconds ?? 0;
        if (prog >= target) continue;

        const type = getTaskType(taskKey);
        const appId = resolveApplicationId(q, cfg, taskKey);
        if (["GAME", "STREAM"].includes(type) && !appId) {
          console.warn("[ZENTYR][QUEST_SCHEMA] Missing application metadata", {
            questId: q.id,
            name: q.config?.messages?.questName,
            taskKey,
            task: cfg.tasks?.[taskKey],
            config: q.config,
          });
          UI.log(`Missing applicationId: ${q.config?.messages?.questName || q.id} [${taskKey}] ? expand [ZENTYR][QUEST_SCHEMA]`, "err");
          UI.setTask(q.id, { name: q.config?.messages?.questName || q.id, type, cur: prog, max: target, status: "warn" });
          continue;
        }

        const t = { id: q.id, appId, name: q.config?.messages?.questName || q.id, target, type, taskKey };

        if (UI.tasks.has(q.id) && ["run", "done"].includes(UI.tasks.get(q.id).status)) continue;

        UI.setTask(q.id, { name: t.name, type, cur: prog, max: target, status: "queue" });

        const runner = () => {
          switch (type) {
            case "VIDEO": return Quester.doVideo(q, t, q.userStatus);
            case "GAME": return Quester.doGame(q, t, q.userStatus);
            case "STREAM": return Quester.doStream(q, t, q.userStatus);
            case "ACTIVITY": return Quester.doActivity(q, t);
          }
        };

        (type === "VIDEO" ? videos : games).push(runner);
      }

      if (videos.length + games.length > 0) {
        const gameLimit = currentModeKey === "TURBO" ? Math.max(games.length, 1) : CONFIG.GAME_CONCURRENCY;
        const videoLimit = currentModeKey === "TURBO" ? Math.max(videos.length, 1) : (CONFIG.VIDEO_CONCURRENCY || 1);
        UI.log(`[QUEUE] Mode: ${MODES[currentModeKey].label} · Dispatching ${videos.length} videos + ${games.length} games (Concurrency: G=${gameLimit}, V=${videoLimit})`, "info");
        await Promise.all([
          runPool(games, gameLimit),
          runPool(videos, videoLimit),
        ]);
      } else {
        await sleep(5000);
      }

      if (!CONFIG.RUNNING) break;
      UI.log(`Cycle ${cycle} complete - refreshing state...`, "ok");
      await sleep(3500);
      cycle++;
    }

    UI.shutdown();
  }

  main().catch((e) => {
    console.error(e);
    UI.log(e.message || "Fatal Engine Exception", "err");
    UI.shutdown();
  });
})();
