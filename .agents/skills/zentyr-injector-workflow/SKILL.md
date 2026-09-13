---
name: zentyr-injector-workflow
description: Build, deploy, and debug the ZENTYR Discord Quest Script Injector (C# + JS).
risk: safe
source: local
date_added: "2026-06-05"
---

# ZENTYR Discord Injector Workflow

Use this local skill to guide workflows involving building, deploying, testing, or updating the Discord Quest Script Injector files (`ZentyrInjector.cs`, `zentyr.js`, `build.bat`).

---

## 1. Compilation Workflow (C# Executable)

Always compile C# using the native .NET Framework compiler `csc.exe` to ensure compatibility and standalone executable properties.

### Quick Build
To compile the injector executable:
- Run the local `build.bat` file in CMD/PowerShell.
- Alternatively, run:
  `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /warn:4 /target:exe /platform:anycpu /win32icon:"assets\zentyr.ico" /out:"ZENTYR Discord Script.exe" ZentyrInjector.cs`
- Verify that `"ZENTYR Discord Script.exe"` is generated in the workspace root.

---

## 2. Discord Injection Architecture & Debugging

The injector operates in 4 critical phases. When fixing injector bugs, verify this lifecycle:

### Phase A: Target & Process Soft-Close
- Detects the running/installed Discord flavor: `Discord`, `DiscordPTB`, `DiscordCanary`, or `DiscordDevelopment`.
- Gracefully requests Discord window close first (`Process.CloseMainWindow`), sleeping for up to 6 seconds.
- Falls back to `Process.Kill` only if Discord processes fail to exit.

### Phase B: settings.json Patching
- Patches Discord's `settings.json` (located in `%APPDATA%\<flavor>\settings.json`).
- Enables `DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING` set to `true`.
- Always backs up the file to `settings.json.zentyr_backup` before patching.

### Phase C: Startup Index & Loader Setup
- Finds Discord modules under `%LOCALAPPDATA%\<flavor>\app-*\modules\discord_desktop_core-*`.
- Modifies `index.js` to insert `require('./zentyr_loader');` at the top.
- Backs up `index.js` to `index.js.zentyr_backup`.
- Writes `zentyr_loader.js` into the core assembly folder.

### Phase D: Stealth Self-Destruction
- During Discord launch, `zentyr_loader.js` runs first in the Electron backend.
- It immediately restores `index.js` from `index.js.zentyr_backup` to remove injection traces on disk.
- It schedules its own file deletion (`zentyr_loader.js`) within 5 seconds of startup.
- It queries the remote GitHub script URL (`https://raw.githubusercontent.com/DDME36/DC-Quest-Script/main/zentyr.js`) and injects it directly into RAM.
- C# injector restores `settings.json` and deactivates DevTools once the main Discord window appears.

---

## 3. Script Editing & Verification (zentyr.js)

When writing Javascript inside `zentyr.js` (the Quest Automation script):

### Dual Engine Mode Architecture
- **Safe Mode**: 1 quest at a time, human-like video speed (2.5x - 3x), 3200ms delay + jitter, spaced heartbeats.
- **Turbo Mode**: Uncapped concurrency, max video speed (8x), 1200ms delay, rapid heartbeats.
- UI allows toggle in real-time, persistent in `localStorage`.

### Webpack Chunk Polling
Ensure script execution waits until Discord's UI components are fully mounted:
- Verify that `webpackChunkdiscord_app` is loaded.
- Check if elements under `#app-mount` exist.
- Hook into Discord's internal dispatcher and stores (`QuestStore`, `RunStore`, `StreamStore`, `API`).

### Manual Console Testing
To test script logic:
1. Open Discord compiled/running under the injector.
2. Press `Ctrl + Shift + I` (or `Cmd + Option + I` on Mac) to open DevTools.
3. Switch to the Console tab.
4. Look for `[ZENTYR]` logs to trace loader progress.
5. Paste code snippets directly into the console to test UI interactions.

---

## Limitations
- Do not run the compiled `ZENTYR Discord Script.exe` inside automated sandbox servers unless you intend to verify process hooks.
- Stop and ask the user for confirmation if Windows Defender flags your build actions.
