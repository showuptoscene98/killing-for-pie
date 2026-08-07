/** Rotten Acre — outdoor farm. Bipedal cow zombies + undead farmers. */

const T = 0.35;
const WIN_W = 2.0;
const WALL_HEIGHT = 3.4;
const B = 0.5; // barn wall thickness

/**
 * Layout (top-down):
 *
 *   N  [silo / grain loft]     ← north (buy-in)
 *      #### BARN SHELL ####
 *   W  corn  |  barn  | coop   E
 *      #### front pasture ####
 *   S           SPAWN
 */

const WALLS = [
  // ── Outer fence — gaps exactly WIN_W at window centers; corners seal to ±15 ──
  // SOUTH fence z=-15, gaps at x=±5.5
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

  // ── Yard dividers (buyable gates) ──
  { x: -7.5, z: -9, w: T, d: 10 },
  { x: -7.5, z: 7.5, w: T, d: 15 },
  { x: 7.5, z: -9, w: T, d: 10 },
  { x: 7.5, z: 7.5, w: T, d: 15 },
  { x: -5.5, z: 10.5, w: 8, d: T },
  { x: 5.5, z: 10.5, w: 8, d: T },

  // ── Barn shell (collision) ──
  { x: 0, z: -1.5, w: 11 + B, d: B, material: 'barn' },
  { x: 0, z: 8.5, w: 11 + B, d: B, material: 'barn' },
  { x: -5.5, z: 3.5, w: B, d: 10 + B, material: 'barn' },
  { x: 5.5, z: 3.5, w: B, d: 10 + B, material: 'barn' },
];

const ROOMS = {
  spawn: { id: 'spawn', open: true, label: 'Pasture' },
  west: { id: 'west', open: false, label: 'Corn Rows' },
  east: { id: 'east', open: false, label: 'Chicken Coop' },
  north: { id: 'north', open: false, label: 'Silo Yard' },
};

