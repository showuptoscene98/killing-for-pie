/** Pie Yard — outside the bunker. Fight in the dirt yard around the sealed shell. */

const T = 0.35;
const WIN_W = 2.0;
const WALL_HEIGHT = 3.4;
const B = 0.55; // bunker exterior wall thickness

/**
 * Layout (top-down):
 *
 *   N  [factory / pie shed]     ← north (buy-in)
 *      #### BUNKER EXTERIOR ####  sealed concrete block
 *   W  tents  |  bunker  | supply  E
 *      #### front apron / yard ####
 *   S           SPAWN
 */

const WALLS = [
  // ── Outer perimeter fence — gaps exactly WIN_W; corners seal to ±15 ──
  // SOUTH fence z=-15, gaps at x=±5.5 (WIN_W=2 → ±1 around center)
  { x: -10.75, z: -15, w: 8.5, d: T }, // -15 → -6.5
  { x: 0, z: -15, w: 9, d: T }, // -4.5 → 4.5
  { x: 10.75, z: -15, w: 8.5, d: T }, // 6.5 → 15

  // NORTH fence z=16, gaps at x=±4.5
  { x: -10.25, z: 16, w: 9.5, d: T }, // -15 → -5.5
  { x: 0, z: 16, w: 7, d: T }, // -3.5 → 3.5
  { x: 10.25, z: 16, w: 9.5, d: T }, // 5.5 → 15

  // WEST fence x=-15, gaps at z=1 and z=9 — extend past N/S for AABB overlap
  { x: -15, z: -7.6, w: T, d: 15.2 }, // -15.2 → 0
  { x: -15, z: 5, w: T, d: 6 }, // 2 → 8
  { x: -15, z: 13.1, w: T, d: 6.2 }, // 10 → 16.2

  // EAST fence x=15
  { x: 15, z: -7.6, w: T, d: 15.2 },
  { x: 15, z: 5, w: T, d: 6 },
  { x: 15, z: 13.1, w: T, d: 6.2 },

  // ── Yard dividers (buyable gates) — no ungated holes ──
  // West: gap z∈(-4,0)=4 for door; solid from 0→15 north of gate
  { x: -7.5, z: -9, w: T, d: 10 }, // z -14 → -4
  { x: -7.5, z: 7.5, w: T, d: 15 }, // z 0 → 15

  // East gate wall
  { x: 7.5, z: -9, w: T, d: 10 },
  { x: 7.5, z: 7.5, w: T, d: 15 },

  // North gate wall (gap x∈(-1.5,1.5)=3.0)
  { x: -5.5, z: 10.5, w: 8, d: T }, // -9.5 → -1.5
  { x: 5.5, z: 10.5, w: 8, d: T }, // 1.5 → 9.5

  // ── Sealed bunker exterior ──
  { x: 0, z: -1.5, w: 11 + B, d: B, material: 'bunker' },
  { x: 0, z: 8.5, w: 11 + B, d: B, material: 'bunker' },
  { x: -5.5, z: 3.5, w: B, d: 10 + B, material: 'bunker' },
  { x: 5.5, z: 3.5, w: B, d: 10 + B, material: 'bunker' },
];

const ROOMS = {
  spawn: { id: 'spawn', open: true, label: 'Front Yard' },
  west: { id: 'west', open: false, label: 'Tent Row' },
  east: { id: 'east', open: false, label: 'Supply Dump' },
  north: { id: 'north', open: false, label: 'Pie Factory' },
};

const DOORS = [
  // Gap z∈(-4,0)=4 — door covers full opening, flush with wall height
  {
    id: 'door_west',
    position: [-7.5, WALL_HEIGHT / 2, -2],
    size: [4.0, WALL_HEIGHT - 0.1, T + 0.14],
    collider: { w: T + 0.28, d: 4.15 },
    cost: 750,
    unlocks: ['west'],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    id: 'door_east',
    position: [7.5, WALL_HEIGHT / 2, -2],
    size: [4.0, WALL_HEIGHT - 0.1, T + 0.14],
    collider: { w: T + 0.28, d: 4.15 },
    cost: 1000,
    unlocks: ['east'],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    id: 'door_north',
    position: [0, WALL_HEIGHT / 2, 10.5],
    size: [3.0, WALL_HEIGHT - 0.1, T + 0.14],
    collider: { w: 3.1, d: T + 0.28 },
    cost: 1250,
    unlocks: ['north'],
    rotation: [0, 0, 0],
  },
];

