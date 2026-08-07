// Map units: 1 unit ≈ 1 meter. Classic bunker layout.

export const WALL_THICKNESS = 0.4;
export const WALL_HEIGHT = 3.8;
export const FLOOR_Y = 0;

const T = WALL_THICKNESS;
const WIN_W = 1.75; // window opening width

/** Axis-aligned wall boxes — leave explicit gaps where doors / windows sit */
export const WALLS = [
  // Outer shell — SOUTH (z=-14), gaps at x=-6 and x=6 (WIN_W=1.75)
  { x: -10.4375, z: -14, w: 7.125, d: T }, // -14 → -6.875
  { x: 0, z: -14, w: 10.25, d: T }, // -5.125 → 5.125
  { x: 10.4375, z: -14, w: 7.125, d: T }, // 6.875 → 14

  // Outer shell — NORTH (z=14), gaps at x=-4 and x=4
  { x: -9.4375, z: 14, w: 9.125, d: T }, // -14 → -4.875
  { x: 0, z: 14, w: 6.25, d: T }, // -3.125 → 3.125
  { x: 9.4375, z: 14, w: 9.125, d: T }, // 4.875 → 14

  // Outer shell — WEST (x=-14), gaps at z=1 and z=8
  { x: -14, z: -6.9375, w: T, d: 14.125 }, // -14 → 0.125
  { x: -14, z: 4.5, w: T, d: 5.25 }, // 1.875 → 7.125
  { x: -14, z: 11.4375, w: T, d: 5.125 }, // 8.875 → 14

  // Outer shell — EAST (x=14), gaps at z=1 and z=8
  { x: 14, z: -6.9375, w: T, d: 14.125 },
  { x: 14, z: 4.5, w: T, d: 5.25 },
  { x: 14, z: 11.4375, w: T, d: 5.125 },

  // Spawn room (south) — east/west walls, door gaps at z ≈ -2.75
  { x: -8, z: -9, w: T, d: 10 }, // z -14 → -4
  { x: 8, z: -9, w: T, d: 10 },
  // Spawn north divider (open hall through center)
  { x: -6, z: -4, w: 4, d: T },
  { x: 6, z: -4, w: 4, d: T },

  // West wing — continues north of door gap (gap z -4 → -1.5)
  { x: -8, z: 5.5, w: T, d: 14 }, // z -1.5 → 12.5
  { x: -11, z: 10, w: 6, d: T },

  // East wing
  { x: 8, z: 5.5, w: T, d: 14 },
  { x: 11, z: 10, w: 6, d: T },

  // North / command — wall at z=4 with center door gap (2.6 wide → edges ±1.3)
  { x: -6.15, z: 4, w: 9.7, d: T }, // x -11 → -1.3
  { x: 6.15, z: 4, w: 9.7, d: T }, // x 1.3 → 11
];

export const ROOMS = {
  spawn: { id: 'spawn', open: true, label: 'Spawn' },
  west: { id: 'west', open: false, label: 'West Wing' },
  east: { id: 'east', open: false, label: 'East Wing' },
  north: { id: 'north', open: false, label: 'Command' },
};

/**
 * Doors block openings until purchased.
 * collider: world-space AABB { w, d } on XZ (ignores visual rotation)
 */
export const DOORS = [
  // size = [openingWidth, height, thickness] — side doors use Y rot π/2
  {
    id: 'door_west',
    position: [-8, WALL_HEIGHT / 2, -2.75],
    size: [2.5, WALL_HEIGHT - 0.15, T + 0.12],
    collider: { w: T + 0.2, d: 2.55 },
    cost: 750,
    unlocks: ['west'],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    id: 'door_east',
    position: [8, WALL_HEIGHT / 2, -2.75],
    size: [2.5, WALL_HEIGHT - 0.15, T + 0.12],
    collider: { w: T + 0.2, d: 2.55 },
    cost: 1000,
    unlocks: ['east'],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    id: 'door_north',
    position: [0, WALL_HEIGHT / 2, 4],
    size: [2.6, WALL_HEIGHT - 0.15, T + 0.12],
    collider: { w: 2.7, d: T + 0.2 },
    cost: 1250,
    unlocks: ['north'],
    rotation: [0, 0, 0],
  },
];

