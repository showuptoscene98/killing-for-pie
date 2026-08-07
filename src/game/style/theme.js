import * as THREE from 'three';

/** Grim cel palette — muddy / illustrated, not pitch black */
export const DD = {
  void: '#2a241c',
  fog: '#3a3228',
  dirt: '#4a4034',
  stone: '#6a5c4a',
  stoneDark: '#524838',
  stoneLite: '#8a7a62',
  wood: '#7a5a3a',
  woodLite: '#9a7048',
  plank: '#8a6840',
  plankDark: '#6a5034',
  rust: '#8a3a28',
  blood: '#8a2828',
  bloodLite: '#b83838',
  parchment: '#d8c89a',
  parchmentDark: '#a89060',
  ink: '#3a3028',
  candle: '#e8a050',
  candleDim: '#c4782a',
  torch: '#d48840',
  sick: '#5a6a3a',
  sickLite: '#6a7c48',
  rot: '#4a5238',
  flesh: '#8a6a50',
  metal: '#6a6660',
  metalDark: '#4a4640',
  bone: '#c8b898',
  gold: '#c49a40',
  accent: '#c44030',
};

/** 6-step cel gradient — muted, less candy / childlike */
let _grad = null;
export function getToonGradient() {
  if (_grad) return _grad;
  // deeper shadows, restrained midtones, soft rim (still hard NearestFilter bands)
  const stops = [
    [62, 54, 46],
    [92, 80, 68],
    [122, 108, 90],
    [158, 142, 118],
    [192, 176, 150],
    [228, 216, 192],
  ];
  const data = new Uint8Array(stops.length * 4);
  for (let i = 0; i < stops.length; i++) {
    data[i * 4] = stops[i][0];
    data[i * 4 + 1] = stops[i][1];
    data[i * 4 + 2] = stops[i][2];
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  // Non-color data — sRGB decode was crushing shadow bands to black
  tex.colorSpace = THREE.NoColorSpace;
  _grad = tex;
  return _grad;
}
