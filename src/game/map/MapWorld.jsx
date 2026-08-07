import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getActiveMap } from './activeMap';
import { useGameApi } from '../GameContext';
import { BARRICADE } from '../constants';
import Toon from '../style/Toon';
import { DD } from '../style/theme';
import { DisplayGun } from '../weapons/GunMeshes';

function wallColor(theme, material) {
  if (material === 'bunker') return DD.stone;
  if (material === 'barn') return '#6a4830';
  if (theme === 'camp') return DD.plank;
  if (theme === 'farm') return '#7a5a38';
  if (theme === 'city') return '#7a7468';
  if (theme === 'suburb') return '#8a7a62';
  return DD.stone;
}

/**
 * Cheap Lambert for the "soft" pass, cel-shaded Toon otherwise. Declared at
 * module scope so React keeps one component type — defining it inside `Wall`
 * gave every render a fresh type, which remounts the mesh and rebuilds its
 * Three.js material on every frame that touches a wall.
 */
function WallSurface({ soft, color, emissive, emissiveIntensity = 0 }) {
  if (soft) return <meshLambertMaterial color={color} />;
  return (
    <Toon
      color={color}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

function Wall({ x, z, w, d, theme, material, y = 0, h, soft = false }) {
  const map = getActiveMap();
  const height =
    h ??
    (material === 'bunker' || material === 'barn'
      ? Math.max(map.WALL_HEIGHT, 4.2)
      : map.WALL_HEIGHT);
  const col = wallColor(theme, material);
  const trim =
    theme === 'city'
      ? '#5a564c'
      : theme === 'suburb'
        ? '#6a5a48'
        : theme === 'camp' || theme === 'farm'
          ? DD.plankDark
          : DD.stoneDark;
  const base =
    theme === 'city'
      ? '#4a4840'
      : theme === 'suburb'
        ? '#4a4034'
        : theme === 'camp' || theme === 'farm'
          ? '#3a2a18'
          : DD.stoneDark;
  const thick = Math.min(w, d);
  const long = Math.max(w, d);
  const alongX = w >= d;
  const midY = y + height / 2;
  const showCoping = height > 1.5;
  const showBase = y < 0.3;
  return (
    <group>
      <mesh position={[x, midY, z]}>
        <boxGeometry args={[w, height, d]} />
        <WallSurface
          soft={soft}
          color={col}
          emissive={col}
          emissiveIntensity={soft ? 0 : 0.14}
        />
      </mesh>
      {showCoping && (
        <mesh position={[x, y + height + 0.07, z]}>
          <boxGeometry args={[w + 0.1, 0.14, d + 0.1]} />
          <WallSurface soft={soft} color={trim} />
        </mesh>
      )}
      {height > 2 && (
        <mesh position={[x, y + height * 0.55, z]}>
          <boxGeometry
            args={
              alongX
                ? [long * 0.98, 0.08, thick + 0.04]
                : [thick + 0.04, 0.08, long * 0.98]
            }
          />
          <WallSurface soft={soft} color={trim} />
        </mesh>
      )}
      {showBase && (
        <mesh position={[x, y + 0.14, z]}>
          <boxGeometry
            args={
              alongX
                ? [long + 0.06, 0.28, Math.max(thick + 0.16, 0.28)]
                : [Math.max(thick + 0.16, 0.28), 0.28, long + 0.06]
            }
          />
          <WallSurface soft={soft} color={base} />
        </mesh>
      )}
    </group>
  );
}

function Floor({ x, z, w, d, color, y = 0.012, thick, soft = false, layer = 0 }) {
  const yLift = y + layer * 0.005;
  const mat = soft ? (
    <meshLambertMaterial
      color={color}
      polygonOffset
      polygonOffsetFactor={-1 - layer}
      polygonOffsetUnits={-1 - layer}
    />
  ) : (
    <Toon
      color={color}
      emissive={color}
      emissiveIntensity={0.28}
      polygonOffset
      polygonOffsetFactor={-1 - layer}
      polygonOffsetUnits={-1 - layer}
    />
  );
  if (thick) {
    return (
      <mesh position={[x, yLift - thick / 2, z]}>
        <boxGeometry args={[w, thick, d]} />
        {mat}
      </mesh>
    );
  }
  return (
    <mesh position={[x, yLift, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      {mat}
    </mesh>
  );
}

function StairsMesh({ stair }) {
  const steps = stair.steps || 10;
  const axis = stair.axis || 'z';
  const span = axis === 'z' ? stair.d : stair.w;
  const width = axis === 'z' ? stair.w : stair.d;
  const stepD = span / steps;
  const stepH = (stair.y1 - stair.y0) / steps;
  const meshes = [];
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const along =
      (axis === 'z' ? stair.z : stair.x) +
      (stair.dir === -1 ? 0.5 - t : t - 0.5) * span;
    const y = stair.y0 + (i + 0.5) * stepH;
    const pos =
      axis === 'z'
        ? [stair.x, y, along]
        : [along, y, stair.z];
    const size =
      axis === 'z'
        ? [width * 0.98, stepH * 0.92, stepD * 0.95]
        : [stepD * 0.95, stepH * 0.92, width * 0.98];
    meshes.push(
      <mesh key={i} position={pos} receiveShadow castShadow>
        <boxGeometry args={size} />
        <Toon color={i % 2 === 0 ? DD.stone : DD.stoneDark} />
      </mesh>
    );
  }
  return <group>{meshes}</group>;
}

/** Night sky + ground — kept cheap for FPS */
function Horizon({ theme, outdoor, bound }) {
  const ground = outdoor
    ? theme === 'city'
      ? '#3a3630'
      : theme === 'farm'
        ? '#354028'
        : theme === 'suburb'
          ? '#3a4030'
          : '#3a3228'
    : DD.void;
  const sil = useMemo(() => {
    if (!outdoor) return [];
    const out = [];
    const R = bound + 10;
    const count = theme === 'city' ? 8 : theme === 'farm' ? 6 : theme === 'suburb' ? 7 : 5;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.15;
      const farmHill = theme === 'farm';
      const suburb = theme === 'suburb';
      out.push({
        x: Math.cos(a) * R,
        z: Math.sin(a) * R,
        w: theme === 'city' ? 4 + (i % 3) : farmHill ? 7 + (i % 3) : suburb ? 5 + (i % 2) : 9,
        h: theme === 'city' ? 7 + (i % 5) : farmHill ? 1.8 + (i % 3) * 0.4 : suburb ? 3.2 + (i % 3) * 0.6 : 2.4,
        d: theme === 'city' ? 2 : suburb ? 3 : 4,
        yaw: -a + Math.PI / 2,
        color: theme === 'city' ? '#4a4640' : farmHill ? '#3a4830' : suburb ? '#5a5040' : '#4a4034',
      });
    }
    return out;
  }, [outdoor, theme, bound]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color={ground} />
      </mesh>
      {sil.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} rotation={[0, b.yaw, 0]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshBasicMaterial color={b.color} />
        </mesh>
      ))}
    </group>
  );
}

