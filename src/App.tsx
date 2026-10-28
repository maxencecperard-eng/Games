/**
 * VoxelCraft 3D - Jeu de construction de blocs style Minecraft
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VoxelWorld } from './game/world';
import { PlayerPhysics, PlayerInput } from './game/physics';
import { GameRenderer } from './game/renderer';
import { soundEngine } from './game/audio';
import { BlockType, WorldPreset, BLOCK_REGISTRY, BIOMES } from './game/types';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { ControlDock } from './components/ControlDock';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';

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
  const [hotbar, setHotbar] = useState<BlockType[]>([
    'grass',
    'stone',
    'snow',
    'sandstone',
    'wood',
    'leaves',
    'planks',
    'glass',
    'tnt',
  ]);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [activeItemToast, setActiveItemToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [icons, setIcons] = useState<Record<BlockType, string>>({} as Record<BlockType, string>);
  const [keyboardLayout, setKeyboardLayout] = useState<'azerty' | 'qwerty'>('azerty');
  const [gameMode, setGameMode] = useState<'creative' | 'survival'>('creative');
  const [isFlying, setIsFlying] = useState(false);
  const [f3Open, setF3Open] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Modals
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // World & Environment settings
  const [worldPreset, setWorldPreset] = useState<WorldPreset>('hills');
  const [timeOfDay, setTimeOfDay] = useState(0.45);
  const [dayCycleActive, setDayCycleActive] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [musicActive, setMusicActive] = useState(false);

  // Coordinates & stats for F3 and Biome
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 26, z: 0 });
  const [playerAngles, setPlayerAngles] = useState({ yaw: 0, pitch: 0 });
  const [currentBiomeName, setCurrentBiomeName] = useState('🌾 Plaines Verdoyantes');
  const [targetBlockName, setTargetBlockName] = useState<string | null>(null);
  const [totalBlocksCount, setTotalBlocksCount] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Show toast when switching block
  const showToast = useCallback((name: string) => {
    setActiveItemToast(name);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setActiveItemToast(null);
    }, 1400);
  }, []);

  // Update selected slot
  const handleSelectSlot = useCallback(
    (slotIdx: number) => {
      const idx = Math.max(0, Math.min(8, slotIdx));
      setSelectedSlot(idx);
      const block = hotbar[idx];
      const cfg = BLOCK_REGISTRY[block];
      if (cfg) showToast(cfg.name);
      if (gameRef.current) {
        gameRef.current.renderer.setHandBlock(block);
      }
    },
    [hotbar, showToast]
  );

  // Initialize Game on Mount
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Instantiate World, Physics, Renderer
    const world = new VoxelWorld();
    const physics = new PlayerPhysics(world);
    const renderer = new GameRenderer(container, world, physics);

    gameRef.current = { world, physics, renderer };

    // Set initial block in hand
    renderer.setHandBlock(hotbar[selectedSlot]);
    setIcons(renderer.textureManager.getAllIconUrls());
    setTotalBlocksCount(world.getAllBlocks().size);

    // 2. Physics & State Loop (runs alongside renderer)
    let lastPhysicsTime = performance.now();
    let physicsIntervalId: number;

    const runPhysicsTick = () => {
      const now = performance.now();
      const delta = (now - lastPhysicsTime) / 1000;
      lastPhysicsTime = now;

      physics.update(delta, inputRef.current);

      // Sync state to React for HUD
      setPlayerPos({
        x: physics.position.x,
        y: physics.position.y,
        z: physics.position.z,
      });
      setPlayerAngles({
        yaw: physics.yaw,
        pitch: physics.pitch,
      });
      setIsFlying(physics.isFlying);

      // Update current biome
      const bId = world.getBiomeAt(Math.floor(physics.position.x), Math.floor(physics.position.z));
      const bInfo = BIOMES[bId];
      if (bInfo) {
        setCurrentBiomeName(`${bInfo.icon} ${bInfo.name}`);
      }

      if (renderer.currentHit) {
        const cfg = BLOCK_REGISTRY[renderer.currentHit.blockType];
        setTargetBlockName(cfg ? cfg.name : renderer.currentHit.blockType);
      } else {
        setTargetBlockName(null);
      }

      setCanUndo(world.canUndo());
      setCanRedo(world.canRedo());
      setTotalBlocksCount(world.getAllBlocks().size);
    };

    physicsIntervalId = window.setInterval(runPhysicsTick, 16); // 60 ticks/s

    // 3. Pointer Lock change listener
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === container;
      setIsLocked(locked);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // 4. Mouse Move for Camera Rotation
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== container) return;

      const sensitivity = 0.0022;
      physics.yaw -= e.movementX * sensitivity;
      physics.pitch -= e.movementY * sensitivity;

      // Clamp vertical pitch to ~89 degrees
      const maxPitch = (Math.PI / 2) * 0.98;
      physics.pitch = Math.max(-maxPitch, Math.min(maxPitch, physics.pitch));
    };
    window.addEventListener('mousemove', onMouseMove);

    // 5. Cleanup
    return () => {
      clearInterval(physicsIntervalId);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      gameRef.current = null;
    };
  }, []);

  // Request pointer lock
  const requestLock = useCallback(() => {
    if (mountRef.current) {
      mountRef.current.requestPointerLock();
    }
  }, []);

  // Mouse clicks for mining and placing blocks
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isLocked) {
        requestLock();
        return;
      }

      const game = gameRef.current;
      if (!game) return;

      const hit = game.renderer.currentHit;

      if (e.button === 0) {
        // LEFT CLICK: Mine / Break or ignite TNT
        game.renderer.triggerSwing();

        if (hit) {
          const { x, y, z } = hit.blockPos;
          const targetType = hit.blockType;

          if (targetType === 'tnt') {
            // Prime TNT!
            game.renderer.primeTNT(x, y, z);
          } else {
            const cfg = BLOCK_REGISTRY[targetType];
            soundEngine.playBreakBlock(cfg?.soundType || 'dirt');
            game.renderer.particles.emitBreak(x, y, z, targetType);
            game.world.setBlock(x, y, z, 'air', true);
          }
        }
      } else if (e.button === 2) {
        // RIGHT CLICK: Place selected block
        e.preventDefault();
        game.renderer.triggerSwing();

        if (hit) {
          const activeBlock = hotbar[selectedSlot];
          if (activeBlock === 'air') return;

          const { x, y, z } = hit.placePos;

          // Prevent placing block inside player's AABB
          const p = game.physics.position;
          const r = game.physics.playerRadius;
          const h = game.physics.playerHeight;
          const isPlayerInside =
            x + 1 > p.x - r &&
            x < p.x + r &&
            y + 1 > p.y &&
            y < p.y + h &&
            z + 1 > p.z - r &&
            z < p.z + r;

          if (!isPlayerInside) {
            const cfg = BLOCK_REGISTRY[activeBlock];
            soundEngine.playPlaceBlock(cfg?.soundType || 'wood');
            game.world.setBlock(x, y, z, activeBlock, true);
          }
        }
      } else if (e.button === 1) {
        // MIDDLE CLICK: Pick block (pipette)
        e.preventDefault();
        if (hit) {
          const picked = hit.blockType;
          // Check if already in hotbar
          const idx = hotbar.indexOf(picked);
          if (idx !== -1) {
            handleSelectSlot(idx);
          } else {
            // Replace current slot with picked block
            const updated = [...hotbar];
            updated[selectedSlot] = picked;
            setHotbar(updated);
            handleSelectSlot(selectedSlot);
          }
          soundEngine.playUIClick();
        }
      }
    },
    [isLocked, requestLock, hotbar, selectedSlot, handleSelectSlot]
  );

  // Wheel scroll for hotbar selection
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.deltaY > 0) {
        handleSelectSlot((selectedSlot + 1) % 9);
      } else if (e.deltaY < 0) {
        handleSelectSlot((selectedSlot + 8) % 9);
      }
    },
    [selectedSlot, handleSelectSlot]
  );

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Do not capture if user is typing in a search/modal input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;
      const game = gameRef.current;

      // 1. Hotbar 1-9
      if (key >= '1' && key <= '9') {
        handleSelectSlot(parseInt(key, 10) - 1);
        return;
      }

      // 2. Movement keys (AZERTY vs QWERTY mapping)
      const forwardKey = keyboardLayout === 'azerty' ? 'z' : 'w';
      const leftKey = keyboardLayout === 'azerty' ? 'q' : 'a';

      if (key === forwardKey || code === 'KeyW' || code === 'ArrowUp') {
        inputRef.current.forward = true;
      }
      if (key === 's' || code === 'KeyS' || code === 'ArrowDown') {
        inputRef.current.backward = true;
      }
      if (key === leftKey || code === 'KeyA' || code === 'ArrowLeft') {
        inputRef.current.left = true;
      }
      if (key === 'd' || code === 'KeyD' || code === 'ArrowRight') {
        inputRef.current.right = true;
      }

      // 3. Jump (Space)
      if (code === 'Space') {
        inputRef.current.jump = true;
        game?.physics.handleJumpTap();
      }

      // 4. Sneak (Shift)
      if (e.shiftKey) {
        inputRef.current.sneak = true;
        if (game) game.physics.isSneaking = true;
      }

      // 5. Fly toggle [F]
      if (key === 'f') {
        if (game) {
          game.physics.toggleFly();
          setIsFlying(game.physics.isFlying);
          soundEngine.playUIClick();
        }
      }

      // 6. Inventory [E]
      if (key === 'e') {
        if (inventoryOpen) {
          setInventoryOpen(false);
          requestLock();
        } else {
          setInventoryOpen(true);
          document.exitPointerLock?.();
        }
        soundEngine.playUIClick();
      }

      // 7. Hide/Show Dock [H]
      if (key === 'h') {
        setDockCollapsed((prev) => !prev);
      }

      // 8. F3 Debug Screen
      if (key === 'f3') {
        e.preventDefault();
        setF3Open((prev) => !prev);
        soundEngine.playUIClick();
      }

      // Settings [P] or [O]
      if (key === 'p' || key === 'o') {
        setSettingsOpen(true);
        document.exitPointerLock?.();
        soundEngine.playUIClick();
      }

      // 9. Undo / Redo (Ctrl+Z / Ctrl+Y)
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

      // 10. Pipette [R]
      if (key === 'r') {
        const hit = game?.renderer.currentHit;
        if (hit) {
          const picked = hit.blockType;
          const idx = hotbar.indexOf(picked);
          if (idx !== -1) {
            handleSelectSlot(idx);
          } else {
            const updated = [...hotbar];
            updated[selectedSlot] = picked;
            setHotbar(updated);
            handleSelectSlot(selectedSlot);
          }
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

      if (key === forwardKey || code === 'KeyW' || code === 'ArrowUp') {
        inputRef.current.forward = false;
      }
      if (key === 's' || code === 'KeyS' || code === 'ArrowDown') {
        inputRef.current.backward = false;
      }
      if (key === leftKey || code === 'KeyA' || code === 'ArrowLeft') {
        inputRef.current.left = false;
      }
      if (key === 'd' || code === 'KeyD' || code === 'ArrowRight') {
        inputRef.current.right = false;
      }
      if (code === 'Space') {
        inputRef.current.jump = false;
      }
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
    requestLock,
    hotbar,
    selectedSlot,
  ]);

  // Handlers for UI actions
  const handleAssignToSlot = (slotIdx: number, block: BlockType) => {
    const updated = [...hotbar];
    updated[slotIdx] = block;
    setHotbar(updated);
    if (selectedSlot === slotIdx && gameRef.current) {
      gameRef.current.renderer.setHandBlock(block);
    }
  };

  const handleSelectPreset = (p: WorldPreset) => {
    setWorldPreset(p);
    if (gameRef.current) {
      gameRef.current.world.generatePreset(p);
      gameRef.current.physics.findSpawnPosition();
      setTotalBlocksCount(gameRef.current.world.getAllBlocks().size);
    }
  };

  const handleChangeTime = (time: number) => {
    setTimeOfDay(time);
    if (gameRef.current) {
      gameRef.current.renderer.timeOfDay = time;
    }
  };

  const handleToggleDayCycle = () => {
    setDayCycleActive((prev) => {
      const next = !prev;
      if (gameRef.current) {
        gameRef.current.renderer.dayCycleActive = next;
      }
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
      if (next) {
        soundEngine.startAmbientMusic();
      } else {
        soundEngine.stopAmbientMusic();
      }
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
      setTotalBlocksCount(gameRef.current.world.getAllBlocks().size);
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
        setTotalBlocksCount(gameRef.current.world.getAllBlocks().size);
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
      {/* Dedicated WebGL Canvas mount container */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* Minecraft HUD Overlay */}
      <HUD
        hotbar={hotbar}
        selectedSlot={selectedSlot}
        onSelectSlot={handleSelectSlot}
        icons={icons}
        isLocked={isLocked}
        onLockRequest={requestLock}
        activeItemName={activeItemToast}
        f3Open={f3Open}
        playerPos={playerPos}
        playerYaw={playerAngles.yaw}
        playerPitch={playerAngles.pitch}
        isFlying={isFlying}
        gameMode={gameMode}
        health={20}
        hunger={20}
        targetBlock={targetBlockName}
        totalBlocks={totalBlocksCount}
        currentBiome={currentBiomeName}
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
      />

      {/* Collapsible Bottom Control Dock (Consolidated, Zero Viewport Occlusion) */}
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
        onToggleGameMode={() => {
          setGameMode((prev) => {
            const next = prev === 'creative' ? 'survival' : 'creative';
            if (gameRef.current) gameRef.current.physics.mode = next;
            return next;
          });
        }}
        f3Open={f3Open}
        onToggleF3={() => setF3Open((prev) => !prev)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Creative Inventory Modal (Press 'E') */}
      <InventoryModal
        isOpen={inventoryOpen}
        onClose={() => {
          setInventoryOpen(false);
          requestLock();
        }}
        icons={icons}
        hotbar={hotbar}
        selectedSlot={selectedSlot}
        onAssignToSlot={handleAssignToSlot}
      />

      {/* Settings & World Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          requestLock();
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

      {/* Help & Keybindings Modal */}
      <HelpModal
        isOpen={helpOpen}
        onClose={() => {
          setHelpOpen(false);
          requestLock();
        }}
        keyboardLayout={keyboardLayout}
        onToggleKeyboardLayout={() =>
          setKeyboardLayout((prev) => (prev === 'azerty' ? 'qwerty' : 'azerty'))
        }
      />
    </div>
  );
}