/**
 * Entry windows — zombies tear boards then climb through.
 * facing: inward unit normal (into the playable room)
 * outside / inside: XZ positions for climb lerp
 * yaw: rotation so zombie faces into the room while climbing
 */
export const WINDOWS = [
  // Spawn — south wall
  {
    id: 'win_s1',
    room: 'spawn',
    position: [-6, 1.35, -14],
    facing: [0, 0, 1],
    yaw: 0,
    width: WIN_W,
    height: 1.85,
    sill: 0.5,
    rotation: [0, 0, 0],
    collider: { x: -6, z: -14, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: -6, z: -15.35 },
    inside: { x: -6, z: -12.7 },
  },
  {
    id: 'win_s2',
    room: 'spawn',
    position: [6, 1.35, -14],
    facing: [0, 0, 1],
    yaw: 0,
    width: WIN_W,
    height: 1.85,
    sill: 0.5,
    rotation: [0, 0, 0],
    collider: { x: 6, z: -14, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: 6, z: -15.35 },
    inside: { x: 6, z: -12.7 },
  },
  // West wing — west wall
  {
    id: 'win_w1',
    room: 'west',
    position: [-14, 1.35, 1],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    width: WIN_W,
    height: 1.85,
    sill: 0.5,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -14, z: 1, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: -15.35, z: 1 },
    inside: { x: -12.7, z: 1 },
  },
  {
    id: 'win_w2',
    room: 'west',
    position: [-14, 1.35, 8],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    width: WIN_W,
    height: 1.85,
    sill: 0.5,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -14, z: 8, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: -15.35, z: 8 },
    inside: { x: -12.7, z: 8 },
  },
  // East wing — east wall
  {
    id: 'win_e1',
    room: 'east',
    position: [14, 1.35, 1],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    width: WIN_W,
    height: 1.85,
    sill: 0.5,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 14, z: 1, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: 15.35, z: 1 },
    inside: { x: 12.7, z: 1 },
  },
  {
    id: 'win_e2',
    room: 'east',
    position: [14, 1.35, 8],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    width: WIN_W,
    height: 1.85,
    sill: 0.5,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 14, z: 8, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: 15.35, z: 8 },
    inside: { x: 12.7, z: 8 },
  },
  // North / command — north wall
  {
    id: 'win_n1',
    room: 'north',
    position: [-4, 1.35, 14],
    facing: [0, 0, -1],
    yaw: Math.PI,
    width: WIN_W,
    height: 1.85,
    sill: 0.5,
    rotation: [0, Math.PI, 0],
    collider: { x: -4, z: 14, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: -4, z: 15.35 },
    inside: { x: -4, z: 12.7 },
  },
  {
    id: 'win_n2',
    room: 'north',
    position: [4, 1.35, 14],
    facing: [0, 0, -1],
    yaw: Math.PI,
    width: WIN_W,
    height: 1.85,
    sill: 0.5,
    rotation: [0, Math.PI, 0],
    collider: { x: 4, z: 14, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: 4, z: 15.35 },
    inside: { x: 4, z: 12.7 },
  },
];

export const WALLBUYS = [
  {
    id: 'wb_m14',
    weaponId: 'm14',
    // South wall z=-14, T=0.4 → inner face z=-13.8
    position: [-2.5, 1.45, -13.8],
    rotation: [0, 0, 0],
    room: 'spawn',
  },
  {
    id: 'wb_mp5',
    weaponId: 'mp5',
    // West wall x=-14 → inner face x=-13.8
    position: [-13.8, 1.45, 3],
    rotation: [0, Math.PI / 2, 0],
    room: 'west',
  },
  {
    id: 'wb_olympia',
    weaponId: 'olympia',
    // East wall x=14 → inner face x=13.8
    position: [13.8, 1.45, 3],
    rotation: [0, -Math.PI / 2, 0],
    room: 'east',
  },
  {
    id: 'wb_sniper',
    weaponId: 'sniper',
    // North wall z=14 → inner face z=13.8
    position: [0, 1.45, 13.8],
    rotation: [0, Math.PI, 0],
    room: 'north',
  },
];

