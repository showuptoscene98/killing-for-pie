/** Long hair / silhouette bits for female outfit gender */

import Toon from '../style/Toon';

const HAIR = {
  default: '#3a2a1c',
  chef: '#2a2218',
  delivery: '#2a2218',
  hazmat: null,
  bulgarian: '#2a1c14',
  maxGypsy: '#2a1c14',
  romanian: '#1a120c',
  mossad: '#1a1410',
  callCenter: '#2a2218',
};

export function hairColorForOutfit(o) {
  if (!o) return HAIR.default;
  if (
    o.id === 'hazmat' ||
    o.id === 'bulgarian' ||
    o.id === 'romanian' ||
    o.showHood ||
    o.showBald ||
    o.showHair === false
  ) {
    return null;
  }
  return HAIR[o.id] || HAIR.default;
}

/** Female: drop mustache / bald dome — long hair covers scalp (not on Bulgarian) */
export function applyGenderLook(o, gender = 'male') {
  if (!o || gender !== 'female') return o;
  if (o.id === 'bulgarian' || o.id === 'romanian' || o.id === 'maxGypsy' || o.showBald) {
    return {
      ...o,
      showMustache: false,
      showBeard: false,
      showBald: true,
      showHair: false,
    };
  }
  return {
    ...o,
    showMustache: false,
    showBald: false,
  };
}

/** Ponytail / side locks — skip under hazmat hood */
export default function FemaleHair({ o, y = 1.55 }) {
  const color = hairColorForOutfit(o);
  if (!color) return null;

  return (
    <group>
      {/* back fall */}
      <mesh position={[0, y - 0.1, -0.14]} castShadow>
        <capsuleGeometry args={[0.1, 0.28, 6, 12]} />
        <Toon color={color} />
      </mesh>
      {/* side locks */}
      <mesh position={[0.2, y - 0.08, 0.02]} rotation={[0.15, 0, 0.25]} castShadow>
        <capsuleGeometry args={[0.045, 0.18, 5, 10]} />
        <Toon color={color} />
      </mesh>
      <mesh position={[-0.2, y - 0.08, 0.02]} rotation={[0.15, 0, -0.25]} castShadow>
        <capsuleGeometry args={[0.045, 0.18, 5, 10]} />
        <Toon color={color} />
      </mesh>
      {/* scalp crown */}
      <mesh position={[0, y + 0.1, -0.02]} scale={[1.05, 0.55, 1]} castShadow>
        <sphereGeometry args={[0.17, 12, 10]} />
        <Toon color={color} />
      </mesh>
    </group>
  );
}

/**
 * Soft rounded bust — spheres instead of low-poly pyramids.
 * Still a strong silhouette; Material defaults to Toon for cel match.
 */
export function FemaleChest({ color = '#f5f2ea', y = 1.18, Material = Toon }) {
  const matProps =
    Material === 'meshStandardMaterial'
      ? { color, roughness: 0.72 }
      : { color };

  return (
    <group>
      <mesh position={[-0.12, y, 0.16]} castShadow>
        <sphereGeometry args={[0.14, 12, 10]} />
        <Material {...matProps} />
      </mesh>
      <mesh position={[0.12, y, 0.16]} castShadow>
        <sphereGeometry args={[0.14, 12, 10]} />
        <Material {...matProps} />
      </mesh>
      <mesh position={[0, y - 0.02, 0.12]} scale={[1, 0.55, 0.7]} castShadow>
        <sphereGeometry args={[0.1, 10, 8]} />
        <Material {...matProps} />
      </mesh>
    </group>
  );
}

/** Body box sizes by gender — still used as target extents for capsules */
export function bodyDims(gender) {
  const female = gender === 'female';
  return {
    female,
    torso: female ? [0.46, 0.72, 0.28] : [0.55, 0.75, 0.32],
    torsoY: female ? 1.04 : 1.05,
    chestY: female ? 1.18 : null,
    leg: female ? [0.15, 0.68, 0.18] : [0.18, 0.7, 0.2],
    legX: female ? 0.14 : 0.12,
    arm: female ? [0.12, 0.52, 0.12] : [0.14, 0.55, 0.14],
    armX: female ? 0.34 : 0.38,
    head: female ? [0.3, 0.32, 0.3] : [0.34, 0.34, 0.34],
    headY: female ? 1.52 : 1.55,
    hip: female ? [0.5, 0.16, 0.28] : null,
    hipY: 0.72,
  };
}
