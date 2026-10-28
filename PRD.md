# 📄 Product Requirements Document (PRD)
## Projet : VoxelCraft 3D — Web Block Building Game

- **Nom du Produit** : VoxelCraft 3D
- **Version** : 1.2.0
- **Statut** : En Production / Actif
- **Auteur** : Équipe d'Ingénierie Google AI Studio Build
- **Date de révision** : 28 Octobre 2026

---

## 1. Vision & Objectifs du Produit

### 1.1 Vision
Permettre à tout utilisateur d'accéder instantanément, depuis n'importe quel navigateur web moderne, à une expérience de jeu de construction de blocs en 3D d'une grande fluidité et d'une fidélité esthétique inspirée de Minecraft, **sans aucun temps de téléchargement d'actifs lourds, sans compte obligatoire et sans dépendance à des fichiers externes**.

### 1.2 Objectifs Stratégiques
1. **Zéro Dépendance Externe (Zero 404 Assets)** : L'intégralité des textures, maillages, sons et modèles doit être synthétisée procéduralement en mémoire (HTML5 Canvas 2D + Web Audio API).
2. **Performance WebGL Éprouvée** : Rendu à 60 FPS constants grâce à l'instanciation de géométries (`InstancedMesh`) et à l'élimination des faces invisibles (*hidden face culling*), avec détection automatique et gestion adaptée du rendu logiciel (SwiftShader/llvmpipe).
3. **Expérience Utilisateur Immersive** : Contrôle caméra standard *Pointer Lock*, retour haptique visuel (particules, oscillations de bras) et audio dynamique à chaque action.
4. **Ergonomie Conforme aux Directives Modernes** : Viewport 3D à 100% dégagé, contrôles secondaires centralisés dans un dock inférieur rétractable (*collapsible dock*), panneau d'aide multilingue et prise en charge native des claviers AZERTY et QWERTY.

---

## 2. Utilisateurs Cibles & Personas

| Persona | Profil & Attentes | Cas d'Usage Principal |
| :--- | :--- | :--- |
| **Le Bâtisseur Créatif** | Passionné d'architecture cubique, cherche une toile vierge réactive. | Lance le preset *Monde Plat* ou *Îles Volantes*, ouvre l'inventaire (`E`), bâtit de grands édifices, utilise la pipette et exporte sa carte en `.json`. |
| **L'Explorateur Nostalgique** | Joueur de Minecraft cherchant une session rapide sans installation. | Explore les collines et forêts procédurales, creuse pour trouver du minerai de diamant, observe le coucher de soleil et écoute les mélodies d'ambiance. |
| **L'Expérimentateur TNT** | Adepte de physique et d'effets visuels chaotiques. | Pose des rangées de dynamite TNT, les déclenche, observe la mèche crépiter et analyse la propagation de l'explosion dans le terrain. |

---

## 3. Spécifications Fonctionnelles Détaillées

### 3.1 Moteur Voxel & Gestion de l'Univers (FS-1)
- **Structure de Données** : Grille spatiale 3D discrète stockée sous forme de table de hachage associant des coordonnées `(x, y, z)` à un identifiant `BlockType`.
- **Dimensions Étendues** : Dimensions horizontales de **88×88 blocs** (de -44 à +43 en X et Z, soit 7 744 colonnes) et **64 couches en hauteur** (y = 0 à 63).
- **Couches Géologiques & Sous-Sol Profond** :
  - *Fondation Bedrock* : Plancher impénétrable aux reliefs déchiquetés à $y = 0\dots2$.
  - *Sous-sol Profond ($y = 1\dots18$)* : Roche dense criblée de filons de diamants, d'or, de cavités et cavernes naturelles.
  - *Niveau de la Mer* : Établi à $y = 20$.
  - *Sommets Montagneux* : Cimes culminant jusqu'à $y = 58$ coiffées de neige.
- **Système d'Annulation / Rétablissement** : Pile d'historique complète enregistrant chaque bloc posé ou détruit, accessible via `Ctrl+Z` et `Ctrl+Y`.

