import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#3a3428" roughness={1} />
      </mesh>
      {/* dirt path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2]} receiveShadow>
        <planeGeometry args={[4, 28]} />
        <meshStandardMaterial color="#5a4a38" roughness={1} />
      </mesh>
    </group>
  );
}

function Tent({ position, color = '#c45a2a', rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <coneGeometry args={[1.4, 1.8, 4]} />
        <meshStandardMaterial color={color} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.15, 0.7, 4]} />
        <meshStandardMaterial color="#8a6038" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

function FactoryBuilding() {
  return (
    <group position={[0, 0, -6]}>
      {/* Main shed */}
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 3.2, 5]} />
        <meshStandardMaterial color="#6a5a48" roughness={0.8} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 3.5, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[10.6, 0.25, 5.6]} />
        <meshStandardMaterial color="#8a3a28" roughness={0.7} />
      </mesh>
      {/* Chimney */}
      <mesh position={[-3.2, 4.2, -1]} castShadow>
        <boxGeometry args={[0.9, 2.2, 0.9]} />
        <meshStandardMaterial color="#4a4038" roughness={0.75} />
      </mesh>
      {/* Windows */}
      {[-3, 0, 3].map((x) => (
        <mesh key={x} position={[x, 1.8, 2.52]}>
          <planeGeometry args={[1.4, 1.1]} />
          <meshStandardMaterial
            color="#ffcc66"
            emissive="#ffaa44"
            emissiveIntensity={0.7}
            roughness={0.4}
          />
        </mesh>
      ))}
      {/* Door */}
      <mesh position={[0, 0.9, 2.52]}>
        <planeGeometry args={[1.6, 1.8]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
      </mesh>
      {/* Sign board */}
      <mesh position={[0, 3.9, 2.4]}>
        <boxGeometry args={[4.2, 0.7, 0.12]} />
        <meshStandardMaterial color="#2a2010" />
      </mesh>
    </group>
  );
}

function SmokePuff({ delay = 0 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime + delay) % 4;
    const k = t / 4;
    ref.current.position.y = 5.2 + k * 3.5;
    ref.current.position.x = -3.2 + Math.sin(t * 1.5) * 0.4;
    ref.current.scale.setScalar(0.3 + k * 1.4);
    ref.current.material.opacity = 0.45 * (1 - k);
  });
  return (
    <mesh ref={ref} position={[-3.2, 5.2, -7]}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshStandardMaterial color="#d8d0c0" transparent opacity={0.4} roughness={1} />
    </mesh>
  );
}

function ConveyorPie({ offset }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * 0.7 + offset) % 1;
    ref.current.position.x = -3.5 + t * 7;
    ref.current.position.y = 0.85 + Math.sin(clock.elapsedTime * 6 + offset * 10) * 0.03;
    ref.current.rotation.y = clock.elapsedTime * 1.5 + offset;
  });
  return (
    <group ref={ref} position={[0, 0.85, -3.6]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 12]} />
        <meshStandardMaterial color="#e8e0d0" />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.22, 0.24, 0.1, 12]} />
        <meshStandardMaterial color="#c45a20" roughness={0.5} emissive="#4a1808" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function ConveyorBelt() {
  const rollers = useRef([]);
  useFrame((_, dt) => {
    rollers.current.forEach((r) => {
      if (r) r.rotation.z += dt * 2.5;
    });
  });
  return (
    <group position={[0, 0, -3.6]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[8, 0.15, 1.1]} />
        <meshStandardMaterial color="#2a2420" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh
        ref={(el) => {
          rollers.current[0] = el;
        }}
        position={[-4.2, 0.4, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.35, 0.35, 1.2, 10]} />
        <meshStandardMaterial color="#5a5048" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh
        ref={(el) => {
          rollers.current[1] = el;
        }}
        position={[4.2, 0.4, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.35, 0.35, 1.2, 10]} />
        <meshStandardMaterial color="#5a5048" metalness={0.5} roughness={0.4} />
      </mesh>
      {[0, 0.25, 0.5, 0.75].map((o) => (
        <ConveyorPie key={o} offset={o} />
      ))}
    </group>
  );
}

function SpinningPieSign() {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.8;
  });
  return (
    <group ref={ref} position={[5.5, 2.8, 1]}>
      <mesh>
        <boxGeometry args={[0.12, 2.2, 0.12]} />
        <meshStandardMaterial color="#6a5040" />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.7, 0.75, 0.25, 16]} />
        <meshStandardMaterial color="#d45a28" emissive="#802010" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#f5f0e8" />
      </mesh>
    </group>
  );
}

