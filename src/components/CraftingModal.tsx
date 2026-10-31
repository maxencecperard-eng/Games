import React, { useEffect, useRef, useState } from 'react';
import { ITEMS, ItemId, RECIPES, Recipe, canCraft } from '../game/items';
import { RARITIES } from '../game/types';
import { soundEngine } from '../game/audio';
import { X, Hammer, Lock } from 'lucide-react';

interface CraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Record<string, number>;
  icons: Record<string, string>;
  nearTable: boolean;
  creative: boolean;
  onCraft: (recipe: Recipe) => boolean;
}

export const CraftingModal: React.FC<CraftingModalProps> = ({
  isOpen,
  onClose,
  inventory,
  icons,
  nearTable,
  creative,
  onCraft,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [resultId, setResultId] = useState<ItemId | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveId(null);
      setProgress(0);
      setResultId(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const startCraft = (recipe: Recipe) => {
    if (activeId) return;
    if (recipe.requiresTable && !nearTable) return;
    if (!creative && !canCraft(recipe, inventory, nearTable)) return;

    soundEngine.playUIClick();
    setActiveId(recipe.id);
    setProgress(0);
    setResultId(null);

    const start = performance.now();
    timerRef.current = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / (recipe.time * 1000));
      setProgress(p);

      if (p >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        const ok = onCraft(recipe);
        setActiveId(null);
        setProgress(0);
        if (ok) {
          setResultId(recipe.output);
          setResultKey((k) => k + 1);
          soundEngine.playPlaceBlock('wood');
        }
      }
    }, 40);
  };

  const ordered = [...RECIPES].sort((a, b) => Number(a.requiresTable) - Number(b.requiresTable));

  return (
    <div data-game-ui="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans">
      <div className="relative w-full max-w-4xl rounded-xl border-2 border-amber-800/70 bg-neutral-900 p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-wide text-amber-200">
              <Hammer size={20} /> Établi de Fabrication
            </h2>
            <p className="mt-1 text-xs text-neutral-400">
              {nearTable
                ? '✅ Établi détecté : toutes les recettes sont disponibles.'
                : '⚠️ Sans établi à proximité, seules les recettes de base sont accessibles.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 grid max-h-[440px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {ordered.map((recipe) => {
            const locked = recipe.requiresTable && !nearTable;
            const enough = creative || canCraft(recipe, inventory, nearTable);
            const output = ITEMS[recipe.output];
            const rarity = RARITIES[output.rarity];
            const crafting = activeId === recipe.id;

            return (
              <button
                key={recipe.id}
                onClick={() => startCraft(recipe)}
                disabled={locked || (!enough && !crafting) || !!activeId}
                className={`relative overflow-hidden rounded-lg border p-3 text-left transition-all ${
                  locked
                    ? 'cursor-not-allowed border-neutral-800 bg-neutral-900/50 opacity-50'
                    : enough || crafting
                      ? `cursor-pointer bg-neutral-800/70 hover:bg-neutral-800 ${rarity.ring}`
                      : 'cursor-not-allowed border-neutral-800 bg-neutral-900/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded bg-black/50">
                    {icons[recipe.output] && (
                      <img
                        src={icons[recipe.output]}
                        alt={output.name}
                        className="h-9 w-9 object-contain [image-rendering:pixelated]"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-white">{output.name}</span>
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        style={{ color: rarity.color, backgroundColor: `${rarity.color}22` }}
                      >
                        {rarity.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-400">
                      {recipe.ingredients.map((ing) => {
                        const have = inventory[ing.item] ?? 0;
                        const ok = have >= ing.count || creative;
                        return (
                          <span
                            key={ing.item}
                            className={`flex items-center gap-0.5 rounded bg-black/40 px-1 py-0.5 ${
                              ok ? 'text-neutral-300' : 'text-red-400'
                            }`}
                          >
                            {icons[ing.item] && (
                              <img
                                src={icons[ing.item]}
                                alt=""
                                className="h-4 w-4 [image-rendering:pixelated]"
                              />
                            )}
                            {ITEMS[ing.item]?.name} ×{ing.count}
                            {!creative && <span className="text-neutral-500">({have})</span>}
                          </span>
                        );
                      })}
                    </div>
                    {locked && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-500">
                        <Lock size={11} /> Nécessite un établi à proximité
                      </div>
                    )}
                    {!locked && !enough && !crafting && (
                      <div className="mt-1 text-[10px] font-bold text-red-400">
                        Ingrédients manquants
                      </div>
                    )}
                    {crafting && (
                      <div className="mt-1 animate-pulse text-[10px] font-semibold text-amber-300">
                        Fabrication… {Math.round(progress * 100)}%
                      </div>
                    )}
                  </div>
                </div>

                {crafting && (
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/60">
                    <div
                      className="h-full bg-amber-400 transition-[width] duration-75"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-neutral-800 pt-3">
          <div className="flex min-h-[44px] items-center gap-3 text-xs text-neutral-400">
            {resultId ? (
              <span key={resultKey} className="animate-[craftPop_0.6s_ease-out] flex items-center gap-2">
                {icons[resultId] && (
                  <img
                    src={icons[resultId]}
                    alt=""
                    className="h-8 w-8 [image-rendering:pixelated] drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  />
                )}
                <span className="font-semibold text-emerald-300">
                  {ITEMS[resultId]?.name} fabriqué !
                </span>
              </span>
            ) : (
              <span>Cliquez une recette pour lancer l'artisanat animé.</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded bg-neutral-800 px-4 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