const WINDOWS = [
  // South fence — front yard
  {
    id: 'win_s1',
    room: 'spawn',
    position: [-5.5, 1.15, -15],
    facing: [0, 0, 1],
    yaw: 0,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, 0, 0],
    collider: { x: -5.5, z: -15, w: WIN_W + 0.15, d: T + 0.3 },
    outside: { x: -5.5, z: -16.4 },
    inside: { x: -5.5, z: -13.6 },
  },
  {
    id: 'win_s2',
    room: 'spawn',
    position: [5.5, 1.15, -15],
    facing: [0, 0, 1],
    yaw: 0,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, 0, 0],
    collider: { x: 5.5, z: -15, w: WIN_W + 0.15, d: T + 0.3 },
    outside: { x: 5.5, z: -16.4 },
    inside: { x: 5.5, z: -13.6 },
  },
  // West fence — tent row
  {
    id: 'win_w1',
    room: 'west',
    position: [-15, 1.15, 1],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -15, z: 1, w: T + 0.3, d: WIN_W + 0.15 },
    outside: { x: -16.4, z: 1 },
    inside: { x: -13.6, z: 1 },
  },
  {
    id: 'win_w2',
    room: 'west',
    position: [-15, 1.15, 9],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -15, z: 9, w: T + 0.3, d: WIN_W + 0.15 },
    outside: { x: -16.4, z: 9 },
    inside: { x: -13.6, z: 9 },
  },
  // East fence — supply
  {
    id: 'win_e1',
    room: 'east',
    position: [15, 1.15, 1],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 15, z: 1, w: T + 0.3, d: WIN_W + 0.15 },
    outside: { x: 16.4, z: 1 },
    inside: { x: 13.6, z: 1 },
  },
  {
    id: 'win_e2',
    room: 'east',
    position: [15, 1.15, 9],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 15, z: 9, w: T + 0.3, d: WIN_W + 0.15 },
    outside: { x: 16.4, z: 9 },
    inside: { x: 13.6, z: 9 },
  },
  // North fence — factory
  {
    id: 'win_n1',
    room: 'north',
    position: [-4.5, 1.15, 16],
    facing: [0, 0, -1],
    yaw: Math.PI,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, Math.PI, 0],
    collider: { x: -4.5, z: 16, w: WIN_W + 0.15, d: T + 0.3 },
    outside: { x: -4.5, z: 17.4 },
    inside: { x: -4.5, z: 14.6 },
  },
  {
    id: 'win_n2',
    room: 'north',
    position: [4.5, 1.15, 16],
    facing: [0, 0, -1],
    yaw: Math.PI,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, Math.PI, 0],
    collider: { x: 4.5, z: 16, w: WIN_W + 0.15, d: T + 0.3 },
    outside: { x: 4.5, z: 17.4 },
    inside: { x: 4.5, z: 14.6 },
  },
];

const WALLBUYS = [
  {
    id: 'wb_m14',
    weaponId: 'm14',
    // South fence z=-15, T=0.35 → inner face z=-14.825
    position: [-3.5, 1.35, -14.825],
    rotation: [0, 0, 0],
    room: 'spawn',
  },
  {
    id: 'wb_mp5',
    weaponId: 'mp5',
    position: [-14.825, 1.35, 4],
    rotation: [0, Math.PI / 2, 0],
    room: 'west',
  },
  {
    id: 'wb_olympia',
    weaponId: 'olympia',
    position: [14.825, 1.35, 4],
    rotation: [0, -Math.PI / 2, 0],
    room: 'east',
  },
  {
    id: 'wb_sniper',
    weaponId: 'sniper',
    position: [-3.5, 1.35, 14.825],
    rotation: [0, Math.PI, 0],
    room: 'north',
  },
  {
    id: 'wb_mosin',
    weaponId: 'mosin',
    position: [3.5, 1.35, 14.825],
    rotation: [0, Math.PI, 0],
    room: 'north',
  },
];