/** @deprecated Spawns now use WINDOWS — kept for reference / fallback */
export const SPAWN_POINTS = [
  { id: 'sp_s1', position: [-5, 0, -12], room: 'spawn' },
  { id: 'sp_s2', position: [5, 0, -12], room: 'spawn' },
  { id: 'sp_w1', position: [-12, 0, 0], room: 'west' },
  { id: 'sp_w2', position: [-12, 0, 7], room: 'west' },
  { id: 'sp_e1', position: [12, 0, 0], room: 'east' },
  { id: 'sp_e2', position: [12, 0, 7], room: 'east' },
  { id: 'sp_n1', position: [-4, 0, 12], room: 'north' },
  { id: 'sp_n2', position: [4, 0, 12], room: 'north' },
  { id: 'sp_n3', position: [0, 0, 11], room: 'north' },
];

export const PLAYER_SPAWN = { x: 0, y: 0, z: -10 };

export const FLOORS = [
  { x: 0, z: -9, w: 16, d: 10, color: '#3a3832' },
  { x: 0, z: -9, w: 8, d: 6, color: '#454238', y: 0.016 },
  { x: 0, z: 0, w: 16, d: 8, color: '#2f2e2a' },
  { x: 0, z: 0, w: 4, d: 8, color: '#3a3830', y: 0.015 },
  { x: -11, z: 3, w: 6, d: 18, color: '#35332e' },
  { x: 11, z: 3, w: 6, d: 18, color: '#35332e' },
  { x: 0, z: 9, w: 16, d: 10, color: '#2c2b27' },
  { x: 0, z: 10, w: 6, d: 5, color: '#38362e', y: 0.016 },
];

/** Ceiling point lights — dim candle pools */
export const LIGHTS = [
  { position: [0, 3.2, -9], intensity: 1.2, distance: 12, color: '#c4782a' },
  { position: [-5, 3.2, -12], intensity: 0.55, distance: 8, color: '#8a5020' },
  { position: [5, 3.2, -12], intensity: 0.55, distance: 8, color: '#8a5020' },
  { position: [0, 3.2, 0], intensity: 0.85, distance: 10, color: '#a06030' },
  { position: [-4, 3.2, -2], intensity: 0.45, distance: 7, color: '#6a4020' },
  { position: [4, 3.2, -2], intensity: 0.45, distance: 7, color: '#6a4020' },
  { position: [-10, 3.2, 2], intensity: 0.75, distance: 10, color: '#a06030' },
  { position: [-11, 3.2, 8], intensity: 0.55, distance: 8, color: '#8a5020' },
  { position: [-11, 3.2, -1], intensity: 0.45, distance: 7, color: '#6a4020' },
  { position: [10, 3.2, 2], intensity: 0.75, distance: 10, color: '#a06030' },
  { position: [11, 3.2, 8], intensity: 0.55, distance: 8, color: '#8a5020' },
  { position: [11, 3.2, -1], intensity: 0.45, distance: 7, color: '#6a4020' },
  { position: [0, 3.2, 9], intensity: 0.95, distance: 11, color: '#a84828' },
  { position: [-5, 3.2, 12], intensity: 0.5, distance: 8, color: '#8a3820' },
  { position: [5, 3.2, 12], intensity: 0.5, distance: 8, color: '#8a3820' },
];

/** Mystery box — center hall */
export const MYSTERY_BOX = {
  id: 'mystery_box',
  position: [0, 0, -1.5],
  rotation: [0, 0, 0],
  room: 'spawn',
};
