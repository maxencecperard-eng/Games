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
  | 'diamond_ore'
  | 'gold_ore'
  | 'iron_ore'
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
  },
  grass: {
    id: 'grass',
    name: 'Bloc d’Herbe',
    category: 'nature',
    solid: true,
    soundType: 'grass',
    color: '#559933',
    description: 'Terre recouverte d’herbe fraîche',
  },
  dirt: {
    id: 'dirt',
    name: 'Terre',
    category: 'nature',
    solid: true,
    soundType: 'dirt',
    color: '#866043',
    description: 'Sol de terre fertile',
  },
  stone: {
    id: 'stone',
    name: 'Pierre',
    category: 'nature',
    solid: true,
    soundType: 'stone',
    color: '#888888',
    description: 'Roche dure souterraine',
  },
  cobblestone: {
    id: 'cobblestone',
    name: 'Pierre Taillée (Cobble)',
    category: 'building',
    solid: true,
    soundType: 'stone',
    color: '#707070',
    description: 'Pavés de pierre robuste',
  },
  wood: {
    id: 'wood',
    name: 'Bûche de Chêne',
    category: 'nature',
    solid: true,
    soundType: 'wood',
    color: '#6d5032',
    description: 'Tronc d’arbre robuste',
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
  },
  planks: {
    id: 'planks',
    name: 'Planches de Chêne',
    category: 'building',
    solid: true,
    soundType: 'wood',
    color: '#b8945f',
    description: 'Bois scié pour construction',
  },
  sand: {
    id: 'sand',
    name: 'Sable',
    category: 'nature',
    solid: true,
    soundType: 'sand',
    color: '#dbce97',
    description: 'Sable fin de plage ou désert',
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
  },
  brick: {
    id: 'brick',
    name: 'Briques Rouges',
    category: 'building',
    solid: true,
    soundType: 'stone',
    color: '#9e4438',
    description: 'Briques cuites avec joints clairs',
  },
  diamond_ore: {
    id: 'diamond_ore',
    name: 'Minerai de Diamant',
    category: 'minerals',
    solid: true,
    soundType: 'stone',
    color: '#4dedf4',
    description: 'Roche ornée de diamants précieux',
  },
  gold_ore: {
    id: 'gold_ore',
    name: 'Minerai d’Or',
    category: 'minerals',
    solid: true,
    soundType: 'stone',
    color: '#fcee4b',
    description: 'Roche riche en filons dorés',
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Minerai de Fer',
    category: 'minerals',
    solid: true,
    soundType: 'stone',
    color: '#d8af93',
    description: 'Minerai de fer essentiel',
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
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidienne',
    category: 'minerals',
    solid: true,
    soundType: 'stone',
    color: '#1c1328',
    description: 'Roche volcanique sombre et résistante',
  },
  tnt: {
    id: 'tnt',
    name: 'TNT Dynamite',
    category: 'special',
    solid: true,
    soundType: 'grass',
    color: '#db3223',
    description: 'Explosif puissant déclenchable',
  },
  bookshelf: {
    id: 'bookshelf',
    name: 'Bibliothèque',
    category: 'building',
    solid: true,
    soundType: 'wood',
    color: '#8b5a2b',
    description: 'Étagère garnie de livres anciens',
  },
  crafting_table: {
    id: 'crafting_table',
    name: 'Établi de Craft',
    category: 'special',
    solid: true,
    soundType: 'wood',
    color: '#ab7842',
    description: 'Table de menuisier avec outils gravés',
  },
  bedrock: {
    id: 'bedrock',
    name: 'Bedrock Indestructible',
    category: 'special',
    solid: true,
    soundType: 'stone',
    color: '#333333',
    description: 'Fondation impénétrable du monde',
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
  },
  snow: {
    id: 'snow',
    name: 'Neige des Cimes',
    category: 'nature',
    solid: true,
    soundType: 'grass',
    color: '#f0f5ff',
    description: 'Couche de neige fraîche des hautes montagnes',
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
  },
  sandstone: {
    id: 'sandstone',
    name: 'Grès Rocheux',
    category: 'building',
    solid: true,
    soundType: 'stone',
    color: '#dbcf98',
    description: 'Roche sédimentaire dorée des falaises',
  },
  gravel: {
    id: 'gravel',
    name: 'Gravier',
    category: 'nature',
    solid: true,
    soundType: 'dirt',
    color: '#8a8279',
    description: 'Mélange de petits cailloux et sable',
  },
};

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