const SPAWN_POINTS = [
  { id: 'sp_s1', position: [-5, 0, -13.2], room: 'spawn' },
  { id: 'sp_s2', position: [5, 0, -13.2], room: 'spawn' },
  { id: 'sp_w1', position: [-13.2, 0, 1], room: 'west' },
  { id: 'sp_w2', position: [-13.2, 0, 9], room: 'west' },
  { id: 'sp_e1', position: [13.2, 0, 1], room: 'east' },
  { id: 'sp_e2', position: [13.2, 0, 9], room: 'east' },
  { id: 'sp_n1', position: [-4, 0, 14.2], room: 'north' },
  { id: 'sp_n2', position: [4, 0, 14.2], room: 'north' },
  { id: 'sp_n3', position: [0, 0, 13.5], room: 'north' },
];

const camp = {
  id: 'camp',
  name: 'Pie Yard',
  blurb: 'Combat map — dirt yard + pie factory pad outside the bunker. Not the Safehouse hub.',
  worldBound: 15.5,
  theme: 'camp',
  outdoor: true,
  WALL_THICKNESS: T,
  WALL_HEIGHT,
  FLOOR_Y: 0,
  WALLS,
  ROOMS,
  DOORS,
  WINDOWS,
  WALLBUYS,
  SPAWN_POINTS,
  PLAYER_SPAWN: { x: 0, y: 0, z: -11 },
  MYSTERY_BOX: {
    position: [0, 0, -5.5],
    rotation: [0, 0, 0],
    room: 'spawn',
  },
  MYSTERY_BOX_SPOTS: [
    { position: [0, 0, -5.5], rotation: [0, 0, 0], room: 'spawn' },
    { position: [-3.8, 0, -10.5], rotation: [0, 0.35, 0], room: 'spawn' },
    { position: [-11.2, 0, 3.5], rotation: [0, Math.PI / 2, 0], room: 'west' },
    { position: [11.2, 0, 3.5], rotation: [0, -Math.PI / 2, 0], room: 'east' },
    // Clear of the north shed solid at [0, 0, 13.5]
    { position: [-4.2, 0, 12.5], rotation: [0, Math.PI, 0], room: 'north' },
  ],
  FLOORS: [
    // Front yard dirt
    { x: 0, z: -8.5, w: 15, d: 13, color: '#4a3c28' },
    // Worn path
    { x: 0, z: -6, w: 3.6, d: 10, color: '#5a4a34', y: 0.016 },
    { x: 0, z: -9, w: 1.4, d: 6, color: '#6a5a40', y: 0.02 },
    // West tent dirt
    { x: -11.25, z: 3, w: 7.5, d: 22, color: '#453828' },
    { x: -11.25, z: 4, w: 5, d: 14, color: '#3e3224', y: 0.015 },
    // East supply dirt
    { x: 11.25, z: 3, w: 7.5, d: 22, color: '#453828' },
    { x: 11.25, z: 4, w: 5, d: 14, color: '#3e3224', y: 0.015 },
    // North factory pad
    { x: 0, z: 13.25, w: 15, d: 5.5, color: '#3a3224' },
    { x: 0, z: 13.25, w: 6, d: 4, color: '#4a4030', y: 0.018 },
  ],
  LIGHTS: [
    { position: [-4, 3.0, -12], intensity: 0.85, distance: 10, color: '#d47828' },
    { position: [4, 3.0, -12], intensity: 0.85, distance: 10, color: '#d47828' },
    { position: [0, 3.2, -8], intensity: 0.65, distance: 9, color: '#a06030' },
    { position: [-2.5, 1.2, -4.5], intensity: 1.6, distance: 8, color: '#ff6a20' },
    { position: [-3.5, 3.6, -1.2], intensity: 0.9, distance: 9, color: '#c8a060' },
    { position: [3.5, 3.6, -1.2], intensity: 0.9, distance: 9, color: '#c8a060' },
    { position: [-11, 2.8, 3], intensity: 0.65, distance: 9, color: '#c06028' },
    { position: [-11, 2.8, 8], intensity: 0.5, distance: 8, color: '#a05020' },
    { position: [11, 2.8, 3], intensity: 0.65, distance: 9, color: '#c06028' },
    { position: [11, 2.8, 8], intensity: 0.5, distance: 8, color: '#a05020' },
    { position: [0, 3.2, 13], intensity: 1.0, distance: 11, color: '#c85828' },
    { position: [-4, 2.8, 14.5], intensity: 0.5, distance: 7, color: '#903820' },
  ],
  props: [
    { type: 'bunkerExterior', position: [0, 0, 3.5] },
    { type: 'campfire', position: [-2.5, 0, -4.5] },
    { type: 'crate', position: [3.5, 0.42, -9], color: 'wood' },
    { type: 'crate', position: [3.5, 1.27, -9], color: 'plankDark' },
    { type: 'crate', position: [-4.2, 0.42, -8.5] },
    { type: 'crate', position: [4.2, 0.42, -10.5], color: 'plankDark' },
    { type: 'sandbags', position: [5.2, 0, -12], yaw: 0.15, count: 3 },
    { type: 'ammoCrate', position: [-5.5, 0, -12.2], yaw: -0.25 },
    { type: 'cone', position: [1.8, 0, -7] },
    { type: 'cone', position: [-1.8, 0, -7] },
    { type: 'ammoCrate', position: [2.2, 0, -9.2], yaw: 0.35 },
    { type: 'rubble', position: [6, 0, -8] },
    { type: 'rubble', position: [-6.5, 0, -6.5] },
    { type: 'dumpster', position: [6, 0, -13], yaw: -0.2 },
    { type: 'platform', position: [5.0, 1.85, -11.2], size: [1.5, 0.16, 1.15] },
    { type: 'platform', position: [4.2, 2.55, -10.0], size: [1.3, 0.16, 1.05] },
    { type: 'tent', position: [-11.5, 0, 2], yaw: Math.PI / 2 },
    { type: 'tent', position: [-11.5, 0, 7.5], yaw: Math.PI / 2 },
    { type: 'sandbags', position: [-10, 0, -0.5], yaw: 0.1, count: 3 },
    { type: 'crate', position: [-12, 0.42, 5], color: 'plankDark' },
    { type: 'crate', position: [-10.5, 0.42, 4.2], color: 'wood' },
    { type: 'crate', position: [-10.5, 1.27, 4.2], color: 'plankDark' },
    { type: 'tent', position: [11.5, 0, 2], yaw: -Math.PI / 2 },
    { type: 'crate', position: [11, 0.42, 6], color: 'wood' },
    { type: 'crate', position: [12.2, 0.42, 7.2] },
    { type: 'ammoCrate', position: [10, 0, -0.5], yaw: -0.4 },
    { type: 'cone', position: [9.5, 0, 4] },
    { type: 'dumpster', position: [13, 0, 10], yaw: Math.PI / 2 },
    { type: 'shed', position: [0, 0, 13.5] },
    { type: 'sandbags', position: [-3, 0, 12], count: 3 },
    { type: 'crate', position: [1.5, 0.42, 12.2], color: 'wood' },
    { type: 'crate', position: [3.5, 0.42, 14], color: 'plankDark' },
    { type: 'rubble', position: [-5, 0, 12] },
    { type: 'streetLamp', position: [-4, 0, -11] },
    { type: 'streetLamp', position: [4, 0, -11] },
    { type: 'streetLamp', position: [-10, 0, 4] },
    { type: 'streetLamp', position: [10, 0, 4] },
    { type: 'ammoCrate', position: [0.5, 0, -10.5], yaw: 0.2 },
    { type: 'crate', position: [-8, 0.42, -3], color: 'wood' },
    { type: 'sandbags', position: [8.5, 0, -3], count: 2 },
  ],
};

export default camp;
