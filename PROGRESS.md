# 📊 Progression du Développement — VoxelCraft 3D

Ce document recense l'état d'avancement du développement de **VoxelCraft 3D**, les fonctionnalités finalisées, les chantiers en cours et la feuille de route technique.

- **Version actuelle** : `1.2.0`
- **Statut global** : En Production / Actif
- **Moteur & Framework** : React 19, Three.js (r186), TypeScript 5, Vite, Tailwind CSS v4
- **Dernière mise à jour** : 31 Octobre 2026

---

## 📈 Tableau de Bord & Indicateurs Clés

| Indicateur | Valeur / Statut | Note |
| :--- | :---: | :--- |
| **Objectif 0 Asset Externe** | 100% | Textures Canvas 2D + Synthèse Web Audio en mémoire |
| **Monde Infini par Chunks** | Opérationnel | Chunks 16×16 colonnes, 192 couches ($y = -64 \dots 128$) |
| **Nombre de Types de Blocs** | 22 blocs | Herbe, terre, pierre, briques, grès, bois, feuilles, minerais (6), etc. |
| **Outils & Armes** | 8 objets | Épées et pioches (bois, pierre, fer, diamant) + bâtons |
| **Entités / Mobs** | 4 espèces | Passifs (vaches, cochons) & Hostiles (zombies, squelettes) |
| **Presets de Terrains** | 5 mondes | Multi-biomes, Monde Plat, Château Fort, Désert, Îles Volantes |
| **Modes de Jeu** | Survie & Créatif | Bascule instantanée sans rechargement |
| **FPS Cible** | 60 FPS | InstancedMesh + culling des faces masquées |

---

## ✅ Fonctionnalités Terminées & Livrées

### 1. Moteur Voxel & Génération Procédurale
- [x] **Monde infini par chunks** : Génération et déchargement dynamiques autour du joueur (rayon de 4 chunks).
- [x] **Structure en 192 couches** : Du plancher de bedrock ($y = -64$) aux cimes montagneuses ($y = 127$), niveau de la mer à $y = 20$.
- [x] **Système multi-biomes** : Plaines, forêts de chênes, hautes montagnes enneigées, plages de sable, océan et désert de grès.
- [x] **Sous-sol géologique complet** : Réseau de grottes procédurales et filons de minerais (charbon, fer, or, redstone, diamant, émeraude) générés par strates de profondeur.
- [x] **Presets de monde** : 5 environnements jouables immédiatement.

### 2. Moteur de Rendu Three.js & Optimisations
- [x] **Rendu instancié haute performance** : `InstancedMesh` groupés par chunk et type de bloc avec mise à jour ciblée (*dirty chunks*).
- [x] **Élimination des faces cachées (*Hidden Face Culling*)** : Les voxels enfouis sont ignorés lors de la construction géométrique.
- [x] **Textures procédurales 16×16 pixel-art** : Générées à chaud via Canvas 2D (`NearestFilter`), sans aucune requête HTTP externe.
- [x] **Ambiance céleste dynamique** :
  - Cycle Jour/Nuit fluide (durée 6 min).
  - Soleil et Lune en orbite circulaire opposée.
  - Voûte céleste étoilée scintillante la nuit.
  - Nappe de 64 nuages voxels en défilement continu.
  - Brouillard atmosphérique dynamique s'adaptant à l'heure du jour.
- [x] **Détection du rendu logiciel** : Prise en charge adaptée pour SwiftShader / llvmpipe avec cadence asservie via `fenceSync`.

### 3. Contrôleur Joueur & Physique
- [x] **Boîte englobante AABB** ($0.6 \times 1.8 \times 0.6$) avec glissement mural et détection précise du sol.
- [x] **Modes de déplacement** : Marche fluide, saut avec gravité réaliste ($-24\text{ m/s}^2$), accroupissement (*sneak*).
- [x] **Mode Vol (*Creative Fly*)** : Activation par `F` ou double appui sur `Espace`, élévation et descente contrôlées.
- [x] **Contrôle caméra Pointer Lock** : Lacet libre à 360° et tangage bridé à $\pm 88^\circ$.
- [x] **Bras & Objet tenu à la 1ʳᵉ personne** : Balancement à la marche (*view bobbing*) et animation de frappe au clic.
- [x] **Support claviers bilingue** : Bascule instantanée AZERTY (`ZQSD`) et QWERTY (`WASD`).

