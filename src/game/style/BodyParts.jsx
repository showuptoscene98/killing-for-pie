import { forwardRef, useEffect, useState } from 'react';
import { getBodyStyle, subscribeSettings } from '../settings';
import Toon from './Toon';

export { getBodyStyle };

/** Live body style from settings (block | lowpoly). */
export function useBodyStyle() {
  const [style, setStyle] = useState(() => getBodyStyle());
  useEffect(() => subscribeSettings((s) => setStyle(s.bodyStyle || 'block')), []);
  return style;
}

/**
 * Soft box (block) or sausage capsule (lowpoly).
 * args: [width, height, depth] Y-up extents.
 */
export const BodyPart = forwardRef(function BodyPart(
  {
    args: [w, h, d = w],
    style,
    children,
    Material = Toon,
    matProps,
    ...meshProps
  },
  ref
) {
  const mode = style || getBodyStyle();
  if (mode === 'lowpoly') {
    const r = Math.min(w, d) * 0.5;
    const len = Math.max(0.02, h - 2 * r);
    return (
      <mesh ref={ref} {...meshProps} scale={d !== w ? [1, 1, d / w] : meshProps.scale}>
        <capsuleGeometry args={[r, len, 5, 10]} />
        {children || <Material {...matProps} />}
      </mesh>
    );
  }
  return (
    <mesh ref={ref} {...meshProps}>
      <boxGeometry args={[w, h, d]} />
      {children || <Material {...matProps} />}
    </mesh>
  );
});

/** Head: block cube vs short upright capsule */
export const BodyHead = forwardRef(function BodyHead(
  {
    size = 0.32,
    height,
    style,
    children,
    Material = Toon,
    matProps,
    ...meshProps
  },
  ref
) {
  const mode = style || getBodyStyle();
  const h = height ?? (mode === 'lowpoly' ? size * 1.15 : size);
  if (mode === 'lowpoly') {
    const r = size * 0.5;
    const len = Math.max(0.02, h - 2 * r);
    return (
      <mesh ref={ref} {...meshProps}>
        <capsuleGeometry args={[r, len, 5, 12]} />
        {children || <Material {...matProps} />}
      </mesh>
    );
  }
  return (
    <mesh ref={ref} {...meshProps}>
      <boxGeometry args={[size, h, size]} />
      {children || <Material {...matProps} />}
    </mesh>
  );
});

/** Hand / foot stub */
export const BodyStub = forwardRef(function BodyStub(
  {
    size = 0.1,
    style,
    children,
    Material = Toon,
    matProps,
    ...meshProps
  },
  ref
) {
  const mode = style || getBodyStyle();
  if (mode === 'lowpoly') {
    return (
      <mesh ref={ref} {...meshProps}>
        <capsuleGeometry args={[size * 0.45, size * 0.35, 4, 8]} />
        {children || <Material {...matProps} />}
      </mesh>
    );
  }
  return (
    <mesh ref={ref} {...meshProps}>
      <boxGeometry args={[size, size, size]} />
      {children || <Material {...matProps} />}
    </mesh>
  );
});

/**
 * Face / hat anchors relative to head center Y.
 * block head is cube; lowpoly capsule is taller — crown sits higher in lowpoly.
 */
export function headAnchor(headCenterY, style) {
  const mode = style || getBodyStyle();
  const half = mode === 'lowpoly' ? 0.19 : 0.16;
  return {
    centerY: headCenterY,
    crownY: headCenterY + half,
    faceZ: mode === 'lowpoly' ? 0.14 : 0.17,
    browLift: mode === 'lowpoly' ? 0.06 : 0.08,
  };
}
