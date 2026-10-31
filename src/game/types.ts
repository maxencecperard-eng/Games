export type BlockType =
  | 'air'
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'cobblestone'
  | 'wood'
  | 'leaves'
  | 'planks'
  | 'sand'
  | 'glass'
  | 'brick'
  | 'coal_ore'
  | 'iron_ore'
  | 'gold_ore'
  | 'diamond_ore'
  | 'redstone_ore'
  | 'emerald_ore'
  | 'glowstone'
  | 'obsidian'
  | 'tnt'
  | 'bookshelf'
  | 'crafting_table'
  | 'bedrock'
  | 'water'
  | 'snow'
  | 'ice'
  | 'sandstone'
  | 'gravel';

export type BiomeType =
  | 'mountains'
  | 'beach'
  | 'ocean'
  | 'island'
  | 'forest'
  | 'plains'
  | 'desert';

export interface BiomeInfo {
  id: BiomeType;
  name: string;
  icon: string;
  description: string;
}

export const BIOMES: Record<BiomeType, BiomeInfo> = {
  mountains: {
    id: 'mountains',
    name: 'Pics & Montagnes Enneigées',
    icon: '🏔️',
    description: 'Sommets vertigineux couverts de neige et de glace',
  },
  beach: {
    id: 'beach',
    name: 'Plage Dorée',
    icon: '🏖️',
    description: 'Bordure côtière de sable fin et gravier',
  },
  ocean: {
    id: 'ocean',
    name: 'Océan Profond',
    icon: '🌊',
    description: 'Étendue aquatique parsemée de récifs',
  },
  island: {
    id: 'island',
    name: 'Îles Célestes & Côtières',
    icon: '🏝️',
    description: 'Îles isolées bordées de palmiers et de cascades',
  },
  forest: {
    id: 'forest',
    name: 'Forêt de Chênes Dense',
    icon: '🌲',
    description: 'Arbres centenaires et clairières sauvages',
  },
  plains: {
    id: 'plains',
    name: 'Plaines Verdoyantes',
    icon: '🌾',
    description: 'Grandes prairies douces pour construire',
  },
  desert: {
    id: 'desert',
    name: 'Désert Aride & Grès',
    icon: '🏜️',
    description: 'Hautes dunes de sable et falaises de grès',
  },
};

/** Rareté d'un bloc, affichée dans l'inventaire et l'index. */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RarityInfo {
  id: Rarity;
  label: string;
  color: string;
  ring: string;
  glow: string;
}

export const RARITIES: Record<Rarity, RarityInfo> = {
  common: {
    id: 'common',
    label: 'Commun',
    color: '#d4d4d4',
    ring: 'border-neutral-500',
    glow: 'shadow-neutral-500/20',
  },
  uncommon: {
    id: 'uncommon',
    label: 'Peu commun',
    color: '#4ade80',
    ring: 'border-emerald-500',
    glow: 'shadow-emerald-500/30',
  },
  rare: {
    id: 'rare',
    label: 'Rare',
    color: '#60a5fa',
    ring: 'border-sky-500',
    glow: 'shadow-sky-500/40',
  },
  epic: {
    id: 'epic',
    label: 'Épique',
    color: '#c084fc',
    ring: 'border-purple-500',
    glow: 'shadow-purple-500/40',
  },
  legendary: {
    id: 'legendary',
    label: 'Légendaire',
    color: '#fbbf24',
    ring: 'border-amber-400',
    glow: 'shadow-amber-400/50',
  },
};

export type ToolKind = 'pickaxe' | 'axe' | 'shovel' | null;

export interface BlockConfig {
  id: BlockType;
  name: string;
  category: 'nature' | 'building' | 'minerals' | 'special';
  solid: boolean;
  transparent?: boolean;
  lightLevel?: number;
  soundType: 'grass' | 'dirt' | 'stone' | 'wood' | 'glass' | 'sand';
  color: string;
  description: string;
  rarity: Rarity;
  /** Temps de minage à la main, en secondes (-1 = indestructible). */
  hardness: number;
  /** Outil qui accélère le minage. */
  tool: ToolKind;
  /** Niveau de pioche minimum (1 = bois, 2 = pierre, 3 = fer, 4 = diamant). */
  minTier?: number;
}

