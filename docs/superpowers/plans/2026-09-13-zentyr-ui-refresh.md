# ZENTYR UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the project brand assets with the approved standalone Z and rebuild the `zentyr.js` widget into a clear, accessible, Discord-native English interface without changing Quest engine behavior.

**Architecture:** Keep the single-file injected runtime and existing Quest engine intact. Add a small presentation-state layer inside `zentyr.js`; engine events report phases and task data into that layer, while rendering, mode controls, compact mode, Activity, and stop confirmation remain UI-only concerns. Embed a small optimized copy of the approved logo as a data URI because the remote script cannot rely on project-local paths.

**Tech Stack:** Browser JavaScript in a Discord Electron renderer, DOM/CSS, inline SVG, Node.js built-in test runner/assert/vm, PowerShell and System.Drawing for PNG/ICO preparation, .NET Framework `csc.exe` for the executable build.

**Spec:** `docs/superpowers/specs/2026-09-13-zentyr-ui-refresh-design.md`

## Global Constraints

- Preserve quest discovery, enrollment, execution, retry, rate-limit, heartbeat, concurrency, and timing behavior.
- Keep SAFE, BALANCED, and TURBO mode values unchanged.
- Use concise English throughout the user interface.
- Add no runtime network dependency, analytics, telemetry, settings screen, or automatic reward-claiming change.
- Escape quest-controlled text before inserting HTML.
- The workspace is not a Git repository, so commit steps are replaced by explicit verification checkpoints.

## Spec Traceability

- Visual System and approved standalone Z: Tasks 1 and 3.
- Header and Engine Status: Tasks 2, 3, and 5.
- Mode Selector: Tasks 3 and 5.
- Quest Summary and Cards: Tasks 2 and 4.
- Activity Log: Tasks 3 and 4.
- Compact State: Task 3.
- Stop Interaction: Task 3.
- Accessibility and Reliability: Tasks 3, 4, and 6.
- Error and Recovery Copy: Tasks 4 and 5.
- Verification and behavioral non-goals: Tasks 2, 5, and 6.

## File Map

- Modify `assets/zentyr-icon.png`: canonical 1024×1024 transparent approved Z artwork.
- Modify `assets/zentyr.ico`: seven-frame Windows icon generated from the canonical PNG.
- Modify `zentyr.js`: presentation model, branded UI, interactions, and engine-to-UI phase reporting.
- Modify `ZENTYR Discord Script.exe`: rebuild with the new ICO after all checks pass.
- Create `tests/zentyr-ui.test.js`: dependency-free behavior and contract tests for presentation state and source invariants.
- Create `tests/zentyr-ui-preview.html`: local browser harness that exercises the real widget with fixture tasks.
- Create `tests/verify-brand-assets.ps1`: PNG alpha, ICO directory, frame-size, and executable icon checks.

---

### Task 1: Install and Validate the Approved Brand Asset

**Files:**
- Modify: `assets/zentyr-icon.png`
- Modify: `assets/zentyr.ico`
- Create: `tests/verify-brand-assets.ps1`

**Interfaces:**
- Consumes: approved source `C:\Users\MIGHTYBIT\.codex\generated_images\01a09955-e048-7f90-b405-619bfc9a59dd\exec-df59de68-866c-4dad-b5f4-7d4a068b4e1f.png`
- Produces: transparent 1024×1024 PNG and ICO frames at 16, 24, 32, 48, 64, 128, and 256 pixels.

- [x] **Step 1: Write the failing brand verification script**

Create `tests/verify-brand-assets.ps1` with strict checks:

