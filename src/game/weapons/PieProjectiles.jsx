import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../GameContext';
import { awardHit } from '../systems/PointsSystem';
import { play } from '../audio/sound';
import { killZombie, isInstaKillActive } from '../systems/PowerupSystem';

let nextPieId = 1;

export function spawnPieProjectile(state, origin, direction, weaponDef) {
  if (!state.pies) state.pies = [];
  const dir = direction.clone().normalize();
  // slight loft so pies arc
  dir.y += 0.12;
  dir.normalize();
  const speed = weaponDef.projectileSpeed || 22;
  state.pies.push({
    id: nextPieId++,
    x: origin.x + dir.x * 0.6,
    y: origin.y + dir.y * 0.6,
    z: origin.z + dir.z * 0.6,
    vx: dir.x * speed,
    vy: dir.y * speed,
    vz: dir.z * speed,
    life: 2.8,
    damage: weaponDef.damage,
    splash: weaponDef.splashRadius || 2.2,
    grav: weaponDef.projectileGravity || 12,
    spent: false,
  });
}

function explodePie(pie, zombies, state) {
  if (pie.spent) return;
  pie.spent = true;
  let any = false;
  const insta = isInstaKillActive(state);
  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (z.dead) continue;
    const dist = Math.hypot(z.x - pie.x, z.z - pie.z);
    const yDist = Math.abs(0.9 - pie.y);
    if (dist > pie.splash || yDist > 2.5) continue;
    const falloff = 1 - dist / pie.splash;
    const dmg = insta
      ? z.hp
      : pie.damage * (0.55 + falloff * 0.45);
    z.hp -= dmg;
    z.hitFlash = 0.15;
    // fling knockback
    const push = 2.2 * falloff;
    const dx = z.x - pie.x;
    const dz = z.z - pie.z;
    const len = Math.hypot(dx, dz) || 1;
    z.x += (dx / len) * push;
    z.z += (dz / len) * push;
    awardHit(state, false);
    any = true;
    if (z.hp <= 0 && !z.dead) {
      killZombie(z, state, state, false);
    } else {
      play('zombieHit');
    }
  }
  if (!any) {
    // soft splat cue reuse
    play('menuHover');
  }
}

/** Clients render host-synced pies without re-simulating physics */
export default function PieProjectiles() {
  const { stateRef, zombiesRef } = useGame();
  const meshRef = useRef();
  const maxPies = 24;
  const dummy = useRef(new THREE.Object3D());

  useFrame((_, dt) => {
    const state = stateRef.current;
    if (!state.pies) state.pies = [];
    const pies = state.pies;
    const zombies = zombiesRef.current;
    const clamped = Math.min(dt, 0.05);
    const isClientView = !!state.coop && !state.isHost;

    if (!isClientView) {
      for (let i = pies.length - 1; i >= 0; i--) {
        const p = pies[i];
        if (p.spent) {
          pies.splice(i, 1);
          continue;
        }
        p.life -= clamped;
        p.vy -= p.grav * clamped;
        p.x += p.vx * clamped;
        p.y += p.vy * clamped;
        p.z += p.vz * clamped;

        let hit = false;
        if (p.y <= 0.15) {
          p.y = 0.15;
          hit = true;
        }
        if (p.y > 3.1) hit = true;
        if (p.life <= 0) hit = true;

        if (!hit) {
          for (let zi = 0; zi < zombies.length; zi++) {
            const z = zombies[zi];
            if (z.dead) continue;
            const dist = Math.hypot(z.x - p.x, z.z - p.z);
            if (dist < 0.55 && Math.abs(p.y - 1.0) < 1.1) {
              hit = true;
              break;
            }
          }
        }

        if (hit) explodePie(p, zombies, state);
      }
    }

    if (!meshRef.current) return;
    const count = Math.min(pies.length, maxPies);
    if (count === 0 && meshRef.current.count === 0) return;
    for (let i = 0; i < maxPies; i++) {
      const d = dummy.current;
      if (i < count && !pies[i].spent) {
        const p = pies[i];
        d.position.set(p.x, p.y, p.z);
        d.rotation.set((p.life || 1) * 8, (p.life || 1) * 5, (p.life || 1) * 3);
        d.scale.setScalar(1);
      } else {
        d.position.set(0, -50, 0);
        d.scale.setScalar(0);
      }
      d.updateMatrix();
      meshRef.current.setMatrixAt(i, d.matrix);
    }
    meshRef.current.count = count;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxPies]}>
      <cylinderGeometry args={[0.28, 0.3, 0.12, 8]} />
      <meshStandardMaterial color="#d4a574" emissive="#5a3018" emissiveIntensity={0.15} />
    </instancedMesh>
  );
}
