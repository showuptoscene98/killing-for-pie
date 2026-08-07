# Killing for Pie!

Grim cel-shaded zombie survival FPS — hold the bunker, board the windows, bank scrap, and squad up with friends.

**Live:** https://showuptoscene98.github.io/killing-for-pie/

## Stack

- Vite 8 + React 19 + TypeScript (incremental)
- Three.js / React Three Fiber
- PeerJS co-op (online) + optional LAN WebSocket relay
- Supabase (guest friends, lobbies, alerts)
- Electron thin shell loads the live Pages build

## Dev

```bash
cd zombie-game
npm install
cp .env.example .env.local   # add VITE_SUPABASE_* if using social
npm start                    # Vite + LAN coop relay
```

```bash
npm test          # vitest
npm run verify    # typecheck + lint + test
npm run build     # production → build/
```

## Desktop

```bash
npm run electron:dev    # local CRA/Vite + Electron
npm run electron:live   # packaged-style: load GitHub Pages URL
npm run dist            # Windows installer via electron-builder
```

## Gun models

Conventional firearms use **Quaternius Ultimate Gun Pack** (CC0) meshes under `public/models/guns/` — recolored to the muddy cel palette. Fantasy weapons (Pie Ray, Crust Cannon, Spatula, Rakia) stay procedural.

See `public/models/guns/CREDITS.txt`.

**Bolt-action sniper:** Mosin Nagant (`mosin`) — manual bolt cycle, stripper-clip reload, wall-buy on Sofia + Pie Yard.

## Supabase social

1. Apply migrations in `supabase/migrations/`
2. Enable **Anonymous Sign-Ins**
3. Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (local `.env.local`, Pages via Actions secrets)

## Deploy

Push to `master` → `.github/workflows/deploy-pages.yml` builds with Vite and publishes to GitHub Pages.
