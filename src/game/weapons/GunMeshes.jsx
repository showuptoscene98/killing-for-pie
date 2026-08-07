import { forwardRef } from 'react';
import Toon from '../style/Toon';
import { GlbGun, hasGlbGun } from './GlbGun';

/** Shared procedural gun meshes — FP (unlit) + world/coop (toon) */

const FpMat = forwardRef(function FpMat({ color, opacity = 1 }, ref) {
  return (
    <meshBasicMaterial
      ref={ref}
      color={color}
      depthTest={false}
      depthWrite={false}
      fog={false}
      toneMapped={false}
      transparent={opacity < 1}
      opacity={opacity}
    />
  );
});

/**
 * cylinderGeometry extrudes along Y, but almost every cylinder on a gun runs
 * down the bore (-Z): barrels, gas tubes, scope tubes, muzzle devices. So `cyl`
 * defaults to the Z axis here and the few cross-bore pins (screws, sling loops,
 * bolt knobs) opt into 'x'. The tilt lives on an inner mesh so the `rotation`
 * prop keeps meaning "where this part sits on the gun".
 */
const AXIS_TILT = {
  x: [0, 0, Math.PI / 2],
  y: null,
  z: [Math.PI / 2, 0, 0],
};

function Shape({ geo, args }) {
  if (geo === 'cyl') return <cylinderGeometry args={args} />;
  if (geo === 'sphere') return <sphereGeometry args={args} />;
  return <boxGeometry args={args} />;
}

function FpPart({
  position,
  rotation,
  args,
  color,
  geo = 'box',
  axis = 'z',
  renderOrder = 1000,
}) {
  const tilt = geo === 'cyl' ? AXIS_TILT[axis] : null;
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={tilt ?? undefined} renderOrder={renderOrder} frustumCulled={false}>
        <Shape geo={geo} args={args} />
        <FpMat color={color} />
      </mesh>
    </group>
  );
}

function WorldPart({ position, rotation, args, color, geo = 'box', axis = 'z' }) {
  const tilt = geo === 'cyl' ? AXIS_TILT[axis] : null;
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={tilt ?? undefined} castShadow frustumCulled={false}>
        <Shape geo={geo} args={args} />
        <Toon color={color} />
      </mesh>
    </group>
  );
}

/** Procedural chainsaw — grip at origin, bar along -Z. */
function ChainsawParts({ Part, scale = 1 }) {
  const s = scale;
  return (
    <group scale={s}>
      {/* rear handle */}
      <Part position={[0, -0.02, 0.1]} args={[0.045, 0.07, 0.12]} color="#2a2a2e" />
      <Part
        position={[0, 0.04, 0.12]}
        args={[0.018, 0.018, 0.1, 8]}
        geo="cyl"
        axis="z"
        color="#1a1a1c"
      />
      {/* engine body */}
      <Part position={[0, 0.02, 0.0]} args={[0.1, 0.12, 0.22]} color="#c8a020" />
      <Part position={[0.02, 0.05, 0.02]} args={[0.08, 0.06, 0.14]} color="#3a3a40" />
      {/* top handle */}
      <Part
        position={[0, 0.12, -0.02]}
        args={[0.016, 0.016, 0.16, 8]}
        geo="cyl"
        axis="z"
        color="#1e1e22"
      />
      <Part position={[0, 0.1, 0.08]} args={[0.04, 0.05, 0.04]} color="#2a2a30" />
      {/* starter housing + cord eye */}
      <Part
        position={[-0.06, 0.02, 0.04]}
        args={[0.035, 0.035, 0.05, 8]}
        geo="cyl"
        axis="x"
        color="#8a7018"
      />
      <Part position={[-0.09, 0.02, 0.04]} args={[0.02, 0.035, 0.02]} color="#e8e0d0" />
      {/* guide bar */}
      <Part position={[0, 0.01, -0.28]} args={[0.035, 0.08, 0.42]} color="#6a6e74" />
      <Part position={[0, 0.01, -0.28]} args={[0.018, 0.055, 0.38]} color="#3a3e44" />
      {/* tip sprocket */}
      <Part
        position={[0, 0.01, -0.5]}
        args={[0.04, 0.04, 0.03, 10]}
        geo="cyl"
        axis="x"
        color="#8a9098"
      />
      {/* chain teeth hints */}
      <Part position={[0, 0.055, -0.28]} args={[0.012, 0.02, 0.4]} color="#b0b4b8" />
      <Part position={[0, -0.035, -0.28]} args={[0.012, 0.02, 0.4]} color="#b0b4b8" />
    </group>
  );
}

/** Serration / checkering strips */
function Serrations({ Part, z0, z1, y, count = 6, color = '#1a1a1c' }) {
  const span = z1 - z0;
  const step = span / count;
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <Part
          key={i}
          position={[0.051, y, z0 + step * (i + 0.5)]}
          args={[0.008, 0.035, step * 0.45]}
          color={color}
        />
      ))}
      {Array.from({ length: count }, (_, i) => (
        <Part
          key={`l${i}`}
          position={[-0.051, y, z0 + step * (i + 0.5)]}
          args={[0.008, 0.035, step * 0.45]}
          color={color}
        />
      ))}
    </group>
  );
}

/**
 * Build the same silhouette for FP or world; Part injects materials.
 * omitMag: FP viewmodel animates mag separately during reload.
 * anim: optional { slide, breakOpen, bolt, charge } groups for FP anim.
 */
