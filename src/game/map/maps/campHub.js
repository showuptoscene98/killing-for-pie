/** Camp Hub — rundown shanty city safehouse (not a combat map). */

const T = 0.4;
const WALL_HEIGHT = 2.6;
const B = 20; // half-extent of outer yard

const WALLS = [
  // Outer perimeter — south mouth sealed by rundown tank
  { x: -12, z: -B, w: 12, d: T },
  { x: 12, z: -B, w: 12, d: T },
  { x: 0, z: B, w: B * 2, d: T },
  { x: -B, z: 0, w: T, d: B * 2 },
  { x: B, z: 0, w: T, d: B * 2 },
  // Short interior dividers — keep alleys open (old lengths felt like invisible walls)
  { x: -10, z: 7, w: T, d: 5 },
  { x: 10, z: -5, w: T, d: 6 },
  { x: -5, z: 12, w: 5, d: T },
  { x: 7, z: -12, w: 4.5, d: T },
];

const campHub = {
  id: 'campHub',
  name: 'Shanty City',
  blurb: 'Rundown scrap town. Talk to survivors. Deploy when ready.',
  hub: true,
  worldBound: B + 0.25,
  theme: 'camp',
  outdoor: true,
  WALL_THICKNESS: T,
  WALL_HEIGHT,
  FLOOR_Y: 0,
  WALLS,
  ROOMS: {
    yard: { id: 'yard', open: true, label: 'Shanty Yard' },
  },
  DOORS: [],
  WINDOWS: [],
  WALLBUYS: [],
  SPAWN_POINTS: [],
  PLAYER_SPAWN: { x: 0, y: 0, z: -14 },
  MYSTERY_BOX: null,
  MYSTERY_BOX_SPOTS: [],
  DEPLOY_PAD: { x: 2, z: 12, r: 2.4 },
  FLOORS: [
    // Dirt / packed mud base
    { x: 0, z: 0, w: B * 2, d: B * 2, color: '#3a3224', layer: 0 },
    // Patchwork streets
    { x: 0, z: -6, w: 5, d: 22, color: '#4a4030', layer: 1 },
    { x: 0, z: 8, w: 22, d: 4.5, color: '#453a2a', layer: 1 },
    { x: -8, z: 2, w: 8, d: 4, color: '#3f3428', layer: 1 },
    { x: 9, z: -2, w: 7, d: 5, color: '#423628', layer: 1 },
    // Covered market pad
    { x: -6, z: -2, w: 10, d: 8, color: '#2e281e', layer: 2 },
    // Deploy pad
    { x: 2, z: 12, w: 6, d: 5.5, color: '#5a4820', layer: 2 },
    // South gate approach
    { x: 0, z: -18, w: 8, d: 4, color: '#2a2218', layer: 2 },
    // Outside torch court (NW)
    { x: -14, z: 14, w: 8, d: 8, color: '#32281c', layer: 1 },
  ],
  LIGHTS: [
    { position: [-6, 2.4, -2], intensity: 0.85, distance: 12, color: '#ff8a30' },
    { position: [2, 2.8, 12], intensity: 1.05, distance: 14, color: '#ffc040' },
    { position: [0, 2.4, -14], intensity: 0.4, distance: 12, color: '#a07040' },
    { position: [-14, 2.2, 14], intensity: 0.55, distance: 10, color: '#ff7020' },
  ],
  props: [
    // ── Covered roof + hanging lights (market lean-to) ──
    {
      type: 'shantyRoof',
      position: [-6, 0, -2],
      size: [10.5, 3.1, 8.2],
    },
    { type: 'hangingBulb', position: [-8.5, 2.85, -3.5], intensity: 0.95, color: '#e8a848' },
    { type: 'hangingBulb', position: [-6, 2.9, -1.2], intensity: 1.1, color: '#ffb050' },
    { type: 'hangingBulb', position: [-3.5, 2.85, -3.2], intensity: 0.9, color: '#e89840' },
    { type: 'hangingBulb', position: [-7.2, 2.8, 0.5], intensity: 0.75, color: '#c85828' },

    // ── Campfire under roof ──
    { type: 'campfire', position: [-5.5, 0, -1.5] },

    // ── Rundown tank blocks south gate ──
    {
      type: 'tank',
      position: [0.2, 0, -19.2],
      yaw: Math.PI / 2 + 0.08,
    },
    { type: 'sandbags', position: [-4.5, 0, -18.2], yaw: 0.12, count: 4 },
    { type: 'sandbags', position: [4.6, 0, -18.1], yaw: -0.1, count: 4 },
    { type: 'rubble', position: [2.2, 0, -17.6] },
    { type: 'rubble', position: [-2.4, 0, -17.8] },
    { type: 'ammoCrate', position: [-3.2, 0, -17.2], yaw: 0.3 },
    { type: 'ammoCrate', position: [3.0, 0, -17.0], yaw: -0.25 },

    // ── Outside torch court (NW wall) ──
    { type: 'wallTorch', position: [-19.6, 1.35, 11], yaw: Math.PI / 2 },
    { type: 'wallTorch', position: [-19.6, 1.35, 14], yaw: Math.PI / 2 },
    { type: 'wallTorch', position: [-19.6, 1.35, 17], yaw: Math.PI / 2 },
    { type: 'wallTorch', position: [-16, 1.35, 19.6], yaw: Math.PI },
    { type: 'wallTorch', position: [-12.5, 1.35, 19.6], yaw: Math.PI },
    { type: 'barrel', position: [-15, 0, 13] },
    { type: 'crate', position: [-13.5, 0.42, 15.5], color: 'plankDark' },
    { type: 'dumpster', position: [-17, 0, 12], yaw: 0.2 },

    // ── Shanty dens — west row ──
    { type: 'shed', position: [-14, 0, 2] },
    { type: 'tent', position: [-15.5, 0, -4], yaw: Math.PI / 2, color: '#5a4030', trim: '#3a2818' },
    { type: 'tent', position: [-15.2, 0, -8], yaw: Math.PI * 0.55, color: '#4a5038', trim: '#2a3020' },
    { type: 'tent', position: [-14.8, 0, 7], yaw: Math.PI * 0.4, color: '#6a4a28', trim: '#4a3018' },
    { type: 'marketStall', position: [-11, 0, -6], yaw: Math.PI / 2 },
    { type: 'dumpster', position: [-12, 0, 0], yaw: 0.4 },

    // ── East scrap row ──
    { type: 'panelFlat', position: [16, 0, 4], yaw: -Math.PI / 2 },
    { type: 'tent', position: [15, 0, -2], yaw: -Math.PI / 2, color: '#5a4028', trim: '#3a2818' },
    { type: 'tent', position: [15.2, 0, -7], yaw: -Math.PI * 0.45, color: '#6a5030', trim: '#4a3820' },
    { type: 'tent', position: [14.5, 0, 9], yaw: -Math.PI * 0.7, color: '#4a4830', trim: '#2a2818' },
    { type: 'kiosk', position: [12, 0, 1] },
    { type: 'dumpster', position: [13.5, 0, -10], yaw: -0.3 },

    // ── North dens near deploy ──
    { type: 'tent', position: [-8, 0, 15], yaw: Math.PI * 0.9, color: '#5a4830', trim: '#3a3020' },
    { type: 'tent', position: [8, 0, 15.5], yaw: Math.PI, color: '#6a5030', trim: '#4a3820' },
    { type: 'shed', position: [-12, 0, 16] },
    { type: 'marketStall', position: [10, 0, 10], yaw: -0.4 },

    // ── Central clutter ──
    { type: 'crate', position: [-9, 0.42, 4], color: 'wood' },
    { type: 'crate', position: [-7.5, 0.42, 5], color: 'plankDark' },
    { type: 'crate', position: [-7.5, 1.27, 5], color: 'wood' },
    { type: 'crate', position: [7, 0.42, -6], color: 'wood' },
    { type: 'crate', position: [7, 1.27, -6], color: 'plankDark' },
    { type: 'barrel', position: [5, 0, 3] },
    { type: 'barrel', position: [-2, 0, 6] },
    { type: 'ammoCrate', position: [-10, 0, 8], yaw: 0.5 },
    { type: 'ammoCrate', position: [9, 0, 6], yaw: -0.4 },
    { type: 'sandbags', position: [-16, 0, -12], yaw: Math.PI / 2, count: 3 },
    { type: 'sandbags', position: [16, 0, 12], yaw: Math.PI / 2, count: 3 },
    { type: 'rubble', position: [4, 0, -10] },
    { type: 'rubble', position: [-10, 0, -12] },
    { type: 'cone', position: [0.2, 0, 9.5] },
    { type: 'cone', position: [3.8, 0, 9.5] },

    // ── Max parkour (SE) ──
    { type: 'crate', position: [10, 0.42, -14], color: 'wood' },
    { type: 'crate', position: [11.2, 0.42, -13.5], color: 'plankDark' },
    { type: 'crate', position: [11.2, 1.27, -13.5], color: 'wood' },
    { type: 'crate', position: [12.8, 0.42, -12], color: 'plankDark' },
    { type: 'crate', position: [13.6, 0.42, -10], color: 'plankDark' },
    { type: 'crate', position: [13.6, 1.27, -10], color: 'wood' },
    { type: 'crate', position: [13.6, 2.12, -10], color: 'plankDark' },
    {
      type: 'platform',
      position: [13.6, 2.65, -10],
      size: [1.8, 0.16, 1.4],
    },
    { type: 'crate', position: [9.5, 0.42, -11], color: 'wood' },
    { type: 'platform', position: [8, 0.82, -8], size: [1.4, 0.16, 1.1] },
    { type: 'platform', position: [6.2, 1.62, -7.5], size: [1.3, 0.16, 1.0] },

    // Wall torches on outer walls (flicker)
    { type: 'wallTorch', position: [-19.6, 1.4, -8], yaw: Math.PI / 2 },
    { type: 'wallTorch', position: [-19.6, 1.4, 0], yaw: Math.PI / 2 },
    { type: 'wallTorch', position: [19.6, 1.4, -6], yaw: -Math.PI / 2 },
    { type: 'wallTorch', position: [19.6, 1.4, 6], yaw: -Math.PI / 2 },
    { type: 'wallTorch', position: [-8, 1.4, 19.6], yaw: Math.PI },
    { type: 'wallTorch', position: [8, 1.4, 19.6], yaw: Math.PI },
  ],
};

export default campHub;