function DoorMesh({ door, open }) {
  const [ow, oh, ot] = door.size;
  const hingeX = -ow / 2;
  const swing = open ? -Math.PI * 0.92 : 0;
  const plankW = ow * 0.92;
  const plankCount = 4;
  const plankGap = 0.04;
  const plankEach = (plankW - plankGap * (plankCount - 1)) / plankCount;

  return (
    <group position={door.position} rotation={door.rotation}>
      <DoorFrame size={door.size} />

      {/* Hinged door leaf */}
      <group position={[hingeX, 0, 0]} rotation={[0, swing, 0]}>
        <group position={[-hingeX, 0, 0]}>
          {/* Main slab */}
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[ow * 0.98, oh * 0.98, ot * 0.85]} />
            <Toon color={DD.wood} />
          </mesh>

          {/* Vertical planks */}
          {Array.from({ length: plankCount }, (_, i) => {
            const x =
              -plankW / 2 + plankEach / 2 + i * (plankEach + plankGap);
            return (
              <mesh key={`p${i}`} position={[x, 0, ot * 0.42]} castShadow>
                <boxGeometry args={[plankEach * 0.95, oh * 0.94, 0.04]} />
                <Toon color={i % 2 === 0 ? DD.plank : DD.plankDark} />
              </mesh>
            );
          })}

          {/* Cross braces */}
          <mesh position={[0, oh * 0.22, ot * 0.48]} castShadow>
            <boxGeometry args={[ow * 0.88, 0.1, 0.05]} />
            <Toon color={DD.plankDark} />
          </mesh>
          <mesh position={[0, -oh * 0.18, ot * 0.48]} castShadow>
            <boxGeometry args={[ow * 0.88, 0.1, 0.05]} />
            <Toon color={DD.plankDark} />
          </mesh>
          <mesh
            position={[0, 0.02, ot * 0.5]}
            rotation={[0, 0, 0.55]}
            castShadow
          >
            <boxGeometry args={[oh * 0.55, 0.08, 0.04]} />
            <Toon color={DD.woodLite} />
          </mesh>

          {/* Knob */}
          <mesh position={[ow * 0.32, 0, ot * 0.55]} castShadow>
            <sphereGeometry args={[0.07, 8, 8]} />
            <Toon color={DD.gold} emissive={DD.gold} emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[ow * 0.32, 0, ot * 0.42]}>
            <boxGeometry args={[0.06, 0.14, 0.08]} />
            <Toon color={DD.gold} />
          </mesh>

          {/* Hinge plates */}
          <mesh position={[-ow * 0.46, oh * 0.28, 0]}>
            <boxGeometry args={[0.08, 0.22, ot * 1.1]} />
            <Toon color={DD.stoneDark} />
          </mesh>
          <mesh position={[-ow * 0.46, -oh * 0.28, 0]}>
            <boxGeometry args={[0.08, 0.22, ot * 1.1]} />
            <Toon color={DD.stoneDark} />
          </mesh>
        </group>
      </group>

      {!open && (
        <mesh position={[0, oh * 0.12, ot * 0.55 + 0.02]}>
          <planeGeometry args={[Math.min(1.5, ow * 0.7), 0.32]} />
          <meshBasicMaterial color={DD.gold} />
        </mesh>
      )}
    </group>
  );
}

function DoorFrame({ size }) {
  const [sw, sh, sd] = size;
  const t = 0.1;
  return (
    <group>
      <mesh position={[0, sh / 2 + t / 2, 0]} castShadow>
        <boxGeometry args={[sw + t * 2, t, sd + 0.08]} />
        <Toon color={DD.woodLite} />
      </mesh>
      <mesh position={[-sw / 2 - t / 2, 0, 0]} castShadow>
        <boxGeometry args={[t, sh, sd + 0.08]} />
        <Toon color={DD.wood} />
      </mesh>
      <mesh position={[sw / 2 + t / 2, 0, 0]} castShadow>
        <boxGeometry args={[t, sh, sd + 0.08]} />
        <Toon color={DD.wood} />
      </mesh>
      <mesh position={[0, -sh / 2 + 0.04, 0]} receiveShadow>
        <boxGeometry args={[sw + t * 2, 0.1, sd + 0.12]} />
        <Toon color={DD.plankDark} />
      </mesh>
    </group>
  );
}

function WallBuyMesh({ wb }) {
  // Local +Z faces into the room. Origin sits on the wall's inner face.
  return (
    <group position={wb.position} rotation={wb.rotation}>
      {/* Recessed steel plate sunk into wall */}
      <mesh position={[0, 0, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[1.55, 0.95, 0.08]} />
        <meshStandardMaterial color="#1a1814" roughness={0.85} metalness={0.25} />
      </mesh>
      {/* Rim / frame flush with wall face */}
      <mesh position={[0, 0, 0.01]} castShadow>
        <boxGeometry args={[1.62, 1.02, 0.04]} />
        <meshStandardMaterial color="#2e2a22" roughness={0.7} metalness={0.35} />
      </mesh>
      {/* Pegs */}
      <mesh position={[-0.35, 0.22, 0.06]}>
        <cylinderGeometry args={[0.025, 0.025, 0.1, 6]} />
        <meshStandardMaterial color="#6a6458" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.35, 0.22, 0.06]}>
        <cylinderGeometry args={[0.025, 0.025, 0.1, 6]} />
        <meshStandardMaterial color="#6a6458" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Gun body — pressed against plate */}
      <mesh position={[0, 0.18, 0.08]} rotation={[0.05, 0, -0.08]} castShadow>
        <boxGeometry args={[0.95, 0.11, 0.14]} />
        <meshStandardMaterial color="#c8c0b0" roughness={0.45} metalness={0.55} />
      </mesh>
      {/* Stock */}
      <mesh position={[-0.42, 0.12, 0.08]} rotation={[0, 0, 0.15]} castShadow>
        <boxGeometry args={[0.28, 0.16, 0.1]} />
        <meshStandardMaterial color="#5a4030" roughness={0.8} metalness={0.05} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0.48, 0.2, 0.08]} castShadow>
        <boxGeometry args={[0.28, 0.05, 0.05]} />
        <meshStandardMaterial color="#9a9488" roughness={0.4} metalness={0.65} />
      </mesh>
      {/* Grip */}
      <mesh position={[0.12, 0.02, 0.09]} rotation={[0.4, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 0.22, 0.1]} />
        <meshStandardMaterial color="#3a3028" roughness={0.75} metalness={0.1} />
      </mesh>
      {/* Price tag under gun */}
      <mesh position={[0, -0.32, 0.04]}>
        <boxGeometry args={[0.7, 0.18, 0.03]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

function MysteryBoxMesh({ boxDef }) {
  const { stateRef } = useGameApi();
  const lid = useRef();

  useFrame((_, dt) => {
    const box = stateRef.current.mysteryBox;
    if (!box) return;
    const open = box.phase === 'spinning' || box.phase === 'offer';
    if (lid.current) {
      const target = open ? -0.95 : 0;
      lid.current.rotation.x += (target - lid.current.rotation.x) * Math.min(1, dt * 6);
    }
  });

  if (!boxDef) return null;

  return (
    <group position={boxDef.position} rotation={boxDef.rotation}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.35, 0.7, 0.95]} />
        <Toon color={DD.wood} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[1.2, 0.12, 0.8]} />
        <Toon color={DD.plankDark} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[1.05, 0.55, 0.7]} />
        <Toon color="#3a2a48" />
      </mesh>
      <group ref={lid} position={[0, 1.32, -0.28]}>
        <mesh position={[0, 0.04, 0.28]} castShadow>
          <boxGeometry args={[1.08, 0.08, 0.72]} />
          <Toon color="#5a3a6a" />
        </mesh>
      </group>
      <mesh position={[0, 1.05, 0.36]}>
        <planeGeometry args={[0.35, 0.4]} />
        <meshBasicMaterial color="#e8c84a" />
      </mesh>
      <MysteryWeaponSpin stateRef={stateRef} />
    </group>
  );
}

function MysteryWeaponSpin({ stateRef }) {
  const root = useRef();
  const lastId = useRef(null);
  const spin = useRef(0);
  const speed = useRef(0);
  const [weaponId, setWeaponId] = useState(null);

  useFrame((_, dt) => {
    const box = stateRef.current?.mysteryBox;
    if (!root.current || !box) return;
    const active = box.phase === 'spinning' || box.phase === 'offer';
    root.current.visible = active;
    if (!active) {
      spin.current = 0;
      speed.current = 0;
      if (lastId.current !== null) {
        lastId.current = null;
        setWeaponId(null);
      }
      return;
    }

    const id = box.displayId;
    if (id && id !== lastId.current) {
      lastId.current = id;
      setWeaponId(id);
    }

    // Fast spin while rolling; ease down when offering the weapon
    const targetSpeed = box.phase === 'spinning' ? 9 + Math.max(box.spinTimer, 0) * 1.2 : 1.6;
    speed.current += (targetSpeed - speed.current) * Math.min(1, dt * 4);
    spin.current += dt * speed.current;

    root.current.rotation.y = spin.current;
    root.current.position.y = 1.72 + Math.sin(spin.current * 2.2) * 0.06;
    root.current.rotation.x = 0.12 + Math.sin(spin.current * 1.1) * 0.08;
    root.current.rotation.z = Math.cos(spin.current * 1.3) * 0.1;
  });

  return (
    <group ref={root} position={[0, 1.72, 0]} visible={false}>
      {weaponId ? <DisplayGun weaponId={weaponId} scale={2.1} /> : null}
      <pointLight
        position={[0, 0.2, 0]}
        color="#ffcc66"
        intensity={1.6}
        distance={3.5}
      />
    </group>
  );
}

