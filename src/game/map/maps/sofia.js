/** Sofia Streets — panel blocks, kiosks, tram stop. Bulgarian city fight. */

const T = 0.4;
const WIN_W = 2.0;
const WALL_HEIGHT = 3.6;
const DOOR_H = WALL_HEIGHT - 0.12;
const DOOR_Y = WALL_HEIGHT / 2;

/**
 * Layout (top-down):
 *
 *   N  [metro / block shop alley]     buy-in north
 *      #### PANEL BLOCK COURTYARD ####
 *   W  market  |  tram plaza  |  flats  E
 *      #### spawn street / tram stop ####
 *   S           SPAWN
 *
 * Door gaps sized exactly to door meshes — no floating / walk-through holes.
 */

const WALLS = [
  // ── Outer city block (windows = WIN_W gaps) ──
  // SOUTH z=-15, gaps at x=±5.5 — span to ±15 so corners seal with E/W
  { x: -10.75, z: -15, w: 8.5, d: T }, // -15 → -6.5
  { x: 0, z: -15, w: 9, d: T }, // -4.5 → 4.5
  { x: 10.75, z: -15, w: 8.5, d: T }, // 6.5 → 15

  // NORTH z=16, gaps at x=±4.5 — same corner seal
  { x: -10.25, z: 16, w: 9.5, d: T }, // -15 → -5.5
  { x: 0, z: 16, w: 7, d: T },
  { x: 10.25, z: 16, w: 9.5, d: T }, // 5.5 → 15

  // WEST x=-15, gaps at z=1 and z=9 — extend past N/S faces for AABB overlap
  { x: -15, z: -7.6, w: T, d: 15.2 }, // -15.2 → 0
  { x: -15, z: 5, w: T, d: 6 },
  { x: -15, z: 13.1, w: T, d: 6.2 }, // 10 → 16.2

  // EAST x=15
  { x: 15, z: -7.6, w: T, d: 15.2 },
  { x: 15, z: 5, w: T, d: 6 },
  { x: 15, z: 13.1, w: T, d: 6.2 },

  // ── Street dividers / buyable doors ──
  // West alley gate — gap z∈(-4,0)=4.0
  { x: -7.5, z: -9, w: T, d: 10 }, // -14 → -4
  { x: -7.5, z: 7.5, w: T, d: 15 }, // 0 → 15

  // East flats gate — same
  { x: 7.5, z: -9, w: T, d: 10 },
  { x: 7.5, z: 7.5, w: T, d: 15 },

  // North metro gate — gap x∈(-1.5,1.5)=3.0
  { x: -5.5, z: 10.5, w: 8, d: T },
  { x: 5.5, z: 10.5, w: 8, d: T },

  // Central panel-block shell (decorative courtyard mass)
  { x: 0, z: 3.5, w: 6.5, d: 5.5, material: 'bunker' },
];

const ROOMS = {
  spawn: { id: 'spawn', open: true, label: 'Tram Stop' },
  west: { id: 'west', open: false, label: 'Market Alley' },
  east: { id: 'east', open: false, label: 'Panel Flats' },
  north: { id: 'north', open: false, label: 'Metro Stairs' },
};

const DOORS = [
  {
    id: 'door_west',
    position: [-7.5, DOOR_Y, -2],
    size: [4.0, DOOR_H, T + 0.14],
    collider: { w: T + 0.3, d: 4.15 },
    cost: 750,
    unlocks: ['west'],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    id: 'door_east',
    position: [7.5, DOOR_Y, -2],
    size: [4.0, DOOR_H, T + 0.14],
    collider: { w: T + 0.3, d: 4.15 },
    cost: 1000,
    unlocks: ['east'],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    id: 'door_north',
    position: [0, DOOR_Y, 10.5],
    size: [3.0, DOOR_H, T + 0.14],
    collider: { w: 3.1, d: T + 0.3 },
    cost: 1250,
    unlocks: ['north'],
    rotation: [0, 0, 0],
  },
];

