import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { resolveOutfit } from '../player/outfits';
import BulgarianKit, { usesBulgarianKit } from '../player/BulgarianKit';
import MossadKit, { usesMossadKit } from '../player/MossadKit';
import CallCenterKit, { usesCallCenterKit } from '../player/CallCenterKit';
import CowboyKit, { usesCowboyKit } from '../player/CowboyKit';
import FemaleHair, { FemaleChest, bodyDims, applyGenderLook } from '../player/GenderLook';
import Toon from '../style/Toon';

/** Capsule that fills roughly [w,h,d] — sausage silhouette (long shaft, modest radius). */
function Sausage({ args: [w, h, d = w], children, ...props }) {
  const r = Math.min(w, d) * 0.5;
  const len = Math.max(0.02, h - 2 * r);
  return (
    <mesh {...props} scale={d !== w ? [1, 1, d / w] : undefined}>
      <capsuleGeometry args={[r, len, 5, 10]} />
      {children}
    </mesh>
  );
}

function Mannequin({ outfitLoadout, outfitGender = 'male' }) {
  const root = useRef();
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

  useFrame((_, dt) => {
    if (root.current) root.current.rotation.y += dt * 0.7;
  });

  return (
    <group ref={root} position={[0, -0.95, 0]}>
      <Sausage position={[d.legX, 0.35, 0]} args={d.leg} castShadow>
        <Toon color={o.pants} />
      </Sausage>
      <Sausage position={[-d.legX, 0.35, 0]} args={d.leg} castShadow>
        <Toon color={o.pants} />
      </Sausage>
      {d.hip && (
        <Sausage position={[0, d.hipY, 0]} args={d.hip} castShadow>
          <Toon color={o.pants} />
        </Sausage>
      )}
      <Sausage position={[0, d.torsoY, 0]} args={d.torso} castShadow>
        <Toon color={o.torso} />
      </Sausage>
      {d.female && <FemaleChest color={o.torso} y={d.chestY} Material={Toon} />}
      {!bg && !mossad && !callCenter && !cowboy && (
        <mesh position={[0.14, 1.12, 0.14]} rotation={[Math.PI / 2, 0, 0.3]}>
          <capsuleGeometry args={[0.04, 0.04, 4, 8]} />
          <Toon color={o.accent} emissive={o.accent} emissiveIntensity={0.25} />
        </mesh>
      )}
      <Sausage
        position={[d.armX, 1.0, 0]}
        rotation={[0, 0, -0.35]}
        args={d.arm}
        castShadow
      >
        <Toon color={o.sleeve} />
      </Sausage>
      <Sausage
        position={[-d.armX, 1.0, 0]}
        rotation={[0, 0, 0.35]}
        args={d.arm}
        castShadow
      >
        <Toon color={o.sleeve} />
      </Sausage>
      <mesh position={[d.armX + 0.08, 0.7, 0.05]} rotation={[0.5, 0, 0]}>
        <capsuleGeometry args={[0.04, 0.05, 4, 8]} />
        <Toon color={o.glove} />
      </mesh>
      <mesh position={[-(d.armX + 0.08), 0.7, 0.05]} rotation={[0.5, 0, 0]}>
        <capsuleGeometry args={[0.04, 0.05, 4, 8]} />
        <Toon color={o.glove} />
      </mesh>
      <Sausage position={[0, d.headY, 0]} args={d.head} castShadow>
        <Toon color={skin} />
      </Sausage>
      {d.female && !o.showHood && <FemaleHair o={o} y={d.headY} />}
      {o.showToque && (
        <mesh position={[0, d.headY + 0.28, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 0.32, 12]} />
          <Toon color="#f5f2ea" />
        </mesh>
      )}
      {o.showCap && (
        <mesh position={[0, d.headY + 0.16, 0]} rotation={[-0.15, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.2, 0.1, 12]} />
          <Toon color={o.head} />
        </mesh>
      )}
      {o.showHood && (
        <>
          {o.showMask && (
            <mesh position={[0, d.headY, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.08, 0.06, 4, 8]} />
              <Toon
                color={o.mask}
                transparent
                opacity={0.75}
                emissive={o.mask}
                emissiveIntensity={0.15}
              />
            </mesh>
          )}
          <mesh position={[0, d.headY + 0.14, 0]}>
            <capsuleGeometry args={[0.15, 0.08, 5, 10]} />
            <Toon color={o.head} />
          </mesh>
        </>
      )}
      {o.showMask && !o.showHood && (
        <mesh position={[0, d.headY, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.08, 0.06, 4, 8]} />
          <Toon
            color={o.mask}
            transparent
            opacity={0.75}
            emissive={o.mask}
            emissiveIntensity={0.15}
          />
        </mesh>
      )}
      {bg && <BulgarianKit o={o} />}
      {mossad && <MossadKit o={o} yarmulke={o.showYarmulke} />}
      {callCenter && <CallCenterKit o={o} />}
      {cowboy && (
        <CowboyKit o={o} hatY={d.headY + d.head[1] * 0.5 + 0.08} />
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
