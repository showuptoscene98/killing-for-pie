import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../GameContext';
import { resolveOutfit, loadoutFromPreset, normalizeLoadout } from './outfits';
import BulgarianKit, { usesBulgarianKit } from './BulgarianKit';
import MossadKit, { usesMossadKit } from './MossadKit';
import CallCenterKit, { usesCallCenterKit } from './CallCenterKit';
import CowboyKit, { usesCowboyKit } from './CowboyKit';
import FemaleHair, { FemaleChest, applyGenderLook, bodyDims } from './GenderLook';
import Toon from '../style/Toon';
import { WorldGun } from '../weapons/GunMeshes';

function remoteLoadout(r) {
  if (r.outfitId === 'custom' && r.outfitLoadout) {
    return normalizeLoadout(r.outfitLoadout, r.outfitLoadout.body || 'chef');
  }
  if (r.outfitLoadout && r.outfitId === 'custom') {
    return normalizeLoadout(r.outfitLoadout);
  }
  // Named outfits always use their designed default
  if (r.outfitId && r.outfitId !== 'custom') {
    const L = loadoutFromPreset(r.outfitId, r.outfitColor || 'default');
    return L;
  }
  if (r.outfitLoadout) return normalizeLoadout(r.outfitLoadout, r.outfitId);
  const L = loadoutFromPreset(r.outfitId || 'chef', r.outfitColor || 'default');
  if (r.outfitYarmulke) L.extras = { ...L.extras, yarmulke: true };
  return L;
}