function GoofyZombie({ seed = 0, pathRadius = 8 }) {
  const ref = useRef();
  const phase = useMemo(() => seed * 1.7, [seed]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * 0.35 + phase;
    const x = Math.cos(t) * pathRadius;
    const z = Math.sin(t) * pathRadius * 0.55 + 4;
    ref.current.position.set(x, Math.sin(clock.elapsedTime * 5 + phase) * 0.08, z);
    ref.current.rotation.y = -t + Math.PI / 2;
    // silly lean
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 3 + phase) * 0.15;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.45, 0.9, 0.3]} />
        <meshStandardMaterial color="#5a7a4a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial color="#6a8a58" roughness={0.85} />
      </mesh>
      <mesh position={[-0.08, 1.58, 0.18]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#ff3333" />
      </mesh>
      <mesh position={[0.08, 1.58, 0.18]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#ff3333" />
      </mesh>
      {/* arms out goofy */}
      <mesh position={[-0.4, 1.0, 0]} rotation={[0, 0, 0.8]}>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color="#5a7a4a" />
      </mesh>
      <mesh position={[0.4, 1.0, 0]} rotation={[0, 0, -0.8]}>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color="#5a7a4a" />
      </mesh>
    </group>
  );
}

function Campfire() {
  const flame = useRef();
  useFrame(({ clock }) => {
    if (!flame.current) return;
    const s = 0.8 + Math.sin(clock.elapsedTime * 12) * 0.15 + Math.sin(clock.elapsedTime * 7) * 0.1;
    flame.current.scale.set(s, 1 + Math.sin(clock.elapsedTime * 9) * 0.2, s);
    flame.current.rotation.y = clock.elapsedTime * 2;
  });
  return (
    <group position={[-5.5, 0, 3]}>
      <mesh position={[0.3, 0.08, 0]} rotation={[0.2, 0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#5a3a20" />
      </mesh>
      <mesh position={[-0.25, 0.08, 0.15]} rotation={[-0.15, -0.3, 0.1]}>
        <cylinderGeometry args={[0.08, 0.08, 0.65, 6]} />
        <meshStandardMaterial color="#4a3018" />
      </mesh>
      <mesh ref={flame} position={[0, 0.45, 0]}>
        <coneGeometry args={[0.28, 0.7, 6]} />
        <meshStandardMaterial
          color="#ff6622"
          emissive="#ff4400"
          emissiveIntensity={1.2}
          transparent
          opacity={0.9}
        />
      </mesh>
      <pointLight position={[0, 0.8, 0]} intensity={2.2} distance={14} color="#ff9944" />
    </group>
  );
}

function Crates() {
  return (
    <group>
      <mesh position={[4.5, 0.4, -2]} castShadow rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.9, 0.8, 0.9]} />
        <meshStandardMaterial color="#b8956a" roughness={0.85} />
      </mesh>
      <mesh position={[5.2, 0.35, -1.2]} castShadow rotation={[0, -0.3, 0]}>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial color="#9a7050" roughness={0.85} />
      </mesh>
      <mesh position={[-6, 0.55, -1]} castShadow>
        <cylinderGeometry args={[0.4, 0.42, 1.1, 12]} />
        <meshStandardMaterial color="#c45c2a" metalness={0.25} roughness={0.55} />
      </mesh>
    </group>
  );
}

function OrbitCamera() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime * 0.12;
    const r = 16;
    const x = Math.sin(t) * r;
    const z = Math.cos(t) * r * 0.85 + 2;
    const y = 6.5 + Math.sin(t * 0.7) * 0.8;
    camera.position.set(x, y, z);
    camera.lookAt(0, 1.5, -2);
  });
  return null;
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#1a1510']} />
      <fog attach="fog" args={['#1a1510', 22, 48]} />
      <ambientLight intensity={0.55} color="#6a5a48" />
      <hemisphereLight args={['#c4a878', '#2a2010', 0.7]} />
      <directionalLight
        position={[6, 12, 4]}
        intensity={1.05}
        color="#ffd0a0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 5, 2]} intensity={0.9} distance={28} color="#e8b060" />
      <OrbitCamera />
      <Ground />
      <FactoryBuilding />
      <ConveyorBelt />
      <SpinningPieSign />
      <Campfire />
      <Crates />
      <Tent position={[-8, 0, 5]} color="#6a2a1a" rotation={0.3} />
      <Tent position={[-9.5, 0, 7.5]} color="#2a3a3a" rotation={-0.4} />
      <Tent position={[7.5, 0, 6]} color="#4a3424" rotation={0.6} />
      <SmokePuff delay={0} />
      <SmokePuff delay={1.3} />
      <SmokePuff delay={2.6} />
      <GoofyZombie seed={0} pathRadius={9} />
      <GoofyZombie seed={1} pathRadius={10} />
      <GoofyZombie seed={2} pathRadius={7.5} />
    </>
  );
}

/** Full-bleed animated pie-factory / camp diorama behind menu UI */
export default function MenuBackdrop() {
  return (
    <div className="menu-backdrop" aria-hidden>
      <Canvas
        shadows
        camera={{ fov: 45, near: 0.1, far: 80, position: [14, 7, 12] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
