/**
 * VoxelCraft 3D - Jeu de construction de blocs style Minecraft
 *
 * Monde infini par chunks, survie (récolte + fabrication), barres de vie
 * joueur/monstres, minage progressif et index des blocs.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VoxelWorld } from './game/world';
import { PlayerPhysics, PlayerInput } from './game/physics';
import { GameRenderer } from './game/renderer';
import { soundEngine } from './game/audio';
import { BlockType, WorldPreset, BLOCK_REGISTRY, BIOMES } from './game/types';
import {
  ItemId,
  ITEMS,
  Recipe,
  canCraft,
  getAttackDamage,
  getBlockOfItem,
  getBreakInfo,
} from './game/items';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { ControlDock } from './components/ControlDock';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { CraftingModal } from './components/CraftingModal';
import { BlockIndexModal } from './components/BlockIndexModal';

const EMPTY_HOTBAR: (ItemId | null)[] = new Array(9).fill(null);

/** Entrée neutre utilisée quand une fenêtre (paramètres, inventaire…) est ouverte. */
const IDLE_INPUT: PlayerInput = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  sneak: false,
  fly: false,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  // Core game instances stored in ref to ensure canvas is NEVER torn down
  const gameRef = useRef<{
    world: VoxelWorld;
    physics: PlayerPhysics;
    renderer: GameRenderer;
  } | null>(null);

  // Player input state
  const inputRef = useRef<PlayerInput>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sneak: false,
    fly: false,
  });

  // UI state
  const [isLocked, setIsLocked] = useState(false);
  const lockedRef = useRef(false);
  const [hotbar, setHotbar] = useState<(ItemId | null)[]>(() => [...EMPTY_HOTBAR]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [activeItemToast, setActiveItemToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [icons, setIcons] = useState<Record<string, string>>({});
  const [keyboardLayout, setKeyboardLayout] = useState<'azerty' | 'qwerty'>('azerty');
  const [gameMode, setGameMode] = useState<'creative' | 'survival'>('survival');
  const [isFlying, setIsFlying] = useState(false);
  const [f3Open, setF3Open] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Modals
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [craftingOpen, setCraftingOpen] = useState(false);
  const [craftingNearTable, setCraftingNearTable] = useState(false);

  // World & Environment settings
  const [worldPreset, setWorldPreset] = useState<WorldPreset>('hills');
  const [timeOfDay, setTimeOfDay] = useState(0.45);
  const [dayCycleActive, setDayCycleActive] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [musicActive, setMusicActive] = useState(false);

  // Player stats
  const [health, setHealth] = useState(20);
  const [hunger, setHunger] = useState(20);
  const [damageFlash, setDamageFlash] = useState(0);

  // Mining
  const [miningProgress, setMiningProgress] = useState(0);
  const [miningTarget, setMiningTarget] = useState<string | null>(null);

  // Coordinates & stats for F3 and Biome
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 26, z: 0 });
  const [playerAngles, setPlayerAngles] = useState({ yaw: 0, pitch: 0 });
  const [currentBiomeName, setCurrentBiomeName] = useState('🌾 Plaines Verdoyantes');
  const [targetBlockName, setTargetBlockName] = useState<string | null>(null);
  const [entitySummary, setEntitySummary] = useState('');
  const [totalBlocksCount, setTotalBlocksCount] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Refs mirroring state for the game loops
  const hotbarRef = useRef<(ItemId | null)[]>([...EMPTY_HOTBAR]);
  const inventoryRef = useRef<Record<string, number>>({});
  const selectedSlotRef = useRef(0);
  const gameModeRef = useRef<'creative' | 'survival'>('survival');
  const healthRef = useRef(20);
  const damageFlashTimer = useRef<number | null>(null);
  const leftDownRef = useRef(false);
  const miningRef = useRef<{ x: number; y: number; z: number; progress: number } | null>(null);
  const lastMineTime = useRef(performance.now());
  const lastCreativeBreak = useRef(0);
  const lastAttackTime = useRef(0);
  const lastRegen = useRef(performance.now());
  const modalOpenRef = useRef(false);

  const showToast = useCallback((name: string) => {
    setActiveItemToast(name);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setActiveItemToast(null), 1600);
  }, []);

  // Une fenêtre modale est-elle ouverte ? (bloque les entrées de jeu et le
  // verrouillage de la souris, sinon les clics sur les réglages sont capturés)
  const anyModalOpen = inventoryOpen || settingsOpen || helpOpen || indexOpen || craftingOpen;

  useEffect(() => {
    modalOpenRef.current = anyModalOpen;
    if (!anyModalOpen) return;
    // Stoppe le déplacement/minage en cours quand une fenêtre s'ouvre.
    inputRef.current.forward = false;
    inputRef.current.backward = false;
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.jump = false;
    inputRef.current.sneak = false;
    leftDownRef.current = false;
    miningRef.current = null;
    setMiningProgress(0);
    setMiningTarget(null);
  }, [anyModalOpen]);

  // ---------------------------------------------------------------------------
  // Inventaire
  // ---------------------------------------------------------------------------

  const addItem = useCallback((id: ItemId, count = 1) => {
    inventoryRef.current[id] = (inventoryRef.current[id] ?? 0) + count;
    setInventory({ ...inventoryRef.current });

    if (!hotbarRef.current.includes(id)) {
      const free = hotbarRef.current.indexOf(null);
      if (free !== -1) {
        hotbarRef.current[free] = id;
        setHotbar([...hotbarRef.current]);
        if (selectedSlotRef.current === free) {
          gameRef.current?.renderer.setHandItem(id);
        }
      }
    }
  }, []);

  const removeItem = useCallback((id: ItemId, count = 1) => {
    const next = (inventoryRef.current[id] ?? 0) - count;
    if (next > 0) {
      inventoryRef.current[id] = next;
    } else {
      delete inventoryRef.current[id];
    }
    setInventory({ ...inventoryRef.current });
  }, []);

  const updateHand = useCallback(() => {
    const item = hotbarRef.current[selectedSlotRef.current] ?? null;
    const usable = item && (gameModeRef.current === 'creative' || (inventoryRef.current[item] ?? 0) > 0);
    gameRef.current?.renderer.setHandItem(usable ? item : null);
  }, []);

  const handleSelectSlot = useCallback(
    (slotIdx: number) => {
      const idx = Math.max(0, Math.min(8, slotIdx));
      selectedSlotRef.current = idx;
      setSelectedSlot(idx);
      const item = hotbarRef.current[idx];
      if (item) {
        const cfg = ITEMS[item];
        const count = inventoryRef.current[item] ?? 0;
        if (cfg) showToast(gameModeRef.current === 'creative' ? cfg.name : `${cfg.name}${count > 0 ? ` ×${count}` : ' (vide)'}`);
      }
      updateHand();
    },
    [showToast, updateHand]
  );

  // ---------------------------------------------------------------------------
  // Initialisation du jeu
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const world = new VoxelWorld('hills');
    const physics = new PlayerPhysics(world);
    const renderer = new GameRenderer(container, world, physics);

    gameRef.current = { world, physics, renderer };

    renderer.setHandItem(null);

    // Build icon map for blocks + tools
    const iconMap: Record<string, string> = { ...renderer.textureManager.getAllIconUrls() };
    for (const id of Object.keys(ITEMS)) {
      if (!iconMap[id]) iconMap[id] = renderer.textureManager.getItemIcon(id as ItemId);
    }
    setIcons(iconMap);
    setTotalBlocksCount(world.getLoadedBlockCount());

    // Damage from mobs
    renderer.onPlayerHit = (damage, source) => {
      if (gameModeRef.current !== 'survival') return;
      healthRef.current = Math.max(0, healthRef.current - damage);
      setHealth(healthRef.current);
      setDamageFlash(Date.now());
      soundEngine.playHurt();
      if (damageFlashTimer.current) clearTimeout(damageFlashTimer.current);
      damageFlashTimer.current = window.setTimeout(() => setDamageFlash(0), 280);

      if (healthRef.current <= 0) {
        physics.findSpawnPosition();
        healthRef.current = 20;
        setHealth(20);
        setHunger(20);
        showToast(`☠️ Tué par un ${source} — réapparition !`);
      }
    };

    // Physics & State Loop
    let lastPhysicsTime = performance.now();
    let lastTimeSync = lastPhysicsTime;
    let physicsIntervalId: number;

    const runPhysicsTick = () => {
      const now = performance.now();
      const delta = (now - lastPhysicsTime) / 1000;
      lastPhysicsTime = now;

      physics.update(delta, modalOpenRef.current ? IDLE_INPUT : inputRef.current);

      setPlayerPos({ x: physics.position.x, y: physics.position.y, z: physics.position.z });
      setPlayerAngles({ yaw: physics.yaw, pitch: physics.pitch });
      setIsFlying(physics.isFlying);

      const bId = world.getBiomeAt(Math.floor(physics.position.x), Math.floor(physics.position.z));
      const bInfo = BIOMES[bId];
      if (bInfo) setCurrentBiomeName(`${bInfo.icon} ${bInfo.name}`);

      if (renderer.currentHit) {
        const cfg = BLOCK_REGISTRY[renderer.currentHit.blockType];
        setTargetBlockName(cfg ? cfg.name : renderer.currentHit.blockType);
      } else {
        setTargetBlockName(null);
      }

      setEntitySummary(renderer.mobs.getSummary());
      setCanUndo(world.canUndo());
      setCanRedo(world.canRedo());
      setTotalBlocksCount(world.getLoadedBlockCount());

      // Garde le curseur d'heure des paramètres aligné sur le cycle jour/nuit.
      if (now - lastTimeSync > 500) {
        lastTimeSync = now;
        setTimeOfDay(renderer.timeOfDay);
      }

      // Slow health regeneration in survival
      if (gameModeRef.current === 'survival' && healthRef.current < 20 && now - lastRegen.current > 6000) {
        lastRegen.current = now;
        healthRef.current = Math.min(20, healthRef.current + 1);
        setHealth(healthRef.current);
      }
    };

    physicsIntervalId = window.setInterval(runPhysicsTick, 16);

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === container;
      lockedRef.current = locked;
      setIsLocked(locked);
      if (!locked) {
        leftDownRef.current = false;
        miningRef.current = null;
        setMiningProgress(0);
      }
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== container) return;
      const sensitivity = 0.0022;
      physics.yaw -= e.movementX * sensitivity;
      physics.pitch -= e.movementY * sensitivity;
      const maxPitch = (Math.PI / 2) * 0.98;
      physics.pitch = Math.max(-maxPitch, Math.min(maxPitch, physics.pitch));
    };
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      clearInterval(physicsIntervalId);
      if (damageFlashTimer.current) clearTimeout(damageFlashTimer.current);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      gameRef.current = null;
    };
  }, [showToast]);

  // ---------------------------------------------------------------------------
  // Boucle de minage / attaque (clic gauche maintenu)
  // ---------------------------------------------------------------------------

  const breakBlockAt = useCallback(
    (x: number, y: number, z: number, type: BlockType) => {
      const game = gameRef.current;
      if (!game) return;
      const cfg = BLOCK_REGISTRY[type];
      if (!cfg || cfg.hardness < 0) return;

      soundEngine.playBreakBlock(cfg.soundType);
      game.renderer.particles.emitBreak(x, y, z, type);
      game.world.setBlock(x, y, z, 'air', true);

      if (gameModeRef.current === 'survival') {
        const held = hotbarRef.current[selectedSlotRef.current];
        const info = getBreakInfo(type, held);
        if (info.canHarvest) {
          addItem(type, 1);
        } else if (info.requiredTier) {
          showToast(`⛏️ Pioche niveau ${info.requiredTier} requise pour récolter !`);
        }
      }
    },
    [addItem, showToast]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      const game = gameRef.current;
      if (!game || !lockedRef.current || !leftDownRef.current) return;

      const now = performance.now();
      const delta = Math.min((now - lastMineTime.current) / 1000, 0.1);
      lastMineTime.current = now;

      const held = hotbarRef.current[selectedSlotRef.current];
      const damage = getAttackDamage(held);

      // 1. Attaque d'un mob sous le réticule
      if (now - lastAttackTime.current > 480) {
        const attack = game.renderer.tryAttack(damage);
        if (attack.hit) {
          lastAttackTime.current = now;
          game.renderer.triggerSwing();
          soundEngine.playHurt();
          miningRef.current = null;
          setMiningProgress(0);
          setMiningTarget(null);
          if (attack.killed) showToast(`☠️ ${attack.name} vaincu !`);
          return;
        }
      }

      // 2. Minage du bloc ciblé
      const hit = game.renderer.currentHit;
      if (!hit) {
        miningRef.current = null;
        setMiningProgress(0);
        setMiningTarget(null);
        return;
      }

      const { x, y, z } = hit.blockPos;
      const type = hit.blockType;

      if (gameModeRef.current === 'creative') {
        if (now - lastCreativeBreak.current > 140) {
          lastCreativeBreak.current = now;
          game.renderer.triggerSwing();
          breakBlockAt(x, y, z, type);
        }
        return;
      }

      const info = getBreakInfo(type, held);
      if (info.seconds < 0) {
        miningRef.current = null;
        setMiningProgress(0);
        setMiningTarget(null);
        return;
      }

      let mine = miningRef.current;
      if (!mine || mine.x !== x || mine.y !== y || mine.z !== z) {
        mine = { x, y, z, progress: 0 };
        miningRef.current = mine;
      }

      mine.progress += delta / info.seconds;
      setMiningProgress(Math.min(1, mine.progress));
      setMiningTarget(BLOCK_REGISTRY[type]?.name ?? type);

      if (mine.progress >= 1) {
        game.renderer.triggerSwing();
        breakBlockAt(x, y, z, type);
        miningRef.current = null;
        setMiningProgress(0);
        setMiningTarget(null);
      }
    }, 33);

    return () => clearInterval(interval);
  }, [breakBlockAt, showToast]);

  // Stop mining when the mouse is released anywhere
  useEffect(() => {
    const stopMining = () => {
      leftDownRef.current = false;
      miningRef.current = null;
      setMiningProgress(0);
      setMiningTarget(null);
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 0) stopMining();
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', stopMining);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', stopMining);
    };
  }, []);

  const requestLock = useCallback((force = false) => {
    // `force` sert aux boutons de fermeture : l'état de la modale n'est pas
    // encore mis à jour au moment où le clic est traité.
    if (!force && modalOpenRef.current) return;
    const el = mountRef.current;
    if (!el) return;
    try {
      const result = el.requestPointerLock() as unknown as Promise<void> | undefined;
      // Chrome renvoie une promesse : une demande sans geste utilisateur est
      // rejetée, on l'ignore silencieusement.
      result?.catch?.(() => {});
    } catch {
      /* navigateur sans Pointer Lock */
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Souris : attaque / minage / pose / pipette
  // ---------------------------------------------------------------------------

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Une modale est ouverte : ses contrôles doivent recevoir les clics,
      // sans jamais reverrouiller la souris.
      if (modalOpenRef.current) return;

      // Clic sur un bouton du HUD ou du dock : on ne verrouille pas la souris.
      if ((e.target as HTMLElement).closest('[data-game-ui]')) return;

      if (!isLocked) {
        requestLock();
        return;
      }

      const game = gameRef.current;
      if (!game) return;

      if (e.button === 0) {
        // LEFT CLICK: minage (géré dans la boucle) + TNT
        leftDownRef.current = true;
        lastMineTime.current = performance.now();
        game.renderer.triggerSwing();
        const hit = game.renderer.currentHit;
        if (hit && hit.blockType === 'tnt') {
          const { x, y, z } = hit.blockPos;
          game.renderer.primeTNT(x, y, z);
          leftDownRef.current = false;
        }
      } else if (e.button === 2) {
        // RIGHT CLICK: craft sur un établi, sinon pose de bloc
        e.preventDefault();
        game.renderer.triggerSwing();
        const hit = game.renderer.currentHit;

        if (hit && hit.blockType === 'crafting_table') {
          setCraftingNearTable(true);
          setCraftingOpen(true);
          document.exitPointerLock?.();
          soundEngine.playUIClick();
          return;
        }

        const activeItem = hotbarRef.current[selectedSlotRef.current];
        const activeBlock = getBlockOfItem(activeItem);
        if (!activeBlock || !hit) return;

        if (gameModeRef.current === 'survival') {
          const count = inventoryRef.current[activeBlock] ?? 0;
          if (count <= 0) {
            showToast('Plus de blocs dans cet emplacement !');
            return;
          }
        }

        const { x, y, z } = hit.placePos;
        const p = game.physics.position;
        const r = game.physics.playerRadius;
        const h = game.physics.playerHeight;
        const isPlayerInside =
          x + 1 > p.x - r && x < p.x + r && y + 1 > p.y && y < p.y + h && z + 1 > p.z - r && z < p.z + r;
        if (isPlayerInside) return;

        const cfg = BLOCK_REGISTRY[activeBlock];
        soundEngine.playPlaceBlock(cfg?.soundType || 'wood');
        game.world.setBlock(x, y, z, activeBlock, true);

        if (gameModeRef.current === 'survival') {
          removeItem(activeBlock, 1);
          if ((inventoryRef.current[activeBlock] ?? 0) <= 0) {
            hotbarRef.current[selectedSlotRef.current] = null;
            setHotbar([...hotbarRef.current]);
            updateHand();
          }
        }
      } else if (e.button === 1) {
        // MIDDLE CLICK: pipette
        e.preventDefault();
        const hit = game.renderer.currentHit;
        if (!hit) return;
        const picked = hit.blockType;

        if (gameModeRef.current === 'survival' && (inventoryRef.current[picked] ?? 0) <= 0) {
          showToast('Vous ne possédez pas ce bloc.');
          return;
        }

        let idx = hotbarRef.current.indexOf(picked);
        if (idx === -1) {
          idx = selectedSlotRef.current;
          hotbarRef.current[idx] = picked;
          setHotbar([...hotbarRef.current]);
        }
        handleSelectSlot(idx);
        soundEngine.playUIClick();
      }
    },
    [isLocked, requestLock, handleSelectSlot, removeItem, showToast, updateHand]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // Le défilement dans une fenêtre (paramètres, index…) ne doit pas
      // changer l'emplacement sélectionné dans la barre d'accès.
      if (modalOpenRef.current) return;
      if (e.deltaY > 0) handleSelectSlot((selectedSlotRef.current + 1) % 9);
      else if (e.deltaY < 0) handleSelectSlot((selectedSlotRef.current + 8) % 9);
    },
    [handleSelectSlot]
  );

  // ---------------------------------------------------------------------------
  // Fabrication
  // ---------------------------------------------------------------------------

  const findNearbyTable = useCallback((): boolean => {
    const game = gameRef.current;
    if (!game) return false;
    const p = game.physics.position;
    const px = Math.floor(p.x);
    const py = Math.floor(p.y);
    const pz = Math.floor(p.z);
    for (let dx = -5; dx <= 5; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dz = -5; dz <= 5; dz++) {
          if (game.world.getBlock(px + dx, py + dy, pz + dz) === 'crafting_table') return true;
        }
      }
    }
    return false;
  }, []);

  const openCrafting = useCallback(
    (nearTable?: boolean) => {
      const near = nearTable ?? findNearbyTable();
      setCraftingNearTable(near);
      setCraftingOpen(true);
      document.exitPointerLock?.();
      soundEngine.playUIClick();
    },
    [findNearbyTable]
  );

  const handleCraft = useCallback(
    (recipe: Recipe): boolean => {
      if (gameModeRef.current === 'survival' && !canCraft(recipe, inventoryRef.current, craftingNearTable)) {
        return false;
      }
      if (gameModeRef.current === 'survival') {
        for (const ing of recipe.ingredients) {
          const next = (inventoryRef.current[ing.item] ?? 0) - ing.count;
          if (next > 0) inventoryRef.current[ing.item] = next;
          else delete inventoryRef.current[ing.item];
        }
      }
      setInventory({ ...inventoryRef.current });
      addItem(recipe.output, recipe.count);
      showToast(`🔨 ${ITEMS[recipe.output]?.name ?? recipe.output} fabriqué !`);
      return true;
    },
    [addItem, craftingNearTable, showToast]
  );

  // ---------------------------------------------------------------------------
  // Clavier
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isTextField =
        active?.tagName === 'TEXTAREA' ||
        (active?.tagName === 'INPUT' &&
          !['range', 'checkbox', 'radio', 'button', 'submit', 'file'].includes((active as HTMLInputElement).type));
      const key = e.key.toLowerCase();
      const code = e.code;
      const game = gameRef.current;

      // Une fenêtre est ouverte : on ne pilote ni le joueur ni la caméra.
      // Échap (ou la touche de la fenêtre) la referme, sauf pendant la saisie
      // dans un champ de recherche.
      if (modalOpenRef.current) {
        const toggleKey = key === 'e' || key === 'c' || key === 'i' || key === 'p' || key === 'o';
        if (key === 'escape' || (toggleKey && !isTextField)) {
          e.preventDefault();
          setInventoryOpen(false);
          setCraftingOpen(false);
          setIndexOpen(false);
          setSettingsOpen(false);
          setHelpOpen(false);
          soundEngine.playUIClick();
        }
        return;
      }

      if (isTextField) {
        return;
      }

      if (key >= '1' && key <= '9') {
        handleSelectSlot(parseInt(key, 10) - 1);
        return;
      }

      const forwardKey = keyboardLayout === 'azerty' ? 'z' : 'w';
      const leftKey = keyboardLayout === 'azerty' ? 'q' : 'a';

      if (key === forwardKey || code === 'KeyW' || code === 'ArrowUp') inputRef.current.forward = true;
      if (key === 's' || code === 'KeyS' || code === 'ArrowDown') inputRef.current.backward = true;
      if (key === leftKey || code === 'KeyA' || code === 'ArrowLeft') inputRef.current.left = true;
      if (key === 'd' || code === 'KeyD' || code === 'ArrowRight') inputRef.current.right = true;

      if (code === 'Space') {
        inputRef.current.jump = true;
        game?.physics.handleJumpTap();
      }

      if (e.shiftKey) {
        inputRef.current.sneak = true;
        if (game) game.physics.isSneaking = true;
      }

      if (key === 'f') {
        if (game) {
          game.physics.toggleFly();
          setIsFlying(game.physics.isFlying);
          soundEngine.playUIClick();
        }
      }

      if (key === 'e') {
        if (inventoryOpen) {
          setInventoryOpen(false);
          requestLock(true);
        } else {
          setInventoryOpen(true);
          document.exitPointerLock?.();
        }
        soundEngine.playUIClick();
      }

      if (key === 'c') {
        if (craftingOpen) {
          setCraftingOpen(false);
          requestLock(true);
        } else {
          openCrafting();
        }
      }

      if (key === 'i') {
        if (indexOpen) {
          setIndexOpen(false);
          requestLock(true);
        } else {
          setIndexOpen(true);
          document.exitPointerLock?.();
        }
        soundEngine.playUIClick();
      }

      if (key === 'h') setDockCollapsed((prev) => !prev);

      if (key === 'f3') {
        e.preventDefault();
        setF3Open((prev) => !prev);
        soundEngine.playUIClick();
      }

      if (key === 'p' || key === 'o') {
        setSettingsOpen(true);
        document.exitPointerLock?.();
        soundEngine.playUIClick();
      }

      if (e.ctrlKey && key === 'z') {
        e.preventDefault();
        game?.world.undo();
        soundEngine.playUIClick();
      }
      if ((e.ctrlKey && key === 'y') || (e.ctrlKey && e.shiftKey && key === 'z')) {
        e.preventDefault();
        game?.world.redo();
        soundEngine.playUIClick();
      }

      if (key === 'r') {
        const hit = game?.renderer.currentHit;
        if (hit) {
          const picked = hit.blockType;
          if (gameModeRef.current === 'survival' && (inventoryRef.current[picked] ?? 0) <= 0) {
            showToast('Vous ne possédez pas ce bloc.');
            return;
          }
          let idx = hotbarRef.current.indexOf(picked);
          if (idx === -1) {
            idx = selectedSlotRef.current;
            hotbarRef.current[idx] = picked;
            setHotbar([...hotbarRef.current]);
          }
          handleSelectSlot(idx);
          soundEngine.playUIClick();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code;
      const game = gameRef.current;
      const forwardKey = keyboardLayout === 'azerty' ? 'z' : 'w';
      const leftKey = keyboardLayout === 'azerty' ? 'q' : 'a';

      if (key === forwardKey || code === 'KeyW' || code === 'ArrowUp') inputRef.current.forward = false;
      if (key === 's' || code === 'KeyS' || code === 'ArrowDown') inputRef.current.backward = false;
      if (key === leftKey || code === 'KeyA' || code === 'ArrowLeft') inputRef.current.left = false;
      if (key === 'd' || code === 'KeyD' || code === 'ArrowRight') inputRef.current.right = false;
      if (code === 'Space') inputRef.current.jump = false;
      if (!e.shiftKey) {
        inputRef.current.sneak = false;
        if (game) game.physics.isSneaking = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    keyboardLayout,
    handleSelectSlot,
    inventoryOpen,
    indexOpen,
    craftingOpen,
    openCrafting,
    requestLock,
    showToast,
  ]);

  // ---------------------------------------------------------------------------
  // Actions UI
  // ---------------------------------------------------------------------------

  const respawnEntities = () => {
    const game = gameRef.current;
    if (game) game.renderer.mobs.reset(game.physics.position);
  };

  const handleAssignToSlot = (slotIdx: number, item: ItemId) => {
    if (gameModeRef.current === 'survival' && (inventoryRef.current[item] ?? 0) <= 0) {
      showToast('Cet objet n’est pas dans votre inventaire.');
      return;
    }
    hotbarRef.current[slotIdx] = item;
    setHotbar([...hotbarRef.current]);
    if (selectedSlotRef.current === slotIdx) updateHand();
  };

  const handleToggleGameMode = () => {
    setGameMode((prev) => {
      const next = prev === 'creative' ? 'survival' : 'creative';
      gameModeRef.current = next;
      if (gameRef.current) gameRef.current.physics.mode = next;
      healthRef.current = 20;
      setHealth(20);
      setTimeout(updateHand, 0);
      showToast(next === 'creative' ? '✨ Mode Créatif' : '💀 Mode Survie');
      return next;
    });
  };

  const handleSelectPreset = (p: WorldPreset) => {
    setWorldPreset(p);
    if (gameRef.current) {
      gameRef.current.world.generatePreset(p);
      gameRef.current.physics.findSpawnPosition();
      gameRef.current.renderer.rebuildAllMeshes();
      respawnEntities();
      setTotalBlocksCount(gameRef.current.world.getLoadedBlockCount());
    }
  };

  const handleChangeTime = (time: number) => {
    setTimeOfDay(time);
    if (gameRef.current) gameRef.current.renderer.timeOfDay = time;
  };

  const handleToggleDayCycle = () => {
    setDayCycleActive((prev) => {
      const next = !prev;
      if (gameRef.current) gameRef.current.renderer.dayCycleActive = next;
      return next;
    });
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  };

  const handleToggleMusic = () => {
    setMusicActive((prev) => {
      const next = !prev;
      if (next) soundEngine.startAmbientMusic();
      else soundEngine.stopAmbientMusic();
      return next;
    });
  };

  const handleExportWorld = () => {
    if (!gameRef.current) return;
    const json = gameRef.current.world.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voxelcraft_monde_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportWorld = (json: string) => {
    if (gameRef.current) {
      gameRef.current.world.importJSON(json);
      gameRef.current.physics.findSpawnPosition();
      gameRef.current.renderer.rebuildAllMeshes();
      respawnEntities();
      setTotalBlocksCount(gameRef.current.world.getLoadedBlockCount());
    }
  };

  const handleSaveWorld = () => {
    if (gameRef.current) {
      gameRef.current.world.saveToLocalStorage();
      showToast('Monde sauvegardé dans votre navigateur !');
    }
  };

  const handleLoadWorld = () => {
    if (gameRef.current) {
      const loaded = gameRef.current.world.loadFromLocalStorage();
      if (loaded) {
        showToast('Monde rechargé avec succès !');
        gameRef.current.physics.findSpawnPosition();
        gameRef.current.renderer.rebuildAllMeshes();
        respawnEntities();
        setTotalBlocksCount(gameRef.current.world.getLoadedBlockCount());
      } else {
        showToast('Aucune sauvegarde locale trouvée.');
      }
    }
  };

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-neutral-950 font-sans select-none"
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      <HUD
        hotbar={hotbar}
        selectedSlot={selectedSlot}
        onSelectSlot={handleSelectSlot}
        icons={icons}
        counts={inventory}
        isLocked={isLocked}
        onLockRequest={() => requestLock()}
        activeItemName={activeItemToast}
        f3Open={f3Open}
        playerPos={playerPos}
        playerYaw={playerAngles.yaw}
        playerPitch={playerAngles.pitch}
        isFlying={isFlying}
        gameMode={gameMode}
        health={health}
        hunger={hunger}
        targetBlock={targetBlockName}
        totalBlocks={totalBlocksCount}
        currentBiome={currentBiomeName}
        entities={entitySummary}
        miningProgress={miningProgress}
        miningTarget={miningTarget}
        damageFlash={damageFlash}
        onOpenSettings={() => {
          setSettingsOpen(true);
          document.exitPointerLock?.();
        }}
        onOpenInventory={() => {
          setInventoryOpen(true);
          document.exitPointerLock?.();
        }}
        onOpenHelp={() => {
          setHelpOpen(true);
          document.exitPointerLock?.();
        }}
        onOpenCrafting={() => openCrafting()}
        onOpenIndex={() => {
          setIndexOpen(true);
          document.exitPointerLock?.();
        }}
      />

      <ControlDock
        collapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((prev) => !prev)}
        onOpenInventory={() => {
          setInventoryOpen(true);
          document.exitPointerLock?.();
        }}
        onOpenSettings={() => {
          setSettingsOpen(true);
          document.exitPointerLock?.();
        }}
        onOpenHelp={() => {
          setHelpOpen(true);
          document.exitPointerLock?.();
        }}
        onOpenCrafting={() => openCrafting()}
        onOpenIndex={() => {
          setIndexOpen(true);
          document.exitPointerLock?.();
        }}
        onUndo={() => gameRef.current?.world.undo()}
        onRedo={() => gameRef.current?.world.redo()}
        canUndo={canUndo}
        canRedo={canRedo}
        isFlying={isFlying}
        onToggleFly={() => {
          if (gameRef.current) {
            gameRef.current.physics.toggleFly();
            setIsFlying(gameRef.current.physics.isFlying);
          }
        }}
        gameMode={gameMode}
        onToggleGameMode={handleToggleGameMode}
        f3Open={f3Open}
        onToggleF3={() => setF3Open((prev) => !prev)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      <InventoryModal
        isOpen={inventoryOpen}
        onClose={() => {
          setInventoryOpen(false);
          requestLock(true);
        }}
        icons={icons}
        hotbar={hotbar}
        selectedSlot={selectedSlot}
        inventory={inventory}
        gameMode={gameMode}
        onAssignToSlot={handleAssignToSlot}
      />

      <CraftingModal
        isOpen={craftingOpen}
        onClose={() => {
          setCraftingOpen(false);
          requestLock(true);
        }}
        inventory={inventory}
        icons={icons}
        nearTable={craftingNearTable}
        creative={gameMode === 'creative'}
        onCraft={handleCraft}
      />

      <BlockIndexModal
        isOpen={indexOpen}
        onClose={() => {
          setIndexOpen(false);
          requestLock(true);
        }}
        icons={icons}
        inventory={inventory}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          requestLock(true);
        }}
        preset={worldPreset}
        onSelectPreset={handleSelectPreset}
        timeOfDay={timeOfDay}
        onChangeTime={handleChangeTime}
        dayCycleActive={dayCycleActive}
        onToggleDayCycle={handleToggleDayCycle}
        onExportWorld={handleExportWorld}
        onImportWorld={handleImportWorld}
        onSaveWorld={handleSaveWorld}
        onLoadWorld={handleLoadWorld}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        musicActive={musicActive}
        onToggleMusic={handleToggleMusic}
      />

      <HelpModal
        isOpen={helpOpen}
        onClose={() => {
          setHelpOpen(false);
          requestLock(true);
        }}
        keyboardLayout={keyboardLayout}
        onToggleKeyboardLayout={() => setKeyboardLayout((prev) => (prev === 'azerty' ? 'qwerty' : 'azerty'))}
      />
    </div>
  );
}
