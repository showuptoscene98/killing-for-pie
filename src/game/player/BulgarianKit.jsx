/** Bulgarian-family extras — driven by mix-and-match flags on resolved outfit */

import Toon from '../style/Toon';

export function usesBulgarianKit(o) {
  return !!(o?.showBulgarianKit || o?.kit === 'bulgarian');
}

/** Face extras are relative to head center — NPCs use 1.65, players ~1.52 */
export default function BulgarianKit({ o, scale = 1, headY = 1.52 }) {
  const stripe = o.stripe || o.accent || '#e8e8f0';
  const silver = o.chain || '#c8d0d8';
  const cross = o.cross || silver;
  const stash = o.mustache || '#2a1c14';
  const beard = o.beard || stash;
  const cig = o.cigar || '#8a6a40';
  const glow = o.ember || '#ff6a20';
  const pocket = o.pocket || o.accent || '#c42828';

  const showStripes = !!o.showStripes;
  const showPocket = !!o.showPocket;
  const showChain = !!o.showChain;
  const showCross = !!o.showCross;
  const showMustache = !!o.showMustache;
  const showBeard = !!o.showBeard;
  const showCig = !!o.showCigarette;
  const fy = (dy) => headY + dy;

  if (
    !showStripes &&
    !showPocket &&
    !showChain &&
    !showCross &&
    !showMustache &&
    !showBeard &&
    !showCig
  ) {
    return null;
  }

  return (
    <group scale={scale}>
      {showStripes && (
        <>
          <mesh position={[0.22, 1.05, 0.17]}>
            <capsuleGeometry args={[0.02, 0.66, 4, 8]} />
            <Toon color={stripe} />
          </mesh>
          <mesh position={[0.28, 1.05, 0.17]}>
            <capsuleGeometry args={[0.02, 0.66, 4, 8]} />
            <Toon color={stripe} />
          </mesh>
          <mesh position={[0.18, 0.35, 0.11]}>
            <capsuleGeometry args={[0.018, 0.61, 4, 8]} />
            <Toon color={stripe} />
          </mesh>
          <mesh position={[0.24, 0.35, 0.11]}>
            <capsuleGeometry args={[0.018, 0.61, 4, 8]} />
            <Toon color={stripe} />
          </mesh>
        </>
      )}

      {showPocket && (
        <mesh position={[-0.14, 1.02, 0.17]} scale={[1, 1, 0.35]}>
          <sphereGeometry args={[0.09, 10, 8]} />
          <Toon color={pocket} emissive={pocket} emissiveIntensity={0.15} />
        </mesh>
      )}

      {showChain && (
        <mesh position={[0, 1.32, 0.14]} rotation={[0.35, 0, 0]}>
          <torusGeometry args={[0.12, 0.016, 8, 18]} />
          <Toon color={silver} emissive={silver} emissiveIntensity={0.2} />
        </mesh>
      )}

      {showCross && (
        <group position={[0, 1.16, 0.165]}>
          <mesh>
            <capsuleGeometry args={[0.016, 0.1, 4, 8]} />
            <Toon color={cross} emissive={cross} emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0, 0.025, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.016, 0.06, 4, 8]} />
            <Toon color={cross} emissive={cross} emissiveIntensity={0.25} />
          </mesh>
        </group>
      )}

      {showMustache && (
        <>
          <mesh position={[0, fy(-0.04), 0.17]} scale={[1.4, 0.35, 0.7]}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <Toon color={stash} />
          </mesh>
          <mesh
            position={[-0.08, fy(-0.055), 0.16]}
            rotation={[0, 0, 0.35]}
            scale={[1, 0.4, 0.6]}
          >
            <sphereGeometry args={[0.05, 8, 6]} />
            <Toon color={stash} />
          </mesh>
          <mesh
            position={[0.08, fy(-0.055), 0.16]}
            rotation={[0, 0, -0.35]}
            scale={[1, 0.4, 0.6]}
          >
            <sphereGeometry args={[0.05, 8, 6]} />
            <Toon color={stash} />
          </mesh>
        </>
      )}

      {showBeard && (
        <group>
          <mesh position={[0, fy(-0.055), 0.155]} scale={[1.15, 0.7, 0.85]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <Toon color={beard} />
          </mesh>
          <mesh
            position={[-0.11, fy(-0.04), 0.1]}
            rotation={[0, 0, 0.2]}
            scale={[0.7, 1, 0.8]}
          >
            <sphereGeometry args={[0.075, 8, 8]} />
            <Toon color={beard} />
          </mesh>
          <mesh
            position={[0.11, fy(-0.04), 0.1]}
            rotation={[0, 0, -0.2]}
            scale={[0.7, 1, 0.8]}
          >
            <sphereGeometry args={[0.075, 8, 8]} />
            <Toon color={beard} />
          </mesh>
          <mesh position={[0, fy(-0.12), 0.15]} scale={[0.85, 0.7, 0.8]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <Toon color={beard} />
          </mesh>
        </group>
      )}

      {showCig && (
        <group position={[0.02, fy(-0.05), 0.2]} rotation={[1.35, 0.08, 0.12]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.035, 10]} />
            <Toon color="#f0e8d8" />
          </mesh>
          <mesh position={[0, 0.085, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.13, 10]} />
            <Toon color={cig} />
          </mesh>
          <mesh position={[0, 0.155, 0]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <Toon color={glow} emissive={glow} emissiveIntensity={1.4} />
          </mesh>
        </group>
      )}
    </group>
  );
}
