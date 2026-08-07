/** Airfield outpost — two-story bunker, stairs from spawn. */

const T = 0.4;
const WIN_W = 1.7;
const STORY = 3.55; // floor-to-floor
const WALL_H = STORY; // default single-story segment height
const F2 = STORY; // second floor deck Y

/**
 * Top-down (ground):
 *
 *   N  ┌────┬──────────┬────┐
 *      │ W  │  stairs↑ │ E  │
 *      │HELP│          │HELP│
 *      ├────┤  SPAWN   ├────┤
 *      │    │          │    │
 *   S  └────┴──────────┴────┘  windows
 *
 * Upstairs = open from start (same room as spawn). Help rooms cost points.
 */

const WALLS = [
  // ── Outer shell — GROUND story (gaps = exactly WIN_W at window centers) ──
  // SOUTH z=-11, gaps at x=±4.5 (WIN_W=1.7 → ±0.85)
  { x: -7.175, z: -11, w: 3.65, d: T, y: 0, h: STORY }, // -9 → -5.35
  { x: 0, z: -11, w: 7.3, d: T, y: 0, h: STORY }, // -3.65 → 3.65
  { x: 7.175, z: -11, w: 3.65, d: T, y: 0, h: STORY }, // 5.35 → 9

  // NORTH z=7 — solid on ground (windows are upstairs only)
  { x: 0, z: 7, w: 18, d: T, y: 0, h: STORY }, // -9 → 9

  // WEST x=-9, gaps at z=-2 and z=3
  { x: -9, z: -6.925, w: T, d: 8.15, y: 0, h: STORY }, // -11 → -2.85
  { x: -9, z: 0.5, w: T, d: 3.3, y: 0, h: STORY }, // -1.15 → 2.15
  { x: -9, z: 5.425, w: T, d: 3.15, y: 0, h: STORY }, // 3.85 → 7

  // EAST x=9
  { x: 9, z: -6.925, w: T, d: 8.15, y: 0, h: STORY },
  { x: 9, z: 0.5, w: T, d: 3.3, y: 0, h: STORY },
  { x: 9, z: 5.425, w: T, d: 3.15, y: 0, h: STORY },

  // ── Outer shell — UPPER story ─────────────────────────────────
  // SOUTH z=-11, gap at x=0 (WIN_W)
  { x: -4.925, z: -11, w: 8.15, d: T, y: F2, h: WALL_H }, // -9 → -0.85
  { x: 4.925, z: -11, w: 8.15, d: T, y: F2, h: WALL_H }, // 0.85 → 9

  // NORTH z=7, gaps at x=±3.5
  { x: -6.675, z: 7, w: 4.65, d: T, y: F2, h: WALL_H }, // -9 → -4.35
  { x: 0, z: 7, w: 5.3, d: T, y: F2, h: WALL_H }, // -2.65 → 2.65
  { x: 6.675, z: 7, w: 4.65, d: T, y: F2, h: WALL_H }, // 4.35 → 9

  // WEST x=-9, gap at z=2
  { x: -9, z: -4.925, w: T, d: 12.15, y: F2, h: WALL_H }, // -11 → 1.15
  { x: -9, z: 4.925, w: T, d: 4.15, y: F2, h: WALL_H }, // 2.85 → 7

  // EAST x=9, gap at z=2
  { x: 9, z: -4.925, w: T, d: 12.15, y: F2, h: WALL_H },
  { x: 9, z: 4.925, w: T, d: 4.15, y: F2, h: WALL_H },

  // ── Interior dividers (ground) ────────────────────────────────
  // Spawn | West: x=-5, door gap z∈(-7.05,-3.95) ≈3.1 around -5.5
  { x: -5, z: -9.025, w: T, d: 3.95, y: 0, h: STORY }, // -11 → -7.05
  { x: -5, z: -0.875, w: T, d: 6.15, y: 0, h: STORY }, // -3.95 → 2.2
  { x: -5, z: 4.6, w: T, d: 4.8, y: 0, h: STORY }, // 2.2 → 7

  // Spawn | East: x=5
  { x: 5, z: -9.025, w: T, d: 3.95, y: 0, h: STORY },
  { x: 5, z: -0.875, w: T, d: 6.15, y: 0, h: STORY },
  { x: 5, z: 4.6, w: T, d: 4.8, y: 0, h: STORY },

  // Spawn north stub walls flanking stairs (z=-1), gap x∈(-2.0,2.0)
  { x: -3.5, z: -1, w: 3.0, d: T, y: 0, h: STORY }, // -5 → -2.0
  { x: 3.5, z: -1, w: 3.0, d: T, y: 0, h: STORY }, // 2.0 → 5

  // West help back wall bits
  { x: -7, z: 2, w: 4.0, d: T, y: 0, h: STORY },
  // East help back wall bits
  { x: 7, z: 2, w: 4.0, d: T, y: 0, h: STORY },

];

