import React from 'react';
import { ITEMS, ItemId } from '../game/items';

interface HUDProps {
  hotbar: (ItemId | null)[];
  selectedSlot: number;
  onSelectSlot: (index: number) => void;
  icons: Record<string, string>;
  counts: Record<string, number>;
  isLocked: boolean;
  onLockRequest: () => void;
  activeItemName: string | null;
  f3Open: boolean;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  playerPitch: number;
  isFlying: boolean;
  gameMode: 'creative' | 'survival';
  health: number;
  hunger: number;
  targetBlock: string | null;
  totalBlocks: number;
  currentBiome: string;
  entities: string;
  miningProgress: number;
  miningTarget: string | null;
  damageFlash: number;
  onOpenSettings: () => void;
  onOpenInventory: () => void;
  onOpenHelp: () => void;
  onOpenCrafting: () => void;
  onOpenIndex: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hotbar,
  selectedSlot,
  onSelectSlot,
  icons,
  counts,
  isLocked,
  onLockRequest,
  activeItemName,
  f3Open,
  playerPos,
  playerYaw,
  playerPitch,
  isFlying,
  gameMode,
  health,
  hunger,
  targetBlock,
  totalBlocks,
  currentBiome,
  entities,
  miningProgress,
  miningTarget,
  damageFlash,
  onOpenSettings,
  onOpenInventory,
  onOpenHelp,
  onOpenCrafting,
  onOpenIndex,
}) => {
  const deg = (((playerYaw * 180) / Math.PI) % 360 + 360) % 360;
  let direction = 'Nord';
  if (deg >= 45 && deg < 135) direction = 'Ouest (-X)';
  else if (deg >= 135 && deg < 225) direction = 'Sud (+Z)';
  else if (deg >= 225 && deg < 315) direction = 'Est (+X)';
  else direction = 'Nord (-Z)';

  const showDamageFlash = damageFlash > 0 && Date.now() - damageFlash < 400;

  return (
    <div
      data-game-ui=""
      className="pointer-events-none absolute inset-0 select-none overflow-hidden font-sans"
    >
      {/* Damage vignette */}
      {showDamageFlash && (
        <div
          className="pointer-events-none absolute inset-0 z-40"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(220,38,38,0) 35%, rgba(220,38,38,0.55) 100%)',
          }}
        />
      )}

      {/* Biome Badge (Top-Left) */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-medium text-white shadow-md">
        <span className="text-emerald-400 font-semibold">{currentBiome}</span>
        <span className="text-neutral-500">|</span>
        <span className="text-neutral-400 font-mono text-[11px]">
          X {Math.floor(playerPos.x)} · Y {Math.floor(playerPos.y)} · Z {Math.floor(playerPos.z)}
        </span>
      </div>

      {/* Top-Right Quick Navigation Bar */}
      <div className="pointer-events-auto absolute right-4 top-4 z-20 flex items-center gap-2">
        <button
          onClick={onOpenCrafting}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-neutral-800 hover:border-amber-500"
          title="Ouvrir la fabrication [C] (établi requis pour les armes)"
        >
          <span>🔨 Fabriquer</span>
          <kbd className="rounded bg-neutral-800 px-1 py-0.5 text-[10px] text-neutral-300 font-mono">C</kbd>
        </button>
        <button
          onClick={onOpenIndex}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-neutral-800 hover:border-purple-500"
          title="Index de tous les blocs et leur rareté [I]"
        >
          <span>📚 Index</span>
          <kbd className="rounded bg-neutral-800 px-1 py-0.5 text-[10px] text-neutral-300 font-mono">I</kbd>
        </button>
        <button
          onClick={onOpenSettings}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-neutral-800 hover:border-emerald-500"
          title="Ouvrir les paramètres [Touche P]"
        >
          <span>⚙️</span>
        </button>
        <button
          onClick={onOpenHelp}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/90 px-3 py-1.5 text-xs font-medium text-neutral-300 shadow-md transition-all hover:bg-neutral-800 hover:text-white"
          title="Guide des commandes"
        >
          <span>📖</span>
        </button>
      </div>

      {/* Crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-5 w-5">
          <div className="absolute left-0 top-2 h-1 w-5 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
          <div className="absolute left-2 top-0 h-5 w-1 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
          <div className="absolute left-[7px] top-[7px] h-[6px] w-[6px] bg-black/40" />
        </div>
      </div>

      {/* Mining progress */}
      {miningProgress > 0 && (
        <div className="absolute left-1/2 top-[calc(50%+28px)] w-40 -translate-x-1/2">
          <div className="h-2 overflow-hidden rounded-full border border-black/60 bg-black/60">
            <div
              className="h-full rounded-full bg-amber-400 transition-[width] duration-75"
              style={{ width: `${Math.round(miningProgress * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-center text-[10px] font-semibold text-white/90 drop-shadow">
            {miningTarget ?? 'Minage'} · {Math.round(miningProgress * 100)}%
          </div>
        </div>
      )}

      {/* F3 Debug Screen */}
      {f3Open && (
        <div className="pointer-events-auto absolute left-3 top-14 z-30 max-w-sm rounded bg-black/80 p-3.5 text-xs font-mono text-white shadow-xl">
          <div className="mb-1 text-sm font-bold text-yellow-400">
            VoxelCraft 3D (Monde infini · 192 couches)
          </div>
          <div className="text-emerald-300">
            XYZ: {playerPos.x.toFixed(2)} / {playerPos.y.toFixed(2)} / {playerPos.z.toFixed(2)}
          </div>
          <div className="text-sky-300">
            Bloc: {Math.floor(playerPos.x)} {Math.floor(playerPos.y)} {Math.floor(playerPos.z)}
          </div>
          <div className="text-lime-300 font-semibold">Biome: {currentBiome}</div>
          <div className="text-neutral-200">
            Direction: {direction} ({(playerYaw * (180 / Math.PI)).toFixed(1)}° /{' '}
            {(playerPitch * (180 / Math.PI)).toFixed(1)}°)
          </div>
          <div className="text-amber-200">
            Mode: {gameMode === 'creative' ? 'Créatif' : 'Survie'} | Vol: {isFlying ? 'ON' : 'OFF'}
          </div>
          <div className="text-cyan-200">Cible: {targetBlock || 'Aucun bloc'}</div>
          <div className="text-purple-300">Blocs chargés: {totalBlocks}</div>
          <div className="text-rose-300">Créatures: {entities || 'Aucune'}</div>
          <div className="mt-2 border-t border-neutral-700 pt-1 text-[10px] text-neutral-400">
            Appuyez sur F3 pour fermer ce panneau
          </div>
        </div>
      )}

      {/* Pause menu */}
      {!isLocked && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-neutral-700 bg-neutral-900/95 p-6 text-center text-white shadow-2xl">
            <div className="mb-1 text-2xl font-bold tracking-wider text-emerald-400">Menu du Jeu</div>
            <p className="mb-5 text-xs text-neutral-400">Partie en pause — Souris libérée</p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={onLockRequest}
                className="cursor-pointer rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95"
              >
                ▶️ Reprendre la Partie (Verrouiller Souris)
              </button>

              <button
                onClick={onOpenSettings}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-6 py-2.5 font-semibold text-white transition-all hover:bg-neutral-700 hover:border-emerald-500"
              >
                <span>⚙️ Paramètres & Monde</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onOpenInventory}
                  className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-800/80 p-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
                >
                  📦 Inventaire [E]
                </button>
                <button
                  onClick={onOpenCrafting}
                  className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-800/80 p-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
                >
                  🔨 Fabrication [C]
                </button>
                <button
                  onClick={onOpenIndex}
                  className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-800/80 p-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
                >
                  📚 Index des blocs [I]
                </button>
                <button
                  onClick={onOpenHelp}
                  className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-800/80 p-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
                >
                  📖 Aide
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-neutral-800 pt-3 text-[11px] text-neutral-400">
              💡 Cassez des blocs pour les récolter, fabriquez un établi puis des armes.
            </div>
          </div>
        </div>
      )}

      {/* Active item toast */}
      {activeItemName && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-sm font-semibold text-white shadow">
          {activeItemName}
        </div>
      )}

      {/* Hotbar + Health & Hunger bars (Survival) */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        {gameMode === 'survival' && (
          <div className="pointer-events-none absolute bottom-0 right-full mr-3 flex w-[146px] flex-col items-end gap-1 max-[700px]:hidden">
            <div className="flex gap-[2px] text-[13px] leading-none">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className={i < Math.ceil(health / 2) ? '' : 'opacity-25 grayscale'}
                  title={`Vie ${health}/20`}
                >
                  ❤️
                </span>
              ))}
            </div>
            <div className="flex gap-[2px] text-[13px] leading-none">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className={i < Math.ceil(hunger / 2) ? '' : 'opacity-25 grayscale'}
                  title={`Faim ${hunger}/20`}
                >
                  🍗
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 rounded-lg border-2 border-neutral-700 bg-neutral-900/90 p-1.5 shadow-2xl">
          {hotbar.map((item, idx) => {
            const isSelected = selectedSlot === idx;
            const iconUrl = item ? icons[item] : undefined;
            const cfg = item ? ITEMS[item] : undefined;
            const count = item ? counts[item] ?? 0 : 0;
            const empty = !item || (gameMode === 'survival' && count <= 0);

            return (
              <button
                key={idx}
                onClick={() => onSelectSlot(idx)}
                className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded transition-transform ${
                  isSelected
                    ? 'border-2 border-white bg-white/20 scale-105 shadow-md shadow-white/20'
                    : 'border border-neutral-700 bg-black/40 hover:bg-neutral-800'
                }`}
                title={cfg?.name || 'Emplacement vide'}
              >
                <span className="absolute left-1 top-0.5 text-[10px] font-bold text-neutral-400">
                  {idx + 1}
                </span>

                {iconUrl && !empty && (
                  <img
                    src={iconUrl}
                    alt={cfg?.name}
                    className="h-8 w-8 object-contain [image-rendering:pixelated]"
                  />
                )}

                {item && gameMode === 'survival' && count > 0 && (
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white [text-shadow:1px_1px_0_#000]">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
