# ZENTYR UI Refresh Design

## Goal

Redesign the `zentyr.js` floating widget around the approved standalone Blurple–Lavender Z logo. The refreshed interface must make the automatic startup flow, current engine state, selected mode, quest progress, and recovery actions understandable to a first-time user without exposing implementation details.

## Scope

- Replace the project PNG and ICO with the approved standalone Z artwork and rebuild the Windows executable.
- Redesign only the presentation and interaction layer in `zentyr.js`.
- Preserve quest discovery, enrollment, execution, retry, rate-limit, heartbeat, concurrency, and timing behavior.
- Keep SAFE, BALANCED, and TURBO mode values unchanged.
- Use concise English throughout the user interface.

## Visual System

- Primary brand colors: Discord-style Blurple `#5865F2`, lavender `#A78BFA`, and restrained cyan edge highlights.
- Dark surfaces should visually integrate with Discord dark and midnight themes; light surfaces should remain readable in Discord light mode.
- The approved Z artwork appears in the header. Because the injected remote script cannot rely on a local asset path, a small optimized PNG data URI will be embedded in `zentyr.js`.
- Use soft depth, translucent surfaces, rounded geometry, and controlled highlights. Avoid excessive glow, rotating logos, rainbow gradients, and decorative motion.
- Use Discord-compatible system fonts rather than a remote Google Fonts import.

## Information Architecture

### Header

- Show the Z logo, `ZENTYR`, version, environment, and current engine state.
- Replace the prominent always-visible STOP label with compact accessible controls.
- Keep the header draggable without allowing control clicks to initiate dragging.

### Engine Status

- Present a dedicated status surface that transitions through:
  - `Connecting to Discord`
  - `Loading engine modules`
  - `Scanning for quests`
  - `Running quests`
  - `All caught up`
  - `Action required`
  - `Engine error`
- Status text must explain the next useful action where applicable.
- Startup transitions use restrained motion and respect `prefers-reduced-motion`.

### Mode Selector

- Retain three segmented controls with clear supporting copy:
  - `SAFE` — `Maximum account safety`
  - `BALANCED` — `Recommended`
  - `TURBO` — `Maximum speed`
- Keep emerald, cyan, and pink as mode-specific state accents only.
- Update the status surface immediately after a mode change and preserve the selection in local storage.

### Quest Summary and Cards

- Add a compact summary for Active, Queued, and Completed counts.
- Each quest card prioritizes quest name, human-readable state, percentage, progress, and ETA.
- Maintain task-type icons and status colors, but simplify borders and hover effects.
- Convert inline action styles to reusable classes.
- Claimed reward codes retain an accessible copy action and clear copied/error feedback.

### Activity Log

- Move technical output behind a collapsible `Activity` disclosure.
- Show a small unread/activity indicator when new log entries arrive while collapsed.
- Keep at most 50 entries and preserve console logging for diagnostics.

### Compact State

- Minimize into a small pill showing the logo, current state, and active quest count.
- The compact pill remains draggable and restores the full widget on activation.

### Stop Interaction

- Require a second activation within a short window before stopping the engine.
- Reset the confirmation state automatically if the user does not confirm.
- Show shutdown progress before removing the widget.

## State Model

The UI owns a presentation-only state object containing engine phase, status message, status tone, activity visibility, stop-confirmation state, and summary counts. Existing quest execution code reports meaningful phase changes through small UI methods. No UI state may change quest scheduling behavior.

## Accessibility and Reliability

- Use semantic `button` elements, ARIA labels, focus-visible styles, and keyboard-operable controls.
- Maintain sufficient text and control contrast in light and dark themes.
- Respect reduced-motion preferences.
- Escape quest-controlled text before inserting HTML.
- Avoid new network dependencies and external font requests.
- Keep the widget usable at narrow Discord window widths and clamp its saved position to the visible viewport.

## Error and Recovery Copy

- Convert technical-only messages into short user-facing actions while keeping details in Activity and the browser console.
- Examples:
  - `Join a voice channel to continue.`
  - `Discord modules are unavailable. Reload Discord and try again.`
  - `Rate limited. Retrying in 8 seconds.`
  - `Quest progress could not be confirmed. ZENTYR will retry.`

## Verification

- Validate JavaScript syntax.
- Exercise UI state rendering in a DOM test harness: startup, mode switch, task states, activity disclosure, minimize/restore, stop confirmation, light/dark theme, and reduced motion.
- Confirm the generated logo PNG has alpha transparency.
- Confirm the ICO contains 16, 24, 32, 48, 64, 128, and 256 pixel frames.
- Compile the executable with the new ICO and verify an icon is embedded.
- Review the rendered widget visually at normal and narrow widths.

## Non-Goals

- No changes to quest API calls, spoofing behavior, request timings, concurrency values, heartbeat cadence, enrollment rules, or completion logic.
- No new analytics, telemetry, account data storage, remote assets, or settings screen.
- No automatic reward claiming behavior changes.
