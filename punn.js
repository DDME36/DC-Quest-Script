/**
 *  ██████╗ ██╗   ██╗███╗   ██╗███╗   ██╗
 *  ██╔══██╗██║   ██║████╗  ██║████╗  ██║
 *  ██████╔╝██║   ██║██╔██╗ ██║██╔██╗ ██║
 *  ██╔═══╝ ██║   ██║██║╚██╗██║██║╚██╗██║
 *  ██║     ╚██████╔╝██║ ╚████║██║ ╚████║
 *  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝
 *
 *  PUNN Quest Engine v3.0 (Modern 2026 Edition)
 *  Discord Quest Auto-Completer & Activity Spoofer
 *
 *  Features:
 *  - Premium Glassmorphism UI (Frosted glass, pulsing gradients, outer glows)
 *  - Dynamic Discord Client Theme Matcher (Light, Dark, Midnight, Darker)
 *  - Robust Heuristic Webpack Scraper (Resilient to Discord minified name updates)
 *  - Optimized Traffic Queue & Concurrency Controller
 *  - Secure Stealth Memory Runtime
 */

(async () => {
  "use strict";

  // ─── 1. DESIGN TOKENS & SYSTEM CONFIG ───
  const CONFIG = {
    NAME: "PUNN",
    VERSION: "v3.0",
    RUNNING: true,
    MAX_TASK_TIME: 25 * 60 * 1000,
    MAX_RETRIES: 3,
    GAME_CONCURRENCY: 5,
    REQUEST_DELAY: 2200,
    REMOVE_DELAY: 3500,
    HEARTBEAT_STAGGER: 4500,
    VIDEO_SPEED: 5,
    VIDEO_MAX_FUTURE: 10,
    
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

  if (window.__punnLock) {
    const ui = document.getElementById("punn-root");
    if (ui) {
      ui.style.display = "flex";
      ui.style.animation = "pIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
    }
    return console.warn(`[${CONFIG.NAME}] Quest Engine is already active.`);
  }
  window.__punnLock = true;
  
  const _activeCleanups = new Set();
  const isApp = typeof DiscordNative !== "undefined";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  // ─── 2. STUNNING SVG ICONS ───
  const I = {
    BOLT: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
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
    set(k, v) { try { localStorage.setItem(`punn_${k}`, JSON.stringify(v)); } catch {} },
    get(k) { try { const v = localStorage.getItem(`punn_${k}`); return v ? JSON.parse(v) : null; } catch { return null; } },
  };



  // ─── 5. GLASSMORPHISM UI ENGINE ───
  const UI = {
    el: null,
    tasks: new Map(),
    collapsed: false,
    themeObserver: null,

    init() {
      document.getElementById("punn-root")?.remove();
      document.getElementById("punn-style")?.remove();
      const pos = Store.get("pos") || { top: "24px", right: "24px", left: "auto" };

      const css = document.createElement("style");
      css.id = "punn-style";
      css.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

        @keyframes pIn { from{transform:translateY(-18px) scale(0.97);opacity:0;} to{transform:translateY(0) scale(1);opacity:1;} }
        @keyframes pOut { 0%{opacity:1;max-height:120px;} 100%{opacity:0;max-height:0;margin:0;padding:0;} }
        @keyframes pPulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
        @keyframes pGlow { 0%,100%{background-position:0% 50%;} 50%{background-position:100% 50%;} }
        @keyframes pLogoSpin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }

        :root {
          --punn-bg: ${CONFIG.THEMES.dark.bg};
          --punn-card-bg: ${CONFIG.THEMES.dark.cardBg};
          --punn-card-border: ${CONFIG.THEMES.dark.cardBorder};
          --punn-text-primary: ${CONFIG.THEMES.dark.textPrimary};
          --punn-text-secondary: ${CONFIG.THEMES.dark.textSecondary};
          --punn-log-bg: ${CONFIG.THEMES.dark.logBg};
          --punn-log-text: ${CONFIG.THEMES.dark.logText};
          --punn-glow: ${CONFIG.THEMES.dark.glow};
          
          --punn-accent: linear-gradient(135deg, #a78bfa, #c084fc, #f472b6);
          --punn-ok: #34d399;
          --punn-warn: #fbbf24;
          --punn-err: #f87171;
        }

        #punn-root {
          position:fixed; top:${pos.top}; left:${pos.left}; right:${pos.right};
          width:375px; background:var(--punn-bg); color:var(--punn-text-primary);
          border-radius:22px; font-family:'Geist','Inter',system-ui,sans-serif;
          z-index:99999; border:1px solid var(--punn-card-border);
          box-shadow: 0 32px 64px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.25), 0 0 40px var(--punn-glow);
          overflow:hidden; animation:pIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          display:flex; flex-direction:column;
          backdrop-filter: blur(24px) saturate(160%);
          transition: background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease, color 0.4s ease;
        }

        #punn-head {
          padding:16px 18px; background:rgba(0,0,0,0.18);
          display:flex; justify-content:space-between; align-items:center;
          border-bottom:1px solid var(--punn-card-border); cursor:grab; user-select:none;
        }
        #punn-head:active { cursor:grabbing; }

        .punn-brand { display:flex; align-items:center; gap:12px; }
        
        .punn-logo-container {
          position:relative; width:34px; height:34px; border-radius:11px;
          padding:1px; background:var(--punn-accent); background-size:200% 200%;
          animation:pGlow 4s ease infinite;
        }
        .punn-logo {
          width:100%; height:100%; border-radius:10px; background:#0f0f15;
          display:flex; align-items:center; justify-content:center;
          font-weight:900; font-size:14px; color:#fff; letter-spacing:1px;
          text-shadow: 0 0 8px rgba(167,139,250,0.6);
        }
        #punn-head:hover .punn-logo-container { animation: pLogoSpin 2s linear infinite; }

        .punn-title-wrap { display:flex; flex-direction:column; }
        .punn-title {
          font-weight:800; font-size:16px; letter-spacing:1.8px; color:var(--punn-text-primary);
          background: var(--punn-accent); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .punn-sub {
          font-size:10px; color:var(--punn-text-secondary); font-weight:600;
          letter-spacing:0.5px; opacity:0.8;
        }
        
        .punn-env {
          font-size:8px; padding:3px 8px; border-radius:8px; font-weight:800;
          letter-spacing:0.8px; text-transform:uppercase;
        }
        .punn-env-app { background:rgba(52,211,153,0.12); color:var(--punn-ok); }
        .punn-env-web { background:rgba(251,191,36,0.12); color:var(--punn-warn); }

        .punn-ctrl { display:flex; gap:8px; align-items:center; }
        .punn-btn {
          cursor:pointer; opacity:0.6; transition:all 0.25s cubic-bezier(0.4, 0, 0.2, 1); display:flex;
          align-items:center; justify-content:center; border-radius:9px;
          width:30px; height:30px; border:1px solid transparent;
        }
        .punn-btn:hover { opacity:1; background:rgba(255,255,255,0.06); border-color:var(--punn-card-border); }
        
        .punn-btn-stop {
          opacity:0.85; color:var(--punn-err);
          font-size:10px; font-weight:800; gap:5px; padding:0 12px; width:auto;
          letter-spacing:0.5px; border-radius:10px; background:rgba(248,113,113,0.08);
          border:1px solid rgba(248,113,113,0.15);
        }
        .punn-btn-stop:hover { background:rgba(248,113,113,0.15); opacity:1; box-shadow:0 0 10px rgba(248,113,113,0.25); }

        #punn-body {
          padding:12px 14px; max-height:240px; overflow-y:auto; flex-grow:1;
          display:flex; flex-direction:column; gap:8px;
          transition:max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #punn-body.collapsed { max-height:0; padding:0 14px; overflow:hidden; }
        #punn-body::-webkit-scrollbar { width:5px; }
        #punn-body::-webkit-scrollbar-thumb { background:var(--punn-card-border); border-radius:4px; }
        #punn-body::-webkit-scrollbar-thumb:hover { background:rgba(167,139,250,0.5); }

        .punn-empty {
          text-align:center; padding:36px; color:var(--punn-text-secondary);
          font-size:13px; font-weight:500; letter-spacing:0.5px; opacity:0.75;
        }

        .punn-card {
          display:flex; flex-direction:column; gap:10px; padding:12px 16px;
          background:var(--punn-card-bg); border-radius:16px;
          border:1px solid var(--punn-card-border);
          transition:all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); position:relative; overflow:hidden;
          flex-shrink:0;
        }
        .punn-card:hover { 
          background:rgba(255,255,255,0.02); 
          border-color:rgba(167,139,250,0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.15);
        }
        .punn-card::before {
          content:''; position:absolute; left:0; top:0; bottom:0; width:4px;
          background:linear-gradient(to bottom, #a78bfa, #f472b6); border-radius:4px 0 0 4px;
        }
        .punn-card.s-done::before { background:var(--punn-ok); }
        .punn-card.s-done { border-color:rgba(52,211,153,0.25); }
        .punn-card.s-queue { opacity:0.55; }
        .punn-card.s-queue::before { background:#64748b; }
        .punn-card.s-warn::before { background:var(--punn-warn); }
        .punn-card.s-warn { border-color:rgba(251,191,36,0.25); }
        .punn-card.s-claiming::before { background:var(--punn-warn); animation:pPulse 1.2s ease infinite; }
        .punn-card.s-rm { animation:pOut 0.4s ease forwards; }

        .p-meta { display:flex; gap:14px; align-items:center; width:100%; }

        .p-ico {
          min-width:40px; height:40px; border-radius:12px;
          display:flex; align-items:center; justify-content:center;
          background:rgba(0,0,0,0.25); color:#a78bfa;
          border:1px solid var(--punn-card-border);
          transition: all 0.3s ease;
        }
        .punn-card.s-done .p-ico { color:var(--punn-ok); border-color:rgba(52,211,153,0.3); background:rgba(52,211,153,0.05); }
        .punn-card.s-queue .p-ico { color:#64748b; border-color:transparent; }
        .punn-card.s-warn .p-ico { color:var(--punn-warn); border-color:rgba(251,191,36,0.3); background:rgba(251,191,36,0.05); }

        .p-body { flex:1; min-width:0; }
        .p-row1 { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
        
        .p-name {
          font-size:13.5px; font-weight:700; color:var(--punn-text-primary);
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
        .p-b-done { background:rgba(52,211,153,0.12); color:var(--punn-ok); }
        .p-b-queue { background:rgba(100,116,139,0.15); color:#64748b; }
        .p-b-warn { background:rgba(251,191,36,0.12); color:var(--punn-warn); }

        .p-row2 {
          display:flex; justify-content:space-between; align-items:center;
          font-size:11px; color:var(--punn-text-secondary); margin-bottom:8px; font-weight:600;
        }
        
        .p-pct { 
          font-weight:700; font-size:11px; color:#a78bfa; 
          font-family:'JetBrains Mono',monospace; 
        }
        .punn-card.s-done .p-pct { color:var(--punn-ok); }

        .p-track {
          height:4px; background:rgba(255,255,255,0.06); border-radius:4px;
          overflow:hidden;
        }
        .p-fill {
          height:100%; border-radius:4px; transition:width 0.4s cubic-bezier(0.1, 0.8, 0.2, 1);
          background:linear-gradient(90deg, #a78bfa, #f472b6);
          box-shadow: 0 0 8px rgba(167, 139, 250, 0.4);
        }
        .punn-card.s-done .p-fill { background:var(--punn-ok); box-shadow: none; }

        #punn-log {
          padding:10px 16px; background:var(--punn-log-bg); max-height:110px;
          overflow-y:auto; border-top:1px solid var(--punn-card-border);
          font-family:'JetBrains Mono','Consolas',monospace;
          font-size:10px; color:var(--punn-log-text); scroll-behavior:smooth;
          transition:max-height 0.3s ease, background 0.3s ease;
        }
        #punn-log.collapsed { max-height:0; padding:0 16px; overflow:hidden; }
        #punn-log::-webkit-scrollbar { width:3px; }
        #punn-log::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:3px; }

        .p-log {
          margin-bottom:2px; display:flex; gap:10px; line-height:1.6;
          padding:2px 0;
        }
        .p-ts { opacity:0.45; min-width:50px; font-size:9.5px; }
        .p-l-info { color:#a78bfa; }
        .p-l-ok { color:var(--punn-ok); }
        .p-l-warn { color:var(--punn-warn); }
        .p-l-err { color:var(--punn-err); }
        .p-l-dim { color:#475569; }

        #punn-foot {
          padding:8px; text-align:center; font-size:8px; letter-spacing:2px;
          color:#475569; font-weight:700;
          background:rgba(0,0,0,0.22); border-top:1px solid var(--punn-card-border);
        }
      `;
      document.head.appendChild(css);

      this.el = document.createElement("div");
      this.el.id = "punn-root";
      const envTag = isApp
        ? `<span class="punn-env punn-env-app">⚡ app</span>`
        : `<span class="punn-env punn-env-web">🌐 web</span>`;

      this.el.innerHTML = `
        <div id="punn-head">
          <div class="punn-brand">
            <div class="punn-logo-container">
              <div class="punn-logo">P</div>
            </div>
            <div class="punn-title-wrap">
              <div class="punn-title">${CONFIG.NAME}</div>
              <div class="punn-sub">${CONFIG.VERSION} · Quest Engine</div>
            </div>
            ${envTag}
          </div>
          <div class="punn-ctrl">
            <div class="punn-btn punn-btn-stop" id="punn-stop">${I.STOP} STOP</div>
            <div class="punn-btn" id="punn-min" title="Minimize">${I.MINIMIZE}</div>
          </div>
        </div>
        <div id="punn-body"><div class="punn-empty">◈ Booting Engine...</div></div>
        <div id="punn-log"></div>
        <div id="punn-foot">PUNN TECHNOLOGY · EST 2026</div>
      `;
      document.body.appendChild(this.el);

      // ── Drag & Drop ──
      const head = document.getElementById("punn-head");
      let drag = false, sx, sy, ix, iy;
      head.onmousedown = (e) => {
        if (e.target.closest(".punn-btn")) return;
        drag = true; sx = e.clientX; sy = e.clientY;
        const r = this.el.getBoundingClientRect();
        ix = r.left; iy = r.top;
        this.el.style.right = "auto";
        e.preventDefault();
      };
      document.onmousemove = (e) => {
        if (!drag) return;
        const rect = this.el.getBoundingClientRect();
        const nx = Math.max(0, Math.min(window.innerWidth - rect.width, ix + (e.clientX - sx)));
        const ny = Math.max(0, Math.min(window.innerHeight - rect.height, iy + (e.clientY - sy)));
        this.el.style.left = `${nx}px`;
        this.el.style.top = `${ny}px`;
      };
      document.onmouseup = () => {
        if (drag) {
          drag = false;
          Store.set("pos", { top: this.el.style.top, left: this.el.style.left, right: "auto" });
        }
      };

      document.getElementById("punn-min").onclick = () => this.toggleCollapse();
      document.getElementById("punn-stop").onclick = () => this.shutdown();
      
      document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
        if (e.key === ">" || (e.shiftKey && e.key === ".")) {
          this.el.style.display = this.el.style.display === "none" ? "flex" : "none";
        }
      });

      // ── Dynamic Theme Switching Observer ──
      this.themeObserver = new MutationObserver(() => this.syncTheme());
      this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      this.syncTheme();
    },

    syncTheme() {
      const isLight = document.body.classList.contains("theme-light") || document.documentElement.classList.contains("theme-light");
      const root = document.getElementById("punn-root");
      if (!root) return;

      const theme = isLight ? CONFIG.THEMES.light : CONFIG.THEMES.dark;
      root.style.setProperty("--punn-bg", theme.bg);
      root.style.setProperty("--punn-card-bg", theme.cardBg);
      root.style.setProperty("--punn-card-border", theme.cardBorder);
      root.style.setProperty("--punn-text-primary", theme.textPrimary);
      root.style.setProperty("--punn-text-secondary", theme.textSecondary);
      root.style.setProperty("--punn-log-bg", theme.logBg);
      root.style.setProperty("--punn-log-text", theme.logText);
      root.style.setProperty("--punn-glow", theme.glow);
    },

    toggleCollapse() {
      this.collapsed = !this.collapsed;
      document.getElementById("punn-body")?.classList.toggle("collapsed", this.collapsed);
      document.getElementById("punn-log")?.classList.toggle("collapsed", this.collapsed);
    },

    shutdown() {
      if (!CONFIG.RUNNING) return;
      CONFIG.RUNNING = false;
      this.log("Shutting down engine...", "warn");
      _activeCleanups.forEach(fn => { try { fn(); } catch {} });
      _activeCleanups.clear();
      if (this.themeObserver) {
        try { this.themeObserver.disconnect(); } catch {}
      }
      Patcher.clean();
      setTimeout(() => { 
        this.el?.remove(); 
        document.getElementById("punn-style")?.remove(); 
        window.__punnLock = false; 
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
      console.log(`%c[PUNN] %c${msg}`, `color:#a78bfa;font-weight:bold`, `color:${colors[type] || colors.info}`);
      const box = document.getElementById("punn-log");
      if (!box) return;
      const el = document.createElement("div");
      el.className = `p-log p-l-${type}`;
      el.innerHTML = `<span class="p-ts">${new Date().toLocaleTimeString().split(" ")[0]}</span><span>${msg}</span>`;
      box.appendChild(el);
      box.scrollTop = box.scrollHeight;
      while (box.children.length > 50) box.firstChild.remove();
    },

    render() {
      const body = document.getElementById("punn-body");
      if (!body) return;
      if (!this.tasks.size) {
        body.innerHTML = `<div class="punn-empty">◈ Waiting for quests...</div>`;
        return;
      }

      body.innerHTML = "";
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
          icon = I.CHECK; badge = `<span class="p-badge p-b-done">✓ done</span>`; sc = "s-done";
        } else if (t.status === "claiming") {
          icon = I.CLOCK; badge = `<span class="p-badge p-b-warn">claiming...</span>`; sc = "s-claiming";
        } else if (t.status === "claimed" || t.status === "claimed_no_code") {
          icon = I.CHECK; badge = `<span class="p-badge p-b-done">✓ claimed</span>`; sc = "s-done";
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

        let contentHtml = `
          <div class="p-meta">
            <div class="p-ico">${icon}</div>
            <div class="p-body">
              <div class="p-row1">
                <div class="p-name" title="${t.name}">${t.name}</div>
                ${badge}
              </div>
              <div class="p-row2">
                <span>${t.type || ''}</span>
                <span class="p-pct">${pct > 0 ? Math.floor(pct) + '%' : eta}</span>
              </div>
              <div class="p-track"><div class="p-fill" style="width:${pct}%"></div></div>
            </div>
          </div>
        `;

        if (t.status === "claimed" && t.code) {
          contentHtml += `
            <div style="margin-top:10px; display:flex; gap:8px; width:100%; animation: pIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
              <input type="text" readonly value="${t.code}" style="flex:1; background:${isLight ? '#e2e8f0' : '#09090b'}; border:1px solid var(--punn-card-border); color:#34d399; font-family:'JetBrains Mono',monospace; font-size:11px; padding:6px 10px; border-radius:8px; outline:none;" onclick="this.select()">
              <button style="background:linear-gradient(135deg, #34d399, #059669); color:#fff; border:none; padding:6px 14px; border-radius:8px; font-size:10px; cursor:pointer; font-weight:800; transition:all 0.25s;" onclick="navigator.clipboard.writeText('${t.code}'); this.innerText='✓'; setTimeout(()=>this.innerText='COPY', 2000)">COPY</button>
            </div>
          `;
        } else if (t.status === "claimed_no_code") {
          contentHtml += `
            <div style="margin-top:8px; font-size:11px; color:var(--punn-ok); font-weight:600; animation: pIn 0.3s ease-out; display:flex; align-items:center; gap:6px;">
              <span>🎁 เคลมสิทธิ์แล้ว! ตรวจสอบในหน้าคลังของขวัญ (Gift Inventory) บน Discord</span>
            </div>
          `;
        } else if (t.status === "captcha") {
          contentHtml += `
            <div style="margin-top:10px; display:flex; flex-direction:column; gap:8px; width:100%; animation: pIn 0.3s ease-out;">
              <span style="font-size:10.5px; color:var(--punn-warn); font-weight:700;">🔒 กรุณาติ๊กช่องด้านล่างเพื่อแก้แคปช่า:</span>
              <div id="punn-captcha-${id}" style="min-height:80px; display:flex; justify-content:center; background:rgba(0,0,0,0.15); border-radius:10px; padding:8px; border:1px dashed var(--punn-card-border);"></div>
            </div>
          `;
        } else if (t.status === "claim_failed") {
          contentHtml += `
            <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px; font-size:10px; color:var(--punn-err); animation: pIn 0.3s ease-out;">
              <span>❌ ไม่สามารถรับรางวัลได้: ${t.errMsg || "ข้อผิดพลาดที่ไม่รู้จัก"}</span>
              <button style="align-self:flex-start; background:rgba(248,113,113,0.1); color:var(--punn-err); border:1px solid rgba(248,113,113,0.25); padding:4px 10px; border-radius:8px; cursor:pointer; font-size:9px; font-weight:700; transition: all 0.2s;" onclick="window.open('https://discord.com/blog/discord-quests-guide', '_blank')">เปิดหน้าต่างเควสเพื่อเคลมเอง</button>
            </div>
          `;
        }

        body.innerHTML += `
          <div class="punn-card ${sc} ${t._removing ? 's-rm' : ''}">
            ${contentHtml}
          </div>`;
      }
    },
  };

  // ─── 6. INTERACTIVE TRAFFIC QUEUE (ANTI-RATE LIMIT) ───
  const Traffic = {
    q: [], busy: false,
    async send(url, body, retries = 0) {
      if (!CONFIG.RUNNING) throw "Engine stopped";
      return new Promise((ok, fail) => { this.q.push({ url, body, ok, fail, retries }); this.run(); });
    },
    async run() {
      if (this.busy || !this.q.length) return;
      this.busy = true;
      while (this.q.length) {
        if (!CONFIG.RUNNING) { this.q = []; this.busy = false; return; }
        const r = this.q.shift();
        try {
          r.ok(await Mods.API.post({ url: r.url, body: r.body }));
        } catch (e) {
          if (e.status === 429) {
            const wait = (e.body?.retry_after || 6) * 1000;
            UI.log(`⏱ Rate limit — Waiting ${(wait/1000).toFixed(1)}s`, "warn");
            this.q.unshift(r);
            await sleep(wait + 1000);
          } else if (r.retries < CONFIG.MAX_RETRIES) {
            UI.log(`⚠ API Failed, retrying ${r.retries + 1}/${CONFIG.MAX_RETRIES}`, "dim");
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

      const status = Object.entries(Mods).map(([k, v]) => `${k}:${v ? "✓" : "✗"}`).join(" ");
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
    clean(n) { return n.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, " "); },

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
        if (Date.now() - started > CONFIG.MAX_TASK_TIME) { UI.log(`⏰ Video timeout: ${task.name}`, "err"); break; }
        await sleep(1000 + rnd(200, 800));
      }

      if (!done && CONFIG.RUNNING) {
        try { await Traffic.send(`/quests/${quest.id}/video-progress`, { timestamp: task.target }); } catch {}
      }
      if (CONFIG.RUNNING) this.complete(quest, task);
    },

    // ── GAME SPOOFING ──
    async doGame(quest, task, userStatus) {
      if (!isApp) {
        UI.log(`⚠ ${task.name} — Desktop App Only`, "warn");
        UI.setTask(quest.id, { name: task.name, type: "GAME", cur: 0, max: task.target, status: "warn" });
        return;
      }
      return this.doDesktop(quest, task, "GAME", "PLAY_ON_DESKTOP", userStatus);
    },

    // ── STREAM SPOOFING ──
    async doStream(quest, task, userStatus) {
      if (!isApp) {
        UI.log(`⚠ ${task.name} — Desktop App Only`, "warn");
        UI.setTask(quest.id, { name: task.name, type: "STREAM", cur: 0, max: task.target, status: "warn" });
        return;
      }
      return this.doDesktop(quest, task, "STREAM", "STREAM_ON_DESKTOP", userStatus);
    },

    // ── DESKTOP SPOOF MANAGER ──
    async doDesktop(quest, task, type, key, userStatus) {
      if (!CONFIG.RUNNING) return;
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
      UI.log(`🎮 Registered Virtual Activity: ${app.name} [PID:${pid}]`, "dim");

      return new Promise((resolve) => {
        let staleCount = 0;
        let lastProg = -1;

        const timer = setTimeout(() => {
          UI.log(`⏰ Spoof timeout: ${task.name}`, "err");
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
      const chan = Mods.ChanStore?.getSortedPrivateChannels()[0]?.id
        ?? Object.values(Mods.GuildChanStore?.getAllGuilds() || {}).find(g => g?.VOCAL?.length)?.VOCAL[0]?.channel?.id;
      
      if (!chan) {
        UI.setTask(quest.id, { name: task.name, type: "ACTIVITY", cur: 0, max: task.target, status: "warn" });
        return UI.log(`❌ No active voice channels found for activity: ${task.name}`, "err");
      }

      const sKey = `call:${chan}:${rnd(1000, 9999)}`;
      let cur = 0;
      UI.setTask(quest.id, { name: task.name, type: "ACTIVITY", cur, max: task.target, status: "run" });

      const t0 = Date.now();
      while (cur < task.target && CONFIG.RUNNING) {
        try {
          const r = await Traffic.send(`/quests/${quest.id}/heartbeat`, { stream_key: sKey, terminal: false });
          cur = r.body.progress?.PLAY_ACTIVITY?.value ?? cur + 20;
          UI.setTask(quest.id, { name: task.name, type: "ACTIVITY", cur, max: task.target, status: "run" });
          if (cur >= task.target) {
            await Traffic.send(`/quests/${quest.id}/heartbeat`, { stream_key: sKey, terminal: true });
            break;
          }
        } catch {}
        if (Date.now() - t0 > CONFIG.MAX_TASK_TIME) { UI.log(`⏰ Activity timeout`, "err"); break; }
        await sleep(20000 + rnd(-2000, 4000));
      }
      if (CONFIG.RUNNING && cur >= task.target) this.complete(quest, task);
    },

    complete(quest, task) {
      UI.setTask(quest.id, { name: task.name, type: task.type, cur: task.target, max: task.target, status: "done" });
      UI.log(`✓ Quest Accomplished: ${task.name} (กรุณากดรับรางวัลด้วยตนเองใน Discord)`, "ok");
      try { if (Notification.permission === "granted") new Notification(`PUNN: Quest Finished!`, { body: task.name }); } catch {}
    },

    // ── REWARD CLAIM PIPELINE (DISABLED) ──
    // Auto-claiming has been disabled. Quests can be claimed manually in Discord Settings -> Gift Inventory.
  };

  // ─── 10. POOL CONCURRENCY CONTROLLER ───
  async function runPool(tasks, limit) {
    const running = [];
    for (const fn of tasks) {
      if (!CONFIG.RUNNING) break;
      const p = fn().then(() => running.splice(running.indexOf(p), 1));
      running.push(p);
      await sleep(CONFIG.HEARTBEAT_STAGGER + rnd(-1000, 1500));
      if (running.length >= limit) await Promise.race(running);
    }
    return Promise.all(running);
  }

  // ─── 11. ENTRY SYSTEM MAIN ───
  const TASK_KEYS = ["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY"];

  async function main() {
    UI.init();
    UI.log(`${isApp ? "⚡ Discord App Client" : "🌐 Discord Web Client"} Hooked Successfully`, isApp ? "ok" : "warn");
    if (!isApp) UI.log("📌 Browser environment active — maintain tab focus to prevent throttling.", "warn");

    if (!loadModules()) return UI.log("Hooking rejected — Please relaunch or reload Discord", "err");

    let cycle = 1;
    while (CONFIG.RUNNING) {
      UI.log(`-- Processing Cycle ${cycle} --`, "info");

      const getQ = () => Mods.QuestStore.quests instanceof Map ? [...Mods.QuestStore.quests.values()] : Object.values(Mods.QuestStore.quests);
      let quests = getQ();
      const now = Date.now();

      // ── Auto Enroll Active Quests ──
      const toEnroll = quests.filter(q => !q.userStatus?.completedAt && new Date(q.config.expiresAt).getTime() > now && !q.userStatus?.enrolledAt);
      if (toEnroll.length) {
        UI.log(`📝 Auto enrolling ${toEnroll.length} eligible quests...`, "warn");
        for (const q of toEnroll) {
          if (!CONFIG.RUNNING) break;
          try { 
            await Traffic.send(`/quests/${q.id}/enroll`, { location: 1 }); 
            UI.log(`  ✓ Registered: ${q.config.messages.questName}`, "ok"); 
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
        const keys = cfg ? Object.keys(cfg.tasks) : [];
        const taskKey = TASK_KEYS.find(k => keys.includes(k)) || keys[0];
        const target = cfg && taskKey ? cfg.tasks[taskKey].target : 1;
        const type = taskKey?.includes("VIDEO") ? "VIDEO"
          : taskKey === "PLAY_ON_DESKTOP" ? "GAME"
          : taskKey === "STREAM_ON_DESKTOP" ? "STREAM"
          : "ACTIVITY";

        const t = { id: q.id, appId: q.config.application?.id, name: q.config.messages.questName, target, type, taskKey };
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
          UI.log("💤 All tasks clear. Monitoring for updates in 30s...", "dim");
          await sleep(30000);
        }
        cycle++;
        continue;
      }

      const videos = [], games = [];

      for (const q of active) {
        const cfg = q.config.taskConfig ?? q.config.taskConfigV2;
        const keys = Object.keys(cfg.tasks);
        const taskKey = TASK_KEYS.find(k => keys.includes(k));

        if (!taskKey && q.config.application?.id) {
          const target = cfg.tasks[keys[0]]?.target;
          if (target) {
            const t = { id: q.id, appId: q.config.application.id, name: q.config.messages.questName, target, type: "GAME", taskKey: keys[0] };
            if (!UI.tasks.has(q.id) || !["run", "done"].includes(UI.tasks.get(q.id).status)) {
              UI.setTask(q.id, { name: t.name, type: "GAME", cur: 0, max: target, status: "queue" });
              games.push(() => Quester.doGame(q, t, q.userStatus));
            }
          }
          continue;
        }
        if (!taskKey) { UI.log(`❓ Unknown quest blueprint: ${q.config.messages.questName}`, "warn"); continue; }

        const target = cfg.tasks[taskKey].target;
        const prog = q.userStatus?.progress?.[taskKey]?.value ?? 0;
        if (prog >= target) continue;

        const type = taskKey.includes("VIDEO") ? "VIDEO"
          : taskKey === "PLAY_ON_DESKTOP" ? "GAME"
          : taskKey === "STREAM_ON_DESKTOP" ? "STREAM"
          : "ACTIVITY";

        const t = { id: q.id, appId: q.config.application.id, name: q.config.messages.questName, target, type, taskKey };

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
        UI.log(`📦 Queueing ${videos.length} videos + ${games.length} virtual clients`, "info");
        await Promise.all([
          runPool(games, CONFIG.GAME_CONCURRENCY),
          runPool(videos, 3),
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
