import Toon from '../style/Toon';
import { headAnchor, getBodyStyle } from '../style/BodyParts';

/** Samurai extras — kabuto, obi, haori flaps, oversized katana */

export function usesSamuraiKit(o) {
  return !!(o?.showSamuraiKit || o?.id === 'samurai' || o?.showKatana);
}

/**
 * Visual kit for Ryoma (and any samurai-flagged NPC).
 * Pass palette via `o` — torso / pants / accent / skin / sleeve / metal / wrap.
 */
export default function SamuraiKit({ o = {}, scale = 1, headY = 1.65, style }) {
  const lacquer = o.torso || '#2a1810';
  const hakama = o.pants || '#1a1420';
  const sash = o.accent || '#8a2020';
  const sleeve = o.sleeve || '#3a2818';
  const skin = o.skin || '#c49a6c';
  const metal = o.metal || '#c8c4b8';
  const blade = o.blade || '#e8ece8';
  const wrap = o.wrap || '#2a2018';
  const crest = o.crest || '#c42828';
  const kabutoY = headAnchor(headY, style || getBodyStyle()).crownY + 0.05;

  return (
    <group scale={scale}>
      <group position={[0, kabutoY, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.2, 10, 10]} />
          <Toon color={lacquer} />
        </mesh>
        <mesh position={[0, -0.1, -0.02]} castShadow>
          <cylinderGeometry args={[0.24, 0.28, 0.14, 10]} />
          <Toon color={lacquer} />
        </mesh>
        <mesh position={[0, 0.12, 0.16]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.06, 0.18, 0.04]} />
          <Toon color={crest} />
        </mesh>
        <mesh position={[0, 0.22, 0.14]}>
          <boxGeometry args={[0.14, 0.04, 0.03]} />
          <Toon color={metal} />
        </mesh>
      </group>

      <mesh position={[-0.32, 1.35, 0]} rotation={[0, 0, 0.45]} scale={[1, 1, 0.85]} castShadow>
        <capsuleGeometry args={[0.14, 0.08, 6, 12]} />
        <Toon color={sleeve} />
      </mesh>
      <mesh position={[0.32, 1.35, 0]} rotation={[0, 0, -0.45]} scale={[1, 1, 0.85]} castShadow>
        <capsuleGeometry args={[0.14, 0.08, 6, 12]} />
        <Toon color={sleeve} />
      </mesh>

      <mesh position={[0, 0.88, 0.02]} scale={[1, 1, 0.62]} castShadow>
        <capsuleGeometry args={[0.29, 0.001, 6, 14]} />
        <Toon color={sash} />
      </mesh>
      <mesh position={[0, 0.92, -0.2]} scale={[1, 1.1, 0.7]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <Toon color={sash} />
      </mesh>

      <mesh position={[-0.1, 0.55, 0.02]} scale={[1, 1, 0.85]} castShadow>
        <capsuleGeometry args={[0.13, 0.29, 6, 12]} />
        <Toon color={hakama} />
      </mesh>
      <mesh position={[0.1, 0.55, 0.02]} scale={[1, 1, 0.85]} castShadow>
        <capsuleGeometry args={[0.13, 0.29, 6, 12]} />
        <Toon color={hakama} />
      </mesh>

      <mesh position={[-0.12, 0.04, 0.06]}>
        <boxGeometry args={[0.16, 0.06, 0.28]} />
        <Toon color={wrap} />
      </mesh>
      <mesh position={[0.12, 0.04, 0.06]}>
        <boxGeometry args={[0.16, 0.06, 0.28]} />
        <Toon color={wrap} />
      </mesh>

      <group position={[0.48, 1.05, 0.08]} rotation={[0.15, 0.55, -0.85]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.055, 0.38, 0.055]} />
          <Toon color={wrap} />
        </mesh>
        <mesh position={[0, -0.12, 0.028]}>
          <boxGeometry args={[0.06, 0.04, 0.01]} />
          <Toon color={sash} />
        </mesh>
        <mesh position={[0, -0.22, 0.028]}>
          <boxGeometry args={[0.06, 0.04, 0.01]} />
          <Toon color={sash} />
        </mesh>
        <mesh position={[0, -0.32, 0.028]}>
          <boxGeometry args={[0.06, 0.04, 0.01]} />
          <Toon color={sash} />
        </mesh>
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.025, 8]} />
          <Toon color={metal} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.04, 0.05, 0.04]} />
          <Toon color={metal} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow>
          <boxGeometry args={[0.035, 1.35, 0.012]} />
          <Toon color={blade} />
        </mesh>
        <mesh position={[0, 1.42, 0]}>
          <coneGeometry args={[0.02, 0.12, 4]} />
          <Toon color={blade} />
        </mesh>
        <mesh position={[0.012, 0.72, 0]}>
          <boxGeometry args={[0.006, 1.3, 0.014]} />
          <Toon color="#f5f8f5" />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <boxGeometry args={[0.06, 0.05, 0.06]} />
          <Toon color={metal} />
        </mesh>
      </group>

      <mesh position={[0.42, 0.92, 0.12]} castShadow>
        <boxGeometry args={[0.11, 0.11, 0.11]} />
        <Toon color={skin} />
      </mesh>
    </group>
  );
}
