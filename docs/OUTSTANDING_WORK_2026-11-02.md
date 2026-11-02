# Buckland Blocks — privacy review handoff (2 November 2026)

**Status: REVIEWED_FINDINGS_OPEN; no production fix, merge, deployment or interactive playtest verified.** This document lives in the canonical Buckland Blocks repository on a **documentation PR branch**, not production `main`. Preserve the existing `AUDIO_INTEGRATION_TODO.md` and its IDs unchanged.

## Source of truth and scope

- Canonical project: `Parris-Tech-Services/BucklandBlocks`; `BucklandBlocks1` is a predecessor/copy and must not become a competing production authority.
- Greptile existing completed PR-diff review: `36158287`, [predecessor PR #3](https://github.com/Parris-Tech-Services/BucklandBlocks1/pull/3), reviewed commit `f539c0b98cb1322ebc35ee53ea0cece06aff125b`, completed 28 October 2026, confidence 5/5, **zero inline findings**. Reused; no new review or credits.
- Canonical equivalent privacy change: [BucklandBlocks PR #44](https://github.com/Parris-Tech-Services/BucklandBlocks/pull/44), **OPEN** when checked 2 November.
- Independent source observation: `client/src/engine/World.tsx:13` on canonical `main` still contains a specific street number; the privacy PR removes it. `.github/copilot-instructions.md` on predecessor `main` also repeats the number. **The number is deliberately omitted from this tracker.** This is a source-level exposure; ownership/residential sensitivity and actual production reachability are not established.
- `AGENTS.md` forbids direct pushes/merges to `main`; changes require the Game Release Gate, preview and owner-approved gameplay verification.

## Numbered tasks

- [x] **BKB-GR-001** [TRIAGE] Reconcile the completed Greptile review without spending another credit.
  - **Start/triage:** Read predecessor PR #3 and Greptile run `36158287`; compare reviewed change with canonical PR #44.
  - **Evidence:** Existing review completed, 5/5, zero inline findings; independent main-vs-PR source inspection on 2 Nov 2026. No repository-wide review or test claimed.
  - **Dependencies:** None; do not confuse a safe-looking PR review with deployed remediation.
  - **Proposed minimal fix:** Record review provenance and open acceptance work, without touching gameplay or privacy data.
  - **Acceptance:** Existing review ID, commit and PR links verified; no duplicate review triggered. Documentation-only acceptance satisfied.

- [ ] **BKB-GR-002** [P1 — conditional privacy exposure] Verify and release the canonical removal of a specific house number.
  - **Start/triage:** Inspect canonical `client/src/engine/World.tsx:13` on `main` and [PR #44](https://github.com/Parris-Tech-Services/BucklandBlocks/pull/44); establish whether the number identifies a private residence before escalating severity. Do not reproduce the number in logs, issues or reports.
  - **Evidence:** Canonical `main` still includes the number; the privacy branch removes it. This is an independent source finding, **not** a Greptile inline comment.
  - **Dependencies:** Owner/maintainer approval and `AGENTS.md` release gate; confirm branch/head and absence of competing edits.
  - **Proposed minimal fix:** Keep the privacy PR narrowly scoped; remove the precise number from runtime location and instructions while preserving street-level gameplay.
  - **Acceptance:** `npm run verify` on exact PR head; CI Game Release Gate PASS; manual preview verifies start/resume/map behaviour; owner approves; merge only through protected release flow; verify production deployment SHA and no number in current public source/assets.

- [ ] **BKB-GR-003** [P2] Reconcile the predecessor/mirror and prevent reintroduction.
  - **Start/triage:** Inspect [BucklandBlocks1 PR #3](https://github.com/Parris-Tech-Services/BucklandBlocks1/pull/3), canonical PR #44, `.github/copilot-instructions.md`, and `client/src/engine/privacy.test.ts`; check whether the predecessor is deployed or only archived.
  - **Evidence:** Predecessor `main` still contains the number; its open privacy PR removes it and adds a regression test.
  - **Dependencies:** BKB-GR-002 and canonical-source policy; do not independently develop or publish a second product.
  - **Proposed minimal fix:** Align predecessor status/documentation with canonical release; retain regression protection without creating a second production authority.
  - **Acceptance:** Confirm predecessor visibility/deployment and current main/PR diff; preserve repository history; document resolution and verify no newly exposed precise address.

- [ ] **BKB-GR-004** [P2] Validate real production privacy and gameplay, beyond Greptile/CI.
  - **Start/triage:** Inspect production Vercel deployment provenance and public assets; test start/resume/location in an actual browser, including mobile and failure paths.
  - **Evidence:** Greptile review and source diff only; **no live browser or deployed asset verification performed on 2 November**.
  - **Dependencies:** BKB-GR-002, BKB-GR-003; do not use paid browser tooling without permission.
  - **Proposed minimal fix:** Add/retain focused regression assertions for house-number absence and release-safe location fallback.
  - **Acceptance:** Exact tested production SHA, screenshots/redacted logs, real browser actions, no leaked number in rendered assets/network, and all release gates documented; only then close.

## Checkpoint

2 Nov 2026: Greptile `36158287` reused, no new review. Source-level specific-number exposure confirmed on both main branches; both privacy PRs remain open. No source fix, merge, CI execution, browser playtest, production verification or paid usage claimed.
