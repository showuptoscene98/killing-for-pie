import { Suspense, useMemo } from 'react';
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

/** Per-gun orientation relative to our FP/world grips (scale is auto-fit). */
const GLB_FIT = {
  m1911: { rotation: [0, Math.PI, 0], position: [0, -0.02, 0.02], targetLen: 0.28 },
  m14: { rotation: [0, Math.PI, 0], position: [0, -0.01, -0.04], targetLen: 0.55 },
  mp5: { rotation: [0, Math.PI, 0], position: [0, -0.01, -0.02], targetLen: 0.42 },
  olympia: { rotation: [0, Math.PI, 0], position: [0, 0, -0.02], targetLen: 0.52 },
  sniper: { rotation: [0, Math.PI, 0], position: [0, -0.01, -0.06], targetLen: 0.62 },
  mosin: { rotation: [0, Math.PI, 0], position: [0, -0.01, -0.08], targetLen: 0.64 },
  ak47: { rotation: [0, Math.PI, 0], position: [0, -0.01, -0.03], targetLen: 0.5 },
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
    // Depth-tested so a mis-scaled mesh can't paint a full-screen slab over the scene.
    return new THREE.MeshBasicMaterial({
      color,
      depthTest: true,
      depthWrite: true,
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
 * Auto-fits bounding-box length so oversized OBJs don't fill the FP camera.
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

    // Quaternius OBJs land at ~1–2 units; FP view sits at ~0.3–0.6. Normalize.
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const longest = Math.max(size.x, size.y, size.z, 0.001);
    const target = (fp ? fit.targetLen : fit.targetLen * 1.35) * scale;
    const fitScale = target / longest;
    cloned.scale.setScalar(fitScale);

    // Recenter on grip so auto-scale doesn't drift the barrel into the camera.
    const box2 = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    box2.getCenter(center);
    cloned.position.sub(center);
    // Bias slightly forward so the breech sits near the hands, not the muzzle.
    cloned.position.z += size.z * fitScale * 0.15;

    return cloned;
  }, [scene, fp, fit.targetLen, scale]);

  return (
    <group rotation={fit.rotation} position={fit.position}>
      <primitive object={root} />
    </group>
  );
}

/** Suspense wrapper — never leave a hung GLTF request blocking the viewmodel. */
export function GlbGun({ weaponId, scale = 1, fp = false }) {
  if (!hasGlbGun(weaponId)) return null;
  return (
    <Suspense fallback={null}>
      <GlbGunMesh weaponId={weaponId} scale={scale} fp={fp} />
    </Suspense>
  );
}

GLB_GUN_IDS.forEach((id) => {
  useGLTF.preload(GLB_URL[id]);
});
