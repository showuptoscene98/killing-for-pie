import { forwardRef, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Hud, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../GameContext';
import { resolveOutfit } from '../player/outfits';
import { usesBulgarianKit } from '../player/BulgarianKit';
import { WEAPONS } from './weaponDefs';
import { getGunAnim } from './weaponAnim';
import {
  FpGun,
  muzzleOffset,
  magRestPose,
  reloadStyle,
  magIsTransient,
} from './GunMeshes';

/**
 * FP hands + gun via drei Hud (isolated overlay scene).
 * Hud renderPriority must be 1 unless EffectComposer is mounted at priority 1 —
 * any priority > 0 disables R3F auto-render; only priority 1 Hud re-draws the world.
 */

const VmMat = forwardRef(function VmMat({ color, opacity = 1 }, ref) {
  return (
    <meshBasicMaterial
      ref={ref}
      color={color}
      depthTest={false}
      depthWrite={false}
      fog={false}
      toneMapped={false}
      transparent={opacity < 1}
      opacity={opacity}
    />
  );
});

/**
 * Unlike GunMeshes, cylinders here default to Y-up: the limb meshes are posed
 * with their own rotations and expect the raw geometry axis. Bore-aligned parts
 * (loose shells, a stripper clip) pass axis="z".
 */
const AXIS_TILT = { x: [0, 0, Math.PI / 2], y: null, z: [Math.PI / 2, 0, 0] };

function Part({ position, rotation, args, color, geo = 'box', axis = 'y', opacity }) {
  const tilt = geo === 'cyl' ? AXIS_TILT[axis] : null;
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={tilt ?? undefined} renderOrder={1000} frustumCulled={false}>
        {geo === 'cyl' ? (
          <cylinderGeometry args={args} />
        ) : geo === 'sphere' ? (
          <sphereGeometry args={args} />
        ) : (
          <boxGeometry args={args} />
        )}
        <VmMat color={color} opacity={opacity} />
      </mesh>
    </group>
  );
}

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

function smoothstep(a, b, x) {
  const t = clamp01((x - a) / Math.max(1e-6, b - a));
  return t * t * (3 - 2 * t);
}

function pulse(a, b, x) {
  if (x < a || x > b) return 0;
  const m = (a + b) * 0.5;
  const h = (b - a) * 0.5;
  return Math.sin(clamp01((x - (m - h)) / (2 * h)) * Math.PI);
}

/** Right hand = grip (follows gun). Left = support / mag hand. */
function Hands({ outfitLoadout, outfitId, outfitColor, leftRef, rightRef }) {
  const o = resolveOutfit(outfitLoadout || outfitId, outfitColor);
  return (
    <group>
      {/* Right / firing hand */}
      <group ref={rightRef}>
        <Part
          position={[0.12, -0.1, 0.14]}
          rotation={[0.45, 0.25, 0.5]}
          args={[0.05, 0.058, 0.3, 8]}
          geo="cyl"
          color={o.sleeve}
        />
        <Part
          position={[0.05, -0.03, 0]}
          rotation={[0.55, 0.15, 0.15]}
          args={[0.1, 0.06, 0.12]}
          color={o.glove}
        />
        <Part
          position={[0.03, 0.01, -0.08]}
          rotation={[0.9, 0.05, 0]}
          args={[0.08, 0.045, 0.08]}
          color={o.glove}
        />
        {/* fingers */}
        <Part position={[0.02, 0.02, -0.14]} rotation={[1.1, 0.1, 0]} args={[0.025, 0.03, 0.06]} color={o.glove} />
        <Part position={[0.05, 0.015, -0.13]} rotation={[1.0, 0.05, 0.1]} args={[0.022, 0.028, 0.055]} color={o.glove} />
        <Part position={[0.075, 0.005, -0.11]} rotation={[0.9, 0, 0.15]} args={[0.02, 0.025, 0.05]} color={o.glove} />
        {o.id === 'hazmat' && (
          <Part position={[0.06, 0.02, 0.04]} args={[0.055, 0.028, 0.055]} color={o.accent} />
        )}
        {usesBulgarianKit(o) && (
          <>
            <Part
              position={[0.14, -0.06, 0.1]}
              rotation={[0.45, 0.25, 0.5]}
              args={[0.014, 0.014, 0.26]}
              color={o.stripe || o.accent}
            />
            <Part
              position={[0.155, -0.07, 0.11]}
              rotation={[0.45, 0.25, 0.5]}
              args={[0.014, 0.014, 0.26]}
              color={o.stripe || o.accent}
            />
            <Part
              position={[0.07, -0.01, 0.02]}
              args={[0.045, 0.028, 0.045, 8]}
              geo="cyl"
              color={o.chain || o.accent}
            />
          </>
        )}
        {o.id === 'mossad' && (
          <>
            <Part
              position={[0.1, -0.05, 0.08]}
              rotation={[0.45, 0.25, 0.5]}
              args={[0.06, 0.065, 0.07, 8]}
              geo="cyl"
              color={o.shirt || '#e8e8ec'}
            />
            <Part
              position={[0.07, -0.02, 0]}
              rotation={[0.5, 0.15, 0.2]}
              args={[0.055, 0.022, 0.055, 8]}
              geo="cyl"
              color={o.accent}
            />
            <Part position={[0.065, -0.015, -0.01]} args={[0.04, 0.01, 0.04]} color="#c8c8d0" />
          </>
        )}
      </group>

      {/* Left / support hand — animated hard during reload */}
      <group ref={leftRef}>
        <Part
          position={[-0.1, -0.12, 0.04]}
          rotation={[0.55, -0.35, -0.55]}
          args={[0.045, 0.05, 0.26, 8]}
          geo="cyl"
          color={o.sleeve}
        />
        <Part
          position={[-0.03, -0.05, -0.1]}
          rotation={[0.35, -0.1, -0.1]}
          args={[0.08, 0.055, 0.1]}
          color={o.glove}
        />
        <Part
          position={[-0.02, -0.02, -0.16]}
          rotation={[0.7, -0.05, 0]}
          args={[0.07, 0.04, 0.07]}
          color={o.glove}
        />
        <Part position={[-0.04, 0.0, -0.2]} rotation={[1.0, 0, -0.1]} args={[0.022, 0.028, 0.055]} color={o.glove} />
        <Part position={[-0.01, 0.01, -0.2]} rotation={[1.05, 0, 0]} args={[0.022, 0.028, 0.055]} color={o.glove} />
        <Part position={[0.02, 0.0, -0.18]} rotation={[0.95, 0, 0.1]} args={[0.02, 0.025, 0.05]} color={o.glove} />
      </group>
    </group>
  );
}

