import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import MapWorld from '../map/MapWorld';
import { getActiveMap, HUB_MAP_ID, enterHubMap } from '../map/activeMap';
import { HUB_NPCS } from './npcData';
import NpcMesh from './NpcMesh';
import HubPlayer from './HubPlayer';
import RemotePlayers from '../player/RemotePlayers';
import HubCoopSync from '../net/HubCoopSync';
import { useCoop } from '../net/CoopContext';

function CameraLayerFix() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.layers.set(0);
  }, [camera]);
  return null;
}

/** Bright animated deploy zone — hard to miss from across the yard. */
function DeployPadMarker() {
  const map = getActiveMap();
  const pad = map.DEPLOY_PAD;
  const pulse = useRef();
  const pulse2 = useRef();
  const beam = useRef();
  const chevron = useRef();

  useFrame(({ clock }) => {
    if (!pad) return;
    const t = clock.elapsedTime;
    const breath = 0.55 + Math.sin(t * 2.4) * 0.35;
    if (pulse.current) {
      const s = 1 + Math.sin(t * 2.2) * 0.08;
      pulse.current.scale.set(s, s, s);
      pulse.current.material.opacity = 0.35 + breath * 0.45;
    }
    if (pulse2.current) {
      const s2 = 1.05 + Math.sin(t * 2.2 + 1.1) * 0.12;
      pulse2.current.scale.set(s2, s2, s2);
      pulse2.current.material.opacity = 0.2 + (1 - breath) * 0.35;
    }
    if (beam.current) {
      beam.current.material.opacity = 0.12 + breath * 0.18;
    }
    if (chevron.current) {
      chevron.current.position.y = 0.08 + Math.sin(t * 3) * 0.05;
      chevron.current.rotation.y = t * 0.6;
    }
  });

  if (!pad) return null;

  const r = pad.r || 2.15;

  return (
    <group position={[pad.x, 0.02, pad.z]}>
      {/* Lit concrete deck */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 1.05, 32]} />
        <meshStandardMaterial
          color="#2a2410"
          emissive="#c9a227"
          emissiveIntensity={0.35}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.72, r * 1.02, 40]} />
        <meshBasicMaterial color="#f0c040" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <mesh ref={pulse} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.42, r * 0.68, 36]} />
        <meshBasicMaterial color="#ffe080" transparent opacity={0.7} depthWrite={false} />
      </mesh>
      <mesh ref={pulse2} position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.2, r * 0.38, 28]} />
        <meshBasicMaterial color="#fff4c0" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {/* Center disc */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.22, 20]} />
        <meshBasicMaterial color="#ffd060" transparent opacity={0.9} depthWrite={false} />
      </mesh>

      {/* Corner beacon posts */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const x = Math.cos(a) * r * 0.88;
        const z = Math.sin(a) * r * 0.88;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.55, 0]}>
              <boxGeometry args={[0.1, 1.1, 0.1]} />
              <meshStandardMaterial
                color="#1a1810"
                emissive="#e8b020"
                emissiveIntensity={0.55}
                roughness={0.6}
              />
            </mesh>
            <mesh position={[0, 1.15, 0]}>
              <boxGeometry args={[0.18, 0.12, 0.18]} />
              <meshBasicMaterial color="#ffe060" />
            </mesh>
          </group>
        );
      })}

      {/* Soft vertical volume light */}
      <mesh ref={beam} position={[0, 1.6, 0]}>
        <cylinderGeometry args={[r * 0.15, r * 0.55, 3.2, 16, 1, true]} />
        <meshBasicMaterial
          color="#ffcc44"
          transparent
          opacity={0.2}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Spinning chevron marker */}
      <group ref={chevron} position={[0, 0.1, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.55, 3]} />
          <meshBasicMaterial color="#fff0a0" transparent opacity={0.95} depthWrite={false} />
        </mesh>
      </group>

      <pointLight
        position={[0, 2.2, 0]}
        intensity={1.35}
        distance={14}
        color="#ffc040"
        decay={2}
      />

      <Html
        position={[0, 2.55, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div className="hub-deploy-world-label">
          <span className="hub-deploy-world-label__tag">DEPLOY</span>
          <span className="hub-deploy-world-label__sub">Hold F · Drop in</span>
        </div>
      </Html>
    </group>
  );
}

/** Cheap outdoor fill — no HDR Environment / ContactShadows (were melting FPS). */
function HubLightRig() {
  return (
    <>
      <color attach="background" args={['#161b24']} />
      <fog attach="fog" args={['#1c2230', 22, 55]} />
      <ambientLight intensity={0.55} color="#c4b49a" />
      <hemisphereLight args={['#8a9ab0', '#3a2a1c', 0.55]} />
      <directionalLight position={[6, 14, 4]} intensity={0.55} color="#d0d8e4" />
      <directionalLight position={[-5, 5, -6]} intensity={0.18} color="#7a6848" />
    </>
  );
}

function HubScene({ onInteract, promptRef, controlsEnabled }) {
  const { phase } = useCoop();
  // Sync as soon as we're connecting/lobby so joiners appear in the yard
  const squadLive = phase === 'lobby' || phase === 'connecting';

  // Never render combat Pie Yard inside hub canvas
  if (getActiveMap()?.id !== HUB_MAP_ID) enterHubMap();

  return (
    <>
      <CameraLayerFix />
      <HubLightRig />
      <MapWorld key={HUB_MAP_ID} />
      <DeployPadMarker />
      {HUB_NPCS.map((npc) => (
        <NpcMesh key={npc.id} npc={npc} />
      ))}
      {squadLive && <HubCoopSync />}
      {squadLive && <RemotePlayers hideGun />}
      <HubPlayer
        enabled={controlsEnabled}
        onInteract={onInteract}
        promptRef={promptRef}
      />
    </>
  );
}

export default function HubCanvas({ onInteract, promptRef, controlsEnabled }) {
  const dpr = useMemo(() => Math.min(window.devicePixelRatio || 1, 1), []);

  const onCreated = useCallback(({ gl }) => {
    gl.setClearColor('#161b24');
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, []);

  return (
    <Canvas
      className="hub-canvas"
      shadows={false}
      dpr={dpr}
      frameloop="always"
      camera={{ fov: 72, near: 0.15, far: 110, position: [0, 1.6, -14] }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        stencil: false,
        alpha: false,
        depth: true,
      }}
      onCreated={onCreated}
      style={{ position: 'absolute', inset: 0 }}
    >
      <HubScene
        onInteract={onInteract}
        promptRef={promptRef}
        controlsEnabled={controlsEnabled}
      />
    </Canvas>
  );
}
