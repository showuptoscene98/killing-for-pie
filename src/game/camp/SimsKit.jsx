/** Sims — whiskey bottle in the right hand */

export default function SimsKit() {
  const glass = '#3a2818';
  const amber = '#c47828';
  const label = '#e8dcc0';
  const cork = '#8a6a40';
  const foil = '#c9a227';

  return (
    <group position={[0.42, 0.92, 0.1]} rotation={[0.35, 0.25, 0.55]}>
      {/* Bottle body */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.06, 0.2, 10]} />
        <meshStandardMaterial
          color={glass}
          transparent
          opacity={0.85}
          roughness={0.25}
          metalness={0.15}
        />
      </mesh>
      {/* Amber whiskey fill */}
      <mesh position={[0, -0.01, 0]}>
        <cylinderGeometry args={[0.048, 0.052, 0.14, 10]} />
        <meshStandardMaterial color={amber} roughness={0.45} metalness={0.05} />
      </mesh>
      {/* Shoulder / neck flare */}
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.03, 0.055, 0.05, 10]} />
        <meshStandardMaterial
          color={glass}
          transparent
          opacity={0.8}
          roughness={0.25}
          metalness={0.15}
        />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.026, 0.08, 8]} />
        <meshStandardMaterial
          color={glass}
          transparent
          opacity={0.85}
          roughness={0.22}
          metalness={0.2}
        />
      </mesh>
      {/* Foil wrap */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.035, 8]} />
        <meshStandardMaterial color={foil} metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Cork */}
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.018, 0.02, 0.035, 8]} />
        <meshStandardMaterial color={cork} roughness={0.9} />
      </mesh>
      {/* Label */}
      <mesh position={[0, 0.02, 0.056]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.07, 0.08, 0.008]} />
        <meshStandardMaterial color={label} roughness={0.85} />
      </mesh>
      {/* Label stripe */}
      <mesh position={[0, 0.02, 0.062]}>
        <boxGeometry args={[0.055, 0.018, 0.006]} />
        <meshStandardMaterial color="#8a2020" roughness={0.7} />
      </mesh>
    </group>
  );
}
