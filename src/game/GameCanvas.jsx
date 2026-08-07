import {
  Suspense,
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGameApi } from './GameContext';
import MapWorld from './map/MapWorld';
import Player from './player/Player';
import RemotePlayers from './player/RemotePlayers';
import ZombieManager from './zombies/ZombieManager';
import { fireHitscan } from './weapons/WeaponSystem';
import WeaponViewmodel from './weapons/WeaponViewmodel';
import PieProjectiles from './weapons/PieProjectiles';
import Powerups from './powerups/Powerups';
import CoopSync from './net/CoopSync';
import { DD } from './style/theme';
import { getActiveMap } from './map/activeMap';

/** Camera stays on world layer 0 — FP gun uses a separate overlay scene */
function CameraLayerFix() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.layers.set(0);
  }, [camera]);
  return null;
}

function Scene({ coop }) {
  const { stateRef, zombiesRef } = useGameApi();
  const mapKeyRef = useRef('');
  const [mapKey, setMapKey] = useState(() => {
    const s = stateRef.current;
    return `${s.mapId || getActiveMap().id}:${s.mapRevision || 0}`;
  });
  const [outdoor, setOutdoor] = useState(() => !!getActiveMap().outdoor);

  // Remount map on transit without subscribing the whole scene to HUD ticks.
  useFrame(() => {
    const s = stateRef.current;
    const next = `${s.mapId || getActiveMap().id}:${s.mapRevision || 0}`;
    if (next === mapKeyRef.current) return;
    mapKeyRef.current = next;
    setMapKey(next);
    setOutdoor(!!getActiveMap().outdoor);
  });

  const onShoot = useCallback(
    (camera, weaponDef) => {
      fireHitscan(camera, weaponDef, zombiesRef.current, stateRef.current);
    },
    [stateRef, zombiesRef]
  );

  return (
    <>
      <CameraLayerFix />
      <color attach="background" args={[outdoor ? '#1a1e28' : DD.void]} />
      <fog
        attach="fog"
        args={[outdoor ? '#2a303c' : DD.fog, outdoor ? 36 : 22, outdoor ? 85 : 55]}
      />
      <ambientLight intensity={outdoor ? 0.85 : 1.05} color="#d4c4a0" />
      <hemisphereLight
        args={[
          outdoor ? '#8a9ab8' : '#e8d8b8',
          outdoor ? '#4a3a28' : '#4a3a28',
          outdoor ? 0.9 : 0.85,
        ]}
      />
      <directionalLight
        position={[8, 18, 6]}
        intensity={outdoor ? 1.05 : 1.25}
        color={outdoor ? '#d0d8e8' : '#ffe8c8'}
      />
      <pointLight
        position={[0, 2.6, -8]}
        intensity={outdoor ? 2.4 : 3.5}
        distance={18}
        color={DD.candle}
        decay={1.2}
      />
      <MapWorld key={mapKey} />
      <ZombieManager />
      <PieProjectiles />
      <Powerups />
      {coop && <CoopSync />}
      {coop && <RemotePlayers />}
      <Player onShoot={onShoot} />
      <WeaponViewmodel />
    </>
  );
}

function GameCanvas({ coop = false }) {
  return (
    <Canvas
      className="game-canvas"
      shadows={false}
      frameloop="always"
      camera={{ fov: 75, near: 0.08, far: 90, position: [0, 1.6, -10] }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        toneMappingExposure: 1.45,
        stencil: false,
        depth: true,
        alpha: false,
      }}
      dpr={1}
      performance={{ min: 0.5 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Suspense fallback={null}>
        <Scene coop={coop} />
      </Suspense>
    </Canvas>
  );
}

// PlayingShell re-renders on HUD ticks — don't reconcile the whole R3F tree.
export default memo(GameCanvas);