const ROOMS = {
  spawn: { id: 'spawn', open: true, label: 'Starting Room' },
  west: { id: 'west', open: false, label: 'Help Room' },
  east: { id: 'east', open: false, label: 'Help Room' },
};

const DOORS = [
  {
    id: 'door_west',
    position: [-5, WALL_H / 2, -5.5],
    size: [3.05, WALL_H - 0.12, T + 0.18],
    collider: { w: T + 0.35, d: 3.1 },
    cost: 750,
    unlocks: ['west'],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    id: 'door_east',
    position: [5, WALL_H / 2, -5.5],
    size: [3.05, WALL_H - 0.12, T + 0.18],
    collider: { w: T + 0.35, d: 3.1 },
    cost: 1000,
    unlocks: ['east'],
    rotation: [0, Math.PI / 2, 0],
  },
];

function win(partial) {
  return {
    width: WIN_W,
    height: 1.8,
    sill: 0.55,
    floorY: 0,
    ...partial,
  };
}

const WINDOWS = [
  // Spawn — south ground
  win({
    id: 'win_s1',
    room: 'spawn',
    position: [-4.5, 1.4, -11],
    facing: [0, 0, 1],
    yaw: 0,
    rotation: [0, 0, 0],
    collider: { x: -4.5, z: -11, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: -4.5, z: -12.35 },
    inside: { x: -4.5, z: -9.7 },
  }),
  win({
    id: 'win_s2',
    room: 'spawn',
    position: [4.5, 1.4, -11],
    facing: [0, 0, 1],
    yaw: 0,
    rotation: [0, 0, 0],
    collider: { x: 4.5, z: -11, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: 4.5, z: -12.35 },
    inside: { x: 4.5, z: -9.7 },
  }),

  // West help
  win({
    id: 'win_w1',
    room: 'west',
    position: [-9, 1.4, -2],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -9, z: -2, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: -10.35, z: -2 },
    inside: { x: -7.7, z: -2 },
  }),
  win({
    id: 'win_w2',
    room: 'west',
    position: [-9, 1.4, 3],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -9, z: 3, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: -10.35, z: 3 },
    inside: { x: -7.7, z: 3 },
  }),

  // East help
  win({
    id: 'win_e1',
    room: 'east',
    position: [9, 1.4, -2],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 9, z: -2, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: 10.35, z: -2 },
    inside: { x: 7.7, z: -2 },
  }),
  win({
    id: 'win_e2',
    room: 'east',
    position: [9, 1.4, 3],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 9, z: 3, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: 10.35, z: 3 },
    inside: { x: 7.7, z: 3 },
  }),

  // Upstairs — open from start (spawn room)
  win({
    id: 'win_u_s',
    room: 'spawn',
    floorY: F2,
    position: [0, F2 + 1.4, -11],
    facing: [0, 0, 1],
    yaw: 0,
    rotation: [0, 0, 0],
    collider: { x: 0, z: -11, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: 0, z: -12.35 },
    inside: { x: 0, z: -9.7 },
  }),
  win({
    id: 'win_u_w',
    room: 'spawn',
    floorY: F2,
    position: [-9, F2 + 1.4, 2],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -9, z: 2, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: -10.35, z: 2 },
    inside: { x: -7.7, z: 2 },
  }),
  win({
    id: 'win_u_e',
    room: 'spawn',
    floorY: F2,
    position: [9, F2 + 1.4, 2],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 9, z: 2, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: 10.35, z: 2 },
    inside: { x: 7.7, z: 2 },
  }),
  win({
    id: 'win_u_n1',
    room: 'spawn',
    floorY: F2,
    position: [-3.5, F2 + 1.4, 7],
    facing: [0, 0, -1],
    yaw: Math.PI,
    rotation: [0, Math.PI, 0],
    collider: { x: -3.5, z: 7, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: -3.5, z: 8.35 },
    inside: { x: -3.5, z: 5.7 },
  }),
  win({
    id: 'win_u_n2',
    room: 'spawn',
    floorY: F2,
    position: [3.5, F2 + 1.4, 7],
    facing: [0, 0, -1],
    yaw: Math.PI,
    rotation: [0, Math.PI, 0],
    collider: { x: 3.5, z: 7, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: 3.5, z: 8.35 },
    inside: { x: 3.5, z: 5.7 },
  }),
];

