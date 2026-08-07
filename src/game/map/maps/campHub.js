/** Camp Hub — quiet safehouse yard (not a combat map). */

const T = 0.35;
const WALL_HEIGHT = 2.4;

const WALLS = [
  // Outer fence only — south mouth sealed by crashed heli prop
  { x: -8, z: -12, w: 8, d: T },
  { x: 8, z: -12, w: 8, d: T },
  { x: 0, z: 12, w: 24, d: T },
  { x: -12, z: 0, w: T, d: 24 },
  { x: 12, z: 0, w: T, d: 24 },
];

const campHub = {
  id: 'campHub',
  name: 'Safehouse',
  blurb: 'Walk the yard. Talk to survivors. Deploy when ready.',
  hub: true,
  worldBound: 11.5,
  theme: 'camp',
  outdoor: true,
  WALL_THICKNESS: T,
  WALL_HEIGHT,
  FLOOR_Y: 0,
  WALLS,
  ROOMS: {
    yard: { id: 'yard', open: true, label: 'Yard' },
  },
  DOORS: [],
  WINDOWS: [],
  WALLBUYS: [],
  SPAWN_POINTS: [],
  PLAYER_SPAWN: { x: 0, y: 0, z: -8 },
  MYSTERY_BOX: null,
  DEPLOY_PAD: { x: 1.2, z: 6.8, r: 2.15 },
  FLOORS: [
    { x: 0, z: 0, w: 24, d: 24, color: '#4a3c28', layer: 0 },
    { x: 0, z: -6, w: 4, d: 10, color: '#5a4a34', layer: 1 },
    { x: 1.2, z: 6.8, w: 5.5, d: 5, color: '#5a4820', layer: 1 },
    { x: 0, z: -11.4, w: 7, d: 3.2, color: '#2a2218', layer: 2 },
  ],
  // Keep light count low — hub lag was mostly stacked point lights
  LIGHTS: [
    { position: [-2.5, 1.2, -2], intensity: 1.0, distance: 10, color: '#ff6a20' },
    { position: [1.2, 2.8, 6.8], intensity: 1.15, distance: 14, color: '#ffc040' },
    { position: [0, 2.6, -8], intensity: 0.35, distance: 12, color: '#a07040' },
  ],
  props: [
    { type: 'campfire', position: [-2.5, 0, -2] },
    // Tent ring — west / east / corners (clear of deploy + parkour)
    { type: 'tent', position: [-7.5, 0, 3], yaw: Math.PI / 2, color: '#6a4a28', trim: '#5a3c22' },
    { type: 'tent', position: [-7.8, 0, -1.2], yaw: Math.PI * 0.55, color: '#5a4830', trim: '#4a3824' },
    { type: 'tent', position: [-8.0, 0, -5.0], yaw: Math.PI * 0.4, color: '#6a5030', trim: '#4a3820' },
    { type: 'tent', position: [7.5, 0, 2.8], yaw: -Math.PI / 2, color: '#5a4028', trim: '#4a3018' },
    { type: 'tent', position: [8.0, 0, -1.5], yaw: -Math.PI * 0.45, color: '#6a4a28', trim: '#5a3c22' },
    { type: 'tent', position: [7.6, 0, 7.2], yaw: -Math.PI * 0.7, color: '#4a5038', trim: '#3a4028' },
    { type: 'tent', position: [-6.5, 0, 7.5], yaw: Math.PI * 0.85, color: '#5a4830', trim: '#4a3824' },
    { type: 'tent', position: [4.5, 0, 9.5], yaw: Math.PI, color: '#6a5030', trim: '#4a3820' },
    // Shed tucked NW
    { type: 'shed', position: [-5.8, 0, 9.6] },
    {
      type: 'crashedHeli',
      position: [0.3, 0, -11.4],
      yaw: Math.PI / 2 + 0.12,
    },
    { type: 'sandbags', position: [-4.2, 0, -10.2], yaw: 0.1, count: 4 },
    { type: 'sandbags', position: [4.2, 0, -10.15], yaw: -0.08, count: 4 },
    { type: 'sandbags', position: [-9.5, 0, -6], yaw: Math.PI / 2, count: 4 },
    { type: 'sandbags', position: [9.5, 0, 5], yaw: Math.PI / 2, count: 3 },
    { type: 'ammoCrate', position: [-2.8, 0, -10.0], yaw: 0.3 },
    { type: 'ammoCrate', position: [2.6, 0, -9.9], yaw: -0.2 },
    { type: 'sandbags', position: [-3.6, 0, -9.5], yaw: 0.15, count: 3 },
    { type: 'rubble', position: [1.8, 0, -10.6] },
    { type: 'crate', position: [-5.5, 0.42, 4], color: 'wood' },
    { type: 'crate', position: [-4.2, 0.42, 5], color: 'plankDark' },
    { type: 'crate', position: [-4.2, 1.27, 5], color: 'wood' },
    { type: 'crate', position: [6.5, 0.42, -2.5], color: 'wood' },
    { type: 'crate', position: [6.5, 1.27, -2.5], color: 'plankDark' },
    { type: 'ammoCrate', position: [-6.8, 0, 5.2], yaw: 0.4 },
    { type: 'sandbags', position: [-6, 0, -4], yaw: Math.PI / 2, count: 3 },
    { type: 'ammoCrate', position: [5.5, 0, 4.2], yaw: -0.3 },
    { type: 'sandbags', position: [-3.2, 0, 10.2], count: 3 },
    { type: 'ammoCrate', position: [8.5, 0, 8.5], yaw: 0.5 },
    { type: 'platform', position: [4.2, 0.82, -4.5], size: [1.4, 0.16, 1.1] },
    { type: 'platform', position: [2.6, 1.62, -4.2], size: [1.3, 0.16, 1.0] },
    { type: 'cone', position: [-0.6, 0, 4.6] },
    { type: 'cone', position: [3.0, 0, 4.6] },
    { type: 'ammoCrate', position: [2, 0, -3], yaw: 0.2 },
    // Max's parkour course (SE yard)
    { type: 'crate', position: [4.2, 0.42, -8.2], color: 'wood' },
    { type: 'crate', position: [5.3, 0.42, -8.0], color: 'plankDark' },
    { type: 'crate', position: [5.3, 1.27, -8.0], color: 'wood' },
    { type: 'crate', position: [6.6, 0.42, -7.2], color: 'plankDark' },
    { type: 'crate', position: [7.4, 0.42, -5.8], color: 'plankDark' },
    { type: 'crate', position: [7.4, 1.27, -5.8], color: 'wood' },
    { type: 'crate', position: [7.4, 2.12, -5.8], color: 'plankDark' },
    {
      type: 'platform',
      position: [7.4, 2.65, -5.8],
      size: [1.8, 0.16, 1.4],
    },
    { type: 'crate', position: [4.0, 0.42, -5.0], color: 'wood' },
    { type: 'crate', position: [3.2, 0.42, -6.5], color: 'plankDark' },
  ],
};

export default campHub;
