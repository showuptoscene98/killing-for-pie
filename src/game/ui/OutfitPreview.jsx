import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { resolveOutfit } from '../player/outfits';
import BulgarianKit, { usesBulgarianKit } from '../player/BulgarianKit';
import MossadKit, { usesMossadKit } from '../player/MossadKit';
import CallCenterKit, { usesCallCenterKit } from '../player/CallCenterKit';
import CowboyKit, { usesCowboyKit } from '../player/CowboyKit';
import FemaleHair, { FemaleChest, bodyDims, applyGenderLook } from '../player/GenderLook';
import Toon from '../style/Toon';

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

  const [legW, legH, legD] = d.leg;
  const [torsoW, torsoH, torsoD] = d.torso;
  const [armW, armH] = d.arm;
  const headR = (d.head[0] + d.head[1] + d.head[2]) / 6;

  useFrame((_, dt) => {
    if (root.current) root.current.rotation.y += dt * 0.7;
  });

  return (
    <group ref={root} position={[0, -0.95, 0]}>
      <mesh position={[d.legX, 0.35, 0]} scale={[1, 1, legD / legW]} castShadow>
        <capsuleGeometry args={[legW * 0.5, Math.max(0.002, legH - legW), 8, 14]} />
        <Toon color={o.pants} />
      </mesh>
      <mesh position={[-d.legX, 0.35, 0]} scale={[1, 1, legD / legW]} castShadow>
        <capsuleGeometry args={[legW * 0.5, Math.max(0.002, legH - legW), 8, 14]} />
        <Toon color={o.pants} />
      </mesh>
      {d.hip && (
        <mesh position={[0, d.hipY, 0]} scale={[1, 1, d.hip[2] / d.hip[0]]} castShadow>
          <capsuleGeometry
            args={[d.hip[0] * 0.5, Math.max(0.002, d.hip[1] - d.hip[0]), 6, 12]}
          />
          <Toon color={o.pants} />
        </mesh>
      )}
      <mesh
        position={[0, d.torsoY, 0]}
        scale={[1, 1, torsoD / torsoW]}
        castShadow
      >
        <capsuleGeometry
          args={[torsoW * 0.5, Math.max(0.002, torsoH - torsoW), 8, 14]}
        />
        <Toon color={o.torso} />
      </mesh>
      {d.female && <FemaleChest color={o.torso} y={d.chestY} Material={Toon} />}
      {!bg && !mossad && !callCenter && !cowboy && (
        <mesh position={[0.16, 1.12, 0.15]} scale={[1, 1, 0.4]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <Toon color={o.accent} emissive={o.accent} emissiveIntensity={0.25} />
        </mesh>
      )}
      <mesh position={[d.armX, 1.0, 0]} rotation={[0, 0, -0.35]} castShadow>
        <capsuleGeometry args={[armW * 0.5, Math.max(0.002, armH - armW), 6, 12]} />
        <Toon color={o.sleeve} />
      </mesh>
      <mesh position={[-d.armX, 1.0, 0]} rotation={[0, 0, 0.35]} castShadow>
        <capsuleGeometry args={[armW * 0.5, Math.max(0.002, armH - armW), 6, 12]} />
        <Toon color={o.sleeve} />
      </mesh>
      <mesh position={[d.armX + 0.1, 0.7, 0.05]}>
        <sphereGeometry args={[0.065, 10, 10]} />
        <Toon color={o.glove} />
      </mesh>
      <mesh position={[-(d.armX + 0.1), 0.7, 0.05]}>
        <sphereGeometry args={[0.065, 10, 10]} />
        <Toon color={o.glove} />
      </mesh>
      <mesh position={[0, d.headY, 0]} castShadow>
        <sphereGeometry args={[headR, 14, 12]} />
        <Toon color={skin} />
      </mesh>
      {d.female && !o.showHood && <FemaleHair o={o} y={d.headY} />}
      {o.showToque && (
        <mesh position={[0, d.headY + 0.3, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 0.35, 14]} />
          <Toon color="#f5f2ea" />
        </mesh>
      )}
      {o.showCap && (
        <mesh position={[0, d.headY + 0.17, 0]} rotation={[-0.15, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.24, 0.12, 14]} />
          <Toon color={o.head} />
        </mesh>
      )}
      {o.showHood && (
        <>
          {o.showMask && (
            <mesh position={[0, d.headY, 0.14]} scale={[1, 0.7, 0.5]}>
              <sphereGeometry args={[0.15, 10, 8]} />
              <Toon color={o.mask} transparent opacity={0.75} emissive={o.mask} emissiveIntensity={0.15} />
            </mesh>
          )}
          <mesh position={[0, d.headY + 0.17, 0]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <Toon color={o.head} />
          </mesh>
        </>
      )}
      {o.showMask && !o.showHood && (
        <mesh position={[0, d.headY, 0.14]} scale={[1, 0.7, 0.5]}>
          <sphereGeometry args={[0.15, 10, 8]} />
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