const WINDOWS = [
  {
    id: 'win_s1',
    room: 'spawn',
    position: [-5.5, 1.3, -15],
    facing: [0, 0, 1],
    yaw: 0,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, 0, 0],
    collider: { x: -5.5, z: -15, w: WIN_W + 0.1, d: T + 0.3 },
    outside: { x: -5.5, z: -16.5 },
    inside: { x: -5.5, z: -13.5 },
  },
  {
    id: 'win_s2',
    room: 'spawn',
    position: [5.5, 1.3, -15],
    facing: [0, 0, 1],
    yaw: 0,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, 0, 0],
    collider: { x: 5.5, z: -15, w: WIN_W + 0.1, d: T + 0.3 },
    outside: { x: 5.5, z: -16.5 },
    inside: { x: 5.5, z: -13.5 },
  },
  {
    id: 'win_w1',
    room: 'west',
    position: [-15, 1.3, 1],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -15, z: 1, w: T + 0.3, d: WIN_W + 0.1 },
    outside: { x: -16.5, z: 1 },
    inside: { x: -13.5, z: 1 },
  },
  {
    id: 'win_w2',
    room: 'west',
    position: [-15, 1.3, 9],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -15, z: 9, w: T + 0.3, d: WIN_W + 0.1 },
    outside: { x: -16.5, z: 9 },
    inside: { x: -13.5, z: 9 },
  },
  {
    id: 'win_e1',
    room: 'east',
    position: [15, 1.3, 1],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 15, z: 1, w: T + 0.3, d: WIN_W + 0.1 },
    outside: { x: 16.5, z: 1 },
    inside: { x: 13.5, z: 1 },
  },
  {
    id: 'win_e2',
    room: 'east',
    position: [15, 1.3, 9],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 15, z: 9, w: T + 0.3, d: WIN_W + 0.1 },
    outside: { x: 16.5, z: 9 },
    inside: { x: 13.5, z: 9 },
  },
  {
    id: 'win_n1',
    room: 'north',
    position: [-4.5, 1.3, 16],
    facing: [0, 0, -1],
    yaw: Math.PI,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, Math.PI, 0],
    collider: { x: -4.5, z: 16, w: WIN_W + 0.1, d: T + 0.3 },
    outside: { x: -4.5, z: 17.5 },
    inside: { x: -4.5, z: 14.5 },
  },
  {
    id: 'win_n2',
    room: 'north',
    position: [4.5, 1.3, 16],
    facing: [0, 0, -1],
    yaw: Math.PI,
    width: WIN_W,
    height: 1.7,
    sill: 0.35,
    rotation: [0, Math.PI, 0],
    collider: { x: 4.5, z: 16, w: WIN_W + 0.1, d: T + 0.3 },
    outside: { x: 4.5, z: 17.5 },
    inside: { x: 4.5, z: 14.5 },
  },
];

const WALLBUYS = [
  {
    id: 'wb_m14',
    weaponId: 'm14',
    // South block z=-15, T=0.4 → inner face z=-14.8
    position: [-2.5, 1.45, -14.8],
    rotation: [0, 0, 0],
    room: 'spawn',
  },
  {
    id: 'wb_mp5',
    weaponId: 'mp5',
    position: [-14.8, 1.45, 4],
    rotation: [0, Math.PI / 2, 0],
    room: 'west',
  },
  {
    id: 'wb_olympia',
    weaponId: 'olympia',
    position: [14.8, 1.45, 4],
    rotation: [0, -Math.PI / 2, 0],
    room: 'east',
  },
  {
    id: 'wb_sniper',
    weaponId: 'sniper',
    position: [0, 1.45, 14.8],
    rotation: [0, Math.PI, 0],
    room: 'north',
  },
  {
    id: 'wb_mosin',
    weaponId: 'mosin',
    // East wall x=15, T=0.4 → inner face 14.8. Lower segment spans z -15.2→0,
    // so z=-5 is solid wall and sits just past the flats gate.
    position: [14.8, 1.45, -5],
    rotation: [0, -Math.PI / 2, 0],
    room: 'east',
  },
];