function Barrel({ position }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.38, 0.42, 1.2, 14]} />
        <Toon color={DD.rust} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.08, 14]} />
        <Toon color={DD.gold} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.07, 14]} />
        <Toon color={DD.metalDark} />
      </mesh>
      <mesh position={[0, 1.22, 0]}>
        <cylinderGeometry args={[0.32, 0.36, 0.06, 12]} />
        <Toon color={DD.metal} />
      </mesh>
    </group>
  );
}

function Crate({ position, color = DD.woodLite }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.05, 0.85, 0.85]} />
        <Toon color={color} />
      </mesh>
      <mesh position={[0, 0, 0.44]}>
        <boxGeometry args={[1.0, 0.1, 0.04]} />
        <Toon color={DD.plankDark} />
      </mesh>
      <mesh position={[0, 0.28, 0.44]}>
        <boxGeometry args={[1.0, 0.08, 0.04]} />
        <Toon color={DD.plankDark} />
      </mesh>
      <mesh position={[0, -0.28, 0.44]}>
        <boxGeometry args={[1.0, 0.08, 0.04]} />
        <Toon color={DD.plankDark} />
      </mesh>
      <mesh position={[0.54, 0, 0]}>
        <boxGeometry args={[0.04, 0.85, 0.85]} />
        <Toon color={DD.wood} />
      </mesh>
    </group>
  );
}

/** Thin walk plate for parkour routes */
function Platform({ position, size = [1.6, 0.16, 1.2] }) {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <Toon color="#5a5044" />
      </mesh>
      <mesh position={[0, h * 0.52, 0]} receiveShadow>
        <boxGeometry args={[w * 0.92, 0.03, d * 0.92]} />
        <Toon color="#6e6254" />
      </mesh>
    </group>
  );
}

function Cone({ position }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.42, 0]}>
        <coneGeometry args={[0.28, 0.85, 10]} />
        <Toon color={DD.torch} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.08, 10]} />
        <meshBasicMaterial color="#e8e2d4" />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.05, 10]} />
        <Toon color={DD.ink} />
      </mesh>
    </group>
  );
}

function PieProp({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 16]} />
        <Toon color={DD.parchmentDark} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.22, 0.24, 0.1, 16]} />
        <Toon color={DD.bloodLite} emissive={DD.blood} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <Toon color={DD.bone} />
      </mesh>
    </group>
  );
}

function Tent({ position, yaw = 0, color = '#6a4a28', trim = '#5a3c22' }) {
  const pole = '#3a2a18';
  const canvas = color;
  const canvasDark = trim;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Ground cloth */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[2.4, 0.06, 2.8]} />
        <meshLambertMaterial color="#3a2a18" />
      </mesh>
      {/* Ridge pole */}
      <mesh position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 2.6, 6]} />
        <meshLambertMaterial color={pole} />
      </mesh>
      {/* End uprights */}
      <mesh position={[0, 0.78, 1.25]}>
        <cylinderGeometry args={[0.045, 0.05, 1.55, 6]} />
        <meshLambertMaterial color={pole} />
      </mesh>
      <mesh position={[0, 0.78, -1.25]}>
        <cylinderGeometry args={[0.045, 0.05, 1.55, 6]} />
        <meshLambertMaterial color={pole} />
      </mesh>
      {/* Corner stakes */}
      <mesh position={[-1.05, 0.35, 1.2]}>
        <cylinderGeometry args={[0.03, 0.035, 0.7, 5]} />
        <meshLambertMaterial color={pole} />
      </mesh>
      <mesh position={[1.05, 0.35, 1.2]}>
        <cylinderGeometry args={[0.03, 0.035, 0.7, 5]} />
        <meshLambertMaterial color={pole} />
      </mesh>
      <mesh position={[-1.05, 0.35, -1.2]}>
        <cylinderGeometry args={[0.03, 0.035, 0.7, 5]} />
        <meshLambertMaterial color={pole} />
      </mesh>
      <mesh position={[1.05, 0.35, -1.2]}>
        <cylinderGeometry args={[0.03, 0.035, 0.7, 5]} />
        <meshLambertMaterial color={pole} />
      </mesh>
      {/* A-frame roof panels (boxes, not 3-gon cones) */}
      <mesh position={[-0.55, 0.95, 0]} rotation={[0, 0, 0.55]}>
        <boxGeometry args={[1.35, 0.06, 2.7]} />
        <meshLambertMaterial color={canvas} />
      </mesh>
      <mesh position={[0.55, 0.95, 0]} rotation={[0, 0, -0.55]}>
        <boxGeometry args={[1.35, 0.06, 2.7]} />
        <meshLambertMaterial color={canvasDark} />
      </mesh>
      {/* Rear end wall */}
      <mesh position={[0, 0.7, -1.28]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[1.9, 1.35, 0.05]} />
        <meshLambertMaterial color={canvasDark} />
      </mesh>
      {/* Front flaps (open doorway) */}
      <mesh position={[-0.55, 0.65, 1.22]} rotation={[0, 0.15, 0.1]}>
        <boxGeometry args={[0.7, 1.2, 0.04]} />
        <meshLambertMaterial color={canvas} />
      </mesh>
      <mesh position={[0.55, 0.65, 1.22]} rotation={[0, -0.15, -0.1]}>
        <boxGeometry args={[0.7, 1.2, 0.04]} />
        <meshLambertMaterial color={canvasDark} />
      </mesh>
    </group>
  );
}

function Campfire({ position }) {
  const flame = useRef();
  useFrame(() => {
    if (!flame.current) return;
    const t = performance.now() * 0.008;
    flame.current.scale.y = 1 + Math.sin(t) * 0.15;
    flame.current.material.emissiveIntensity = 1.2 + Math.sin(t * 1.7) * 0.35;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.16, 10]} />
        <Toon color="#3a2a1a" />
      </mesh>
      <mesh position={[0.25, 0.2, 0.1]} rotation={[0.3, 0.4, 0.2]}>
        <boxGeometry args={[0.5, 0.12, 0.12]} />
        <Toon color={DD.plankDark} />
      </mesh>
      <mesh position={[-0.2, 0.2, -0.15]} rotation={[-0.2, -0.5, 0.1]}>
        <boxGeometry args={[0.45, 0.12, 0.12]} />
        <Toon color={DD.plank} />
      </mesh>
      <mesh ref={flame} position={[0, 0.45, 0]}>
        <coneGeometry args={[0.22, 0.7, 6]} />
        <meshStandardMaterial
          color="#ff6a20"
          emissive="#ff4400"
          emissiveIntensity={1.3}
        />
      </mesh>
    </group>
  );
}

function Shed({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[5.2, 3.1, 3.8]} />
        <Toon color={DD.plankDark} />
      </mesh>
      <mesh position={[0, 3.35, 0]} rotation={[0, 0, 0.08]} castShadow>
        <boxGeometry args={[5.6, 0.45, 4.2]} />
        <Toon color="#5a4030" />
      </mesh>
      <mesh position={[0, 1.2, 1.92]}>
        <boxGeometry args={[1.4, 2.2, 0.12]} />
        <Toon color="#2a2018" />
      </mesh>
      <mesh position={[-1.5, 2.2, 1.92]}>
        <planeGeometry args={[0.9, 0.7]} />
        <meshBasicMaterial color="#1a2830" />
      </mesh>
      <mesh position={[1.5, 2.2, 1.92]}>
        <planeGeometry args={[0.9, 0.7]} />
        <meshBasicMaterial color="#1a2830" />
      </mesh>
    </group>
  );
}