/** Climb north (+z): y0 → y1 */
const STAIRS = [
  {
    x: 0,
    z: 1.0,
    w: 3.2,
    d: 4.2,
    y0: 0,
    y1: F2,
    axis: 'z',
    dir: 1,
    steps: 12,
  },
];

/**
 * Upper walk decks — full solid plate (no stair hole).
 * Stairs still ramp up; once feet near F2 you snap onto this deck.
 * Overlaps walls slightly so seams never drop you through.
 */
const WALK_FLOORS = [
  { x: 0, z: -2, w: 18.2, d: 18.4, y: F2 }, // x ±9.1, z -11.2 → 7.2
];

const WALLBUYS = [
  {
    id: 'wb_m14',
    weaponId: 'm14',
    position: [-2.2, 1.45, -10.8],
    rotation: [0, 0, 0],
    room: 'spawn',
  },
  {
    id: 'wb_mp5',
    weaponId: 'mp5',
    position: [-8.8, 1.45, 0.5],
    rotation: [0, Math.PI / 2, 0],
    room: 'west',
  },
  {
    id: 'wb_olympia',
    weaponId: 'olympia',
    position: [8.8, 1.45, 0.5],
    rotation: [0, -Math.PI / 2, 0],
    room: 'east',
  },
  {
    id: 'wb_sniper',
    weaponId: 'sniper',
    position: [2.5, F2 + 1.45, -9.5],
    rotation: [0, 0, 0],
    room: 'spawn',
  },
];

const SPAWN_POINTS = [
  { id: 'sp_s1', position: [-4, 0, -9], room: 'spawn' },
  { id: 'sp_s2', position: [4, 0, -9], room: 'spawn' },
  { id: 'sp_u1', position: [0, F2, -8], room: 'spawn' },
  { id: 'sp_w1', position: [-7, 0, -2], room: 'west' },
  { id: 'sp_e1', position: [7, 0, -2], room: 'east' },
];

const PLAYER_SPAWN = { x: 0, y: 0, z: -8 };

const FLOORS = [
  // Full ground slab — no visual voids inside the shell
  { x: 0, z: -2, w: 18.2, d: 18.4, color: '#5a5044' },
  { x: 0, z: -6, w: 8, d: 8, color: '#6a5e4e', y: 0.016 },
  { x: -6.5, z: -1, w: 4.5, d: 12, color: '#524838', y: 0.014 },
  { x: 6.5, z: -1, w: 4.5, d: 12, color: '#524838', y: 0.014 },
  { x: 0, z: 3.5, w: 10, d: 6, color: '#4a4238', y: 0.014 },
  // Upper decks (visual + underside) — solid, no hole
  ...WALK_FLOORS.map((f) => ({
    ...f,
    color: '#5a5248',
    thick: 0.16,
  })),
  {
    x: 0,
    z: -6,
    w: 10,
    d: 8,
    y: F2 + 0.02,
    color: '#6a6054',
  },
];