export const BLOCK_REGISTRY: Record<BlockType, BlockConfig> = {
  air: {
    id: 'air',
    name: 'Air',
    category: 'special',
    solid: false,
    transparent: true,
    soundType: 'grass',
    color: '#000000',
    description: 'Bloc vide',
    rarity: 'common',
    hardness: -1,
    tool: null,
  },
  grass: {
    id: 'grass',
    name: 'Bloc d’Herbe',
    category: 'nature',
    solid: true,
    soundType: 'grass',
    color: '#559933',
    description: 'Terre recouverte d’herbe fraîche',
    rarity: 'common',
    hardness: 0.6,
    tool: 'shovel',
  },
  dirt: {
    id: 'dirt',
    name: 'Terre',
    category: 'nature',
    solid: true,
    soundType: 'dirt',
    color: '#866043',
    description: 'Sol de terre fertile',
    rarity: 'common',
    hardness: 0.5,
    tool: 'shovel',
  },
  stone: {
    id: 'stone',
    name: 'Pierre',
    category: 'nature',
    solid: true,
    soundType: 'stone',
    color: '#888888',
    description: 'Roche dure souterraine',
    rarity: 'common',
    hardness: 3.0,
    tool: 'pickaxe',
    minTier: 1,
  },
  cobblestone: {
    id: 'cobblestone',
    name: 'Pierre Taillée',
    category: 'building',
    solid: true,
    soundType: 'stone',
    color: '#707070',
    description: 'Pavés de pierre robuste',
    rarity: 'uncommon',
    hardness: 3.5,
    tool: 'pickaxe',
    minTier: 1,
  },
  wood: {
    id: 'wood',
    name: 'Bûche de Chêne',
    category: 'nature',
    solid: true,
    soundType: 'wood',
    color: '#6d5032',
    description: 'Tronc d’arbre robuste',
    rarity: 'common',
    hardness: 2.0,
    tool: 'axe',
  },
  leaves: {
    id: 'leaves',
    name: 'Feuillage',
    category: 'nature',
    solid: true,
    transparent: true,
    soundType: 'grass',
    color: '#348025',
    description: 'Feuilles denses d’arbre',
    rarity: 'common',
    hardness: 0.2,
    tool: null,
  },
  planks: {
    id: 'planks',
    name: 'Planches de Chêne',
    category: 'building',
    solid: true,
    soundType: 'wood',
    color: '#b8945f',
    description: 'Bois scié pour construction',
    rarity: 'uncommon',
    hardness: 2.0,
    tool: 'axe',
  },
  sand: {
    id: 'sand',
    name: 'Sable',
    category: 'nature',
    solid: true,
    soundType: 'sand',
    color: '#dbce97',
    description: 'Sable fin de plage ou désert',
    rarity: 'common',
    hardness: 0.5,
    tool: 'shovel',
  },
  glass: {
    id: 'glass',
    name: 'Verre',
    category: 'building',
    solid: true,
    transparent: true,
    soundType: 'glass',
    color: '#c4e2ea',
    description: 'Verre transparent translucide',
    rarity: 'uncommon',
    hardness: 0.3,
    tool: null,
  },
  brick: {
    id: 'brick',
    name: 'Briques Rouges',
    category: 'building',
    solid: true,
    soundType: 'stone',
    color: '#9e4438',
    description: 'Briques cuites avec joints clairs',
    rarity: 'rare',
    hardness: 3.0,
    tool: 'pickaxe',
    minTier: 1,
  },
  coal_ore: {
    id: 'coal_ore',
    name: 'Minerai de Charbon',
    category: 'minerals',
    solid: true,
    soundType: 'stone',
    color: '#3b3b3b',
    description: 'Pierre parsemée de charbon noir',
    rarity: 'uncommon',
    hardness: 4.0,
    tool: 'pickaxe',
    minTier: 1,
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Minerai de Fer',
    category: 'minerals',
    solid: true,
    soundType: 'stone',
    color: '#d8af93',
    description: 'Minerai de fer essentiel',
    rarity: 'rare',
    hardness: 5.0,
    tool: 'pickaxe',
    minTier: 2,
  },
  gold_ore: {
    id: 'gold_ore',
    name: 'Minerai d’Or',
    category: 'minerals',
    solid: true,
    soundType: 'stone',
    color: '#fcee4b',
    description: 'Roche riche en filons dorés',
    rarity: 'rare',
    hardness: 6.0,
    tool: 'pickaxe',
    minTier: 3,
  },
  diamond_ore: {
    id: 'diamond_ore',
    name: 'Minerai de Diamant',
    category: 'minerals',
    solid: true,
    soundType: 'stone',
    color: '#4dedf4',
    description: 'Roche ornée de diamants précieux',
    rarity: 'epic',
    hardness: 8.0,
    tool: 'pickaxe',
    minTier: 3,
  },
  redstone_ore: {
    id: 'redstone_ore',
    name: 'Minerai de Redstone',
    category: 'minerals',
    solid: true,
    soundType: 'stone',
    color: '#c81e1e',
    description: 'Cristaux rouges parcourus d’énergie',
    rarity: 'rare',
    hardness: 5.5,
    tool: 'pickaxe',
    minTier: 3,
  },
  emerald_ore: {
    id: 'emerald_ore',
    name: 'Minerai d’Émeraude',
    category: 'minerals',
    solid: true,
    soundType: 'stone',
    color: '#22c55e',
    description: 'Le minerai le plus rare des montagnes',
    rarity: 'epic',
    hardness: 7.5,
    tool: 'pickaxe',
    minTier: 3,
  },
  glowstone: {
    id: 'glowstone',
    name: 'Pierre Lumineuse',
    category: 'special',
    solid: true,
    lightLevel: 15,
    soundType: 'glass',
    color: '#ffe570',
    description: 'Bloc rayonnant de lumière dorée',
    rarity: 'epic',
    hardness: 0.5,
    tool: null,
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidienne',
    category: 'minerals',
    solid: true,
    soundType: 'stone',
    color: '#1c1328',
    description: 'Roche volcanique sombre et résistante',
    rarity: 'legendary',
    hardness: 45,
    tool: 'pickaxe',
    minTier: 4,
  },
  tnt: {
    id: 'tnt',
    name: 'TNT',
    category: 'special',
    solid: true,
    soundType: 'grass',
    color: '#db3223',
    description: 'Explosif puissant déclenchable',
    rarity: 'rare',
    hardness: 0.2,
    tool: null,
  },
  bookshelf: {
    id: 'bookshelf',
    name: 'Bibliothèque',
    category: 'building',
    solid: true,
    soundType: 'wood',
    color: '#8b5a2b',
    description: 'Étagère garnie de livres anciens',
    rarity: 'rare',
    hardness: 1.5,
    tool: 'axe',
  },
  crafting_table: {
    id: 'crafting_table',
    name: 'Établi de Fabrication',
    category: 'special',
    solid: true,
    soundType: 'wood',
    color: '#ab7842',
    description: 'Clic droit pour fabriquer armes et outils',
    rarity: 'rare',
    hardness: 2.5,
    tool: 'axe',
  },
  bedrock: {
    id: 'bedrock',
    name: 'Bedrock Indestructible',
    category: 'special',
    solid: true,
    soundType: 'stone',
    color: '#333333',
    description: 'Fondation impénétrable du monde',
    rarity: 'legendary',
    hardness: -1,
    tool: null,
  },
  water: {
    id: 'water',
    name: 'Eau',
    category: 'nature',
    solid: false,
    transparent: true,
    soundType: 'sand',
    color: '#3b82f6',
    description: 'Eau fluide et rafraîchissante',
    rarity: 'common',
    hardness: -1,
    tool: null,
  },
  snow: {
    id: 'snow',
    name: 'Neige des Cimes',
    category: 'nature',
    solid: true,
    soundType: 'grass',
    color: '#f0f5ff',
    description: 'Couche de neige fraîche des hautes montagnes',
    rarity: 'common',
    hardness: 0.3,
    tool: 'shovel',
  },
  ice: {
    id: 'ice',
    name: 'Glace Compacte',
    category: 'nature',
    solid: true,
    transparent: true,
    soundType: 'glass',
    color: '#9ad0ec',
    description: 'Glace translucide glissante',
    rarity: 'uncommon',
    hardness: 0.5,
    tool: 'pickaxe',
  },
  sandstone: {
    id: 'sandstone',
    name: 'Grès Rocheux',
    category: 'building',
    solid: true,
    soundType: 'stone',
    color: '#dbcf98',
    description: 'Roche sédimentaire dorée des falaises',
    rarity: 'uncommon',
    hardness: 3.0,
    tool: 'pickaxe',
    minTier: 1,
  },
  gravel: {
    id: 'gravel',
    name: 'Gravier',
    category: 'nature',
    solid: true,
    soundType: 'dirt',
    color: '#8a8279',
    description: 'Mélange de petits cailloux et sable',
    rarity: 'common',
    hardness: 0.6,
    tool: 'shovel',
  },
};

/** Identifiants numériques compacts utilisés par le stockage des chunks. */
export const BLOCK_IDS: Record<BlockType, number> = {} as Record<BlockType, number>;
export const ID_TO_BLOCK: BlockType[] = [];

(Object.keys(BLOCK_REGISTRY) as BlockType[]).forEach((id, index) => {
  BLOCK_IDS[id] = index;
  ID_TO_BLOCK[index] = id;
});

/** Ordre d'affichage des raretés (du plus commun au plus rare). */
export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export interface WorldAction {
  type: 'place' | 'break';
  x: number;
  y: number;
  z: number;
  previousBlock: BlockType;
  newBlock: BlockType;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  flying: boolean;
  mode: 'creative' | 'survival';
}

export type WorldPreset = 'hills' | 'flat' | 'floating' | 'castle' | 'desert';
