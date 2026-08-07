import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Toon from '../style/Toon';
import { DD } from '../style/theme';
import { ROUND } from '../constants';

const DEFAULT_PALETTE = {
  body: DD.sick,
  bodyDark: DD.rot,
  head: DD.sickLite,
  hit: DD.bloodLite,
};

/** Romanian gypsy stereotype — colorful tracksuit, gold, mustache (cartoon zombie) */
const GYPSY_PALETTES = [
  {
    body: '#2a5a9a',
    bodyDark: '#1a3a6a',
    head: '#c49a6c',
    hit: DD.bloodLite,
    stripe: '#f0e8d0',
    pants: '#1a2a4a',
    gold: '#e8c84a',
    stash: '#2a1c14',
  },
  {
    body: '#8a2030',
    bodyDark: '#5a1020',
    head: '#b89068',
    hit: DD.bloodLite,
    stripe: '#e8d080',
    pants: '#3a1020',
    gold: '#f0d060',
    stash: '#1a1008',
  },
  {
    body: '#2a7a40',
    bodyDark: '#1a5028',
    head: '#c4a070',
    hit: DD.bloodLite,
    stripe: '#f5f0e0',
    pants: '#1a4028',
    gold: '#d4b040',
    stash: '#2a1c14',
  },
  {
    body: '#6a3a8a',
    bodyDark: '#402058',
    head: '#b88860',
    hit: DD.bloodLite,
    stripe: '#e0c060',
    pants: '#2a1840',
    gold: '#e8c84a',
    stash: '#1a1008',
  },
];

/** Bipedal cow zombies — brown / spotted / pale hide */
const COW_PALETTES = [
  {
    body: '#5a4030',
    bodyDark: '#3a2818',
    head: '#6a4a38',
    hit: DD.bloodLite,
    spot: '#2a1c14',
    horn: '#d8c8a0',
    snout: '#c89098',
    udder: '#c8a0a8',
  },
  {
    body: '#e8e0d0',
    bodyDark: '#c8c0b0',
    head: '#f0e8d8',
    hit: DD.bloodLite,
    spot: '#2a2420',
    horn: '#e8d8b0',
    snout: '#d898a0',
    udder: '#e8b0b8',
  },
  {
    body: '#3a2a20',
    bodyDark: '#1a140e',
    head: '#4a3830',
    hit: DD.bloodLite,
    spot: '#e8e0d0',
    horn: '#c8b890',
    snout: '#a87880',
    udder: '#b88890',
  },
  {
    body: '#8a6848',
    bodyDark: '#5a4030',
    head: '#9a7858',
    hit: DD.bloodLite,
    spot: '#2a2018',
    horn: '#d0c098',
    snout: '#c88890',
    udder: '#d0a0a8',
  },
];

/** Undead farmers — denim overalls, flannel, straw hat */
const FARMER_PALETTES = [
  {
    body: '#3a5a8a',
    bodyDark: '#2a4060',
    head: '#c49a6c',
    hit: DD.bloodLite,
    shirt: '#8a3030',
    hat: '#c8a848',
    strap: '#c9a227',
  },
  {
    body: '#3a4a6a',
    bodyDark: '#2a3448',
    head: '#b88860',
    hit: DD.bloodLite,
    shirt: '#3a5a38',
    hat: '#b89840',
    strap: '#d4b040',
  },
  {
    body: '#2a4868',
    bodyDark: '#1a3048',
    head: '#c4a070',
    hit: DD.bloodLite,
    shirt: '#6a3a28',
    hat: '#d0b050',
    strap: '#e8c84a',
  },
];

function paletteFor(z) {
  const seed = z?.variantSeed ?? z?.id ?? 0;
  if (z?.variant === 'gypsy') {
    const i = seed % GYPSY_PALETTES.length;
    return GYPSY_PALETTES[Math.abs(i)];
  }
  if (z?.variant === 'cow') {
    const i = seed % COW_PALETTES.length;
    return COW_PALETTES[Math.abs(i)];
  }
  if (z?.variant === 'farmer') {
    const i = seed % FARMER_PALETTES.length;
    return FARMER_PALETTES[Math.abs(i)];
  }
  return DEFAULT_PALETTE;
}