function GunParts({ weaponId, Part, omitMag = false, anim = {} }) {
  const slideG = anim.slide;
  const breakG = anim.breakOpen;
  const boltG = anim.bolt;
  const chargeG = anim.charge;

  switch (weaponId) {
    case 'm1911':
      return (
        <group>
          {/* —— Frame —— */}
          <Part position={[0, -0.015, 0.02]} args={[0.092, 0.055, 0.2]} color="#7c7871" />
          <Part position={[0, 0.01, 0.04]} args={[0.088, 0.03, 0.14]} color="#716d67" />
          {/* dust cover / rail */}
          <Part position={[0, -0.005, -0.06]} args={[0.09, 0.04, 0.1]} color="#67635d" />
          {/* trigger guard */}
          <Part position={[0, -0.055, -0.02]} args={[0.055, 0.055, 0.07]} color="#3a3834" />
          <Part position={[0, -0.04, -0.05]} args={[0.035, 0.02, 0.04]} color="#2a2824" />
          {/* trigger */}
          <Part
            position={[0, -0.045, -0.015]}
            rotation={[0.25, 0, 0]}
            args={[0.018, 0.035, 0.012]}
            color="#1a1a18"
          />
          {/* grip */}
          <Part
            position={[0, -0.11, 0.06]}
            rotation={[0.42, 0, 0]}
            args={[0.078, 0.155, 0.095]}
            color="#4a3018"
          />
          {/* grip checkering */}
          <Part
            position={[0.04, -0.11, 0.06]}
            rotation={[0.42, 0, 0]}
            args={[0.006, 0.12, 0.07]}
            color="#3a2410"
          />
          <Part
            position={[-0.04, -0.11, 0.06]}
            rotation={[0.42, 0, 0]}
            args={[0.006, 0.12, 0.07]}
            color="#3a2410"
          />
          {/* grip screws */}
          <Part position={[0.042, -0.08, 0.05]} rotation={[0.42, 0, 0]} args={[0.012, 0.012, 0.012, 6]} geo="cyl" axis="x" color="#6b6761" />
          <Part position={[0.042, -0.13, 0.08]} rotation={[0.42, 0, 0]} args={[0.012, 0.012, 0.012, 6]} geo="cyl" axis="x" color="#6b6761" />
          {/* mag well lip */}
          <Part position={[0, -0.14, 0.05]} rotation={[0.42, 0, 0]} args={[0.065, 0.025, 0.08]} color="#2a2218" />
          {!omitMag && (
            <Part
              position={[0, -0.14, 0.045]}
              rotation={[0.38, 0, 0]}
              args={[0.055, 0.11, 0.065]}
              color="#2a2a2e"
            />
          )}
          {/* hammer */}
          <Part position={[0, 0.04, 0.11]} args={[0.03, 0.04, 0.035]} color="#2a2a28" />
          <Part position={[0, 0.065, 0.1]} rotation={[-0.4, 0, 0]} args={[0.022, 0.035, 0.02]} color="#1a1a18" />
          {/* beaver tail */}
          <Part position={[0, 0.02, 0.12]} args={[0.07, 0.04, 0.04]} color="#716d67" />

          {/* —— Slide (animatable) —— */}
          <group ref={slideG}>
            <Part position={[0, 0.035, -0.01]} args={[0.098, 0.07, 0.24]} color="#918d86" />
            {/* ejection port cut */}
            <Part position={[0.02, 0.055, -0.02]} args={[0.05, 0.02, 0.08]} color="#1a1a18" />
            {/* barrel hood */}
            <Part position={[0, 0.04, -0.12]} args={[0.06, 0.045, 0.06]} color="#827e77" />
            <Serrations Part={Part} z0={0.02} z1={0.1} y={0.04} count={7} color="#2a2a28" />
            {/* front sight */}
            <Part position={[0, 0.08, -0.11]} args={[0.014, 0.028, 0.035]} color="#1a1a18" />
            {/* rear sight */}
            <Part position={[0, 0.078, 0.08]} args={[0.055, 0.022, 0.025]} color="#1a1a18" />
            <Part position={[-0.015, 0.09, 0.08]} args={[0.012, 0.018, 0.02]} color="#0a0a0a" />
            <Part position={[0.015, 0.09, 0.08]} args={[0.012, 0.018, 0.02]} color="#0a0a0a" />
            {/* barrel */}
            <Part
              position={[0, 0.025, -0.2]}
              args={[0.026, 0.026, 0.14, 10]}
              geo="cyl"
              color="#5a5854"
            />
            <Part
              position={[0, 0.025, -0.27]}
              args={[0.03, 0.03, 0.04, 10]}
              geo="cyl"
              color="#4a4844"
            />
          </group>
        </group>
      );

    case 'm14':
      return (
        <group>
          {/* Receiver. Kept in the barrel's value family — parkerised light, but
              not the near-white that made it look like a separate white block. */}
          <Part position={[0, 0.03, -0.02]} args={[0.1, 0.09, 0.28]} color="#5b5853" />
          <Part position={[0, 0.05, -0.02]} args={[0.085, 0.04, 0.22]} color="#514e49" />
          {/* bolt / dust cover */}
          <group ref={boltG}>
            <Part position={[0.04, 0.06, 0.02]} args={[0.035, 0.04, 0.12]} color="#8a8680" />
            <Part position={[0.07, 0.055, 0.04]} args={[0.04, 0.025, 0.025, 6]} geo="cyl" axis="x" color="#6a6864" />
          </group>
          {/* barrel */}
          <Part
            position={[0, 0.035, -0.38]}
            args={[0.032, 0.032, 0.48, 10]}
            geo="cyl"
            color="#4a4844"
          />
          {/* gas cylinder */}
          <Part position={[0, 0.07, -0.28]} args={[0.022, 0.022, 0.28, 8]} geo="cyl" color="#5a5854" />
          {/* handguard / stock wood */}
          <Part position={[0, -0.02, -0.08]} args={[0.1, 0.08, 0.36]} color="#8a5a32" />
          <Part position={[0, -0.06, 0.12]} args={[0.11, 0.1, 0.32]} color="#7a4a28" />
          {/* pistol grip */}
          <Part
            position={[0, -0.13, 0.14]}
            rotation={[0.38, 0, 0]}
            args={[0.07, 0.14, 0.1]}
            color="#5a3820"
          />
          {/* buttstock */}
          <Part position={[0, 0.0, 0.36]} args={[0.1, 0.12, 0.2]} color="#6a4220" />
          <Part position={[0, 0.02, 0.48]} args={[0.11, 0.14, 0.06]} color="#5a3820" />
          {/* iron sights */}
          <Part position={[0, 0.1, -0.08]} args={[0.04, 0.05, 0.06]} color="#2a2a28" />
          <Part position={[0, 0.09, -0.55]} args={[0.025, 0.04, 0.03]} color="#2a2a28" />
          {/* mag */}
          {!omitMag && (
            <Part position={[0, -0.1, 0.0]} args={[0.055, 0.15, 0.07]} color="#2a2a2e" />
          )}
          {/* flash hider */}
          <Part position={[0, 0.035, -0.64]} args={[0.045, 0.045, 0.07, 8]} geo="cyl" color="#3a3a38" />
          <Part position={[0, 0.035, -0.68]} args={[0.055, 0.055, 0.03]} color="#2a2a28" />
          {/* sling loop */}
          <Part position={[0.06, -0.02, 0.3]} args={[0.02, 0.02, 0.02, 6]} geo="cyl" axis="x" color="#8a8680" />
        </group>
      );

    case 'sniper':
      return (
        <group>
          {/* receiver */}
          <Part position={[0, 0.03, -0.02]} args={[0.1, 0.1, 0.3]} color="#4a4a48" />
          <Part position={[0, 0.055, -0.02]} args={[0.08, 0.035, 0.24]} color="#3a3a38" />
          {/* bolt */}
          <group ref={boltG}>
            <Part position={[0.045, 0.065, 0.02]} args={[0.03, 0.035, 0.14]} color="#2a2a28" />
            <Part position={[0.075, 0.06, 0.05]} args={[0.035, 0.02, 0.02, 6]} geo="cyl" axis="x" color="#6a6864" />
          </group>
          {/* long barrel */}
          <Part
            position={[0, 0.04, -0.48]}
            args={[0.028, 0.028, 0.7, 10]}
            geo="cyl"
            color="#2e2e2c"
          />
          <Part
            position={[0, 0.04, -0.82]}
            args={[0.04, 0.04, 0.08, 8]}
            geo="cyl"
            color="#1a1a18"
          />
          {/* wood furniture */}
          <Part position={[0, -0.02, -0.12]} args={[0.1, 0.08, 0.4]} color="#6a4220" />
          <Part position={[0, -0.05, 0.14]} args={[0.11, 0.1, 0.34]} color="#5a3818" />
          <Part
            position={[0, -0.13, 0.16]}
            rotation={[0.4, 0, 0]}
            args={[0.07, 0.14, 0.1]}
            color="#4a2e14"
          />
          <Part position={[0, 0.0, 0.38]} args={[0.1, 0.12, 0.22]} color="#5a3818" />
          <Part position={[0, 0.02, 0.52]} args={[0.11, 0.14, 0.06]} color="#4a2e14" />
          {/* PSO-style scope */}
          <Part position={[0, 0.12, -0.02]} args={[0.04, 0.04, 0.28, 10]} geo="cyl" color="#1a1a1c" />
          <Part position={[0, 0.12, -0.18]} args={[0.055, 0.055, 0.06, 10]} geo="cyl" color="#2a2a2e" />
          <Part position={[0, 0.12, 0.14]} args={[0.05, 0.05, 0.05, 10]} geo="cyl" color="#2a2a2e" />
          <Part position={[0.0, 0.16, 0.02]} args={[0.02, 0.05, 0.08]} color="#3a3a3e" />
          {/* mag */}
          {!omitMag && (
            <Part
              position={[0, -0.12, 0.02]}
              rotation={[0.15, 0, 0]}
              args={[0.05, 0.18, 0.07]}
              color="#2a2a2e"
            />
          )}
        </group>
      );

    case 'mosin':
      return (
        <group>
          {/* —— One-piece straight stock; no pistol grip is the 91/30 giveaway —— */}
          <Part position={[0, -0.03, -0.3]} args={[0.082, 0.078, 0.62]} color="#6b4a26" />
          <Part position={[0, -0.025, 0.1]} args={[0.092, 0.1, 0.28]} color="#5d3d1c" />
          <Part
            position={[0, 0.0, 0.36]}
            rotation={[0.06, 0, 0]}
            args={[0.088, 0.13, 0.28]}
            color="#5d3d1c"
          />
          {/* steel buttplate */}
          <Part position={[0, 0.015, 0.51]} args={[0.092, 0.145, 0.03]} color="#2c2a26" />
          {/* wrist swell behind the trigger */}
          <Part
            position={[0, -0.08, 0.2]}
            rotation={[0.2, 0, 0]}
            args={[0.075, 0.07, 0.2]}
            color="#4e3115"
          />
          {/* sling slots */}
          <Part position={[0, -0.03, -0.46]} args={[0.09, 0.03, 0.05]} color="#2a1c0e" />
          <Part position={[0, -0.03, 0.3]} args={[0.096, 0.03, 0.05]} color="#2a1c0e" />

          {/* —— Receiver —— */}
          <Part position={[0, 0.05, 0.03]} args={[0.072, 0.086, 0.26]} color="#2b2b28" />
          <Part
            position={[0, 0.05, -0.11]}
            args={[0.047, 0.047, 0.085, 12]}
            geo="cyl"
            color="#34332f"
          />
          {/* charger bridge the stripper clip seats into */}
          <Part position={[0, 0.095, 0.1]} args={[0.062, 0.022, 0.05]} color="#232320" />
          {/* trigger guard + fixed 5-round magazine floorplate */}
          <Part position={[0, -0.02, 0.06]} args={[0.058, 0.055, 0.19]} color="#26261f" />
          <Part position={[0, -0.055, 0.02]} args={[0.05, 0.04, 0.12]} color="#1e1e18" />
          <Part
            position={[0, -0.042, 0.11]}
            rotation={[0.3, 0, 0]}
            args={[0.016, 0.038, 0.012]}
            color="#151512"
          />

          {/* —— Barrel —— */}
          <Part
            position={[0, 0.05, -0.21]}
            args={[0.031, 0.031, 0.16, 12]}
            geo="cyl"
            color="#2e2e2a"
          />
          <Part
            position={[0, 0.05, -0.56]}
            args={[0.023, 0.023, 0.62, 12]}
            geo="cyl"
            color="#2a2a26"
          />
          {/* upper handguard */}
          <Part position={[0, 0.088, -0.34]} args={[0.07, 0.042, 0.34]} color="#6b4a26" />
          {/* Barrel bands, centred on the barrel-plus-handguard stack they clamp
              rather than on the bore, so they don't hang under the barrel. */}
          <Part position={[0, 0.062, -0.52]} args={[0.078, 0.09, 0.03]} color="#33322d" />
          <Part position={[0, 0.058, -0.66]} args={[0.072, 0.08, 0.028]} color="#33322d" />
          {/* Cleaning rod, tucked against the barrel so the length that clears
              the forestock reads as part of the gun and not a floating pin. */}
          <Part
            position={[0, 0.023, -0.6]}
            args={[0.007, 0.007, 0.62, 6]}
            geo="cyl"
            color="#4d4b45"
          />
          {/* muzzle + hooded front sight */}
          <Part
            position={[0, 0.05, -0.9]}
            args={[0.029, 0.029, 0.07, 10]}
            geo="cyl"
            color="#1e1e1c"
          />
          <Part position={[0, 0.088, -0.87]} args={[0.03, 0.042, 0.055]} color="#1a1a18" />
          <Part position={[0, 0.1, -0.87]} args={[0.01, 0.022, 0.014]} color="#0e0e0c" />
          {/* rear ladder sight */}
          <Part position={[0, 0.098, -0.2]} args={[0.05, 0.022, 0.1]} color="#232320" />
          <Part
            position={[0, 0.112, -0.16]}
            rotation={[-0.12, 0, 0]}
            args={[0.042, 0.012, 0.06]}
            color="#1a1a18"
          />

          {/* —— PU scope, offset left so the bolt clears it —— */}
          <Part
            position={[-0.012, 0.152, -0.06]}
            args={[0.028, 0.028, 0.24, 12]}
            geo="cyl"
            color="#1a1a1c"
          />
          <Part
            position={[-0.012, 0.152, -0.19]}
            args={[0.036, 0.036, 0.05, 12]}
            geo="cyl"
            color="#232326"
          />
          <Part
            position={[-0.012, 0.152, 0.07]}
            args={[0.032, 0.032, 0.045, 12]}
            geo="cyl"
            color="#232326"
          />
          <Part
            position={[-0.012, 0.185, -0.05]}
            args={[0.019, 0.019, 0.028, 8]}
            geo="cyl"
            axis="y"
            color="#3a3a3e"
          />
          <Part
            position={[0.018, 0.152, -0.05]}
            args={[0.017, 0.017, 0.026, 8]}
            geo="cyl"
            axis="x"
            color="#3a3a3e"
          />
          <Part position={[-0.012, 0.115, -0.13]} args={[0.026, 0.05, 0.04]} color="#2c2c30" />
          <Part position={[-0.012, 0.115, 0.02]} args={[0.026, 0.05, 0.04]} color="#2c2c30" />

          {/* —— Bolt. Group origin sits on the bore so rotation.z lifts the handle —— */}
          <group ref={boltG} position={[0, 0.05, 0]}>
            <Part position={[0, 0, 0.1]} args={[0.02, 0.02, 0.2, 10]} geo="cyl" color="#75726b" />
            {/* cocking piece */}
            <Part position={[0, 0, 0.21]} args={[0.025, 0.025, 0.04, 10]} geo="cyl" color="#4a4844" />
            {/* handle arm + ball knob out the right side */}
            <Part position={[0.048, 0, 0.06]} args={[0.078, 0.017, 0.017]} color="#75726b" />
            <Part position={[0.094, 0, 0.06]} args={[0.024, 10, 10]} geo="sphere" color="#8d8a83" />
          </group>
        </group>
      );

    case 'mp5':
      return (
        <group>
          {/* upper receiver */}
          <Part position={[0, 0.04, -0.02]} args={[0.1, 0.1, 0.28]} color="#3a3a42" />
          {/* cocking tube */}
          <group ref={chargeG}>
            <Part position={[0, 0.1, -0.05]} args={[0.035, 0.035, 0.22, 8]} geo="cyl" color="#2a2a30" />
            <Part position={[0.04, 0.1, 0.02]} args={[0.05, 0.02, 0.02]} color="#1a1a20" />
          </group>
          {/* barrel */}
          <Part
            position={[0, 0.035, -0.3]}
            args={[0.028, 0.028, 0.28, 10]}
            geo="cyl"
            color="#2e2e34"
          />
          <Part
            position={[0, 0.035, -0.44]}
            args={[0.038, 0.038, 0.06, 8]}
            geo="cyl"
            color="#1a1a20"
          />
          {/* handguard */}
          <Part position={[0, -0.02, -0.12]} args={[0.095, 0.08, 0.2]} color="#2a2a32" />
          {/* vents */}
          {[-0.14, -0.1, -0.06].map((z, i) => (
            <Part key={i} position={[0.05, -0.01, z]} args={[0.01, 0.04, 0.025]} color="#1a1a20" />
          ))}
          {/* lower / magwell */}
          <Part position={[0, -0.04, 0.06]} args={[0.09, 0.08, 0.14]} color="#3a3a42" />
          <Part
            position={[0, -0.12, 0.02]}
            rotation={[0.22, 0, 0]}
            args={[0.07, 0.13, 0.09]}
            color="#222228"
          />
          {!omitMag && (
            <Part
              position={[0, -0.14, 0.08]}
              rotation={[0.12, 0, 0]}
              args={[0.05, 0.2, 0.075]}
              color="#1a1a20"
            />
          )}
          {/* sights */}
          <Part position={[0, 0.12, -0.08]} args={[0.05, 0.05, 0.08]} color="#55555c" />
          <Part position={[0, 0.11, -0.35]} args={[0.03, 0.04, 0.04]} color="#44444a" />
          {/* collapsible stock */}
          <Part position={[0, 0.02, 0.22]} args={[0.05, 0.05, 0.18]} color="#2a2a30" />
          <Part position={[0, -0.01, 0.34]} args={[0.09, 0.1, 0.05]} color="#3a3a40" />
          {/* selector / fire control bump */}
          <Part position={[0.05, -0.02, 0.08]} args={[0.02, 0.04, 0.05]} color="#1a1a20" />
        </group>
      );

    case 'olympia':
      return (
        <group>
          {/* receiver / action */}
          <Part position={[0, 0.02, 0.06]} args={[0.11, 0.1, 0.2]} color="#8a5030" />
          <Part position={[0, 0.04, 0.08]} args={[0.12, 0.05, 0.08]} color="#aeaaa2" />
          {/* hinge pin — runs across the action, not down the bore */}
          <Part
            position={[0, 0.04, 0.0]}
            args={[0.022, 0.022, 0.13, 8]}
            geo="cyl"
            axis="x"
            color="#9a968e"
          />
          {/* Break-open barrels. Blued, so the twin tubes and the rib read as
              separate steel against the silver action instead of one pale slab. */}
          <group ref={breakG} position={[0, 0.04, 0.0]}>
            <Part
              position={[-0.028, 0.015, -0.32]}
              args={[0.03, 0.03, 0.5, 10]}
              geo="cyl"
              color="#3f3f46"
            />
            <Part
              position={[0.028, 0.015, -0.32]}
              args={[0.03, 0.03, 0.5, 10]}
              geo="cyl"
              color="#3f3f46"
            />
            {/* rib */}
            <Part position={[0, 0.04, -0.28]} args={[0.02, 0.015, 0.42]} color="#2f2f36" />
            {/* brass bead sight */}
            <Part position={[0, 0.055, -0.52]} args={[0.012, 8, 8]} geo="sphere" color="#e0bc58" />
            {/* forend wood */}
            <Part position={[0, -0.03, -0.18]} args={[0.1, 0.06, 0.22]} color="#7a4a28" />
          </group>
          {/* stock */}
          <Part
            position={[0, -0.06, 0.18]}
            rotation={[0.2, 0, 0]}
            args={[0.1, 0.12, 0.28]}
            color="#6a4220"
          />
          <Part
            position={[0, -0.1, 0.1]}
            rotation={[0.4, 0, 0]}
            args={[0.085, 0.14, 0.12]}
            color="#5a3820"
          />
          <Part position={[0, -0.02, 0.36]} args={[0.11, 0.13, 0.1]} color="#5a3820" />
          {/* hammers */}
          <Part position={[-0.03, 0.08, 0.12]} args={[0.025, 0.04, 0.03]} color="#2a2a28" />
          <Part position={[0.03, 0.08, 0.12]} args={[0.025, 0.04, 0.03]} color="#2a2a28" />
          {/* trigger */}
          <Part position={[0, -0.04, 0.02]} args={[0.02, 0.04, 0.015]} color="#1a1a18" />
        </group>
      );

    case 'ak47':
      return (
        <group>
          {/* stamped receiver */}
          <Part position={[0, 0.03, 0]} args={[0.105, 0.11, 0.3]} color="#5a6a38" />
          <Part position={[0, 0.06, 0]} args={[0.09, 0.04, 0.24]} color="#4a5a30" />
          {/* bolt / dust cover */}
          <group ref={boltG}>
            <Part position={[0, 0.09, 0.02]} args={[0.08, 0.035, 0.16]} color="#3a3a36" />
            <Part position={[0.055, 0.07, 0.06]} args={[0.05, 0.02, 0.02]} color="#2a2a28" />
          </group>
          {/* barrel */}
          <Part
            position={[0, 0.04, -0.34]}
            args={[0.034, 0.034, 0.42, 10]}
            geo="cyl"
            color="#3a3a38"
          />
          {/* gas tube */}
          <Part position={[0, 0.09, -0.22]} args={[0.024, 0.024, 0.3, 8]} geo="cyl" color="#4a4a46" />
          {/* wood handguard */}
          <Part position={[0, -0.01, -0.14]} args={[0.095, 0.075, 0.22]} color="#8a5a30" />
          <Part position={[0, 0.08, -0.14]} args={[0.08, 0.04, 0.2]} color="#7a4a28" />
          {/* pistol grip */}
          <Part
            position={[0, -0.13, 0.06]}
            rotation={[0.28, 0, 0]}
            args={[0.07, 0.15, 0.095]}
            color="#4a3820"
          />
          {/* curved mag */}
          {!omitMag && (
            <Part
              position={[0, -0.17, -0.02]}
              rotation={[0.35, 0, 0]}
              args={[0.055, 0.22, 0.08]}
              color="#3a3a38"
            />
          )}
          {/* wood stock */}
          <Part position={[0, 0.02, 0.26]} args={[0.085, 0.1, 0.22]} color="#6a5030" />
          <Part position={[0, 0.0, 0.4]} args={[0.1, 0.12, 0.08]} color="#5a4020" />
          {/* front sight post */}
          <Part position={[0, 0.1, -0.48]} args={[0.04, 0.06, 0.04]} color="#2a2a28" />
          {/* rear sight */}
          <Part position={[0, 0.12, -0.05]} args={[0.035, 0.045, 0.05]} color="#222" />
          {/* muzzle brake */}
          <Part position={[0, 0.04, -0.58]} args={[0.05, 0.05, 0.08, 8]} geo="cyl" color="#2a2a28" />
          <Part position={[0.03, 0.04, -0.58]} args={[0.04, 0.03, 0.06]} color="#1a1a18" />
        </group>
      );

    case 'raygun':
      return (
        <group>
          <Part position={[0, 0.02, 0]} args={[0.16, 0.16, 0.24]} color="#2ecc71" />
          <Part position={[0, 0.02, 0]} args={[0.12, 0.12, 0.26]} color="#3ddc84" />
          {/* emitter */}
          <Part
            position={[0, 0.02, -0.28]}
            args={[0.055, 0.08, 0.32, 10]}
            geo="cyl"
            color="#27ae60"
          />
          <Part position={[0, 0.02, -0.46]} args={[0.1, 0.1, 0.05]} color="#a8ffc8" />
          <Part position={[0, 0.02, -0.5]} args={[0.06, 8, 8]} geo="sphere" color="#e8ffe8" />
          {/* fins */}
          <Part position={[0.1, 0.02, 0]} args={[0.04, 0.12, 0.12]} color="#1e8449" />
          <Part position={[-0.1, 0.02, 0]} args={[0.04, 0.12, 0.12]} color="#1e8449" />
          {/* dome */}
          <Part position={[0, 0.14, 0.02]} args={[0.055, 10, 10]} geo="sphere" color="#b8ffd0" />
          <Part position={[0, 0.14, 0.02]} args={[0.03, 8, 8]} geo="sphere" color="#fff" />
          {/* grip */}
          <Part
            position={[0, -0.14, 0.04]}
            rotation={[0.25, 0, 0]}
            args={[0.085, 0.16, 0.1]}
            color="#1a1a1e"
          />
          {!omitMag && (
            <Part position={[0, -0.08, 0.1]} args={[0.06, 0.1, 0.08]} color="#1e8449" />
          )}
          {/* rings */}
          <Part
            position={[0, 0.02, -0.18]}
            args={[0.09, 0.09, 0.03, 12]}
            geo="cyl"
            color="#58d68d"
          />
        </group>
      );

    case 'thundergun':
      return (
        <group>
          <Part position={[0, 0.06, 0]} args={[0.2, 0.16, 0.32]} color="#e0b020" />
          <Part position={[0, 0.08, -0.3]} args={[0.15, 0.14, 0.36]} color="#d49818" />
          {/* bell */}
          <Part
            position={[0, 0.08, -0.52]}
            args={[0.18, 0.18, 0.12, 10]}
            geo="cyl"
            color="#ffe060"
          />
          <Part
            position={[0, 0.08, -0.58]}
            args={[0.22, 0.22, 0.05, 10]}
            geo="cyl"
            color="#fff0a0"
          />
          {/* coils */}
          {[-0.15, -0.25, -0.35].map((z, i) => (
            <Part
              key={i}
              position={[0, 0.08, z]}
              args={[0.16, 0.16, 0.03, 10]}
              geo="cyl"
              color="#c89020"
            />
          ))}
          <Part
            position={[0, -0.12, 0.1]}
            rotation={[0.3, 0, 0]}
            args={[0.11, 0.16, 0.14]}
            color="#5a4020"
          />
          <Part position={[0, 0.18, 0.06]} args={[0.07, 0.07, 0.12]} color="#fff0a0" />
          {!omitMag && (
            <Part position={[0, -0.08, 0.14]} args={[0.08, 0.12, 0.1]} color="#c89020" />
          )}
        </group>
      );

    case 'spatula':
      return (
        <group>
          <Part position={[0, -0.02, 0.18]} args={[0.075, 0.095, 0.5]} color="#8B5A2B" />
          <Part position={[0, -0.02, 0.18]} args={[0.04, 0.04, 0.52]} color="#a07040" />
          <Part position={[0, 0.02, -0.14]} args={[0.055, 0.055, 0.18]} color="#c8ccd0" />
          <Part position={[0, 0.04, -0.4]} args={[0.4, 0.035, 0.32]} color="#e0e4e8" />
          <Part position={[0, 0.07, -0.4]} args={[0.36, 0.02, 0.28]} color="#f0f4f8" />
          {/* pie — sits flat on the blade, so this one stays Y-up */}
          <Part
            position={[0, 0.13, -0.38]}
            rotation={[0.12, 0, 0]}
            args={[0.13, 0.14, 0.08, 14]}
            geo="cyl"
            axis="y"
            color="#d4a574"
          />
          <Part position={[0, 0.18, -0.38]} args={[0.11, 0.022, 0.11]} color="#c44030" />
          <Part position={[0, 0.2, -0.38]} args={[0.04, 8, 8]} geo="sphere" color="#e8c060" />
        </group>
      );

    case 'rakia':
      // Bottle club — origin on the neck so the fist grips there; base is the beater.
      return (
        <group>
          {/* cork (wrist side of the fist) */}
          <Part
            position={[0, -0.02, 0.03]}
            args={[0.03, 0.03, 0.045, 8]}
            geo="cyl"
            axis="y"
            color="#c4a060"
          />
          {/* neck — through the fingers */}
          <Part
            position={[0, 0.04, 0]}
            args={[0.026, 0.026, 0.11, 8]}
            geo="cyl"
            axis="y"
            color="#4a2010"
          />
          {/* shoulder */}
          <Part
            position={[0, 0.12, -0.01]}
            args={[0.048, 0.048, 0.055, 10]}
            geo="cyl"
            axis="y"
            color="#5a2818"
          />
          {/* body / liquid */}
          <Part
            position={[0, 0.26, -0.02]}
            args={[0.072, 0.072, 0.22, 10]}
            geo="cyl"
            axis="y"
            color="#6a3020"
          />
          <Part
            position={[0, 0.26, -0.02]}
            args={[0.056, 0.056, 0.18, 10]}
            geo="cyl"
            axis="y"
            color="#c4782a"
          />
          {/* base — strike face */}
          <Part
            position={[0, 0.38, -0.02]}
            args={[0.076, 0.076, 0.04, 10]}
            geo="cyl"
            axis="y"
            color="#3a1810"
          />
          {/* label */}
          <Part position={[0.04, 0.24, -0.02]} args={[0.02, 0.1, 0.08]} color="#e8dcc0" />
          <Part position={[0.045, 0.24, -0.02]} args={[0.01, 0.05, 0.04]} color="#8a2020" />
        </group>
      );

    case 'questioneer':
      // Twin chainsaws — right saw ready to throw, left saw riding shotgun.
      return (
        <group>
          <group position={[0.04, 0.0, -0.02]} rotation={[0.05, 0.12, -0.35]}>
            <ChainsawParts Part={Part} />
          </group>
          <group position={[-0.1, -0.02, 0.04]} rotation={[0.2, -0.35, 0.55]}>
            <ChainsawParts Part={Part} scale={0.92} />
          </group>
        </group>
      );

    default:
      return (
        <group>
          <Part position={[0, 0, 0]} args={[0.11, 0.1, 0.3]} color="#bbb" />
          <Part position={[0, 0, -0.3]} args={[0.04, 0.04, 0.32]} color="#888" />
          <Part
            position={[0, -0.1, 0.04]}
            rotation={[0.3, 0, 0]}
            args={[0.075, 0.15, 0.1]}
            color="#5a3820"
          />
        </group>
      );
  }
}

