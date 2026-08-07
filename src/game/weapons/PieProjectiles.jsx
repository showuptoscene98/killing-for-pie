import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameApi } from '../GameContext';
import { awardHit } from '../systems/PointsSystem';
import { play } from '../audio/sound';
import { killZombie, isInstaKillActive } from '../systems/PowerupSystem';
import { sampleFloorY } from '../systems/collision';
import { getActiveMap } from '../map/activeMap';

let nextPieId = 1;

export function spawnPieProjectile(state, origin, direction, weaponDef) {
  if (!state.pies) state.pies = [];
  const dir = direction.clone().normalize();
  const kind = weaponDef.projectile || 'pie';
  // slight loft so throws arc; chainsaws fly flatter
  dir.y += kind === 'chainsaw' ? 0.06 : 0.12;
  dir.normalize();
  const speed = weaponDef.projectileSpeed || 22;
  state.pies.push({
    id: nextPieId++,
    kind,
    x: origin.x + dir.x * 0.6,
    y: origin.y + dir.y * 0.6,
    z: origin.z + dir.z * 0.6,
    vx: dir.x * speed,
    vy: dir.y * speed,
    vz: dir.z * speed,
    life: kind === 'chainsaw' ? 3.2 : 2.8,
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
  const isSaw = pie.kind === 'chainsaw';
  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (z.dead) continue;
    const sc = z.scale || 1;
    const bodyY = (z.y || 0) + 0.9 * sc;
    const dist = Math.hypot(z.x - pie.x, z.z - pie.z);
    const yDist = Math.abs(bodyY - pie.y);
    if (dist > pie.splash || yDist > 2.5) continue;
    const falloff = 1 - dist / pie.splash;
    const dmg = insta
      ? z.hp
      : pie.damage * (0.55 + falloff * 0.45);
    z.hp -= dmg;
    z.hitFlash = 0.15;
    // fling knockback — saws shred harder
    const push = (isSaw ? 3.4 : 2.2) * falloff;
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
    play('menuHover');
  } else if (isSaw) {
    play('chainsawHit');
  }
}

function updateProjectileMatrices(mesh, pies, kind, maxCount, dummy) {
  if (!mesh) return;
  let write = 0;
  for (let i = 0; i < pies.length && write < maxCount; i++) {
    const p = pies[i];
    if (p.spent) continue;
    if ((p.kind || 'pie') !== kind) continue;
    const d = dummy;
    d.position.set(p.x, p.y, p.z);
    if (kind === 'chainsaw') {
      // Spin like a thrown saw — fast tumble on the flight axis
      const t = (p.life || 1) * 14;
      d.rotation.set(t * 1.7, t * 0.4, t * 2.2);
      d.scale.set(1.15, 1.15, 1.15);
    } else {
      d.rotation.set((p.life || 1) * 8, (p.life || 1) * 5, (p.life || 1) * 3);
      d.scale.setScalar(1);
    }
    d.updateMatrix();
    mesh.setMatrixAt(write, d.matrix);
    write++;
  }
  for (let i = write; i < maxCount; i++) {
    dummy.position.set(0, -50, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.count = write;
  mesh.instanceMatrix.needsUpdate = true;
}

/** Clients render host-synced pies without re-simulating physics */
export default function PieProjectiles() {
  const { stateRef, zombiesRef } = useGameApi();
  const pieMeshRef = useRef();
  const sawMeshRef = useRef();
  const maxPies = 24;
  const dummy = useRef(new THREE.Object3D());

  useFrame((_, dt) => {
    const state = stateRef.current;
    if (!state.pies) state.pies = [];
    const pies = state.pies;
    const zombies = zombiesRef.current;
    const clamped = Math.min(dt, 0.05);
    const isClientView = !!state.coop && !state.isHost;
    const map = getActiveMap();
    const ceiling = (map.WALL_HEIGHT || 3.5) + 1.2;

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
        // Land on whatever deck/stair/ground is under the throw (not just y=0)
        const floorY = sampleFloorY(p.x, p.z, Math.max(0, p.y - 0.5));
        if (p.y <= floorY + 0.15) {
          p.y = floorY + 0.15;
          hit = true;
        }
        if (p.y > ceiling) hit = true;
        if (p.life <= 0) hit = true;

        if (!hit) {
          const hitR = p.kind === 'chainsaw' ? 0.7 : 0.55;
          for (let zi = 0; zi < zombies.length; zi++) {
            const z = zombies[zi];
            if (z.dead) continue;
            const sc = z.scale || 1;
            const bodyY = (z.y || 0) + 1.0 * sc;
            const dist = Math.hypot(z.x - p.x, z.z - p.z);
            if (dist < hitR * sc && Math.abs(p.y - bodyY) < 1.1 * sc) {
              hit = true;
              break;
            }
          }
        }

        if (hit) explodePie(p, zombies, state);
      }
    }

    const d = dummy.current;
    updateProjectileMatrices(pieMeshRef.current, pies, 'pie', maxPies, d);
    updateProjectileMatrices(sawMeshRef.current, pies, 'chainsaw', maxPies, d);
  });

  return (
    <group>
      <instancedMesh ref={pieMeshRef} args={[undefined, undefined, maxPies]}>
        <cylinderGeometry args={[0.28, 0.3, 0.12, 8]} />
        <meshStandardMaterial color="#d4a574" emissive="#5a3018" emissiveIntensity={0.15} />
      </instancedMesh>
      {/* Thrown chainsaw — flat bar disc silhouette */}
      <instancedMesh ref={sawMeshRef} args={[undefined, undefined, maxPies]}>
        <boxGeometry args={[0.12, 0.55, 0.9]} />
        <meshStandardMaterial color="#c8a020" emissive="#5a4010" emissiveIntensity={0.2} metalness={0.45} roughness={0.4} />
      </instancedMesh>
    </group>
  );
}
