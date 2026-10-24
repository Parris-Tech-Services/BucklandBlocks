# ElevenLabs integration — numbered outstanding tasks

**Status:** OPEN / NOT YET VERIFIED. **Last inventoried:** 2026-10-24. This is a task list, not evidence of successful integration.

**Global tracker:** https://github.com/Parris-Tech-Services/ParrisVoiceBank/blob/main/AUDIO_INTEGRATION_MASTER_TODO.md

**Rules:** Task IDs match the global master checklist 001–048. Check off each task only after passing tests and live production verification. Reuse existing ElevenLabs recordings, do not generate new speech unnecessarily. Preserve gameplay and avoid unintended auto-speaking or generic TTS disguised as recording.

## Tasks relevant to Buckland Blocks (10)

- [ ] **036** [P2] Finish Buckland Blocks integration where recordings suit its gameplay
  - [x] [AI] Verify Buckland Blocks PR #38 merged; do not mistake merged source for playable audio (confirmed 2026-10-24).
  - [ ] **TASK-00148** [AI] Inspect current merged code for real game events and suitable supplied recording mappings.
  - [ ] **TASK-00149** [AI] Run `npm run verify` (`check`, `lint`, tests, client build, release verify, smoke); fix regressions.
  - [ ] **TASK-00150** [AI] Playtest the merged game's audio, mute, save/reload and controls in browser and deployed site before checking this task.
- [ ] **040** [P2] Audit voice consistency, pronunciation, volume, pauses and audio quality across all characters
  - [ ] **TASK-00152** [AI] Measure loudness, peak, duration and leading/trailing silence for every approved clip using open-source tools.
  - [ ] **TASK-00153** [AI] Flag speaker changes, clipped audio, pronunciation errors and long pauses for listening review.
  - [ ] **TASK-00154** [AI] Apply non-destructive free gain/trim normalisation only with before/after hashes and source preserved.
  - [ ] **TASK-00155** [AI] Test representative character clips in the actual app/game playback mix.
- [ ] **041** [P2] Check integrity, captions, wrong-file matches and broken URLs for each recording
  - [ ] **TASK-00157** [AI] Generate a canonical ID→speaker→caption→URL→SHA-256 matrix with no duplicates.
  - [ ] **TASK-00158** [AI] Validate all manifest references and content type/length, and audit caption versus text metadata.
  - [ ] **TASK-00159** [AI] Test fail-fast behaviour for swapped voice files, 404, CORS and corrupt ZIP; store report.
  - [ ] **TASK-00160** [AI] Do not close until all required clips in the specified scope pass.
- [ ] **042** [P2] Verify no overlapping audio, autoplay problems, stuck players or missing stop controls
  - [ ] **TASK-00162** [AI] Enumerate distinct media engines per app and document precedence, pause and stop rules.
  - [ ] **TASK-00163** [AI] Add a repeat-tap/switch/close stress test that detects overlapping voices or hanging player state.
  - [ ] **TASK-00164** [AI] Verify no autoplay without user gesture and stop when leaving game/dialogue.
  - [ ] **TASK-00165** [AI] Confirm screen-reader announcements remain clear when an audio error occurs.
- [ ] **043** [P2] Check loading performance and avoid unnecessarily downloading hundreds of recordings on mobile data
  - [ ] **TASK-00167** [AI] Record startup/network bytes and lazy-load timing on a throttled simulated mobile connection.
  - [ ] **TASK-00168** [AI] Ensure packs download on explicit interaction, cache selectively and respect audio settings.
  - [ ] **TASK-00169** [AI] Verify bundles do not fetch all 300 clips on every page load or exhaust storage.
  - [ ] **TASK-00170** [AI] Add performance budgets and compare measurements after optimisation.
- [ ] **044** [P2] Test fallback and retry behaviour without unexpected ElevenLabs API calls or costs
  - [ ] **TASK-00172** [AI] Simulate offline, rate limits, 404, timeout, CORS denial and decode failure for every playback API.
  - [ ] **TASK-00173** [AI] Assert graceful retry/disabled control with accurate voice source label.
  - [ ] **TASK-00174** [AI] Log outbound request domains and prove no unplanned ElevenLabs/paid API calls.
  - [ ] **TASK-00175** [AI] Preserve working offline alternatives only where approved, with no disguised device TTS.
- [ ] **045** [P2] Check accessibility, keyboard controls, reduced-motion preferences and screen-reader labels
  - [ ] **TASK-00177** [AI] Run automated accessibility assertions for labels, focus, aria-pressed/status and heading structure.
  - [ ] **TASK-00178** [AI] Test keyboard-only controls and switch to reduced-motion mode where relevant.
  - [ ] **TASK-00179** [AI] Inspect mobile hit targets and long translated/recorded captions for overflow.
  - [ ] **TASK-00180** [AI] Retest screen-reader relevant semantics after fixes.
- [ ] **046** [P2] Run project builds, automated tests, real-browser journeys and production smoke tests
  - [ ] **TASK-00182** [AI] Record per-app build, unit, integration, browser and deployed smoke commands in a single evidence matrix.
  - [ ] **TASK-00183** [AI] Run lowest-cost tests first, then real browser journeys (Chrome mobile/desktop) without generating speech.
  - [ ] **TASK-00184** [AI] Gate deployment on the relevant tests; attach SHA, exit logs, network/audio proof and URL.
  - [ ] **TASK-00185** [AI] Distinguish an independent test from GitHub Actions execution and never claim CI green when runner was blocked.
- [ ] **047** [P2] Confirm save/load, offline support and core gameplay remain unchanged where audio was added
  - [ ] **TASK-00187** [AI] Snapshot test saves/progress before audio features and verify backwards-compatible restores.
  - [ ] **TASK-00188** [AI] Test offline startup and cached/missing audio without breaking gameplay, exercise tracking or school-safe app features.
  - [ ] **TASK-00189** [AI] Check changing voice settings does not change game data, achievements or scores.
  - [ ] **TASK-00190** [AI] Perform a production upgrade/reload regression on each affected app.
- [ ] **048** [P2] Publish a central audit showing clip ID, voice, source, destination, gameplay trigger, review status and test outcome
  - [ ] **TASK-00192** [AI] Consolidate all accessible audio manifests into one versioned inventory with ID, source, speaker, text, hash, game, trigger and deployed URL.
  - [ ] **TASK-00193** [AI] Link QA evidence (CI/build/browser/devices), confidence level, review status and unresolved blockers per clip.
  - [ ] **TASK-00194** [AI] Publish a machine-readable CSV/JSON and human audit in VoiceBank with source references.
  - [ ] **TASK-00195** [AI] Reconcile all 48 task checkboxes from actual proof; leave missing/private/inaccessible items explicitly OPEN.

_Buckland Blocks scope: do not invent audio-to-event matches. Review actual gameplay first, integrate only suitable audio, and test phone and desktop experience before claiming complete._

**Review gate:** This checklist should land on `main` only after the repository's required `quality` check passes. A documentation change does not certify gameplay or audio integration.

<!-- NO_COST_SUBTASKS_V1 -->
**Ownership:** `[AI]` = connected-tool implementation and testing. `[YOU]` = only essential account/device access. No paid services, no unsafe visibility changes. See the master list for evidence requirements.

**Review gate:** This documentation-only PR must still satisfy the repository's required public-repository `quality` check. No production/audio runtime changes are included.