function MagMesh({ weaponId }) {
  if (weaponId === 'spatula') {
    return (
      <group>
        <Part
          position={[0, 0.04, 0]}
          rotation={[0.15, 0, 0]}
          args={[0.1, 0.1, 0.06, 12]}
          geo="cyl"
          color="#d4a574"
        />
        <Part position={[0, 0.08, 0]} args={[0.08, 0.018, 0.08]} color="#c44030" />
      </group>
    );
  }
  if (weaponId === 'olympia') {
    return (
      <group>
        <Part
          position={[-0.025, 0, 0]}
          args={[0.022, 0.022, 0.07, 8]}
          geo="cyl"
          axis="z"
          color="#c8b070"
        />
        <Part
          position={[0.025, 0, 0]}
          args={[0.022, 0.022, 0.07, 8]}
          geo="cyl"
          axis="z"
          color="#c8b070"
        />
        <Part position={[-0.025, 0, 0.04]} args={[0.026, 0.01, 0.026]} color="#8a6030" />
        <Part position={[0.025, 0, 0.04]} args={[0.026, 0.01, 0.026]} color="#8a6030" />
      </group>
    );
  }
  if (weaponId === 'mosin') {
    // Five rounds held in a steel stripper clip.
    return (
      <group>
        <Part position={[0, -0.012, 0.01]} args={[0.062, 0.012, 0.03]} color="#6e6a62" />
        {[-0.024, -0.012, 0, 0.012, 0.024].map((x, i) => (
          <group key={i}>
            <Part
              position={[x, 0.012, -0.01]}
              args={[0.0055, 0.0055, 0.055, 6]}
              geo="cyl"
              axis="z"
              color="#b08a3c"
            />
            <Part
              position={[x, 0.012, -0.045]}
              args={[0.005, 0.0022, 0.018, 6]}
              geo="cyl"
              axis="z"
              color="#8a6a28"
            />
          </group>
        ))}
      </group>
    );
  }
  const color =
    weaponId === 'raygun'
      ? '#1e8449'
      : weaponId === 'thundergun'
        ? '#c89020'
        : weaponId === 'ak47'
          ? '#3a3a38'
          : '#2a2a2e';
  const curved = weaponId === 'ak47';
  const tall = weaponId === 'mp5' || weaponId === 'ak47';
  return (
    <group rotation={curved ? [0.35, 0, 0] : [0, 0, 0]}>
      <Part
        position={[0, 0, 0]}
        args={tall ? [0.05, 0.18, 0.07] : [0.045, 0.12, 0.06]}
        color={color}
      />
      <Part
        position={[0, tall ? -0.08 : -0.05, 0.01]}
        args={[0.04, 0.03, 0.05]}
        color="#1a1a1e"
      />
      {(weaponId === 'raygun' || weaponId === 'thundergun') && (
        <Part position={[0, 0.04, 0]} args={[0.03, 8, 8]} geo="sphere" color="#ffe060" />
      )}
    </group>
  );
}