/** Red barn shell — matches sealed collision box footprint */
function Barn({ position }) {
  const boarded = [
    [-3.2, 1.7, -5.05],
    [0, 1.7, -5.05],
    [3.2, 1.7, -5.05],
    [-5.05, 1.7, 0],
    [-5.05, 1.7, 4],
    [5.05, 1.7, 0],
    [5.05, 1.7, 4],
  ];
  return (
    <group position={position}>
      <mesh position={[0, 3.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[11.4, 0.4, 10.4]} />
        <Toon color="#4a3020" />
      </mesh>
      {/* Peak roof ridge */}
      <mesh position={[0, 4.35, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[11.6, 0.9, 0.5]} />
        <Toon color="#3a2818" />
      </mesh>
      <mesh position={[0, 4.1, -2.5]} rotation={[0.25, 0, 0]} castShadow>
        <boxGeometry args={[11.5, 0.2, 5.2]} />
        <Toon color="#5a3828" />
      </mesh>
      <mesh position={[0, 4.1, 2.5]} rotation={[-0.25, 0, 0]} castShadow>
        <boxGeometry args={[11.5, 0.2, 5.2]} />
        <Toon color="#5a3828" />
      </mesh>
      {/* Red siding accents on front */}
      <mesh position={[-3.5, 2.2, -5.12]} castShadow>
        <boxGeometry args={[3.2, 3.8, 0.12]} />
        <Toon color="#8a3028" />
      </mesh>
      <mesh position={[3.5, 2.2, -5.12]} castShadow>
        <boxGeometry args={[3.2, 3.8, 0.12]} />
        <Toon color="#8a3028" />
      </mesh>
      {/* Big barn doors */}
      <mesh position={[-0.85, 1.5, -5.05]} castShadow>
        <boxGeometry args={[1.5, 3.0, 0.16]} />
        <Toon color="#5a3a28" />
      </mesh>
      <mesh position={[0.85, 1.5, -5.05]} castShadow>
        <boxGeometry args={[1.5, 3.0, 0.16]} />
        <Toon color="#4a3020" />
      </mesh>
      <mesh position={[0, 3.35, -5.1]}>
        <boxGeometry args={[2.2, 0.9, 0.14]} />
        <Toon color="#7a2820" />
      </mesh>
      {boarded.map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <boxGeometry args={[1.4, 1.0, 0.1]} />
            <Toon color="#2a1c14" />
          </mesh>
          <mesh position={[0, 0.1, 0.08]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[1.25, 0.16, 0.05]} />
            <Toon color={DD.plank} />
          </mesh>
        </group>
      ))}
      <mesh position={[-4, 4.6, 1]} castShadow>
        <boxGeometry args={[0.55, 1.4, 0.55]} />
        <Toon color="#6a5040" />
      </mesh>
    </group>
  );
}

function Silo({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[1.35, 1.45, 6.4, 12]} />
        <Toon color="#7a7468" />
      </mesh>
      <mesh position={[0, 6.55, 0]} castShadow>
        <coneGeometry args={[1.55, 1.1, 12]} />
        <Toon color="#8a3028" />
      </mesh>
      <mesh position={[0, 1.2, 1.4]}>
        <boxGeometry args={[0.7, 1.8, 0.12]} />
        <Toon color="#3a3428" />
      </mesh>
      {[1.5, 3.2, 4.9].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.42, 0.06, 6, 16]} />
          <Toon color={DD.metalDark} />
        </mesh>
      ))}
    </group>
  );
}

function HayBale({ position, yaw = 0 }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 1.1, 10]} />
        <Toon color="#c8a848" />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.52, 0.04, 6, 12]} />
        <Toon color="#8a7030" />
      </mesh>
    </group>
  );
}

function Tractor({ position, yaw = 0 }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[1.6, 0.7, 2.4]} />
        <Toon color="#3a6a28" />
      </mesh>
      <mesh position={[0, 1.35, -0.55]} castShadow>
        <boxGeometry args={[1.35, 0.7, 1.1]} />
        <Toon color="#2a5020" />
      </mesh>
      <mesh position={[0, 1.55, 0.7]}>
        <boxGeometry args={[0.9, 0.35, 0.7]} />
        <Toon color="#c9a227" />
      </mesh>
      {/* Rear wheels */}
      <mesh position={[-0.95, 0.55, -0.7]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.35, 10]} />
        <Toon color="#2a2420" />
      </mesh>
      <mesh position={[0.95, 0.55, -0.7]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.35, 10]} />
        <Toon color="#2a2420" />
      </mesh>
      {/* Front wheels */}
      <mesh position={[-0.7, 0.35, 0.95]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.25, 10]} />
        <Toon color="#2a2420" />
      </mesh>
      <mesh position={[0.7, 0.35, 0.95]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.25, 10]} />
        <Toon color="#2a2420" />
      </mesh>
    </group>
  );
}

/** Crashed UH-style bird — blocks a gate, olive drab + bent rotors */
function CrashedHeli({ position, yaw = 0 }) {
  const olive = '#3a4a28';
  const oliveDark = '#2a3820';
  const metal = '#5a5850';
  const glass = '#4a6870';
  const rust = '#6a3a22';
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Listing wreck — nose down, rolled a bit */}
      <group position={[0, 0.55, 0]} rotation={[0.18, 0, 0.22]}>
        {/* Fuselage */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[1.55, 1.15, 5.2]} />
          <Toon color={olive} />
        </mesh>
        {/* Cabin windows strip */}
        <mesh position={[0, 0.7, 0.3]}>
          <boxGeometry args={[1.58, 0.35, 2.4]} />
          <Toon color={glass} />
        </mesh>
        {/* Cockpit nose */}
        <mesh position={[0, 0.45, 2.85]} castShadow>
          <boxGeometry args={[1.25, 0.95, 1.1]} />
          <Toon color={oliveDark} />
        </mesh>
        <mesh position={[0, 0.55, 3.35]}>
          <boxGeometry args={[1.05, 0.55, 0.5]} />
          <Toon color={glass} />
        </mesh>
        {/* Tail boom (bent) */}
        <mesh position={[0.15, 0.65, -3.4]} rotation={[0.1, 0, 0.35]} castShadow>
          <boxGeometry args={[0.45, 0.4, 2.4]} />
          <Toon color={olive} />
        </mesh>
        <mesh position={[0.55, 0.9, -4.55]} rotation={[0.2, 0.4, 0.5]} castShadow>
          <boxGeometry args={[0.35, 0.9, 0.35]} />
          <Toon color={oliveDark} />
        </mesh>
        {/* Tail rotor stub */}
        <mesh position={[0.55, 1.35, -4.55]} rotation={[0.5, 0, Math.PI / 2]}>
          <boxGeometry args={[0.08, 1.4, 0.12]} />
          <Toon color={metal} />
        </mesh>
        {/* Main rotor mast */}
        <mesh position={[0, 1.35, 0.2]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.55, 8]} />
          <Toon color={metal} />
        </mesh>
        {/* Broken rotor blades */}
        <mesh position={[1.1, 1.55, 0.2]} rotation={[0.15, 0.2, 0.35]} castShadow>
          <boxGeometry args={[2.4, 0.06, 0.22]} />
          <Toon color={oliveDark} />
        </mesh>
        <mesh position={[-0.9, 1.45, 0.5]} rotation={[-0.4, -0.5, -0.8]} castShadow>
          <boxGeometry args={[1.8, 0.06, 0.2]} />
          <Toon color={oliveDark} />
        </mesh>
        <mesh position={[0.2, 1.2, -1.2]} rotation={[1.1, 0.3, 0.2]} castShadow>
          <boxGeometry args={[1.5, 0.05, 0.18]} />
          <Toon color={metal} />
        </mesh>
        {/* Door frame */}
        <mesh position={[0.78, 0.45, 0.4]}>
          <boxGeometry args={[0.06, 0.85, 1.4]} />
          <Toon color={oliveDark} />
        </mesh>
        {/* Skids — crumpled */}
        <mesh position={[-0.7, -0.15, 0.4]} rotation={[0, 0, 0.5]} castShadow>
          <boxGeometry args={[0.1, 0.1, 3.2]} />
          <Toon color={metal} />
        </mesh>
        <mesh position={[0.75, -0.05, 0.2]} rotation={[0.1, 0, -0.65]} castShadow>
          <boxGeometry args={[0.1, 0.1, 2.8]} />
          <Toon color={rust} />
        </mesh>
        {/* Exhaust / scorch */}
        <mesh position={[-0.7, 0.9, -0.8]}>
          <boxGeometry args={[0.25, 0.25, 0.5]} />
          <Toon color="#1a1814" />
        </mesh>
        {/* Star / roundel stub */}
        <mesh position={[0.78, 0.55, -1.2]}>
          <boxGeometry args={[0.04, 0.35, 0.35]} />
          <Toon color="#8a2020" />
        </mesh>
      </group>
      {/* Debris under wreck */}
      <mesh position={[-1.2, 0.12, 1.5]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.7, 0.2, 0.5]} />
        <Toon color={rust} />
      </mesh>
      <mesh position={[1.4, 0.1, -1.2]} rotation={[0, -0.6, 0]}>
        <boxGeometry args={[0.55, 0.18, 0.8]} />
        <Toon color={metal} />
      </mesh>
      <mesh position={[0.3, 0.08, 2.2]}>
        <boxGeometry args={[1.2, 0.12, 0.9]} />
        <Toon color="#2a2218" />
      </mesh>
    </group>
  );
}

