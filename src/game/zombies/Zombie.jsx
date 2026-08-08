import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import Toon from '../style/Toon';
import { DD } from '../style/theme';
import { ROUND } from '../constants';
import { BodyPart, BodyHead, BodyStub, useBodyStyle } from '../style/BodyParts';
import { useGameApi } from '../GameContext';
import { lerpAngle } from '../net/smoothPose';
import { pickCrawlBark } from '../weapons/WeaponSystem';

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

/** Map-themed boss tints (used when variant extras don't already theme them) */
const BOSS_THEME_PALETTES = {
  camp: {
    body: '#3a4028',
    bodyDark: '#2a2418',
    head: '#5a4830',
    hit: '#e07030',
    accent: '#d48840',
  },
  stone: {
    body: '#5a5448',
    bodyDark: '#3a342c',
    head: '#7a6e5a',
    hit: DD.rust,
    accent: '#8a3a28',
  },
  suburb: {
    body: '#6a5a48',
    bodyDark: '#4a3a30',
    head: '#c4a888',
    hit: DD.bloodLite,
    accent: '#5a6a8a',
  },
  farm: {
    body: '#4a3020',
    bodyDark: '#2a1810',
    head: '#6a4a30',
    hit: DD.bloodLite,
    accent: '#c8a848',
  },
  city: {
    body: '#1a3a6a',
    bodyDark: '#0e2040',
    head: '#b89068',
    hit: DD.bloodLite,
    accent: '#e8c84a',
  },
  butcher: {
    body: '#4a2018',
    bodyDark: '#2a100c',
    head: '#8a5850',
    hit: DD.bloodLite,
    accent: '#c03028',
  },
};

const BOSS_LABELS = {
  camp: 'PIE TITAN',
  stone: 'BUNKER BRUTE',
  suburb: 'HOUSE HORROR',
  farm: 'MAD COW',
  city: 'STREET KING',
  butcher: 'HEAD BUTCHER',
};

