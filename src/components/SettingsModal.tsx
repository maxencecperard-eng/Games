import React from 'react';
import { WorldPreset } from '../game/types';
import { soundEngine } from '../game/audio';
import { X, Download, Upload, RefreshCw, Sun, Moon, Volume2, VolumeX, Music } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset: WorldPreset;
  onSelectPreset: (preset: WorldPreset) => void;
  timeOfDay: number;
  onChangeTime: (time: number) => void;
  dayCycleActive: boolean;
  onToggleDayCycle: () => void;
  onExportWorld: () => void;
  onImportWorld: (json: string) => void;
  onSaveWorld: () => void;
  onLoadWorld: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  musicActive: boolean;
  onToggleMusic: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preset,
  onSelectPreset,
  timeOfDay,
  onChangeTime,
  dayCycleActive,
  onToggleDayCycle,
  onExportWorld,
  onImportWorld,
  onSaveWorld,
  onLoadWorld,
  isMuted,
  onToggleMute,
  musicActive,
  onToggleMusic,
}) => {
  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportWorld(content);
        soundEngine.playUIClick();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div data-game-ui="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans">
      <div className="relative w-full max-w-xl rounded-xl border border-neutral-700 bg-neutral-900 p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <h2 className="text-xl font-bold tracking-wide text-neutral-100">
            Paramètres & Monde
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 space-y-6 max-h-[460px] overflow-y-auto pr-2">
          {/* 1. Presets de génération */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Générateur de Monde (Presets)
            </label>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { id: 'hills', label: '🌿 Monde Multi-Biomes', desc: 'Montagnes, plages, îles & grottes' },
                { id: 'flat', label: '🟩 Monde Plat', desc: 'Surface lisse pour bâtir' },
                { id: 'castle', label: '🏰 Château Fort', desc: 'Tours, murailles & maison' },
                { id: 'desert', label: '🏜️ Désert', desc: 'Dunes dorées & falaises de grès' },
                { id: 'floating', label: '☁️ Îles Volantes', desc: 'Archipel céleste' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    soundEngine.playUIClick();
                    onSelectPreset(p.id as WorldPreset);
                  }}
                  className={`cursor-pointer rounded-lg border p-3 text-left transition-all ${
                    preset === p.id
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                      : 'border-neutral-800 bg-neutral-800/60 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="mt-0.5 text-[11px] text-neutral-400">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Heure & Cycle Jour/Nuit */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Cycle Jour / Nuit
              </label>
              <button
                onClick={onToggleDayCycle}
                className={`cursor-pointer rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  dayCycleActive ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {dayCycleActive ? 'Défilement automatique : ON' : 'Défilement en pause'}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <Moon size={16} className="text-indigo-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={timeOfDay}
                onChange={(e) => onChangeTime(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800 accent-emerald-500"
              />
              <Sun size={18} className="text-amber-400" />
            </div>

            {/* Quick time buttons */}
            <div className="mt-2 flex gap-2">
              {[
                { time: 0.25, label: '🌅 Aube' },
                { time: 0.45, label: '☀️ Midi' },
                { time: 0.72, label: '🌇 Crépuscule' },
                { time: 0.95, label: '🌙 Nuit' },
              ].map((t) => (
                <button
                  key={t.label}
                  onClick={() => {
                    soundEngine.playUIClick();
                    onChangeTime(t.time);
                  }}
                  className="cursor-pointer rounded border border-neutral-800 bg-neutral-800/80 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Audio & Ambiance */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Audio & Musique
            </label>
            <div className="mt-2.5 flex flex-wrap gap-3">
              <button
                onClick={onToggleMute}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium transition-colors ${
                  isMuted ? 'bg-red-950/40 text-red-300' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                }`}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {isMuted ? 'Sons coupés' : 'Effets sonores actifs'}
              </button>

              <button
                onClick={onToggleMusic}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium transition-colors ${
                  musicActive ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                }`}
              >
                <Music size={16} />
                {musicActive ? 'Musique d’ambiance : Active' : 'Musique d’ambiance : Désactivée'}
              </button>
            </div>
          </div>

          {/* 4. Sauvegarde & Partage du Monde */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Sauvegarde & Échange de Monde
            </label>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  onSaveWorld();
                }}
                className="cursor-pointer rounded-lg border border-neutral-700 bg-neutral-800 p-2.5 text-center text-xs font-medium text-neutral-200 hover:bg-neutral-700"
              >
                💾 Sauvegarder
              </button>
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  onLoadWorld();
                }}
                className="cursor-pointer rounded-lg border border-neutral-700 bg-neutral-800 p-2.5 text-center text-xs font-medium text-neutral-200 hover:bg-neutral-700"
              >
                📂 Charger
              </button>
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  onExportWorld();
                }}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 p-2.5 text-center text-xs font-medium text-neutral-200 hover:bg-neutral-700"
              >
                <Download size={14} /> Exporter .json
              </button>
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 p-2.5 text-center text-xs font-medium text-neutral-200 hover:bg-neutral-700">
                <Upload size={14} /> Importer
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-neutral-800 pt-4">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
