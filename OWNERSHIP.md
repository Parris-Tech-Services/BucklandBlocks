# Buckland Blocks — ownership, canonical source and integration contract

Engineering principles: v5.1
Assurance tier: 2 (regularly-used personal game with local-storage saves someone would care about losing)
Canonical repository: https://github.com/Parris-Tech-Services/BucklandBlocks

## Canonical source determination (codingprinciples.md §0.4)

Multiple repos currently claim to be "Buckland Blocks." Per §0.4, that requires an
explicit resolution rather than silent parallel work:

- **`Parris-Tech-Services/BucklandBlocks`** (this repo) — **CANONICAL**. Confirmed by
  direct evidence: temporary debug markers (`__chunkMeshBuilds`, `__chunkRenders`)
  added to this repo's `client/src/engine/Chunk.tsx` during a debugging session
  appeared, byte-for-byte, inside the currently-deployed bundle
  (`joshualparris/JoshHub`'s `public/games/buckland-blocks/assets/index-B-nr2UZj.js`).
  This proves builds published to the live game are produced from this repo's
  working tree.
- **`Parris-Tech-Services/BucklandBlocks1`** — empty stub (README + audit folder only,
  no source). Not in active use. Non-canonical; role = **placeholder, do not develop
  against it**.
- **`joshualparris/buckland-blocks-demo`** ("Working demo of Buckland Blocks") — not
  yet reconciled against this repo. Flagged for review; treat as **non-canonical**
  until an explicit role is assigned. Do not develop features against it.
- **`joshualparris/JoshHub`** `public/games/buckland-blocks/` — this is a **generated
  distribution copy**, not source. It holds a `vite build` output of this repo,
  committed directly (no build step runs inside JoshHub itself for this game). It is
  what `josh-hub-two.vercel.app/games/buckland-blocks/index.html` actually serves.
  There is also a separate `public/games/buckland-v2/` in the same repo — a distinct,
  not-yet-reconciled build. Do not edit gameplay code inside JoshHub; edit here and
  republish the build.

**Deployment trace:** `Parris-Tech-Services/BucklandBlocks` (branch
`fix/buckland-static-runtime`) → `npm run build` (Vite) → `dist/public/*` copied into
`joshualparris/JoshHub` `public/games/buckland-blocks/` → Vercel project `josh-hub`
(`prj_4dF21nt8YrcxB3MLsJuZrlzxrUqD`) → `josh-hub-two.vercel.app`.

## Environment note (affects everyone building here)

This repo's root `node_modules` had a stray **tracked git blob** literally named
`node_modules` (a file, not a directory — commit `3efae5a`, ~11 months old). Any git
checkout/stash touching that path clobbers the real `node_modules` directory with
that placeholder, which is what happened during this session. Fixed by
`git rm --cached node_modules` + reinstall; `.gitignore` already excludes it going
forward. If you see `node_modules` behaving like a 1-byte file again, this is why —
do not `rm -rf` and reinstall blindly without checking `git ls-files -- node_modules`
first.

## Agent ownership (per Josh's brief)

- **Claude (primary)** — terrain generation and meshing, chunk rendering and
  lifecycle, performance, spawn and camera orientation, player physics/world
  collision/block targeting, integration across all agents, final build/deploy/
  production verification.
- **Codex (secondary)** — pause/menu architecture, input lifecycle and pointer-lock
  handling, save/load orchestration and validation, WebGL failure handling.
- **agy (tertiary)** — inventory interactions, item/recipe definitions, crafting and
  inventory transactions.

## Single-editor map for shared files

| File | Editor | Notes |
|---|---|---|
| `client/src/engine/Player.tsx` | **Claude** (physics/collision/targeting sections) | Codex may need pointer-lock/input-lifecycle hooks here — coordinate before editing; do not both edit the same function bodies concurrently. |
| `client/src/engine/World.tsx`, `Chunk.tsx`, `mesher.ts` | **Claude** | |
| `client/src/renderer/HooksBridge.tsx` | **Claude** | |
| `client/src/lib/stores/useGame.tsx` (game store) | **shared fact-owner: Claude for world/chunks/physics fields, Codex for phase/save fields, agy for inventory fields** | Each agent owns only its own fields per §3.1 (one fact, one canonical authority); do not edit another agent's fields without a patch/integration request. |
| Pause/menu components | Codex | |
| Save/load (`client/src/engine/save.ts`) | Codex | Claude will supply the player-transform shape it produces; Codex owns restoration logic. |
| Inventory/crafting UI + logic | agy | |

## Discovered bugs and status (this session)

Confirmed root causes, fixed in branch `fix/buckland-static-runtime` of this repo:

1. **FPS collapse (was ~3–6 FPS reported, unplayable).** `HooksBridge.tsx` wrote
   `fps`/`playerPosition`/`playerRotation` to the Zustand store every animation
   frame (new `Vector3`/object allocated each time), and both `HooksBridge.tsx` and
   `World.tsx` subscribed to the *whole* store (`useGame()`, no selector) instead of
   selecting only what they use. Every store write forced a full React re-render of
   the entire chunk tree, 60×/sec. Fixed: targeted selectors in both files; store
   writes throttled to 10 Hz (nothing downstream needs per-frame precision — only
   HUD text, pause menu and on-demand save read these fields).
2. **One WebGL draw call per voxel face (~118,000 groups across 9 starting
   chunks, per prior inspection of the deployed bundle).** `mesher.ts` added a
   `geometry.addGroup()` per face instead of batching same-material faces.
   Fixed (already in progress from an earlier session, reconciled here): index
   buffers are now built per-material and a single group is added per material
   per chunk. **Measured after fix: 72–74 real WebGL `drawElements` calls per
   frame** (patched at the raw GL level, not estimated) at spawn and after a 4-second
   forward traversal crossing multiple chunk boundaries — see Evidence below.
3. **Texture "TV static" on large/distant surfaces.** `minFilter` was
   `THREE.NearestFilter`, which disables mipmapping; any minified surface aliased
   into full-screen shimmering noise. Fixed: `THREE.NearestMipmapLinearFilter`
   (magFilter stays `NearestFilter` so close-up voxels are still crisp/blocky).
4. **Spawn/physics: player could fall through terrain before chunks generated,
   and vertical "collision" was a same-column highest-block clamp (no real
   walls/ceilings, no caves).** Fixed: `client/src/engine/collision.ts` adds
   real per-axis AABB collision against solid voxels, substepped (0.2 units/
   step) to prevent tunnelling through thin walls on a slow frame. Physics
   freezes over a column whose chunk hasn't generated yet instead of treating
   it as open air. Caves/overhangs now work correctly (no longer snapped to
   the highest block in the column).
5. **Block-selection outline mesh was centred on the voxel's min-corner
   coordinate instead of its centre**, so the wireframe cube didn't wrap the
   targeted block. Fixed: render position offset by `+0.5` on each axis.
6. **Found and fixed while verifying #4:** the default-spawn ground search
   excluded tree trunk/leaf blocks from counting as "ground" but never
   checked whether the chosen spot actually had headroom above it. Where a
   trunk stood directly on solid ground with no gap, this placed the player's
   body inside the trunk at spawn, permanently freezing all movement via
   self-collision (confirmed by frame-by-frame instrumentation: velocity
   non-zero every frame, position never changing). Fixed by validating
   headroom with the same collision check the trunk itself is subject to,
   rather than excluding block types up front.
7. **Found and fixed while verifying #6:** the spawn placement and its own
   safety check used inconsistent coordinates (integer column corner vs.
   column centre), which — because the player has non-zero width — could
   make the check pass while the actual spawn point still collided with
   terrain in the neighbouring column. Fixed by using the column centre
   consistently in both places.

## Evidence (codingprinciples.md §9.4 — evidence, not confidence)

- `npm run check` (tsc) → exit 0.
- `npm test` → **13/13 passed** — `collision.test.ts` (5), `mesher.test.ts` (3,
  regression-tests the face-batching fix directly), `raycast.test.ts` (5,
  covers zero-direction, negative coordinates, exact voxel boundaries, and
  max-distance cutoff per the brief's explicit requirement), via node's
  built-in test runner — no new dependency.
- `npx vite build` → exit 0.
- Headless Chromium (software/swiftshader rendering — **not representative of
  real GPU hardware performance**, only used to verify correctness and relative
  draw-call reduction): zero page errors, zero failed network requests, across
  page load, onboarding flow, a 4-second forward-movement traversal crossing
  chunk boundaries, and jump (verified via frame-by-frame internal-state
  polling from inside the page — this sandbox renders as few as ~3 real frames
  per second, too sparse to catch a jump's arc by wall-clock sampling; the
  poll confirmed velocity flips from 0 to positive and the grounded flag
  clears on jump, then gravity correctly re-lands the player).
- Real WebGL instrumentation (`gl.drawElements` call-counted directly, not
  estimated): 64–74 draw calls per frame at spawn and after traversal. This is
  the correct, environment-independent signal for the mesh-batching fix; raw
  FPS in this sandbox is not (software rendering of ~400–480k triangles is
  inherently slow regardless of code quality).
- **Verified against the live production URL** after deploy (see below):
  zero console errors, real position change confirmed after a 3-second
  forward-movement traversal.
- **Not yet measured on Josh's actual desktop hardware.** Per the brief's
  acceptance criteria, the 30–60 FPS target cannot be claimed passed until real
  hardware confirms it — this is an explicit open item, not a claimed pass.

## Deployment (completed this session)

- `Parris-Tech-Services/BucklandBlocks` branch `fix/buckland-static-runtime`,
  commit `fc98c81` → draft PR:
  https://github.com/Parris-Tech-Services/BucklandBlocks/pull/2
- Built (`npx vite build`) and copied into `joshualparris/JoshHub`
  `public/games/buckland-blocks/` (commit `b5c29d4`, merged with concurrent
  unrelated doc-archive commits from another remote, pushed to the
  `joshualparris/JoshHub` fork — the `origin` remote there,
  `joshuaparrisdadlan-stack/JoshHub`, denied write access to this account).
- Deployed to Vercel production (`josh-hub` project) via `vercel --prod`;
  live at `https://josh-hub-two.vercel.app/games/buckland-blocks/index.html`,
  confirmed serving the new bundle (`index-B0zwj5Cu.js`) with zero console
  errors and working movement.

## Open items / blockers

- Real-hardware FPS measurement — blocked on access to Josh's actual desktop;
  reporting the limitation rather than claiming the target passed.
- Reconcile `buckland-v2` and `buckland-blocks-demo` against this canonical
  determination — not yet started, flagged so no agent invests further feature
  work in either without resolving §0.4 first.
- Full regression pass (pause/menu, save/load, inventory/crafting) once
  Codex's and agy's changes land — those areas are outside this session's
  scope per the ownership map above.

## Coordination ask (relayed from Josh, via "astra")

All three agents: please open **draft PRs early**, including your own tests and
evidence, rather than waiting for a "finished" state. This lets the others see
in-flight work against shared files (see the single-editor map above) instead of
discovering it via built-artifact timestamps.