/** How each gun sits in the hands, relative to the viewmodel rig. */
const FP_POSE = {
  spatula: { position: [0.04, 0, -0.02], rotation: [0.12, 0.15, -0.4] },
  // Cocked on the right — neck in the fist, base up ready to chop across.
  rakia: { position: [0.05, -0.05, -0.02], rotation: [0.15, 0.55, -1.05] },
  // Twin saws — tipped for a throw, bars reading forward.
  questioneer: { position: [0.03, -0.02, -0.04], rotation: [0.18, 0.2, -0.55] },
  olympia: { position: [0.02, 0.02, -0.04], rotation: [0.05, 0.04, 0.02] },
  mp5: { position: [0.02, 0.01, -0.04], rotation: [0.06, 0.06, 0.03] },
  sniper: { position: [0.015, 0.02, -0.1], rotation: [0.03, 0.04, 0.01] },
  // Longest gun — nudged forward so the butt clears the camera near-plane.
  mosin: { position: [0.015, 0.02, -0.12], rotation: [0.025, 0.035, 0.01] },
  ak47: { position: [0.02, 0.015, -0.06], rotation: [0.06, 0.07, 0.03] },
  raygun: { position: [0.03, 0.01, -0.05], rotation: [0.1, 0.12, 0.06] },
  thundergun: { position: [0.01, 0.02, -0.12], rotation: [0.05, 0.04, 0.02] },
  m1911: { position: [0.03, 0.01, -0.02], rotation: [0.08, 0.08, 0.04] },
  m14: { position: [0.02, 0.015, -0.08], rotation: [0.04, 0.05, 0.02] },
};