function MuzzleFX({ flashRef, lightRef, sparkRefs }) {
  return (
    <group>
      <mesh ref={flashRef} visible={false} renderOrder={1100} frustumCulled={false}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial
          color="#ffe8a0"
          depthTest={false}
          depthWrite={false}
          fog={false}
          toneMapped={false}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh visible={false} renderOrder={1099} frustumCulled={false} userData={{ flashCone: true }}>
        <coneGeometry args={[0.08, 0.18, 8]} />
        <meshBasicMaterial
          color="#ff9020"
          depthTest={false}
          depthWrite={false}
          fog={false}
          toneMapped={false}
          transparent
          opacity={0.85}
        />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (sparkRefs) sparkRefs.current[i] = el;
          }}
          visible={false}
          renderOrder={1101}
          frustumCulled={false}
        >
          <boxGeometry args={[0.01, 0.01, 0.055]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#fff4c0' : '#ff8020'}
            depthTest={false}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      <pointLight
        ref={lightRef}
        intensity={0}
        distance={2.5}
        decay={2}
        color="#ffb050"
      />
    </group>
  );
}

/**
 * Evaluate reload pose for weapon style + per-gun personality.
 * Returns offsets applied to gun / mag / hands / mechanical parts.
 */
function evalReload(style, r, weaponId, anim) {
  const out = {
    tip: 0,
    twist: 0,
    roll: 0,
    drop: 0,
    pull: 0,
    magX: 0,
    magY: 0,
    magZ: 0,
    magRotX: 0,
    magRotZ: 0,
    magVis: 1,
    magScale: 1,
    leftX: 0,
    leftY: 0,
    leftZ: 0,
    leftPitch: 0,
    leftYaw: 0,
    slide: 0,
    breakAngle: 0,
    bolt: 0,
    /** Bolt handle rotation about the bore, radians. Manual actions only. */
    boltLift: 0,
    charge: 0,
    slap: 0,
  };
  if (r < 0.001) return out;

  if (style === 'melee') {
    out.magVis = 0;
    return out;
  }

  if (style === 'break') {
    // Olympia — dramatic hinge + shell flip
    const open = smoothstep(0.05, 0.28, r) * (1 - smoothstep(0.78, 0.95, r));
    out.breakAngle = open * 0.85 * (anim.breakScale || 1);
    out.tip = smoothstep(0.0, 0.2, r) * 0.25 * (1 - smoothstep(0.85, 1, r)) + open * 0.15;
    out.twist = open * -0.12;
    out.roll = open * 0.06;
    out.drop = open * 0.04;

    const eject = smoothstep(0.3, 0.48, r) * (1 - smoothstep(0.48, 0.58, r));
    const insert = smoothstep(0.55, 0.72, r);
    const shellsGone = r > 0.48 && r < 0.55;

    out.magY = -eject * 0.15 + (1 - insert) * (r > 0.55 ? -0.12 : 0);
    out.magZ = -eject * 0.08;
    out.magX = Math.sin(r * 20) * eject * 0.02;
    out.magRotX = eject * -0.6 + insert * 0.2;
    out.magVis = shellsGone ? 0 : r < 0.48 ? 1 - eject * 0.3 : insert;
    out.magScale = 0.85 + insert * 0.15;

    out.leftY = -open * 0.05 - eject * 0.08;
    out.leftZ = -open * 0.06 - eject * 0.1;
    out.leftPitch = open * 0.4 + eject * 0.5;
    out.leftX = open * -0.04;
    out.slap = pulse(0.88, 1.0, r) * 0.15;
  } else if (style === 'pistol') {
    // M1911 — snappy tip + hard slide rack
    const tipUp = smoothstep(0.0, 0.14, r) * (1 - smoothstep(0.88, 1, r));
    out.tip = tipUp * 0.7 + pulse(0.72, 0.9, r) * 0.25;
    out.twist = tipUp * -0.45;
    out.roll = tipUp * 0.15;
    out.drop = tipUp * 0.1;
    out.pull = tipUp * 0.04;

    const magOut = smoothstep(0.12, 0.38, r);
    const magIn = smoothstep(0.42, 0.68, r);
    const mid = r > 0.38 && r < 0.42;
    if (r >= 0.42 && r < 0.68) {
      out.magY = -0.32 * (1 - magIn);
      out.magX = 0.08 * (1 - magIn);
    } else if (r < 0.42) {
      out.magY = -magOut * 0.32;
      out.magX = magOut * 0.05;
      out.magRotZ = magOut * 0.4;
    }
    out.magVis = mid ? 0 : r < 0.38 ? 1 - magOut * 0.15 : magIn;
    out.magRotX = (1 - magIn) * (r > 0.4 ? -0.8 : magOut * -0.5);

    out.leftX = magOut * 0.06 * (1 - magIn * 0.5) + (r > 0.42 ? (1 - magIn) * 0.05 : 0);
    out.leftY = -magOut * 0.22 * (1 - magIn);
    out.leftZ = magOut * 0.04;
    out.leftPitch = magOut * 0.6 * (1 - magIn) + magIn * 0.2;
    out.leftYaw = -magOut * 0.3;

    const rack = smoothstep(0.7, 0.82, r) * (1 - smoothstep(0.82, 0.95, r));
    out.slide = rack * 0.09;
    out.leftZ += rack * -0.06;
    out.leftY += rack * 0.04;
    out.leftPitch += rack * 0.35;
    out.slap = pulse(0.84, 0.98, r) * 0.18;
  } else if (style === 'pie') {
    // Spatula — flip the spare pie in with a flourish
    const lift = smoothstep(0.0, 0.2, r) * (1 - smoothstep(0.85, 1, r));
    out.tip = lift * 0.5;
    out.twist = lift * -0.25;
    out.roll = Math.sin(r * Math.PI * 2) * lift * 0.2;
    out.drop = lift * 0.06;
    const swap = smoothstep(0.2, 0.45, r);
    const place = smoothstep(0.5, 0.75, r);
    out.magY = -swap * 0.2 * (1 - place);
    out.magX = swap * 0.1 * (1 - place);
    out.magZ = Math.sin(swap * Math.PI) * 0.06 * (1 - place);
    out.magRotZ = swap * 1.2 * (1 - place);
    out.magVis = r > 0.45 && r < 0.5 ? 0 : r < 0.45 ? 1 - swap * 0.2 : place;
    out.leftY = -swap * 0.15 * (1 - place);
    out.leftX = swap * 0.08;
    out.leftPitch = swap * 0.5;
    out.slap = pulse(0.78, 0.95, r) * 0.2;
  } else if (style === 'bolt') {
    // Mosin — lift and haul the bolt open, thumb a stripper clip down into the
    // fixed magazine, flick the empty clip away, shove the bolt home.
    const tipUp = smoothstep(0.0, 0.12, r) * (1 - smoothstep(0.9, 1, r));
    out.tip = tipUp * 0.5;
    out.twist = tipUp * -0.5;
    out.roll = tipUp * 0.1;
    out.drop = tipUp * 0.14;
    out.pull = tipUp * 0.03;

    out.boltLift = smoothstep(0.0, 0.1, r) * (1 - smoothstep(0.74, 0.9, r)) * 1.15;
    out.bolt = smoothstep(0.06, 0.2, r) * (1 - smoothstep(0.64, 0.82, r)) * 0.13;

    const raise = smoothstep(0.18, 0.36, r);
    const press = smoothstep(0.42, 0.58, r);
    const clipGone = smoothstep(0.58, 0.64, r);
    out.magY = (1 - raise) * 0.15 - press * 0.05;
    out.magX = (1 - raise) * 0.06;
    out.magRotX = (1 - raise) * -0.55;
    out.magRotZ = (1 - raise) * 0.3;
    out.magVis = raise * (1 - clipGone);
    out.magScale = 0.9 + raise * 0.1;

    out.leftX = raise * 0.05 * (1 - clipGone);
    out.leftY = -raise * 0.1 + press * 0.06;
    out.leftZ = -raise * 0.05 - smoothstep(0.66, 0.8, r) * 0.05;
    out.leftPitch = raise * 0.5 + press * 0.25;
    out.leftYaw = -raise * 0.2;
    out.slap = pulse(0.82, 0.96, r) * 0.2;
  } else if (style === 'cell') {
    // Ray / Crust — energy cell pull with spin; thundergun is heavier
    const heavy = weaponId === 'thundergun';
    const tipUp = smoothstep(0.0, 0.15, r) * (1 - smoothstep(0.88, 1, r));
    out.tip = tipUp * (heavy ? 0.7 : 0.55);
    out.twist = tipUp * (heavy ? -0.4 : -0.3);
    out.roll = tipUp * (heavy ? 0.12 : 0.05) + Math.sin(r * 12) * tipUp * (heavy ? 0 : 0.08);
    out.drop = tipUp * (heavy ? 0.12 : 0.08);
    const outP = smoothstep(0.15, 0.4, r);
    const inP = smoothstep(0.45, 0.75, r);
    out.magY = -outP * (heavy ? 0.32 : 0.25) * (1 - inP);
    out.magX = outP * 0.08 * (1 - inP);
    out.magRotZ = outP * (heavy ? 0.5 : 1.8) * (1 - inP);
    out.magRotX = outP * (heavy ? -0.3 : -0.9) * (1 - inP);
    out.magVis = r > 0.4 && r < 0.45 ? 0 : r < 0.4 ? 1 : inP;
    out.magScale = 0.9 + inP * 0.1 + (weaponId === 'raygun' ? Math.sin(r * 18) * outP * 0.08 : 0);
    out.leftY = -outP * 0.18 * (1 - inP);
    out.leftX = outP * 0.06;
    out.leftPitch = outP * 0.55;
    out.slap = pulse(0.8, 0.95, r) * (heavy ? 0.22 : 0.16);
  } else {
    // rifle / smg — per-gun mag + bolt/charge flavor
    const tipUp = smoothstep(0.0, 0.12, r) * (1 - smoothstep(0.9, 1, r));
    const tipAmt =
      weaponId === 'sniper' ? 0.4 : weaponId === 'ak47' ? 0.65 : weaponId === 'mp5' ? 0.45 : 0.55;
    out.tip = tipUp * tipAmt;
    out.twist = tipUp * (weaponId === 'ak47' ? -0.55 : weaponId === 'sniper' ? -0.28 : -0.4);
    out.roll = tipUp * (weaponId === 'ak47' ? 0.14 : 0.08);
    out.drop = tipUp * (weaponId === 'sniper' ? 0.06 : 0.09);
    out.pull = tipUp * (weaponId === 'mp5' ? 0.05 : 0.03);

    const magOut = smoothstep(0.1, 0.35, r);
    const magIn = smoothstep(0.4, 0.68, r);
    const gap = r > 0.35 && r < 0.4;
    const magDepth = weaponId === 'ak47' ? 0.36 : weaponId === 'mp5' ? 0.26 : 0.3;
    if (r < 0.35) {
      out.magY = -magOut * magDepth;
      out.magX = magOut * (weaponId === 'ak47' ? 0.1 : 0.06);
      out.magRotZ = magOut * (weaponId === 'ak47' ? 0.55 : 0.35);
      out.magRotX = magOut * (weaponId === 'ak47' ? -0.7 : -0.4);
    } else if (r < 0.4) {
      out.magVis = 0;
    } else {
      out.magY = -magDepth * (1 - magIn);
      out.magX = 0.07 * (1 - magIn);
      out.magRotX = -0.5 * (1 - magIn);
      out.magVis = magIn;
    }
    if (!gap && r < 0.35) out.magVis = 1 - magOut * 0.1;

    out.leftX = (r < 0.35 ? magOut : 1 - magIn) * 0.07;
    out.leftY = (r < 0.35 ? magOut : 1 - magIn) * -0.2;
    out.leftZ = (r < 0.35 ? magOut : 1 - magIn) * 0.03;
    out.leftPitch = (r < 0.35 ? magOut : 1 - magIn) * 0.65;
    out.leftYaw = -(r < 0.35 ? magOut : 1 - magIn) * 0.25;

    if (style === 'smg') {
      // MP5 — fast charge yank
      const ch = smoothstep(0.68, 0.8, r) * (1 - smoothstep(0.8, 0.92, r));
      out.charge = ch * 0.11;
      out.leftZ += ch * -0.09;
      out.leftPitch += ch * 0.35;
      out.leftX += ch * 0.03;
    } else if (weaponId === 'sniper') {
      // Dragunov — long deliberate bolt
      const bt = smoothstep(0.65, 0.8, r) * (1 - smoothstep(0.8, 0.96, r));
      out.bolt = bt * 0.11;
      out.tip += bt * 0.08;
      out.leftZ += bt * -0.07;
      out.leftY += bt * 0.04;
      out.leftPitch += bt * 0.25;
    } else if (weaponId === 'ak47') {
      // AK — rough slap + short bolt
      const bt = smoothstep(0.72, 0.84, r) * (1 - smoothstep(0.84, 0.95, r));
      out.bolt = bt * 0.07;
      out.roll += pulse(0.68, 0.78, r) * 0.12;
      out.leftZ += bt * -0.04;
      out.leftY += bt * 0.02;
    } else {
      // M14 — clean bolt
      const bt = smoothstep(0.7, 0.82, r) * (1 - smoothstep(0.82, 0.94, r));
      out.bolt = bt * 0.08;
      out.leftZ += bt * -0.05;
      out.leftY += bt * 0.03;
    }
    out.slap = pulse(0.85, 0.98, r) * (weaponId === 'ak47' ? 0.2 : 0.14);
  }

  // Per-gun personality scales
  const tipScale = anim?.tipScale ?? 1;
  const twistScale = anim?.twistScale ?? 1;
  const dropScale = anim?.dropScale ?? 1;
  const slapScale = anim?.slapScale ?? 1;
  const magDropScale = anim?.magDropScale ?? 1;
  out.tip *= tipScale;
  out.twist *= twistScale;
  out.drop *= dropScale;
  out.slap *= slapScale;
  out.magY *= magDropScale;
  out.magX *= magDropScale;
  out.slide *= anim?.slideRackScale ?? 1;
  out.bolt *= anim?.boltPullScale ?? 1;
  out.charge *= anim?.chargePullScale ?? 1;
  out.breakAngle *= anim?.breakScale ?? 1;
  return out;
}

