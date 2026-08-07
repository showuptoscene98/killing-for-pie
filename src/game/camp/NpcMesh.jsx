import { Html } from '@react-three/drei';
import { DD } from '../style/theme';
import { resolveOutfit, loadoutFromPreset } from '../player/outfits';
import BulgarianKit, { usesBulgarianKit } from '../player/BulgarianKit';
import CowboyKit, { usesCowboyKit } from '../player/CowboyKit';
import SamuraiKit from '../player/SamuraiKit';
import SteveKit from './SteveKit';
import ImagineFloat from './ImagineKit';
import SimsKit from './SimsKit';
import Toon from '../style/Toon';

/** One anime eye: big oval sclera + iris + pupil + sparkle. */
function AnimeEye({ x, y, z, lookX = 0, lookY = 0, iris, pupil, white, lash }) {
  const ix = x + lookX;
  const iy = y + lookY;
  return (
    <group>
      {/* tall oval sclera */}
      <mesh position={[x, y, z]} scale={[0.85, 1.15, 0.55]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <Toon color={white} />
      </mesh>
      {/* soft top lid shade */}
      <mesh position={[x, y + 0.048, z + 0.006]} scale={[1, 0.4, 0.5]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <Toon color={lash} />
      </mesh>
      {/* iris (disk facing +Z) */}
      <mesh position={[ix, iy - 0.008, z + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.022, 14]} />
        <Toon color={iris} />
      </mesh>
      {/* pupil */}
      <mesh position={[ix, iy - 0.006, z + 0.018]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.016, 12]} />
        <Toon color={pupil} />
      </mesh>
      {/* primary sparkle */}
      <mesh position={[ix - 0.014, iy + 0.018, z + 0.024]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <Toon color="#ffffff" />
      </mesh>
      {/* secondary sparkle */}
      <mesh position={[ix + 0.012, iy - 0.012, z + 0.024]}>
        <sphereGeometry args={[0.006, 6, 6]} />
        <Toon color="#ffffff" />
      </mesh>
      {/* lower lash line */}
      <mesh position={[x, y - 0.055, z + 0.008]} scale={[1, 0.25, 0.4]}>
        <sphereGeometry args={[0.048, 8, 6]} />
        <Toon color={lash} />
      </mesh>
    </group>
  );
}

/** Blocky face on the head box — eyes / brows / mouth (mouth skipped if mustache kit). */
function NpcFace({ face = {}, hideMouth = false }) {
  const anime = !!face.anime;
  const eye = face.eye || (anime ? '#5a8ec8' : '#1a1420');
  const pupil = face.pupil || '#0a0c12';
  const white = face.white || (anime ? '#fff8f0' : '#f2eee6');
  const brow = face.brow || (anime ? '#2a1810' : eye);
  const lash = face.lash || '#1a1018';
  const lip = face.lip || '#6a3030';
  const browY = face.browY ?? (anime ? 0.13 : 0.1);
  const browRot = face.browRot ?? (anime ? 0.08 : 0.15);
  const mouthY = face.mouthY ?? (anime ? -0.12 : -0.1);
  const mouthW = face.mouthW ?? (anime ? 0.07 : 0.1);
  const mouthH = face.mouthH ?? (anime ? 0.022 : 0.035);
  const eyeY = face.eyeY ?? (anime ? 0.02 : 0.035);
  const eyeX = face.eyeX ?? (anime ? 0.085 : 0.07);
  const z = 0.16;
  const lookX = face.lookX || 0;
  const lookY = face.lookY || 0;

  return (
    <group position={[0, 1.65, 0]}>
      {anime ? (
        <>
          <AnimeEye
            x={-eyeX}
            y={eyeY}
            z={z}
            lookX={lookX}
            lookY={lookY}
            iris={eye}
            pupil={pupil}
            white={white}
            lash={lash}
          />
          <AnimeEye
            x={eyeX}
            y={eyeY}
            z={z}
            lookX={lookX}
            lookY={lookY}
            iris={eye}
            pupil={pupil}
            white={white}
            lash={lash}
          />
          {/* thin high brows */}
          <mesh position={[-eyeX, browY, z + 0.005]} rotation={[0, 0, browRot]} scale={[1, 0.22, 0.35]}>
            <capsuleGeometry args={[0.01, 0.07, 4, 8]} />
            <Toon color={brow} />
          </mesh>
          <mesh position={[eyeX, browY, z + 0.005]} rotation={[0, 0, -browRot]} scale={[1, 0.22, 0.35]}>
            <capsuleGeometry args={[0.01, 0.07, 4, 8]} />
            <Toon color={brow} />
          </mesh>
        </>
      ) : (
        <>
          {/* sclera */}
          <mesh position={[-eyeX, eyeY, z]} scale={[1.15, 0.9, 0.55]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <Toon color={white} />
          </mesh>
          <mesh position={[eyeX, eyeY, z]} scale={[1.15, 0.9, 0.55]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <Toon color={white} />
          </mesh>
          {/* pupils */}
          <mesh position={[-eyeX + lookX, eyeY + lookY, z + 0.012]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <Toon color={eye} />
          </mesh>
          <mesh position={[eyeX + lookX, eyeY + lookY, z + 0.012]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <Toon color={eye} />
          </mesh>
          {/* brows */}
          <mesh position={[-eyeX, browY, z + 0.005]} rotation={[0, 0, browRot]} scale={[1, 0.3, 0.4]}>
            <capsuleGeometry args={[0.012, 0.06, 4, 8]} />
            <Toon color={brow} />
          </mesh>
          <mesh position={[eyeX, browY, z + 0.005]} rotation={[0, 0, -browRot]} scale={[1, 0.3, 0.4]}>
            <capsuleGeometry args={[0.012, 0.06, 4, 8]} />
            <Toon color={brow} />
          </mesh>
        </>
      )}
      {/* nose bump */}
      <mesh position={[0, anime ? -0.04 : -0.02, z + 0.01]}>
        <sphereGeometry args={[anime ? 0.018 : 0.025, 8, 8]} />
        <Toon color={face.nose || '#b89068'} />
      </mesh>
      {!hideMouth && (
        <mesh
          position={[0, mouthY, z + 0.008]}
          scale={[1, Math.max(0.3, mouthH / 0.04), 0.5]}
        >
          <sphereGeometry args={[mouthW * 0.55, 8, 6]} />
          <Toon color={lip} />
        </mesh>
      )}
    </group>
  );
}

function NpcBody({ npc, o, body, pants, sleeve, skin, accent, useKit, useCowboy, useSamurai, useSteve, useSims, samuraiPalette, labelY }) {
  const hideMouth = !!(o?.showMustache || o?.showBeard || npc.hideMouth);
  const nose = skin;
  return (
    <>
      <mesh position={[-0.12, 0.45, 0]} scale={[1, 1, 1.1]} castShadow>
        <capsuleGeometry args={[0.09, 0.72, 8, 14]} />
        <Toon color={pants} />
      </mesh>
      <mesh position={[0.12, 0.45, 0]} scale={[1, 1, 1.1]} castShadow>
        <capsuleGeometry args={[0.09, 0.72, 8, 14]} />
        <Toon color={pants} />
      </mesh>
      <mesh position={[0, 1.15, 0]} scale={[1, 1, 0.58]} castShadow>
        <capsuleGeometry args={[0.275, 0.15, 8, 14]} />
        <Toon color={body} />
      </mesh>
      {!useKit && !useCowboy && !useSamurai && !useSteve && !useSims && (
        <mesh position={[0, 1.05, 0.17]} scale={[1, 0.55, 0.35]}>
          <sphereGeometry args={[0.22, 10, 8]} />
          <Toon color={accent} />
        </mesh>
      )}
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.175, 14, 12]} />
        <Toon color={skin} />
      </mesh>
      {!npc.hideFace && (
        <NpcFace face={{ nose, ...(npc.face || {}) }} hideMouth={hideMouth} />
      )}
      <mesh position={[-0.38, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.41, 6, 12]} />
        <Toon color={sleeve} />
      </mesh>
      <mesh position={[0.38, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.41, 6, 12]} />
        <Toon color={sleeve} />
      </mesh>
      <mesh position={[-0.38, 0.78, 0.02]} castShadow>
        <sphereGeometry args={[0.07, 10, 10]} />
        <Toon color={o?.glove || skin} />
      </mesh>
      {!useSamurai && (
        <mesh position={[0.38, 0.78, 0.02]} castShadow>
          <sphereGeometry args={[0.07, 10, 10]} />
          <Toon color={o?.glove || skin} />
        </mesh>
      )}
      {useKit && <BulgarianKit o={o} headY={1.65} />}
      {useCowboy && <CowboyKit o={o} spinChamber={!!npc.spinChamber} />}
      {useSamurai && <SamuraiKit o={samuraiPalette} />}
      {useSteve && <SteveKit />}
      {useSims && <SimsKit />}
      <Html position={[0, labelY, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 11,
            color: DD.bone || '#e8e0d0',
            textShadow: '0 1px 3px #000',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          <div style={{ fontWeight: 700 }}>{npc.name}</div>
          <div style={{ opacity: 0.75, fontSize: 9 }}>{npc.title}</div>
        </div>
      </Html>
    </>
  );
}

/** Hub NPC — optional outfitId uses player outfit palette (Max = maxGypsy). */
export default function NpcMesh({ npc }) {
  const [x, y, z] = npc.position;
  const o = npc.outfitId
    ? resolveOutfit(loadoutFromPreset(npc.outfitId, npc.outfitColor || 'default'))
    : null;
  const body = o?.torso || npc.color || '#6b4a2e';
  const pants = o?.pants || npc.pants || '#2a2420';
  const sleeve = o?.sleeve || npc.sleeve || body;
  const skin = o?.skin || npc.skin || '#c4a882';
  const accent = o?.accent || npc.accent || '#e8a020';
  const useKit = o && usesBulgarianKit(o);
  const useCowboy = o && usesCowboyKit(o);
  const useSamurai = !!npc.samuraiKit;
  const useSteve = !!npc.fishnets;
  const useSims = !!npc.whiskeyBottle;
  const useImagine = !!npc.angelWings || !!npc.float;

  const samuraiPalette = useSamurai
    ? {
        torso: body,
        pants,
        sleeve,
        skin,
        accent,
        metal: npc.metal || '#c8c4b8',
        blade: npc.blade || '#e8ece8',
        wrap: npc.wrap || '#2a2018',
        crest: accent,
      }
    : null;

  const bodyProps = {
    npc,
    o,
    body,
    pants,
    sleeve,
    skin,
    accent,
    useKit,
    useCowboy,
    useSamurai,
    useSteve,
    useSims,
    samuraiPalette,
    labelY: useImagine ? 2.35 : 2.15,
  };

  return (
    <group position={[x, y, z]} rotation={[0, npc.yaw || 0, 0]}>
      {useImagine ? (
        <ImagineFloat>
          <NpcBody {...bodyProps} />
        </ImagineFloat>
      ) : (
        <NpcBody {...bodyProps} />
      )}
    </group>
  );
}
