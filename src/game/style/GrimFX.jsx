import {
  EffectComposer,
  Vignette,
  HueSaturation,
  BrightnessContrast,
} from '@react-three/postprocessing';

/**
 * Lightweight grade only — Bloom/Noise/ToneMapping were killing FPS.
 * Cel look comes from toon materials + lighting, not full-screen passes.
 * FP hands/gun live in a separate overlay scene (WeaponViewmodel) drawn after this.
 */
export default function GrimFX() {
  return (
    <EffectComposer multisampling={0} renderPriority={1}>
      <HueSaturation saturation={-0.06} hue={0.01} />
      <BrightnessContrast brightness={0.06} contrast={0.12} />
      <Vignette eskil={false} offset={0.38} darkness={0.4} />
    </EffectComposer>
  );
}
