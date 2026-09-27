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