/** Rusted MBT hull — blocks a gate like the old crashed heli */
function RundownTank({ position, yaw = 0 }) {
  const olive = '#3a4228';
  const oliveDark = '#2a3220';
  const rust = '#6a3a22';
  const metal = '#5a5850';
  const track = '#2a2820';
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group position={[0, 0.15, 0]} rotation={[0.04, 0, 0.06]}>
        {/* Hull */}
        <mesh position={[0, 0.85, 0]} castShadow>
          <boxGeometry args={[2.6, 1.1, 5.4]} />
          <Toon color={olive} />
        </mesh>
        {/* Front glacis */}
        <mesh position={[0, 0.7, 2.55]} rotation={[0.35, 0, 0]} castShadow>
          <boxGeometry args={[2.5, 0.7, 1.1]} />
          <Toon color={oliveDark} />
        </mesh>
        {/* Turret */}
        <mesh position={[0.15, 1.65, -0.2]} castShadow>
          <boxGeometry args={[2.0, 0.85, 2.4]} />
          <Toon color={olive} />
        </mesh>
        {/* Bustle / ammo rack dent */}
        <mesh position={[0.15, 1.55, -1.55]} castShadow>
          <boxGeometry args={[1.7, 0.65, 0.9]} />
          <Toon color={oliveDark} />
        </mesh>
        {/* Bent barrel */}
        <mesh position={[0.1, 1.7, 2.4]} rotation={[0.12, 0.08, 0.15]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 3.2, 8]} />
          <Toon color={metal} />
        </mesh>
        <mesh position={[0.35, 1.55, 3.9]} rotation={[0.4, 0.2, 0.5]}>
          <cylinderGeometry args={[0.1, 0.12, 0.8, 6]} />
          <Toon color={rust} />
        </mesh>
        {/* Mantlet */}
        <mesh position={[0.1, 1.7, 1.15]}>
          <boxGeometry args={[0.7, 0.55, 0.45]} />
          <Toon color={oliveDark} />
        </mesh>
        {/* Tracks */}
        <mesh position={[-1.45, 0.45, 0]} castShadow>
          <boxGeometry args={[0.55, 0.75, 5.0]} />
          <Toon color={track} />
        </mesh>
        <mesh position={[1.45, 0.45, 0]} castShadow>
          <boxGeometry args={[0.55, 0.75, 5.0]} />
          <Toon color={track} />
        </mesh>
        {/* Road wheels stubs */}
        {[-1.8, -0.6, 0.6, 1.8].map((z, i) => (
          <group key={i}>
            <mesh position={[-1.45, 0.28, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.28, 0.28, 0.2, 8]} />
              <Toon color={metal} />
            </mesh>
            <mesh position={[1.45, 0.28, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.28, 0.28, 0.2, 8]} />
              <Toon color={i === 2 ? rust : metal} />
            </mesh>
          </group>
        ))}
        {/* Cupola */}
        <mesh position={[0.55, 2.2, -0.1]}>
          <cylinderGeometry args={[0.35, 0.38, 0.35, 8]} />
          <Toon color={oliveDark} />
        </mesh>
        {/* Scorch / rust panels */}
        <mesh position={[-1.32, 1.0, 0.8]}>
          <boxGeometry args={[0.06, 0.5, 1.2]} />
          <Toon color={rust} />
        </mesh>
        <mesh position={[1.32, 0.95, -1.0]}>
          <boxGeometry args={[0.06, 0.4, 0.9]} />
          <Toon color="#1a1814" />
        </mesh>
        {/* Antenna stub */}
        <mesh position={[-0.6, 2.35, -0.8]} rotation={[0.2, 0, 0.3]}>
          <cylinderGeometry args={[0.02, 0.025, 1.1, 5]} />
          <Toon color={metal} />
        </mesh>
      </group>
      {/* Debris */}
      <mesh position={[-1.6, 0.12, 2.2]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 0.2, 0.55]} />
        <Toon color={rust} />
      </mesh>
      <mesh position={[1.8, 0.1, -1.5]} rotation={[0, -0.4, 0]}>
        <boxGeometry args={[0.7, 0.18, 0.9]} />
        <Toon color={metal} />
      </mesh>
      <mesh position={[0.2, 0.08, 3.1]}>
        <boxGeometry args={[1.4, 0.12, 1.0]} />
        <Toon color="#2a2218" />
      </mesh>
    </group>
  );
}

/** Corrugated lean-to roof over the market pad */
function ShantyRoof({ position, size = [10, 3, 8], yaw = 0 }) {
  const [w, h, d] = size;
  const postH = h - 0.15;
  const wood = '#5a4030';
  const tin = '#6a6860';
  const tinDark = '#4a4840';
  const rust = '#6a3a22';
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Corner posts */}
      {[
        [-w / 2 + 0.25, d / 2 - 0.25],
        [w / 2 - 0.25, d / 2 - 0.25],
        [-w / 2 + 0.25, -d / 2 + 0.25],
        [w / 2 - 0.25, -d / 2 + 0.25],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, postH / 2, z]} castShadow>
          <boxGeometry args={[0.18, postH, 0.18]} />
          <Toon color={wood} />
        </mesh>
      ))}
      {/* Mid posts */}
      <mesh position={[0, postH / 2, d / 2 - 0.25]} castShadow>
        <boxGeometry args={[0.16, postH, 0.16]} />
        <Toon color={wood} />
      </mesh>
      <mesh position={[0, postH / 2, -d / 2 + 0.25]} castShadow>
        <boxGeometry args={[0.16, postH, 0.16]} />
        <Toon color={wood} />
      </mesh>
      {/* Beams */}
      <mesh position={[0, h - 0.2, 0]} castShadow>
        <boxGeometry args={[w - 0.2, 0.16, 0.2]} />
        <Toon color={wood} />
      </mesh>
      <mesh position={[0, h - 0.2, d / 2 - 0.3]} castShadow>
        <boxGeometry args={[w - 0.3, 0.14, 0.16]} />
        <Toon color={wood} />
      </mesh>
      <mesh position={[0, h - 0.2, -d / 2 + 0.3]} castShadow>
        <boxGeometry args={[w - 0.3, 0.14, 0.16]} />
        <Toon color={wood} />
      </mesh>
      {/* Corrugated roof panels (slight pitch) */}
      <mesh position={[0, h, 0]} rotation={[0.06, 0, 0]} castShadow>
        <boxGeometry args={[w, 0.08, d]} />
        <Toon color={tin} />
      </mesh>
      <mesh position={[-w * 0.22, h + 0.06, 0.1]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[w * 0.35, 0.04, d * 0.7]} />
        <Toon color={tinDark} />
      </mesh>
      <mesh position={[w * 0.2, h + 0.05, -0.2]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[w * 0.3, 0.04, d * 0.55]} />
        <Toon color={rust} />
      </mesh>
      {/* Tarp scraps */}
      <mesh position={[-w * 0.15, h * 0.55, d / 2 - 0.1]} rotation={[0.1, 0, 0.05]}>
        <boxGeometry args={[w * 0.4, 1.2, 0.04]} />
        <meshLambertMaterial color="#4a5038" />
      </mesh>
    </group>
  );
}

/** Wall-mounted torch with flicker — hub outdoor courts */
function WallTorch({ position, yaw = 0 }) {
  const light = useRef();
  const flame = useRef();
  const seed = useMemo(
    () => (position[0] * 11.3 + position[1] * 4.7 + position[2] * 8.1) % 100,
    [position]
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker =
      0.7 +
      Math.sin(t * 9.2 + seed) * 0.14 +
      Math.sin(t * 21.5 + seed * 1.9) * 0.1 +
      (Math.sin(t * 37 + seed * 0.7) > 0.9 ? -0.4 : 0);
    if (light.current) light.current.intensity = Math.max(0.12, flicker * 1.35);
    if (flame.current?.material) {
      flame.current.material.emissiveIntensity = 0.6 + flicker * 1.2;
      flame.current.scale.y = 0.85 + flicker * 0.35;
    }
  });
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Bracket */}
      <mesh position={[0, 0, 0.08]}>
        <boxGeometry args={[0.12, 0.35, 0.18]} />
        <Toon color="#3a3020" />
      </mesh>
      <mesh position={[0, -0.15, 0.22]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.08, 0.08, 0.35]} />
        <Toon color="#4a4030" />
      </mesh>
      {/* Bowl */}
      <mesh position={[0, 0.05, 0.38]}>
        <cylinderGeometry args={[0.12, 0.16, 0.14, 8]} />
        <Toon color="#5a4030" />
      </mesh>
      {/* Flame */}
      <mesh ref={flame} position={[0, 0.28, 0.38]}>
        <coneGeometry args={[0.08, 0.32, 6]} />
        <meshStandardMaterial
          color="#ff6a20"
          emissive="#ff4400"
          emissiveIntensity={1.1}
        />
      </mesh>
      <pointLight
        ref={light}
        position={[0, 0.35, 0.45]}
        intensity={1.2}
        distance={7}
        color="#ff7020"
        decay={1.6}
      />
    </group>
  );
}

