const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const toPlain = (val) => JSON.parse(JSON.stringify(val));

function createZentyrContext() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'zentyr.js'), 'utf-8');
  const store = new Map();
  const localStorageStub = {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); },
  };

  const sandbox = {
    window: {
      __ZENTYR_TEST__: true,
      localStorage: localStorageStub,
    },
    localStorage: localStorageStub,
    document: {
      head: { appendChild() {} },
      body: { appendChild() {}, classList: { contains() { return false; } } },
      documentElement: { classList: { contains() { return false; } } },
      getElementById() { return null; },
      createElement() {
        return {
          style: {},
          appendChild() {},
          setAttribute() {},
          classList: { add() {}, remove() {}, toggle() {} },
        };
      },
      addEventListener() {},
      removeEventListener() {},
    },
    navigator: {
      clipboard: { writeText: async () => {} },
    },
    console: {
      log() {},
      warn() {},
      error() {},
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    String,
    Number,
    Array,
    Object,
    Promise,
    Buffer,
    Set,
    Map,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window.__zentyrTest;
}

test('summary separates active, queued, and completed tasks', () => {
  const { deriveSummary } = createZentyrContext();
  const tasks = new Map([
    ['a', { status: 'run' }],
    ['b', { status: 'queue' }],
    ['c', { status: 'done' }],
    ['d', { status: 'claimed' }],
  ]);
  assert.deepEqual(toPlain(deriveSummary(tasks)), { active: 1, queued: 1, completed: 2 });
});

test('standby phase gives understandable copy', () => {
  const { getPhaseView } = createZentyrContext();
  assert.deepEqual(toPlain(getPhaseView('standby', 'Checking again in 30 seconds.', { active: 0, queued: 0, completed: 2 })), {
    label: 'All caught up',
    message: 'Checking again in 30 seconds.',
    tone: 'idle',
    busy: false,
  });
});

test('running task presentation reports bounded progress and ETA', () => {
  const { getTaskView } = createZentyrContext();
  assert.deepEqual(toPlain(getTaskView({ status: 'run', cur: 30, max: 120 })), {
    statusLabel: 'Running',
    statusClass: 'is-running',
    percent: 25,
    eta: 'About 1m 30s left',
  });
});

test('mode performance values remain unchanged', () => {
  const { MODES } = createZentyrContext();
  assert.equal(MODES.SAFE.requestDelay, 3200);
  assert.equal(MODES.BALANCED.requestDelay, 2200);
  assert.equal(MODES.TURBO.requestDelay, 1200);
  assert.equal(MODES.SAFE.videoSpeed, 2.5);
  assert.equal(MODES.BALANCED.videoSpeed, 5.0);
  assert.equal(MODES.TURBO.videoSpeed, 8.0);
});

test('source contracts enforce brand, accessibility, and mode copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'zentyr.js'), 'utf-8');
  assert.doesNotMatch(source, /fonts\.googleapis\.com/);
  assert.match(source, /const BRAND_LOGO = "data:image\/png;base64,/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /aria-label="Stop ZENTYR"/);
  assert.match(source, /aria-expanded=/);
  assert.match(source, /Maximum account safety/);
  assert.match(source, /Recommended/);
  assert.match(source, /Maximum speed/);
});

test('task presentation handles all states, clamping, and zero targets', () => {
  const { getTaskView } = createZentyrContext();
  
  // States
  assert.equal(getTaskView({ status: 'queue' }).statusLabel, 'Queued');
  assert.equal(getTaskView({ status: 'run', cur: 10, max: 100 }).statusLabel, 'Running');
  assert.equal(getTaskView({ status: 'done' }).statusLabel, 'Completed');
  assert.equal(getTaskView({ status: 'claimed' }).statusLabel, 'Claimed');
  assert.equal(getTaskView({ status: 'captcha' }).statusLabel, 'Action required');
  assert.equal(getTaskView({ status: 'claim_failed' }).statusLabel, 'Claim failed');
  assert.equal(getTaskView({ status: 'warn' }).statusLabel, 'Skipped');

  // Clamping 0..100
  assert.equal(getTaskView({ status: 'run', cur: -5, max: 100 }).percent, 0);
  assert.equal(getTaskView({ status: 'run', cur: 150, max: 100 }).percent, 100);

  // Zero target does not produce NaN
  const zeroTarget = getTaskView({ status: 'queue', cur: 0, max: 0 });
  assert.equal(Number.isNaN(zeroTarget.percent), false);
  assert.equal(zeroTarget.percent, 0);
});

test('card templates avoid inline onclick and inline style attributes', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'zentyr.js'), 'utf-8');
  // Check the render method slice
  const renderMatch = source.match(/render\(\)\s*\{([\s\S]*?)\n\s*\},?\s*(?:async\s+)?copyText/);
  assert.ok(renderMatch, 'render() method should be present');
  const renderBody = renderMatch[1];
  assert.doesNotMatch(renderBody, /onclick\s*=/i, 'No inline onclick handlers allowed in render templates');
  assert.doesNotMatch(renderBody, /style\s*=/i, 'No inline style attributes allowed in render templates');
});

test('phase wiring contracts exist in engine lifecycle', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'zentyr.js'), 'utf-8');
  assert.match(source, /UI\.setPhase\(\s*['"]connecting['"]\s*,\s*['"]Preparing the ZENTYR engine\.['"]\s*\)/);
  assert.match(source, /UI\.setPhase\(\s*['"]loading['"]\s*,\s*['"]Loading Discord modules\.['"]\s*\)/);
  assert.match(source, /UI\.setPhase\(\s*['"]scanning['"]\s*,\s*['"]Looking for available quests\.['"]\s*\)/);
  assert.match(source, /UI\.setPhase\(\s*['"]running['"]\s*,\s*`\$\{activeCount\} quest\$\{\s*activeCount\s*===\s*1\s*\?\s*['"] is['"]\s*:\s*['"]s are['"]\}\s*in progress\.`\s*\)/);
  assert.match(source, /UI\.setPhase\(\s*['"]standby['"]\s*,\s*['"]Checking again in 30 seconds\.['"]\s*\)/);
  assert.match(source, /UI\.setPhase\(\s*['"]action['"]\s*,\s*['"]Join a voice channel to continue\.['"]\s*\)/);
  assert.match(source, /UI\.setPhase\(\s*['"]error['"]\s*,\s*['"]Discord modules are unavailable\. Reload Discord and try again\.['"]\s*\)/);
});

test('auto-enroll uses modern payload and supports informative task etas', () => {
  const { getTaskView } = createZentyrContext();
  const source = fs.readFileSync(path.join(__dirname, '..', 'zentyr.js'), 'utf-8');

  // Custom eta handling
  assert.equal(getTaskView({ status: 'queue', eta: 'Pending accept' }).eta, 'Pending accept');
  assert.equal(getTaskView({ status: 'warn', eta: 'Click Accept in Discord' }).eta, 'Click Accept in Discord');

  // Modern Discord Quests tab location 11 & non-blocking rate limit retries
  assert.match(source, /location:\s*11/);
  assert.match(source, /maxRateLimitRetries:\s*0/);
});


