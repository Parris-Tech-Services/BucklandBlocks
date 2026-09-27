# Buckland Blocks

Engineering principles: v5.1  
Assurance tier: 2  
Canonical repository: https://github.com/Parris-Tech-Services/BucklandBlocks

## Development

Install dependencies with `npm ci`, then run `npm run dev` for the full Express/Vite application.

Useful verification commands:

- `npm run check` — TypeScript/static checking.
- `npm run test:save` — persistent save validation/migration/recovery checks.
- `npm run build` — production Vite + server build.

The game can also be built as static files with `npm run build`. Static deployments leave
`VITE_ENABLE_OSM` unset, so the game uses its procedural terrain without requiring the optional
geocoding and OpenStreetMap API routes. Set `VITE_ENABLE_OSM=true` only when those routes are
available in the deployment.

## Persistent world data

Browser saves use `localStorage` key `buckland_blocks_save`, currently schema version 2.

The procedural world is regenerated from the fixed `procedural-v1` seed. Saves persist player
position/rotation, inventory, selected hotbar slot, game time, and only chunks the player has
modified. Persisting edited chunk overrides instead of every generated chunk keeps save size tied
to player changes rather than travel distance.

Invalid saved data is not silently deleted. The game refuses to load it and leaves the original
browser-storage value in place for recovery or inspection. Starting a new world is the explicit
destructive action that removes the existing local save.

## Deployment path

`Parris-Tech-Services/BucklandBlocks` is the editable canonical source. The public JoshHub game is a
built static artifact copied into `public/games/buckland-blocks`; production should only be updated
from a verified source commit/build.
