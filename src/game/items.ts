import { BlockType, BLOCK_REGISTRY, Rarity, ToolKind } from './types';

export type ToolTier = 1 | 2 | 3 | 4;

export type SwordId = 'wood_sword' | 'stone_sword' | 'iron_sword' | 'diamond_sword';
export type PickaxeId = 'wood_pickaxe' | 'stone_pickaxe' | 'iron_pickaxe' | 'diamond_pickaxe';

export type ItemId = BlockType | 'stick' | SwordId | PickaxeId;

export interface ItemConfig {
  id: ItemId;
  name: string;
  kind: 'block' | 'material' | 'weapon' | 'tool';
  rarity: Rarity;
  description: string;
  /** Bloc posable associé (kind === 'block'). */
  block?: BlockType;
  /** Dégâts d'attaque (armes / pioches). */
  damage?: number;
  /** Niveau de pioche (1 bois → 4 diamant). */
  tier?: ToolTier;
  /** Multiplicateur de vitesse de minage. */
  miningSpeed?: number;
}

export const ITEMS: Record<ItemId, ItemConfig> = {} as Record<ItemId, ItemConfig>;

// Tous les blocs sont des objets récupérables.
(Object.keys(BLOCK_REGISTRY) as BlockType[]).forEach((id) => {
  if (id === 'air' || id === 'water') return;
  const cfg = BLOCK_REGISTRY[id];
  ITEMS[id] = {
    id,
    name: cfg.name,
    kind: 'block',
    rarity: cfg.rarity,
    description: cfg.description,
    block: id,
  };
});

ITEMS.stick = {
  id: 'stick',
  name: 'Bâton',
  kind: 'material',
  rarity: 'common',
  description: 'Branche de bois taillée, base de tout artisanat',
};

const TIER_NAMES: Record<ToolTier, string> = {
  1: 'en Bois',
  2: 'en Pierre',
  3: 'en Fer',
  4: 'en Diamant',
};
const TIER_RARITY: Record<ToolTier, Rarity> = {
  1: 'common',
  2: 'uncommon',
  3: 'rare',
  4: 'epic',
};
const TIER_PREFIX: Record<ToolTier, string> = {
  1: 'wood',
  2: 'stone',
  3: 'iron',
  4: 'diamond',
};

const SWORD_DAMAGE: Record<ToolTier, number> = { 1: 4, 2: 5, 3: 6.5, 4: 8 };
const PICKAXE_SPEED: Record<ToolTier, number> = { 1: 2, 2: 4, 3: 6, 4: 8 };
const PICKAXE_DAMAGE: Record<ToolTier, number> = { 1: 2, 2: 3, 3: 4, 4: 5 };

([1, 2, 3, 4] as ToolTier[]).forEach((tier) => {
  const prefix = TIER_PREFIX[tier];
  const swordId = `${prefix}_sword` as SwordId;
  ITEMS[swordId] = {
    id: swordId,
    name: `Épée ${TIER_NAMES[tier]}`,
    kind: 'weapon',
    rarity: TIER_RARITY[tier],
    description: `Arme tranchante infligeant ${SWORD_DAMAGE[tier]} dégâts`,
    damage: SWORD_DAMAGE[tier],
  };
  const pickId = `${prefix}_pickaxe` as PickaxeId;
  ITEMS[pickId] = {
    id: pickId,
    name: `Pioche ${TIER_NAMES[tier]}`,
    kind: 'tool',
    rarity: TIER_RARITY[tier],
    description: `Creuse ${PICKAXE_SPEED[tier]}x plus vite et récolte les minerais de niveau ${tier}`,
    damage: PICKAXE_DAMAGE[tier],
    tier,
    miningSpeed: PICKAXE_SPEED[tier],
  };
});

export function getItem(id: ItemId | null | undefined): ItemConfig | undefined {
  return id ? ITEMS[id] : undefined;
}

export function isBlockItem(id: ItemId | null | undefined): id is BlockType {
  return !!id && id in BLOCK_REGISTRY && id !== 'air' && id !== 'water';
}

export function getBlockOfItem(id: ItemId | null | undefined): BlockType | null {
  const item = getItem(id);
  return item?.block ?? null;
}

export function getAttackDamage(item: ItemId | null | undefined): number {
  return getItem(item)?.damage ?? 1;
}

export interface BreakInfo {
  /** Durée en secondes. -1 si indestructible. */
  seconds: number;
  /** false si le bloc ne peut pas être récupéré (pioche trop faible). */
  canHarvest: boolean;
  /** Niveau de pioche manquant, si applicable. */
  requiredTier?: number;
}

