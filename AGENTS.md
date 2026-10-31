# AGENTS.md

VoxelCraft 3D is a client-only React 19 + Three.js voxel sandbox. `README.md` and `PRD.md` are French product docs; trust the code/config when they disagree.

## Commands

- `npm install` — use npm (documented in README, `package-lock.json` present). `.npmrc` sets `legacy-peer-deps=true`.
- `npm run dev` — Vite on `http://localhost:3000` (port/host fixed in `package.json`).
- `npm run lint` — this is `tsc --noEmit`, not ESLint. It is the only automated check.
- `npm run build` — production bundle into `dist/`; the >500 kB chunk warning is expected.
- `npm run clean` — removes `dist/` and `server.js`.
- There is no test runner, test directory, lint config, or CI. Verify changes with `npm run lint && npm run build` plus manual play in the browser.

## Architecture

- `src/App.tsx` is the controller: it creates the engine once in `useEffect([])`, keeps instances in `gameRef`, runs a 16 ms physics/HUD interval, and owns input, mining, combat, crafting and modals. `GameRenderer` runs its own render loop.
- `src/game/` is framework-free TypeScript:
  - `world.ts` — infinite chunked world, biomes, caves, ores, trees, presets, undo/redo, sparse edits, export/import.
  - `items.ts` — item registry (blocks + `stick` + wood/stone/iron/diamond swords & pickaxes), recipes, `getBreakInfo`, `getAttackDamage`.
  - `types.ts` — closed `BlockType` union + `BLOCK_REGISTRY` (rarity, hardness, tool, `minTier`), `BLOCK_IDS` / `ID_TO_BLOCK`, biomes.
  - `renderer.ts` — per-chunk per-type `InstancedMesh`, dirty-chunk rebuild, raycast, combat, hand item, TNT, day/night.
  - `physics.ts`, `entities.ts` (mobs + health bars), `textures.ts` (procedural textures and item icons), `particles.ts`, `audio.ts`.
- `src/components/` is React HUD/modals only; keep Three.js work out of components.

### World

- Chunks are 16×16 columns; world is infinite horizontally, `y = -64..128` (`WORLD_MIN_Y`/`WORLD_MAX_Y`, `WORLD_HEIGHT = 192`), sea level 20.
- Chunks are generated on demand by `getChunk(cx, cz, generate)`, cached in a `Map`, and unloaded by `unloadFarChunks` (renderer keeps radius 4 chunks).
- Blocks are stored per chunk in a `Uint16Array` indexed via `BLOCK_IDS`; a `topY` column array limits render iteration.
- Player edits are kept in sparse `Map<"x,y,z", BlockType>` (`edits` / `editsByChunk`) and re-applied on chunk generation, so only edits are persisted.
- Every `setBlock(...)` writes the block, records undo, stores the edit, and calls `onChunkDirty` for the chunk plus the neighbouring chunks when the block sits on a chunk border. `GameRenderer` coalesces these into `dirtyChunks` and rebuilds at most once per 200 ms sync tick.
- Presets write through `setLocal` during generation and fire one `onWorldChange` at the end. `explodeTNT` calls `setBlock` per block; batch edits deliberately.
- `renderer.currentHit` is refreshed only by the render loop; click/place/mining logic reads this cached raycast result.
- Persistence uses `localStorage` key `voxelcraft_saved_world`, JSON schema `version: 3` (`seed`, `preset`, `edits[]`). `importJSON` also converts legacy v2 `blocks[]` exports.

### Survival loop

- The game starts in **survival** with an empty hotbar; the hotbar only fills from mined items (`addItem` assigns the first free slot).
- Mining: hold left click. `App` accumulates progress from `getBreakInfo(block, heldItem)`; creative breaks instantly (140 ms throttle). Stone/grès/briques require any pickaxe (`minTier: 1`), ores require their tier; a too-weak tool still breaks the block but drops nothing and shows a toast.
- Combat: left click attacks mobs (`renderer.tryAttack`), damage from `getAttackDamage`. Hostile mobs (zombies/skeletons) chase and hit the player at night via `renderer.onPlayerHit`; player regenerates 1 HP / 6 s.
- Crafting: `C` opens `CraftingModal`. Basic recipes (planks, stick, crafting table) work anywhere; table recipes need a crafting table within ±5/±2 blocks (`findNearbyTable`) or a right click on a table. Crafting animates over `recipe.time` seconds.
- Day/night: 6 min full cycle (`dayCycleSpeed = 1/360`), `sunY > 0` is day. `MobManager` swaps population when `isDay` flips.

### Blocks and items

- Adding a block: extend the closed `BlockType` union and `BLOCK_REGISTRY` in `src/game/types.ts` (name, category, rarity, `hardness`, `tool`, optional `minTier`), then add its material/icon in `TextureManager` (`src/game/textures.ts`). Missing textures fall back to gray.
- `BLOCK_IDS` is derived from registry key order; do not reorder existing keys without considering saved edits (ids are only used at runtime, edits are stored by name).
- Adding an item/tool: extend `ItemId`/`ITEMS` in `items.ts`, add recipes in `RECIPES`, and provide an icon path in `TextureManager.getItemIcon` for non-block items.
- Inventory, hotbar, crafting list and block index all derive from the registries, so no separate UI list is needed.
- `MobManager` (`src/game/entities.ts`) owns pigs/cows by day and zombies/skeletons at night, with per-mob HP bars, chasing and `hitTest`. Call `renderer.mobs.reset(position)` after regenerating/importing a world; do not touch mob meshes from React.

## Conventions and gotchas

- Player-facing text, block names, and docs are French; code identifiers are mostly English. Keep new UI copy French.
- Textures and sounds are generated at runtime (Canvas 2D and Web Audio); do not add image/audio assets. `soundEngine` initializes audio lazily on user gesture.
- `@/*` resolves to the repository root, not `src/` (`vite.config.ts` and `tsconfig.json`); all current imports are relative.
- `@google/genai`, `express`, and `dotenv` are unused AI Studio scaffold dependencies; the app makes no Gemini/API calls.
- `vite.config.ts` intentionally disables HMR/watch when `DISABLE_HMR=true`; do not change that block if edits stop hot-reloading.
- `src/index.css` is Tailwind v4 via the Vite plugin (no `tailwind.config`) plus the `craftPop` keyframes used by the crafting animation.
- The WebGL canvas must never be recreated by React. It is mounted once into `mountRef`; changing React state must not remount it.
- Modals vs pointer lock: opening a modal calls `document.exitPointerLock()`, and `handleMouseDown` ignores clicks inside any `[data-game-ui]` node or while `modalOpenRef` is true (otherwise a click on a setting re-locks the mouse and the user must press Escape to interact). HUD, ControlDock and every modal root carry `data-game-ui`. Keyboard input is neutralised while a modal is open (`IDLE_INPUT` in the physics tick); `Échap` closes open modals.
- Headless verification: Chrome + SwiftShader can screenshot the app, but `requestPointerLock` fails without a real user gesture. Test mining by overriding `document.pointerLockElement` (return `canvas.parentElement`) and dispatching `pointerlockchange`/`mousemove`.