### 3.2 Générateur de Textures Procédurales (FS-2)
- **Résolution Native** : 16×16 pixels par face.
- **Support Multi-Faces** :
  - *Herbe* : Face supérieure verte mouchetée, dessous en terre, côtés avec franges végétales irrégulières.
  - *Tronc de Chêne* : Sommet et base à cernes concentriques, 4 côtés à rainures verticales d'écorce.
  - *TNT* : Côtés cerclés d'une bannière blanche marquée "TNT", dessus avec détonateur et mèche.
  - *Établi* : Face supérieure quadrillée avec outils, côtés avec motifs de scie et marteau.
  - *Bibliothèque* : Étagères en bois garnies de reliures multicolores et tranches de pages.
- **Paramétrage Three.js** : `texture.magFilter = THREE.NearestFilter`, `texture.minFilter = THREE.NearestFilter`, `texture.colorSpace = THREE.SRGBColorSpace`.

### 3.3 Contrôleur Joueur & Physique (FS-3)
- **Modèle Physique** : AABB de dimensions $0.6 \times 1.8 \times 0.6$ unités, hauteur des yeux à 1.62 unité.
- **Modes de Déplacement** :
  - *Marche classique* : Vitesse de 6.0 m/s avec accélération et frottement au sol.
  - *Accroupissement (Sneak)* : Réduction de vitesse à 3.0 m/s (touche `Shift`).
  - *Vol (Creative Fly)* : Vitesse de 12.0 m/s sans gravité, élévation avec `Espace`, descente avec `Shift`.
- **Gravité & Saut** : Constante gravitationnelle de $-24.0\text{ m/s}^2$, impulsion de saut verticale de $+8.2\text{ m/s}$.
- **Contrôles Caméra** : Rotation gérée par l'API *Pointer Lock*, angle de lacet illimité et tangage vertical bridé à $\pm 88^\circ$ pour éviter le retournement de caméra.

### 3.4 Interaction & Raycasting (FS-4)
- **Portée de Visée** : Rayon d'action de 6.0 blocs depuis la caméra.
- **Calcul Précis des Coordonnées** : Détermination du bloc visé $(x, y, z)$ et de la position d'adjacence $(x', y', z')$ en fonction de la normale de la face touchée.
- **Fil de Fer de Surbrillance** : Encadrement filaire noir (`LineSegments`) de dimensions $1.006^3$ calé sur le voxel ciblé.
- **Bras / Bloc en Main** : Modèle 3D à la première personne oscillant au pas du joueur (*view bobbing*) et exécutant un coup de poing rapide lors des clics.

### 3.5 Pose, Destruction & Effets de Particules (FS-5)
- **Destruction de Blocs (Clic Gauche)** : Suppression instantanée, génération d'une salve de 16 particules cubiques aux teintes du bloc et émission sonore associée.
- **Pose de Blocs (Clic Droit)** : Vérification préalable d'intersection avec l'AABB du joueur pour éviter tout blocage, mise à jour des matrices d'instances.
- **Système de Particules Instancié** : Rendu groupé via un `InstancedMesh` dynamique de particules soumises à la gravité et s'éteignant après 0.6 à 0.8 seconde.

### 3.6 Dynamite TNT & Détonation (FS-6)
- **Amorçage** : Un clic gauche sur un bloc de TNT remplace le voxel statique par une entité active avec compte à rebours de 3.0 secondes.
- **Animation d'Amorçage** : Émission continue d'un son de mèche, pulsation d'opacité blanche et dilatation progressive du bloc.
- **Déflagration** : Destruction sphérique de rayon $r = 3.8$ blocs (hors bedrock et obsidienne), projection de 80 particules de flammes et fumées, et détonation sonore basse fréquence.

### 3.7 Ciel, Lumière & Cycle Jour/Nuit (FS-7)
- **Cycle Solaire Dynamique** : Paramètre temporel $t \in [0, 1]$ avec défilement continu commutable.
- **Objets Célestes** :
  - Soleil cubique doré et Lune cubique blanche en orbite circulaire de rayon 70 unités.
  - Voûte d'étoiles scintillantes activée durant la nuit ($t < 0.2$ ou $t > 0.8$).
  - Nappe de 64 nuages voxels semi-transparents dérivant continuellement à l'altitude $y \approx 28$.
- **Atmosphère & Brouillard** : Interpolation fluide des couleurs du ciel et du brouillard d'horizon (`FogExp2`) entre l'aube dorée, le zénith cyan, le crépuscule écarlate et la nuit bleu nuit.

