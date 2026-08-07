/** Mossad extras — shades / tie / earpiece / yarmulke from mix-and-match flags */

export function usesMossadKit(o) {
  return !!(o?.showMossadKit || o?.id === 'mossad');
}

export default function MossadKit({ o, yarmulke = false, scale = 1 }) {
  const shades = o.shades || '#0a0a0c';
  const lens = o.shadesLens || '#1a2838';
  const ear = o.earpiece || '#2a2a30';
  const tie = o.tie || '#0c0c10';
  const shirt = o.shirt || '#e8e8ec';
  const cap = o.yarmulkeColor || '#1c1c22';

  const showShades = !!o.showShades;
  const showTie = !!o.showTie;
  const showEar = !!o.showEarpiece;
  const showYarmulke = yarmulke || !!o.showYarmulke;

  if (!showShades && !showTie && !showEar && !showYarmulke) return null;

  return (
    <group scale={scale}>
      {showTie && (
        <>
          <mesh position={[0, 1.38, 0.15]} scale={[1, 0.55, 0.4]}>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshStandardMaterial color={shirt} roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.18, 0.17]}>
            <capsuleGeometry args={[0.028, 0.29, 4, 8]} />
            <meshStandardMaterial color={tie} roughness={0.65} />
          </mesh>
          <mesh position={[0, 1.34, 0.17]} scale={[1.1, 0.7, 0.8]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color={tie} roughness={0.65} />
          </mesh>
          <mesh position={[-0.16, 1.28, 0.17]}>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshStandardMaterial
              color={o.accent}
              emissive={o.accent}
              emissiveIntensity={0.4}
            />
          </mesh>
        </>
      )}

      {showShades && (
        <>
          <mesh position={[0, 1.56, 0.17]} scale={[1.6, 0.45, 0.35]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshStandardMaterial color={shades} metalness={0.4} roughness={0.35} />
          </mesh>
          <mesh position={[-0.07, 1.56, 0.19]} scale={[1.2, 0.75, 0.3]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial
              color={lens}
              emissive={lens}
              emissiveIntensity={0.2}
              metalness={0.6}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0.07, 1.56, 0.19]} scale={[1.2, 0.75, 0.3]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial
              color={lens}
              emissive={lens}
              emissiveIntensity={0.2}
              metalness={0.6}
              roughness={0.2}
            />
          </mesh>
        </>
      )}

      {showEar && (
        <>
          <mesh position={[0.17, 1.52, 0.02]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color={ear} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0.19, 1.42, 0.04]} rotation={[0.4, 0, 0.2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.12, 6]} />
            <meshStandardMaterial color={ear} />
          </mesh>
        </>
      )}

      {showYarmulke && (
        <group position={[0, 1.74, 0]}>
          <mesh rotation={[-0.08, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.145, 0.055, 14]} />
            <meshStandardMaterial color={cap} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.028, 0]} rotation={[-0.08, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.12, 0.02, 14]} />
            <meshStandardMaterial color={cap} roughness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
}
