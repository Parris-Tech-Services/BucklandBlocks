# ElevenLabs integration — numbered outstanding tasks

**Status:** OPEN / NOT YET VERIFIED. **Last inventoried:** 2026-10-24. This is a task list, not evidence of successful integration.

**Global tracker:** https://github.com/Parris-Tech-Services/ParrisVoiceBank/blob/main/AUDIO_INTEGRATION_MASTER_TODO.md

**Rules:** Task IDs match the global master checklist 001–048. Check off each task only after passing tests and live production verification. Reuse existing ElevenLabs recordings, do not generate new speech unnecessarily. Preserve gameplay and avoid unintended auto-speaking or generic TTS disguised as recording.

## Tasks relevant to Buckland Blocks (10)

- [ ] **036** [P2] Finish Buckland Blocks integration where recordings suit its gameplay
  - [x] [AI] Verify Buckland Blocks PR #38 merged; do not mistake merged source for playable audio (confirmed 2026-10-24).
  - [ ] [AI] Inspect current merged code for real game events and suitable supplied recording mappings.
  - [ ] [AI] Run `npm run verify` (`check`, `lint`, tests, client build, release verify, smoke); fix regressions.
  - [ ] [AI] Playtest the merged game's audio, mute, save/reload and controls in browser and deployed site before checking this task.
- [ ] **040** [P2] Audit voice consistency, pronunciation, volume, pauses and audio quality across all characters
  - [ ] [AI] Measure loudness, peak, duration and leading/trailing silence for every approved clip using open-source tools.
  - [ ] [AI] Flag speaker changes, clipped audio, pronunciation errors and long pauses for listening review.
  - [ ] [AI] Apply non-destructive free gain/trim normalisation only with before/after hashes and source preserved.
  - [ ] [AI] Test representative character clips in the actual app/game playback mix.
- [ ] **041** [P2] Check integrity, captions, wrong-file matches and broken URLs for each recording
  - [ ] [AI] Generate a canonical ID→speaker→caption→URL→SHA-256 matrix with no duplicates.
  - [ ] [AI] Validate all manifest references and content type/length, and audit caption versus text metadata.
  - [ ] [AI] Test fail-fast behaviour for swapped voice files, 404, CORS and corrupt ZIP; store report.
  - [ ] [AI] Do not close until all required clips in the specified scope pass.
- [ ] **042** [P2] Verify no overlapping audio, autoplay problems, stuck players or missing stop controls
  - [ ] [AI] Enumerate distinct media engines per app and document precedence, pause and stop rules.
  - [ ] [AI] Add a repeat-tap/switch/close stress test that detects overlapping voices or hanging player state.
  - [ ] [AI] Verify no autoplay without user gesture and stop when leaving game/dialogue.
  - [ ] [AI] Confirm screen-reader announcements remain clear when an audio error occurs.
- [ ] **043** [P2] Check loading performance and avoid unnecessarily downloading hundreds of recordings on mobile data
  - [ ] [AI] Record startup/network bytes and lazy-load timing on a throttled simulated mobile connection.
  - [ ] [AI] Ensure packs download on explicit interaction, cache selectively and respect audio settings.
  - [ ] [AI] Verify bundles do not fetch all 300 clips on every page load or exhaust storage.
  - [ ] [AI] Add performance budgets and compare measurements after optimisation.
- [ ] **044** [P2] Test fallback and retry behaviour without unexpected ElevenLabs API calls or costs
  - [ ] [AI] Simulate offline, rate limits, 404, timeout, CORS denial and decode failure for every playback API.
  - [ ] [AI] Assert graceful retry/disabled control with accurate voice source label.
  - [ ] [AI] Log outbound request domains and prove no unplanned ElevenLabs/paid API calls.
  - [ ] [AI] Preserve working offline alternatives only where approved, with no disguised device TTS.
- [ ] **045** [P2] Check accessibility, keyboard controls, reduced-motion preferences and screen-reader labels
  - [ ] [AI] Run automated accessibility assertions for labels, focus, aria-pressed/status and heading structure.
  - [ ] [AI] Test keyboard-only controls and switch to reduced-motion mode where relevant.
  - [ ] [AI] Inspect mobile hit targets and long translated/recorded captions for overflow.
  - [ ] [AI] Retest screen-reader relevant semantics after fixes.
- [ ] **046** [P2] Run project builds, automated tests, real-browser journeys and production smoke tests
  - [ ] [AI] Record per-app build, unit, integration, browser and deployed smoke commands in a single evidence matrix.
  - [ ] [AI] Run lowest-cost tests first, then real browser journeys (Chrome mobile/desktop) without generating speech.
  - [ ] [AI] Gate deployment on the relevant tests; attach SHA, exit logs, network/audio proof and URL.
  - [ ] [AI] Distinguish an independent test from GitHub Actions execution and never claim CI green when runner was blocked.
- [ ] **047** [P2] Confirm save/load, offline support and core gameplay remain unchanged where audio was added
  - [ ] [AI] Snapshot test saves/progress before audio features and verify backwards-compatible restores.
  - [ ] [AI] Test offline startup and cached/missing audio without breaking gameplay, exercise tracking or school-safe app features.
  - [ ] [AI] Check changing voice settings does not change game data, achievements or scores.
  - [ ] [AI] Perform a production upgrade/reload regression on each affected app.
- [ ] **048** [P2] Publish a central audit showing clip ID, voice, source, destination, gameplay trigger, review status and test outcome
  - [ ] [AI] Consolidate all accessible audio manifests into one versioned inventory with ID, source, speaker, text, hash, game, trigger and deployed URL.
  - [ ] [AI] Link QA evidence (CI/build/browser/devices), confidence level, review status and unresolved blockers per clip.
  - [ ] [AI] Publish a machine-readable CSV/JSON and human audit in VoiceBank with source references.
  - [ ] [AI] Reconcile all 48 task checkboxes from actual proof; leave missing/private/inaccessible items explicitly OPEN.

_Buckland Blocks scope: do not invent audio-to-event matches. Review actual gameplay first, integrate only suitable audio, and test phone and desktop experience before claiming complete._

**Review gate:** This checklist should land on `main` only after the repository's required `quality` check passes. A documentation change does not certify gameplay or audio integration.

<!-- NO_COST_SUBTASKS_V1 -->
**Ownership:** `[AI]` = connected-tool implementation and testing. `[YOU]` = only essential account/device access. No paid services, no unsafe visibility changes. See the master list for evidence requirements.

**Review gate:** This documentation-only PR must still satisfy the repository's required public-repository `quality` check. No production/audio runtime changes are included.
