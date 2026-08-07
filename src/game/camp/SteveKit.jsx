import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { DD } from '../style/theme';
import Toon from '../style/Toon';
import { headAnchor, getBodyStyle } from '../style/BodyParts';

/** Steve — fishnets + rice farmer hat + Apple the dog */

function RiceFarmerHat({ position = [0, 1.88, 0] }) {
  const straw = '#c8b060';
  const strawDark = '#a89040';
  const strap = '#5a4030';

  return (
    <group position={position}>
      {/* Conical crown (nón lá) */}
      <mesh castShadow>
        <coneGeometry args={[0.4, 0.34, 14]} />
        <Toon color={straw} />
      </mesh>
      {/* Weave rings */}
      {[0.04, -0.04, -0.12].map((y, i) => {
        const r = 0.12 + (0.04 - y) * 0.85;
        return (
          <mesh key={i} position={[0, y, 0]}>
            <cylinderGeometry args={[r, r + 0.01, 0.012, 16, 1, true]} />
            <meshStandardMaterial color={strawDark} roughness={0.95} side={2} />
          </mesh>
        );
      })}
      {/* Brim lip */}
      <mesh position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.42, 20]} />
        <Toon color={strawDark} />
      </mesh>
      {/* Chin strap */}
      <mesh position={[-0.16, -0.28, 0.06]} rotation={[0.35, 0, 0.55]}>
        <cylinderGeometry args={[0.008, 0.008, 0.28, 5]} />
        <meshStandardMaterial color={strap} roughness={0.8} />
      </mesh>
      <mesh position={[0.16, -0.28, 0.06]} rotation={[0.35, 0, -0.55]}>
        <cylinderGeometry args={[0.008, 0.008, 0.28, 5]} />
        <meshStandardMaterial color={strap} roughness={0.8} />
      </mesh>
    </group>
  );
}

function FishnetSleeve({ position, rotation = [0, 0, 0], args }) {
  const net = '#0a0a0c';
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={args} />
        <meshStandardMaterial
          color="#c49a6c"
          transparent
          opacity={0.85}
          roughness={0.7}
        />
      </mesh>
      {/* Horizontal straps */}
      {[-0.18, -0.06, 0.06, 0.18].map((y, i) => (
        <mesh key={`h${i}`} position={[0, y, 0.01]}>
          <boxGeometry args={[args[0] + 0.02, 0.018, args[2] + 0.02]} />
          <meshStandardMaterial color={net} roughness={0.5} />
        </mesh>
      ))}
      {/* Vertical straps */}
      {[-0.04, 0.04].map((x, i) => (
        <mesh key={`v${i}`} position={[x, 0, 0.01]}>
          <boxGeometry args={[0.014, args[1] + 0.02, args[2] + 0.02]} />
          <meshStandardMaterial color={net} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function AppleDog({ offset = [0.55, 0, 0.15] }) {
  const root = useRef();
  const fur = '#e8dcc8';
  const ear = '#d4c4a8';
  const nose = '#1a1410';
  const collar = '#c42828';

  useFrame((state) => {
    if (!root.current) return;
    // Tiny idle bob / wag
    const t = state.clock.elapsedTime;
    root.current.position.y = Math.sin(t * 3.2) * 0.02;
    root.current.rotation.y = Math.sin(t * 1.6) * 0.15;
  });

  return (
    <group position={offset}>
      <group ref={root}>
        {/* Body */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[0.22, 0.16, 0.32]} />
          <Toon color={fur} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.28, 0.2]} castShadow>
          <boxGeometry args={[0.16, 0.14, 0.16]} />
          <Toon color={fur} />
        </mesh>
        {/* Snout */}
        <mesh position={[0, 0.24, 0.3]}>
          <boxGeometry args={[0.1, 0.08, 0.08]} />
          <Toon color={ear} />
        </mesh>
        <mesh position={[0, 0.25, 0.35]}>
          <boxGeometry args={[0.04, 0.03, 0.03]} />
          <Toon color={nose} />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.08, 0.36, 0.18]} rotation={[0.2, 0, -0.3]}>
          <boxGeometry args={[0.06, 0.1, 0.04]} />
          <Toon color={ear} />
        </mesh>
        <mesh position={[0.08, 0.36, 0.18]} rotation={[0.2, 0, 0.3]}>
          <boxGeometry args={[0.06, 0.1, 0.04]} />
          <Toon color={ear} />
        </mesh>
        {/* Legs */}
        <mesh position={[-0.07, 0.06, 0.1]} castShadow>
          <boxGeometry args={[0.05, 0.12, 0.05]} />
          <Toon color={fur} />
        </mesh>
        <mesh position={[0.07, 0.06, 0.1]} castShadow>
          <boxGeometry args={[0.05, 0.12, 0.05]} />
          <Toon color={fur} />
        </mesh>
        <mesh position={[-0.07, 0.06, -0.1]} castShadow>
          <boxGeometry args={[0.05, 0.12, 0.05]} />
          <Toon color={fur} />
        </mesh>
        <mesh position={[0.07, 0.06, -0.1]} castShadow>
          <boxGeometry args={[0.05, 0.12, 0.05]} />
          <Toon color={fur} />
        </mesh>
        {/* Tail */}
        <mesh position={[0, 0.22, -0.2]} rotation={[0.6, 0, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.12]} />
          <Toon color={fur} />
        </mesh>
        {/* Collar */}
        <mesh position={[0, 0.22, 0.14]}>
          <boxGeometry args={[0.18, 0.03, 0.18]} />
          <Toon color={collar} />
        </mesh>
        <Html position={[0, 0.55, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 10,
              color: DD.bone || '#e8e0d0',
              textShadow: '0 1px 3px #000',
              whiteSpace: 'nowrap',
              fontWeight: 700,
            }}
          >
            Apple
          </div>
        </Html>
      </group>
    </group>
  );
}

export default function SteveKit({ headY = 1.65, style }) {
  const net = '#0a0a0c';
  const skin = '#c49a6c';
  const hatY = headAnchor(headY, style || getBodyStyle()).crownY + 0.07;

  return (
    <group>
      <FishnetSleeve position={[-0.12, 0.45, 0]} args={[0.19, 0.92, 0.21]} />
      <FishnetSleeve position={[0.12, 0.45, 0]} args={[0.19, 0.92, 0.21]} />
      <FishnetSleeve position={[-0.38, 1.1, 0]} args={[0.15, 0.56, 0.15]} />
      <FishnetSleeve position={[0.38, 1.1, 0]} args={[0.15, 0.56, 0.15]} />
      <mesh position={[0, 1.05, 0.17]}>
        <boxGeometry args={[0.5, 0.35, 0.04]} />
        <meshStandardMaterial color={skin} transparent opacity={0.7} roughness={0.65} />
      </mesh>
      {[
        [-0.12, 1.15],
        [0, 1.15],
        [0.12, 1.15],
        [-0.12, 1.0],
        [0, 1.0],
        [0.12, 1.0],
        [-0.12, 0.88],
        [0, 0.88],
        [0.12, 0.88],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.19]}>
          <boxGeometry args={[0.04, 0.04, 0.02]} />
          <meshStandardMaterial color={net} roughness={0.45} />
        </mesh>
      ))}
      {[1.18, 1.08, 0.98, 0.88].map((y, i) => (
        <mesh key={`ch${i}`} position={[0, y, 0.185]}>
          <boxGeometry args={[0.48, 0.015, 0.015]} />
          <meshStandardMaterial color={net} roughness={0.45} />
        </mesh>
      ))}
      <RiceFarmerHat position={[0, hatY, 0]} />
      <AppleDog />
    </group>
  );
}
