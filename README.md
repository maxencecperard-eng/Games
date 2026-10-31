# 🧱 VoxelCraft 3D — Jeu de Construction de Blocs

[![Three.js](https://img.shields.io/badge/Three.js-r186-black?logo=three.js)](https://threejs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

**VoxelCraft 3D** est un jeu de bac à sable (*sandbox*) 3D inspiré de **Minecraft**, exécutable directement dans le navigateur sans aucun plugin. Il combine un moteur voxel optimisé basé sur **Three.js**, des textures pixel-art 100% générées procéduralement par canvas HTML5, une synthèse sonore dynamique via la **Web Audio API** et une interface utilisateur inspirée des versions classiques de Minecraft.

---

## 🌟 Fonctionnalités Clés

### 🎮 Gameplay & Moteur Voxel
- **Monde Infini par Chunks** :
  - Génération procédurale **à la volée** par chunks de **16×16 colonnes**, sans bordure ni limite de déplacement.
  - **192 couches verticales** ($y = -64 \dots 128$) : bedrock, grottes, minerais profonds, océans et sommets enneigés.
  - Chargement / déchargement automatique des chunks autour du joueur (rayon de 4 chunks) pour garder la mémoire et le framerate sous contrôle.
  - **Génération Multi-Biomes Procédurale** :
    - 🏔️ **Pics & Montagnes Enneigées** : Sommets escarpés coiffés de neige éternelle et parois rocheuses.
    - 🏖️ **Plages Dorées & Océan Profond** : Bancs de sable fin, gravier et nappe océanique avec niveau de la mer fixé à $y = 20$.
    - 🏝️ **Îles Côtières & Tropicales** : Archipels insulaires entourés d'eau limpide.
    - 🌲 **Forêt de Chênes & Plaines** : Prairies ondulantes et clairières boisées.
    - 🏜️ **Désert Chaud & Grès** : Dunes dorées et falaises sédimentaires de grès.
  - Détection dynamique du biome affiché en direct dans le HUD et sur l'écran `F3`.
- **Survie & Récolte** :
  - Le jeu démarre **en mode survie avec une barre d'accès vide** : tout se récolte en minant.
  - **Temps de minage propre à chaque bloc** (herbe 0,6 s, pierre 3 s, obsidienne 45 s…) avec barre de progression sous le réticule.
  - **Outils requis** : la pierre, le grès et les briques exigent une pioche (n'importe quel niveau) ; les minerais (charbon, fer, or, redstone, diamant, émeraude) exigent une pioche d'un niveau suffisant pour être récoltés.
  - **Rareté par bloc** (Commun, Peu commun, Rare, Épique, Légendaire) affichée dans l'inventaire, l'index et l'établi.
  - **Points de vie joueur** (10 cœurs) avec régénération lente, dégâts de chute de mobs et réapparition en cas de mort.
  - **Points de vie des monstres** : barre de vie flottante au-dessus de chaque créature, dégâts à l'épée et recul à l'impact.
  - **Cycle jour / nuit de 6 minutes** (3 min de jour, 3 min de nuit) ; les zombies et squelettes chassent le joueur la nuit.
- **Fabrication (Établi)** :
  - Recettes de base accessibles partout (`C`) : planches, bâtons, établi.
  - **Établi de fabrication** : posé dans le monde, il débloque les pioches et épées en bois, pierre, fer et diamant, avec **animation de fabrication** et résultat mis en avant.
  - Un clic droit sur l'établi ouvre directement l'interface d'artisanat.
- **Index des Blocs (`I`)** : catalogue complet de tous les blocs du jeu avec icône, rareté, dureté, outil requis, niveau de pioche et quantité possédée.
- **Physique & Déplacement Joueur** :
  - Détection de collisions AABB (boîte englobante) avec glissement contre les parois et détection de sol.
  - Marche, saut, accroupissement (*sneak*) et bruits de pas adaptés au sol foulé.
  - **Mode Vol (*Fly*)** : activez le vol avec `F` ou par double appui sur `Espace` pour flotter et explorer le monde en 3D.
  - Bascule instantanée entre **Mode Créatif** (vol, blocs infinis, minage instantané) et **Mode Survie**.
- **Construction & Interaction** :
  - **Clic Gauche (maintenu)** : miner un bloc (avec projection de particules cubiques texturées), attaquer une créature ou amorcer un bloc de TNT.
  - **Clic Droit** : poser le bloc actif (avec détection pour ne pas bloquer le joueur) ou ouvrir l'établi pointé.
  - **Pipette (`R` ou Clic Molette)** : sélectionne automatiquement dans la barre le bloc pointé du regard.
  - **Dynamite TNT** : amorçage au clic gauche, mèche crépitante, clignotement blanc avec dilatation progressive, puis explosion dévastatrice projetant des débris et détruisant les blocs environnants.
  - **Historique d'Actions** : `Ctrl+Z` (Annuler) et `Ctrl+Y` (Rétablir) pour corriger les erreurs de construction en temps réel.

### 🎨 Textures & Rendu Graphique
- **Zéro Fichier Externe (0 Dépendance 404)** : toutes les textures (16×16 pixels) sont dessinées en mémoire sur des canvas HTML5 dynamiques avec filtre au plus proche (`NearestFilter`) pour garantir un rendu pixel-art rétro net et authentique.
- **Rendu Optimisé par `InstancedMesh`** : un groupe d'`InstancedMesh` par chunk et par type de bloc, reconstruit uniquement quand le chunk change (*dirty chunks*), pour un nombre d'appels de rendu minimal sur un monde infini.
- **Suppression des Faces Cachées (*Hidden Face Culling*)** : les blocs totalement enfouis sous 6 voisins opaques sont exclus du rendu, économisant plus de 75% de géométrie.
- **Ambiance & Ciel Dynamique** :
  - Cycle Jour / Nuit progressif avec transition des couleurs de ciel et brouillard d'horizon adapté à la grande distance.
  - Soleil cubique et Lune orbitant en opposition, nappe de nuages voxels en défilement à haute altitude ($y = 68$) et voûte céleste étoilée la nuit.
  - Éclairage studio basé sur `RoomEnvironment` + `PMREMGenerator` et éclairage directionnel avec ombres douces PCF.
  - Détection automatique du rendu logiciel WebGL (`SwiftShader`, `llvmpipe`, etc.) avec cadence de rendu adaptée via `fenceSync`.

### 🎵 Moteur Audio Procédural
- **Synthèse Web Audio API 100% Autonome** (aucun fichier MP3/WAV à charger) :
  - Sons de pose différenciés selon le matériau (crunch d'herbe, claque de pierre, choc sourd du bois, tintement aigu du verre).
  - Sons de casse croustillants avec enveloppe de bruit blanc filtré.
  - Bruits de pas rythmés à la marche.
  - Sifflement de mèche TNT et grondement d'explosion basse fréquence.
  - **Musique d'Ambiance Apaisante** : accords méditatifs générés par oscillateurs sinusoïdaux inspirés des bandes-son de C418.

### 🗺️ Générateur de Mondes & Sauvegarde
- **5 Presets de Terrains** (tous en monde infini) :
  1. **Monde Multi-Biomes** : Montagnes enneigées, plages de sable, îles tropicales, forêts de chênes, plaines et désert aride avec grottes profondes.
  2. **Monde Plat (*Superflat*)** : Vaste plaine étendue pour les constructions monumentales.
  3. **Château Fort** : Forteresse médiévale fortifiée avec douves d'eau, 4 donjons, chemins de ronde à créneaux et logis seigneurial meublé (établi inclus).
  4. **Désert** : Erg de dunes dorées et falaises de grès à perte de vue.
  5. **Îles Volantes (*Skyblock*)** : Archipel d'îlots célestes étagés dans les airs.
- **Sauvegarde & Partage** :
  - Sauvegarde locale dans le `LocalStorage` du navigateur (clé `voxelcraft_saved_world`).
  - Format **v3** : seules les modifications du joueur sont stockées (graine + preset + liste d'éditions), ce qui rend la sauvegarde d'un monde infini quasi instantanée.
  - Exportation / importation `.json` ; les anciennes sauvegardes **v2** (monde fini) sont converties automatiquement.

---

## ⌨️ Commandes & Raccourcis

| Action | Clavier AZERTY | Clavier QWERTY | Souris |
| :--- | :---: | :---: | :---: |
| **Avancer / Reculer** | `Z` / `S` | `W` / `S` | — |
| **Gauche / Droite** | `Q` / `D` | `A` / `D` | — |
| **Sauter / Monter (Vol)** | `Espace` | `Espace` | — |
| **S'accroupir / Descendre (Vol)** | `Maj` (*Shift*) | `Shift` | — |
| **Activer / Couper le Vol** | Double `Espace` ou `F` | Double `Space` ou `F` | — |
| **Miner / Attaquer / Amorcer TNT** | — | — | **Clic Gauche (maintenu)** |
| **Poser un bloc / Ouvrir un établi** | — | — | **Clic Droit** |
| **Pipette (sélectionner le bloc visé)** | `R` | `R` | **Clic Molette** |
| **Sélectionner slot hotbar** | `1` à `9` | `1` à `9` | **Molette de défilement** |
| **Ouvrir l'Inventaire** | `E` | `E` | — |
| **Ouvrir la Fabrication** | `C` | `C` | — |
| **Ouvrir l'Index des Blocs** | `I` | `I` | — |
| **Panneau de Débogage / Coordonnées** | `F3` | `F3` | — |
| **Masquer / Afficher le dock d'outils** | `H` | `H` | — |
| **Annuler / Rétablir** | `Ctrl + Z` / `Ctrl + Y` | `Ctrl + Z` / `Ctrl + Y` | — |
| **Paramètres & Monde** | `P` | `P` | — |
| **Verrouiller / Libérer la caméra** | `Échap` (*Escape*) | `Escape` | Clic sur l'écran |
| **Fermer une fenêtre (paramètres, inventaire…)** | `Échap` | `Escape` | Bouton « Fermer » / croix |

---

## 📁 Architecture du Projet

```text
/
├── index.html                   # Point d'entrée HTML, balises SEO et polices rétro
├── metadata.json                # Métadonnées applicatives AI Studio
├── package.json                 # Dépendances (three, react, motion, lucide, tailwind)
├── tsconfig.json                # Configuration TypeScript
├── vite.config.ts               # Configuration bundler Vite & Tailwind v4
└── src/
    ├── main.tsx                 # Montage de l'application React
    ├── App.tsx                  # Contrôleur racine, écouteurs d'événements et boucle de jeu
    ├── index.css                # Styles globaux Tailwind CSS
    ├── game/
    │   ├── types.ts             # Registre des blocs (rareté, dureté, outil, niveau de pioche) et types du monde
    │   ├── items.ts             # Objets, outils/armes, recettes d'artisanat et temps de minage
    │   ├── textures.ts          # Générateur de textures pixel-art (Canvas 2D -> CanvasTexture) + icônes d'objets
    │   ├── audio.ts             # Synthétiseur sonore Web Audio API autonome
    │   ├── physics.ts           # Moteur physique joueur, collisions AABB et détection de sol
    │   ├── particles.ts         # Système d'instanciation de particules d'éclats et d'explosions
    │   ├── entities.ts          # Créatures (cochons, vaches, zombies, squelettes) et barres de vie
    │   ├── world.ts             # Monde infini par chunks, bruit procédural, grottes, minerais et presets
    │   └── renderer.ts          # Moteur de rendu Three.js, meshes par chunk, combat et cycle jour/nuit
    └── components/
        ├── HUD.tsx              # Viseur, hotbar, cœurs/faim, barre de minage et écran de débogage F3
        ├── ControlDock.tsx      # Dock rétractable inférieur (mode de jeu, vol, outils, undo)
        ├── InventoryModal.tsx   # Inventaire (possédés / blocs / outils) avec recherche
        ├── CraftingModal.tsx    # Établi de fabrication animé (armes, pioches, établi)
        ├── BlockIndexModal.tsx  # Index complet des blocs avec rareté et filtre
        ├── SettingsModal.tsx    # Réglages du monde, heure solaire, audio et import/export
        └── HelpModal.tsx        # Guide d'aide interactif et bascule de disposition clavier
```

---

## 🚀 Installation & Développement Local

### Prérequis
- **Node.js** version 20 ou supérieure
- Gestionnaire de paquets **npm**

### Commandes

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Lancer le serveur de développement local** :
   ```bash
   npm run dev
   ```
   L'application sera accessible sur `http://localhost:3000`.

3. **Vérifier les types TypeScript** :
   ```bash
   npm run lint
   ```

4. **Compiler pour la production** :
   ```bash
   npm run build
   ```

---

## 📜 Licence & Crédits
- Ce projet est sous licence **Apache-2.0**.
- Inspiré de l'univers visuel et du gameplay de Mojang Studios.
