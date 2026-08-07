/** Long hair / silhouette bits for female outfit gender */

import Toon from '../style/Toon';
import { BodyPart, getBodyStyle } from '../style/BodyParts';

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
export default function FemaleHair({ o, y = 1.55, style }) {
  const color = hairColorForOutfit(o);
  if (!color) return null;
  const mode = style || getBodyStyle();

  return (
    <group>
      <BodyPart
        position={[0, y - 0.12, -0.12]}
        args={[0.14, 0.36, 0.14]}
        style={mode}
        castShadow
        matProps={{ color }}
      />
      <BodyPart
        position={[0.18, y - 0.1, 0.02]}
        rotation={[0.15, 0, 0.25]}
        args={[0.07, 0.24, 0.07]}
        style={mode}
        castShadow
        matProps={{ color }}
      />
      <BodyPart
        position={[-0.18, y - 0.1, 0.02]}
        rotation={[0.15, 0, -0.25]}
        args={[0.07, 0.24, 0.07]}
        style={mode}
        castShadow
        matProps={{ color }}
      />
      <BodyPart
        position={[0, y + 0.1, -0.02]}
        args={[0.28, 0.1, 0.22]}
        style={mode}
        castShadow
        matProps={{ color }}
      />
    </group>
  );
}

/** Soft bust — boxes in block mode, short capsules in lowpoly. */
export function FemaleChest({ color = '#f5f2ea', y = 1.18, Material = Toon, style }) {
  const mode = style || getBodyStyle();
  const matProps =
    Material === 'meshStandardMaterial'
      ? { color, roughness: 0.72 }
      : { color };

  if (mode === 'lowpoly') {
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

  return (
    <group>
      <mesh position={[-0.1, y, 0.14]} castShadow>
        <boxGeometry args={[0.14, 0.12, 0.12]} />
        <Material {...matProps} />
      </mesh>
      <mesh position={[0.1, y, 0.14]} castShadow>
        <boxGeometry args={[0.14, 0.12, 0.12]} />
        <Material {...matProps} />
      </mesh>
    </group>
  );
}

/** Target extents [width, height, depth] */
export function bodyDims(gender) {
  const female = gender === 'female';
  return {
    female,
    torso: female ? [0.48, 0.7, 0.28] : [0.52, 0.72, 0.3],
    torsoY: female ? 1.04 : 1.05,
    chestY: female ? 1.18 : null,
    leg: female ? [0.16, 0.68, 0.18] : [0.18, 0.7, 0.2],
    legX: female ? 0.12 : 0.12,
    arm: female ? [0.12, 0.48, 0.12] : [0.13, 0.5, 0.13],
    armX: female ? 0.34 : 0.36,
    head: female ? [0.3, 0.3, 0.3] : [0.32, 0.32, 0.32],
    headY: female ? 1.52 : 1.55,
    hip: female ? [0.42, 0.18, 0.26] : null,
    hipY: 0.72,
  };
}
