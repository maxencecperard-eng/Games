import React from 'react';
import { BlockType, BLOCK_REGISTRY } from '../game/types';

interface HUDProps {
  hotbar: BlockType[];
  selectedSlot: number;
  onSelectSlot: (index: number) => void;
  icons: Record<BlockType, string>;
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
  onOpenSettings: () => void;
  onOpenInventory: () => void;
  onOpenHelp: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hotbar,
  selectedSlot,
  onSelectSlot,
  icons,
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
  onOpenSettings,
  onOpenInventory,
  onOpenHelp,
}) => {
  // Convert yaw to compass direction
  const deg = (((playerYaw * 180) / Math.PI) % 360 + 360) % 360;
  let direction = 'Nord';
  if (deg >= 45 && deg < 135) direction = 'Ouest (-X)';
  else if (deg >= 135 && deg < 225) direction = 'Sud (+Z)';
  else if (deg >= 225 && deg < 315) direction = 'Est (+X)';
  else direction = 'Nord (-Z)';

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-sans">
      {/* Biome Badge (Top-Left) */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-medium text-white shadow-md">
        <span className="text-emerald-400 font-semibold">{currentBiome}</span>
        <span className="text-neutral-500">|</span>
        <span className="text-neutral-400 font-mono text-[11px]">Y: {Math.floor(playerPos.y)}</span>
      </div>

      {/* Top-Right Quick Navigation Bar */}
      <div className="pointer-events-auto absolute right-4 top-4 z-20 flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-neutral-800 hover:border-emerald-500"
          title="Ouvrir les paramètres [Touche P]"
        >
          <span>⚙️ Paramètres</span>
          <kbd className="rounded bg-neutral-800 px-1 py-0.5 text-[10px] text-neutral-300 font-mono">P</kbd>
        </button>
        <button
          onClick={onOpenHelp}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/90 px-3 py-1.5 text-xs font-medium text-neutral-300 shadow-md transition-all hover:bg-neutral-800 hover:text-white"
          title="Guide des commandes"
        >
          <span>📖 Aide</span>
        </button>
      </div>

      {/* 1. Crosshair in the dead center */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-5 w-5">
          {/* Horizontal line */}
          <div className="absolute left-0 top-2 h-1 w-5 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
          {/* Vertical line */}
          <div className="absolute left-2 top-0 h-5 w-1 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
          {/* Center hollow or dot */}
          <div className="absolute left-[7px] top-[7px] h-[6px] w-[6px] bg-black/40" />
        </div>
      </div>

      {/* 2. F3 Debug Screen (Authentic Minecraft styling) */}
      {f3Open && (
        <div className="pointer-events-auto absolute left-3 top-14 z-30 max-w-sm rounded bg-black/80 p-3.5 text-xs font-mono text-white shadow-xl">
          <div className="mb-1 text-sm font-bold text-yellow-400">VoxelCraft 3D (Monde 88x88 - 64 Couches)</div>
          <div className="text-emerald-300">
            XYZ: {playerPos.x.toFixed(2)} / {playerPos.y.toFixed(2)} / {playerPos.z.toFixed(2)}
          </div>
          <div className="text-sky-300">
            Bloc: {Math.floor(playerPos.x)} {Math.floor(playerPos.y)} {Math.floor(playerPos.z)}
          </div>
          <div className="text-lime-300 font-semibold">
            Biome: {currentBiome}
          </div>
          <div className="text-neutral-200">
            Direction: {direction} ({(playerYaw * (180 / Math.PI)).toFixed(1)}° / {(playerPitch * (180 / Math.PI)).toFixed(1)}°)
          </div>
          <div className="text-amber-200">
            Mode: {gameMode === 'creative' ? 'Créatif' : 'Survie'} | Vol: {isFlying ? 'Actif [ON]' : 'Désactivé'}
          </div>
          <div className="text-cyan-200">
            Cible: {targetBlock || 'Aucun bloc'}
          </div>
          <div className="text-purple-300">
            Total blocs chargés: {totalBlocks}
          </div>
          <div className="mt-2 border-t border-neutral-700 pt-1 text-[10px] text-neutral-400">
            Appuyez sur F3 pour fermer ce panneau
          </div>
        </div>
      )}

      {/* 3. Game Menu / Pause Screen (When pointer lock is released) */}
      {!isLocked && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-neutral-700 bg-neutral-900/95 p-6 text-center text-white shadow-2xl">
            <div className="mb-1 text-2xl font-bold tracking-wider text-emerald-400">
              Menu du Jeu
            </div>
            <p className="mb-5 text-xs text-neutral-400">
              Partie en pause — Souris libérée
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={onLockRequest}
                className="cursor-pointer rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95"
              >
                ▶️ Reprendre la Partie (Verrouiller Souris)
              </button>

              <button
                onClick={onOpenSettings}
                className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-6 py-2.5 font-semibold text-white transition-all hover:bg-neutral-700 hover:border-emerald-500"
              >
                <span>⚙️ Paramètres & Monde</span>
                <span className="text-xs text-neutral-400">(Presets, Heure, Sauvegarde)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onOpenInventory}
                  className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-800/80 p-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
                >
                  📦 Inventaire [E]
                </button>
                <button
                  onClick={onOpenHelp}
                  className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-800/80 p-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
                >
                  📖 Commandes & Aide
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-neutral-800 pt-3 text-[11px] text-neutral-400">
              💡 Raccourci : appuyez sur <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-emerald-300">P</kbd> en jeu pour ouvrir directement les Paramètres.
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Item Name Toast Notification (Minecraft style) */}
      {activeItemName && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-sm font-semibold text-white shadow">
          {activeItemName}
        </div>
      )}

      {/* 5. Health & Hunger bars (Survival Mode) */}
      {gameMode === 'survival' && (
        <div className="absolute bottom-22 left-1/2 flex -translate-x-1/2 items-center justify-between gap-12">
          {/* Hearts */}
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className={`text-sm ${i < health / 2 ? 'text-red-500' : 'text-neutral-600'}`}
              >
                ❤️
              </span>
            ))}
          </div>
          {/* Hunger */}
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className={`text-sm ${i < hunger / 2 ? 'text-amber-600' : 'text-neutral-600'}`}
              >
                🍗
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 6. Minecraft Authentic Hotbar */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-lg border-2 border-neutral-700 bg-neutral-900/90 p-1.5 shadow-2xl">
          {hotbar.map((blockType, idx) => {
            const isSelected = selectedSlot === idx;
            const iconUrl = icons[blockType];
            const cfg = BLOCK_REGISTRY[blockType];

            return (
              <button
                key={idx}
                onClick={() => onSelectSlot(idx)}
                className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded transition-transform ${
                  isSelected
                    ? 'border-2 border-white bg-white/20 scale-105 shadow-md shadow-white/20'
                    : 'border border-neutral-700 bg-black/40 hover:bg-neutral-800'
                }`}
                title={cfg?.name || blockType}
              >
                {/* Slot Number Badge */}
                <span className="absolute left-1 top-0.5 text-[10px] font-bold text-neutral-400">
                  {idx + 1}
                </span>

                {/* Block Icon Preview */}
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt={cfg?.name}
                    className="h-8 w-8 object-contain [image-rendering:pixelated]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
