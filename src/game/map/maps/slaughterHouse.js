/** Slaughter House — butcher yard. Hanging carcasses, blood, meat hooks. */

const T = 0.35;
const WIN_W = 2.0;
const WALL_HEIGHT = 3.4;
const B = 0.5;

/**
 * Layout (top-down):
 *
 *   N  [cold storage]          ← north (buy-in)
 *      #### KILL FLOOR ####
 *   W  pens  |  floor  | smoke  E
 *      #### bloody yard ####
 *   S           SPAWN
 */

const WALLS = [
  // ── Outer fence — gaps exactly WIN_W at window centers ──
  // SOUTH z=-15, gaps at x=±5.5
  { x: -10.75, z: -15, w: 8.5, d: T },
  { x: 0, z: -15, w: 9, d: T },
  { x: 10.75, z: -15, w: 8.5, d: T },

  // NORTH z=16, gaps at x=±4.5
  { x: -10.25, z: 16, w: 9.5, d: T },
  { x: 0, z: 16, w: 7, d: T },
  { x: 10.25, z: 16, w: 9.5, d: T },

  // WEST x=-15
  { x: -15, z: -7.6, w: T, d: 15.2 },
  { x: -15, z: 5, w: T, d: 6 },
  { x: -15, z: 13.1, w: T, d: 6.2 },

  // EAST x=15
  { x: 15, z: -7.6, w: T, d: 15.2 },
  { x: 15, z: 5, w: T, d: 6 },
  { x: 15, z: 13.1, w: T, d: 6.2 },

  // ── Yard dividers ──
  { x: -7.5, z: -9, w: T, d: 10 },
  { x: -7.5, z: 7.5, w: T, d: 15 },
  { x: 7.5, z: -9, w: T, d: 10 },
  { x: 7.5, z: 7.5, w: T, d: 15 },
  { x: -5.5, z: 10.5, w: 8, d: T },
  { x: 5.5, z: 10.5, w: 8, d: T },

  // ── Kill-floor shell (barn material = stained wood) ──
  { x: 0, z: -1.5, w: 11 + B, d: B, material: 'barn' },
  { x: 0, z: 8.5, w: 11 + B, d: B, material: 'barn' },
  { x: -5.5, z: 3.5, w: B, d: 10 + B, material: 'barn' },
  { x: 5.5, z: 3.5, w: B, d: 10 + B, material: 'barn' },
];