const FP_POSE_DEFAULT = { position: [0.02, 0.02, -0.1], rotation: [0.06, 0.08, 0.02] };

/**
 * First-person held gun. Mag omitted — animated by viewmodel.
 * Always procedural: hands / slide / bolt anims are authored against GunParts.
 * Quaternius GLBs stay on WorldGun / DisplayGun (wallbuys, remotes).
 */
export function FpGun({ weaponId, children, slideRef, breakRef, boltRef, chargeRef }) {
  const id = weaponId || 'm1911';
  const pose = FP_POSE[id] ?? FP_POSE_DEFAULT;

  return (
    <group position={pose.position} rotation={pose.rotation}>
      <GunParts
        weaponId={id}
        Part={FpPart}
        omitMag
        anim={{
          slide: slideRef,
          breakOpen: breakRef,
          bolt: boltRef,
          charge: chargeRef,
        }}
      />
      {children}
    </group>
  );
}

/** Rest pose for the detachable mag relative to FpGun root. */
export function magRestPose(weaponId) {
  switch (weaponId) {
    case 'm1911':
      return [0, -0.14, 0.045];
    case 'm14':
      return [0, -0.1, 0.0];
    case 'sniper':
      return [0, -0.12, 0.02];
    // Fixed magazine — this is where the stripper clip seats on the bridge.
    case 'mosin':
      return [0, 0.115, 0.1];
    case 'mp5':
      return [0, -0.14, 0.08];
    case 'olympia':
      return [0, -0.02, -0.08];
    case 'ak47':
      return [0, -0.17, -0.02];
    case 'raygun':
      return [0, -0.08, 0.1];
    case 'thundergun':
      return [0, -0.08, 0.14];
    // Pull-cord T-handle seats on the left starter housing.
    case 'questioneer':
      return [-0.12, 0.02, 0.06];
    default:
      return [0, -0.1, 0.04];
  }
}

