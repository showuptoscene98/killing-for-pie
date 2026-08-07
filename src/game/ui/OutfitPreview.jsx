import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { resolveOutfit } from '../player/outfits';
import BulgarianKit, { usesBulgarianKit } from '../player/BulgarianKit';
import MossadKit, { usesMossadKit } from '../player/MossadKit';
import CallCenterKit, { usesCallCenterKit } from '../player/CallCenterKit';
import CowboyKit, { usesCowboyKit } from '../player/CowboyKit';
import FemaleHair, { FemaleChest, bodyDims, applyGenderLook } from '../player/GenderLook';
import { BodyPart, BodyHead, BodyStub, useBodyStyle, headAnchor } from '../style/BodyParts';
import Toon from '../style/Toon';

function Mannequin({ outfitLoadout, outfitGender = 'male' }) {
  const root = useRef();
  const style = useBodyStyle();
  const o = applyGenderLook(resolveOutfit(outfitLoadout), outfitGender);
  const bg = usesBulgarianKit(o);
  const mossad = usesMossadKit(o);
  const callCenter = usesCallCenterKit(o);
  const cowboy = usesCowboyKit(o);
  const d = bodyDims(outfitGender);
  const skin = o.showHood
    ? o.head
    : o.showBald || bg
      ? o.skin || '#c49a6c'
      : '#d4c4a8';
  const crown = headAnchor(d.headY, style).crownY;

  useFrame((_, dt) => {
    if (root.current) root.current.rotation.y += dt * 0.7;
  });

  return (
    <group ref={root} position={[0, -0.95, 0]} key={style}>
      <BodyPart position={[d.legX, 0.35, 0]} args={d.leg} style={style} castShadow matProps={{ color: o.pants }} />
      <BodyPart position={[-d.legX, 0.35, 0]} args={d.leg} style={style} castShadow matProps={{ color: o.pants }} />
      {d.hip && (
        <BodyPart position={[0, d.hipY, 0]} args={d.hip} style={style} castShadow matProps={{ color: o.pants }} />
      )}
      <BodyPart position={[0, d.torsoY, 0]} args={d.torso} style={style} castShadow matProps={{ color: o.torso }} />
      {d.female && <FemaleChest color={o.torso} y={d.chestY} Material={Toon} style={style} />}
      {!bg && !mossad && !callCenter && !cowboy && (
        <mesh position={[0.16, 1.12, 0.16]}>
          <boxGeometry args={[0.14, 0.14, 0.02]} />
          <Toon color={o.accent} emissive={o.accent} emissiveIntensity={0.25} />
        </mesh>
      )}
      <BodyPart
        position={[d.armX, 1.0, 0]}
        rotation={[0, 0, -0.35]}
        args={d.arm}
        style={style}
        castShadow
        matProps={{ color: o.sleeve }}
      />
      <BodyPart
        position={[-d.armX, 1.0, 0]}
        rotation={[0, 0, 0.35]}
        args={d.arm}
        style={style}
        castShadow
        matProps={{ color: o.sleeve }}
      />
      <BodyStub position={[d.armX + 0.08, 0.7, 0.05]} size={0.1} style={style} matProps={{ color: o.glove }} />
      <BodyStub position={[-(d.armX + 0.08), 0.7, 0.05]} size={0.1} style={style} matProps={{ color: o.glove }} />
      <BodyHead position={[0, d.headY, 0]} size={d.head[0]} style={style} castShadow matProps={{ color: skin }} />
      {d.female && !o.showHood && <FemaleHair o={o} y={d.headY} style={style} />}
      {o.showToque && (
        <mesh position={[0, crown + 0.12, 0]}>
          <cylinderGeometry args={[0.18, 0.2, 0.32, 12]} />
          <Toon color="#f5f2ea" />
        </mesh>
      )}
      {o.showCap && (
        <mesh position={[0, crown + 0.02, 0]} rotation={[-0.15, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 0.1, 12]} />
          <Toon color={o.head} />
        </mesh>
      )}
      {o.showHood && (
        <>
          {o.showMask && (
            <mesh position={[0, d.headY, headAnchor(d.headY, style).faceZ]}>
              <boxGeometry args={[0.28, 0.16, 0.06]} />
              <Toon
                color={o.mask}
                transparent
                opacity={0.75}
                emissive={o.mask}
                emissiveIntensity={0.15}
              />
            </mesh>
          )}
          <mesh position={[0, crown + 0.02, 0]}>
            <sphereGeometry args={[0.2, 10, 10]} />
            <Toon color={o.head} />
          </mesh>
        </>
      )}
      {o.showMask && !o.showHood && (
        <mesh position={[0, d.headY, headAnchor(d.headY, style).faceZ]}>
          <boxGeometry args={[0.28, 0.16, 0.06]} />
          <Toon
            color={o.mask}
            transparent
            opacity={0.75}
            emissive={o.mask}
            emissiveIntensity={0.15}
          />
        </mesh>
      )}
      {bg && <BulgarianKit o={o} headY={d.headY} style={style} />}
      {mossad && <MossadKit o={o} yarmulke={o.showYarmulke} />}
      {callCenter && <CallCenterKit o={o} />}
      {cowboy && (
        <CowboyKit o={o} headY={d.headY} hatY={crown + 0.09} style={style} />
      )}
    </group>
  );
}

export default function OutfitPreview({
  outfitLoadout,
  outfitId,
  outfitColor = 'default',
  outfitYarmulke = false,
  outfitGender = 'male',
}) {
  const loadout =
    outfitLoadout ||
    (typeof outfitId === 'string'
      ? { body: outfitId, color: outfitColor, extras: outfitYarmulke ? { yarmulke: true } : {} }
      : outfitId);

  const key = JSON.stringify(loadout) + ':' + outfitGender;

  return (
    <div className="outfit-preview">
      <Canvas
        camera={{ fov: 35, position: [0, 1.2, 3.8], near: 0.1, far: 20 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <hemisphereLight args={['#ffe8c8', '#2a2010', 0.4]} />
        <Mannequin key={key} outfitLoadout={loadout} outfitGender={outfitGender} />
      </Canvas>
    </div>
  );
}
