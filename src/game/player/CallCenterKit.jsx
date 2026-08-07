/** Call-center extras — headset / badge driven by mix-and-match flags */

export function usesCallCenterKit(o) {
  return !!(o?.showCallCenterKit || o?.showHeadset || o?.showBadge);
}

export default function CallCenterKit({ o, scale = 1 }) {
  const band = o.headsetBand || '#2a2a30';
  const cup = o.headsetCup || '#1a1a20';
  const mic = o.headsetMic || '#3a3a42';
  const lanyard = o.lanyard || '#c42828';
  const badge = o.badge || '#e8eef4';
  const badgeAccent = o.badgeAccent || '#1a5a9a';

  const showHeadset = !!o.showHeadset;
  const showBadge = !!o.showBadge;

  if (!showHeadset && !showBadge) return null;

  return (
    <group scale={scale}>
      {showHeadset && (
        <>
          <mesh position={[0, 1.72, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.16, 0.018, 8, 16, Math.PI]} />
            <meshStandardMaterial color={band} roughness={0.55} metalness={0.25} />
          </mesh>
          <mesh position={[0.2, 1.54, 0]}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshStandardMaterial color={cup} roughness={0.45} metalness={0.2} />
          </mesh>
          <mesh position={[-0.2, 1.54, 0]}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshStandardMaterial color={cup} roughness={0.45} metalness={0.2} />
          </mesh>
          <mesh position={[0.2, 1.54, 0]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color="#4a4a55" roughness={0.7} />
          </mesh>
          <mesh position={[-0.2, 1.54, 0]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color="#4a4a55" roughness={0.7} />
          </mesh>
          <mesh position={[0.16, 1.42, 0.1]} rotation={[0.9, 0.35, 0.15]}>
            <cylinderGeometry args={[0.01, 0.01, 0.22, 6]} />
            <meshStandardMaterial color={mic} metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0.06, 1.32, 0.2]}>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshStandardMaterial color={mic} metalness={0.35} roughness={0.45} />
          </mesh>
          <mesh position={[0.06, 1.32, 0.225]}>
            <sphereGeometry args={[0.016, 6, 6]} />
            <meshStandardMaterial color="#6a6a72" roughness={0.8} />
          </mesh>
        </>
      )}

      {showBadge && (
        <>
          <mesh position={[0, 1.35, 0.16]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[0.04, 0.28, 0.01]} />
            <meshStandardMaterial color={lanyard} roughness={0.75} />
          </mesh>
          <mesh position={[-0.05, 1.48, 0.14]} rotation={[0.1, 0, 0.4]}>
            <boxGeometry args={[0.02, 0.14, 0.01]} />
            <meshStandardMaterial color={lanyard} roughness={0.75} />
          </mesh>
          <mesh position={[0.05, 1.48, 0.14]} rotation={[0.1, 0, -0.4]}>
            <boxGeometry args={[0.02, 0.14, 0.01]} />
            <meshStandardMaterial color={lanyard} roughness={0.75} />
          </mesh>
          <mesh position={[0, 1.18, 0.18]}>
            <boxGeometry args={[0.12, 0.16, 0.02]} />
            <meshStandardMaterial color={badge} roughness={0.55} />
          </mesh>
          <mesh position={[0, 1.22, 0.195]}>
            <boxGeometry args={[0.09, 0.04, 0.01]} />
            <meshStandardMaterial
              color={badgeAccent}
              emissive={badgeAccent}
              emissiveIntensity={0.25}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0, 1.14, 0.195]}>
            <boxGeometry args={[0.07, 0.05, 0.01]} />
            <meshStandardMaterial color="#c8d0d8" roughness={0.7} />
          </mesh>
        </>
      )}
    </group>
  );
}