### 4. Boucle de Survie & Minage
- [x] **Démarrage à zéro** : Démarrage en mode survie avec barre d'accès vide ; progression basée sur la récolte.
- [x] **Système de dureté et temps de casse** : Chaque bloc dispose d'un temps de minage propre (terre 0.6s, pierre 3.0s, obsidienne 45s).
- [x] **Paliers d'outils requis (*Tool Tiers*)** :
  - La pierre, le grès et les briques nécessitent au minimum une pioche.
  - Les minerais précieux (fer, or, diamant, redstone, émeraude) exigent le niveau de pioche approprié pour dropper la ressource.
- [x] **Barre de progression de minage** : Jauge visuelle et nom du bloc en temps réel sous le réticule.
- [x] **Points de vie du joueur (10 cœurs)** : Dégâts infligés par les monstres, régénération lente hors combat et écran de réapparition en cas de mort.

### 5. Système de Fabrication (Crafting)
- [x] **Interface dédiée (`C`)** : Recettes de base (planches de bois, bâtons, établi) accessibles à tout moment.
- [x] **Établi de fabrication interactif** :
  - Posable dans le monde et ouvrable par clic droit ou touche `C` à proximité.
  - Déblocage des outils avancés : pioches et épées en bois, pierre, fer et diamant.
  - Animation de fabrication avec temporisation et mise en valeur du résultat.

### 6. Entités & Mobs (Monstres et Animaux)
- [x] **Faune diurne passive** : Cochons et vaches vaquant paisiblement de jour.
- [x] **Monstres nocturnes hostiles** : Zombies et squelettes apparaissant à la tombée de la nuit, traquant le joueur et l'attaquant au corps à corps.
- [x] **Barres de vie flottantes** : Affichage 3D au-dessus de chaque créature actualisé à chaque impact.
- [x] **Système de combat** : Dégâts calculés selon l'arme tenue (bonus pour les épées), impulsion de recul (*knockback*) et flash visuel de dégât.

### 7. Audio Procédural Web Audio
- [x] **Synthèse audio 100% autonome** (zéro fichier MP3/WAV) :
  - Sons de pose et de destruction différenciés selon le matériau (herbe, pierre, bois, verre, sable).
  - Bruits de pas synchronisés à la marche.
  - Mèche de TNT crépitante et grondement d'explosion basse fréquence.
  - Sons d'impact et de combat.
  - Musique d'ambiance générative relaxante inspirée des tonalités C418.

### 8. Interfaces, HUD & Ergonomie
- [x] **HUD complet** : Réticule central, barre de vie, barre de faim, hotbar 9 slots avec infobulles, affichage du biome courant.
- [x] **Inventaire créatif modal (`E`)** : Onglets *Possédés*, *Blocs* et *Outils*, recherche textuelle, indicateurs de rareté colorés.
- [x] **Index des Blocs (`I`)** : Encyclopédie détaillée avec dureté, outil recommandé, niveau requis et stock possédé.
- [x] **Dock inférieur rétractable (`H`)** : Accès rapide aux réglages, presets, mode de jeu, audio et annulation.
- [x] **Écran de débogage `F3`** : Télémétrie complète (coordonnées XYZ, biome, orientation, compteur de voxels).
- [x] **Dynamite TNT interactive** : Amorçage au clic, pulsation visuelle et explosion dévastatrice avec physique de débris.
- [x] **Système Annuler / Rétablir (`Ctrl+Z` / `Ctrl+Y`)** : Pile d'historique complète des poses et destructions.
- [x] **Persistance & Exportation** :
  - Format de sauvegarde compact **v3** dans `localStorage` (graine + éditions sparse).
  - Export et import de fichiers `.json` avec convertisseur automatique des sauvegardes v2.

---

## 🟡 En Cours & Progrès Partiels