### 3.8 Interface Utilisateur & HUD (FS-8)
- **Viseur Central** : Croix pixelisée classique blanche avec ombre portée.
- **Barre d'Accès Rapide (Hotbar)** : 9 emplacements numérotés avec icônes pixel-art, contour de sélection actif et infobulle éphémère du nom de l'objet.
- **Indicateurs de Survie** : 10 cœurs de santé et 10 cuisses de nourriture affichés uniquement en mode Survie.
- **Inventaire Créatif Modal (`E`)** : Grille scrollable de tous les blocs disponibles avec filtre textuel instantané et onglets catégoriels (*Tous*, *Nature*, *Construction*, *Minerais*, *Spéciaux*).
- **Écran de Débogage `F3`** : Télémétrie en temps réel (version, coordonnées XYZ exactes, bloc de grille, orientation boussole et degrés, état de vol, nom du bloc ciblé et total de voxels).
- **Dock Inférieur Rétractable (`H`)** : Barre d'actions rapides (Changement de mode, bascule de vol, annuler/rétablir, mute son, presets et paramètres) rétractable pour un affichage "Cinéma / Plein écran".

### 3.9 Presets de Mondes (FS-9)
1. **Monde Naturel** : Relief vallonné généré par bruit de gradient à 3 octaves, plages de sable, arbres en chêne avec canopée sphérique et filons de charbon/fer/or/diamant.
2. **Monde Plat** : Base de bedrock à $y=0$, deux couches de terre et couverture d'herbe à $y=3$.
3. **Château Fort** : Forteresse médiévale de $18\times18$ blocs avec remparts à créneaux, 4 tours d'angle surmontées de lanternes en pierre lumineuse, cour centrale et logis en bois avec fenêtres en verre.
4. **Désert & Pyramide** : Dunes de sable et temple à 9 étages à degrés renfermant une crypte secrète garnie de filons précieux.
5. **Îles Volantes** : Archipel d'îlots flottants avec racines de roche effilées et arbres suspendus.

### 3.10 Moteur Sonore Procédural (FS-10)
- **Synthèse Web Audio API Native** sans aucun téléchargement d'échantillons audio.
- Types de sons :
  - *Herbe / Terre* : Bruit blanc filtré passe-bas rapide ($200\text{--}1200\text{ Hz}$).
  - *Pierre* : Onde carrée transitoire avec décroissance exponentielle ($440 \to 140\text{ Hz}$).
  - *Bois* : Onde triangulaire chaude et résonante ($260 \to 80\text{ Hz}$).
  - *Verre* : Onde sinusoïdale cristalline haute fréquence ($1400 \to 2100\text{ Hz}$).
  - *Explosion* : Onde en dent de scie infra-grave ($120 \to 30\text{ Hz}$) couplée à un souffle de bruit blanc balayé.
  - *Musique d'ambiance* : Arpèges calmes en Do Majeur et La Mineur joués toutes les 12 secondes avec attaque douce et réverbération longue.

### 3.11 Persistance & Portabilité des Données (FS-11)
- **Sauvegarde Navigateur** : Écriture sérialisée du monde dans le `localStorage` sous la clé `voxelcraft_saved_world`.
- **Export JSON** : Téléchargement d'un fichier `.json` structuré contenant la version de schéma, les dimensions et la liste intégrale des coordonnées de blocs non vides.
- **Import JSON** : Téléversement de fichier permettant de restaurer ou de partager instantanément une création entre plusieurs machines.

---

## 4. Spécifications Non Fonctionnelles

| Dimension | Exigence | Mesure de Validation |
| :--- | :--- | :--- |
| **Performance de Rendu** | $\ge 60\text{ FPS}$ sur GPU dédié, $\ge 30\text{ FPS}$ sur GPU intégré. | Profiler DevTools Three.js / Chrome. |
| **Appels de Rendu (Draw Calls)** | $\le 25\text{ draw calls}$ pour l'ensemble du monde. | Regroupement `InstancedMesh` validé. |
| **Temps de Chargement Initial** | $\le 1.0\text{ seconde}$ (aucun asset externe à télécharger). | Mesure Network Chrome (hors bundle JS Vite). |
| **Zéro Dépendance 404** | Aucune requête HTTP réseau sortante vers des images ou fichiers audio. | Audit d'onglets réseau (0 erreur 404). |
| **Stabilité WebGL** | Le canevas 3D ne doit jamais être remonté ou réinitialisé lors des changements d'état React. | Montage isolé dans un conteneur `useRef`. |
| **Compatibilité Navigateurs** | Chrome 110+, Edge 110+, Firefox 115+, Safari 16.4+. | Validation multi-navigateurs WebGL 2.0. |

