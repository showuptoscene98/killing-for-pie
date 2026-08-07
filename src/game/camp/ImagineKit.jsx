import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Toon from '../style/Toon';

/** Angel wing — flat feathered plate */
function Wing({ side = 1 }) {
  const s = side;
  const feather = '#f4f0ff';
  const tip = '#d8d0f0';
  const bone = '#c8c0e0';
  return (
    <group
      position={[0.28 * s, 1.25, -0.08]}
      rotation={[0.15, -0.55 * s, 0.35 * s]}
    >
      {/* Main sail */}
      <mesh position={[0.35 * s, 0.1, 0]} castShadow>
        <boxGeometry args={[0.75, 0.55, 0.04]} />
        <Toon color={feather} emissive={feather} emissiveIntensity={0.35} />
      </mesh>
      {/* Upper feather */}
      <mesh position={[0.55 * s, 0.32, -0.02]} rotation={[0, 0, -0.25 * s]}>
        <boxGeometry args={[0.55, 0.28, 0.035]} />
        <Toon color={tip} emissive={tip} emissiveIntensity={0.3} />
      </mesh>
      {/* Lower feather */}
      <mesh position={[0.5 * s, -0.12, 0.02]} rotation={[0, 0, 0.2 * s]}>
        <boxGeometry args={[0.5, 0.22, 0.03]} />
        <Toon color={tip} emissive={tip} emissiveIntensity={0.25} />
      </mesh>
      {/* Tip feathers */}
      <mesh position={[0.78 * s, 0.08, 0]} rotation={[0, 0, -0.4 * s]}>
        <boxGeometry args={[0.28, 0.35, 0.025]} />
        <Toon color={bone} emissive={bone} emissiveIntensity={0.2} />
      </mesh>
      {/* Shoulder joint */}
      <mesh position={[0.05 * s, 0, 0]}>
        <boxGeometry args={[0.12, 0.14, 0.1]} />
        <Toon color="#e8e4f4" />
      </mesh>
    </group>
  );
}

/**
 * Imagine — soft bob + slow wing drift while floating.
 * Parent should already be at npc.position; this adds hover offset.
 */
export default function ImagineFloat({ children, amplitude = 0.22, speed = 1.1 }) {
  const root = useRef();
  const wings = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (root.current) {
      root.current.position.y = 0.55 + Math.sin(t * speed) * amplitude;
      root.current.rotation.y = Math.sin(t * 0.35) * 0.08;
    }
    if (wings.current) {
      const flap = Math.sin(t * 2.2) * 0.12;
      // children: left (side -1), right (side +1)
      if (wings.current.children[0]) wings.current.children[0].rotation.z = -0.35 - flap;
      if (wings.current.children[1]) wings.current.children[1].rotation.z = 0.35 + flap;
    }
  });

  return (
    <group ref={root}>
      <group ref={wings}>
        <Wing side={-1} />
        <Wing side={1} />
      </group>
      {children}
      {/* Soft halo */}
      <mesh position={[0, 1.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.025, 8, 20]} />
        <Toon color="#fff8e0" emissive="#ffe8a0" emissiveIntensity={0.85} />
      </mesh>
      <pointLight
        position={[0, 1.8, 0.2]}
        intensity={1.4}
        distance={5}
        color="#e8d8ff"
        decay={1.2}
      />
    </group>
  );
}
