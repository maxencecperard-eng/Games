import React, { useState } from 'react';
import { BlockType, BLOCK_REGISTRY } from '../game/types';
import { soundEngine } from '../game/audio';
import { X, Search } from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  icons: Record<BlockType, string>;
  hotbar: BlockType[];
  selectedSlot: number;
  onAssignToSlot: (slotIndex: number, blockType: BlockType) => void;
}

type TabType = 'all' | 'nature' | 'building' | 'minerals' | 'special';

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  icons,
  hotbar,
  selectedSlot,
  onAssignToSlot,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const allBlocks = Object.keys(BLOCK_REGISTRY).filter((k) => k !== 'air') as BlockType[];

  const filteredBlocks = allBlocks.filter((b) => {
    const cfg = BLOCK_REGISTRY[b];
    if (activeTab !== 'all' && cfg.category !== activeTab) return false;
    if (search.trim() && !cfg.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handlePickBlock = (blockType: BlockType) => {
    soundEngine.playUIClick();
    onAssignToSlot(selectedSlot, blockType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans">
      <div className="relative w-full max-w-2xl rounded-xl border-2 border-neutral-700 bg-neutral-900 p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-wide text-neutral-100">
              Inventaire Créatif
            </h2>
            <span className="text-xs text-neutral-400">
              (Cliquez un bloc pour l'équiper dans le slot #{selectedSlot + 1})
            </span>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs & Search */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'nature', label: 'Nature' },
              { id: 'building', label: 'Construction' },
              { id: 'minerals', label: 'Minerais' },
              { id: 'special', label: 'Spéciaux' },
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
              placeholder="Rechercher un bloc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded bg-neutral-800 py-1.5 pl-8 pr-3 text-xs text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Blocks Grid */}
        <div className="mt-4 grid max-h-[300px] grid-cols-5 gap-3 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950/60 p-4 sm:grid-cols-6 md:grid-cols-7">
          {filteredBlocks.map((b) => {
            const cfg = BLOCK_REGISTRY[b];
            const iconUrl = icons[b];

            return (
              <button
                key={b}
                onClick={() => handlePickBlock(b)}
                className="group relative flex flex-col items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/80 p-2.5 transition-all hover:scale-105 hover:border-emerald-500 hover:bg-neutral-800"
              >
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt={cfg.name}
                    className="h-10 w-10 object-contain [image-rendering:pixelated]"
                  />
                )}
                <span className="mt-1 line-clamp-1 w-full text-center text-[10px] text-neutral-400 group-hover:text-white">
                  {cfg.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Hotbar Preview & Assignment Target */}
        <div className="mt-5 border-t border-neutral-800 pt-4">
          <div className="mb-2 text-xs font-semibold text-neutral-400">
            Barre d'accès rapide (Hotbar) :
          </div>
          <div className="flex items-center gap-2">
            {hotbar.map((b, idx) => {
              const cfg = BLOCK_REGISTRY[b];
              const icon = icons[b];
              const isSelected = selectedSlot === idx;

              return (
                <div
                  key={idx}
                  className={`relative flex h-12 w-12 items-center justify-center rounded border ${
                    isSelected
                      ? 'border-2 border-emerald-400 bg-emerald-950/40'
                      : 'border-neutral-700 bg-black/40'
                  }`}
                >
                  <span className="absolute left-1 top-0.5 text-[10px] font-bold text-neutral-500">
                    {idx + 1}
                  </span>
                  {icon && (
                    <img
                      src={icon}
                      alt={cfg?.name}
                      className="h-7 w-7 object-contain [image-rendering:pixelated]"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
          <span>Appuyez sur <kbd className="rounded bg-neutral-800 px-1 py-0.5 text-neutral-300">E</kbd> ou <kbd className="rounded bg-neutral-800 px-1 py-0.5 text-neutral-300">Échap</kbd> pour fermer</span>
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
