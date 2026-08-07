import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/** R3F's react-use-measure needs this in jsdom. */
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as never);

/** Postprocessing compiles real shaders, which jsdom has no GL context for. */
vi.mock('../game/style/GrimFX', () => ({ default: () => null }));

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as never;
}
