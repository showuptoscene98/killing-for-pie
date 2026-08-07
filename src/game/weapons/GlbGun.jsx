import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DD } from '../style/theme';

const BASE = import.meta.env.BASE_URL || '/';

/** Quaternius Ultimate Gun Pack (CC0) — see public/models/guns/CREDITS.txt */
export const GLB_GUN_IDS = [
  'm1911',
  'm14',
  'mp5',
  'olympia',
  'sniper',
  'mosin',
  'ak47',
];

const GLB_URL = Object.fromEntries(
  GLB_GUN_IDS.map((id) => [id, `${BASE}models/guns/${id}.glb`])
);

/** Per-gun fit so Quaternius meshes sit like our procedural FP poses. */
const GLB_FIT = {
  m1911: { scale: 0.55, rotation: [0, Math.PI, 0], position: [0, -0.02, 0.02] },
  m14: { scale: 0.42, rotation: [0, Math.PI, 0], position: [0, -0.01, -0.04] },
  mp5: { scale: 0.48, rotation: [0, Math.PI, 0], position: [0, -0.01, -0.02] },
  olympia: { scale: 0.44, rotation: [0, Math.PI, 0], position: [0, 0, -0.02] },
  sniper: { scale: 0.4, rotation: [0, Math.PI, 0], position: [0, -0.01, -0.06] },
  mosin: { scale: 0.4, rotation: [0, Math.PI, 0], position: [0, -0.01, -0.08] },
  ak47: { scale: 0.43, rotation: [0, Math.PI, 0], position: [0, -0.01, -0.03] },
};

const WOOD_RE = /wood|stock|grip|handle|butt|furniture/i;
const SCOPE_RE = /scope|optic|glass|lens/i;

function themeColor(mesh) {
  const label = `${mesh.name || ''} ${mesh.material?.name || ''}`;
  if (WOOD_RE.test(label)) return DD.wood;
  if (SCOPE_RE.test(label)) return DD.metalDark;
  return DD.metal;
}

function themeMaterial(mesh, { fp = false } = {}) {
  const color = themeColor(mesh);
  if (fp) {
    // Match procedural FP guns: unlit, drawn over the world.
    return new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
  }
  if (WOOD_RE.test(`${mesh.name || ''} ${mesh.material?.name || ''}`)) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0.04,
    });
  }
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.62,
  });
}

export function hasGlbGun(weaponId) {
  return Boolean(GLB_URL[weaponId]);
}

/**
 * Themed Quaternius gun mesh. Clones + recolors to the muddy cel palette so
 * the pack reads as Killing for Pie furniture, not clean PBR plastic.
 */
export function GlbGunMesh({ weaponId, scale = 1, fp = false }) {
  const url = GLB_URL[weaponId];
  const { scene } = useGLTF(url);
  const fit = GLB_FIT[weaponId] || GLB_FIT.m1911;

  const root = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = !fp;
      obj.receiveShadow = !fp;
      if (fp) obj.renderOrder = 3;
      const mat = themeMaterial(obj, { fp });
      obj.material = Array.isArray(obj.material)
        ? obj.material.map(() => mat.clone())
        : mat;
    });
    return cloned;
  }, [scene, fp]);

  return (
    <group
      scale={fit.scale * scale}
      rotation={fit.rotation}
      position={fit.position}
    >
      <primitive object={root} />
    </group>
  );
}

GLB_GUN_IDS.forEach((id) => {
  useGLTF.preload(GLB_URL[id]);
});
