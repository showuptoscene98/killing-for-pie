import { forwardRef } from 'react';
import { getToonGradient } from './theme';

/** Cel-shaded material — drop-in for meshStandardMaterial in this project */
const Toon = forwardRef(function Toon(
  {
    color = '#888',
    emissive = '#000000',
    emissiveIntensity = 0,
    transparent = false,
    opacity = 1,
    depthTest = true,
    side,
    ...rest
  },
  ref
) {
  return (
    <meshToonMaterial
      ref={ref}
      color={color}
      gradientMap={getToonGradient()}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      transparent={transparent}
      opacity={opacity}
      depthTest={depthTest}
      side={side}
      {...rest}
    />
  );
});

export default Toon;
