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
      nameTh: "Maximum account safety",
      badgeClass: "mode-safe",
      gameConcurrency: 1,
      videoConcurrency: 1,
      videoSpeed: 2.5,
      videoMaxFuture: 5,
      requestDelay: 3200,
      heartbeatStagger: 6500,
      desc: "Maximum account safety · 1 quest at a time · safe speed"
    },
    BALANCED: {
      key: "BALANCED",
      label: "BALANCED",
      nameTh: "Recommended",
      badgeClass: "mode-balanced",
      gameConcurrency: 2,
      videoConcurrency: 2,
      videoSpeed: 5.0,
      videoMaxFuture: 8,
      requestDelay: 2200,
      heartbeatStagger: 4500,
      desc: "Recommended · Optimal speed & concurrency"
    },
    TURBO: {
      key: "TURBO",
      label: "TURBO",
      nameTh: "Maximum speed",
      badgeClass: "mode-turbo",
      gameConcurrency: 99,
      videoConcurrency: 5,
      videoSpeed: 8.0,
      videoMaxFuture: 12,
      requestDelay: 1200,
      heartbeatStagger: 2000,
      desc: "Maximum speed · Uncapped concurrency · Fastest completion"
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

  function deriveSummary(tasks) {
    let active = 0, queued = 0, completed = 0;
    if (tasks instanceof Map || Array.isArray(tasks)) {
      const items = tasks instanceof Map ? tasks.values() : tasks;
      for (const t of items) {
        if (!t || typeof t !== 'object') continue;
        if (['done', 'claimed', 'claimed_no_code'].includes(t.status)) {
          completed++;
        } else if (['run', 'captcha', 'claim_failed'].includes(t.status)) {
          active++;
        } else if (t.status === 'queue') {
          queued++;
        }
      }
    }
    return { active, queued, completed };
  }

  function getPhaseView(phase, detail = '', summary = { active: 0, queued: 0, completed: 0 }) {
    switch (phase) {
      case 'connecting':
        return {
          label: 'Connecting to Discord',
          message: detail || 'Preparing the ZENTYR engine.',
          tone: 'connecting',
          busy: true,
        };
      case 'loading':
        return {
          label: 'Loading engine modules',
          message: detail || 'Accessing Discord client internals.',
          tone: 'loading',
          busy: true,
        };
      case 'scanning':
        return {
          label: 'Scanning for quests',
          message: detail || 'Looking for available quests.',
          tone: 'scanning',
          busy: true,
        };
      case 'running':
        return {
          label: 'Running quests',
          message: detail || (summary?.active ? `${summary.active} quest${summary.active === 1 ? ' is' : 's are'} in progress.` : 'Quest execution in progress.'),
          tone: 'active',
          busy: true,
        };
      case 'standby':
        return {
          label: 'All caught up',
          message: detail || 'Checking again in 30 seconds.',
          tone: 'idle',
          busy: false,
        };
      case 'action':
        return {
          label: 'Action required',
          message: detail || 'Action required to proceed.',
          tone: 'action',
          busy: false,
        };
      case 'error':
        return {
          label: 'Engine error',
          message: detail || 'Discord modules are unavailable.',
          tone: 'error',
          busy: false,
        };
      default:
        return {
          label: 'Ready',
          message: detail || 'Engine ready.',
          tone: 'idle',
          busy: false,
        };
    }
  }

  function getTaskView(task) {
    if (!task) return { statusLabel: 'Pending', statusClass: 'is-queued', percent: 0, eta: '' };

    const target = Number(task.max) || 0;
    const cur = Number(task.cur) || 0;
    let percent = 0;
    if (target > 0) {
      percent = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
    } else if (['done', 'claimed', 'claimed_no_code'].includes(task.status)) {
      percent = 100;
    }

    let statusLabel = 'Pending';
    let statusClass = 'is-queued';
    let eta = '';

    switch (task.status) {
      case 'run':
        statusLabel = 'Running';
        statusClass = 'is-running';
        if (target > cur && cur > 0) {
          const rem = Math.ceil(target - cur);
          const m = Math.floor(rem / 60);
          const s = rem % 60;
          eta = m > 0 ? (s > 0 ? `About ${m}m ${s}s left` : `About ${m}m left`) : `About ${rem}s left`;
        } else if (cur > 0) {
          eta = `${Math.floor(cur)}/${target}s`;
        } else {
          eta = 'Starting...';
        }
        break;
      case 'queue':
        statusLabel = 'Queued';
        statusClass = 'is-queued';
        eta = 'In queue';
        break;
      case 'done':
      case 'claimed':
      case 'claimed_no_code':
        statusLabel = task.status === 'done' ? 'Completed' : 'Claimed';
        statusClass = 'is-completed';
        percent = 100;
        eta = 'Finished';
        break;
      case 'captcha':
        statusLabel = 'Action required';
        statusClass = 'is-action';
        eta = 'Solve CAPTCHA';
        break;
      case 'claim_failed':
        statusLabel = 'Claim failed';
        statusClass = 'is-failed';
        eta = 'Manual claim';
        break;
      case 'warn':
        statusLabel = 'Skipped';
        statusClass = 'is-warning';
        eta = 'Skipped';
        break;
      default:
        statusLabel = 'Pending';
        statusClass = 'is-queued';
        eta = '';
    }

    return { statusLabel, statusClass, percent, eta };
  }


  const BRAND_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAqOElEQVR42u19eZRcV3nn73fvfe9VVS/qllpSSzLesMHYmCV2gsNiBIQhJkyAgDQQAgmBA8kETnLCzCHJzEm7meRkcpjkkGQSskHIGZMEKWSGZSCTzTZhM8Yk2JaxsbGwLUsttdRbdVfVe+/e+80f333VbU8maPOW+J1TanVVdS3fd+/v238XePJ68nryevJ6NC8+KYInryevR3c7iFCeiF9q+EKP3Mc/6wqYmRGzezcMAOzejWgMo8gTe4VGEe4HzIEbQOxGnCXj404B+/aJ3bMHwn/iw130/VJcfTnyTZ3ljDAGGENddZnlY1KWkB67Bqvrz1//7xi6q10AYxgbBfolpN+HrHSBThtchT7WXMGD7WKVJ5YkRg+OjgG2PyahDaLbRc+Nydj6SwMATB8CALENAl30/VhczSCrCwgL8/C4BSXA8BChEXh9FLufD73/MVGAiBAAG8H/+acGF2/Z7l7orHw3jVzsPbbGiLEoaIUouUQyRCAEoZCIARIi6L3o/ZHS7JgQhCL6uAgQAQkREiMgEYwKDfRRECIgAkQhQ0QUALUXxggIgBCJKAIfBCKAREoEEURAUoRihBTjINGJMKdHITU7picjOOFb8i1fmFtWJX5h/1X5LQAwI2JmAQFPH6LcmcJNErx8+q/737d5a/azrZbsznLb9gHwHsgCIDFCRCAAJApiVN2LEDEKhIIYDIIAUQCJujREiBCBGAQRRBQgiv59iLoUm/9HSY9HfY2kzPTYUDnwQd87RP08QQgIIOm1IgBLAgaAtTA0sBGgxQtsC2/xTnDRt/wXDwf59Vny40NFnCYs8UyEPzvLODNzfPxFr9j0gakp91YAWDgxkCynn5qgjI2S7QLMHACuv1cUXZUqUIqk1R7TKg5h/eY94L0gBBWu94APQAgC7xtBAz5QHxOgjkBIr1NHfX6jmBj1JtDXilGaz6C7LA53BIUALUUMJBoIM8AUYrPpwso0cEzCx//yvtV33PH8iYXTVQLPRPi/9sG1XZc/u/jUjh32uXOHy5oAzjvHmF3byHYOwKhw+hVQVoK63igEQQxMPyE+qAAkArVXAcfYrHAZrl4fBD4JcSj8JNw6JOXERsGE9wo5PipchbQDm8+hcEfECIkQIu0WGhWNGHWCjCPoAFsAsUCQDmJxYV5083DgG0vVNR+7uPPA6SjBnSbmYwmLE+dfnH12You9/OC3B+VoYbJnXkJsnSSCV6H0K2B5NaI/IHwtw5UYPCABCF4aoTIEFVgIQIPpPgp8sgEKK+n+JGQgKSGsw04MAgET7gskqiDroK8hYIIjUaiT5GVK8jWHaC5obJGxhBAwDmgVgmIE1hla+XY1mLwwv+xpE/knX3z70RcB6EGEJ2ET2LwTT8fb2buX4cN/MbjuaU8v3jQ/Xw1yIr/iMmL7FsLXuvJXBoJjC4LBAKhroKqBEIi6TtARGiETdVrVG1evT0oUADESkrC/gQ+JjUJUoPo8hZ6HPG9oF/Q1UlgytEcEYKg3kGCyDRT1dgCABiAJY4HMCvIW4DpAvomox1DxGXnraOl/+/3bsnftE7F7T8E74ukI//0fGlxzySXFZyRWVbcr7jmXEJdeYBQ6ABxfEcwdU+H3B8CgVuHWHqiT4ENQvI4Jq9eNqX4sHwRxo8EUVUiz8jf+nWxYUg28NOurURya1T+EHYGlQo0qQGCYDJWI2mDqYxB9rrVAlhM2B0wuQEHIGKTcbmK905h7grniuu38+qlA0SlB0IEDEGDGdEb5i1kOmTsauW3SYHqa6HtgbSCYOy6YPw6s9gWDiii9rv46KNzIRmMoG4XGoTBj1N3iYwMjgAy9IrUNEgFp8EJ0uUr6e9VI2hkBoFAihQo50jwdNESWVr8BYQFYCjKj/9f7VTHG6O82/aQQ9UDgI0ErMdthsilW7wTw7xUDcHYVsGef2Nm9DP/pA70XbtnsrlpeKX0ItNu2qPt3ZEFw+IhgcVmwWgJrpRremGClTt6LLk5uMIQyxORGCfqYCj5GJjHLEFJkgxAb+T8Ev2UdfiQAxoiu7fR3hgS5Dj2OgDNAbgArhDXQFZ+8UTaCN4AxClvBA9FDYi0QQ1PNCbKd5mVXfFWyWbI+SVtw8gq4dKvuztFRu2dy0uDIPIN1MMYJDh8DDh0BumuCXgn0SqCsgKqUFAABtaca18Ynb5QhTAavMY7rnslGbOdDUjKEpJUJ6I4YKmL4XFUU1zcImCBmKGAjsAAyQ7ScKsKIPuYAOJsUAIAUWksYRxEKxBM2Cn0E4pqY+qgXmcK5O3cNzrkFODgDcHaDST9jBVy7G2EWM6bd5gujAINS7EiLWOkCy6vA/LK6mWUNVJUqYFArLARR46w7gOuGMTRCZbNw1VA2/gETtosgJmE3wgU1yMJQYRhCEB+WNsAGo2pMirEM4AxRWCC3uvpzmxQDVYalqB1QT0iMUSj0IIIAGoISoQL9CoILrrWljR0ADt5xkvbVnazrSVJe+47V6VYeL67reujWHV0EltcEaz31XMpKlVAHINQbfHWvuK6eCIexAEj1Mhro4Dq+69Zn8lr097RhhopprG+zS0QUvFN+ZF0JkuBmqABBYYmckrA/CVokKUd3RmbUIJuERQIAQVAFgIGIASgDUPchnUhIZPusxwF798IACNPb83PabTtG1IEEV3qCbh8oB8CgxLrBrVPuJYpipShmhpBcPANIrfgOAsam9INJrqHV9EAEEJNyaPT1kITRwFUDQxu9aoo+p3mIou9BKnhlDhgpDAoHFNaglavAC0vkVnRHOMKKIFQRvlR7RKMpkRAVqiSIfl8YKfsgK0HZEc0l7j+LCtizB9i/H8gybh0ZMciciXUdbVmr4KpaMKhU8N7rz8bI+lqFEwMRQ4IVI6QQwacFVSdhJXyhb+TJ5K0AtLrdG2XJBgeoEXzULYTYCJ6AdUCWAUVukBtBTsKRqHoBK6se/dUS/bUag34AROAIjBQWE+MOO7flOO+cDNPTFhRieTGi7EO8gCa50pUn6ghEwlYM/SM2HAWAS/dAzrobGkJwhg7WKqxUCfPrWkP+ugK815SBNBAUOPRcGsNKUEAwDiPRxkim/HujCG7wdNI/arxVqdZQxKgVUcNKOAe4jLCWsKQGuT6id6LE4opgZTlgYbGPleUB+uUAlR8gaoYOBoSBgaVFxhw5c4y2Hc7fVeCFV43guc/J0VuJrI4CVgDx+nl8EDGbclaZP3Tjt1oPAsDJGOCTVkCzm+pK1haWgKlJsJURiyuaZtCkGYdJs1AB0TdBEodu41CR6noKDYdZORquQ8YGodOuK8ZY9ctzRzGWoAEbuAoe8JWgWovolkHWVmv2V0v0VgfodruwaCNzowixRkQNmACXaY4HYofekwFhqQY5g9qpe++r8e2DXXz15gKve90Itk8D3XsVI4MXwJhYTEFWKbfgStanEg2flAIuPaDa7C7w/geP1PVlF8NtmUB8YI6sK/3ivlYlQJosY+NiApJc0Q0VSkA0+UKjsNLsAmcBl2v+BQ38NLY2AqGmrK0CVRlZDiIG/YCyF1CVHmVZo649fAhpBQT4MMDWTZuwaWwb+qGCj9QgzytoIQhEvNqlxv0F4WMAUMOBaBUObWfw7YNePvQ7a/yRt45gaqvBkXvUEJmW0GwB+6X8HwD47RtOPsNwkk9USV5xxS3uxa+//LZnXJI/7YJzqnDoKMzdDwBLS8CgJ+u+fdwQiTZeCNchxRlFEa8LH7Qqr+DXA7dQA1WZckKVoKoifBXhQxRfB4YYgBgg8KBE9QmTcRAq5oWq5HnbN2NqYgq9EFFD0CtrDAZ9BF8ieI8QasQYEIOG24RGuRTAwCCjg4VFyxQYzTKwsrJl0vD1P9LGNw4KDvUYy120/efI4u2rg0s+f/X4/MkGYadgAygzM+JmZ6+sr7qm/Pg9B/ELSwsStm+h2bUJ2NwCuj2irJK7WVF8BMpaGOqN6WfA18TAC4PX6DimnL96SSnBJhCJAoFGZzFGCFTIGhBFWBMhEofeEFM8YEgt4ISalz91K7ZtncRaFTHq1GDKWoaIgLJS7ZtISIgIITT2CRQBYyoQiCBKRCUV+h6yqWWwMC9y4GueO5/hcOjeGEfOLVzXlx/7/NXj849cMi51Nvzg21e3XXRe67ZOi1sMvG85ut6aoOwToYYM+sI6BV0hFUxSCXFD5UrTDk3OLBISU31RTYIgiV/TFSEJWx3TZNDV0otExBggEDgD+MqjsAFXXr4Vo2Md9EIECqIWYHUFWFsVrPUiynIAX9eIwWudE9JUiNDkpiUKGAlEVVQmRMvkyEOO83ZmeNE1hdy6KOhdbsIDITzroy9r3XWqNYGT94JI2btH7Kf2jx39if84ePtoJ//EplGXT47HMjOw/VWyvyosS6KqkG4C7ym1FzapZl3l1ExoUz4UXWxNNtRHqoKYKmSRiGIQkiZlqASFcYkCY0XKQc3tU8TuF0xD2EKvDNg6QogBFroaJGYVkQcDMIexhPdmqGBAPSbdCQI2NdIIMBLRA5UEGBOw1HWo+xI2PTXPT5T1hz76itZd+/ad2uo/ZTd0/36GPfvE/u5efvJn/vPannZefBDIpkbHgKnNlUAQ6gpSl5CyFPYHlKoSVBVY+6YeoO6rl2HJUXwAvBbmNYIWSh2Fjduqri3hoxGRyOBDyilFxAgYQ7O22ucFuwSv/bfTWFh10q8Cz9lOuAxYWQO6aymhZoEso351Cow1kBg0yJOIYAXSJKSs1rNjHZJDYACvGVkfRWoau7zml44v1v9FRHjttSfnep5RRWz/XoY9e8R+4Jf4529/99qXXczfVfXkle2CF7fbWavIgTwHihzojEBjgw2rv6pSZjQClVdj6z1QpUpZUgaq8NCyY11rfTemWKCOQKgjrBWcOD6PZ11swutfs51ziwZZEbljm0GRC5bXgLKvEGgskLmmgkZkdDAhIkajdiZEmKQAiYIYIqJPQSAFFAtrDUxtMTLiQhxz+fGF8n0ffefIoVdPiJ2dPfU2ldMuyu/ZI3b//uYNhb/6q+VFeS678txNFI6tyGBFIM0qDwDqQbDeQ8RYvb+2UkpgCBbRgzEAIQQEWM0f1envYjA+IArBGAJqCeJ9TcPo5ufLlVdd7V7/spdOvvHIQgzew2yZIHIHLHeBw/PA8UVgpa9Z2kEfKEuBD0RVi3peIslJUIiLQQ0/RBBqj+AVjhwMRvIWimDDMy4cyUYurG95z5Hsqn2XQfbuRTydDrrTbkvZv59hZmbGANea2Vn6974XdwO4+9HuXFs8IrvnVvDyex+sYmbBnVs1kDqxKDixCKz1mEqbKfFnAWvVAXCS/GKvrT0aGBqQEYwGMQTAGJABtAbOZuh0cpne5Og6dbkykB/HLP2BGTGn2754ljrjhDMz4GWX6esdOHDmr3vDP3PHj/0Y3FvfysEXP1++qT3mrptbCHA2hm1ThoaCY/PA3HHB8iqx1hf0a6BXE/1Bqsx5oi61mpV2GkIYZn4RY4SvA6pBrfYgRFhj0LEtPGVH5ndtzvKVE/3/8Evv7/xaU6b9V9OrLiKOpL/pi+Wb8hF33bEV79uZYMd2Y0IA5uYE8wuC5VWg1wdKT1VAytRWjZ0JgK+SR5ZSKEjNAFXpEeqQ2vAEJJHTYdvmzD9lR54vP9j/37/+G51XaWxEfybfxzyRhP/Vr341I+m/8uXyza1Rd938ivfjI4LznmKMgWD+aMTioqDXTyVDUDvdnKY4bJYKMlZvLtffrQWs1bbFqgzaS5TyILQWzmYY35yFzdMuP3akPnjsRPvHU3vOGTfpuifYyq+/9LnyrXk7+/CJbl1v2QROb6OpBhHH5oClZWBtAFQ111taNL8gxhJGmoSeVr0IIFrNY2khSUSi5iMo1LoEDNpjNk5OG3PieOz1F+o9f3JdfqwsNzoh/8J3QAM7X7yxfHtnIv/wSq/2U5PgU3bS1ANg7ogKv9cHyoqoNZ7QlJTh0K2ntntqYSVqrqnfA3olpPYUxtT/Y4zQ6OovRo1M7aQsdK09tlj98J/88cgtL54Rd5rC5xNuBzTC/8IN/XeMTOS/t7xa+akt4PR2cnVJMHdYsNIF1vrqVkbtpkMQoU8NuyFy2JdUloJ+HygHEVVJ1IEIAaQI2KRHRNPc2Shl+zTDcp3lR8vBT/3tH4584sUz4m48fdyXJ5QCEubXf/935dtGJvLfW+1XfucOctsUuXQiYu6ooJuM7aBO1akgwzbFOggGnuiXgqqkDGphOWgaflNKOgoMIRIUeqyjkKBtA1O7GJaY5fd3q/d94f3t3zlD4T+xvKBm5d/4N+Xbxrfkf1j6yu+cJrdMkgvHI+bmBCurwGpPcX9QaS/qIAC9ClhNHXl1SE1elQzLpZK6NGKaFaCBIBKk0DjAtYGJbayXWnnxrdXqv9/03uLdKnyEsz2u9LjcAddfr8K//q/828cm7R/4WPnzzyUnNpFHDwfMHwO6XaA3AHqlYLVPdAfaDLZWEgMv2iZZa3ezhNSJ7QUSmg4KbTc0BiIRFApsBrAANm9HvTCSF3ev1v/j5vcW796zT+z+vWdf+I9LBVx/vbiXvIT+bz5Tvm18s/0DmMpfdCHZaZFHDkUcn1eDu7wKLPeIpTWg2wf6yc+PUAiKdSqKyYaZA990SchwXMGktLdxAtuhjE/BL0wUxV1l/Re3/Gz2o3u+LHb/ntNLMzzhIKgR/mc+Uf7olm35R1qdyl94IZk78sEHFHbmF4GFZWB5DehVxFrqO41pSKNOTb0xpb1DEAQ1tJCgMoypocoZES2JCk2bMjotYWlLkd9Whr/8x++xr5bLUDOl4h+p72web8L/+J/13jA+6T7SGa39055GOkve882Ab90rOHgIeGAOmF8GugOgWwqq4YxBypxWQPBa9w2VQAIhHhAv2rodtHpptF5K5yLzDmRsq/jlLUV+IPrPHX3W0dfJM1nzWvCRFP7jBoIa4f/5RwevmZxy141NhPD0Swx6q5F33Rkxd1Qzmstr2vzV98AgpbTjhvmwUDarX1d9jNRVL6mRSgBjKCJCWsBlgCmI9iT8yo6iuFX8TQd3ulcvX7mrxxkxmD1746iPWwU0wv/IhwbXdCbcx6a2Cy65hHJiPppv3BExfxxY7AKrfaBfA/2mhpxcTREgVNqgqys/KSFqk1ZT5yQIGohEoU1pCLaI1mbx3emiuM2EW46fs/bK5edPLEFSSvRRuB5TBVw/o8L/zd/sv3Ryyn18eqe4iy5GfOA+MbffHrGwpILvVUn4fuNQBrUcmTybUDeDfNQEWqrpQhqcFTin6QXjBJIDrUn41R1FfqvxX39wun/N3PMnFvbsOzvzv4+lAoiT6AqbmRH3kln63/hvvedPbXWf2DodW+ddgPDNu8TccYdgcUXdzEHQjGZZa7myqeRL3NDGkmbOELWKrx0qTK3looMVFpJ6jiRmpNsEvzqd57dl/vYHNrtXHLt6fB77xO7/zqnl7/T9+P+Leh8tBZyU8Gdn6X/1l8rv2rTNfvqc8zC6c2f0t98m5p57gYVlyKAC61SaDEFLmyJaHpQ6DXTUGHo8EIBR4ECJIoREzesQyCzgHJkXEORCjMJ3txf5bS1/x7enypfPvyQ7in1icXJ5fTnT7/+YQtDMzPVudpZ+5ucHl07uMJ/Z8RRMbtns6wN3wN5zELLWA3oVWPn1MdIG19l02fk04eg1IWySWylRYKgNtrQUiWBugSIDikJgCoId1se35sU/ZuGOe0bd9x1/STa35+RWPp7wcUBTR37PexYvuPCi0eufcqE7b9tUVR28L9r7DhH9khhUkd4zBU3q3TT+e9NHKpGpd/2hkNTMDThDcVZAIVsZ0G5B8jYYcvFHJ4v8lk64455W+YoHXzdy6LEU/qO6Axrhv+Utx3ftOn/0s1O73HkuL6vbvwE3N68DflUAQmUQa4GKD4gBZNTIVdJKN2k6ZdgzOmzoZRrCEBYZpXCQTga02kLToj80WuRfd+GuuzvV9x9+7WMv/EdNAWmyPrzqVTL1zOf6z27d6Z4eWZV3fhNufkFrs3WZWs9TC6NEzZE1vZoQhRpDbR00aYBO4vqMr6HAAWhlRCsTtgtIqwCKFuvDnbz4WvTf/Earfvnh13YeeASEz1PF/0dFATMzYt73PsZnP3tx4qoX1n+5eTq7vFeW5cIcssUTkNoTIhBfgw2MSMCwgmJS95tp+vfTEIVNHk4zjmQhyNJkS+GAkQ7QyomRXPxhmxdf7vu7/rFTfd/hNz5iK18edzugEf7U1NHR17x29NNbd7orlpYH5doq3dIq4GvtBZIISuNiJmxnMyGDZoYrjZMCyJgCKxDWanu/E2GeUVo5MFKA7QIYLcQvSFF8tRcO3GqrVzz4jpEHHw+w86gY4ZkZMddeCyEfaL3353Z+6oKn25cdXx5UvVXaXh+oUle5DKcNdeVLWu0UnWJ0RgclMgJ5M0TN1A+ahviMg2QWUOELOy2ik0u9Gori+hP+wOdi9W/+YXbk8BkIn2eyyh/1ZFxD6EHC/vTPTO8776n2ZXNzZblw3Li1NaL2Ol0YUwC18caULHNpe2YC5BC0CORqYGEhOlaaRktHM3AkA8YywUgBjLXE11IUXznqb7352GkJnw+7PSLCf4R2gHDfPpi9exne+c7qT5/zXdkbjh8vByeWkVVe2bIi1jubmfrTIcpxYoQKNSQyC7QMUJgEPw2nQwNJRrkb8gLiGDFSEOOj8JUUxecP+q/93bH+93/+j8bnH9pGedKr/BEV/CNkA4QzM7B799K/4x3l7z7zmdkbVhar8shh5NECQTRfo22AGCbLmtxNM8neDFJnRnTVN4PTiVijoRYwGaTIBG2ncDXaEV+FVvHFe/xNn/167wdu/ttNJ05S+MD/O+MtTzg3dGYGdnaW/iffXf7K056av9OZurzvIF0ZBXDaKDVcWmF9ul1nlxrqGKYhakhmCAOhIYfcDTbtjjwH8lyozwNGR+FDbBVfuru64TNf7L765q9MrezZs+8UeneEj0WNyp1Fo+tmZ+l/6qcH773gvPznprfW1RduDNnKGmFyILMUQyKKMKJJE0uKXtWgCtcHrZPfT5uMroGADmIEzHNBkWsHdGaAkTZ86Yvipjvrz/7hJ46+7sFD5/ab2OMU0FiesIFYI/y3/2T5tvMvyP/rRRf46vZbxB47FmA7Br4kIkhj11PszbQ7hDAph8DGLSAQaiFcQzugPTuOQJZB8lyYZwILSKeA79dF8ZW76o+/74PZG8lz619MlGp4Alz2bAn/zW8dvOoZl7o/fdrFPviBmM/9TcmACCG1EtgMaidwNSltHyOH+ZyGvaqBmpzK1+AMkRlNMWSOyDPQOaBT0K8MiuKmu+o//uXfy94kgihy7RNG+CcDeP9seN0YuFfvKZ/zvKvs3z/nWbEz2kL8/PXBfOnGPlpjBh7rDBnGWRhrhq9sDQUQNr2ajirowgAtC7QzQccRLQKtDCjaQO4AZwXtFrFW5eamO6vf+cAf5e+amUF25Ajkrh2Q3acigd047Qb6O+Z3y6UHIGeicJ5plHv11avTL3h58aUXfq8536H2ltZc9/sDLJ7wMDkQCDBTgh4xVHEn1hFjKAagTS6ngyqg5ZICLDDiVPitFqSda5a506Isrtjq1nviz/3Wn+W/9XhYxb94vbjZ3QinWsR3p+tuXnYZKCLuWd9b7XvuFe58SFm5jK67JFhZiDCAhBqIVggEiBhEUicck7EVgMYYWBLeWGQ2hQRRy4YOQFDuMIlBWHnIWMF4/6J1N82FW1e22RNveI//CTGILgedRaQLYmi1udlBrAHoIDZLoYYJyFoAnaXESJMBRaG73GagzVKnXKbfVJ9rBC6aUECilQAHHzP0Ssej8z6778MX8r7Zl2jL4iM3pvowd3PvXvq3vKv8zWdfmb+oXVRVb41urA0M1gRSAbRCMSmzKUAMAdEQQoHQ6AgqBBQDYw2CgbLnkhCrZBiZBWohqlrojKDILO46Fs3NJwbRbcmumujYq4wDsnydGcUZq/Bm9XeTflqjtJPGWr2fAE36v0GT7dO5AQsl/XD6OsoXZ4c2KiVn0ffAJOre++b8nceIj33ym6t/MEsunooSeLp5/de9tdx7xfPyj11yUV2FSlyoBVtGie4i8LHfrSCIqCWgZkSAIBpKoDAAkIYUVQRCwlgDSwNnLHJjUFiLliNGW8RILphsCybGM7nz/gFvObwEyQR5novJsmBcBptZOGfgskRP4yjOaKuhNVzne8tAlwG5E4W4gpI5oMgErULtS56DnULzSq2cyJLNyTIdb3U5kBeAOHBA8kQFdwgOi5uBB0O499aF+Oa/ujj/4skqwZ1Ggi1e80Nr5+x4Cj947rkh+Fp7nAaVcsZNbjEYm7ToLWjKIYjAp7mrgKAjJYbDYhYsEjwZRKWsSv6phakMiozoeYeb/2GR3zpxHC43sN5C6kiXB2dMQG1zWJfDOaLdUqHanOgYoO3AyXHBpjFirAOMtIBOQbQLoDAQ5wTOKeqYpCjahthPdKDD6E9C4ITIonporTZw8STD0V4dbzsUg5soLuxP4LNL3xx877XAN3ASSjglBdxxmbKkv/Hd/d+47PJsc26rqq7hfK0NU0s1cO5OwbOusvjSJwXtFiT6yCCUIJENX6fEqFifJuGVA8JINAIxhjEaEECnleH4SsCXD92HE2sLyLIMEQUIC2stCskxMlJgbMRhyzixdTOxbVIFPt4G2hnRyjRhZxC1eB+0qB9KwkdhMMDAUOnNjCg9ThrikMTmZRJri442CWyCqPR/dsZpL2rTrjxYlhdeWIwvj8bfJvHSGTmLENRAzw+8qb/7mc/Or7/yuaGuymB9IFbXtFzYyoAd44Id2w0+vU/wjS97BNaoTUCFiCoG1BIhCKlLUJ1/ISGGQhhkxtC5HBkdussrODR3GMHUGB3bhPHxEUxsamHbVBvT23Nsm7LYPE6MtYF2FmFToT4Gbc4NNcXXOu3VUNZbXemkSUI0HNJRGkeYTPNUNOssXsPfk9BpOLQNQm0KNi1irQXcZRHvPceav14cfNeBp49+RxLXk6etvFQRY9u0/fmLLjKIUsMHop+44kz6gN0KGF0RvOaHiamdDrfcACweN4APupKS4IVKVeklpjhMCEaIMwi+RC+eQNYZ4HkvmMKWbeOYmmphcpND0Tb6xSMkhsieF6wu6KpGSJWyoO6sESGjILNKxCpRYB3oouabYljnAjUGYC1guYG962EKMBaqJKvfteEYCgHoLwmwiWi1ECetddPt/OoDwNdv+A4kru5U2NKv2VNePrWVL9u8yYeqgi29Tp/HRMQXDFAbYK4rWOsLrryKuPQ5Dt++x+L+eyOOzTlZWvEsqyg1IukIVxhkLYPWCDE6btDpEHkbyItNyPI8UaMJBl5waCmgPhEgIIzXcMJYMKcWbVyA5AQzCnxDP5n4JiwJI8JYA9Eos4rhOrkfsYHobz1aH5IMPtyzok3kglAFDCr9nG7KYDQAm5xc3MR5N54FG2AAxE1b5dW7djmbZVW12qcbVDqB0jDLVlGLKv0ALHSJQ8eBdiEY20Y8a5dFCA6DKof3ibxDtKV8EPTnWino9QWrPUp/QajsVxsT9BwaSkMN4CxU2I5AQWEAEYxW0KxoIBhSMD6cjCQhybDaKOsrPn2XIdHrw/hHgxHYLO0Aw6FiQlgnKI8jgKmBzHAcAC77Dmntk1VABID2KF+6dQtgAJa1cvkjfZkQgVgL+j1gMKCSMQGoFhJ1pU6lUNKKibUW5KsQUQdgUGp9mMRwVLSx0g3rVrNizTrzFiw1s+0A0FG8CD01j5eLZkuDhoIwqa4QrCA63R0B6/zQ5IYygCTYSVowBIwoYWu0MqRUayj0tTuPkAqoBegHDgDgwHegL3MnE/XOzjLuuOLBzugoLxodEUSB8V70+I8UUEUQ1YBYWQXqSj9oHZVRMXgiNs2zYb2l3Is2WSV+UUHQSjuxga4yaZ9R6wlpsFqPvaBATOrPUuPCzBhEALUIagBFk+KARtbeaJkzBlVEs6NsstTNe8oG/tGGVT1EScladTqYCKVCKicov52gJNCrcOyfpFw4ZQWkOtEzLt451mr5MeeCVrWMstlGUYK9qgROLOvAs3hIGUHvgWqQBuJiqgGvt5U31RllJgtCrZI9lCM6aTgdLZK45YLQmmTFm1XK9B5WV7tNxj54whmtIReJGzpGhSO7QfjWyZAgsBF4Yw8eUhlOoUrcIJ7I9JkDRRxl1QDLdbzzrKQihnW60HOks85auOQnqxumwxCLK8BaL00lVmCIkLoCyyoRYaSVrlzPTFirk4kbGOdBS6UFjUI09WPZwBGd2BZ1rE7f34AQRvV0vLLtumH3oqT0BtUWMLGkAzBB0w4xHbXCJl1BgUVic0z3N4W7dJrTOnEsN3BUO0o5iuxI39cHe/JVALhxN84sEGtWwfJiuVrXri80Y51WQCsD+k5X5Moq0O2lAxoG6SwXD6W09Dqx0hygsKF1Yp3bGetGjw0/HTew4kpz9JS+QkynXEiitLeMw7MEJJ37IonrOTZd61ENc7QKjxYazQq1/1TjMI10xeorZ2TirdPdkdzfYU2jgSsSEEOJbZHu1pwnyvrA8f9Z3JM4t880Ek4jPeTydz+/PNhd49btU5DRDtmvBb0B0V1Type6TDwNzRElidy6OQlDsH56hWm2rcFDCbg1bgKtSIzp0AVDQYgbOufWSf0accT0u/YMJR5qKnuuKEGpei3pSJRoMEwIxuYcgUTuMaS/j+ufr+lDbQpHw2NNUvRcGcFglHF+FJxbwp9hlnH3bnGph/vMvKBrr4UF4Fe7uP7+B/G8c7YjnruDpj8AjpaC6IlQK+mFHmwgQ6ZESWeGxWZipVkxiYyeCdtFOTXWvRAvw2qZSFDJYOP+l2EpV0Tb0psGXaTTMcDkrxOQxA/h9aAwZSNPHpRtbI9JVbu4YUdy3SOyfFjM4ARZobZwyUAWpqy7c6leurMq/yjBTzhbjVkRABbnBh/+1sG6vONuYzILOX8XMNnR7jXxxLC9cEOWgxsgpzlgoTnhKAalB/O1EiT5oJQxykMt8HVA8EHHj3xEqCJCHRB90N99hK+jzg8040tpZLUZ1lMKZQ4XxDrMDTPQw6NJLACbek+dE1grw9R0lihvMqfZ0KIDjIxpvWDFAIvj9PeMWHtfN/7K2gvGju3ZJ/ZkijM82TJk01m296f6v/yMZ7Z+YWqiGpy7HXlG4vBxwTcfAI4fB1Z7girxMMS4YaZreJJeWrWkcMhtrLxtxEOPIFnvmsCQSI/peUaaEzBS1wSberKmn12CH5vaG50xyAyQWWVPd0ZQpM46l24ZdXIyz1NfUqYCt2mi0jkd7rOZ7t7+QLBUA3MW1T3nFa2v1dX1N3/kEy/fs2cP9p8khxxPvg4s3LMHZv9+8N+9u/pf512Y/0Buqyon2MnFZg4oa0qvBFb64OoaMKiIXtmwqq+ffBRCQ+pPiV7ZcXV3xA0HwjysYSTFfIwaAZtm9uvhTVuGcMYMC/uZ1bxQo4jcqRfkKCgyIrOaK2qEneV6VNWQhd1JOrxh/fSmOigvRbdmOJYh3r09L+5p+duOxMHL7/3B0WO8FjzZEVeeailSBDj//G8X3/PKXb+/ZXv25lYB1P0yRI+gPTxCL4Yeer5KmfjYggB1GqqLQ0+GEtRLIknExLKk3gWHGEltxpKG49uBsIbiKBx2TVtNSxBpJizhvAp/HWaa6NlQBetsgh+T+CMsQaMp5w0nqUBIiXqQnAxIWYrgkSLP7t8BzLfCZ++vej86t3d8Hqc4X8zTqQc3W+sVbx780OiY/dl2B89vjzhCgLJMp2hUUafYfUwnJUny6dNqZ4KdsG6sG5gyqS09ygYlAOqbN0FSQ8DUHDHVNHgJYK2BczonbDcYTT0/hsO0g3oxmlq2zYSNSUpIbyCpFzJaoiZQFUC3BZxoAYvj4c7+ON5/62vchzVreerD3TwTlsSmHePFb6iuHGmbF9ksXmmsPFXIKYnSpkUWIkwMifI5dU7rMVZRNpx8JCGKIQQ0TMkfEFH06crrSZM8VEOm45jWnaqUuRhSGpN6SIRpXK40UwCKFgOYkkDDhlSKmLS9HEQcIBkhTmJwjD6XKhRcDC0e8iNy22ACN/Q67oZ7XslyyNN/GrQGPNO5r337EPnwN75U8qdPoMgN3EgHDGGFwDgwBkTfpXFjAqwgetL00//b6kQaNybRdwmMwfRXxNpxWf/7FUQ/TuMg6K7/DQCMYgxIBzyHdpfWQYAxtH2XAODcmDQHOftaX99lEF906bIx6aILjAHtHOwXY9IrIDHvsm/GYuaW4omnT5SHXsD+w+3TmQ588GwNY9wAmG13QPbvQ3ykCS4ey2v4XS+D7N975jQ2j1ArsDzh+EhxMuef4l/uwnryevJ68nryevJ68vpXd/1fnxG0WoOLMJsAAAAASUVORK5CYII=";

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



  // ─── 5. DISCORD-NATIVE GLASSMORPHISM UI ENGINE ───
  const UI = {
    el: null,
    tasks: new Map(),
    collapsed: false,
    currentPhase: "connecting",
    unreadActivity: 0,
    confirmingStop: false,
    stopTimer: null,
    themeObserver: null,

    init() {
      document.getElementById("zentyr-root")?.remove();
      document.getElementById("zentyr-style")?.remove();
      const pos = Store.get("pos") || { top: "24px", right: "24px", left: "auto" };

      const css = document.createElement("style");
      css.id = "zentyr-style";
      css.textContent = `
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }

        :root {
          --zentyr-bg: ${CONFIG.THEMES.dark.bg};
          --zentyr-card-bg: ${CONFIG.THEMES.dark.cardBg};
          --zentyr-card-border: ${CONFIG.THEMES.dark.cardBorder};
          --zentyr-text-primary: ${CONFIG.THEMES.dark.textPrimary};
          --zentyr-text-secondary: ${CONFIG.THEMES.dark.textSecondary};
          --zentyr-log-bg: ${CONFIG.THEMES.dark.logBg};
          --zentyr-log-text: ${CONFIG.THEMES.dark.logText};
          --zentyr-glow: ${CONFIG.THEMES.dark.glow};
          --zentyr-brand: #5865F2;
          --zentyr-lavender: #A78BFA;
          --zentyr-ok: #34D399;
          --zentyr-warn: #FBBF24;
          --zentyr-err: #F87171;
        }

        @keyframes pPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes pFadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        #zentyr-root {
          position: fixed;
          top: ${pos.top};
          left: ${pos.left};
          right: ${pos.right};
          width: 375px;
          max-width: calc(100vw - 24px);
          background: var(--zentyr-bg);
          color: var(--zentyr-text-primary);
          border-radius: 18px;
          font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          z-index: 99999;
          border: 1px solid var(--zentyr-card-border);
          box-shadow: 0 24px 48px rgba(0,0,0,0.45), 0 8px 16px rgba(0,0,0,0.25);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(20px) saturate(160%);
          transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
          user-select: none;
        }

        #zentyr-root.is-compact {
          width: auto;
          max-width: 320px;
          background: transparent;
          border: none;
          box-shadow: none;
          backdrop-filter: none;
          overflow: visible;
        }
        #zentyr-root.is-compact > :not(#zentyr-compact) {
          display: none !important;
        }

        #zentyr-compact {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 9999px;
          background: var(--zentyr-bg);
          border: 1px solid var(--zentyr-card-border);
          color: var(--zentyr-text-primary);
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        #zentyr-compact:hover {
          border-color: rgba(167,139,250,0.4);
          transform: translateY(-1px);
        }
        #zentyr-compact[hidden] {
          display: none !important;
        }
        #zentyr-compact img {
          width: 20px;
          height: 20px;
          border-radius: 5px;
          object-fit: contain;
        }
        #zentyr-compact-label {
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }
        #zentyr-compact-count {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: 9999px;
          background: #5865F2;
          color: #ffffff;
        }

        #zentyr-head {
          padding: 12px 16px;
          background: rgba(0,0,0,0.18);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--zentyr-card-border);
          cursor: grab;
        }
        #zentyr-head:active { cursor: grabbing; }

        .zentyr-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .zentyr-logo {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          object-fit: contain;
        }
        .zentyr-brand span {
          display: flex;
          flex-direction: column;
        }
        .zentyr-brand strong {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 1px;
          color: var(--zentyr-text-primary);
        }
        .zentyr-brand small {
          font-size: 9.5px;
          font-weight: 600;
          color: var(--zentyr-text-secondary);
          letter-spacing: 0.5px;
        }

        .zentyr-controls {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .zentyr-controls button {
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--zentyr-text-secondary);
          padding: 4px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .zentyr-controls button:hover {
          background: rgba(255,255,255,0.1);
          color: var(--zentyr-text-primary);
        }
        .zentyr-controls button:focus-visible {
          outline: 2px solid #5865F2;
          outline-offset: 1px;
        }
        #zentyr-activity-toggle.is-active {
          background: rgba(88,101,242,0.18);
          border-color: rgba(88,101,242,0.35);
          color: #A78BFA;
        }
        #zentyr-stop {
          color: var(--zentyr-err);
          background: rgba(248,113,113,0.08);
          border-color: rgba(248,113,113,0.18);
        }
        #zentyr-stop:hover {
          background: rgba(248,113,113,0.18);
          border-color: rgba(248,113,113,0.35);
        }
        #zentyr-stop.is-confirming {
          background: rgba(248,113,113,0.3);
          border-color: rgba(248,113,113,0.6);
          color: #ffffff;
          animation: pPulse 1s infinite;
        }

        #zentyr-status {
          padding: 10px 16px;
          background: rgba(0,0,0,0.14);
          border-bottom: 1px solid var(--zentyr-card-border);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .zentyr-state-orb {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
          background: #5865F2;
          box-shadow: 0 0 8px rgba(88,101,242,0.6);
          transition: background 0.3s ease, box-shadow 0.3s ease;
        }
        [data-phase="connecting"] .zentyr-state-orb { background: #5865F2; box-shadow: 0 0 8px rgba(88,101,242,0.6); }
        [data-phase="loading"] .zentyr-state-orb { background: #A78BFA; box-shadow: 0 0 8px rgba(167,139,250,0.6); }
        [data-phase="scanning"] .zentyr-state-orb { background: #38BDF8; box-shadow: 0 0 8px rgba(56,189,248,0.6); }
        [data-phase="running"] .zentyr-state-orb { background: #34D399; box-shadow: 0 0 8px rgba(52,211,153,0.6); animation: pPulse 1.8s infinite; }
        [data-phase="standby"] .zentyr-state-orb { background: #94A3B8; box-shadow: none; }
        [data-phase="action"] .zentyr-state-orb { background: #FBBF24; box-shadow: 0 0 8px rgba(251,191,36,0.6); animation: pPulse 1.2s infinite; }
        [data-phase="error"] .zentyr-state-orb { background: #F87171; box-shadow: 0 0 8px rgba(248,113,113,0.6); }

        #zentyr-status span {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        #zentyr-status-label {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--zentyr-text-primary);
        }
        #zentyr-status-message {
          font-size: 11px;
          color: var(--zentyr-text-secondary);
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        #zentyr-mode-bar {
          padding: 8px 14px;
          background: rgba(0,0,0,0.18);
          border-bottom: 1px solid var(--zentyr-card-border);
          display: flex;
          gap: 6px;
        }
        .zentyr-seg-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px 4px;
          border-radius: 10px;
          font-family: inherit;
          color: var(--zentyr-text-secondary);
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }
        .zentyr-seg-btn span {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }
        .zentyr-seg-btn small {
          font-size: 8px;
          font-weight: 500;
          opacity: 0.7;
          margin-top: 2px;
          white-space: nowrap;
        }
        .zentyr-seg-btn:hover {
          background: rgba(255,255,255,0.08);
          color: var(--zentyr-text-primary);
        }
        .zentyr-seg-btn:focus-visible {
          outline: 2px solid #5865F2;
          outline-offset: 1px;
        }
        .zentyr-seg-btn.active.mode-safe {
          color: #34D399;
          background: rgba(52,211,153,0.12);
          border-color: rgba(52,211,153,0.35);
        }
        .zentyr-seg-btn.active.mode-balanced {
          color: #A78BFA;
          background: rgba(167,139,250,0.14);
          border-color: rgba(167,139,250,0.38);
        }
        .zentyr-seg-btn.active.mode-turbo {
          color: #F472B6;
          background: rgba(244,114,182,0.12);
          border-color: rgba(244,114,182,0.35);
        }

        #zentyr-summary {
          padding: 8px 16px;
          background: rgba(0,0,0,0.08);
          border-bottom: 1px solid var(--zentyr-card-border);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          text-align: center;
        }
        #zentyr-summary span {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 9.5px;
          font-weight: 600;
          color: var(--zentyr-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        #zentyr-summary strong {
          font-size: 14px;
          font-weight: 800;
          color: var(--zentyr-text-primary);
          font-family: "JetBrains Mono", Consolas, monospace;
        }

        #zentyr-body {
          padding: 12px 14px;
          max-height: 250px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          user-select: text;
        }
        #zentyr-body::-webkit-scrollbar { width: 5px; }
        #zentyr-body::-webkit-scrollbar-thumb { background: var(--zentyr-card-border); border-radius: 4px; }

        .zentyr-empty {
          text-align: center;
          padding: 36px 16px;
          color: var(--zentyr-text-secondary);
          font-size: 12.5px;
          font-weight: 500;
        }

        .zentyr-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 14px;
          background: var(--zentyr-card-bg);
          border-radius: 14px;
          border: 1px solid var(--zentyr-card-border);
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .zentyr-card:hover {
          border-color: rgba(167,139,250,0.3);
          transform: translateY(-1px);
        }
        .zentyr-card.is-completed {
          border-color: rgba(52,211,153,0.25);
        }
        .zentyr-card.is-action, .zentyr-card.is-failed, .zentyr-card.is-warning {
          border-color: rgba(251,191,36,0.25);
        }
        .zentyr-card.s-rm {
          opacity: 0;
          transform: scale(0.95);
          transition: all 0.3s ease;
        }

        .zentyr-card-head {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .zentyr-card-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: rgba(0,0,0,0.25);
          border: 1px solid var(--zentyr-card-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #A78BFA;
          flex-shrink: 0;
        }
        .zentyr-card.is-completed .zentyr-card-icon {
          color: #34D399;
          background: rgba(52,211,153,0.08);
          border-color: rgba(52,211,153,0.25);
        }
        .zentyr-card.is-action .zentyr-card-icon,
        .zentyr-card.is-failed .zentyr-card-icon,
        .zentyr-card.is-warning .zentyr-card-icon {
          color: #FBBF24;
          background: rgba(251,191,36,0.08);
          border-color: rgba(251,191,36,0.25);
        }
        .zentyr-card.is-queued .zentyr-card-icon {
          color: #64748B;
        }

        .zentyr-card-info {
          flex: 1;
          min-width: 0;
        }
        .zentyr-card-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .zentyr-card-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--zentyr-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          flex: 1;
        }
        .zentyr-card-badge {
          font-size: 8.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 5px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          flex-shrink: 0;
        }
        .zentyr-card-badge.is-running { background: rgba(167,139,250,0.15); color: #C084FC; }
        .zentyr-card-badge.is-completed { background: rgba(52,211,153,0.15); color: #34D399; }
        .zentyr-card-badge.is-queued { background: rgba(100,116,139,0.15); color: #94A3B8; }
        .zentyr-card-badge.is-action { background: rgba(251,191,36,0.15); color: #FBBF24; }
        .zentyr-card-badge.is-failed { background: rgba(248,113,113,0.15); color: #F87171; }
        .zentyr-card-badge.is-warning { background: rgba(251,191,36,0.15); color: #FBBF24; }

        .zentyr-card-sub-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10.5px;
          color: var(--zentyr-text-secondary);
          margin-top: 2px;
          font-weight: 500;
        }
        .zentyr-card-pct {
          font-family: "JetBrains Mono", Consolas, monospace;
          font-size: 10px;
          font-weight: 600;
        }
        .zentyr-card.is-completed .zentyr-card-pct { color: #34D399; }
        .zentyr-card.is-running .zentyr-card-pct { color: #A78BFA; }

        .zentyr-progress-track {
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 6px;
        }
        .zentyr-progress-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #5865F2, #A78BFA);
          transition: width 0.3s ease;
          width: 0%;
        }
        .zentyr-card.is-completed .zentyr-progress-fill {
          background: #34D399;
        }

        .zentyr-reward-row {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }
        .zentyr-code-input {
          flex: 1;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--zentyr-card-border);
          color: #34D399;
          font-family: "JetBrains Mono", Consolas, monospace;
          font-size: 11px;
          padding: 5px 8px;
          border-radius: 7px;
          outline: none;
        }
        .zentyr-code-input:focus {
          border-color: #34D399;
        }
        .zentyr-copy-btn {
          background: linear-gradient(135deg, #34D399, #059669);
          color: #ffffff;
          border: none;
          padding: 5px 12px;
          border-radius: 7px;
          font-size: 9.5px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s ease;
        }
        .zentyr-copy-btn:hover { opacity: 0.9; }

        .zentyr-claimed-note {
          font-size: 11px;
          color: #34D399;
          font-weight: 500;
          margin-top: 4px;
        }
        .zentyr-captcha-box, .zentyr-failed-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }
        .zentyr-captcha-label {
          font-size: 11px;
          color: #FBBF24;
          font-weight: 600;
        }
        .zentyr-captcha-slot {
          min-height: 80px;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 8px;
          border: 1px dashed var(--zentyr-card-border);
          display: flex;
          justify-content: center;
        }
        .zentyr-failed-text {
          font-size: 10.5px;
          color: #F87171;
        }
        .zentyr-open-claim-btn {
          align-self: flex-start;
          background: rgba(248,113,113,0.12);
          color: #F87171;
          border: 1px solid rgba(248,113,113,0.25);
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 9.5px;
          font-weight: 700;
          font-family: inherit;
        }

        #zentyr-activity {
          border-top: 1px solid var(--zentyr-card-border);
          background: var(--zentyr-log-bg);
        }
        #zentyr-activity[hidden] { display: none !important; }
        #zentyr-activity header {
          padding: 6px 14px;
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--zentyr-text-secondary);
        }
        #zentyr-log {
          padding: 0 14px 10px 14px;
          max-height: 120px;
          overflow-y: auto;
          font-family: "JetBrains Mono", Consolas, monospace;
          font-size: 10px;
          color: var(--zentyr-log-text);
          user-select: text;
        }
        #zentyr-log::-webkit-scrollbar { width: 4px; }
        #zentyr-log::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

        .p-log {
          margin-bottom: 2px;
          display: flex;
          gap: 8px;
          line-height: 1.5;
        }
        .p-ts { opacity: 0.45; min-width: 48px; font-size: 9px; }
        .p-l-info { color: #A78BFA; }
        .p-l-ok { color: var(--zentyr-ok); }
        .p-l-warn { color: var(--zentyr-warn); }
        .p-l-err { color: var(--zentyr-err); }
        .p-l-dim { color: #64748B; }
      `;
      document.head.appendChild(css);

      this.el = document.createElement("section");
      this.el.id = "zentyr-root";
      this.el.setAttribute("data-phase", "connecting");
      const envTag = isApp ? "APP" : "WEB";

      this.el.innerHTML = `
        <header id="zentyr-head">
          <div class="zentyr-brand">
            <img class="zentyr-logo" src="${BRAND_LOGO}" alt="">
            <span><strong>ZENTYR</strong><small>v3.6 · ${envTag}</small></span>
          </div>
          <div class="zentyr-controls">
            <button id="zentyr-activity-toggle" aria-expanded="false" aria-controls="zentyr-activity">Activity</button>
            <button id="zentyr-min" aria-label="Minimize ZENTYR">−</button>
            <button id="zentyr-stop" aria-label="Stop ZENTYR">Stop</button>
          </div>
        </header>
        <section id="zentyr-status" aria-live="polite">
          <span class="zentyr-state-orb"></span>
          <span>
            <strong id="zentyr-status-label">Connecting to Discord</strong>
            <small id="zentyr-status-message">Preparing the ZENTYR engine.</small>
          </span>
        </section>
        <nav id="zentyr-mode-bar" aria-label="Engine mode">
          <button data-mode="SAFE" class="zentyr-seg-btn ${currentModeKey === 'SAFE' ? 'active mode-safe' : ''}">
            <span>SAFE</span><small>Maximum account safety</small>
          </button>
          <button data-mode="BALANCED" class="zentyr-seg-btn ${currentModeKey === 'BALANCED' ? 'active mode-balanced' : ''}">
            <span>BALANCED</span><small>Recommended</small>
          </button>
          <button data-mode="TURBO" class="zentyr-seg-btn ${currentModeKey === 'TURBO' ? 'active mode-turbo' : ''}">
            <span>TURBO</span><small>Maximum speed</small>
          </button>
        </nav>
        <section id="zentyr-summary">
          <span><strong data-summary="active">0</strong>Active</span>
          <span><strong data-summary="queued">0</strong>Queued</span>
          <span><strong data-summary="completed">0</strong>Completed</span>
        </section>
        <main id="zentyr-body"><div class="zentyr-empty">Looking for available quests.</div></main>
        <section id="zentyr-activity" hidden>
          <header>Activity</header>
          <div id="zentyr-log"></div>
        </section>
        <button id="zentyr-compact" hidden aria-label="Restore ZENTYR">
          <img src="${BRAND_LOGO}" alt="">
          <span id="zentyr-compact-label">Connecting</span>
          <strong id="zentyr-compact-count">0</strong>
        </button>
      `;
      document.body.appendChild(this.el);

      // ── Drag & Drop with Viewport Clamping ──
      const head = document.getElementById("zentyr-head");
      const compactBtn = document.getElementById("zentyr-compact");
      let drag = false, sx, sy, ix, iy, dragMoved = false;

      const startDrag = (e) => {
        if (e.target.closest("button, a, input, [role='button']")) return;
        drag = true;
        dragMoved = false;
        sx = e.clientX;
        sy = e.clientY;
        const r = this.el.getBoundingClientRect();
        ix = r.left;
        iy = r.top;
        this.el.style.right = "auto";
        e.preventDefault();
      };

      if (head) head.addEventListener("mousedown", startDrag);

      const onMouseMove = (e) => {
        if (!drag) return;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
        const rect = this.el.getBoundingClientRect();
        const nx = Math.max(0, Math.min(window.innerWidth - rect.width, ix + dx));
        const ny = Math.max(0, Math.min(window.innerHeight - rect.height, iy + dy));
        this.el.style.left = `${nx}px`;
        this.el.style.top = `${ny}px`;
      };

      const onMouseUp = () => {
        if (drag) {
          drag = false;
          const rect = this.el.getBoundingClientRect();
          const clampedX = Math.max(0, Math.min(window.innerWidth - rect.width, rect.left));
          const clampedY = Math.max(0, Math.min(window.innerHeight - rect.height, rect.top));
          this.el.style.left = `${clampedX}px`;
          this.el.style.top = `${clampedY}px`;
          this.el.style.right = "auto";
          Store.set("pos", { top: `${clampedY}px`, left: `${clampedX}px`, right: "auto" });
        }
      };

      document.getElementById("zentyr-min")?.addEventListener("click", () => this.toggleCollapse());
      document.getElementById("zentyr-compact")?.addEventListener("click", (e) => {
        if (!dragMoved) this.toggleCollapse(false);
      });
      document.getElementById("zentyr-stop")?.addEventListener("click", () => this.requestShutdown());
      document.getElementById("zentyr-activity-toggle")?.addEventListener("click", () => this.toggleActivity());

      const modeButtons = document.querySelectorAll(".zentyr-seg-btn");
      modeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetMode = btn.getAttribute("data-mode");
          if (!MODES[targetMode] || targetMode === currentModeKey) return;
          applyMode(targetMode);
          modeButtons.forEach((b) => {
            b.classList.remove("active", "mode-safe", "mode-balanced", "mode-turbo");
          });
          btn.classList.add("active", MODES[targetMode].badgeClass);
          UI.log(`[MODE] Switched to ${MODES[targetMode].label}: ${MODES[targetMode].desc}`, targetMode === "TURBO" ? "warn" : "ok");
          const view = getPhaseView(UI.currentPhase || "scanning", `Mode: ${MODES[targetMode].label} active.`, deriveSummary(UI.tasks));
          const msg = document.getElementById("zentyr-status-message");
          if (msg) msg.textContent = view.message;
        });
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

    setPhase(phase, detail = "") {
      this.currentPhase = phase;
      const summary = deriveSummary(this.tasks);
      const view = getPhaseView(phase, detail, summary);
      const root = document.getElementById("zentyr-root");
      if (root) root.setAttribute("data-phase", phase);
      const label = document.getElementById("zentyr-status-label");
      if (label) label.textContent = view.label;
      const msg = document.getElementById("zentyr-status-message");
      if (msg) msg.textContent = view.message;
      const compLabel = document.getElementById("zentyr-compact-label");
      if (compLabel) compLabel.textContent = view.label;
      window.__zentyrStatus = { state: phase, label: view.label, message: view.message, version: CONFIG.VERSION };
    },

    updateSummary() {
      const summary = deriveSummary(this.tasks);
      const elActive = document.querySelector('[data-summary="active"]');
      if (elActive) elActive.textContent = String(summary.active);
      const elQueued = document.querySelector('[data-summary="queued"]');
      if (elQueued) elQueued.textContent = String(summary.queued);
      const elCompleted = document.querySelector('[data-summary="completed"]');
      if (elCompleted) elCompleted.textContent = String(summary.completed);
      const elCompCount = document.getElementById("zentyr-compact-count");
      if (elCompCount) elCompCount.textContent = String(summary.active);
    },

    toggleActivity(force) {
      const act = document.getElementById("zentyr-activity");
      const btn = document.getElementById("zentyr-activity-toggle");
      if (!act || !btn) return;
      const open = typeof force === "boolean" ? force : act.hidden;
      act.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.classList.toggle("is-active", open);
      Store.set("activity_open", open);
      if (open) {
        this.unreadActivity = 0;
        this.updateActivityBadge();
        const log = document.getElementById("zentyr-log");
        if (log) log.scrollTop = log.scrollHeight;
      }
    },

    updateActivityBadge() {
      const btn = document.getElementById("zentyr-activity-toggle");
      if (!btn) return;
      const act = document.getElementById("zentyr-activity");
      if (act && !act.hidden) {
        btn.textContent = "Activity";
      } else if (this.unreadActivity > 0) {
        btn.textContent = `Activity (${this.unreadActivity})`;
      } else {
        btn.textContent = "Activity";
      }
    },

    toggleCollapse(force) {
      const root = document.getElementById("zentyr-root");
      const compactBtn = document.getElementById("zentyr-compact");
      if (!root || !compactBtn) return;
      this.collapsed = typeof force === "boolean" ? force : !this.collapsed;
      root.classList.toggle("is-compact", this.collapsed);
      compactBtn.hidden = !this.collapsed;
      Store.set("compact", this.collapsed);
    },

    requestShutdown() {
      const btn = document.getElementById("zentyr-stop");
      if (this.confirmingStop) {
        if (this.stopTimer) clearTimeout(this.stopTimer);
        this.confirmingStop = false;
        if (btn) {
          btn.textContent = "Stopping...";
          btn.disabled = true;
        }
        this.shutdown();
      } else {
        this.confirmingStop = true;
        if (btn) {
          btn.textContent = "Confirm stop";
          btn.classList.add("is-confirming");
        }
        this.stopTimer = setTimeout(() => {
          this.confirmingStop = false;
          const b = document.getElementById("zentyr-stop");
          if (b) {
            b.textContent = "Stop";
            b.classList.remove("is-confirming");
          }
        }, 3000);
      }
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
      this.updateSummary();
      this.render();
    },

    removeTask(id) {
      const t = this.tasks.get(id);
      if (t) { 
        t._removing = true; 
        this.render(); 
        setTimeout(() => { 
          this.tasks.delete(id); 
          this.updateSummary();
          this.render(); 
        }, 400); 
      }
    },

    log(msg, type = "info") {
      const colors = { info: "#a78bfa", ok: "#34d399", warn: "#fbbf24", err: "#f87171", dim: "#475569" };
      console.log(`%c[ZENTYR] %c${msg}`, `color:#a78bfa;font-weight:bold`, `color:${colors[type] || colors.info}`);

      const act = document.getElementById("zentyr-activity");
      if (act && act.hidden && (type === "warn" || type === "err")) {
        this.unreadActivity = (this.unreadActivity || 0) + 1;
        this.updateActivityBadge();
      }

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
        body.innerHTML = '<div class="zentyr-empty">Looking for available quests.</div>';
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

      for (const [id, t] of sorted) {
        const view = getTaskView(t);
        let icon = I.BOLT;

        if (view.statusClass === "is-completed") icon = I.CHECK;
        else if (view.statusClass === "is-action" || view.statusClass === "is-failed" || view.statusClass === "is-warning") icon = I.WARN;
        else if (t.status === "queue") icon = I.CLOCK;
        else {
          if (t.type === "VIDEO") icon = I.PLAY;
          else if (t.type === "GAME") icon = I.GAME;
          else if (t.type === "STREAM") icon = I.STREAM;
          else if (t.type === "ACTIVITY") icon = I.ACTIVITY;
        }

        const safeName = escapeHtml(t.name || id);
        const safeType = escapeHtml(t.type || "TASK");
        const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, "");

        let extraHtml = "";
        if (t.status === "claimed" && t.code) {
          const safeCode = escapeHtml(t.code);
          extraHtml = `
            <div class="zentyr-reward-row">
              <input type="text" readonly value="${safeCode}" class="zentyr-code-input" aria-label="Reward code">
              <button class="zentyr-copy-btn" data-zentyr-copy aria-live="polite">COPY</button>
            </div>`;
        } else if (t.status === "claimed_no_code") {
          extraHtml = '<div class="zentyr-claimed-note">Reward saved to Discord Gift Inventory.</div>';
        } else if (t.status === "captcha") {
          extraHtml = `
            <div class="zentyr-captcha-box">
              <span class="zentyr-captcha-label">Verification required. Please solve the CAPTCHA to continue:</span>
              <div id="zentyr-captcha-${safeId}" class="zentyr-captcha-slot"></div>
            </div>`;
        } else if (t.status === "claim_failed") {
          extraHtml = `
            <div class="zentyr-failed-box">
              <span class="zentyr-failed-text">Unable to claim reward: ${escapeHtml(t.errMsg || "Unknown error")}</span>
              <button class="zentyr-open-claim-btn" data-zentyr-open-claim>Open Quests</button>
            </div>`;
        }

        cardsHtml += `
          <div class="zentyr-card ${view.statusClass} ${t._removing ? 's-rm' : ''}">
            <div class="zentyr-card-head">
              <div class="zentyr-card-icon">${icon}</div>
              <div class="zentyr-card-info">
                <div class="zentyr-card-title-row">
                  <div class="zentyr-card-name" title="${safeName}">${safeName}</div>
                  <span class="zentyr-card-badge ${view.statusClass}">${view.statusLabel}</span>
                </div>
                <div class="zentyr-card-sub-row">
                  <span class="zentyr-card-type">${safeType}</span>
                  <span class="zentyr-card-pct">${view.percent}%${view.eta ? ` · ${view.eta}` : ''}</span>
                </div>
                <div class="zentyr-progress-track" role="progressbar" aria-valuenow="${view.percent}" aria-valuemin="0" aria-valuemax="100" aria-label="${safeName} progress">
                  <div class="zentyr-progress-fill" data-percent="${view.percent}"></div>
                </div>
              </div>
            </div>
            ${extraHtml}
          </div>`;
      }
      body.innerHTML = cardsHtml;

      body.querySelectorAll(".zentyr-progress-fill").forEach((el) => {
        const pct = el.getAttribute("data-percent") || "0";
        el.style.setProperty("width", `${pct}%`);
      });
      body.querySelectorAll(".zentyr-code-input").forEach((inp) => {
        inp.addEventListener("click", () => inp.select());
      });
      body.querySelectorAll("[data-zentyr-copy]").forEach((button) => {
        button.addEventListener("click", () => this.copyText(button));
      });
      body.querySelectorAll("[data-zentyr-open-claim]").forEach((button) => {
        button.addEventListener("click", () => {
          window.open("https://discord.com/blog/discord-quests-guide", "_blank", "noopener,noreferrer");
        });
      });
    },

    async copyText(button) {
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = "...";
      try {
        const input = button.parentElement?.querySelector("input");
        if (!input || !navigator.clipboard?.writeText) {
          throw new Error("Clipboard unavailable");
        }
        await navigator.clipboard.writeText(input.value);
        button.textContent = "COPIED";
        button.title = "Copied to clipboard";
      } catch {
        button.textContent = "COPY";
        button.title = "Copy failed. Select the text and copy manually.";
        this.log("Unable to copy to clipboard. Please copy manually.", "warn");
      } finally {
        setTimeout(() => {
          button.textContent = "COPY";
          button.disabled = false;
        }, 1600);
      }
    }
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
        UI.setPhase('action', 'Join a voice channel to continue.');
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
      UI.log(`[COMPLETE] Quest completed: ${task.name} (Claim reward in Gift Inventory)`, "ok");
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
    UI.setPhase('connecting', 'Preparing the ZENTYR engine.');
    window.__zentyrStatus = { state: "loading", version: CONFIG.VERSION };
    UI.log(`${isApp ? "[CLIENT] Discord Desktop App" : "[CLIENT] Discord Web"} Hooked Successfully`, isApp ? "ok" : "warn");
    UI.log(`[PROFILE] Engine Mode: ${MODES[currentModeKey].label} — ${MODES[currentModeKey].desc}`, "ok");
    if (!isApp) UI.log("[NOTE] Browser client detected — maintain tab focus to prevent throttling.", "warn");

    UI.setPhase('loading', 'Loading Discord modules.');
    if (!loadModules()) {
      UI.setPhase('error', 'Discord modules are unavailable. Reload Discord and try again.');
      window.__zentyrStatus = { state: "error", version: CONFIG.VERSION, message: "Core modules missing" };
      return UI.log("Hooking rejected — Please relaunch or reload Discord", "err");
    }
    UI.setPhase('scanning', 'Looking for available quests.');
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
          UI.setPhase('standby', 'Checking again in 30 seconds.');
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
        const activeCount = videos.length + games.length;
        UI.setPhase('running', `${activeCount} quest${activeCount === 1 ? ' is' : 's are'} in progress.`);
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

  if (typeof window !== "undefined" && window.__ZENTYR_TEST__) {
    window.__zentyrTest = { MODES, UI, deriveSummary, getPhaseView, getTaskView };
    return;
  }

    main().catch((e) => {
    console.error(e);
    UI.log(e.message || "Fatal Engine Exception", "err");
    UI.shutdown();
  });
})();