```powershell
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$pngPath = Join-Path $root 'assets\zentyr-icon.png'
$icoPath = Join-Path $root 'assets\zentyr.ico'
$exePath = Join-Path $root 'ZENTYR Discord Script.exe'

$png = [System.Drawing.Bitmap]::FromFile($pngPath)
try {
  if ($png.Width -ne 1024 -or $png.Height -ne 1024) { throw 'PNG must be 1024x1024.' }
  $corners = @(
    $png.GetPixel(0, 0).A,
    $png.GetPixel($png.Width - 1, 0).A,
    $png.GetPixel(0, $png.Height - 1).A,
    $png.GetPixel($png.Width - 1, $png.Height - 1).A
  )
  if (($corners | Where-Object { $_ -ne 0 }).Count) { throw 'PNG corners must be transparent.' }
} finally { $png.Dispose() }

$bytes = [System.IO.File]::ReadAllBytes($icoPath)
if ([BitConverter]::ToUInt16($bytes, 0) -ne 0 -or [BitConverter]::ToUInt16($bytes, 2) -ne 1) {
  throw 'Invalid ICO header.'
}
$count = [BitConverter]::ToUInt16($bytes, 4)
$expected = @(16, 24, 32, 48, 64, 128, 256)
if ($count -ne $expected.Count) { throw "Expected 7 ICO frames; found $count." }
for ($i = 0; $i -lt $count; $i++) {
  $entry = 6 + 16 * $i
  $width = [int]$bytes[$entry]
  if ($width -eq 0) { $width = 256 }
  if ($width -ne $expected[$i]) { throw "Unexpected ICO frame width $width at index $i." }
  $length = [BitConverter]::ToUInt32($bytes, $entry + 8)
  $offset = [BitConverter]::ToUInt32($bytes, $entry + 12)
  if (($offset + $length) -gt $bytes.Length) { throw "ICO frame $i exceeds file bounds." }
}

if (Test-Path $exePath) {
  $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
  if ($null -eq $icon) { throw 'Executable has no embedded icon.' }
  $icon.Dispose()
}

Write-Host 'Brand assets valid: PNG alpha, 7 ICO frames, executable icon present.'
```

- [x] **Step 2: Run the script against the current assets**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tests\verify-brand-assets.ps1`

Expected before replacement: the structural checks can pass, but visual comparison shows the current PNG is the earlier Rift tile rather than the approved standalone acrylic Z. Record its SHA-256 with `Get-FileHash assets\zentyr-icon.png` so the replacement is observable.

- [x] **Step 3: Normalize the approved source and generate the ICO**

Use System.Drawing with `Format32bppArgb`, `CompositingMode.SourceCopy`, `HighQualityBicubic`, and a transparent 1024×1024 canvas. Save the approved source to `assets/zentyr-icon.png`. Render PNG-compressed ICO frames in this exact order: `16, 24, 32, 48, 64, 128, 256`; write a valid ICONDIR and ICONDIRENTRY table followed by frame bytes. For size 256, encode the directory width and height bytes as `0`.

- [x] **Step 4: Verify the new brand assets**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests\verify-brand-assets.ps1
Get-FileHash assets\zentyr-icon.png
```

Expected: validation message, a new PNG hash, and no exception.

---

### Task 2: Add a Testable Presentation Model

**Files:**
- Create: `tests/zentyr-ui.test.js`
- Modify: `zentyr.js:115-170`
- Modify: `zentyr.js:1385-1390`

**Interfaces:**
- Produces: `deriveSummary(tasks) -> { active, queued, completed }`
- Produces: `getPhaseView(phase, detail, summary) -> { label, message, tone, busy }`
- Produces: `getTaskView(task) -> { statusLabel, statusClass, percent, eta }`
- Produces only under `window.__ZENTYR_TEST__`: `window.__zentyrTest = { MODES, UI, deriveSummary, getPhaseView, getTaskView }`.

- [x] **Step 1: Write failing model tests**

Create `tests/zentyr-ui.test.js` using only `node:test`, `node:assert/strict`, `node:fs`, and `node:vm`. Load `zentyr.js` into a VM with `window.__ZENTYR_TEST__ = true`, `console`, timers, and a localStorage stub. Assert:

