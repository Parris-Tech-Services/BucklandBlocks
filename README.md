# Buckland Blocks

Engineering principles: v5.1
Assurance tier: 2
Canonical repository: https://github.com/Parris-Tech-Services/BucklandBlocks

## Development

Install dependencies with `npm ci`, then run `npm run dev` for the full Express/Vite application.

The game can also be built as static files with `npm run build`. Static deployments leave
`VITE_ENABLE_OSM` unset, so the game uses its procedural terrain without requiring the optional
geocoding and OpenStreetMap API routes. Set `VITE_ENABLE_OSM=true` only when those routes are
available in the deployment.

## Recorded field guide — VO061–VO080
All 20 owner-uploaded ElevenLabs MP3 recordings have been reused under `client/public/voice/`. The original root files remain unchanged. The 20 exact scripts and trigger descriptions are in `client/src/lib/voice/voiceCatalogue.ts`.

Open **Pause → Recorded field guide → Voice ON** to hear the welcome and enable one-time contextual guides. Replay any of the twenty in the expandable library, or change volume/mute at any point. Only known events trigger narration: tool selection, item pickup/mining, crafting, daytime transition, damage, inventory full, successful/failed save, furnace and respawn. `VO073`, `VO074` and `VO077` remain manual because tool durability, ledge detection and return-to-camp state are not verified; `VO079` and `VO080` are informational and manually playable. Audio cues queue rather than overlap; no runtime requests to ElevenLabs, no API keys, and no new generation credits.

### Feature flag for staged rollout
As required by AGENTS.md, the new `voiceguide` feature is **off by default** while production validation is staged. To try all 20 recorded lines, open **`?features=voiceguide&features-save=1`** on the game website. Then choose **Pause → Voice ON**. To immediately disable it, use **`?features=none&features-save=1`**. The current CI smoke test covers both enabled voice playback and the disabled kill switch. Once approved in production, a separate reviewed change can enable it for all users.