function RemotePlayerModel({ index, remotesRef, hideGun = false }) {
  const root = useRef();
  const torso = useRef();
  const torsoMat = useRef();
  const sleeveL = useRef();
  const sleeveR = useRef();
  const pantsLMesh = useRef();
  const pantsRMesh = useRef();
  const pantsL = useRef();
  const pantsR = useRef();
  const headMesh = useRef();
  const headMat = useRef();
  const maskMesh = useRef();
  const accentMat = useRef();
  const accentMesh = useRef();
  const hatChef = useRef();
  const hatDelivery = useRef();
  const hoodHazmat = useRef();
  const lastKey = useRef('');
  const [kitOutfit, setKitOutfit] = useState(null);
  const [mossadOutfit, setMossadOutfit] = useState(null);
  const [callCenterOutfit, setCallCenterOutfit] = useState(null);
  const [cowboyOutfit, setCowboyOutfit] = useState(null);
  const [hairOutfit, setHairOutfit] = useState(null);
  const [torsoColor, setTorsoColor] = useState('#c4b48a');
  const [gender, setGender] = useState('male');
  const [weaponId, setWeaponId] = useState('m1911');
  const gunGroup = useRef();

  useFrame(() => {
    const r = remotesRef.current[index];
    if (!root.current) return;
    if (!r || r.status === 'dead' || r.status === 'spectator') {
      root.current.visible = false;
      return;
    }
    root.current.visible = true;
    const downed = r.status === 'downed';
    root.current.position.set(r.x, downed ? 0.28 : 0, r.z);
    root.current.rotation.order = 'YXZ';
    root.current.rotation.x = downed ? -Math.PI / 2 : 0;
    root.current.rotation.y = r.yaw;
    root.current.rotation.z = 0;
    if (gunGroup.current) gunGroup.current.visible = !hideGun && !downed;

    const wid = r.weaponId || 'm1911';
    if (weaponId !== wid) setWeaponId(wid);

    const loadout = remoteLoadout(r);
    const g = r.outfitGender === 'female' ? 'female' : 'male';
    const raw = resolveOutfit(loadout);
    const o = applyGenderLook(raw, g);
    const key = `${JSON.stringify(loadout)}:${g}`;
    if (lastKey.current !== key) {
      lastKey.current = key;
      setGender(g);
      const d = bodyDims(g);
      if (torso.current) {
        torso.current.scale.set(
          d.torso[0] / 0.34,
          d.torso[1] / 0.76,
          d.torso[2] / 0.34
        );
        torso.current.position.y = d.torsoY;
      }
      if (pantsRMesh.current) {
        pantsRMesh.current.position.x = d.legX;
        pantsRMesh.current.scale.set(
          d.leg[0] / 0.14,
          d.leg[1] / 0.72,
          d.leg[2] / 0.14
        );
      }
      if (pantsLMesh.current) {
        pantsLMesh.current.position.x = -d.legX;
        pantsLMesh.current.scale.set(
          d.leg[0] / 0.14,
          d.leg[1] / 0.72,
          d.leg[2] / 0.14
        );
      }
      if (headMesh.current) {
        headMesh.current.position.y = d.headY - 0.03;
        headMesh.current.scale.setScalar(g === 'female' ? 0.9 : 1);
      }
      if (torsoMat.current) torsoMat.current.color.set(o.torso);
      setTorsoColor(o.torso);
      if (sleeveL.current) sleeveL.current.color.set(o.sleeve);
      if (sleeveR.current) sleeveR.current.color.set(o.sleeve);
      if (pantsL.current) pantsL.current.color.set(o.pants);
      if (pantsR.current) pantsR.current.color.set(o.pants);
      if (accentMat.current) {
        accentMat.current.color.set(o.accent);
        accentMat.current.emissive.set(o.accent);
      }
      if (accentMesh.current) {
        accentMesh.current.visible =
          !usesBulgarianKit(o) &&
          !usesMossadKit(o) &&
          !usesCallCenterKit(o) &&
          !usesCowboyKit(o);
      }
      if (headMat.current) {
        headMat.current.color.set(
          o.showHood
            ? o.head
            : o.showBald || usesBulgarianKit(o)
              ? o.skin || '#c49a6c'
              : '#a89878'
        );
      }
      if (maskMesh.current) {
        maskMesh.current.visible = !!o.showMask;
        if (o.mask) maskMesh.current.material.color.set(o.mask);
      }
      if (hatChef.current) hatChef.current.visible = !!o.showToque;
      if (hatDelivery.current) hatDelivery.current.visible = !!o.showCap;
      if (hoodHazmat.current) hoodHazmat.current.visible = !!o.showHood;
      setKitOutfit(usesBulgarianKit(o) ? { ...o } : null);
      setMossadOutfit(usesMossadKit(o) ? { ...o } : null);
      setCallCenterOutfit(usesCallCenterKit(o) ? { ...o } : null);
      setCowboyOutfit(usesCowboyKit(o) ? { ...o } : null);
      setHairOutfit(g === 'female' && !o.showHood ? { ...o } : null);
    }

    if (torsoMat.current) {
      torsoMat.current.emissiveIntensity = r.muzzleFlash ? 0.55 : 0.05;
    }
  });

  const d = bodyDims(gender);

  return (
    <group ref={root} visible={false}>
      <mesh ref={pantsRMesh} position={[0.11, 0.36, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.58, 5, 10]} />
        <Toon ref={pantsR} color="#2a241c" />
      </mesh>
      <mesh ref={pantsLMesh} position={[-0.11, 0.36, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.58, 5, 10]} />
        <Toon ref={pantsL} color="#2a241c" />
      </mesh>
      <mesh ref={torso} position={[0, 1.05, 0]} scale={[1, 1, 0.82]} castShadow>
        <capsuleGeometry args={[0.17, 0.42, 6, 12]} />
        <Toon
          ref={torsoMat}
          color="#c4b48a"
          emissive="#c4b48a"
          emissiveIntensity={0.05}
        />
      </mesh>
      {gender === 'female' && (
        <FemaleChest
          color={torsoColor}
          y={d.chestY || 1.18}
          Material={Toon}
        />
      )}
      <mesh ref={accentMesh} position={[0.14, 1.15, 0.14]} rotation={[Math.PI / 2, 0, 0.3]}>
        <capsuleGeometry args={[0.04, 0.04, 4, 8]} />
        <Toon
          ref={accentMat}
          color="#8a2020"
          emissive="#8a2020"
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh position={[0.32, 1.0, 0.12]} rotation={[0.35, 0, -0.2]} castShadow>
        <capsuleGeometry args={[0.05, 0.42, 5, 10]} />
        <Toon ref={sleeveR} color="#a89878" />
      </mesh>
      <mesh position={[-0.32, 1.0, 0.12]} rotation={[0.35, 0, 0.2]} castShadow>
        <capsuleGeometry args={[0.05, 0.42, 5, 10]} />
        <Toon ref={sleeveL} color="#a89878" />
      </mesh>
      <mesh ref={headMesh} position={[0, 1.52, 0]} castShadow>
        <capsuleGeometry args={[0.13, 0.12, 5, 12]} />
        <Toon ref={headMat} color="#a89878" />
      </mesh>
      {hairOutfit && <FemaleHair o={hairOutfit} y={d.headY - 0.03} />}
      <mesh ref={hatChef} position={[0, 1.82, 0]} visible={false}>
        <cylinderGeometry args={[0.16, 0.18, 0.32, 12]} />
        <Toon color="#c4b48a" />
      </mesh>
      <mesh
        ref={hatDelivery}
        position={[0, 1.7, 0]}
        rotation={[-0.15, 0, 0]}
        visible={false}
      >
        <cylinderGeometry args={[0.18, 0.2, 0.1, 12]} />
        <Toon color="#2a241c" />
      </mesh>
      <mesh ref={hoodHazmat} position={[0, 1.68, 0]} visible={false}>
        <capsuleGeometry args={[0.16, 0.08, 5, 10]} />
        <Toon color="#6a5a28" />
      </mesh>
      <mesh
        ref={maskMesh}
        position={[0, 1.52, 0.14]}
        visible={false}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <capsuleGeometry args={[0.08, 0.06, 4, 8]} />
        <Toon color="#4a5c30" transparent opacity={0.75} />
      </mesh>

      {!hideGun && (
        <group ref={gunGroup}>
          <WorldGun key={weaponId} weaponId={weaponId} />
        </group>
      )}

      {kitOutfit && <BulgarianKit o={kitOutfit} />}
      {mossadOutfit && (
        <MossadKit o={mossadOutfit} yarmulke={!!mossadOutfit.showYarmulke} />
      )}
      {callCenterOutfit && <CallCenterKit o={callCenterOutfit} />}
      {cowboyOutfit && (
        <CowboyKit
          o={cowboyOutfit}
          hatY={
            bodyDims(gender).headY -
            0.03 +
            0.16 * (gender === 'female' ? 0.9 : 1) +
            0.08
          }
        />
      )}
    </group>
  );
}

export default function RemotePlayers({ hideGun = false }) {
  const { remotesRef } = useGame();
  if (!remotesRef) return null;
  const slots = [0, 1, 2, 3];

  return (
    <group>
      {slots.map((i) => (
        <RemotePlayerModel
          key={i}
          index={i}
          remotesRef={remotesRef}
          hideGun={hideGun}
        />
      ))}
    </group>
  );
}