/** Low sandbag berm — camp fortification */
function Sandbags({ position, yaw = 0, count = 3 }) {
  const bags = [];
  for (let i = 0; i < count; i++) {
    bags.push(
      <mesh
        key={i}
        position={[(i - (count - 1) / 2) * 0.55, 0.22, 0]}
        rotation={[0.05, i % 2 === 0 ? 0.08 : -0.08, 0]}
        castShadow
      >
        <boxGeometry args={[0.52, 0.32, 0.38]} />
        <Toon color={i % 2 === 0 ? '#8a7a48' : '#7a6a40'} />
      </mesh>
    );
  }
  // Second row
  if (count >= 2) {
    for (let i = 0; i < count - 1; i++) {
      bags.push(
        <mesh
          key={`t${i}`}
          position={[(i - (count - 2) / 2) * 0.55, 0.5, 0.02]}
          castShadow
        >
          <boxGeometry args={[0.5, 0.28, 0.36]} />
          <Toon color="#6a5a38" />
        </mesh>
      );
    }
  }
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {bags}
    </group>
  );
}

/** Olive supply crate stack accent */
function AmmoCrate({ position, yaw = 0 }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.9, 0.7, 0.7]} />
        <Toon color="#3a4a28" />
      </mesh>
      <mesh position={[0, 0.55, 0.36]}>
        <boxGeometry args={[0.5, 0.12, 0.04]} />
        <Toon color="#c9a227" />
      </mesh>
    </group>
  );
}

function Scarecrow({ position, yaw = 0 }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 1.8, 6]} />
        <Toon color={DD.plankDark} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 6]} />
        <Toon color={DD.plank} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[0.55, 0.7, 0.28]} />
        <Toon color="#6a4828" />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <Toon color="#c8a868" />
      </mesh>
      <mesh position={[0, 2.28, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.12, 10]} />
        <Toon color="#8a3028" />
      </mesh>
      <mesh position={[-0.08, 2.08, 0.17]}>
        <boxGeometry args={[0.06, 0.05, 0.03]} />
        <Toon color={DD.ink} />
      </mesh>
      <mesh position={[0.08, 2.08, 0.17]}>
        <boxGeometry args={[0.06, 0.05, 0.03]} />
        <Toon color={DD.ink} />
      </mesh>
    </group>
  );
}

function CornStalk({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 1.9, 5]} />
        <Toon color="#3a6028" />
      </mesh>
      <mesh position={[0.12, 1.1, 0]} rotation={[0, 0, 0.6]}>
        <boxGeometry args={[0.35, 0.08, 0.02]} />
        <Toon color="#4a7830" />
      </mesh>
      <mesh position={[-0.1, 1.35, 0.05]} rotation={[0, 0.3, -0.5]}>
        <boxGeometry args={[0.3, 0.07, 0.02]} />
        <Toon color="#3a6828" />
      </mesh>
      <mesh position={[0.08, 1.55, -0.04]} rotation={[0.2, 0, 0.4]}>
        <boxGeometry args={[0.28, 0.06, 0.02]} />
        <Toon color="#508030" />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <boxGeometry args={[0.12, 0.28, 0.12]} />
        <Toon color="#c9a227" />
      </mesh>
    </group>
  );
}

/** Sealed bunker seen from outside — roof, boarded windows, locked door */
function BunkerExterior({ position }) {
  const boarded = [
    [-3.2, 1.7, -5.05],
    [0, 1.7, -5.05],
    [3.2, 1.7, -5.05],
    [-5.05, 1.7, 0],
    [-5.05, 1.7, 4],
    [5.05, 1.7, 0],
    [5.05, 1.7, 4],
  ];
  return (
    <group position={position}>
      {/* Roof slab */}
      <mesh position={[0, 3.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[11.4, 0.35, 10.4]} />
        <Toon color={DD.stoneDark} />
      </mesh>
      {/* Roof lip */}
      <mesh position={[0, 3.35, -5.15]}>
        <boxGeometry args={[11.6, 0.25, 0.2]} />
        <Toon color={DD.stoneLite} />
      </mesh>
      {/* Sealed front door */}
      <mesh position={[0, 1.2, -5.05]} castShadow>
        <boxGeometry args={[2.2, 2.4, 0.18]} />
        <Toon color="#3a3028" />
      </mesh>
      <mesh position={[0.7, 1.15, -5.16]}>
        <boxGeometry args={[0.12, 0.12, 0.06]} />
        <Toon color={DD.metal} />
      </mesh>
      {/* Boarded window panels */}
      {boarded.map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <boxGeometry args={[1.5, 1.1, 0.12]} />
            <Toon color={DD.ink} />
          </mesh>
          <mesh position={[0, 0.15, 0.08]} rotation={[0, 0, 0.08]}>
            <boxGeometry args={[1.35, 0.18, 0.06]} />
            <Toon color={DD.plank} />
          </mesh>
          <mesh position={[0, -0.2, 0.08]} rotation={[0, 0, -0.06]}>
            <boxGeometry args={[1.35, 0.18, 0.06]} />
            <Toon color={DD.plankDark} />
          </mesh>
        </group>
      ))}
      {/* Side flood lights */}
      <mesh position={[-3.5, 3.1, -5.1]}>
        <boxGeometry args={[0.35, 0.2, 0.25]} />
        <Toon color={DD.metalDark} />
      </mesh>
      <mesh position={[3.5, 3.1, -5.1]}>
        <boxGeometry args={[0.35, 0.2, 0.25]} />
        <Toon color={DD.metalDark} />
      </mesh>
      {/* Vent / chimney stub */}
      <mesh position={[-3.5, 4.1, 2]} castShadow>
        <boxGeometry args={[0.8, 1.1, 0.8]} />
        <Toon color="#4a4038" />
      </mesh>
    </group>
  );
}

function Baseboards({ bound = 14, outdoor = false }) {
  if (outdoor) return null;
  const h = 0.18;
  const y = h / 2;
  const t = 0.08;
  const outer = [
    { x: 0, z: -bound + t / 2, w: bound * 2, d: t },
    { x: 0, z: bound - t / 2, w: bound * 2, d: t },
    { x: -bound + t / 2, z: 0, w: t, d: bound * 2 },
    { x: bound - t / 2, z: 0, w: t, d: bound * 2 },
  ];
  return (
    <group>
      {outer.map((b, i) => (
        <mesh key={i} position={[b.x, y, b.z]}>
          <boxGeometry args={[b.w, h, b.d]} />
          <Toon color={DD.wood} />
        </mesh>
      ))}
    </group>
  );
}

