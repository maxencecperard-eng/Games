# 🧱 VoxelCraft 3D — Jeu de Construction de Blocs

[![Three.js](https://img.shields.io/badge/Three.js-r186-black?logo=three.js)](https://threejs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

**VoxelCraft 3D** est un jeu de bac à sable (*sandbox*) 3D inspiré de **Minecraft**, exécutable directement dans le navigateur sans aucun plugin. Il combine un moteur voxel optimisé basé sur **Three.js**, des textures pixel-art 100% générées procéduralement par canvas HTML5, une synthèse sonore dynamique via la **Web Audio API** et une interface utilisateur inspirée des versions classiques de Minecraft.

---

## 🌟 Fonctionnalités Clés

### 🎮 Gameplay & Moteur Voxel
- **Système de Blocs Complet** : Plus de 24 types de blocs avec propriétés spécifiques (solidité, transparence, émissivité lumineuse) :
  - *Nature* : Herbe (avec retombées vertes latérales), Terre, Bûche de chêne (cernes et écorce), Feuillage, Sable, Eau fluide, **Neige immaculée**, **Glace translucide**, **Gravier**, **Grès rocheux**.
  - *Construction* : Planches de chêne, Pavés (*Cobblestone*), Briques cuites rouges, Verre transparent, Pierre.
  - *Minerais* : Minerai de diamant cyan, minerai d'or, minerai de fer, roche d'obsidienne.
  - *Spéciaux* : Établi de menuisier (*Crafting Table*), Bibliothèque avec livres multicolores, Pierre lumineuse (*Glowstone*), Bedrock indestructible, TNT dynamite amorçable.
- **Grande Carte & Profondeur Géologique Multi-Couches** :
  - Carte étendue à **88×88 blocs** (près de 8 000 colonnes horizontales) et **64 couches en hauteur**.
  - **Sous-sol profond** : Fondation de bedrock aux reliefs déchiquetés à $y = 0\dots2$, croûte profonde ($y = 1\dots18$) parsemée de filons de diamants, d'or, de cavités et grottes, et croûte supérieure riche en fer et pierre dure.
  - **Génération Multi-Biomes Procédurale** :
    - 🏔️ **Pics & Montagnes Enneigées** : Sommets escarpés culminant jusqu'à $y = 58$ coiffés de neige éternelle et parois rocheuses.
    - 🏖️ **Plages Dorées & Océan Profond** : Bancs de sable fin, gravier et nappe océanique avec niveau de la mer fixé à $y = 20$.
    - 🏝️ **Îles Côtières & Tropicales** : Archipels insulaires entourés d'eau limpide avec palmiers et végétation dense.
    - 🌲 **Forêt de Chênes & Plaines** : Prairies ondulantes et clairières boisées.
    - 🏜️ **Désert Chaud & Grès** : Dunes dorées et falaises sédimentaires de grès.
  - Détection dynamique du biome affiché en direct dans le HUD et sur l'écran `F3`.
- **Physique & Déplacement Joueur** :
  - Détection de collisions AABB (boîte englobante) avec glissement contre les parois et détection de sol.
  - Marche, saut, accroupissement (*sneak*) et bruits de pas adaptés au sol foulé.
  - **Mode Vol (*Fly*)** : activez le vol avec `F` ou par double appui sur `Espace` pour flotter et explorer le monde en 3D.
  - Bascule instantanée entre **Mode Créatif** (vol et blocs infinis) et **Mode Survie** (cœurs de vie et cuisses de faim).
- **Construction & Interaction** :
  - **Clic Gauche** : casser un bloc (avec projection de particules cubiques texturées) ou amorcer un bloc de TNT.
  - **Clic Droit** : poser le bloc actif (avec détection pour ne pas bloquer le joueur).
  - **Pipette (`R` ou Clic Molette)** : sélectionne automatiquement dans la barre le bloc pointé du regard.
  - **Dynamite TNT** : amorçage au clic gauche, mèche crépitante, clignotement blanc avec dilatation progressive, puis explosion dévastatrice projetant des débris et détruisant les blocs environnants.
  - **Historique d'Actions** : `Ctrl+Z` (Annuler) et `Ctrl+Y` (Rétablir) pour corriger les erreurs de construction en temps réel.

### 🎨 Textures & Rendu Graphique
- **Zéro Fichier Externe (0 Dépendance 404)** : toutes les textures (16×16 pixels) sont dessinées en mémoire sur des canvas HTML5 dynamiques avec filtre au plus proche (`NearestFilter`) pour garantir un rendu pixel-art rétro net et authentique.
- **Rendu Optimisé par `InstancedMesh`** : regroupement des milliers de voxels par type de bloc pour réduire le nombre d'appels de rendu (*draw calls*) à moins de 25, même sur une carte de 88×88.
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
- **5 Presets de Terrains** :
  1. **Monde Multi-Biomes** : Montagnes enneigées soaring jusqu'à $y=58$, plages de sable, îles tropicales, forêts de chênes, plaines et désert aride avec grottes profondes.
  2. **Monde Plat (*Superflat*)** : Vaste plaine étendue pour les constructions monumentales.
  3. **Château Fort** : Forteresse médiévale fortifiée avec douves d'eau, 4 donjons, chemins de ronde à créneaux et logis seigneurial meublé.
  4. **Désert & Pyramide** : Vaste erg de dunes et grande pyramide à degrés abritant une crypte secrète aux trésors d'or.
  5. **Îles Volantes (*Skyblock*)** : Grand archipel d'îlots célestes étagés dans les airs.
- **Sauvegarde & Partage** :
  - Sauvegarde locale automatique dans le `LocalStorage` du navigateur.
  - Exportation complète de l'univers en fichier `.json`.
  - Importation instantanée de fichiers `.json` pour partager ses créations.

---

## ⌨️ Commandes & Raccourcis

| Action | Clavier AZERTY | Clavier QWERTY | Souris |
| :--- | :---: | :---: | :---: |
| **Avancer / Reculer** | `Z` / `S` | `W` / `S` | — |
| **Gauche / Droite** | `Q` / `D` | `A` / `D` | — |
| **Sauter / Monter (Vol)** | `Espace` | `Espace` | — |
| **S'accroupir / Descendre (Vol)** | `Maj` (*Shift*) | `Shift` | — |
| **Activer / Couper le Vol** | Double `Espace` ou `F` | Double `Space` ou `F` | — |
| **Casser un bloc / Amorcer TNT** | — | — | **Clic Gauche** |
| **Poser un bloc** | — | — | **Clic Droit** |
| **Pipette (sélectionner le bloc visé)** | `R` | `R` | **Clic Molette** |
| **Sélectionner slot hotbar** | `1` à `9` | `1` à `9` | **Molette de défilement** |
| **Ouvrir l'Inventaire Créatif** | `E` | `E` | — |
| **Panneau de Débogage / Coordonnées** | `F3` | `F3` | — |
| **Masquer / Afficher le dock d'outils** | `H` | `H` | — |
| **Annuler / Rétablir** | `Ctrl + Z` / `Ctrl + Y` | `Ctrl + Z` / `Ctrl + Y` | — |
| **Verrouiller / Libérer la caméra** | `Échap` (*Escape*) | `Escape` | Clic sur l'écran |

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
    │   ├── types.ts             # Registre des blocs, interfaces et types du monde
    │   ├── textures.ts          # Générateur de textures pixel-art (Canvas 2D -> CanvasTexture)
    │   ├── audio.ts             # Synthétiseur sonore Web Audio API autonome
    │   ├── physics.ts           # Moteur physique joueur, collisions AABB et détection de sol
    │   ├── particles.ts         # Système d'instanciation de particules d'éclats et d'explosions
    │   ├── world.ts             # Données matricielles voxels, bruit procédural et presets
    │   └── renderer.ts          # Moteur de rendu Three.js, instanced meshes, ombres et cycle jour/nuit
    └── components/
        ├── HUD.tsx              # Viseur central, hotbar, cœurs, faim et écran de débogage F3
        ├── ControlDock.tsx      # Dock rétractable inférieur (conforme aux directives Three.js)
        ├── InventoryModal.tsx   # Modal de sélection créative avec recherche et catégories
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
