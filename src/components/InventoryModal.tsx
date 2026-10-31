import React, { useState } from 'react';
import { BLOCK_REGISTRY, RARITIES } from '../game/types';
import { ITEMS, ItemId } from '../game/items';
import { soundEngine } from '../game/audio';
import { X, Search } from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  icons: Record<string, string>;
  hotbar: (ItemId | null)[];
  selectedSlot: number;
  inventory: Record<string, number>;
  gameMode: 'creative' | 'survival';
  onAssignToSlot: (slotIndex: number, item: ItemId) => void;
}

type TabType = 'collected' | 'blocks' | 'tools';

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  icons,
  hotbar,
  selectedSlot,
  inventory,
  gameMode,
  onAssignToSlot,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('collected');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const allItems = Object.keys(ITEMS) as ItemId[];

  const filteredItems = allItems.filter((id) => {
    const cfg = ITEMS[id];
    const isBlock = !!cfg.block;
    if (activeTab === 'collected' && (inventory[id] ?? 0) <= 0) return false;
    if (activeTab === 'blocks' && !isBlock) return false;
    if (activeTab === 'tools' && isBlock) return false;
    if (search.trim() && !cfg.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handlePick = (id: ItemId) => {
    soundEngine.playUIClick();
    onAssignToSlot(selectedSlot, id);
  };

  return (
    <div data-game-ui="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans">
      <div className="relative w-full max-w-3xl rounded-xl border-2 border-neutral-700 bg-neutral-900 p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold tracking-wide text-neutral-100">
              {gameMode === 'creative' ? 'Inventaire Créatif' : 'Inventaire'}
            </h2>
            <span className="text-xs text-neutral-400">
              (Cliquez un objet pour l'équiper dans le slot #{selectedSlot + 1})
            </span>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {[
              { id: 'collected', label: 'Possédés' },
              { id: 'blocks', label: 'Blocs' },
              { id: 'tools', label: 'Outils & Armes' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  soundEngine.playUIClick();
                  setActiveTab(tab.id as TabType);
                }}
                className={`cursor-pointer rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded bg-neutral-800 py-1.5 pl-8 pr-3 text-xs text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="mt-4 grid max-h-[320px] grid-cols-5 gap-3 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950/60 p-4 sm:grid-cols-6 md:grid-cols-8">
          {filteredItems.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-neutral-500">
              Rien ici pour l'instant — cassez des blocs pour récolter des ressources !
            </div>
          )}
          {filteredItems.map((id) => {
            const cfg = ITEMS[id];
            const iconUrl = icons[id];
            const count = inventory[id] ?? 0;
            const rarity = RARITIES[cfg.rarity];
            const owned = count > 0 || gameMode === 'creative';

            return (
              <button
                key={id}
                onClick={() => handlePick(id)}
                className={`group relative flex flex-col items-center justify-center rounded-lg border bg-neutral-900/80 p-2 transition-all hover:scale-105 hover:bg-neutral-800 ${
                  owned ? rarity.ring : 'border-neutral-800 opacity-40'
                }`}
                title={`${cfg.name} — ${rarity.label}${cfg.block ? '' : ' — ' + cfg.description}`}
              >
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt={cfg.name}
                    className="h-9 w-9 object-contain [image-rendering:pixelated]"
                  />
                )}
                <span className="mt-1 line-clamp-1 w-full text-center text-[10px] text-neutral-400 group-hover:text-white">
                  {cfg.name}
                </span>
                {gameMode === 'survival' && (
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white [text-shadow:1px_1px_0_#000]">
                    {count > 0 ? count : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 border-t border-neutral-800 pt-4">
          <div className="mb-2 text-xs font-semibold text-neutral-400">Barre d'accès rapide :</div>
          <div className="flex items-center gap-2">
            {hotbar.map((id, idx) => {
              const cfg = id ? ITEMS[id] : undefined;
              const icon = id ? icons[id] : undefined;
              const isSelected = selectedSlot === idx;
              const count = id ? inventory[id] ?? 0 : 0;

              return (
                <div
                  key={idx}
                  className={`relative flex h-12 w-12 items-center justify-center rounded border ${
                    isSelected ? 'border-2 border-emerald-400 bg-emerald-950/40' : 'border-neutral-700 bg-black/40'
                  }`}
                >
                  <span className="absolute left-1 top-0.5 text-[10px] font-bold text-neutral-500">{idx + 1}</span>
                  {icon && (count > 0 || gameMode === 'creative') && (
                    <img
                      src={icon}
                      alt={cfg?.name}
                      className="h-7 w-7 object-contain [image-rendering:pixelated]"
                    />
                  )}
                  {id && gameMode === 'survival' && count > 0 && (
                    <span className="absolute bottom-0 right-1 text-[9px] font-bold text-white [text-shadow:1px_1px_0_#000]">
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
          <span>
            <kbd className="rounded bg-neutral-800 px-1 py-0.5 text-neutral-300">E</kbd> pour fermer ·{' '}
            <kbd className="rounded bg-neutral-800 px-1 py-0.5 text-neutral-300">I</kbd> index des blocs
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer rounded bg-neutral-800 px-4 py-1.5 font-medium text-neutral-200 hover:bg-neutral-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// Réexport utilitaire pour les écrans qui listent les blocs bruts.
export const BLOCK_ITEM_IDS = Object.keys(BLOCK_REGISTRY).filter((k) => k !== 'air' && k !== 'water');
