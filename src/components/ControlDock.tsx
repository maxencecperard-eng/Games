import React from 'react';
import { soundEngine } from '../game/audio';
import {
  ChevronDown,
  ChevronUp,
  Settings,
  Package,
  RotateCcw,
  RotateCw,
  Compass,
  Sparkles,
  Zap,
  HelpCircle,
  Volume2,
  VolumeX,
  Hammer,
  BookOpen,
} from 'lucide-react';

interface ControlDockProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenInventory: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenCrafting: () => void;
  onOpenIndex: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isFlying: boolean;
  onToggleFly: () => void;
  gameMode: 'creative' | 'survival';
  onToggleGameMode: () => void;
  f3Open: boolean;
  onToggleF3: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  collapsed,
  onToggleCollapse,
  onOpenInventory,
  onOpenSettings,
  onOpenHelp,
  onOpenCrafting,
  onOpenIndex,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isFlying,
  onToggleFly,
  gameMode,
  onToggleGameMode,
  f3Open,
  onToggleF3,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div
      data-game-ui=""
      className={`fixed left-1/2 z-30 transition-transform duration-300 ease-in-out -translate-x-1/2 ${
        collapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
      }`}
      style={{
        bottom: '80px', // Sits cleanly just above the hotbar
        maxWidth: 'min(940px, 94vw)',
        width: 'max-content',
      }}
    >
      {/* Collapse / Expand Tab Button pinned to top-center of dock */}
      <div className="flex justify-center">
        <button
          onClick={() => {
            soundEngine.playUIClick();
            onToggleCollapse();
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-t-lg border-t border-x border-neutral-700 bg-neutral-900/90 px-3 py-1 text-[11px] font-semibold text-neutral-300 shadow-md transition-colors hover:bg-neutral-800 hover:text-white"
        >
          {collapsed ? (
            <>
              <ChevronUp size={14} className="text-emerald-400" />
              <span>Outils & Actions [H]</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              <span>Masquer</span>
            </>
          )}
        </button>
      </div>

      {/* Dock Container */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900/95 p-2 shadow-2xl backdrop-blur-none">
        {/* 1. Mode de jeu (Créatif / Survie) */}
        <button
          onClick={() => {
            soundEngine.playUIClick();
            onToggleGameMode();
          }}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            gameMode === 'creative'
              ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
              : 'border-amber-600 bg-amber-950/40 text-amber-200'
          }`}
          title="Basculer entre Mode Créatif (vol et blocs infinis) et Survie"
        >
          <Sparkles size={14} />
          <span>{gameMode === 'creative' ? 'Mode Créatif' : 'Mode Survie'}</span>
        </button>

        {/* 2. Fly Toggle */}
        <button
          onClick={() => {
            soundEngine.playUIClick();
            onToggleFly();
          }}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            isFlying
              ? 'border-sky-500 bg-sky-950/40 text-sky-200'
              : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
          title="Activer/Désactiver le vol [F] ou double-clic Espace"
        >
          <Zap size={14} />
          <span>Vol : {isFlying ? 'ON' : 'OFF'}</span>
        </button>

        {/* 3. Open Inventory (E) */}
        <button
          onClick={() => {
            soundEngine.playUIClick();
            onOpenInventory();
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-semibold text-neutral-200 transition-colors hover:bg-neutral-700"
          title="Ouvrir l'inventaire complet de blocs [E]"
        >
          <Package size={14} className="text-emerald-400" />
          <span>Inventaire [E]</span>
        </button>

        {/* 3b. Crafting (C) */}
        <button
          onClick={() => {
            soundEngine.playUIClick();
            onOpenCrafting();
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-neutral-700"
          title="Fabriquer armes et outils [C]"
        >
          <Hammer size={14} />
          <span>Fabriquer [C]</span>
        </button>

        {/* 3c. Block index (I) */}
        <button
          onClick={() => {
            soundEngine.playUIClick();
            onOpenIndex();
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-semibold text-purple-200 transition-colors hover:bg-neutral-700"
          title="Index de tous les blocs et leur rareté [I]"
        >
          <BookOpen size={14} />
          <span>Index [I]</span>
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-neutral-700 mx-0.5" />

        {/* 4. Undo / Redo */}
        <button
          onClick={() => {
            soundEngine.playUIClick();
            onUndo();
          }}
          disabled={!canUndo}
          className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
            canUndo
              ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
              : 'border-neutral-800 bg-neutral-900 text-neutral-600 cursor-not-allowed'
          }`}
          title="Annuler dernière pose/destruction (Ctrl+Z)"
        >
          <RotateCcw size={13} />
          <span className="hidden sm:inline">Annuler</span>
        </button>

        <button
          onClick={() => {
            soundEngine.playUIClick();
            onRedo();
          }}
          disabled={!canRedo}
          className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
            canRedo
              ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
              : 'border-neutral-800 bg-neutral-900 text-neutral-600 cursor-not-allowed'
          }`}
          title="Rétablir (Ctrl+Y)"
        >
          <RotateCw size={13} />
          <span className="hidden sm:inline">Rétablir</span>
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-neutral-700 mx-0.5" />

        {/* 5. F3 Coordonnées */}
        <button
          onClick={() => {
            soundEngine.playUIClick();
            onToggleF3();
          }}
          className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
            f3Open
              ? 'border-yellow-500 bg-yellow-950/40 text-yellow-200'
              : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
          }`}
          title="Afficher coordonnées et informations de débogage [F3]"
        >
          <Compass size={14} />
          <span>F3</span>
        </button>

        {/* 6. Sound Mute Toggle */}
        <button
          onClick={() => {
            soundEngine.playUIClick();
            onToggleMute();
          }}
          className="flex cursor-pointer items-center rounded-lg border border-neutral-700 bg-neutral-800 p-1.5 text-neutral-300 transition-colors hover:bg-neutral-700"
          title={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? <VolumeX size={15} className="text-red-400" /> : <Volume2 size={15} />}
        </button>

        {/* 7. Settings Modal */}
        <button
          onClick={() => {
            soundEngine.playUIClick();
            onOpenSettings();
          }}
          className="flex cursor-pointer items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-700"
          title="Monde, Presets, Jour/Nuit, Sauvegardes"
        >
          <Settings size={14} />
          <span className="hidden sm:inline">Paramètres</span>
        </button>

        {/* 8. Help / Controls */}
        <button
          onClick={() => {
            soundEngine.playUIClick();
            onOpenHelp();
          }}
          className="flex cursor-pointer items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-700"
          title="Aide et commandes du jeu"
        >
          <HelpCircle size={14} />
          <span className="hidden sm:inline">Aide</span>
        </button>
      </div>
    </div>
  );
};