- [ ] **Mécanique active de la faim** :
  - *Actuel* : La jauge de 10 cuisses de nourriture est présente visuellement dans le HUD.
  - *À finaliser* : Épuisement de la jauge lors du sprint et du minage, consommation d'aliments comestibles (pommes, côtelettes) pour régénérer la faim.
- [ ] **Table de butin (drops) des créatures** :
  - *Actuel* : Les créatures meurent après épuisement de leurs PV.
  - *À finaliser* : Lâcher de viande par les animaux, de chair putréfiée par les zombies et d'os/flèches par les squelettes.
- [ ] **Effets sonores dédiés aux créatures** :
  - *Actuel* : Les monstres émettent des sons d'impact physiques.
  - *À finaliser* : Synthèse procédurale des grognements de zombies et bruits d'ossements de squelettes.

---

## 🚀 Feuille de Route (Roadmap & Backlog)

### Phase 1 : Consolidation de la Survie
- [ ] **Fourneau & Cuisson (Smelting)** :
  - Bloc fourneau posable avec interface de combustion (charbon/bois en carburant).
  - Fonte du minerai de fer en lingots de fer, de l'or en lingots d'or, et cuisson du sable en verre.
  - Cuisson de la viande crue pour maximiser la régénération de nourriture.
- [ ] **Coffre de stockage (Chest)** :
  - Bloc coffre avec interface d'inventaire 27 cases pour stocker ses ressources.
- [ ] **Armures & Défense** :
  - Casque, plastron, jambières et bottes (cuir, fer, diamant) réduisant les dégâts subis.

### Phase 2 : Enrichissement du Monde & Éclairage
- [ ] **Éclairage par blocs (Torches & Lanternes)** :
  - Torches artisanales (bâton + charbon) posables sur les murs et le sol pour éclairer les galeries obscures.
  - Atténuation de la lumière par propagation de voxels (lumière de bloc vs lumière du ciel).
- [ ] **Génération enrichie** :
  - Villages de PNJs et donjons souterrains avec coffres au trésor.
  - Flore supplémentaire (fleurs, hautes herbes, champignons dans les grottes).

### Phase 3 : Systèmes Avancés & Multijoueur
- [ ] **Circuits & Logique Redstone** :
  - Pose de poudre de redstone, torches de redstone, leviers, boutons et portes battantes.
- [ ] **Commandes & Ergonomie Mobile** :
  - Joysticks virtuels tactiles et boutons d'action pour téléphones et tablettes.
- [ ] **Multijoueur WebRTC Peer-to-Peer** :
  - Partage de code de salon pour jouer à plusieurs sur la même carte sans serveur centralisé dédié.

---

## 📦 Historique des Versions & Jalons

### v1.2.0 (31/10/2026) — Mise à jour Survie, Entités & Crafting
- Ajout complet du cycle de survie avec temps de minage et paliers d'outils (`minTier`).
- Intégration de l'établi de fabrication animé avec recettes d'outils et d'armes (`CraftingModal.tsx`, `items.ts`).
- Système complet d'entités vivantes (`entities.ts`) : vaches, cochons, zombies et squelettes avec barres de vie 3D et IA de poursuite nocturne.
- Ajout de l'Index interactif des blocs (`BlockIndexModal.tsx`).
- Passage à la persistance v3 ultra-rapide (éditions différentielles sur monde infini).

### v1.1.0 (28/10/2026) — Mise à jour Monde Infini & Multi-Biomes
- Moteur de génération infinie par chunks $16\times16$ sur 192 couches verticales.
- Introduction de 6 biomes distincts (montagnes, océan, plage, plaine, forêt, désert).
- Cycle jour/nuit dynamique avec soleil, lune, étoiles scintillantes et nuages 3D.
- Ajout des presets Château Fort, Îles Volantes et Désert.

### v1.0.0 (27/10/2026) — Lancement Initial
- Moteur de rendu voxel Three.js avec `InstancedMesh` et *hidden face culling*.
- Synthèse sonore 100% procédurale Web Audio API sans aucun asset audio externe.
- Textures procédurales Canvas 2D 16×16 avec style pixel-art rétro.
- Mode de construction créatif avec inventaire modal, vol libre et sélection rapide.
