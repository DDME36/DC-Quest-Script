/**
 *  ██████╗ ██╗   ██╗███╗   ██╗███╗   ██╗
 *  ██╔══██╗██║   ██║████╗  ██║████╗  ██║
 *  ██████╔╝██║   ██║██╔██╗ ██║██╔██╗ ██║
 *  ██╔═══╝ ██║   ██║██║╚██╗██║██║╚██╗██║
 *  ██║     ╚██████╔╝██║ ╚████║██║ ╚████║
 *  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝
 *
 *  PUNN Quest Engine v2.0
 *  Discord Quest Auto-Completer
 *
 *  วิธีใช้: Copy ทั้งหมด → Paste ลง Console (F12)
 *  กด Shift+. เพื่อ Hide/Show
 */
(async () => {
  "use strict";

  const CONFIG = {
    NAME: "PUNN",
    VERSION: "v2.0",
    C1: "#b4befe",
    C2: "#cba6f7",
    C3: "#f5c2e7",
    OK: "#a6e3a1",
    WARN: "#f9e2af",
    ERR: "#f38ba8",
    VIDEO_SPEED: 7,
    VIDEO_MAX_FUTURE: 10,
    HIDE_ACTIVITY: false,
    GAME_CONCURRENCY: 10,
    REQUEST_DELAY: 1500,
    REMOVE_DELAY: 3000,
    HEARTBEAT_STAGGER: 3000,
    RUNNING: true,
    MAX_TASK_TIME: 30 * 60 * 1000,
  };

  if (window.__punnLock) {
    const ui = document.getElementById("punn-root");
    if (ui) ui.style.display = "flex";
    return console.warn(`[${CONFIG.NAME}] Already running.`);
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

  // ──────────────────────────── ICONS ────────────────────────────
  const I = {
    BOLT: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.29-.62L14.5 3h1l-1 7h3.5c.58 0 .57.32.29.62L11 21z"/></svg>`,
    PLAY: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
    GAME: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
    STREAM: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
    ACTIVITY: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 14.5a4.5 4.5 0 110-9 4.5 4.5 0 010 9zm0-5.5a1 1 0 100 2 1 1 0 000-2z"/></svg>`,
    CHECK: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
    CLOCK: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
    STOP: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>`,
    WARN: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
    MINIMIZE: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>`,
  };

  // ──────────────────────────── STORAGE ────────────────────────────
  const Store = {
    set(k, v) { try { localStorage.setItem(`punn_${k}`, JSON.stringify(v)); } catch {} },
    get(k) { try { const v = localStorage.getItem(`punn_${k}`); return v ? JSON.parse(v) : null; } catch { return null; } },
  };

  // ──────────────────────────── UI ENGINE ────────────────────────────
  const UI = {
    el: null,
    tasks: new Map(),
    logLines: [],
    collapsed: false,

    init() {
      document.getElementById("punn-root")?.remove();
      document.getElementById("punn-style")?.remove();
      const pos = Store.get("pos") || { top: "20px", right: "20px", left: "auto" };

      const css = document.createElement("style");
      css.id = "punn-style";
      css.textContent = `

        @keyframes pIn { from{transform:translateY(-12px);opacity:0;} to{transform:translateY(0);opacity:1;} }
        @keyframes pOut { 0%{opacity:1;max-height:80px;} 100%{opacity:0;max-height:0;margin:0;padding:0;} }
        @keyframes pPulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }

        #punn-root {
          position:fixed; top:${pos.top}; left:${pos.left}; right:${pos.right};
          width:360px; background:#1e1e2e; color:#cdd6f4;
          border-radius:16px; font-family:'Inter',system-ui,-apple-system,sans-serif;
          z-index:99999; border:1px solid #313244;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2);
          overflow:hidden; animation:pIn 0.35s ease-out;
          display:flex; flex-direction:column;
        }

        #punn-head {
          padding:14px 16px; background:#181825;
          display:flex; justify-content:space-between; align-items:center;
          border-bottom:1px solid #313244; cursor:grab; user-select:none;
        }
        #punn-head:active { cursor:grabbing; }

        .punn-brand { display:flex; align-items:center; gap:11px; }
        .punn-logo {
          width:32px; height:32px; border-radius:10px;
          background:linear-gradient(135deg, ${CONFIG.C1}, ${CONFIG.C2}, ${CONFIG.C3});
          display:flex; align-items:center; justify-content:center;
          font-weight:800; font-size:13px; color:#1e1e2e; letter-spacing:1px;
          box-shadow: 0 2px 8px rgba(180,190,254,0.25);
        }
        .punn-title-wrap { display:flex; flex-direction:column; }
        .punn-title {
          font-weight:800; font-size:15px; letter-spacing:2px; color:#cdd6f4;
        }
        .punn-sub {
          font-size:9px; color:#585b70; font-weight:500;
          letter-spacing:0.5px; margin-top:1px;
        }
        .punn-env {
          font-size:8px; padding:2px 8px; border-radius:8px; font-weight:700;
          letter-spacing:0.5px;
        }
        .punn-env-app { background:rgba(166,227,161,0.1); color:${CONFIG.OK}; }
        .punn-env-web { background:rgba(249,226,175,0.1); color:${CONFIG.WARN}; }

        .punn-ctrl { display:flex; gap:6px; align-items:center; }
        .punn-btn {
          cursor:pointer; opacity:0.4; transition:all 0.2s ease; display:flex;
          align-items:center; justify-content:center; border-radius:8px;
          width:28px; height:28px;
        }
        .punn-btn:hover { opacity:1; background:#313244; }
        .punn-btn-stop {
          opacity:0.6; color:${CONFIG.ERR};
          font-size:9px; font-weight:700; gap:3px; padding:0 10px; width:auto;
          letter-spacing:0.5px; border-radius:8px;
        }
        .punn-btn-stop:hover { background:rgba(243,139,168,0.1); opacity:1; }

        #punn-body {
          padding:8px 10px; max-height:380px; overflow-y:auto; flex-grow:1;
          transition:max-height 0.3s ease;
        }
        #punn-body.collapsed { max-height:0; padding:0 10px; overflow:hidden; }
        #punn-body::-webkit-scrollbar { width:4px; }
        #punn-body::-webkit-scrollbar-track { background:transparent; }
        #punn-body::-webkit-scrollbar-thumb { background:#45475a; border-radius:4px; }

        .punn-empty {
          text-align:center; padding:28px; color:#585b70;
          font-size:12px; font-weight:500;
        }

        .punn-card {
          display:flex; gap:11px; padding:10px 13px; margin-bottom:4px;
          background:#181825; border-radius:12px;
          border:1px solid #313244;
          transition:all 0.2s ease; position:relative; overflow:hidden;
        }
        .punn-card:hover { background:#1e1e2e; border-color:#45475a; }
        .punn-card::before {
          content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
          background:${CONFIG.C1}; border-radius:3px 0 0 3px;
        }
        .punn-card.s-done::before { background:${CONFIG.OK}; }
        .punn-card.s-done { border-color:rgba(166,227,161,0.15); }
        .punn-card.s-queue { opacity:0.4; }
        .punn-card.s-queue::before { background:#585b70; }
        .punn-card.s-warn::before { background:${CONFIG.WARN}; }
        .punn-card.s-warn { border-color:rgba(249,226,175,0.15); }
        .punn-card.s-rm { animation:pOut 0.4s ease forwards; }

        .p-ico {
          min-width:36px; height:36px; border-radius:10px;
          display:flex; align-items:center; justify-content:center;
          background:#1e1e2e; color:${CONFIG.C1};
          border:1px solid #313244;
        }
        .punn-card.s-done .p-ico { color:${CONFIG.OK}; border-color:rgba(166,227,161,0.2); }
        .punn-card.s-queue .p-ico { color:#585b70; border-color:#313244; }
        .punn-card.s-warn .p-ico { color:${CONFIG.WARN}; border-color:rgba(249,226,175,0.2); }

        .p-body { flex:1; min-width:0; }
        .p-row1 { display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; }
        .p-name {
          font-size:12px; font-weight:600; color:#cdd6f4;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:165px;
        }
        .p-badge {
          font-size:8px; font-weight:700; padding:2px 8px; border-radius:6px;
          letter-spacing:0.5px; display:flex; align-items:center; gap:4px;
        }
        .p-b-live {
          background:rgba(180,190,254,0.12); color:${CONFIG.C1};
        }
        .p-b-live::before {
          content:''; width:5px; height:5px; border-radius:50%;
          background:${CONFIG.C1}; animation:pPulse 2s ease infinite;
        }
        .p-b-done { background:rgba(166,227,161,0.12); color:${CONFIG.OK}; }
        .p-b-queue { background:rgba(88,91,112,0.2); color:#585b70; }
        .p-b-warn { background:rgba(249,226,175,0.12); color:${CONFIG.WARN}; }

        .p-row2 {
          display:flex; justify-content:space-between; align-items:center;
          font-size:10px; color:#585b70; margin-bottom:6px; font-weight:500;
        }
        .p-pct { font-weight:600; font-size:10px; color:${CONFIG.C1}; font-family:'JetBrains Mono',monospace; }
        .punn-card.s-done .p-pct { color:${CONFIG.OK}; }

        .p-track {
          height:3px; background:#313244; border-radius:3px;
          overflow:hidden;
        }
        .p-fill {
          height:100%; border-radius:3px; transition:width 0.5s ease;
          background:linear-gradient(90deg, ${CONFIG.C1}, ${CONFIG.C2});
        }
        .punn-card.s-done .p-fill { background:${CONFIG.OK}; }

        #punn-log {
          padding:8px 14px; background:#11111b; max-height:100px;
          overflow-y:auto; border-top:1px solid #313244;
          font-family:'JetBrains Mono','Consolas',monospace;
          font-size:10px; color:#585b70; scroll-behavior:smooth;
          transition:max-height 0.3s ease;
        }
        #punn-log.collapsed { max-height:0; padding:0 14px; overflow:hidden; }
        #punn-log::-webkit-scrollbar { width:3px; }
        #punn-log::-webkit-scrollbar-thumb { background:#313244; border-radius:3px; }

        .p-log {
          margin-bottom:1px; display:flex; gap:8px; line-height:1.6;
          padding:1px 0;
        }
        .p-ts { opacity:0.4; min-width:46px; font-size:9px; }
        .p-l-info { color:${CONFIG.C1}; }
        .p-l-ok { color:${CONFIG.OK}; }
        .p-l-warn { color:${CONFIG.WARN}; }
        .p-l-err { color:${CONFIG.ERR}; }
        .p-l-dim { color:#45475a; }

        #punn-foot {
          padding:6px; text-align:center; font-size:8px; letter-spacing:1.5px;
          color:#45475a; font-weight:600;
          background:#11111b; border-top:1px solid #313244;
        }
      `;
      document.head.appendChild(css);

      this.el = document.createElement("div");
      this.el.id = "punn-root";
      const envTag = isApp
        ? `<span class="punn-env punn-env-app">⚡ APP</span>`
        : `<span class="punn-env punn-env-web">🌐 WEB</span>`;

      this.el.innerHTML = `
        <div id="punn-head">
          <div class="punn-brand">
            <div class="punn-logo">P</div>
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
        <div id="punn-body"><div class="punn-empty">◈ Initializing...</div></div>
        <div id="punn-log"></div>
        <div id="punn-foot">PUNN · QUEST ENGINE</div>
      `;
      document.body.appendChild(this.el);

      // ── Drag ──
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

      try { if (Notification.permission === "default") Notification.requestPermission(); } catch {}
    },

    toggleCollapse() {
      this.collapsed = !this.collapsed;
      document.getElementById("punn-body")?.classList.toggle("collapsed", this.collapsed);
      document.getElementById("punn-log")?.classList.toggle("collapsed", this.collapsed);
    },

    shutdown() {
      if (!CONFIG.RUNNING) return;
      CONFIG.RUNNING = false;
      this.log("Shutting down...", "warn");
      _activeCleanups.forEach(fn => { try { fn(); } catch {} });
      _activeCleanups.clear();
      Patcher.clean();
      setTimeout(() => { this.el?.remove(); document.getElementById("punn-style")?.remove(); window.__punnLock = false; }, 1000);
    },

    setTask(id, data) {
      this.tasks.set(id, data);
      this.render();
    },

    removeTask(id) {
      const t = this.tasks.get(id);
      if (t) { t._removing = true; this.render(); setTimeout(() => { this.tasks.delete(id); this.render(); }, 500); }
    },

    log(msg, type = "info") {
      const colors = { info: CONFIG.C1, ok: CONFIG.OK, warn: CONFIG.WARN, err: CONFIG.ERR, dim: "#555" };
      console.log(`%c[PUNN] %c${msg}`, `color:${CONFIG.C1};font-weight:bold`, `color:${colors[type]||colors.info}`);
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
      if (!this.tasks.size) return (body.innerHTML = `<div class="punn-empty">◈ Waiting for quests...</div>`);

      body.innerHTML = "";
      const sorted = [...this.tasks.entries()].sort((a, b) => {
        const order = (t) => t.status === "done" ? 3 : t.status === "warn" ? 2 : t.status === "queue" ? 1 : 0;
        return order(a[1]) - order(b[1]);
      });

      for (const [id, t] of sorted) {
        const pct = t.max > 0 ? Math.min(100, (t.cur / t.max) * 100).toFixed(1) : 0;
        let icon = I.BOLT, badge = "", sc = "";

        if (t.status === "done") {
          icon = I.CHECK; badge = `<span class="p-badge p-b-done">✓ DONE</span>`; sc = "s-done";
        } else if (t.status === "warn") {
          icon = I.WARN; badge = `<span class="p-badge p-b-warn">SKIP</span>`; sc = "s-warn";
        } else if (t.status === "queue") {
          icon = I.CLOCK; badge = `<span class="p-badge p-b-queue">QUEUE</span>`; sc = "s-queue";
        } else {
          badge = `<span class="p-badge p-b-live">LIVE</span>`;
          if (t.type === "VIDEO") icon = I.PLAY;
          else if (t.type === "GAME") icon = I.GAME;
          else if (t.type === "STREAM") icon = I.STREAM;
          else if (t.type === "ACTIVITY") icon = I.ACTIVITY;
        }

        const eta = t.status === "run" && t.cur > 0
          ? `~${fmt(Math.ceil(t.max - t.cur))}`
          : `${Math.floor(t.cur)}/${t.max}s`;

        body.innerHTML += `
          <div class="punn-card ${sc} ${t._removing ? 's-rm' : ''}">
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
          </div>`;
      }
    },
  };

  // ──────────────────────────── TRAFFIC QUEUE ────────────────────────────
  const Traffic = {
    q: [], busy: false,
    async send(url, body) {
      if (!CONFIG.RUNNING) throw "Stopped";
      return new Promise((ok, fail) => { this.q.push({ url, body, ok, fail }); this.run(); });
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
            const wait = (e.body?.retry_after || 5) * 1000;
            UI.log(`⏱ Rate limit — waiting ${(wait/1000).toFixed(0)}s`, "warn");
            this.q.unshift(r);
            await sleep(wait + 1000);
          } else r.fail(e);
        }
        await sleep(CONFIG.REQUEST_DELAY + rnd(-300, 500));
      }
      this.busy = false;
    },
  };

  // ──────────────────────────── MODULES ────────────────────────────
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

  // ──────────────────────────── GAME PATCHER ────────────────────────────
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

  // ──────────────────────────── TASK RUNNERS ────────────────────────────
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

    // ── VIDEO ──
    async doVideo(quest, task, userStatus) {
      let cur = userStatus.progress?.[task.taskKey]?.value ?? 0;
      const t0 = new Date(userStatus.enrolledAt).getTime();
      UI.setTask(quest.id, { name: task.name, type: "VIDEO", cur, max: task.target, status: "run" });

      const started = Date.now();
      let done = false;

      while (cur < task.target && CONFIG.RUNNING) {
        const maxOk = Math.floor((Date.now() - t0) / 1000) + CONFIG.VIDEO_MAX_FUTURE;
        const next = cur + CONFIG.VIDEO_SPEED;

        if (maxOk - cur >= CONFIG.VIDEO_SPEED) {
          try {
            const r = await Traffic.send(`/quests/${quest.id}/video-progress`, {
              timestamp: Math.min(task.target, next + (Math.random() * 2 - 0.5)),
            });
            done = r.body.completed_at != null;
            cur = Math.min(task.target, next);
            if (done) break;
          } catch {}
        }

        if (next >= task.target) break;
        UI.setTask(quest.id, { name: task.name, type: "VIDEO", cur, max: task.target, status: "run" });
        if (Date.now() - started > CONFIG.MAX_TASK_TIME) { UI.log(`⏰ Video timeout: ${task.name}`, "err"); break; }
        await sleep(1000 + rnd(0, 500));
      }

      if (!done && CONFIG.RUNNING) {
        try { await Traffic.send(`/quests/${quest.id}/video-progress`, { timestamp: task.target }); } catch {}
      }
      if (CONFIG.RUNNING) this.complete(quest, task);
    },

    // ── GAME (PLAY_ON_DESKTOP) ──
    async doGame(quest, task, userStatus) {
      if (!isApp) {
        UI.log(`⚠ ${task.name} — Desktop App only`, "warn");
        UI.setTask(quest.id, { name: task.name, type: "GAME", cur: 0, max: task.target, status: "warn" });
        return;
      }
      return this.doDesktop(quest, task, "GAME", "PLAY_ON_DESKTOP", userStatus);
    },

    // ── STREAM ──
    async doStream(quest, task, userStatus) {
      if (!isApp) {
        UI.log(`⚠ ${task.name} — Desktop App only`, "warn");
        UI.setTask(quest.id, { name: task.name, type: "STREAM", cur: 0, max: task.target, status: "warn" });
        return;
      }
      return this.doDesktop(quest, task, "STREAM", "STREAM_ON_DESKTOP", userStatus);
    },

    // ── GENERIC DESKTOP (Game/Stream) ──
    async doDesktop(quest, task, type, key, userStatus) {
      if (!CONFIG.RUNNING) return;
      const app = await this.getAppInfo(task.appId, task.name);
      const pid = rnd(10000, 50000);

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
      UI.log(`🎮 Spoofed: ${app.name} [PID:${pid}]`, "dim");

      return new Promise((resolve) => {
        let staleCount = 0;
        let lastProg = -1;

        const timer = setTimeout(() => {
          UI.log(`⏰ Timeout: ${task.name}`, "err");
          done(); resolve();
        }, CONFIG.MAX_TASK_TIME);

        const onHB = (d) => {
          if (!CONFIG.RUNNING) { done(); resolve(); return; }
          if (d.questId !== quest.id) return;

          let prog;
          if (quest.config.configVersion === 1) {
            prog = d.userStatus.streamProgressSeconds ?? 0;
          } else {
            prog = d.userStatus.progress?.[key]?.value ?? 0;
          }

          // ── Stale detection: ถ้า progress ไม่ขยับ 5 รอบ ให้แจ้ง ──
          if (prog === lastProg) {
            staleCount++;
            if (staleCount >= 5 && prog === 0) {
              UI.log(`⚠ ${task.name}: progress 0 — อาจต้องรอ heartbeat`, "warn");
              staleCount = 0;
            }
          } else {
            staleCount = 0;
            lastProg = prog;
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
          clearTimeout(timer); cleanup(); Mods.Dispatcher.unsubscribe(EVT.HB, onHB); _activeCleanups.delete(done);
        };
        _activeCleanups.add(done);
        Mods.Dispatcher.subscribe(EVT.HB, onHB);
      });
    },

    // ── ACTIVITY ──
    async doActivity(quest, task) {
      const chan = Mods.ChanStore?.getSortedPrivateChannels()[0]?.id
        ?? Object.values(Mods.GuildChanStore?.getAllGuilds() || {}).find(g => g?.VOCAL?.length)?.VOCAL[0]?.channel?.id;
      if (!chan) return UI.log(`❌ No channel for ${task.name}`, "err");

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
        await sleep(20000 + rnd(-2000, 3000));
      }
      if (CONFIG.RUNNING && cur >= task.target) this.complete(quest, task);
    },

    complete(quest, task) {
      UI.setTask(quest.id, { name: task.name, type: task.type, cur: task.target, max: task.target, status: "done" });
      UI.log(`✅ ${task.name}`, "ok");
      try { if (Notification.permission === "granted") new Notification(`${CONFIG.NAME}: Done!`, { body: task.name }); } catch {}
      setTimeout(() => UI.removeTask(quest.id), CONFIG.REMOVE_DELAY);
    },
  };

  // ──────────────────────────── CONCURRENCY ────────────────────────────
  async function runPool(tasks, limit) {
    const running = [];
    for (const fn of tasks) {
      if (!CONFIG.RUNNING) break;
      const p = fn().then(() => running.splice(running.indexOf(p), 1));
      running.push(p);
      // ── เว้นช่วงระหว่างเกม เพื่อให้ Discord register heartbeat ──
      await sleep(CONFIG.HEARTBEAT_STAGGER);
      if (running.length >= limit) await Promise.race(running);
    }
    return Promise.all(running);
  }

  // ──────────────────────────── MAIN ────────────────────────────
  const TASK_KEYS = ["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY"];

  async function main() {
    UI.init();
    UI.log(`${isApp ? "⚡ Desktop App" : "🌐 Browser"} detected`, isApp ? "ok" : "warn");
    if (!isApp) UI.log("⚠ Keep this tab active — background tabs may throttle timers", "warn");

    if (!loadModules()) return UI.log("Module load failed — try refreshing Discord", "err");

    let cycle = 1;
    while (CONFIG.RUNNING) {
      UI.log(`── Cycle ${cycle} ──`, "info");

      const getQ = () => Mods.QuestStore.quests instanceof Map ? [...Mods.QuestStore.quests.values()] : Object.values(Mods.QuestStore.quests);
      let quests = getQ();
      const now = Date.now();

      // ── Auto-enroll ──
      const toEnroll = quests.filter(q => !q.userStatus?.completedAt && new Date(q.config.expiresAt).getTime() > now && !q.userStatus?.enrolledAt);
      if (toEnroll.length) {
        UI.log(`📝 Enrolling ${toEnroll.length} quests...`, "warn");
        for (const q of toEnroll) {
          if (!CONFIG.RUNNING) break;
          try { await Traffic.send(`/quests/${q.id}/enroll`, { location: 1 }); UI.log(`  ✓ ${q.config.messages.questName}`, "ok"); } catch {}
        }
        await sleep(2000);
        quests = getQ();
      }

      // ── Filter active ──
      const active = quests.filter(q =>
        !q.userStatus?.completedAt &&
        q.userStatus?.enrolledAt &&
        new Date(q.config.expiresAt).getTime() > now
      );

      if (!active.length) { UI.log("✓ No active quests — waiting 30s...", "dim"); await sleep(30000); cycle++; continue; }

      const videos = [], games = [];

      for (const q of active) {
        const cfg = q.config.taskConfig ?? q.config.taskConfigV2;
        const keys = Object.keys(cfg.tasks);
        const taskKey = TASK_KEYS.find(k => keys.includes(k));

        if (!taskKey && q.config.application?.id) {
          // fallback to game
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
        if (!taskKey) { UI.log(`❓ Unknown task: ${q.config.messages.questName}`, "warn"); continue; }

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
        UI.log(`📦 ${videos.length} video + ${games.length} game/stream`, "info");
        await Promise.all([
          runPool(games, CONFIG.GAME_CONCURRENCY),
          runPool(videos, 3),
        ]);
      } else {
        if (!active.length) break;
        await sleep(5000);
      }

      if (!CONFIG.RUNNING) break;
      UI.log(`Cycle ${cycle} done — rescanning...`, "ok");
      await sleep(3000);
      cycle++;
    }

    UI.shutdown();
  }

  main().catch((e) => {
    console.error(e);
    UI.log(e.message || "Fatal error", "err");
    UI.shutdown();
  });
})();