/**
 * Guns whose "mag" mesh is something you only hold during a reload — a pie, a
 * stripper clip — rather than a magazine that lives in the gun. The viewmodel
 * hides these at rest.
 */
export function magIsTransient(weaponId) {
  return weaponId === 'spatula' || weaponId === 'mosin' || weaponId === 'questioneer';
}

export function reloadStyle(weaponId) {
  switch (weaponId) {
    case 'm1911':
      return 'pistol';
    case 'mosin':
      return 'bolt';
    case 'olympia':
      return 'break';
    case 'spatula':
      return 'pie';
    case 'questioneer':
      return 'cord';
    case 'rakia':
      return 'melee';
    case 'raygun':
    case 'thundergun':
      return 'cell';
    case 'mp5':
      return 'smg';
    default:
      return 'rifle';
  }
}

/**
 * Third-person / coop held gun — sits in the right hand.
 * Body kits face +Z; gun bore is authored -Z, so yaw π aims it forward.
 */
export function WorldGun({ weaponId, scale = 1 }) {
  const id = weaponId || 'm1911';
  const bottle = id === 'rakia';
  return (
    <group
      position={bottle ? [0.4, 0.95, 0.38] : [0.38, 0.82, 0.42]}
      rotation={bottle ? [0.35, Math.PI + 0.4, -1.1] : [0.15, Math.PI, -0.05]}
      scale={scale * (bottle ? 0.95 : 0.85)}
    >
      {hasGlbGun(id) ? (
        <GlbGun weaponId={id} />
      ) : (
        <GunParts weaponId={id} Part={WorldPart} />
      )}
    </group>
  );
}