function ViewmodelScene() {
  const root = useRef();
  const gunRig = useRef();
  const magRef = useRef();
  const leftHand = useRef();
  const rightHand = useRef();
  const slideRef = useRef();
  const breakRef = useRef();
  const boltRef = useRef();
  const chargeRef = useRef();
  const flash = useRef();
  const flashLight = useRef();
  const coneRef = useRef();
  const sparkRefs = useRef([]);
  const { stateRef, hud } = useGame();
  const bob = useRef(0);
  const reloadT = useRef(0);
  const kick = useRef(0);
  const slideKick = useRef(0);
  const flashAge = useRef(0);
  const wasReloading = useRef(false);
  const prevMuzzle = useRef(0);

  const weaponId =
    stateRef.current.weapons[stateRef.current.activeWeapon]?.id ||
    WEAPONS.m1911.id;
  const outfitId = stateRef.current.outfitId || 'chef';
  const outfitColor = stateRef.current.outfitColor || 'default';
  const outfitLoadout = stateRef.current.outfitLoadout || null;
  const flashPos = useMemo(() => muzzleOffset(weaponId), [weaponId]);
  const magRest = useMemo(() => magRestPose(weaponId), [weaponId]);
  const style = useMemo(() => reloadStyle(weaponId), [weaponId]);
  const transientMag = useMemo(() => magIsTransient(weaponId), [weaponId]);
  const anim = useMemo(() => getGunAnim(weaponId), [weaponId]);
  const magRestRef = useRef(magRest);
  magRestRef.current = magRest;
  const animRef = useRef(anim);
  animRef.current = anim;

  void hud.weaponName;
  void hud.mag;
  void hud.status;
  void hud.reloading;

  const def = WEAPONS[weaponId] || WEAPONS.m1911;
  const reloadDur = (def.reloadTime || 1.5) * (stateRef.current.reloadMult || 1);

  useLayoutEffect(() => {
    const r = root.current;
    if (!r) return undefined;
    r.traverse((obj) => {
      obj.frustumCulled = false;
      if (obj.userData?.flashCone) coneRef.current = obj;
    });
    if (slideRef.current) slideRef.current.position.set(0, 0, 0);
    if (breakRef.current) breakRef.current.rotation.set(0, 0, 0);
    if (boltRef.current) {
      boltRef.current.position.set(0, 0, 0);
      boltRef.current.rotation.set(0, 0, 0);
    }
    if (chargeRef.current) chargeRef.current.position.set(0, 0, 0);
    kick.current = 0;
    slideKick.current = 0;
    const a = getGunAnim(weaponId);
    if (flash.current?.material) flash.current.material.color.set(a.flashColor);
    if (coneRef.current?.material) coneRef.current.material.color.set(a.coneColor);
    if (flashLight.current) flashLight.current.color.set(a.lightColor);
    return undefined;
  }, [weaponId, outfitId, outfitColor, outfitLoadout]);

  useFrame((_, dt) => {
    const state = stateRef.current;
    if (!root.current || !gunRig.current) return;

    const show =
      !state.coopSpectating &&
      (state.status === 'playing' || state.status === 'paused');
    root.current.visible = show;
    if (!show) return;

    const a = animRef.current;
    const moving = Math.hypot(state.velocityX || 0, state.velocityZ || 0) > 0.08;
    const bobRate = state.reloading
      ? a.bobReloadRate
      : moving
        ? a.bobMoveRate
        : a.bobIdleRate;
    const bobAmp = state.reloading
      ? a.bobReloadAmp
      : moving
        ? a.bobMoveAmp
        : a.bobIdleAmp;
    bob.current += dt * bobRate;
    const bobY = Math.sin(bob.current) * bobAmp;
    const bobX = Math.cos(bob.current * 0.5) * bobAmp * a.bobXBias;

    const swayT = bob.current * (a.swayRate / Math.max(0.1, bobRate));
    const swayX = Math.sin(swayT * 0.73) * a.swayAmp * (1 - (state.adsAmount || 0));
    const swayY = Math.cos(swayT * 0.51) * a.swayAmp * 0.7 * (1 - (state.adsAmount || 0));
    const swayRoll = Math.sin(swayT * 0.37) * a.swayRoll * (1 - (state.adsAmount || 0));

    if (state.muzzleFlash > 0 && prevMuzzle.current <= 0) {
      const fireKick =
        style === 'melee'
          ? a.kickBase
          : state.recoilKick * a.kickScale + a.kickBase;
      kick.current = Math.max(kick.current, fireKick);
      if (a.slideKick > 0) slideKick.current = Math.max(slideKick.current, a.slideKick);
      else if (a.boltKick > 0) slideKick.current = Math.max(slideKick.current, a.boltKick);
      else if (a.chargeKick > 0) slideKick.current = Math.max(slideKick.current, a.chargeKick);
    }
    prevMuzzle.current = state.muzzleFlash;
    kick.current = THREE.MathUtils.lerp(kick.current, 0, 1 - Math.pow(a.kickDecay, dt));
    slideKick.current = THREE.MathUtils.lerp(
      slideKick.current,
      0,
      1 - Math.pow(0.002, dt)
    );

    if (state.reloading) {
      if (!wasReloading.current) reloadT.current = 0;
      const progress =
        1 - Math.max(0, state.reloadTimer) / Math.max(0.01, reloadDur);
      reloadT.current = clamp01(progress);
      wasReloading.current = true;
    } else {
      if (wasReloading.current) reloadT.current = 1;
      reloadT.current = THREE.MathUtils.lerp(
        reloadT.current,
        0,
        1 - Math.pow(0.0002, dt)
      );
      if (reloadT.current < 0.01) reloadT.current = 0;
      wasReloading.current = false;
    }

    const pose = evalReload(style, reloadT.current, weaponId, a);

    /**
     * Manual action between shots. The cycle is pinned to the tail of the fire
     * cooldown, so the shot gets a beat of recoil settle before the hands move
     * and the bolt drops home exactly as the rifle can fire again. Firing is
     * already gated on fireCooldown, so this never lies about being ready.
     */
    let cycleLift = 0;
    let cyclePull = 0;
    if (def.boltAction && !state.reloading && reloadT.current < 0.02) {
      const span = def.boltCycleTime || def.fireRate || 1;
      const ct = clamp01(1 - Math.max(0, state.fireCooldown || 0) / span);
      if (ct > 0 && ct < 1) {
        cycleLift = smoothstep(0, 0.18, ct) * (1 - smoothstep(0.74, 0.94, ct)) * 1.15;
        cyclePull = smoothstep(0.16, 0.46, ct) * (1 - smoothstep(0.56, 0.82, ct)) * 0.13;
      }
    }

    const rKick = kick.current;
    const adsT = state.adsAmount || 0;
    const adsHide = adsT > 0.05 && !!def.adsFov;

    const meleeThrust = style === 'melee' ? rKick * 1.4 : 0;
    const adsDrop = adsHide ? adsT * 1.35 : 0;
    const adsSide = adsHide ? adsT * 0.75 : 0;
    root.current.position.set(
      0.28 +
        bobX * (1 - adsT) +
        swayX +
        pose.twist * -0.04 +
        rKick * a.kickSide +
        (style === 'melee' ? rKick * -0.08 : 0) +
        adsSide,
      -0.32 +
        bobY * (1 - adsT) +
        swayY -
        pose.drop +
        pose.slap * 0.02 +
        rKick * a.kickUp +
        (style === 'melee' ? rKick * 0.06 : 0) -
        adsDrop,
      -0.45 + pose.pull - rKick * a.kickBack - meleeThrust
    );
    root.current.rotation.set(
      0.08 + rKick * a.kickPitch + pose.tip * 0.4 + pose.slap,
      0.1 + pose.twist * 0.2 + rKick * a.kickYaw,
      0.05 + pose.twist * 0.85 + pose.roll + swayRoll + rKick * a.kickRoll
    );
    root.current.scale.setScalar(1.35 * (1 - adsT * 0.92));
    root.current.visible = show && adsT < 0.78;

    gunRig.current.rotation.x = pose.tip * 0.2 + rKick * a.gunKickPitch;
    gunRig.current.position.z = rKick * -a.gunKickBack;
    gunRig.current.position.y = pose.slap * 0.015;

    if (magRef.current) {
      const rest = magRestRef.current;
      if (style === 'melee') {
        magRef.current.visible = false;
      } else if (transientMag) {
        magRef.current.visible = reloadT.current > 0.15 && pose.magVis > 0.05;
      } else {
        magRef.current.visible = pose.magVis > 0.02;
      }
      magRef.current.position.set(
        rest[0] + pose.magX,
        rest[1] + pose.magY,
        rest[2] + pose.magZ
      );
      magRef.current.rotation.set(pose.magRotX, 0, pose.magRotZ);
      magRef.current.scale.setScalar(pose.magScale || 1);
      magRef.current.traverse((obj) => {
        if (obj.material && obj.material.opacity !== undefined) {
          obj.material.transparent = true;
          obj.material.opacity = clamp01(pose.magVis);
        }
      });
    }

    if (leftHand.current) {
      // The support hand rides back with the bolt during a manual cycle.
      leftHand.current.position.set(
        pose.leftX + cyclePull * 0.25,
        pose.leftY + cyclePull * 0.3,
        pose.leftZ - cyclePull * 0.45
      );
      leftHand.current.rotation.set(
        pose.leftPitch + cyclePull * 1.6,
        pose.leftYaw,
        pose.leftX * 0.5
      );
    }
    if (rightHand.current) {
      rightHand.current.rotation.set(pose.tip * 0.08, 0, pose.twist * 0.05);
      rightHand.current.position.set(0, pose.tip * -0.01, pose.pull * 0.5);
    }

    if (slideRef.current) {
      const z = -(pose.slide + (a.slideKick > 0 ? slideKick.current : 0));
      slideRef.current.position.set(0, 0, z);
    }
    if (breakRef.current) {
      breakRef.current.rotation.set(pose.breakAngle, 0, 0);
    }
    if (boltRef.current) {
      boltRef.current.position.set(
        0,
        0,
        pose.bolt +
          cyclePull +
          (a.boltKick > 0 ? slideKick.current : slideKick.current * 0.5)
      );
      boltRef.current.rotation.z = pose.boltLift + cycleLift;
    }
    if (chargeRef.current) {
      chargeRef.current.position.set(
        0,
        0,
        pose.charge + (a.chargeKick > 0 ? slideKick.current : slideKick.current * 0.4)
      );
    }

    const isPie = weaponId === 'spatula';
    const isMelee = style === 'melee';
    const flashing = !isPie && !isMelee && state.muzzleFlash > 0 && a.flashScale > 0;
    if (flashing) flashAge.current = 0;
    else flashAge.current += dt;

    const flashOn = flashing || (flashAge.current < 0.05 && a.flashScale > 0);
    const flashScaleVal = flashing
      ? (0.95 + Math.random() * 0.85) * a.flashScale
      : Math.max(0, 1 - flashAge.current / 0.05) * a.flashScale;

    let mz = flashPos;
    if (style === 'break' && pose.breakAngle > 0.05 && breakRef.current) {
      mz = [
        flashPos[0],
        flashPos[1] - Math.sin(pose.breakAngle) * 0.35,
        flashPos[2] + (1 - Math.cos(pose.breakAngle)) * 0.15,
      ];
    }

    if (flash.current) {
      flash.current.visible = flashOn && !isPie && !isMelee;
      flash.current.position.set(mz[0], mz[1], mz[2]);
      flash.current.scale.setScalar(flashScaleVal);
    }
    if (coneRef.current) {
      coneRef.current.visible = flashOn && !isPie && !isMelee;
      coneRef.current.position.set(mz[0], mz[1], mz[2] - 0.06);
      coneRef.current.rotation.set(-Math.PI / 2, 0, Math.random() * 6);
      coneRef.current.scale.setScalar(flashScaleVal * 1.15);
    }
    if (flashLight.current) {
      flashLight.current.position.set(mz[0], mz[1], mz[2]);
      flashLight.current.intensity =
        flashOn && !isPie && !isMelee
          ? a.lightIntensity + Math.random() * 4
          : 0;
    }
    sparkRefs.current.forEach((spark, i) => {
      if (!spark) return;
      const useSpark = flashOn && !isPie && !isMelee && i < a.sparkCount;
      spark.visible = useSpark;
      if (!useSpark) return;
      const ang = (i / Math.max(1, a.sparkCount)) * Math.PI * 2 + Math.random();
      spark.position.set(
        mz[0] + Math.cos(ang) * 0.045,
        mz[1] + Math.sin(ang) * 0.045,
        mz[2] - 0.02 - Math.random() * 0.1
      );
      spark.rotation.set(Math.random(), Math.random(), Math.random());
      spark.scale.setScalar((0.65 + Math.random()) * Math.min(1.4, a.flashScale));
    });
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={72} near={0.05} far={8} position={[0, 0, 0]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[0.5, 1.0, 0.4]} intensity={0.7} />
      <directionalLight position={[-0.3, 0.2, 0.6]} intensity={0.25} color="#a8b8d0" />
      <group ref={root} frustumCulled={false}>
        <Hands
          outfitLoadout={outfitLoadout}
          outfitId={outfitId}
          outfitColor={outfitColor}
          leftRef={leftHand}
          rightRef={rightHand}
        />
        <group ref={gunRig}>
          <FpGun
            key={weaponId}
            weaponId={weaponId}
            slideRef={slideRef}
            breakRef={breakRef}
            boltRef={boltRef}
            chargeRef={chargeRef}
          >
            <group ref={magRef} position={magRest}>
              <MagMesh weaponId={weaponId} />
            </group>
            <MuzzleFX flashRef={flash} lightRef={flashLight} sparkRefs={sparkRefs} />
          </FpGun>
        </group>
      </group>
    </>
  );
}

export default function WeaponViewmodel() {
  return (
    <Hud renderPriority={1}>
      <ViewmodelScene />
    </Hud>
  );
}
