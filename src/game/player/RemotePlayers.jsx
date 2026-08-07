import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameApi } from '../GameContext';
import { resolveOutfit, loadoutFromPreset, normalizeLoadout } from './outfits';
import BulgarianKit, { usesBulgarianKit } from './BulgarianKit';
import MossadKit, { usesMossadKit } from './MossadKit';
import CallCenterKit, { usesCallCenterKit } from './CallCenterKit';
import CowboyKit, { usesCowboyKit } from './CowboyKit';
import FemaleHair, { FemaleChest, applyGenderLook, bodyDims } from './GenderLook';
import Toon from '../style/Toon';
import { WorldGun } from '../weapons/GunMeshes';
import { BodyPart, BodyHead, useBodyStyle, headAnchor } from '../style/BodyParts';
import { smoothToward } from '../net/smoothPose';

/**
 * Camera forward at yaw=0 is -Z; these body kits are authored facing +Z
 * (mask / arms on +Z). Add π so remotes look the way they're aiming.
 */
const FACE_FORWARD = Math.PI;

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
  const smooth = useRef({ init: false, id: null, x: 0, y: 0, z: 0, yaw: 0 });

  useFrame((_, dt) => {
    const r = remotesRef.current[index];
    if (!root.current) return;
    if (!r || r.status === 'dead' || r.status === 'spectator') {
      root.current.visible = false;
      smooth.current.init = false;
      return;
    }
    root.current.visible = true;
    const downed = r.status === 'downed';
    const s = smoothToward(
      smooth.current,
      { id: r.id, x: r.x, y: r.y || 0, z: r.z, yaw: r.yaw || 0 },
      dt,
      { rate: 16, snapDist: 5 }
    );
    root.current.position.set(s.x, downed ? 0.28 : 0, s.z);
    root.current.rotation.order = 'YXZ';
    root.current.rotation.x = downed ? -Math.PI / 2 : 0;
    root.current.rotation.y = s.yaw + FACE_FORWARD;
    root.current.rotation.z = 0;
    if (gunGroup.current) gunGroup.current.visible = !hideGun && !downed;

    const wid = r.weaponId || 'm1911';
    if (weaponId !== wid) setWeaponId(wid);

    const g = r.outfitGender === 'female' ? 'female' : 'male';
    // Cheap key — avoid JSON.stringify every frame on 4 remote slots.
    const key = `${r.id}|${r.outfitId || ''}|${r.outfitColor || ''}|${g}|${r.outfitYarmulke ? 1 : 0}|${r.outfitLoadout ? 1 : 0}`;
    if (lastKey.current !== key) {
      const loadout = remoteLoadout(r);
      const raw = resolveOutfit(loadout);
      const o = applyGenderLook(raw, g);
      lastKey.current = key;
      setGender(g);
      const d = bodyDims(g);
      if (torso.current) {
        torso.current.scale.set(
          d.torso[0] / 0.52,
          d.torso[1] / 0.72,
          d.torso[2] / 0.3
        );
        torso.current.position.y = d.torsoY;
      }
      if (pantsRMesh.current) {
        pantsRMesh.current.position.x = d.legX;
        pantsRMesh.current.scale.set(1, 1, 1);
      }
      if (pantsLMesh.current) {
        pantsLMesh.current.position.x = -d.legX;
        pantsLMesh.current.scale.set(1, 1, 1);
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
  const style = useBodyStyle();

  return (
    <group ref={root} visible={false} key={style}>
      <BodyPart
        ref={pantsRMesh}
        position={[0.12, 0.35, 0]}
        args={[0.18, 0.7, 0.2]}
        style={style}
        castShadow
      >
        <Toon ref={pantsR} color="#2a241c" />
      </BodyPart>
      <BodyPart
        ref={pantsLMesh}
        position={[-0.12, 0.35, 0]}
        args={[0.18, 0.7, 0.2]}
        style={style}
        castShadow
      >
        <Toon ref={pantsL} color="#2a241c" />
      </BodyPart>
      <BodyPart
        ref={torso}
        position={[0, 1.05, 0]}
        args={[0.52, 0.72, 0.3]}
        style={style}
        castShadow
      >
        <Toon
          ref={torsoMat}
          color="#c4b48a"
          emissive="#c4b48a"
          emissiveIntensity={0.05}
        />
      </BodyPart>
      {gender === 'female' && (
        <FemaleChest
          color={torsoColor}
          y={d.chestY || 1.18}
          Material={Toon}
          style={style}
        />
      )}
      <mesh ref={accentMesh} position={[0.16, 1.15, 0.16]}>
        <boxGeometry args={[0.14, 0.14, 0.02]} />
        <Toon
          ref={accentMat}
          color="#8a2020"
          emissive="#8a2020"
          emissiveIntensity={0.25}
        />
      </mesh>
      <BodyPart
        position={[0.36, 1.0, 0.15]}
        rotation={[0.35, 0, -0.2]}
        args={[0.13, 0.5, 0.13]}
        style={style}
        castShadow
      >
        <Toon ref={sleeveR} color="#a89878" />
      </BodyPart>
      <BodyPart
        position={[-0.36, 1.0, 0.15]}
        rotation={[0.35, 0, 0.2]}
        args={[0.13, 0.5, 0.13]}
        style={style}
        castShadow
      >
        <Toon ref={sleeveL} color="#a89878" />
      </BodyPart>
      <BodyHead ref={headMesh} position={[0, 1.52, 0]} size={0.32} style={style} castShadow>
        <Toon ref={headMat} color="#a89878" />
      </BodyHead>
      {hairOutfit && <FemaleHair o={hairOutfit} y={d.headY - 0.03} style={style} />}
      <mesh ref={hatChef} position={[0, 1.82, 0]} visible={false}>
        <cylinderGeometry args={[0.18, 0.2, 0.32, 12]} />
        <Toon color="#c4b48a" />
      </mesh>
      <mesh
        ref={hatDelivery}
        position={[0, 1.68, 0]}
        rotation={[-0.15, 0, 0]}
        visible={false}
      >
        <cylinderGeometry args={[0.2, 0.22, 0.1, 12]} />
        <Toon color="#2a241c" />
      </mesh>
      <mesh ref={hoodHazmat} position={[0, 1.68, 0]} visible={false}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <Toon color="#6a5a28" />
      </mesh>
      <mesh ref={maskMesh} position={[0, 1.52, 0.14]} visible={false}>
        <boxGeometry args={[0.28, 0.16, 0.06]} />
        <Toon color="#4a5c30" transparent opacity={0.75} />
      </mesh>

      {!hideGun && (
        <group ref={gunGroup}>
          <WorldGun key={weaponId} weaponId={weaponId} />
        </group>
      )}

      {kitOutfit && <BulgarianKit o={kitOutfit} headY={d.headY - 0.03} style={style} />}
      {mossadOutfit && (
        <MossadKit o={mossadOutfit} yarmulke={!!mossadOutfit.showYarmulke} />
      )}
      {callCenterOutfit && <CallCenterKit o={callCenterOutfit} />}
      {cowboyOutfit && (
        <CowboyKit
          o={cowboyOutfit}
          headY={bodyDims(gender).headY - 0.03}
          hatY={
            headAnchor(bodyDims(gender).headY - 0.03, style).crownY + 0.09
          }
          style={style}
        />
      )}
    </group>
  );
}

export default function RemotePlayers({ hideGun = false }) {
  const { remotesRef } = useGameApi();
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