function paletteFor(z) {
  const seed = z?.variantSeed ?? z?.id ?? 0;
  if (z?.variant === 'gypsy') {
    const i = seed % GYPSY_PALETTES.length;
    const base = GYPSY_PALETTES[Math.abs(i)];
    if (z.boss) {
      return { ...base, body: '#142848', bodyDark: '#0a1428', gold: '#f0d060' };
    }
    return base;
  }
  if (z?.variant === 'cow') {
    const i = seed % COW_PALETTES.length;
    const base = COW_PALETTES[Math.abs(i)];
    if (z.boss) {
      return { ...base, body: '#2a1810', bodyDark: '#140c08', horn: '#e8d8a0' };
    }
    return base;
  }
  if (z?.variant === 'farmer') {
    const i = seed % FARMER_PALETTES.length;
    const base = FARMER_PALETTES[Math.abs(i)];
    if (z.boss && z.bossTheme === 'butcher') {
      return {
        ...base,
        body: '#4a2018',
        bodyDark: '#2a100c',
        shirt: '#6a1810',
        accent: '#c03028',
      };
    }
    if (z.boss) return { ...base, body: '#3a2818', bodyDark: '#1a140e' };
    return base;
  }
  if (z?.boss) {
    return BOSS_THEME_PALETTES[z.bossTheme] || BOSS_THEME_PALETTES.stone;
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
  const { stateRef } = useGameApi();
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
  const bossExtras = useRef();
  const bossAccentMat = useRef();
  const bossCamp = useRef();
  const bossStone = useRef();
  const bossSuburb = useRef();
  const bossButcher = useRef();
  const hitLit = useRef(false);
  const lastKey = useRef('');
  const gaitRef = useRef(null);
  const [bossHud, setBossHud] = useState(null);

  useFrame((_, dt) => {
    const z = zombiesRef.current[index];
    if (!root.current) return;

    if (!z) {
      root.current.visible = false;
      if (bossHud) setBossHud(null);
      return;
    }

    root.current.visible = true;
    const sc = z.scale || 1;
    const sink = z.dead ? (1 - Math.max(0, z.deathTimer) / 0.6) * 1.2 * sc : 0;

    // Clients only get discrete host snaps — smooth render pose so hordes don't teleport.
    const state = stateRef.current;
    const smoothNet = !!state?.coop && !state?.isHost;
    let px = z.x;
    let py = z.y || 0;
    let pz = z.z;
    let pyaw = z.yaw || 0;
    if (smoothNet) {
      if (
        z._rx == null ||
        z._smoothId !== z.id ||
        Math.hypot(z.x - z._rx, z.z - z._rz) > 5
      ) {
        z._rx = z.x;
        z._ry = z.y || 0;
        z._rz = z.z;
        z._ryaw = z.yaw || 0;
        z._smoothId = z.id;
      } else {
        const a = 1 - Math.exp(-Math.max(0, dt) * 12);
        z._rx += (z.x - z._rx) * a;
        z._ry += ((z.y || 0) - z._ry) * a;
        z._rz += (z.z - z._rz) * a;
        z._ryaw = lerpAngle(z._ryaw, z.yaw || 0, a);
      }
      px = z._rx;
      py = z._ry;
      pz = z._rz;
      pyaw = z._ryaw;
    }

    const crawling = !!z.crawling && !z.dead;
    const y = py - sink - (crawling ? 0.22 * sc : 0);
    root.current.position.set(px, y, pz);
    root.current.scale.setScalar(sc);
    root.current.rotation.order = 'YXZ';
    // Dead tip onto back; crawlers tip onto their belly and elbow-drag
    const pitch = z.dead ? Math.PI / 2 : crawling ? 1.22 : 0;
    root.current.rotation.set(pitch, pyaw, 0);

    const pal = paletteFor(z);
    const seed = z.variantSeed ?? z.id ?? 0;
    const key = `${z.boss ? 'boss' : 'z'}:${z.bossTheme || ''}:${z.variant || 'default'}:${seed}`;
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
      // Crown / spikes on every boss; theme props stack on top
      if (bossExtras.current) bossExtras.current.visible = !!z.boss;
      if (bossCamp.current) bossCamp.current.visible = !!z.boss && z.bossTheme === 'camp';
      if (bossStone.current) bossStone.current.visible = !!z.boss && z.bossTheme === 'stone';
      if (bossSuburb.current) bossSuburb.current.visible = !!z.boss && z.bossTheme === 'suburb';
      if (bossButcher.current) bossButcher.current.visible = !!z.boss && z.bossTheme === 'butcher';
      if (bossAccentMat.current && pal.accent) {
        bossAccentMat.current.color.set(pal.accent);
        bossAccentMat.current.emissive?.set?.(pal.accent);
      }
    }

    if (z.boss && !z.dead) {
      const pct = Math.max(0, z.hp / (z.maxHp || 1));
      const label = BOSS_LABELS[z.bossTheme] || 'BOSS';
      const next = `${label}|${pct.toFixed(2)}`;
      if (!bossHud || bossHud.key !== next) {
        setBossHud({ key: next, label, pct });
      }
    } else if (bossHud) {
      setBossHud(null);
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

    // Host/client: cycle whimsical crawler barks
    if (crawling) {
      z.crawlBarkT = (z.crawlBarkT || 0) + Math.max(0, dt);
      if (!z.crawlBark || z.crawlBarkT > 4.8) {
        z.crawlBarkT = 0;
        z.crawlBarkIdx = (z.crawlBarkIdx || 0) + 1;
        z.crawlBark = pickCrawlBark(z);
      }
    }

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
    let crawlLegs = false;

    if (crawling && !climbing) {
      // Army-crawl: arms haul the torso, legs flop uselessly behind
      crawlLegs = true;
      const haul = moving ? 1 : 0.35;
      hipAmp = 0.08;
      kneeAmp = 0.12;
      armAmp = 0.95 * gait.armAmp * haul;
      elbowAmp = 0.85;
      reachL = 1.35 + Math.sin(phase) * 0.55 * haul;
      reachR = 1.35 + Math.sin(phase + Math.PI) * 0.55 * haul;
      bob = Math.abs(Math.sin(phase)) * 0.03 * haul;
      hunch = 0.05;
      sway = Math.sin(phase * 0.5) * 0.08;
      twist = Math.sin(phase) * 0.12 * haul;
      headNod = 0.15 + Math.sin(phase * 1.4) * 0.1;
      headTilt = sway * 0.6;
      lArmSwing = 0;
      rArmSwing = 0;
      lElbowExtra = 0.55 + Math.max(0, Math.sin(phase)) * 0.45 * haul;
      rElbowExtra = 0.55 + Math.max(0, Math.sin(phase + Math.PI)) * 0.45 * haul;
      lArmZ = 0.55;
      rArmZ = -0.55;
    } else if (attacking) {
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

    let lHip = sin * hipAmp * limpMulL;
    let rHip = -sin * hipAmp * limpMulR;
    let lKnee =
      Math.max(0, Math.sin(kneePhase)) * kneeAmp * limpMulL +
      (gait.limpLeft ? 0.2 : 0.05);
    let rKnee =
      Math.max(0, Math.sin(kneePhase + Math.PI)) * kneeAmp * limpMulR +
      (gait.limpLeft ? 0.05 : 0.18);

    if (crawlLegs) {
      // Legs trail limp behind the belly-slide
      lHip = -0.55 + Math.sin(phase * 0.7) * 0.08;
      rHip = -0.62 + Math.sin(phase * 0.7 + 1.1) * 0.08;
      lKnee = 0.15 + Math.abs(Math.sin(phase * 0.5)) * 0.1;
      rKnee = 0.18 + Math.abs(Math.sin(phase * 0.5 + 0.8)) * 0.1;
    }

    if (leftThigh.current) {
      leftThigh.current.rotation.x = lHip;
      leftThigh.current.rotation.z = crawlLegs ? 0.12 : moving ? 0.04 : 0.02;
    }
    if (rightThigh.current) {
      rightThigh.current.rotation.x = rHip;
      rightThigh.current.rotation.z = crawlLegs ? -0.12 : moving ? -0.04 : -0.02;
    }
    if (leftShin.current) leftShin.current.rotation.x = lKnee;
    if (rightShin.current) rightShin.current.rotation.x = rKnee;

    const drop = gait.shoulderDrop;
    if (!attacking && !crawlLegs) {
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
  const style = useBodyStyle();

  return (
    <group ref={root} visible={false}>
      <CrawlerBark zombiesRef={zombiesRef} index={index} />
      {bossHud ? (
        <Html
          position={[0, 2.35, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[30, 0]}
        >
          <div
            style={{
              fontFamily: 'Impact, Haettenschweiler, sans-serif',
              letterSpacing: 1.5,
              textAlign: 'center',
              minWidth: 120,
            }}
          >
            <div
              style={{
                color: '#f0d060',
                fontSize: 13,
                textShadow: '0 1px 0 #000, 0 0 6px #000',
                marginBottom: 3,
              }}
            >
              {bossHud.label}
            </div>
            <div
              style={{
                height: 6,
                background: 'rgba(0,0,0,0.65)',
                border: '1px solid #2a1810',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round(bossHud.pct * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg,#8a2020,#e05030)',
                }}
              />
            </div>
          </div>
        </Html>
      ) : null}
      <group ref={torso} key={style}>
        <BodyPart
          position={[0, 1.02, 0]}
          args={[0.5, 0.7, 0.28]}
          style={style}
          castShadow
        >
          <Toon
            ref={bodyMat}
            color={pal0.body}
            emissive={DD.rot}
            emissiveIntensity={0.12}
          />
        </BodyPart>

        <BodyPart position={[0, 0.58, 0]} args={[0.46, 0.24, 0.26]} style={style} castShadow>
          <Toon color={pal0.bodyDark} />
        </BodyPart>

        <group ref={head} position={[0, 1.52, 0]}>
          <BodyHead position={[0, 0.08, 0]} size={0.32} style={style} castShadow>
            <Toon
              ref={headMat}
              color={pal0.head}
              emissive={DD.rot}
              emissiveIntensity={0.1}
            />
          </BodyHead>
          <BodyPart position={[0, -0.1, 0.08]} args={[0.22, 0.08, 0.14]} style={style}>
            <Toon color={pal0.bodyDark} />
          </BodyPart>
          <mesh position={[-0.08, 0.1, 0.17]}>
            <boxGeometry args={[0.06, 0.045, 0.03]} />
            <Toon color={DD.accent} emissive={DD.accent} emissiveIntensity={1.6} />
          </mesh>
          <mesh position={[0.08, 0.1, 0.17]}>
            <boxGeometry args={[0.06, 0.045, 0.03]} />
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

        {/* Boss crown — every map */}
        <group ref={bossExtras} visible={false}>
          <mesh position={[-0.28, 1.35, 0]} rotation={[0, 0, 0.45]} castShadow>
            <coneGeometry args={[0.08, 0.28, 5]} />
            <Toon
              ref={bossAccentMat}
              color={DD.rust}
              emissive={DD.rust}
              emissiveIntensity={0.45}
            />
          </mesh>
          <mesh position={[0.28, 1.35, 0]} rotation={[0, 0, -0.45]} castShadow>
            <coneGeometry args={[0.08, 0.28, 5]} />
            <Toon color={DD.rust} emissive={DD.rust} emissiveIntensity={0.45} />
          </mesh>
          <mesh position={[0, 1.78, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.18, 0.14, 6]} />
            <Toon color={DD.bone} />
          </mesh>
          <mesh position={[0, 1.94, 0]}>
            <coneGeometry args={[0.07, 0.22, 5]} />
            <Toon color={DD.bone} />
          </mesh>
          <mesh position={[0, 1.12, 0.16]}>
            <boxGeometry args={[0.48, 0.12, 0.07]} />
            <Toon color={DD.ink} />
          </mesh>
        </group>

        {/* Camp — pie tin helm */}
        <group ref={bossCamp} visible={false}>
          <mesh position={[0, 1.92, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.3, 0.1, 12]} />
            <Toon color="#c9a227" emissive="#8a7018" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0, 1.86, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.36, 14]} />
            <Toon color="#b89840" />
          </mesh>
          <mesh position={[0.32, 1.55, 0.1]} rotation={[0.3, 0, 0.4]} castShadow>
            <boxGeometry args={[0.08, 0.08, 0.55]} />
            <Toon color="#e8d8a0" />
          </mesh>
        </group>

        {/* Stone / bunker — scrap helm */}
        <group ref={bossStone} visible={false}>
          <mesh position={[0, 1.88, 0]} castShadow>
            <boxGeometry args={[0.42, 0.22, 0.4]} />
            <Toon color="#6a6458" />
          </mesh>
          <mesh position={[0, 1.78, 0.22]}>
            <boxGeometry args={[0.36, 0.08, 0.06]} />
            <Toon color="#8a3a28" emissive="#5a2010" emissiveIntensity={0.3} />
          </mesh>
        </group>

        {/* Suburb — spiked bat */}
        <group ref={bossSuburb} visible={false}>
          <mesh position={[0.48, 1.05, 0.12]} rotation={[0.35, 0, 0.2]} castShadow>
            <cylinderGeometry args={[0.035, 0.05, 1.05, 6]} />
            <Toon color="#5a4030" />
          </mesh>
          <mesh position={[0.55, 1.5, 0.28]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.12, 0.18, 0.12]} />
            <Toon color="#3a3028" />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh
              key={i}
              position={[0.55 + i * 0.02, 1.58 + i * 0.04, 0.32 + i * 0.02]}
              rotation={[0.35, 0, 0]}
            >
              <coneGeometry args={[0.025, 0.1, 4]} />
              <Toon color="#8a8a90" />
            </mesh>
          ))}
        </group>

        {/* Butcher — bloody cleaver + apron smear */}
        <group ref={bossButcher} visible={false}>
          <mesh position={[0.5, 1.15, 0.1]} rotation={[0.2, 0.3, 0.5]} castShadow>
            <boxGeometry args={[0.08, 0.55, 0.18]} />
            <Toon color="#8a9498" />
          </mesh>
          <mesh position={[0.5, 0.82, 0.1]} rotation={[0.2, 0.3, 0.5]}>
            <boxGeometry args={[0.06, 0.28, 0.08]} />
            <Toon color="#3a2818" />
          </mesh>
          <mesh position={[0, 1.05, 0.18]}>
            <boxGeometry args={[0.5, 0.55, 0.04]} />
            <Toon color="#e8e0d8" />
          </mesh>
          <mesh position={[0.08, 0.95, 0.2]}>
            <boxGeometry args={[0.2, 0.25, 0.03]} />
            <Toon color="#8a2020" />
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

        <group ref={leftUpper} position={[-0.32, 1.28, 0.02]}>
          <BodyPart
            position={[0, -0.16, 0.04]}
            rotation={[0.15, 0, 0]}
            args={[0.12, 0.34, 0.12]}
            style={style}
            castShadow
          >
            <Toon color={pal0.body} />
          </BodyPart>
          <group ref={leftFore} position={[0, -0.34, 0.06]}>
            <BodyPart
              position={[0, -0.14, 0.04]}
              rotation={[0.2, 0, 0]}
              args={[0.1, 0.3, 0.1]}
              style={style}
              castShadow
            >
              <Toon color={pal0.body} />
            </BodyPart>
            <BodyStub position={[0, -0.3, 0.08]} size={0.1} style={style}>
              <Toon color={pal0.head} />
            </BodyStub>
          </group>
        </group>

        <group ref={rightUpper} position={[0.32, 1.28, 0.02]}>
          <BodyPart
            position={[0, -0.16, 0.04]}
            rotation={[0.15, 0, 0]}
            args={[0.12, 0.34, 0.12]}
            style={style}
            castShadow
          >
            <Toon color={pal0.body} />
          </BodyPart>
          <group ref={rightFore} position={[0, -0.34, 0.06]}>
            <BodyPart
              position={[0, -0.14, 0.04]}
              rotation={[0.2, 0, 0]}
              args={[0.1, 0.3, 0.1]}
              style={style}
              castShadow
            >
              <Toon color={pal0.body} />
            </BodyPart>
            <BodyStub position={[0, -0.3, 0.08]} size={0.1} style={style}>
              <Toon color={pal0.head} />
            </BodyStub>
            <mesh
              ref={bracelet}
              position={[0, -0.08, 0.04]}
              rotation={[Math.PI / 2, 0, 0]}
              visible={false}
            >
              <torusGeometry args={[0.075, 0.014, 6, 12]} />
              <Toon color="#e8c84a" emissive="#e8c84a" emissiveIntensity={0.35} />
            </mesh>
          </group>
        </group>
      </group>

      <group ref={leftThigh} position={[-0.13, 0.72, 0]} key={`legL-${style}`}>
        <BodyPart position={[0, -0.16, 0]} args={[0.16, 0.34, 0.16]} style={style} castShadow>
          <Toon color={pal0.bodyDark} />
        </BodyPart>
        <group ref={leftShin} position={[0, -0.34, 0]}>
          <BodyPart position={[0, -0.15, 0]} args={[0.14, 0.32, 0.14]} style={style} castShadow>
            <Toon color={pal0.bodyDark} />
          </BodyPart>
          <BodyPart position={[0, -0.32, 0.06]} args={[0.16, 0.07, 0.26]} style={style}>
            <Toon color={DD.ink} />
          </BodyPart>
        </group>
      </group>

      <group ref={rightThigh} position={[0.13, 0.72, 0]} key={`legR-${style}`}>
        <BodyPart position={[0, -0.16, 0]} args={[0.16, 0.34, 0.16]} style={style} castShadow>
          <Toon color={pal0.bodyDark} />
        </BodyPart>
        <group ref={rightShin} position={[0, -0.34, 0]}>
          <BodyPart position={[0, -0.15, 0]} args={[0.14, 0.32, 0.14]} style={style} castShadow>
            <Toon color={pal0.bodyDark} />
          </BodyPart>
          <BodyPart position={[0, -0.32, 0.06]} args={[0.16, 0.07, 0.26]} style={style}>
            <Toon color={DD.ink} />
          </BodyPart>
        </group>
      </group>
    </group>
  );
}

/** Comic speech bubble floating above a kneeless horror */
function CrawlerBark({ zombiesRef, index }) {
  const [text, setText] = useState('');
  const [show, setShow] = useState(false);

  useFrame(() => {
    const z = zombiesRef.current[index];
    const on = !!(z && !z.dead && z.crawling && z.crawlBark);
    if (!on) {
      if (show) setShow(false);
      return;
    }
    if (!show) setShow(true);
    if (text !== z.crawlBark) setText(z.crawlBark);
  });

  if (!show || !text) return null;

  return (
    <Html
      position={[0, 0.95, 0.35]}
      center
      distanceFactor={9}
      style={{ pointerEvents: 'none' }}
      zIndexRange={[20, 0]}
    >
      <div
        style={{
          position: 'relative',
          fontFamily: '"Comic Sans MS", "Chalkboard SE", "Segoe Print", cursive',
          fontSize: 12,
          fontWeight: 700,
          color: '#2a1810',
          background: 'rgba(255, 248, 220, 0.94)',
          border: '2px solid #2a1810',
          borderRadius: 10,
          padding: '5px 9px',
          maxWidth: 180,
          textAlign: 'center',
          lineHeight: 1.25,
          boxShadow: '2px 3px 0 rgba(0,0,0,0.35)',
          whiteSpace: 'normal',
          transform: 'translateY(-8px)',
        }}
      >
        {text}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -8,
            width: 12,
            height: 12,
            background: 'rgba(255, 248, 220, 0.94)',
            borderRight: '2px solid #2a1810',
            borderBottom: '2px solid #2a1810',
            transform: 'translateX(-50%) rotate(45deg)',
          }}
        />
      </div>
    </Html>
  );
}
