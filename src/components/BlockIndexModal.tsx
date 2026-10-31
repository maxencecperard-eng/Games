import React, { useMemo, useState } from 'react';
import { BlockType, BLOCK_REGISTRY, RARITIES, RARITY_ORDER, Rarity } from '../game/types';
import { soundEngine } from '../game/audio';
import { X, Search, Pickaxe } from 'lucide-react';

interface BlockIndexModalProps {
  isOpen: boolean;
  onClose: () => void;
  icons: Record<string, string>;
  inventory: Record<string, number>;
}

const TOOL_LABELS: Record<string, string> = {
  pickaxe: 'Pioche',
  axe: 'Hache',
  shovel: 'Pelle',
};

export const BlockIndexModal: React.FC<BlockIndexModalProps> = ({ isOpen, onClose, icons, inventory }) => {
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');

  const blocks = useMemo(
    () => (Object.keys(BLOCK_REGISTRY) as BlockType[]).filter((b) => b !== 'air' && b !== 'water'),
    []
  );

  if (!isOpen) return null;

  const filtered = blocks.filter((b) => {
    const cfg = BLOCK_REGISTRY[b];
    if (rarityFilter !== 'all' && cfg.rarity !== rarityFilter) return false;
    if (search.trim() && !cfg.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const countsByRarity = RARITY_ORDER.reduce<Record<string, number>>((acc, r) => {
    acc[r] = blocks.filter((b) => BLOCK_REGISTRY[b].rarity === r).length;
    return acc;
  }, {});

  return (
    <div data-game-ui="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans">
      <div className="relative w-full max-w-5xl rounded-xl border-2 border-purple-800/60 bg-neutral-900 p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-wide text-purple-200">📚 Index des Blocs</h2>
            <p className="mt-1 text-xs text-neutral-400">
              Tous les blocs du jeu, leur rareté, leur dureté et l'outil requis pour les récolter.
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                soundEngine.playUIClick();
                setRarityFilter('all');
              }}
              className={`cursor-pointer rounded px-2.5 py-1.5 text-[11px] font-semibold ${
                rarityFilter === 'all' ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              Toutes ({blocks.length})
            </button>
            {RARITY_ORDER.map((r) => (
              <button
                key={r}
                onClick={() => {
                  soundEngine.playUIClick();
                  setRarityFilter(r);
                }}
                className={`cursor-pointer rounded px-2.5 py-1.5 text-[11px] font-bold ${
                  rarityFilter === r ? 'text-neutral-900' : 'text-neutral-300'
                }`}
                style={{
                  backgroundColor: rarityFilter === r ? RARITIES[r].color : '#262626',
                  color: rarityFilter === r ? '#171717' : RARITIES[r].color,
                }}
              >
                {RARITIES[r].label} ({countsByRarity[r]})
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Rechercher un bloc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded bg-neutral-800 py-1.5 pl-8 pr-3 text-xs text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="mt-4 grid max-h-[430px] grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => {
            const cfg = BLOCK_REGISTRY[b];
            const rarity = RARITIES[cfg.rarity];
            const count = inventory[b] ?? 0;
            const hardness =
              cfg.hardness < 0 ? 'Indestructible' : `${cfg.hardness.toFixed(1)} s à la main`;

            return (
              <div
                key={b}
                className={`flex items-start gap-3 rounded-lg border bg-neutral-900/80 p-2.5 ${rarity.ring}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-black/50">
                  {icons[b] && (
                    <img
                      src={icons[b]}
                      alt={cfg.name}
                      className="h-9 w-9 object-contain [image-rendering:pixelated]"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{cfg.name}</span>
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      style={{ color: rarity.color, backgroundColor: `${rarity.color}22` }}
                    >
                      {rarity.label}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-400">{cfg.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                    <span className="rounded bg-black/50 px-1.5 py-0.5 text-neutral-300">⏱ {hardness}</span>
                    {cfg.tool && (
                      <span className="flex items-center gap-0.5 rounded bg-black/50 px-1.5 py-0.5 text-neutral-300">
                        <Pickaxe size={10} /> {TOOL_LABELS[cfg.tool]}
                        {cfg.minTier ? ` niv. ${cfg.minTier}` : ''}
                      </span>
                    )}
                    {cfg.lightLevel && (
                      <span className="rounded bg-black/50 px-1.5 py-0.5 text-amber-300">💡 {cfg.lightLevel}</span>
                    )}
                    {count > 0 && (
                      <span className="rounded bg-emerald-950/70 px-1.5 py-0.5 text-emerald-300">
                        possédés ×{count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-10 text-center text-xs text-neutral-500">Aucun bloc trouvé.</div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Les blocs rares nécessitent une pioche de niveau suffisant pour être récoltés.</span>
          <button
            onClick={onClose}
            className="cursor-pointer rounded bg-neutral-800 px-4 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
