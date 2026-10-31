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
- **Structure de Données** : Monde **infini par chunks** de $16\times16$ colonnes, chaque chunk stockant ses blocs dans un `Uint16Array` indexé par identifiant `BlockType`, avec un tableau de hauteurs par colonne pour le rendu.
- **Dimensions** : Étendue horizontale infinie ; **192 couches en hauteur** ($y = -64$ à $127$), niveau de la mer à $y = 20$.
- **Chargement Dynamique** : Génération à la demande autour du joueur (rayon de 4 chunks) et déchargement des chunks éloignés pour maîtriser mémoire et framerate.
- **Couches Géologiques & Sous-Sol Profond** :
  - *Fondation Bedrock* : Plancher impénétrable aux reliefs déchiquetés à $y = -64\dots-61$.
  - *Sous-sol Profond* : Roche dense criblée de filons de charbon, fer, or, redstone, diamants, émeraudes, de cavités et cavernes naturelles.
  - *Sommets Montagneux* : Cimes coiffées de neige, bien au-dessus du niveau de la mer.
- **Persistance Sparse** : Seules les modifications du joueur sont sauvegardées (graine + preset + éditions), schéma `version: 3` ; les anciennes sauvegardes v2 sont converties.
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
- **Indicateurs de Survie** : 10 cœurs de santé et 10 cuisses de nourriture, affichés à gauche de la barre d'accès uniquement en mode Survie.
- **Barre de Minage** : progression du bloc miné sous le réticule, avec le nom du bloc et le pourcentage.
- **Inventaire Modal (`E`)** : onglets *Possédés*, *Blocs* et *Outils & Armes*, recherche instantanée, rareté colorée et quantités possédées.
- **Fabrication (`C`)** : interface d'établi animée, recettes verrouillées sans établi à proximité, résultat mis en avant à la fin de l'artisanat.
- **Index des Blocs (`I`)** : catalogue complet (icône, rareté, dureté, outil et niveau requis, quantité possédée) avec filtre par rareté et recherche.
- **Vie des Créatures** : barre de vie flottante au-dessus de chaque monstre et animal, mise à jour à chaque coup.
- **Écran de Débogage `F3`** : télémétrie en temps réel (version, coordonnées XYZ exactes, bloc de grille, biome, orientation boussole et degrés, état de vol, nom du bloc ciblé et total de voxels chargés).
- **Dock Inférieur Rétractable (`H`)** : Barre d'actions rapides (Changement de mode, bascule de vol, annuler/rétablir, mute son, presets et paramètres) rétractable pour un affichage "Cinéma / Plein écran".

### 3.9 Presets de Mondes (FS-9)
1. **Monde Naturel** : Relief infini généré par bruit multi-octaves avec biomes (montagnes, plages, océan, forêt, plaines, désert), arbres en chêne, grottes et filons de charbon/fer/or/redstone/diamant/émeraude.
2. **Monde Plat** : Surface d'herbe au niveau de la mer ($y = 20$), idéale pour de grandes constructions.
3. **Château Fort** : Forteresse médiévale avec douves, remparts à créneaux, 4 tours d'angle surmontées de pierre lumineuse, cour centrale, logis en bois avec fenêtres en verre et établi de fabrication.
4. **Désert** : Dunes de sable et falaises de grès à perte de vue.
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
| **US-01** | Bâtisseur | Poser et détruire des blocs avec précision. | Créer des structures complexes. | Le raycasting met en évidence le bloc visé, le clic gauche maintient le minage (durée propre au bloc) et le clic droit pose le bloc avec son et particules. |
| **US-02** | Joueur | Récolter les blocs que je mine. | Démarrer sans rien et progresser. | En survie, la barre d'accès est vide au départ ; chaque bloc miné avec l'outil adéquat est ajouté à l'inventaire et à la hotbar. |
| **US-07** | Joueur | Fabriquer des armes et des pioches. | Être plus efficace au combat et au minage. | L'appui sur `C` ouvre l'établi animé ; les recettes d'armes exigent un établi placé à proximité et consomment les ressources. |
| **US-08** | Joueur | Consulter la rareté et les caractéristiques des blocs. | Savoir ce qui vaut la peine d'être miné. | L'appui sur `I` ouvre l'index complet avec rareté, dureté, outil et niveau de pioche requis, filtrable et cherchable. |
| **US-09** | Joueur | Combattre les monstres et survivre la nuit. | Avoir un vrai défi de survie. | Chaque créature a une barre de vie ; les zombies/squelettes attaquent la nuit et le joueur dispose de 10 cœurs avec régénération. |
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

1. **Génération Infinie de Chunks** : ✅ Implémentée — chargement et déchargement dynamique de tronçons de $16\times16$ blocs autour du joueur.
2. **Logique Redstone** : Poudre de redstone, répéteurs, leviers et pistons interactifs (les minerais de redstone existent déjà).
3. **Contrôles Tactiles Avancés** : Joystick virtuel et boutons d'action adaptés aux tablettes et smartphones.
4. **Multijoueur Peer-to-Peer** : Synchronisation temps réel des positions de joueurs et modifications de monde via WebRTC sans serveur de jeu centralisé.
5. **Faim & Nourriture** : Consommation des cuisses de faim et aliments (la barre de faim est déjà affichée).