const ROOMS = {
  spawn: { id: 'spawn', open: true, label: 'Bloody Yard' },
  west: { id: 'west', open: false, label: 'Holding Pens' },
  east: { id: 'east', open: false, label: 'Smokehouse' },
  north: { id: 'north', open: false, label: 'Cold Storage' },
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

const slaughterHouse = {
  id: 'slaughterHouse',
  name: 'Slaughter House',
  blurb: 'Butcher yard & kill floor. Hooks, hanging dead, blood in the dirt.',
  worldBound: 14.5,
  theme: 'butcher',
  outdoor: true,
  zombieVariants: ['farmer', 'farmer', 'cow'],
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
    // Bloody yard
    { x: 0, z: -8.5, w: 15, d: 13, color: '#3a2820' },
    { x: 0, z: -9, w: 11, d: 8, color: '#4a2018', y: 0.014 },
    { x: 0, z: -6, w: 3.2, d: 10, color: '#5a2820', y: 0.018 },
    // Holding pens
    { x: -11.25, z: 3, w: 7.5, d: 22, color: '#32241c' },
    { x: -11.25, z: 4, w: 5.5, d: 14, color: '#3a2018', y: 0.015 },
    // Smokehouse
    { x: 11.25, z: 3, w: 7.5, d: 22, color: '#3a3028' },
    { x: 11.25, z: 4, w: 5, d: 14, color: '#2e241c', y: 0.015 },
    // Cold storage pad
    { x: 0, z: 13.25, w: 15, d: 5.5, color: '#3a3834' },
    { x: 0, z: 13.25, w: 5, d: 4, color: '#4a4844', y: 0.018 },
    // Kill floor interior stain
    { x: 0, z: 3.5, w: 10, d: 9, color: '#4a1818', y: 0.02 },
  ],
  LIGHTS: [
    { position: [-4, 3.0, -12], intensity: 0.65, distance: 10, color: '#a04028' },
    { position: [4, 3.0, -12], intensity: 0.65, distance: 10, color: '#a04028' },
    { position: [0, 3.2, -8], intensity: 0.5, distance: 9, color: '#802818' },
    { position: [-3.5, 3.8, -1.2], intensity: 0.9, distance: 9, color: '#c06030' },
    { position: [3.5, 3.8, -1.2], intensity: 0.9, distance: 9, color: '#c06030' },
    { position: [-11, 2.6, 3], intensity: 0.5, distance: 8, color: '#703020' },
    { position: [-11, 2.6, 8], intensity: 0.45, distance: 7, color: '#602818' },
    { position: [11, 2.6, 3], intensity: 0.55, distance: 8, color: '#904028' },
    { position: [11, 2.6, 8], intensity: 0.5, distance: 7, color: '#803828' },
    { position: [0, 4.2, 13], intensity: 1.0, distance: 12, color: '#d07040' },
    { position: [0, 3.6, 3.5], intensity: 0.85, distance: 10, color: '#e05030' },
  ],
  props: [
    // Kill floor shell
    { type: 'barn', position: [0, 0, 3.5] },
    // Meat hooks — zombies hanging by the feet
    { type: 'meatHook', position: [-2.8, 0, 2.2], yaw: 0.2 },
    { type: 'meatHook', position: [0.2, 0, 4.0], yaw: -0.15 },
    { type: 'meatHook', position: [2.6, 0, 2.8], yaw: 0.4 },
    { type: 'meatHook', position: [-1.5, 0, 5.5], yaw: Math.PI },
    { type: 'meatHook', position: [1.8, 0, 5.8], yaw: Math.PI + 0.3 },
    // Butcher blocks
    { type: 'butcherBlock', position: [-3.5, 0, -7.5], yaw: 0.2 },
    { type: 'butcherBlock', position: [3.8, 0, -8.2], yaw: -0.5 },
    { type: 'butcherBlock', position: [0, 0, 1.2], yaw: 0.1 },
    // Dead trees with hanging zombies
    { type: 'deadTree', position: [-5.5, 0, -10.5], yaw: 0.3 },
    { type: 'deadTree', position: [5.2, 0, -9.8], yaw: -0.6 },
    { type: 'deadTree', position: [-12, 0, 3.5], yaw: 0.8 },
    { type: 'deadTree', position: [-10.5, 0, 8.5], yaw: -0.4 },
    { type: 'deadTree', position: [11.5, 0, 2.0], yaw: 1.1 },
    { type: 'deadTree', position: [10.8, 0, 9.2], yaw: -0.9 },
    { type: 'deadTree', position: [-5.8, 0, 12.5], yaw: 0.2 },
    { type: 'deadTree', position: [4.5, 0, 13.2], yaw: -0.35 },
    // Blood stains
    { type: 'bloodPool', position: [-2, 0, -9], scale: 1.4 },
    { type: 'bloodPool', position: [3, 0, -7.5], scale: 1.1 },
    { type: 'bloodPool', position: [0.5, 0, 3.2], scale: 1.8 },
    { type: 'bloodPool', position: [-3, 0, 4.5], scale: 1.2 },
    { type: 'bloodPool', position: [11, 0, 5], scale: 0.9 },
    { type: 'bloodPool', position: [-11.5, 0, 6], scale: 1.0 },
    // Yard clutter
    { type: 'barrel', position: [2.5, 0, -10.5] },
    { type: 'barrel', position: [3.2, 0, -10.2] },
    { type: 'crate', position: [-4.2, 0.42, -11], color: 'plankDark' },
    { type: 'crate', position: [4.5, 0.42, -12], color: 'wood' },
    { type: 'dumpster', position: [-6, 0, -6.5], yaw: 0.4 },
    { type: 'rubble', position: [6, 0, -8] },
    { type: 'rubble', position: [-6.2, 0, -5.5] },
    { type: 'ammoCrate', position: [-2.5, 0, -7.2], yaw: 0.35 },
    // Holding pens
    { type: 'meatHook', position: [-11, 0, 1.5], yaw: 0.5 },
    { type: 'meatHook', position: [-12.2, 0, 6.5], yaw: -0.3 },
    { type: 'crate', position: [-10.5, 0.42, 5], color: 'wood' },
    { type: 'barrel', position: [-12.8, 0, -0.5] },
    // Smokehouse
    { type: 'shed', position: [11.5, 0, 5] },
    { type: 'meatHook', position: [10.2, 0, 1.2], yaw: Math.PI / 2 },
    { type: 'meatHook', position: [12.5, 0, 8.5], yaw: -Math.PI / 3 },
    { type: 'butcherBlock', position: [10.5, 0, 7.5], yaw: 0.6 },
    { type: 'crate', position: [12, 0.42, 8], color: 'plankDark' },
    // Cold storage
    { type: 'silo', position: [-3.2, 0, 13.8] },
    { type: 'meatHook', position: [2.5, 0, 12.8], yaw: 0.2 },
    { type: 'meatHook', position: [4.0, 0, 14.0], yaw: -0.5 },
    { type: 'crate', position: [2, 0.42, 14.5], color: 'wood' },
    { type: 'barrel', position: [-1, 0, 12.2] },
    // Dim hanging bulbs over the floor
    { type: 'hangingBulb', position: [0, 3.4, 3.5], intensity: 0.85, color: '#e06040' },
    { type: 'hangingBulb', position: [-2.5, 3.3, 5], intensity: 0.7, color: '#c05030' },
    { type: 'hangingBulb', position: [2.5, 3.3, 5], intensity: 0.7, color: '#c05030' },
    { type: 'streetLamp', position: [-5, 0, -11] },
    { type: 'streetLamp', position: [5, 0, -11] },
  ],
};

export default slaughterHouse;