const DOORS = [
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
    position: [0, 1.35, 14.825],
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

const farm = {
  id: 'farm',
  name: 'Rotten Acre',
  blurb: 'Pasture, barn, silo. Bipedal cows & dead farmers.',
  worldBound: 14.5,
  theme: 'farm',
  outdoor: true,
  zombieVariants: ['cow', 'cow', 'cow', 'farmer'],
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
  },
  FLOORS: [
    // Front pasture
    { x: 0, z: -8.5, w: 15, d: 13, color: '#3a5028' },
    { x: 0, z: -9, w: 11, d: 8, color: '#456030', y: 0.014 },
    // Dirt tractor path
    { x: 0, z: -6, w: 2.8, d: 10, color: '#5a4830', y: 0.018 },
    { x: 0, z: -9, w: 1.2, d: 5, color: '#6a5840', y: 0.022 },
    // West corn field
    { x: -11.25, z: 3, w: 7.5, d: 22, color: '#354828' },
    { x: -11.25, z: 4, w: 5.5, d: 14, color: '#2e4020', y: 0.015 },
    // East coop yard
    { x: 11.25, z: 3, w: 7.5, d: 22, color: '#4a4030' },
    { x: 11.25, z: 4, w: 5, d: 14, color: '#3e3424', y: 0.015 },
    // North silo pad
    { x: 0, z: 13.25, w: 15, d: 5.5, color: '#4a4434' },
    { x: 0, z: 13.25, w: 5, d: 4, color: '#5a5040', y: 0.018 },
  ],
  LIGHTS: [
    { position: [-4, 3.0, -12], intensity: 0.75, distance: 10, color: '#d8a040' },
    { position: [4, 3.0, -12], intensity: 0.75, distance: 10, color: '#d8a040' },
    { position: [0, 3.2, -8], intensity: 0.55, distance: 9, color: '#a87830' },
    { position: [-3.5, 3.8, -1.2], intensity: 0.85, distance: 9, color: '#c8a050' },
    { position: [3.5, 3.8, -1.2], intensity: 0.85, distance: 9, color: '#c8a050' },
    { position: [-11, 2.6, 3], intensity: 0.55, distance: 8, color: '#88a040' },
    { position: [-11, 2.6, 8], intensity: 0.45, distance: 7, color: '#709030' },
    { position: [11, 2.6, 3], intensity: 0.6, distance: 8, color: '#c06028' },
    { position: [11, 2.6, 8], intensity: 0.5, distance: 7, color: '#a05020' },
    { position: [0, 4.2, 13], intensity: 1.1, distance: 12, color: '#e0a848' },
    { position: [-4, 2.8, 14.5], intensity: 0.45, distance: 7, color: '#906028' },
  ],
  props: [
    { type: 'barn', position: [0, 0, 3.5] },
    { type: 'silo', position: [-3.2, 0, 13.8] },
    { type: 'hayBale', position: [2.8, 0, -8.5] },
    { type: 'hayBale', position: [3.6, 0, -7.2], yaw: 0.4 },
    { type: 'hayBale', position: [-4.5, 0, -9], yaw: -0.3 },
    { type: 'tractor', position: [4.5, 0, -11.5], yaw: -0.35 },
    { type: 'scarecrow', position: [-2.2, 0, -6.5] },
    { type: 'crate', position: [3.2, 0.42, -9.5], color: 'wood' },
    { type: 'crate', position: [-5, 0.42, -10], color: 'plankDark' },
    { type: 'hayBale', position: [5.5, 0, -13], yaw: 0.25 },
    { type: 'hayBale', position: [-5.8, 0, -12.5], yaw: -0.4 },
    { type: 'rubble', position: [6.2, 0, -8] },
    { type: 'rubble', position: [-6.5, 0, -6.8] },
    // West corn
    { type: 'cornStalk', position: [-10.5, 0, 1] },
    { type: 'cornStalk', position: [-12, 0, 2.5] },
    { type: 'cornStalk', position: [-11, 0, 4.2] },
    { type: 'cornStalk', position: [-12.5, 0, 5.5] },
    { type: 'cornStalk', position: [-10.2, 0, 6.8] },
    { type: 'cornStalk', position: [-11.8, 0, 8.5] },
    { type: 'cornStalk', position: [-10.8, 0, 10] },
    { type: 'hayBale', position: [-12.5, 0, -0.5], yaw: 0.6 },
    { type: 'crate', position: [-10.5, 0.42, 5], color: 'wood' },
    // East coop
    { type: 'shed', position: [11.5, 0, 5] },
    { type: 'hayBale', position: [10.5, 0, 2], yaw: -0.2 },
    { type: 'crate', position: [12, 0.42, 8], color: 'plankDark' },
    { type: 'hayBale', position: [10, 0, 0.5], yaw: 0.55 },
    { type: 'scarecrow', position: [10.2, 0, 9.5], yaw: Math.PI / 4 },
    // North silo yard
    { type: 'hayBale', position: [3.5, 0, 12.5] },
    { type: 'hayBale', position: [4.2, 0, 13.8], yaw: 0.5 },
    { type: 'crate', position: [2, 0.42, 14.5], color: 'wood' },
    { type: 'scarecrow', position: [-5.5, 0, 12.2], yaw: -Math.PI / 5 },
    { type: 'rubble', position: [1.5, 0, 12] },
    { type: 'streetLamp', position: [-5, 0, -11] },
    { type: 'streetLamp', position: [5, 0, -11] },
    { type: 'streetLamp', position: [-10, 0, 6] },
    { type: 'streetLamp', position: [10, 0, 6] },
    { type: 'crate', position: [0, 0.42, -10], color: 'wood' },
    { type: 'ammoCrate', position: [-3, 0, -7], yaw: 0.3 },
    { type: 'hayBale', position: [6.5, 0, -5], yaw: 0.2 },
  ],
};

export default farm;