function WindowMesh({ win }) {
  const { stateRef } = useGameApi();
  const boardRefs = useRef([]);
  const maxBoards = BARRICADE.maxBoards;
  const map = getActiveMap();
  const T = map.WALL_THICKNESS;
  const { width: w, height: h, sill } = win;

  useFrame(() => {
    const boards = stateRef.current.windows[win.id]?.boards ?? 0;
    for (let i = 0; i < maxBoards; i++) {
      const mesh = boardRefs.current[i];
      if (mesh) mesh.visible = i < boards;
    }
  });

  const frameT = 0.1;
  const boardH = (h - 0.15) / maxBoards;
  const floorY = win.floorY ?? 0;
  const storyH = map.STORY_HEIGHT || map.WALL_HEIGHT;
  const storyTop = floorY + storyH;
  const belowH = Math.max(0.05, win.position[1] - h / 2 - floorY);
  const aboveH = Math.max(0.05, storyTop - (win.position[1] + h / 2));
  const stone = wallColor(map.theme);

  return (
    <group position={win.position} rotation={win.rotation}>
      {/* Opening is empty — look through to outside / zombies */}
      <mesh position={[0, 0, 0]} renderOrder={2}>
        <planeGeometry args={[w * 0.98, h * 0.98]} />
        <meshBasicMaterial
          color="#6a90a8"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>

      <mesh position={[0, -h / 2 - belowH / 2, 0]} receiveShadow>
        <boxGeometry args={[w + 0.05, belowH, T]} />
        <Toon color={stone} />
      </mesh>

      <mesh position={[0, h / 2 + aboveH / 2, 0]} receiveShadow>
        <boxGeometry args={[w + 0.05, aboveH, T]} />
        <Toon color={stone} />
      </mesh>

      <mesh position={[0, -h / 2 + 0.04, 0.02]} castShadow>
        <boxGeometry args={[w + 0.15, 0.12, T + 0.18]} />
        <Toon color={DD.wood} />
      </mesh>

      <mesh position={[0, h / 2 + frameT / 2, 0]}>
        <boxGeometry args={[w + frameT * 2, frameT, T + 0.12]} />
        <Toon color={DD.woodLite} />
      </mesh>

      <mesh position={[-w / 2 - frameT / 2, 0, 0]}>
        <boxGeometry args={[frameT, h + sill * 0.4, T + 0.12]} />
        <Toon color={DD.woodLite} />
      </mesh>
      <mesh position={[w / 2 + frameT / 2, 0, 0]}>
        <boxGeometry args={[frameT, h + sill * 0.4, T + 0.12]} />
        <Toon color={DD.woodLite} />
      </mesh>

      {Array.from({ length: maxBoards }, (_, i) => {
        const y = -h / 2 + boardH * (i + 0.5) + 0.04;
        return (
          <group
            key={i}
            ref={(el) => {
              boardRefs.current[i] = el;
            }}
            position={[0, y, T * 0.15]}
          >
            <mesh castShadow>
              {/* Thin planks leave peek gaps between boards */}
              <boxGeometry args={[w * 0.9, boardH * 0.58, 0.08]} />
              <Toon color={i % 2 === 0 ? DD.plank : DD.plankDark} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function MapProp({ prop }) {
  const color =
    prop.color === 'wood'
      ? DD.wood
      : prop.color === 'plankDark'
        ? DD.plankDark
        : DD.woodLite;
  switch (prop.type) {
    case 'crate':
      return <Crate position={prop.position} color={color} />;
    case 'platform':
      return (
        <Platform position={prop.position} size={prop.size || [1.6, 0.16, 1.2]} />
      );
    case 'barrel':
      return <Barrel position={prop.position} />;
    case 'cone':
      return <Cone position={prop.position} />;
    case 'pie':
      return <PieProp position={prop.position} />;
    case 'tent':
      return (
        <Tent
          position={prop.position}
          yaw={prop.yaw || 0}
          color={prop.color}
          trim={prop.trim}
        />
      );
    case 'campfire':
      return <Campfire position={prop.position} />;
    case 'shed':
      return <Shed position={prop.position} />;
    case 'bunkerExterior':
      return <BunkerExterior position={prop.position} />;
    case 'kiosk':
      return <Kiosk position={prop.position} />;
    case 'tramStop':
      return <TramStop position={prop.position} />;
    case 'marketStall':
      return <MarketStall position={prop.position} yaw={prop.yaw || 0} />;
    case 'panelFlat':
      return <PanelFlat position={prop.position} yaw={prop.yaw || 0} />;
    case 'streetLamp':
      return <StreetLamp position={prop.position} />;
    case 'hangingBulb':
      return (
        <HangingBulb
          position={prop.position}
          intensity={prop.intensity}
          distance={prop.distance}
          color={prop.color}
        />
      );
    case 'dumpster':
      return <Dumpster position={prop.position} yaw={prop.yaw || 0} />;
    case 'rubble':
      return <Rubble position={prop.position} />;
    case 'barn':
      return <Barn position={prop.position} />;
    case 'silo':
      return <Silo position={prop.position} />;
    case 'hayBale':
      return <HayBale position={prop.position} yaw={prop.yaw || 0} />;
    case 'tractor':
      return <Tractor position={prop.position} yaw={prop.yaw || 0} />;
    case 'crashedHeli':
      return <CrashedHeli position={prop.position} yaw={prop.yaw || 0} />;
    case 'tank':
      return <RundownTank position={prop.position} yaw={prop.yaw || 0} />;
    case 'shantyRoof':
      return (
        <ShantyRoof
          position={prop.position}
          size={prop.size || [10, 3, 8]}
          yaw={prop.yaw || 0}
        />
      );
    case 'wallTorch':
      return <WallTorch position={prop.position} yaw={prop.yaw || 0} />;
    case 'sandbags':
      return (
        <Sandbags
          position={prop.position}
          yaw={prop.yaw || 0}
          count={prop.count || 3}
        />
      );
    case 'ammoCrate':
      return <AmmoCrate position={prop.position} yaw={prop.yaw || 0} />;
    case 'scarecrow':
      return <Scarecrow position={prop.position} yaw={prop.yaw || 0} />;
    case 'cornStalk':
      return <CornStalk position={prop.position} />;
    default:
      return null;
  }
}

function Kiosk({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[1.7, 1.7, 1.35]} />
        <Toon color="#6a5040" />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <boxGeometry args={[1.95, 0.16, 1.55]} />
        <Toon color="#c43c2c" />
      </mesh>
      <mesh position={[0, 2.05, 0]}>
        <boxGeometry args={[1.7, 0.25, 0.2]} />
        <Toon color="#c43c2c" />
      </mesh>
      <mesh position={[0, 1.25, 0.7]}>
        <planeGeometry args={[1.15, 0.55]} />
        <meshBasicMaterial color="#1a1a14" />
      </mesh>
      <mesh position={[0, 0.65, 0.7]}>
        <boxGeometry args={[0.85, 0.4, 0.1]} />
        <Toon color="#c9a227" />
      </mesh>
      <mesh position={[0.55, 1.55, 0.7]}>
        <boxGeometry args={[0.35, 0.45, 0.08]} />
        <Toon color="#e8e0c8" emissive="#c9a227" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function TramStop({ position }) {
  return (
    <group position={position}>
      <mesh position={[-0.9, 1.7, 0]} castShadow>
        <boxGeometry args={[0.14, 3.4, 0.14]} />
        <Toon color="#5a5a58" />
      </mesh>
      <mesh position={[0.9, 1.7, 0]} castShadow>
        <boxGeometry args={[0.14, 3.4, 0.14]} />
        <Toon color="#5a5a58" />
      </mesh>
      <mesh position={[0, 3.35, 0.2]} castShadow>
        <boxGeometry args={[2.4, 0.12, 0.9]} />
        <Toon color="#c43c2c" />
      </mesh>
      <mesh position={[0, 3.2, 0.55]}>
        <boxGeometry args={[2.2, 0.35, 0.08]} />
        <Toon color="#c43c2c" />
      </mesh>
      <mesh position={[0, 2.7, 0.35]}>
        <planeGeometry args={[1.6, 0.55]} />
        <meshBasicMaterial color="#e8e2d4" />
      </mesh>
      <mesh position={[0, 0.45, 0.2]}>
        <boxGeometry args={[1.8, 0.9, 0.45]} />
        <Toon color="#4a4844" />
      </mesh>
    </group>
  );
}

function MarketStall({ position, yaw = 0 }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[2.6, 1.3, 1.2]} />
        <Toon color="#8a6a40" />
      </mesh>
      <mesh position={[0, 1.65, 0]} rotation={[0.18, 0, 0]} castShadow>
        <boxGeometry args={[2.9, 0.1, 1.6]} />
        <Toon color="#c43c2c" />
      </mesh>
      <mesh position={[-1.1, 1.1, 0]} castShadow>
        <boxGeometry args={[0.12, 2.2, 0.12]} />
        <Toon color="#5a4030" />
      </mesh>
      <mesh position={[1.1, 1.1, 0]} castShadow>
        <boxGeometry args={[0.12, 2.2, 0.12]} />
        <Toon color="#5a4030" />
      </mesh>
      <mesh position={[0, 0.95, 0.55]}>
        <boxGeometry args={[2.2, 0.08, 0.35]} />
        <Toon color={DD.parchmentDark} />
      </mesh>
      <mesh position={[-0.5, 1.05, 0.4]}>
        <boxGeometry args={[0.35, 0.25, 0.25]} />
        <Toon color={DD.sick} />
      </mesh>
      <mesh position={[0.4, 1.05, 0.4]}>
        <boxGeometry args={[0.4, 0.2, 0.3]} />
        <Toon color={DD.rust} />
      </mesh>
    </group>
  );
}

function PanelFlat({ position, yaw = 0 }) {
  const floors = [1.2, 2.6, 4.0];
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 2.7, 0]} castShadow>
        <boxGeometry args={[4.2, 5.4, 1.8]} />
        <Toon color="#8a8274" />
      </mesh>
      <mesh position={[0, 5.5, 0]}>
        <boxGeometry args={[4.4, 0.25, 2.0]} />
        <Toon color="#5a564c" />
      </mesh>
      {floors.map((fy, fi) =>
        [-1.1, 1.1].map((fx, wi) => (
          <mesh key={`${fi}-${wi}`} position={[fx, fy, 0.92]}>
            <planeGeometry args={[0.85, 1.05]} />
            <meshBasicMaterial
              color={fi === 1 && wi === 0 ? '#2a1810' : '#3a5068'}
            />
          </mesh>
        ))
      )}
      <mesh position={[0, 0.85, 0.92]}>
        <planeGeometry args={[0.7, 1.4]} />
        <meshBasicMaterial color="#2a241c" />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[4.4, 0.4, 2.0]} />
        <Toon color="#4a4840" />
      </mesh>
    </group>
  );
}

function StreetLamp({ position }) {
  const light = useRef();
  const bulb = useRef();
  const seed = useMemo(() => (position[0] * 12.7 + position[2] * 5.3) % 100, [position]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker =
      0.85 +
      Math.sin(t * 7.3 + seed) * 0.08 +
      Math.sin(t * 19.1 + seed * 1.7) * 0.05 +
      (Math.sin(t * 43 + seed) > 0.92 ? -0.25 : 0);
    if (light.current) light.current.intensity = Math.max(0.15, flicker * 1.6);
    if (bulb.current?.material) {
      bulb.current.material.emissiveIntensity = 0.55 + flicker * 0.7;
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 4.0, 8]} />
        <Toon color="#3a3a38" />
      </mesh>
      <mesh position={[0, 4.05, 0.25]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.12, 0.12, 0.7]} />
        <Toon color="#3a3a38" />
      </mesh>
      <mesh ref={bulb} position={[0, 3.9, 0.55]}>
        <boxGeometry args={[0.35, 0.2, 0.35]} />
        <Toon color="#c9a227" emissive="#c9a227" emissiveIntensity={0.9} />
      </mesh>
      <pointLight
        ref={light}
        position={[0, 3.7, 0.55]}
        intensity={1.4}
        distance={11}
        color="#e8c060"
        decay={1.4}
      />
    </group>
  );
}