```javascript
test('summary separates active, queued, and completed tasks', () => {
  const tasks = new Map([
    ['a', { status: 'run' }],
    ['b', { status: 'queue' }],
    ['c', { status: 'done' }],
    ['d', { status: 'claimed' }],
  ]);
  assert.deepEqual(deriveSummary(tasks), { active: 1, queued: 1, completed: 2 });
});

test('standby phase gives understandable copy', () => {
  assert.deepEqual(getPhaseView('standby', 'Checking again in 30 seconds.', { active: 0, queued: 0, completed: 2 }), {
    label: 'All caught up',
    message: 'Checking again in 30 seconds.',
    tone: 'idle',
    busy: false,
  });
});

test('running task presentation reports bounded progress and ETA', () => {
  assert.deepEqual(getTaskView({ status: 'run', cur: 30, max: 120 }), {
    statusLabel: 'Running',
    statusClass: 'is-running',
    percent: 25,
    eta: 'About 1m 30s left',
  });
});

test('mode performance values remain unchanged', () => {
  assert.equal(MODES.SAFE.requestDelay, 3200);
  assert.equal(MODES.BALANCED.requestDelay, 2200);
  assert.equal(MODES.TURBO.requestDelay, 1200);
  assert.equal(MODES.SAFE.videoSpeed, 2.5);
  assert.equal(MODES.BALANCED.videoSpeed, 5.0);
  assert.equal(MODES.TURBO.videoSpeed, 8.0);
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `node --test tests\zentyr-ui.test.js`

Expected: FAIL because the presentation helpers and test export do not exist.

- [x] **Step 3: Implement the pure presentation helpers and guarded test export**

Add the three pure functions near the existing formatting helpers. Immediately before `main()` is invoked, add:

```javascript
if (window.__ZENTYR_TEST__) {
  window.__zentyrTest = { MODES, UI, deriveSummary, getPhaseView, getTaskView };
  return;
}
```

The production path remains unchanged when the flag is absent.

- [x] **Step 4: Run model and syntax tests**

Run:

```powershell
node --check zentyr.js
node --test tests\zentyr-ui.test.js
```

Expected: syntax exit 0 and all four tests pass.

---

### Task 3: Build the Branded Widget Shell and Engine Status

**Files:**
- Modify: `zentyr.js:127-141`
- Modify: `zentyr.js:169-586`
- Modify: `tests/zentyr-ui.test.js`
- Create: `tests/zentyr-ui-preview.html`

**Interfaces:**
- Consumes: `getPhaseView`, `deriveSummary`, and the embedded `BRAND_LOGO` data URI.
- Produces: `UI.setPhase(phase, detail = '')`, `UI.updateSummary()`, `UI.toggleActivity(force)`, `UI.toggleCollapse(force)`, and `UI.requestShutdown()`.

- [x] **Step 1: Add failing source-contract tests**

Extend `tests/zentyr-ui.test.js` to read `zentyr.js` as text and assert:

```javascript
assert.doesNotMatch(source, /fonts\.googleapis\.com/);
assert.match(source, /const BRAND_LOGO = "data:image\/png;base64,/);
assert.match(source, /prefers-reduced-motion/);
assert.match(source, /aria-label="Stop ZENTYR"/);
assert.match(source, /aria-expanded=/);
assert.match(source, /Maximum account safety/);
assert.match(source, /Recommended/);
assert.match(source, /Maximum speed/);
```

- [x] **Step 2: Run tests to verify the new contracts fail**

Run: `node --test tests\zentyr-ui.test.js`

Expected: FAIL on the missing logo, reduced-motion, semantic control, and mode-copy contracts.

- [x] **Step 3: Embed an optimized logo and replace the visual tokens**

Generate a 96×96 transparent PNG from `assets/zentyr-icon.png`, base64-encode it, and assign it once as `BRAND_LOGO`. Replace the Google Fonts import with `gg sans`, `Noto Sans`, `Helvetica Neue`, and system fallbacks. Define Blurple/Lavender brand tokens, theme-aware surfaces, focus rings, state tones, and `@media (prefers-reduced-motion: reduce)` overrides.

- [x] **Step 4: Replace the widget shell**

Use semantic buttons and this hierarchy:

```html
<section id="zentyr-root" data-phase="connecting">
  <header id="zentyr-head">
    <div class="zentyr-brand"><img class="zentyr-logo" src="${BRAND_LOGO}" alt=""><span><strong>ZENTYR</strong><small>v3.6 · APP</small></span></div>
    <div class="zentyr-controls"><button id="zentyr-activity-toggle">Activity</button><button id="zentyr-min" aria-label="Minimize ZENTYR">−</button><button id="zentyr-stop" aria-label="Stop ZENTYR">Stop</button></div>
  </header>
  <section id="zentyr-status" aria-live="polite"><span class="zentyr-state-orb"></span><span><strong id="zentyr-status-label">Connecting to Discord</strong><small id="zentyr-status-message">Preparing the ZENTYR engine.</small></span></section>
  <nav id="zentyr-mode-bar" aria-label="Engine mode"><button data-mode="SAFE">SAFE<small>Maximum account safety</small></button><button data-mode="BALANCED">BALANCED<small>Recommended</small></button><button data-mode="TURBO">TURBO<small>Maximum speed</small></button></nav>
  <section id="zentyr-summary"><span><strong data-summary="active">0</strong>Active</span><span><strong data-summary="queued">0</strong>Queued</span><span><strong data-summary="completed">0</strong>Completed</span></section>
  <main id="zentyr-body"><div class="zentyr-empty">Looking for available quests.</div></main>
  <section id="zentyr-activity" hidden><header>Activity</header><div id="zentyr-log"></div></section>
  <button id="zentyr-compact" hidden aria-label="Restore ZENTYR"><img src="${BRAND_LOGO}" alt=""><span id="zentyr-compact-label">Connecting</span><strong id="zentyr-compact-count">0</strong></button>
</section>
```

Mode buttons retain `data-mode` and display the exact supporting copy from the specification.

- [x] **Step 5: Implement interaction methods**

- `setPhase` updates the state surface, `data-phase`, `aria-live` content, compact label, and `window.__zentyrStatus` without changing engine configuration.
- `updateSummary` derives counts from `UI.tasks` and updates summary and compact count.
- `toggleActivity` updates `hidden`, `aria-expanded`, saved preference, and unread indicator.
- `toggleCollapse` switches between full widget and compact pill, persists the choice, and restores on activation.
- `requestShutdown` changes the stop control to `Confirm stop` for 3000 ms; a second activation calls `shutdown`.
- Drag completion clamps the saved widget rectangle to the visible viewport before persistence.

- [x] **Step 6: Create the real-widget preview harness**

Create `tests/zentyr-ui-preview.html` that sets `window.__ZENTYR_TEST__ = true`, loads `../zentyr.js`, calls `UI.init()`, adds one running video, one queued game, and one completed activity, then calls `UI.setPhase('running', '2 quests are in progress.')`. Add buttons outside the widget to switch dark/light mode, set each phase, toggle reduced-motion emulation through a body class used only by the harness, and resize the preview container to 360 px.

- [x] **Step 7: Run automated checks and inspect the preview**

Run:

```powershell
node --check zentyr.js
node --test tests\zentyr-ui.test.js
```

Expected: all tests pass. Open `tests/zentyr-ui-preview.html` and confirm header, phase surface, modes, summary, cards, Activity, compact pill, focus states, and narrow layout render without clipping.

---

### Task 4: Redesign Quest Cards, Activity, and Action Feedback

**Files:**
- Modify: `zentyr.js:588-750`
- Modify: `tests/zentyr-ui.test.js`
- Modify: `tests/zentyr-ui-preview.html`

**Interfaces:**
- Consumes: `getTaskView(task)` and `UI.updateSummary()`.
- Produces: human-readable task state copy, reusable action classes, Activity unread state, and accessible copy feedback.

- [x] **Step 1: Add failing task-state and safety tests**

Cover `queue`, `run`, `done`, `claimed`, `captcha`, `claim_failed`, and `warn`. Assert percent clamps to `0..100`, zero targets do not produce `NaN`, quest names are escaped, and source contains no inline `onclick=` handlers or inline `style=` attributes in task templates.

- [x] **Step 2: Run tests to verify failure**

Run: `node --test tests\zentyr-ui.test.js`

Expected: FAIL because current templates contain inline styles/handlers and task presentation is not centralized.

- [x] **Step 3: Refactor card rendering around `getTaskView`**

Render a stable card structure with task icon, name, readable status badge, task type, percent/ETA, and progress bar with `aria-valuenow`, `aria-valuemin="0"`, and `aria-valuemax="100"`. Use classes for reward code, CAPTCHA, error, and manual-claim actions. Attach all click handlers after insertion with `querySelectorAll`.

- [x] **Step 4: Improve Activity and copy feedback**

When Activity is closed, increment an unread indicator only for warn/error entries. Use `aria-live="polite"` for copied/error feedback, restore `COPY` after 1600 ms, and keep the existing manual fallback when Clipboard API is unavailable.

- [x] **Step 5: Re-run tests and preview all fixtures**

Run:

```powershell
node --check zentyr.js
node --test tests\zentyr-ui.test.js
```

Expected: all tests pass. In the preview harness, verify every task state and ensure the 360 px viewport has no horizontal overflow.

---

### Task 5: Wire Engine Events to Presentation Phases

**Files:**
- Modify: `zentyr.js:753-1389`
- Modify: `tests/zentyr-ui.test.js`

**Interfaces:**
- Consumes: `UI.setPhase`, `UI.updateSummary`, existing `UI.log`, and existing task map methods.
- Produces: accurate phase transitions without altering Quest scheduling.

- [x] **Step 1: Add failing phase-wiring contract tests**

Assert source includes calls for these exact transitions:

```javascript
UI.setPhase('connecting', 'Preparing the ZENTYR engine.');
UI.setPhase('loading', 'Loading Discord modules.');
UI.setPhase('scanning', 'Looking for available quests.');
UI.setPhase('running', `${activeCount} quest${activeCount === 1 ? ' is' : 's are'} in progress.`);
UI.setPhase('standby', 'Checking again in 30 seconds.');
UI.setPhase('action', 'Join a voice channel to continue.');
UI.setPhase('error', 'Discord modules are unavailable. Reload Discord and try again.');
```

Also snapshot the mode constants before edits and assert their numeric values remain identical.

- [x] **Step 2: Run tests to verify phase contracts fail**

Run: `node --test tests\zentyr-ui.test.js`

Expected: FAIL on missing phase calls.

- [x] **Step 3: Add phase reporting at existing lifecycle boundaries**

- `main` initialization: connecting, then loading.
- After successful module load: scanning.
- Before pools run: running with active count.
- No active quests: standby with the actual next-check delay.
- Voice requirement, CAPTCHA, or manual user step: action.
- Missing core modules or fatal exception: error with recovery copy.
- Mode switch: keep the current phase and update its secondary message to confirm the selected mode.

Do not move loops, change awaits, alter delays, change task arrays, or modify `Traffic.send`.

- [x] **Step 4: Verify behavioral invariants**

Run:

```powershell
node --check zentyr.js
node --test tests\zentyr-ui.test.js
rg -n "requestDelay: 3200|requestDelay: 2200|requestDelay: 1200|videoSpeed: 2\.5|videoSpeed: 5\.0|videoSpeed: 8\.0|heartbeatStagger: 6500|heartbeatStagger: 4500|heartbeatStagger: 2000" zentyr.js
```

Expected: syntax and tests pass; all nine unchanged configuration values are present.

---

### Task 6: Final Visual QA and Executable Build

**Files:**
- Modify: `ZENTYR Discord Script.exe`
- Verify: `zentyr.js`
- Verify: `assets/zentyr-icon.png`
- Verify: `assets/zentyr.ico`
- Verify: `tests/zentyr-ui-preview.html`

**Interfaces:**
- Consumes: final JS and brand assets.
- Produces: verified executable and completed UI refresh.

- [x] **Step 1: Run the complete automated verification set**

Run:

```powershell
node --check zentyr.js
node --test tests\zentyr-ui.test.js
powershell -NoProfile -ExecutionPolicy Bypass -File tests\verify-brand-assets.ps1
```

Expected: every command exits 0 with no failed tests.

- [x] **Step 2: Perform final browser visual QA**

Open `tests/zentyr-ui-preview.html` and inspect dark, light, narrow, compact, Activity-open, SAFE, BALANCED, TURBO, running, standby, action, and error states. Confirm keyboard focus is visible and animation is suppressed by the reduced-motion fixture.

- [x] **Step 3: Compile the executable with the final ICO**

Run:

```powershell
& 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe' /nologo /warn:4 /target:exe /platform:anycpu /win32icon:'assets\zentyr.ico' /out:'ZENTYR Discord Script.exe' ZentyrInjector.cs
```

If the 64-bit compiler path is absent, use `C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe`. Expected: exit 0 and no compiler errors.

- [x] **Step 4: Re-run brand verification against the rebuilt executable**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tests\verify-brand-assets.ps1`

Expected: PNG alpha valid, seven ICO frames present, and the executable exposes an associated icon.

- [x] **Step 5: Review the final diff manually**

Confirm only presentation calls were added below the UI layer; Quest request paths, runner selection, retry limits, delays, concurrency, heartbeat timing, enrollment filters, and completion behavior match the pre-change implementation.
