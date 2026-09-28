# Open-Source Voxel Integration Plan

Status: proposed implementation roadmap
Scope: Buckland Blocks product family
Date: 2026-09-28

## Scope and repository ownership

This plan applies only to the three Buckland distribution repositories:

- `Parris-Tech-Services/BucklandBlocks` — canonical game source and implementation.
- `joshualparris/JoshHub` — JoshHub catalogue and Vercel-hosted static distribution.
- `joshualparris/buckland-blocks-demo` — GitHub Pages distribution.

The canonical game source remains BucklandBlocks. JoshHub and the demo must consume
published builds from that source and must not become independent gameplay forks.

## Goals

Use open-source voxel projects to accelerate Buckland Blocks while preserving a
browser-native TypeScript/WebGL architecture and clear provenance:

1. Reuse compatible algorithms, architecture patterns, and data-model ideas.
2. Reimplement engine behavior natively where source languages or licenses do not fit.
3. Improve world generation, survival, inventory, crafting, machines, persistence,
   mod/data definitions, and future multiplayer boundaries.
4. Keep all third-party code, assets, and notices separately auditable.

## Source review and licensing rules

Every candidate is reviewed at file and asset level before copying anything.

| Source | Useful material | Boundary |
| --- | --- | --- |
| [Luanti](https://github.com/luanti-org/luanti) | Voxel-world architecture, mod/data concepts, physics and map ideas | Engine and Minetest Game are LGPL-2.1+; C++ code is not copied into Buckland casually. Review component licenses separately. |
| [Terasology](https://github.com/movingblocks/terasology) | World, entity, block, and module architecture ideas; selectively reusable code | Code is Apache-2.0; artwork is CC-BY-4.0 or otherwise credited. Preserve notices and attribution. |
| [Sponge](https://github.com/SpongePowered/Sponge) | API and plugin architecture ideas | MIT code is permissive, but the implementation is Java/Minecraft-specific; use patterns, not Minecraft coupling. |
| [Paper](https://github.com/PaperMC/Paper) | Server performance and plugin-boundary ideas | GPLv3 and Minecraft-server-specific; reference only for Buckland’s browser client. |
| Minosoft/XMCL and other clients/launchers | Launcher UX, packaging, update, and account-flow ideas | Audit each repository and dependency license; do not copy Minecraft client code, assets, or authentication behavior. |

Mojang code, assets, sounds, textures, models, mappings, or decompiled output are
not project inputs. “Open source” project status does not transfer rights to assets
or to Minecraft-owned material. When legal compatibility is uncertain, reimplement
the behavior from public concepts and record the decision.

## Workstreams

### 1. Provenance and compliance

- Create `THIRD_PARTY_NOTICES.md` in BucklandBlocks.
- Record repository, commit/tag, file path, license, copyright notice, and intended use.
- Keep third-party assets in isolated directories with their own metadata.
- Add CI checks for missing notices, incompatible licenses, and untracked binary assets.
- Review Apache, MIT, LGPL, GPL, CC-BY, and CC-BY-NC/ND obligations separately.

### 2. Native voxel engine improvements

- Compare Luanti/Terasology chunk, meshing, culling, and streaming strategies.
- Improve Buckland chunk generation and loading without importing C++/Java engines.
- Add deterministic world seeds and migration-safe world versions.
- Keep browser memory, static deployment, and mobile controls as release constraints.

### 3. Survival and simulation

- Define authoritative block/material properties in data rather than scattered conditionals.
- Expand health, damage, hunger, drowning, swimming, gravity, tools, durability, and drops.
- Add machine/block-entity interfaces for crafting tables, furnaces, chests, and future devices.
- Add deterministic tick boundaries so a future server can own simulation state.

### 4. Inventory, crafting, and content data

- Move recipes, items, tools, armor, and block definitions toward validated data files.
- Support inventory transactions, drag/drop, stack rules, armor validation, and persistence.
- Add a content registry that can load safe first-party modules/data packs.
- Treat third-party content as untrusted input: validate types, bounds, textures, and recipes.

### 5. Rendering, UI, audio, and assets

- Recreate useful presentation patterns with Buckland-owned or permissively licensed assets.
- Prefer original/generated textures, sounds, icons, and models over copied Minecraft-like assets.
- Add source and license metadata beside every imported asset.
- Keep accessibility, keyboard controls, responsive UI, and low-end GPU behavior in scope.

### 6. Multiplayer and distribution boundary

- Do not add a Java server or Minecraft protocol dependency to the browser game.
- Design a small versioned world-state protocol only after single-player state is stable.
- Keep JoshHub and GitHub Pages as static artifact consumers.
- Deploy from canonical builds, then verify the public route and gameplay behavior.

## Delivery phases

1. **Audit:** inventory current Buckland code/assets and candidate licenses.
2. **Architecture:** write native TypeScript interfaces for blocks, items, entities,
   recipes, chunks, ticks, and content packs.
3. **Pilot:** implement one low-risk improvement, such as deterministic chunk streaming
   or data-driven recipes, with tests and attribution records.
4. **Systems:** migrate survival, machines, inventory, and content incrementally.
5. **Assets:** add only verified or newly authored assets.
6. **Release:** run type checks, unit tests, production build, browser gameplay checks,
   persistence checks, and all three public deployment checks.

No source or asset is merged solely because it is popular or labelled open source.
Each merge must identify its license, provenance, compatibility decision, tests, and
rollback path.

## Acceptance criteria

- Canonical BucklandBlocks remains the only gameplay source of truth.
- No Minecraft/Mojang code or assets are included.
- Every third-party component has a recorded license and notice.
- All new systems have focused tests and no masked failures.
- Public JoshHub and demo routes serve the same verified build artifact.
- A fresh world, an existing save, and a second browser/device path are checked before release.