/** Ceiling hanging bulb — indoor flicker special */
function HangingBulb({ position, intensity = 1.1, distance = 8, color = '#e8a848' }) {
  const light = useRef();
  const bulb = useRef();
  const seed = useMemo(() => (position[0] * 9.1 + position[1] * 3.3 + position[2] * 7.7) % 100, [position]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker =
      0.75 +
      Math.sin(t * 5.6 + seed) * 0.12 +
      Math.sin(t * 17.4 + seed * 2.1) * 0.08 +
      (Math.sin(t * 31 + seed * 0.5) > 0.88 ? -0.35 : 0);
    if (light.current) light.current.intensity = Math.max(0.08, flicker * intensity);
    if (bulb.current?.material) {
      bulb.current.material.emissiveIntensity = 0.4 + flicker * 1.1;
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.7, 5]} />
        <Toon color="#2a2420" />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.08, 8]} />
        <Toon color="#4a4840" />
      </mesh>
      <mesh ref={bulb} position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <Toon color={color} emissive={color} emissiveIntensity={0.9} />
      </mesh>
      <pointLight
        ref={light}
        position={[0, -0.1, 0]}
        intensity={intensity}
        distance={distance}
        color={color}
        decay={1.5}
      />
    </group>
  );
}

function Dumpster({ position, yaw = 0 }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[1.8, 1.4, 1.1]} />
        <Toon color="#3a5a3a" />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[1.85, 0.12, 1.15]} />
        <Toon color="#2a4a2a" />
      </mesh>
      <mesh position={[0.7, 0.7, 0.58]}>
        <boxGeometry args={[0.15, 0.5, 0.08]} />
        <Toon color={DD.metal} />
      </mesh>
    </group>
  );
}

function Rubble({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow rotation={[0.2, 0.4, 0.1]}>
        <boxGeometry args={[0.7, 0.35, 0.5]} />
        <Toon color={DD.stone} />
      </mesh>
      <mesh position={[0.35, 0.12, 0.2]} rotation={[-0.3, 0.8, 0]}>
        <boxGeometry args={[0.4, 0.25, 0.35]} />
        <Toon color={DD.stoneDark} />
      </mesh>
      <mesh position={[-0.3, 0.1, -0.15]} rotation={[0.1, -0.5, 0.2]}>
        <boxGeometry args={[0.35, 0.2, 0.3]} />
        <Toon color={DD.stoneLite} />
      </mesh>
    </group>
  );
}

function doorsRoomsKey(state, map) {
  let key = '';
  const doors = map.DOORS || [];
  for (let i = 0; i < doors.length; i++) {
    const d = doors[i];
    if (state.doors[d.id]?.open) key += `d${d.id},`;
  }
  const rooms = state.rooms || {};
  for (const id in rooms) {
    if (rooms[id]?.open) key += `r${id},`;
  }
  return key;
}

export default function MapWorld() {
  const { stateRef } = useGameApi();
  const map = getActiveMap();
  const theme = map.theme || 'stone';
  const openKeyRef = useRef('');
  const [openKey, setOpenKey] = useState(() =>
    doorsRoomsKey(stateRef.current, map)
  );

  useFrame(() => {
    const next = doorsRoomsKey(stateRef.current, map);
    if (next === openKeyRef.current) return;
    openKeyRef.current = next;
    setOpenKey(next);
  });

  const doorOpenMap = useMemo(() => {
    void openKey; // invalidate when door/room open flags change (state lives on stateRef)
    const s = stateRef.current;
    const open = {};
    map.DOORS.forEach((d) => {
      open[d.id] = s.doors[d.id]?.open;
    });
    return open;
  }, [openKey, map, stateRef]);

  const roomOpen = useMemo(() => {
    void openKey; // invalidate when door/room open flags change (state lives on stateRef)
    const s = stateRef.current;
    const open = {};
    Object.keys(s.rooms).forEach((id) => {
      open[id] = s.rooms[id].open;
    });
    return open;
  }, [openKey, stateRef]);

  const floors = useMemo(() => map.FLOORS, [map]);

  const bound = Math.ceil(map.worldBound || 13.5) + 0.5;
  const outdoor = !!map.outdoor;

  return (
    <group>
      <Horizon theme={theme} outdoor={outdoor} bound={bound} />

      {!outdoor && (
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, map.WALL_HEIGHT, 0]}
        >
          <planeGeometry args={[bound * 2 + 2, bound * 2 + 2]} />
          <Toon
            color={DD.stone}
            emissive={DD.stoneDark}
            emissiveIntensity={0.12}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {floors.map((f, i) => (
        <Floor key={i} {...f} soft={!!map.hub} layer={f.layer ?? i} />
      ))}

      {(map.STAIRS || []).map((s, i) => (
        <StairsMesh key={`stair_${i}`} stair={s} />
      ))}

      {map.WALLS.map((w, i) => (
        <Wall key={i} {...w} theme={theme} material={w.material} soft={!!map.hub} />
      ))}
      <Baseboards bound={bound} outdoor={outdoor} />

      {map.DOORS.map((door) => (
        <DoorMesh key={door.id} door={door} open={doorOpenMap[door.id]} />
      ))}

      {map.WINDOWS.map((win) => (
        <WindowMesh key={win.id} win={win} />
      ))}

      {map.WALLBUYS.filter((wb) => roomOpen[wb.room]).map((wb) => (
        <WallBuyMesh key={wb.id} wb={wb} />
      ))}

      <MysteryBoxMesh boxDef={map.MYSTERY_BOX} />

      {(map.props || []).map((p, i) => (
        <MapProp key={i} prop={p} />
      ))}

      {(map.LIGHTS || []).map((l, i) => (
          <pointLight
            key={i}
            position={l.position}
            intensity={
              l.intensity *
              (map.hub ? 0.85 : outdoor ? 2.4 : 1.35)
            }
            distance={(l.distance || 10) * (map.hub ? 1.1 : outdoor ? 1.25 : 1.1)}
            color={l.color}
            decay={map.hub ? 2 : 1.15}
          />
        ))}
    </group>
  );
}