/** Stable per-zombie gait quirks from seed */
function gaitFromSeed(seed) {
  const s = Math.abs(seed | 0) || 1;
  const r = (n) => {
    const x = (s * (n * 1103515245 + 12345)) >>> 0;
    return x / 4294967296;
  };
  return {
    limpLeft: r(1) > 0.52,
    reachRight: r(2) > 0.45,
    legAmp: 0.52 + r(3) * 0.38,
    armAmp: 0.38 + r(4) * 0.4,
    hunch: 0.1 + r(5) * 0.2,
    sway: 0.035 + r(6) * 0.055,
    kneeLag: 0.4 + r(7) * 0.45,
    shoulderDrop: 0.12 + r(8) * 0.2,
    idleMul: 0.65 + r(9) * 0.7,
    stride: 0.85 + r(10) * 0.35,
  };
}

/** Jointed low-poly zombie — staggered limbs, limp/reach variance */
export default function ZombieModel({ zombiesRef, index }) {
  const root = useRef();
  const torso = useRef();
  const head = useRef();
  const leftUpper = useRef();
  const leftFore = useRef();
  const rightUpper = useRef();
  const rightFore = useRef();
  const leftThigh = useRef();
  const leftShin = useRef();
  const rightThigh = useRef();
  const rightShin = useRef();
  const bodyMat = useRef();
  const headMat = useRef();
  const extras = useRef();
  const bracelet = useRef();
  const cowExtras = useRef();
  const farmerExtras = useRef();
  const hitLit = useRef(false);
  const lastKey = useRef('');
  const gaitRef = useRef(null);

  useFrame(() => {
    const z = zombiesRef.current[index];
    if (!root.current) return;

    if (!z) {
      root.current.visible = false;
      return;
    }

    root.current.visible = true;
    const sink = z.dead ? (1 - Math.max(0, z.deathTimer) / 0.6) * 1.2 : 0;
    const y = (z.y || 0) - sink;
    root.current.position.set(z.x, y, z.z);
    root.current.rotation.order = 'YXZ';
    root.current.rotation.set(z.dead ? Math.PI / 2 : 0, z.yaw, 0);

    const pal = paletteFor(z);
    const seed = z.variantSeed ?? z.id ?? 0;
    const key = `${z.variant || 'default'}:${seed}`;
    if (lastKey.current !== key) {
      lastKey.current = key;
      hitLit.current = false;
      gaitRef.current = gaitFromSeed(seed);
      if (bodyMat.current) bodyMat.current.color.set(pal.body);
      if (headMat.current) headMat.current.color.set(pal.head);
      if (extras.current) extras.current.visible = z.variant === 'gypsy';
      if (bracelet.current) bracelet.current.visible = z.variant === 'gypsy';
      if (cowExtras.current) cowExtras.current.visible = z.variant === 'cow';
      if (farmerExtras.current) farmerExtras.current.visible = z.variant === 'farmer';
    }

    const gait = gaitRef.current || gaitFromSeed(seed);

    const hit = z.hitFlash > 0;
    if (hit !== hitLit.current) {
      hitLit.current = hit;
      if (bodyMat.current) {
        bodyMat.current.emissiveIntensity = hit ? 0.7 : 0.12;
        bodyMat.current.color.set(hit ? pal.hit : pal.body);
      }
      if (headMat.current) {
        headMat.current.emissiveIntensity = hit ? 0.7 : 0.1;
        headMat.current.color.set(hit ? pal.hit : pal.head);
      }
    }

    if (z.dead) return;

    const phase = (z.walkPhase || 0) * gait.stride;
    const climbing = z.phase === 'climb';
    const tearing = z.phase === 'tear';
    const attacking = z.attackT != null;
    const moving = z.moving && !tearing && !attacking;

    const limpMulL = gait.limpLeft ? 0.55 : 1;
    const limpMulR = gait.limpLeft ? 1 : 0.62;

    let hipAmp = 0.12;
    let kneeAmp = 0.2;
    let armAmp = 0.12;
    let elbowAmp = 0.15;
    let bob = 0;
    let reachL = 0.35;
    let reachR = 0.35;
    let hunch = gait.hunch * 0.35;
    let sway = 0;
    let twist = 0;
    let headNod = 0;
    let headTilt = 0;
    let lArmSwing = 0;
    let rArmSwing = 0;
    let lElbowExtra = 0;
    let rElbowExtra = 0;
    let lArmZ = 0;
    let rArmZ = 0;

    if (attacking) {
      const windup = ROUND.attackWindup;
      const recover = ROUND.attackRecover;
      const t = z.attackT;
      let pull = 0;
      let slam = 0;
      if (t < windup) {
        const u = t / windup;
        const e = u * u;
        pull = e;
        slam = 0;
      } else {
        const u = Math.min(1, (t - windup) / Math.max(0.001, recover));
        pull = Math.max(0, 1 - u * 2.2);
        // Snap forward then ease out
        slam = u < 0.22 ? u / 0.22 : Math.max(0, 1 - (u - 0.22) / 0.78);
      }

      hipAmp = 0.08;
      kneeAmp = 0.15;
      bob = slam * 0.04;
      hunch = gait.hunch * 0.4 + pull * 0.15 + slam * 0.35;
      sway = (slam - pull * 0.5) * 0.12;
      twist = (slam - pull) * 0.35;
      headNod = pull * -0.15 + slam * 0.25;
      headTilt = twist * 0.4;

      // Dominant right claw swing; left reaches / balances
      reachL = 0.55 + pull * 0.35 + slam * 0.55;
      reachR = 0.25 - pull * 1.15 + slam * 2.05;
      lArmSwing = pull * -0.2 + slam * 0.15;
      rArmSwing = 0;
      lElbowExtra = 0.25 + pull * 0.2;
      rElbowExtra = 0.15 + pull * 0.85 - slam * 0.35;
      lArmZ = 0.35 + pull * 0.15;
      rArmZ = -(0.15 + pull * 0.55 + slam * 0.25);
    } else if (climbing) {
      hipAmp = 0.45 * gait.legAmp;
      kneeAmp = 0.85;
      armAmp = 0.75 * gait.armAmp;
      elbowAmp = 0.9;
      reachL = 1.25;
      reachR = 1.25;
      bob = Math.sin(phase * 0.5) * 0.045;
      hunch = -0.2;
      sway = Math.sin(phase) * 0.06;
      headNod = Math.sin(phase * 0.7) * 0.12;
    } else if (tearing) {
      hipAmp = 0.12;
      kneeAmp = 0.25;
      armAmp = 0.95 * gait.armAmp;
      elbowAmp = 0.7;
      reachL = 1.05;
      reachR = 1.05;
      bob = Math.sin(phase) * 0.03;
      hunch = 0.22;
      sway = Math.sin(phase * 1.3) * 0.05;
      headNod = Math.sin(phase * 2) * 0.18;
    } else if (moving) {
      hipAmp = 0.58 * gait.legAmp;
      kneeAmp = 0.95;
      armAmp = 0.55 * gait.armAmp;
      elbowAmp = 0.55;
      reachL = gait.reachRight ? 0.28 : 0.95;
      reachR = gait.reachRight ? 1.05 : 0.32;
      bob = Math.abs(Math.sin(phase)) * 0.055;
      hunch = gait.hunch;
      sway = Math.sin(phase) * gait.sway;
      twist = Math.sin(phase) * 0.09;
      headNod = Math.sin(phase * 2) * 0.06;
      headTilt = Math.sin(phase * 0.5) * 0.05;
    } else {
      const idle = gait.idleMul;
      hipAmp = 0.06 * idle;
      kneeAmp = 0.12;
      armAmp = 0.1 * idle;
      elbowAmp = 0.18;
      reachL = gait.reachRight ? 0.4 : 0.75;
      reachR = gait.reachRight ? 0.8 : 0.42;
      bob = Math.sin(phase * 0.35) * 0.012;
      hunch = gait.hunch * 0.7;
      sway = Math.sin(phase * 0.4) * 0.02;
      headNod = Math.sin(phase * 0.55) * 0.04;
      headTilt = Math.sin(phase * 0.3) * 0.03;
    }

    const sin = Math.sin(phase);
    const kneePhase = phase - gait.kneeLag;

    const lHip = sin * hipAmp * limpMulL;
    const rHip = -sin * hipAmp * limpMulR;
    const lKnee =
      Math.max(0, Math.sin(kneePhase)) * kneeAmp * limpMulL +
      (gait.limpLeft ? 0.2 : 0.05);
    const rKnee =
      Math.max(0, Math.sin(kneePhase + Math.PI)) * kneeAmp * limpMulR +
      (gait.limpLeft ? 0.05 : 0.18);

    if (leftThigh.current) {
      leftThigh.current.rotation.x = lHip;
      leftThigh.current.rotation.z = moving ? 0.04 : 0.02;
    }
    if (rightThigh.current) {
      rightThigh.current.rotation.x = rHip;
      rightThigh.current.rotation.z = moving ? -0.04 : -0.02;
    }
    if (leftShin.current) leftShin.current.rotation.x = lKnee;
    if (rightShin.current) rightShin.current.rotation.x = rKnee;

    const drop = gait.shoulderDrop;
    if (!attacking) {
      lArmSwing = -sin * armAmp * (gait.reachRight ? 0.45 : 1);
      rArmSwing = sin * armAmp * (gait.reachRight ? 1 : 0.45);
      lArmZ = 0.22 + drop * 0.3;
      rArmZ = -(0.22 + drop * 0.3);
    }
    const lElbow =
      Math.max(0.15, 0.35 + Math.sin(phase + 0.6) * elbowAmp * 0.5) +
      (gait.reachRight ? 0.1 : 0.35) +
      lElbowExtra;
    const rElbow =
      Math.max(0.15, 0.35 + Math.sin(phase + 0.6 + Math.PI) * elbowAmp * 0.5) +
      (gait.reachRight ? 0.4 : 0.1) +
      rElbowExtra;

    if (leftUpper.current) {
      leftUpper.current.rotation.x = reachL + lArmSwing;
      leftUpper.current.rotation.z = lArmZ;
      leftUpper.current.rotation.y = twist * 0.4;
    }
    if (rightUpper.current) {
      rightUpper.current.rotation.x = reachR + rArmSwing;
      rightUpper.current.rotation.z = rArmZ;
      rightUpper.current.rotation.y = -twist * 0.4;
    }
    if (leftFore.current) leftFore.current.rotation.x = lElbow;
    if (rightFore.current) rightFore.current.rotation.x = rElbow;

    if (torso.current) {
      torso.current.position.y = bob;
      torso.current.rotation.z = sway;
      torso.current.rotation.x =
        hunch + (climbing ? -0.12 : tearing ? 0.12 : attacking ? 0.08 : 0);
      torso.current.rotation.y = twist;
    }

    if (head.current) {
      head.current.rotation.x = headNod - hunch * 0.35;
      head.current.rotation.z = headTilt + sway * 0.5;
      head.current.rotation.y = -twist * 0.6;
    }
  });

  const pal0 = DEFAULT_PALETTE;

  return (
    <group ref={root} visible={false}>
      <group ref={torso}>
        {/* Sausage torso — long shaft, modest radius */}
        <mesh position={[0, 1.02, 0]} scale={[1, 1, 0.82]} castShadow>
          <capsuleGeometry args={[0.17, 0.42, 6, 12]} />
          <Toon
            ref={bodyMat}
            color={pal0.body}
            emissive={DD.rot}
            emissiveIntensity={0.12}
          />
        </mesh>

        <mesh position={[0, 0.58, 0]} scale={[1, 1, 0.8]} castShadow>
          <capsuleGeometry args={[0.15, 0.1, 5, 10]} />
          <Toon color={pal0.bodyDark} />
        </mesh>

        <group ref={head} position={[0, 1.52, 0]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <capsuleGeometry args={[0.13, 0.12, 5, 12]} />
            <Toon
              ref={headMat}
              color={pal0.head}
              emissive={DD.rot}
              emissiveIntensity={0.1}
            />
          </mesh>
          <mesh position={[0, -0.08, 0.02]}>
            <capsuleGeometry args={[0.07, 0.04, 4, 8]} />
            <Toon color={pal0.bodyDark} />
          </mesh>
          <mesh position={[-0.07, 0.12, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.028, 0.01, 3, 8]} />
            <Toon color={DD.accent} emissive={DD.accent} emissiveIntensity={1.6} />
          </mesh>
          <mesh position={[0.07, 0.12, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.028, 0.01, 3, 8]} />
            <Toon color={DD.accent} emissive={DD.accent} emissiveIntensity={1.6} />
          </mesh>
        </group>

        <group ref={extras} visible={false}>
          <mesh position={[0.2, 1.0, 0.16]}>
            <boxGeometry args={[0.04, 0.65, 0.02]} />
            <Toon color="#f0e8d0" />
          </mesh>
          <mesh position={[0.26, 1.0, 0.16]}>
            <boxGeometry args={[0.04, 0.65, 0.02]} />
            <Toon color="#f0e8d0" />
          </mesh>
          <mesh position={[0, 1.26, 0.13]} rotation={[0.3, 0, 0]}>
            <torusGeometry args={[0.13, 0.018, 6, 14]} />
            <Toon color="#e8c84a" emissive="#e8c84a" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0, 1.46, 0.17]} scale={[1, 0.4, 0.7]}>
            <sphereGeometry args={[0.1, 8, 6]} />
            <Toon color="#2a1c14" />
          </mesh>
          <mesh position={[-0.07, 1.445, 0.16]} rotation={[0, 0, 0.35]} scale={[1, 0.45, 0.6]}>
            <sphereGeometry args={[0.045, 6, 6]} />
            <Toon color="#2a1c14" />
          </mesh>
          <mesh position={[0.07, 1.445, 0.16]} rotation={[0, 0, -0.35]} scale={[1, 0.45, 0.6]}>
            <sphereGeometry args={[0.045, 6, 6]} />
            <Toon color="#2a1c14" />
          </mesh>
          <mesh position={[0, 1.7, 0]} rotation={[-0.2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.2, 0.08, 14]} />
            <Toon color="#c43c2c" />
          </mesh>
          <mesh position={[0.13, 1.6, -0.1]} rotation={[0.4, 0.5, 0.3]} scale={[0.35, 1, 1]}>
            <capsuleGeometry args={[0.06, 0.08, 4, 8]} />
            <Toon color="#c43c2c" />
          </mesh>
        </group>

        {/* Bipedal cow — horns, snout, ears, spots, udder (still walks on two legs) */}
        <group ref={cowExtras} visible={false}>
          <mesh position={[-0.16, 1.15, 0.17]} scale={[1, 1, 0.35]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <Toon color="#2a1c14" />
          </mesh>
          <mesh position={[0.18, 0.95, 0.17]} scale={[1, 1, 0.35]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <Toon color="#2a1c14" />
          </mesh>
          <mesh position={[0.1, 1.18, -0.16]} scale={[1, 1, 0.35]}>
            <sphereGeometry args={[0.095, 8, 8]} />
            <Toon color="#2a1c14" />
          </mesh>
          {/* Snout */}
          <mesh position={[0, 1.5, 0.28]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.14, 4, 8]} />
            <Toon color="#c89098" />
          </mesh>
          <mesh position={[-0.05, 1.5, 0.42]}>
            <capsuleGeometry args={[0.018, 0.01, 3, 6]} />
            <Toon color="#2a1c14" />
          </mesh>
          <mesh position={[0.05, 1.5, 0.42]}>
            <capsuleGeometry args={[0.018, 0.01, 3, 6]} />
            <Toon color="#2a1c14" />
          </mesh>
          {/* Horns */}
          <mesh position={[-0.18, 1.78, 0]} rotation={[0.2, 0, -0.55]} castShadow>
            <coneGeometry args={[0.05, 0.28, 10]} />
            <Toon color="#d8c8a0" />
          </mesh>
          <mesh position={[0.18, 1.78, 0]} rotation={[0.2, 0, 0.55]} castShadow>
            <coneGeometry args={[0.05, 0.28, 10]} />
            <Toon color="#d8c8a0" />
          </mesh>
          {/* Ears */}
          <mesh position={[-0.22, 1.62, 0]} rotation={[0, 0, 0.4]} scale={[1, 0.75, 0.35]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <Toon color="#6a4a38" />
          </mesh>
          <mesh position={[0.22, 1.62, 0]} rotation={[0, 0, -0.4]} scale={[1, 0.75, 0.35]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <Toon color="#6a4a38" />
          </mesh>
          {/* Udder */}
          <mesh position={[0, 0.55, 0.12]}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <Toon color="#c8a0a8" />
          </mesh>
          {/* Cow tail */}
          <mesh position={[0, 0.95, -0.28]} rotation={[0.6, 0, 0]}>
            <capsuleGeometry args={[0.035, 0.28, 4, 8]} />
            <Toon color="#5a4030" />
          </mesh>
          <mesh position={[0, 0.72, -0.42]}>
            <sphereGeometry args={[0.07, 6, 6]} />
            <Toon color="#2a1c14" />
          </mesh>
        </group>

        {/* Farmer — overalls straps, straw hat, pitchfork */}
        <group ref={farmerExtras} visible={false}>
          <mesh position={[-0.12, 1.15, 0.16]}>
            <boxGeometry args={[0.08, 0.55, 0.04]} />
            <Toon color="#c9a227" />
          </mesh>
          <mesh position={[0.12, 1.15, 0.16]}>
            <boxGeometry args={[0.08, 0.55, 0.04]} />
            <Toon color="#c9a227" />
          </mesh>
          <mesh position={[0, 1.38, 0.16]}>
            <boxGeometry args={[0.32, 0.08, 0.04]} />
            <Toon color="#c9a227" />
          </mesh>
          {/* Overall bib pocket */}
          <mesh position={[0, 1.05, 0.17]}>
            <boxGeometry args={[0.22, 0.18, 0.03]} />
            <Toon color="#2a4060" />
          </mesh>
          {/* Straw hat */}
          <mesh position={[0, 1.78, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.3, 0.14, 10]} />
            <Toon color="#c8a848" />
          </mesh>
          <mesh position={[0, 1.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.42, 12]} />
            <Toon color="#b89840" />
          </mesh>
          {/* Pitchfork in right-hand space (static relative to torso) */}
          <mesh position={[0.42, 1.05, 0.15]} rotation={[0.4, 0, 0.15]} castShadow>
            <cylinderGeometry args={[0.025, 0.03, 1.15, 5]} />
            <Toon color={DD.plankDark} />
          </mesh>
          <mesh position={[0.48, 1.55, 0.38]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.28, 0.04, 0.04]} />
            <Toon color={DD.metal} />
          </mesh>
          <mesh position={[0.38, 1.62, 0.42]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.035, 0.2, 0.035]} />
            <Toon color={DD.metal} />
          </mesh>
          <mesh position={[0.48, 1.62, 0.42]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.035, 0.22, 0.035]} />
            <Toon color={DD.metal} />
          </mesh>
          <mesh position={[0.58, 1.62, 0.42]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.035, 0.2, 0.035]} />
            <Toon color={DD.metal} />
          </mesh>
        </group>

        <group ref={leftUpper} position={[-0.3, 1.3, 0.02]}>
          <mesh position={[0, -0.18, 0.04]} rotation={[0.15, 0, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.28, 5, 10]} />
            <Toon color={pal0.body} />
          </mesh>
          <group ref={leftFore} position={[0, -0.36, 0.06]}>
            <mesh position={[0, -0.16, 0.04]} rotation={[0.2, 0, 0]} castShadow>
              <capsuleGeometry args={[0.045, 0.26, 5, 10]} />
              <Toon color={pal0.body} />
            </mesh>
            <mesh position={[0, -0.32, 0.08]} rotation={[0.6, 0, 0]}>
              <capsuleGeometry args={[0.04, 0.05, 4, 8]} />
              <Toon color={pal0.head} />
            </mesh>
          </group>
        </group>

        <group ref={rightUpper} position={[0.3, 1.3, 0.02]}>
          <mesh position={[0, -0.18, 0.04]} rotation={[0.15, 0, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.28, 5, 10]} />
            <Toon color={pal0.body} />
          </mesh>
          <group ref={rightFore} position={[0, -0.36, 0.06]}>
            <mesh position={[0, -0.16, 0.04]} rotation={[0.2, 0, 0]} castShadow>
              <capsuleGeometry args={[0.045, 0.26, 5, 10]} />
              <Toon color={pal0.body} />
            </mesh>
            <mesh position={[0, -0.32, 0.08]} rotation={[0.6, 0, 0]}>
              <capsuleGeometry args={[0.04, 0.05, 4, 8]} />
              <Toon color={pal0.head} />
            </mesh>
            <mesh
              ref={bracelet}
              position={[0, -0.08, 0.04]}
              rotation={[Math.PI / 2, 0, 0]}
              visible={false}
            >
              <torusGeometry args={[0.065, 0.012, 6, 12]} />
              <Toon color="#e8c84a" emissive="#e8c84a" emissiveIntensity={0.35} />
            </mesh>
          </group>
        </group>
      </group>

      <group ref={leftThigh} position={[-0.12, 0.72, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.26, 5, 10]} />
          <Toon color={pal0.bodyDark} />
        </mesh>
        <group ref={leftShin} position={[0, -0.36, 0]}>
          <mesh position={[0, -0.17, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.28, 5, 10]} />
            <Toon color={pal0.bodyDark} />
          </mesh>
          <mesh position={[0, -0.34, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.045, 0.12, 4, 8]} />
            <Toon color={DD.ink} />
          </mesh>
        </group>
      </group>

      <group ref={rightThigh} position={[0.12, 0.72, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.26, 5, 10]} />
          <Toon color={pal0.bodyDark} />
        </mesh>
        <group ref={rightShin} position={[0, -0.36, 0]}>
          <mesh position={[0, -0.17, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.28, 5, 10]} />
            <Toon color={pal0.bodyDark} />
          </mesh>
          <mesh position={[0, -0.34, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.045, 0.12, 4, 8]} />
            <Toon color={DD.ink} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
