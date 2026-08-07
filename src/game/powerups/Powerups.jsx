import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../GameContext';
import {
  tickPowerups,
  POWERUP_META,
  createPowerupState,
} from '../systems/PowerupSystem';
import Toon from '../style/Toon';

const MAX_SLOTS = 8;

function DropMesh({ stateRef, index }) {
  const root = useRef();
  const bodyMat = useRef();
  const glowMat = useRef();

  useFrame(() => {
    const d = stateRef.current.powerups?.drops?.[index];
    if (!root.current) return;
    if (!d) {
      root.current.visible = false;
      return;
    }
    root.current.visible = true;
    root.current.position.set(d.x, d.y, d.z);
    root.current.rotation.y += 0.03;
    const meta = POWERUP_META[d.type] || POWERUP_META.doublepoints;
    if (bodyMat.current && bodyMat.current.userData.type !== d.type) {
      bodyMat.current.userData.type = d.type;
      bodyMat.current.color.set(meta.color);
      bodyMat.current.emissive.set(meta.emissive);
      if (glowMat.current) {
        glowMat.current.color.set(meta.emissive);
        glowMat.current.emissive.set(meta.emissive);
      }
    }
  });

  return (
    <group ref={root} visible={false}>
      <mesh castShadow>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <Toon
          ref={bodyMat}
          color="#e8c84a"
          emissive="#886600"
          emissiveIntensity={0.55}
        />
      </mesh>
      <mesh position={[0, 0, 0.24]}>
        <planeGeometry args={[0.28, 0.28]} />
        <meshStandardMaterial
          ref={glowMat}
          color="#ffee66"
          emissive="#ffee66"
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[0.12, 0.12, 0.12]} />
        <Toon color="#f5f0e0" emissive="#ffffff" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

/** Floating CoD-style powerup drops + timer/pickup tick */
export default function Powerups() {
  const { stateRef, zombiesRef } = useGame();

  useFrame((_, dt) => {
    const state = stateRef.current;
    if (state.status !== 'playing') return;
    if (!state.powerups) state.powerups = createPowerupState();

    const isClient = !!state.coop && !state.isHost;
    if (!isClient) {
      tickPowerups(
        state,
        zombiesRef.current,
        dt,
        state.position.x,
        state.position.z
      );
    }
  });

  return (
    <group>
      {Array.from({ length: MAX_SLOTS }, (_, i) => (
        <DropMesh key={i} stateRef={stateRef} index={i} />
      ))}
    </group>
  );
}
