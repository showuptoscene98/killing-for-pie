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

/**
 * Quaternius packs author the bore along +X. Our FP/world rigs expect muzzle
 * at local -Z and the firing hand at `grip`. `gripAnchor` is the AABB lerp
 * (0..1 from min→max) that marks the hold point on the mesh before we snap it
 * to `grip`.
 */
const GLB_FIT = {
  m1911: {
    rotation: [0, Math.PI / 2, 0],
    targetLen: 0.28,
    grip: [0, -0.08, 0.04],
    gripAnchor: [0.5, 0.22, 0.82],
  },
  m14: {
    rotation: [0, Math.PI / 2, 0],
    targetLen: 0.55,
    grip: [0, -0.08, 0.12],
    gripAnchor: [0.5, 0.3, 0.78],
  },
  mp5: {
    rotation: [0, Math.PI / 2, 0],
    targetLen: 0.42,
    grip: [0, -0.08, 0.04],
    gripAnchor: [0.5, 0.3, 0.72],
  },
  olympia: {
    rotation: [0, Math.PI / 2, 0],
    targetLen: 0.52,
    grip: [0, -0.04, 0.1],
    gripAnchor: [0.5, 0.42, 0.8],
  },
  sniper: {
    rotation: [0, Math.PI / 2, 0],
    targetLen: 0.62,
    grip: [0, -0.08, 0.14],
    gripAnchor: [0.5, 0.3, 0.78],
  },
  mosin: {
    rotation: [0, Math.PI / 2, 0],
    targetLen: 0.64,
    // Wrist hold slightly forward of the sniper so the longer barrel still leads.
    grip: [0, -0.05, 0.14],
    gripAnchor: [0.5, 0.3, 0.78],
  },
  ak47: {
    rotation: [0, Math.PI / 2, 0],
    targetLen: 0.5,
    grip: [0, -0.08, 0.06],
    gripAnchor: [0.5, 0.3, 0.78],
  },
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
 * Auto-fits bounding-box length and pivots on the grip for the FP hands.
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

    // Rotate into our bore frame first (+X → -Z), then scale + grip-pivot.
    const wrap = new THREE.Group();
    wrap.add(cloned);
    wrap.rotation.set(fit.rotation[0], fit.rotation[1], fit.rotation[2]);
    wrap.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(wrap);
    const size = new THREE.Vector3();
    box.getSize(size);
    const longest = Math.max(size.x, size.y, size.z, 0.001);
    const target = (fp ? fit.targetLen : fit.targetLen * 1.35) * scale;
    wrap.scale.setScalar(target / longest);

    wrap.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(wrap);
    const [ax, ay, az] = fit.gripAnchor;
    const gripPoint = new THREE.Vector3(
      THREE.MathUtils.lerp(box2.min.x, box2.max.x, ax),
      THREE.MathUtils.lerp(box2.min.y, box2.max.y, ay),
      THREE.MathUtils.lerp(box2.min.z, box2.max.z, az)
    );
    const gripTarget = new THREE.Vector3(
      fit.grip[0],
      fit.grip[1],
      fit.grip[2]
    );
    wrap.position.copy(gripTarget).sub(gripPoint);

    return wrap;
  }, [scene, fp, fit, scale]);

  return <primitive object={root} />;
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