export function getBreakInfo(block: BlockType, held: ItemId | null | undefined): BreakInfo {
  const cfg = BLOCK_REGISTRY[block];
  if (!cfg || cfg.hardness < 0) return { seconds: -1, canHarvest: false };

  const item = getItem(held);
  const tier = item?.tier ?? 0;
  const requiredTier = cfg.minTier;

  let multiplier = 1;
  if (item?.kind === 'tool' && cfg.tool === ('pickaxe' as ToolKind)) {
    multiplier = item.miningSpeed ?? 2;
  } else if (cfg.tool === 'axe' && item?.kind === 'weapon') {
    multiplier = 1.4;
  }

  const canHarvest = !requiredTier || tier >= requiredTier;
  const penalty = canHarvest ? 1 : 6;

  return {
    seconds: (cfg.hardness * penalty) / multiplier,
    canHarvest,
    requiredTier: canHarvest ? undefined : requiredTier,
  };
}

export interface Recipe {
  id: string;
  output: ItemId;
  count: number;
  ingredients: { item: ItemId; count: number }[];
  requiresTable: boolean;
  /** Durée de l'animation de fabrication, en secondes. */
  time: number;
}

export const RECIPES: Recipe[] = [
  {
    id: 'planks',
    output: 'planks',
    count: 4,
    ingredients: [{ item: 'wood', count: 1 }],
    requiresTable: false,
    time: 0.7,
  },
  {
    id: 'stick',
    output: 'stick',
    count: 4,
    ingredients: [{ item: 'planks', count: 2 }],
    requiresTable: false,
    time: 0.6,
  },
  {
    id: 'crafting_table',
    output: 'crafting_table',
    count: 1,
    ingredients: [{ item: 'planks', count: 4 }],
    requiresTable: false,
    time: 0.9,
  },
  {
    id: 'wood_pickaxe',
    output: 'wood_pickaxe',
    count: 1,
    ingredients: [
      { item: 'planks', count: 3 },
      { item: 'stick', count: 2 },
    ],
    requiresTable: true,
    time: 1.1,
  },
  {
    id: 'stone_pickaxe',
    output: 'stone_pickaxe',
    count: 1,
    ingredients: [
      { item: 'cobblestone', count: 3 },
      { item: 'stick', count: 2 },
    ],
    requiresTable: true,
    time: 1.2,
  },
  {
    id: 'iron_pickaxe',
    output: 'iron_pickaxe',
    count: 1,
    ingredients: [
      { item: 'iron_ore', count: 3 },
      { item: 'stick', count: 2 },
    ],
    requiresTable: true,
    time: 1.4,
  },
  {
    id: 'diamond_pickaxe',
    output: 'diamond_pickaxe',
    count: 1,
    ingredients: [
      { item: 'diamond_ore', count: 3 },
      { item: 'stick', count: 2 },
    ],
    requiresTable: true,
    time: 1.6,
  },
  {
    id: 'wood_sword',
    output: 'wood_sword',
    count: 1,
    ingredients: [
      { item: 'planks', count: 2 },
      { item: 'stick', count: 1 },
    ],
    requiresTable: true,
    time: 1.0,
  },
  {
    id: 'stone_sword',
    output: 'stone_sword',
    count: 1,
    ingredients: [
      { item: 'cobblestone', count: 2 },
      { item: 'stick', count: 1 },
    ],
    requiresTable: true,
    time: 1.1,
  },
  {
    id: 'iron_sword',
    output: 'iron_sword',
    count: 1,
    ingredients: [
      { item: 'iron_ore', count: 2 },
      { item: 'stick', count: 1 },
    ],
    requiresTable: true,
    time: 1.3,
  },
  {
    id: 'diamond_sword',
    output: 'diamond_sword',
    count: 1,
    ingredients: [
      { item: 'diamond_ore', count: 2 },
      { item: 'stick', count: 1 },
    ],
    requiresTable: true,
    time: 1.5,
  },
  {
    id: 'tnt',
    output: 'tnt',
    count: 1,
    ingredients: [
      { item: 'sand', count: 4 },
      { item: 'redstone_ore', count: 1 },
    ],
    requiresTable: true,
    time: 1.4,
  },
];

/** Vérifie si le joueur possède tous les ingrédients d'une recette. */
export function canCraft(recipe: Recipe, inventory: Record<string, number>, nearTable: boolean): boolean {
  if (recipe.requiresTable && !nearTable) return false;
  return recipe.ingredients.every((ing) => (inventory[ing.item] ?? 0) >= ing.count);
}
