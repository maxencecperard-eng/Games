# AGENTS.md

VoxelCraft 3D is a client-only React 19 + Three.js voxel sandbox. `README.md` and `PRD.md` are French product docs; trust the code/config when they disagree.

## Commands

- `npm install` — use npm (documented in README, `package-lock.json` present). `.npmrc` sets `legacy-peer-deps=true`.
- `npm run dev` — Vite on `http://localhost:3000` (port/host fixed in `package.json`).
- `npm run lint` — this is `tsc --noEmit`, not ESLint. It is the only automated check.
- `npm run build` — production bundle into `dist/`; the >500 kB chunk warning is expected.
- `npm run clean` — removes `dist/` and `server.js`.
- There is no test runner, test directory, lint config, or CI. Verify changes with `npm run lint && npm run build` plus manual play in the browser; there is no single-test command to run.

## Architecture

- `src/App.tsx` is the controller: it creates the engine once in `useEffect([])`, keeps instances in `gameRef`, runs a 16 ms `setInterval` physics/HUD sync, and wires input and modals. `GameRenderer` runs its own `requestAnimationFrame` loop.
- `src/game/` is framework-free TypeScript: `world.ts` (voxel data + presets), `physics.ts`, `renderer.ts`, `textures.ts`, `particles.ts`, `audio.ts`. `src/components/` is React HUD/modals only; keep Three.js work out of components.
- `VoxelWorld` is a finite 88×88×64 map (`x,z` in `[-44,43]`, `y` in `0..63`, sea level 20) stored as `Map<"x,y,z", BlockType>`. It is not chunked or infinite.
- Rendering groups blocks by type into one `InstancedMesh` per type. "Hidden face culling" only removes voxels fully enclosed by six opaque neighbors; it is not per-face meshing.
- Every `setBlock(...)` fires `world.onWorldChange`, which synchronously calls `GameRenderer.rebuildAllMeshes()` over the entire world. Presets avoid this by writing to `blocks` directly and firing once at the end. `explodeTNT` calls `setBlock` per block, so it rebuilds repeatedly. Batch edits deliberately.
- The WebGL canvas must never be recreated by React. It is mounted once into `mountRef`; changing React state must not remount it.
- `renderer.currentHit` is refreshed only by the render loop; click/place logic reads this cached raycast result.
- Adding a block: extend the closed `BlockType` union and `BLOCK_REGISTRY` in `src/game/types.ts`, then add its material/icon in `TextureManager` (`src/game/textures.ts`). Missing textures fall back to gray. Inventory and hotbar derive from the registry, so no separate UI list is needed.
- Persistence uses `localStorage` key `voxelcraft_saved_world` and JSON schema `version: 2`. Keep export/import compatible.

## Conventions and gotchas

- Player-facing text, block names, and docs are French; code identifiers are mostly English. Keep new UI copy French.
- Textures and sounds are generated at runtime (Canvas 2D and Web Audio); do not add image/audio assets. `soundEngine` initializes audio lazily on user gesture.
- `@/*` resolves to the repository root, not `src/` (`vite.config.ts` and `tsconfig.json`); all current imports are relative.
- `@google/genai`, `express`, and `dotenv` are unused AI Studio scaffold dependencies; the app makes no Gemini/API calls.
- `vite.config.ts` intentionally disables HMR/watch when `DISABLE_HMR=true`; do not change that block if edits stop hot-reloading.
- `src/index.css` is only `@import "tailwindcss";` (Tailwind v4 via the Vite plugin, no `tailwind.config`).