const LIGHTS = [
  // Ground — bright enough for physically-correct point lights
  { position: [0, 2.6, -7], intensity: 4.5, distance: 14, color: '#e8a050' },
  { position: [-3.5, 2.6, -9], intensity: 2.8, distance: 10, color: '#c4782a' },
  { position: [3.5, 2.6, -9], intensity: 2.8, distance: 10, color: '#c4782a' },
  { position: [-7, 2.6, -2], intensity: 3.2, distance: 11, color: '#d48840' },
  { position: [7, 2.6, -2], intensity: 3.2, distance: 11, color: '#d48840' },
  { position: [0, 2.6, 1.5], intensity: 3.0, distance: 11, color: '#c4782a' },
  // Upstairs
  { position: [0, F2 + 2.4, -6], intensity: 4.2, distance: 14, color: '#e89840' },
  { position: [-5, F2 + 2.4, 2], intensity: 2.8, distance: 10, color: '#c46828' },
  { position: [5, F2 + 2.4, 2], intensity: 2.8, distance: 10, color: '#c46828' },
  { position: [0, F2 + 2.4, 4], intensity: 3.2, distance: 11, color: '#d48840' },
];

const nacht = {
  id: 'nacht',
  name: 'Airfield Outpost',
  blurb: 'Two-story bunker on the runway. Stairs from spawn; help rooms left & right.',
  worldBound: 11.5,
  theme: 'stone',
  outdoor: false,
  FLOOR_Y: 0,
  WALL_THICKNESS: T,
  WALL_HEIGHT: STORY * 2 + 0.1,
  STORY_HEIGHT: F2,
  WALLS,
  ROOMS,
  DOORS,
  WINDOWS,
  STAIRS,
  WALK_FLOORS,
  WALLBUYS,
  SPAWN_POINTS,
  PLAYER_SPAWN,
  FLOORS,
  LIGHTS,
  MYSTERY_BOX: {
    position: [0, F2, 4.5],
    rotation: [0, 0, 0],
  },
  props: [
    { type: 'crate', position: [2.8, 0.42, -7.5] },
    { type: 'crate', position: [2.8, 1.27, -7.5], color: 'wood' },
    { type: 'crate', position: [-3.2, 0.42, -8.2], color: 'wood' },
    { type: 'sandbags', position: [3.8, 0, -9.5], yaw: 0.1, count: 3 },
    { type: 'ammoCrate', position: [-4.2, 0, -9.8], yaw: -0.35 },
    { type: 'rubble', position: [2, 0, -4] },
    { type: 'rubble', position: [-2.5, 0, -5] },
    { type: 'crate', position: [-7.2, 0.42, -6], color: 'plankDark' },
    { type: 'sandbags', position: [7.5, 0, 0], yaw: Math.PI / 2, count: 3 },
    { type: 'cone', position: [1.5, 0, -3] },
    // Parkour climb — SE spawn up to F2 (alt to stairs)
    { type: 'platform', position: [3.5, 1.72, -9.0], size: [1.35, 0.16, 1.05] },
    { type: 'platform', position: [3.6, 2.55, -8.0], size: [1.25, 0.16, 1.05] },
    { type: 'platform', position: [3.7, 3.32, -6.9], size: [1.4, 0.16, 1.15] },
    // Upstairs
    { type: 'crate', position: [-4, F2 + 0.42, -5], color: 'wood' },
    { type: 'crate', position: [5, F2 + 0.42, 0], color: 'plankDark' },
    { type: 'crate', position: [5, F2 + 1.27, 0], color: 'wood' },
    { type: 'ammoCrate', position: [-6, F2, 4], yaw: 0.4 },
    { type: 'rubble', position: [3, F2, -3] },
    { type: 'sandbags', position: [1.5, F2, 3], count: 2 },
    // Interior clutter + hanging bulbs
    { type: 'ammoCrate', position: [0.8, 0, -9.2], yaw: 0.2 },
    { type: 'crate', position: [-7.5, 0.42, 0.5], color: 'wood' },
    { type: 'crate', position: [7.2, 0.42, -5.5], color: 'plankDark' },
    { type: 'hangingBulb', position: [0, 3.15, -7] },
    { type: 'hangingBulb', position: [-7, 3.15, -2], intensity: 0.9 },
    { type: 'hangingBulb', position: [7, 3.15, -2], intensity: 0.9 },
    { type: 'hangingBulb', position: [0, F2 + 3.0, -5], intensity: 1.0, color: '#e89840' },
  ],
};

export default nacht;
