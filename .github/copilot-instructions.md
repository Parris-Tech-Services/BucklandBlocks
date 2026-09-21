# Copilot/AI Agent Instructions for Buckland Blocks

## Project Overview
- **Buckland Blocks** is a browser-based voxel sandbox game that procedurally recreates a real-world location (starting at 53 Buckland Street, Epsom VIC 3551) using OpenStreetMap (OSM) data.
- The project is built with modern web technologies: React, Three.js (via @react-three/fiber), Zustand for state, and Vite for build tooling.
- The world is divided into 16×16×128 voxel chunks, with chunked rendering, greedy meshing, and frustum culling for performance.
- OSM data is fetched and processed to extrude buildings and roads into the voxel world at runtime.

## Key Architectural Patterns
- **Chunk System:**
  - Chunks are managed in `useGame` (Zustand store). Each chunk is a `Uint8Array` of block types, keyed by `"x,z"`.
  - Chunks are generated on demand using noise-based terrain and OSM overlays (`generateChunkTerrain`, `processOSMData`).
  - Dirty chunks are tracked for efficient re-meshing.
- **Rendering:**
  - Chunks are rendered as React components (`Chunk.tsx`), using Three.js meshes/materials.
  - Block faces are meshed with a custom greedy mesher (`mesher.ts`).
- **Player/Interaction:**
  - Player state and controls are managed in `Player.tsx` and the Zustand store.
  - Raycasting is used for mining/placing blocks, with inventory and hotbar logic in the store.
- **World Persistence:**
  - Game state (chunks, inventory, player) is saved to and loaded from `localStorage`.
- **OSM Integration:**
  - OSM data is fetched via `/api/geocode` and `/api/footprints` endpoints, then processed in `processOSMData` to stamp buildings/roads into chunk voxel data.

## Developer Workflows
- **Install:** `npm install`
- **Dev Server:** `npm run dev` (starts both client and server)
- **Build:** `npm run build` (Vite + esbuild for server)
- **Type Check:** `npm run check`
- **Database:** `npm run db:push` (Drizzle ORM)

## Project-Specific Conventions
- **Block Types:** Defined in `blocks.ts` as an enum and data map. Textures are in `client/public/textures/`.
- **Chunk Size:** Always 16×128×16. Block Y=64 is ground level.
- **Inventory:** 9-slot hotbar + 27-slot main inventory, managed in Zustand.
- **OSM Data:** All worldgen overlays (buildings, roads) are processed per-chunk in `processOSMData`.
- **Textures:** Use nearest-neighbor filtering for pixel-art look.
- **No proprietary IP:** All assets and code must be IP-safe and original.

## Key Files/Directories
- `client/src/engine/World.tsx` — World/chunk management and OSM integration
- `client/src/engine/Chunk.tsx` — Chunk rendering
- `client/src/engine/Player.tsx` — Player controls and block interaction
- `client/src/engine/blocks.ts` — Block type definitions
- `client/src/lib/stores/useGame.tsx` — Zustand game state
- `client/src/utils/osm.ts` — OSM data fetch/processing
- `client/public/textures/` — Block textures

## Example: Adding a New Block Type
1. Add to `BlockType` enum and `BLOCKS` map in `blocks.ts`.
2. Add texture to `client/public/textures/`.
3. Update mesher/materials if needed.

---

For more, see `README.md` or ask for architectural diagrams or code walkthroughs.
