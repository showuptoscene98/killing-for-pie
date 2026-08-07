import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { headAnchor, getBodyStyle } from '../style/BodyParts';

/** Cowboy extras — hat / boots / spurs / revolver (optional spinning cylinder) */

export function usesCowboyKit(o) {
  return !!(
    o?.showCowboyKit ||
    o?.id === 'cowboy' ||
    o?.showCowboyHat ||
    o?.showBoots ||
    o?.showSpurs ||
    o?.showRevolver
  );
}

export default function CowboyKit({
  o,
  scale = 1,
  spinChamber = false,
  hatY,
  headY = 1.52,
  style,
}) {
  const chamber = useRef();
  const hat = o.hat || '#3a2818';
  const hatBand = o.hatBand || o.accent || '#c42828';
  const boot = o.boot || '#2a1810';
  const spur = o.spur || '#c8b090';
  const gun = o.gun || '#2a2a30';
  const wood = o.gunGrip || '#5a3a20';
  const metal = o.gunMetal || '#8a9098';

  const showHat = !!o.showCowboyHat || o?.id === 'cowboy';
  const showBoots = !!o.showBoots || o?.id === 'cowboy';
  const showSpurs = !!o.showSpurs || o?.id === 'cowboy';
  const showRevolver = !!o.showRevolver || spinChamber;
  const hy = hatY ?? headAnchor(headY, style || getBodyStyle()).crownY + 0.09;

  useFrame((_, dt) => {
    if (!spinChamber || !chamber.current) return;
    chamber.current.rotation.z += dt * 4.5;
  });

  if (!showHat && !showBoots && !showSpurs && !showRevolver) return null;

  return (
    <group scale={scale}>
      {showHat && (
        <group position={[0, hy, 0]}>
          <mesh castShadow position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.2, 0.25, 0.26, 16]} />
            <meshStandardMaterial color={hat} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.38, 24]} />
            <meshStandardMaterial color={hat} roughness={0.92} side={2} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.255, 0.255, 0.04, 16]} />
            <meshStandardMaterial color={hatBand} roughness={0.7} />
          </mesh>
        </group>
      )}

      {showBoots && (
        <>
          <mesh position={[-0.12, 0.12, 0.04]} scale={[1, 1, 1.2]} castShadow>
            <capsuleGeometry args={[0.1, 0.08, 6, 12]} />
            <meshStandardMaterial color={boot} roughness={0.85} />
          </mesh>
          <mesh position={[0.12, 0.12, 0.04]} scale={[1, 1, 1.2]} castShadow>
            <capsuleGeometry args={[0.1, 0.08, 6, 12]} />
            <meshStandardMaterial color={boot} roughness={0.85} />
          </mesh>
          <mesh position={[-0.12, 0.06, 0.18]} scale={[1, 0.7, 1.1]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color={boot} roughness={0.85} />
          </mesh>
          <mesh position={[0.12, 0.06, 0.18]} scale={[1, 0.7, 1.1]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color={boot} roughness={0.85} />
          </mesh>
        </>
      )}

      {showSpurs && (
        <>
          <mesh position={[-0.12, 0.08, -0.12]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 0.02, 8]} />
            <meshStandardMaterial color={spur} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0.12, 0.08, -0.12]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 0.02, 8]} />
            <meshStandardMaterial color={spur} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[-0.12, 0.08, -0.16]}>
            <boxGeometry args={[0.04, 0.04, 0.06]} />
            <meshStandardMaterial color={spur} metalness={0.75} roughness={0.25} />
          </mesh>
          <mesh position={[0.12, 0.08, -0.16]}>
            <boxGeometry args={[0.04, 0.04, 0.06]} />
            <meshStandardMaterial color={spur} metalness={0.75} roughness={0.25} />
          </mesh>
        </>
      )}

      {showRevolver && (
        <group position={[0.42, 0.95, 0.12]} rotation={[0.15, 0.35, 0.4]}>
          <mesh position={[0, -0.08, 0]} castShadow>
            <boxGeometry args={[0.05, 0.12, 0.07]} />
            <meshStandardMaterial color={wood} roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.02, 0.02]} castShadow>
            <boxGeometry args={[0.055, 0.08, 0.1]} />
            <meshStandardMaterial color={gun} metalness={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.04, 0.14]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.02, 0.18, 8]} />
            <meshStandardMaterial color={metal} metalness={0.65} roughness={0.3} />
          </mesh>
          <group ref={chamber} position={[0, 0.03, 0.02]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 0.05, 8]} />
              <meshStandardMaterial color={metal} metalness={0.7} roughness={0.28} />
            </mesh>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.008, 0.008, 0.052, 5]} />
                  <meshStandardMaterial color="#1a1a20" metalness={0.4} roughness={0.5} />
                </mesh>
              );
            })}
          </group>
          <mesh position={[0, 0.07, -0.02]}>
            <boxGeometry args={[0.03, 0.04, 0.03]} />
            <meshStandardMaterial color={gun} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
}