const SPAWN_POINTS = [
  { id: 'sp_s1', position: [-5, 0, -12], room: 'spawn' },
  { id: 'sp_s2', position: [5, 0, -12], room: 'spawn' },
  { id: 'sp_w1', position: [-12, 0, 2], room: 'west' },
  { id: 'sp_w2', position: [-12, 0, 8], room: 'west' },
  { id: 'sp_e1', position: [12, 0, 2], room: 'east' },
  { id: 'sp_e2', position: [12, 0, 8], room: 'east' },
  { id: 'sp_n1', position: [-4, 0, 13.5], room: 'north' },
  { id: 'sp_n2', position: [4, 0, 13.5], room: 'north' },
];

const sofia = {
  id: 'sofia',
  name: 'Sofia Streets',
  blurb: 'Panel blocks, tram stop, market alley. City night.',
  worldBound: 15.5,
  theme: 'city',
  outdoor: true,
  zombieVariant: 'gypsy',
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
    position: [0, 0, -6],
    rotation: [0, 0, 0],
    room: 'spawn',
  },
  MYSTERY_BOX_SPOTS: [
    { position: [0, 0, -6], rotation: [0, 0, 0], room: 'spawn' },
    { position: [4.2, 0, -11], rotation: [0, -0.4, 0], room: 'spawn' },
    { position: [-11.2, 0, 3.5], rotation: [0, Math.PI / 2, 0], room: 'west' },
    { position: [11.2, 0, 3.5], rotation: [0, -Math.PI / 2, 0], room: 'east' },
    { position: [0, 0, 13.2], rotation: [0, Math.PI, 0], room: 'north' },
  ],
  FLOORS: [
    // Asphalt plaza
    { x: 0, z: -8.5, w: 15, d: 13, color: '#3a3a38' },
    // Tram track strip
    { x: 0, z: -10, w: 2.2, d: 10, color: '#2a2a28', y: 0.018 },
    { x: -0.55, z: -10, w: 0.12, d: 10, color: '#6a6860', y: 0.022 },
    { x: 0.55, z: -10, w: 0.12, d: 10, color: '#6a6860', y: 0.022 },
    // Center lane markings
    { x: 0, z: -6, w: 0.35, d: 8, color: '#7a7458', y: 0.02 },
    // Sidewalks
    { x: -6.2, z: -10, w: 2.2, d: 9, color: '#4a4844', y: 0.02 },
    { x: 6.2, z: -10, w: 2.2, d: 9, color: '#4a4844', y: 0.02 },
    // West market alley
    { x: -11.25, z: 3, w: 7.5, d: 22, color: '#353430' },
    { x: -11.25, z: 3, w: 5.5, d: 18, color: '#3e3a32', y: 0.016 },
    // East flats
    { x: 11.25, z: 3, w: 7.5, d: 22, color: '#353430' },
    { x: 11.25, z: 3, w: 5.5, d: 18, color: '#3e3a32', y: 0.016 },
    // North metro pad
    { x: 0, z: 13.25, w: 15, d: 5.5, color: '#2e2e2c' },
    { x: 0, z: 13.25, w: 4, d: 4, color: '#484440', y: 0.018 },
  ],
  LIGHTS: [
    { position: [-4, 3.6, -12], intensity: 1.0, distance: 11, color: '#d8c060' },
    { position: [4, 3.6, -12], intensity: 1.0, distance: 11, color: '#d8c060' },
    { position: [0, 3.4, -7], intensity: 0.65, distance: 9, color: '#a09060' },
    { position: [-11, 3.2, 3], intensity: 0.7, distance: 9, color: '#c87828' },
    { position: [-11, 3.2, 9], intensity: 0.55, distance: 8, color: '#a06020' },
    { position: [11, 3.2, 3], intensity: 0.7, distance: 9, color: '#c87828' },
    { position: [11, 3.2, 9], intensity: 0.55, distance: 8, color: '#a06020' },
    { position: [0, 3.4, 13], intensity: 0.85, distance: 10, color: '#c85828' },
    { position: [-3, 3.0, 2], intensity: 0.5, distance: 7, color: '#806040' },
    { position: [3, 3.0, 2], intensity: 0.5, distance: 7, color: '#806040' },
    { position: [-7, 3.2, -8], intensity: 0.45, distance: 7, color: '#b09040' },
    { position: [7, 3.2, -8], intensity: 0.45, distance: 7, color: '#b09040' },
  ],
  props: [
    { type: 'kiosk', position: [-3.5, 0, -8] },
    { type: 'kiosk', position: [4.2, 0, -9.5] },
    { type: 'tramStop', position: [0, 0, -12.5] },
    { type: 'streetLamp', position: [-5.5, 0, -11] },
    { type: 'streetLamp', position: [5.5, 0, -11] },
    { type: 'streetLamp', position: [-5.5, 0, -5] },
    { type: 'streetLamp', position: [5.5, 0, -5] },
    { type: 'crate', position: [3.2, 0.42, -10], color: 'wood' },
    { type: 'crate', position: [3.2, 1.27, -10], color: 'plankDark' },
    { type: 'crate', position: [-4.5, 0.42, -7.5], color: 'plankDark' },
    { type: 'dumpster', position: [5.5, 0, -13], yaw: -0.15 },
    { type: 'rubble', position: [-6, 0, -12] },
    { type: 'cone', position: [1.5, 0, -8] },
    { type: 'cone', position: [-1.5, 0, -8] },
    { type: 'dumpster', position: [-5.8, 0, -13.5], yaw: 0.2 },
    { type: 'platform', position: [4.4, 1.85, -11.5], size: [1.4, 0.16, 1.1] },
    { type: 'platform', position: [5.2, 2.55, -12.4], size: [1.25, 0.16, 1.0] },
    { type: 'rubble', position: [6.5, 0, -7] },
    { type: 'rubble', position: [-6.2, 0, -6] },
    { type: 'marketStall', position: [-11.5, 0, 3], yaw: Math.PI / 2 },
    { type: 'marketStall', position: [-11.5, 0, 7.5], yaw: Math.PI / 2 },
    { type: 'crate', position: [-12, 0.42, 5], color: 'wood' },
    { type: 'cone', position: [-10, 0, 0.5] },
    { type: 'dumpster', position: [-13, 0, 11], yaw: Math.PI / 2 },
    { type: 'panelFlat', position: [11.2, 0, 5], yaw: -Math.PI / 2 },
    { type: 'panelFlat', position: [11.2, 0, 10], yaw: -Math.PI / 2 },
    { type: 'crate', position: [11, 0.42, 7], color: 'plankDark' },
    { type: 'rubble', position: [10, 0, 1] },
    { type: 'streetLamp', position: [10.5, 0, 3] },
    { type: 'streetLamp', position: [-10.5, 0, 5] },
    { type: 'shed', position: [0, 0, 13.5] },
    { type: 'dumpster', position: [-3, 0, 12], yaw: 0.3 },
    { type: 'crate', position: [3.2, 0.42, 14], color: 'wood' },
    { type: 'rubble', position: [2, 0, 12.5] },
    { type: 'cone', position: [-2, 0, 11.5] },
    { type: 'streetLamp', position: [0, 0, -9] },
    { type: 'streetLamp', position: [-8, 0, 1] },
    { type: 'streetLamp', position: [8, 0, 8] },
    { type: 'crate', position: [-2.5, 0.42, -11], color: 'wood' },
    { type: 'ammoCrate', position: [6.5, 0, -5], yaw: 0.4 },
    { type: 'dumpster', position: [12.5, 0, 2], yaw: -0.3 },
  ],
};

export default sofia;