---

## 5. Matrice de Traçabilité des User Stories

| ID | En tant que... | Je souhaite... | Afin de... | Critère d'Acceptation |
| :--- | :--- | :--- | :--- | :--- |
| **US-01** | Bâtisseur | Poser et détruire des blocs avec précision. | Créer des structures complexes. | Le raycasting met en évidence le bloc visé et le clic pose/détruit immédiatement avec du son et des particules. |
| **US-02** | Joueur | Choisir n'importe quel bloc dans une bibliothèque. | Ne pas être limité aux 9 blocs de départ. | L'appui sur `E` ouvre l'inventaire avec recherche et permet d'équiper un bloc dans le slot sélectionné. |
| **US-03** | Architecte | Voler librement au-dessus du terrain. | Avoir une vue d'ensemble de mon chantier. | L'appui sur `F` ou le bouton de vol libère le joueur de la gravité et permet de monter avec `Espace` et descendre avec `Shift`. |
| **US-04** | Joueur | Déclencher des explosifs. | Faire des cratères ou miner rapidement. | Un clic sur la TNT allume la mèche qui explose au bout de 3 secondes en soufflant les blocs autour. |
| **US-05** | Créateur | Sauvegarder mon travail sous forme de fichier. | Reprendre plus tard ou partager ma carte à un ami. | Le bouton "Exporter .json" télécharge un fichier valide qui peut être réimporté fidèlement. |
| **US-06** | Utilisateur francophone | Jouer avec les touches ZQSD. | Profiter d'une disposition ergonomique sans devoir reconfigurer mon OS. | Le sélecteur AZERTY / QWERTY adapte instantanément les touches de déplacement sans conflit. |

---

## 6. Architecture Technique

```
┌────────────────────────────────────────────────────────┐
│                      NAVIGATEUR                        │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                    React HUD                     │  │
│  │  - Crosshair / Hotbar (HUD.tsx)                  │  │
│  │  - Creative Inventory Modal (InventoryModal.tsx) │  │
│  │  - Collapsible Control Dock (ControlDock.tsx)    │  │
│  │  - Settings & Presets Modal (SettingsModal.tsx)  │  │
│  │  - Keybindings & Help Modal (HelpModal.tsx)      │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │ Événements & Commandes     │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │               MOTEUR DE JEU CORE                 │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  App.tsx (Boucle principale & State)        │  │  │
│  │  └───────┬──────────────┬──────────────┬──────┘  │  │
│  │          │              │              │         │  │
│  │          ▼              ▼              ▼         │  │
│  │   Physics Engine   Voxel World    Sound Engine   │  │
│  │   (physics.ts)     (world.ts)      (audio.ts)    │  │
│  │   - AABB Bounds    - Chunk Map    - Web Audio    │  │
│  │   - Fly / Jump     - Noise 2D     - FX & Music   │  │
│  │   - Collision      - Undo / Redo  - Zero Assets  │  │
│  └──────────┬──────────────┬────────────────────────┘  │
│             │              │                           │
│             ▼              ▼                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │             MOTEUR DE RENDU THREE.JS             │  │
│  │  (renderer.ts, textures.ts, particles.ts)        │  │
│  │  - InstancedMesh par BlockType                   │  │
│  │  - Hidden Face Culling                           │  │
│  │  - Textures 16x16 Canvas2D NearestFilter         │  │
│  │  - Cycle Solaire, Nuages voxels & Étoiles        │  │
│  │  - Particules dynamiques d'éclats & TNT          │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 7. Perspectives & Évolutions Futures

1. **Génération Infinie de Chunks** : Chargement et déchargement dynamique de tronçons de $16\times16$ blocs autour du joueur.
2. **Logique Redstone** : Poudre de redstone, répéteurs, leviers et pistons interactifs.
3. **Contrôles Tactiles Avancés** : Joystick virtuel et boutons d'action adaptés aux tablettes et smartphones.
4. **Multijoueur Peer-to-Peer** : Synchronisation temps réel des positions de joueurs et modifications de monde via WebRTC sans serveur de jeu centralisé.
