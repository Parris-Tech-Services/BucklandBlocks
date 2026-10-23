# Optional portal startup repair — 23 October 2026

A local browser smoke test exposed an unhandled `PortalAdapter is not defined` error when the external cross-game script was unavailable. The game now starts without that service. Existing portal integration remains available explicitly through `?features=portals`; it initialises after script load and reports failures without crashing local play.

No world, inventory or save schema changes. Release uses the existing PR, full verification and Git deployment path. No gate has been weakened.
