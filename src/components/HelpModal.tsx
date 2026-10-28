import React from 'react';
import { X, Keyboard, MousePointer, Info, Flame, Eye } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyboardLayout: 'azerty' | 'qwerty';
  onToggleKeyboardLayout: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  keyboardLayout,
  onToggleKeyboardLayout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans">
      <div className="relative w-full max-w-lg rounded-xl border border-neutral-700 bg-neutral-900 p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-wide text-neutral-100">
              Commandes & Guide de Jeu
            </h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Keyboard Layout Selector */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-neutral-800/80 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <Keyboard size={16} className="text-emerald-400" />
            <span>Disposition du clavier :</span>
          </div>
          <button
            onClick={onToggleKeyboardLayout}
            className="cursor-pointer rounded bg-emerald-600 px-3 py-1 text-xs font-bold uppercase text-white hover:bg-emerald-500"
          >
            {keyboardLayout === 'azerty' ? 'AZERTY (France)' : 'QWERTY (US/Intl)'}
          </button>
        </div>

        {/* Keybindings */}
        <div className="mt-4 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2.5">
              <span className="font-semibold text-emerald-300">
                {keyboardLayout === 'azerty' ? 'Z / Q / S / D' : 'W / A / S / D'}
              </span>
              <p className="mt-0.5 text-neutral-400">Déplacement joueur</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2.5">
              <span className="font-semibold text-emerald-300">Espace</span>
              <p className="mt-0.5 text-neutral-400">Sauter (ou monter en vol)</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2.5">
              <span className="font-semibold text-emerald-300">Shift</span>
              <p className="mt-0.5 text-neutral-400">S'accroupir (ou descendre en vol)</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2.5">
              <span className="font-semibold text-emerald-300">Double Espace / F</span>
              <p className="mt-0.5 text-neutral-400">Activer / Désactiver le Vol</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2.5">
              <span className="font-semibold text-emerald-300">Clic Gauche</span>
              <p className="mt-0.5 text-neutral-400">Casser bloc / Amorce TNT</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2.5">
              <span className="font-semibold text-emerald-300">Clic Droit</span>
              <p className="mt-0.5 text-neutral-400">Poser le bloc sélectionné</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2.5">
              <span className="font-semibold text-emerald-300">Molette / Touches 1-9</span>
              <p className="mt-0.5 text-neutral-400">Sélectionner dans la hotbar</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2.5">
              <span className="font-semibold text-emerald-300">Touche E</span>
              <p className="mt-0.5 text-neutral-400">Ouvrir l'Inventaire Créatif</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2.5">
              <span className="font-semibold text-emerald-300">Touche R / Clic Molette</span>
              <p className="mt-0.5 text-neutral-400">Pipette (sélectionner bloc visé)</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2.5">
              <span className="font-semibold text-emerald-300">Touche F3</span>
              <p className="mt-0.5 text-neutral-400">Afficher Coordonnées & Stats</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2.5">
              <span className="font-semibold text-emerald-300">Touche P</span>
              <p className="mt-0.5 text-neutral-400">Ouvrir les Paramètres & Presets</p>
            </div>
          </div>

          {/* Minecraft Tips */}
          <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-neutral-300">
            <div className="mb-1.5 flex items-center gap-1.5 font-bold text-amber-300">
              <Flame size={14} /> Astuces VoxelCraft
            </div>
            <ul className="list-inside list-disc space-y-1 text-[11px] text-neutral-400">
              <li><strong className="text-neutral-200">Dynamite TNT :</strong> Posez un bloc de TNT puis tapez dessus au clic gauche pour allumer la mèche et admirer l'explosion !</li>
              <li><strong className="text-neutral-200">Mode Créatif :</strong> Volez à travers le monde, posez des blocs à l'infini et explorez à votre guise.</li>
              <li><strong className="text-neutral-200">Annuler / Rétablir :</strong> Utilisez Ctrl+Z pour annuler une erreur de construction.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-neutral-800 pt-4">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Compris !
          </button>
        </div>
      </div>
    </div>
  );
};
