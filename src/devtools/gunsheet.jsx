import { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { DisplayGun } from '../game/weapons/GunMeshes';
import { WEAPONS } from '../game/weapons/weaponDefs';

/**
 * Dev-only contact sheet for the procedural gun meshes.
 *
 * Every cylinder in GunMeshes used to extrude on the default Y axis, which
 * turned barrels and scope tubes into vertical posts. That is obvious the moment
 * you look at a gun and invisible to a unit test, so this page renders each one
 * through the real GunParts code for eyeballing and screenshots.
 *
 * Served by the dev server at /killing-for-pie/gunsheet.html?view=side. It is
 * not a build input, so it never ships.
 */

/** Mirrors the yaw DisplayGun bakes in, so "side" is genuinely side-on. */
const DISPLAY_YAW = Math.PI * 0.15;

/**
 * A gun's muzzle is local -Z, which DisplayGun's yaw swings to
 * (-sin y, 0, -cos y). Orbiting from an azimuth perpendicular to that keeps the
 * barrel across the screen, so azOffset 0 is dead side-on and offsets rotate
 * toward the muzzle without foreshortening it into a dot.
 */
function orbit(azOffset, elev, dist) {
  const a = DISPLAY_YAW + azOffset;
  const flat = Math.cos(elev) * dist;
  return [Math.cos(a) * flat, Math.sin(elev) * dist, -Math.sin(a) * flat];
}

const VIEWS = {
  side: { position: orbit(0, 0.04, 3.1), label: 'side' },
  // Not a full quarter turn: straight down makes lookAt degenerate against +Y up.
  top: { position: orbit(0, 1.36, 3.1), label: 'top-down' },
  hero: { position: orbit(-0.72, 0.42, 3.0), label: '3/4' },
};

function GunCard({ weaponId, name, view, fov }) {
  const cam = VIEWS[view] ?? VIEWS.side;
  return (
    <div className="card">
      <Canvas
        camera={{ position: cam.position, fov, near: 0.1, far: 30 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <color attach="background" args={['#15120f']} />
        {/* Mirrors GameCanvas so wallbuy metals read the same here as in a match. */}
        <ambientLight intensity={1.05} color="#d4c4a0" />
        <hemisphereLight args={['#e8d8b8', '#2a2010', 0.6]} />
        <directionalLight position={[6, 14, 5]} intensity={1.25} />
        <directionalLight position={[-4, 2, -3]} intensity={0.25} color="#8fa6c4" />
        <Suspense fallback={null}>
          <DisplayGun weaponId={weaponId} scale={1} />
        </Suspense>
      </Canvas>
      <div className="cap">
        <b>{name}</b>
        <span>
          {weaponId} · {cam.label}
        </span>
      </div>
    </div>
  );
}

function Sheet() {
  const q = new URLSearchParams(window.location.search);
  const view = q.get('view') || 'side';
  const cols = Number(q.get('cols')) || 4;
  const only = q.get('only');
  // Wider cards see more of the same scene, so pull the fov in to fill them.
  const fov = Number(q.get('fov')) || (cols <= 2 ? 22 : 34);

  const ids = Object.keys(WEAPONS).filter((id) => !only || only.split(',').includes(id));

  return (
    <>
      <h1>
        Gun contact sheet<span> — {view} · muzzles point right</span>
      </h1>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          '--card-h': `${Number(q.get('h')) || 210}px`,
        }}
      >
        {ids.map((id) => (
          <GunCard key={id} weaponId={id} name={WEAPONS[id].name} view={view} fov={fov} />
        ))}
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Sheet />);
