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
      <mesh position={[0, y - 0.12, -0.12]} castShadow>
        <capsuleGeometry args={[0.07, 0.32, 5, 10]} />
        <Toon color={color} />
      </mesh>
      <mesh position={[0.18, y - 0.1, 0.02]} rotation={[0.15, 0, 0.25]} castShadow>
        <capsuleGeometry args={[0.035, 0.2, 4, 8]} />
        <Toon color={color} />
      </mesh>
      <mesh position={[-0.18, y - 0.1, 0.02]} rotation={[0.15, 0, -0.25]} castShadow>
        <capsuleGeometry args={[0.035, 0.2, 4, 8]} />
        <Toon color={color} />
      </mesh>
      <mesh position={[0, y + 0.1, -0.02]} castShadow>
        <capsuleGeometry args={[0.14, 0.04, 4, 10]} />
        <Toon color={color} />
      </mesh>
    </group>
  );
}

/** Soft sausage bust — short capsules, not balls. */
export function FemaleChest({ color = '#f5f2ea', y = 1.18, Material = Toon }) {
  const matProps =
    Material === 'meshStandardMaterial'
      ? { color, roughness: 0.72 }
      : { color };

  return (
    <group>
      <mesh position={[-0.1, y, 0.14]} rotation={[0.9, 0, -0.2]} castShadow>
        <capsuleGeometry args={[0.08, 0.06, 5, 10]} />
        <Material {...matProps} />
      </mesh>
      <mesh position={[0.1, y, 0.14]} rotation={[0.9, 0, 0.2]} castShadow>
        <capsuleGeometry args={[0.08, 0.06, 5, 10]} />
        <Material {...matProps} />
      </mesh>
    </group>
  );
}

/** Target extents for sausage capsules [width, height, depth] */
export function bodyDims(gender) {
  const female = gender === 'female';
  return {
    female,
    torso: female ? [0.34, 0.74, 0.28] : [0.36, 0.78, 0.3],
    torsoY: female ? 1.04 : 1.05,
    chestY: female ? 1.18 : null,
    leg: female ? [0.12, 0.7, 0.12] : [0.14, 0.72, 0.14],
    legX: female ? 0.12 : 0.11,
    arm: female ? [0.09, 0.52, 0.09] : [0.1, 0.55, 0.1],
    armX: female ? 0.3 : 0.32,
    head: female ? [0.24, 0.36, 0.24] : [0.26, 0.38, 0.26],
    headY: female ? 1.52 : 1.55,
    hip: female ? [0.36, 0.18, 0.26] : null,
    hipY: 0.72,
  };
}