/** Centered gun mesh for wallbuys / pedestals. */
export function DisplayGun({ weaponId, scale = 1 }) {
  const id = weaponId || 'm1911';
  return (
    <group scale={scale} rotation={[0, Math.PI * 0.15, 0.08]}>
      {hasGlbGun(id) ? (
        <GlbGun weaponId={id} />
      ) : (
        <GunParts weaponId={id} Part={WorldPart} />
      )}
    </group>
  );
}

export function muzzleOffset(weaponId) {
  // FP is procedural again — tips match GunParts bore lengths.
  switch (weaponId) {
    case 'm1911':
      return [0.02, 0.05, -0.32];
    case 'm14':
      return [0.02, 0.05, -0.7];
    case 'sniper':
      return [0.02, 0.05, -0.88];
    case 'mosin':
      return [0.02, 0.06, -0.96];
    case 'mp5':
      return [0.02, 0.05, -0.48];
    case 'olympia':
      return [0.02, 0.08, -0.58];
    case 'ak47':
      return [0.02, 0.06, -0.62];
    case 'raygun':
      return [0.02, 0.04, -0.54];
    case 'thundergun':
      return [0.02, 0.1, -0.64];
    case 'spatula':
      return [0.04, 0.08, -0.52];
    case 'rakia':
      return [0.02, 0.4, -0.04];
    case 'questioneer':
      return [0.04, 0.04, -0.48];
    default:
      return [0.02, 0.05, -0.48];
  }
}
