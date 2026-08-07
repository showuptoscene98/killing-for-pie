/**
 * House — Siege-inspired suburban two-story.
 *
 * Layout (top-down, ground):
 *
 *   N  ┌──────────┬──────────┐  z=7
 *      │ Kitchen  │  Dining  │
 *      ├────┬─────┴──┬───────┤  z=2
 *      │Gar.│ Lobby  │Living │
 *      │    │stairs↓ │       │  (climb south into upper hall)
 *   S  └────┴────────┴───────┘  z=-6  ← front door
 *              FRONT YARD SPAWN
 *                    z=-11
 */

const T = 0.36;
const WIN_W = 1.65;
const STORY = 3.45;
const WALL_H = STORY;
const F2 = STORY;
const DOOR_H = 2.55;

function win(partial) {
  return {
    width: WIN_W,
    height: 1.55,
    sill: 0.85,
    floorY: 0,
    ...partial,
  };
}

const WALLS = [
  // ── Outer shell — GROUND ──────────────────────────────────────
  // SOUTH front z=-6 — door gap ±1.55, window gaps at ±4.2 (WIN_W)
  { x: -6.5125, z: -6, w: 2.975, d: T, y: 0, h: STORY }, // -8 → -5.025
  { x: -2.4625, z: -6, w: 1.825, d: T, y: 0, h: STORY }, // -3.375 → -1.55
  { x: 2.4625, z: -6, w: 1.825, d: T, y: 0, h: STORY }, // 1.55 → 3.375
  { x: 6.5125, z: -6, w: 2.975, d: T, y: 0, h: STORY }, // 5.025 → 8

  // NORTH back z=7 — window gaps at x=±4 (WIN_W=1.65 → ±0.825)
  { x: -6.4125, z: 7, w: 3.175, d: T, y: 0, h: STORY }, // -8 → -4.825
  { x: 0, z: 7, w: 6.35, d: T, y: 0, h: STORY }, // -3.175 → 3.175
  { x: 6.4125, z: 7, w: 3.175, d: T, y: 0, h: STORY }, // 4.825 → 8

  // WEST x=-8 — garage win z=-2, kitchen win z=4.5 (each WIN_W)
  { x: -8, z: -4.4125, w: T, d: 3.175, y: 0, h: STORY }, // -6 → -2.825
  { x: -8, z: 1.25, w: T, d: 4.85, y: 0, h: STORY }, // -1.175 → 3.675
  { x: -8, z: 6.1625, w: T, d: 1.675, y: 0, h: STORY }, // 5.325 → 7

  // EAST x=8 — living win z=-2, dining win z=4.5
  { x: 8, z: -4.4125, w: T, d: 3.175, y: 0, h: STORY },
  { x: 8, z: 1.25, w: T, d: 4.85, y: 0, h: STORY },
  { x: 8, z: 6.1625, w: T, d: 1.675, y: 0, h: STORY },

  // ── Outer shell — UPPER ───────────────────────────────────────
  // SOUTH — hall windows at x=±4 (center solid)
  { x: -6.4125, z: -6, w: 3.175, d: T, y: F2, h: WALL_H }, // -8 → -4.825
  { x: 0, z: -6, w: 6.35, d: T, y: F2, h: WALL_H }, // -3.175 → 3.175
  { x: 6.4125, z: -6, w: 3.175, d: T, y: F2, h: WALL_H }, // 4.825 → 8

  // NORTH — windows at x=±4
  { x: -6.4125, z: 7, w: 3.175, d: T, y: F2, h: WALL_H },
  { x: 0, z: 7, w: 6.35, d: T, y: F2, h: WALL_H },
  { x: 6.4125, z: 7, w: 3.175, d: T, y: F2, h: WALL_H },

  // WEST / EAST upper — kids/master window gaps at z=4.5 (WIN_W)
  { x: -8, z: -1.1625, w: T, d: 9.675, y: F2, h: WALL_H }, // -6 → 3.675
  { x: -8, z: 6.1625, w: T, d: 1.675, y: F2, h: WALL_H }, // 5.325 → 7
  { x: 8, z: -1.1625, w: T, d: 9.675, y: F2, h: WALL_H },
  { x: 8, z: 6.1625, w: T, d: 1.675, y: F2, h: WALL_H },

  // ── Interior dividers — GROUND ────────────────────────────────
  // Lobby | Garage x=-3 — door gap centered z=-2.2 (opening 3.0)
  { x: -3, z: -4.85, w: T, d: 2.3, y: 0, h: STORY }, // -6 → -3.7
  { x: -3, z: 0.65, w: T, d: 2.7, y: 0, h: STORY }, // -0.7 → 2

  // Lobby | Living x=3 — door gap z=-2.2
  { x: 3, z: -4.85, w: T, d: 2.3, y: 0, h: STORY },
  { x: 3, z: 0.65, w: T, d: 2.7, y: 0, h: STORY },

  // Lobby | Kitchen/Dining z=2 — door gaps centered ±4.5 (3.0 wide)
  { x: -7.0, z: 2, w: 2.0, d: T, y: 0, h: STORY }, // -8 → -6
  { x: 0, z: 2, w: 6.0, d: T, y: 0, h: STORY }, // -3 → 3
  { x: 7.0, z: 2, w: 2.0, d: T, y: 0, h: STORY }, // 6 → 8

  // Kitchen | Dining x=0 — solid (buy each room separately)
  { x: 0, z: 4.5, w: T, d: 5.0, y: 0, h: STORY }, // 2 → 7

  // ── Interior dividers — UPPER (hall south; bedrooms north) ─
  // Same door gaps as ground (±4.5) — center stays solid (stairs exit south into hall)
  { x: -7.0, z: 2, w: 2.0, d: T, y: F2, h: WALL_H },
  { x: 0, z: 2, w: 6.0, d: T, y: F2, h: WALL_H },
  { x: 7.0, z: 2, w: 2.0, d: T, y: F2, h: WALL_H },

  // Kids | Master x=0 upstairs north — solid
  { x: 0, z: 4.5, w: T, d: 5.0, y: F2, h: WALL_H },

  // Stair hole railings — sides + north lip (south open = hall exit)
  { x: -1.7, z: 0.2, w: T, d: 3.6, y: F2, h: 1.05 },
  { x: 1.7, z: 0.2, w: T, d: 3.6, y: F2, h: 1.05 },
  { x: 0, z: 2.05, w: 3.05, d: T, y: F2, h: 1.05 },
];

const ROOMS = {
  spawn: { id: 'spawn', open: true, label: 'Front Yard' },
  lobby: { id: 'lobby', open: false, label: 'Lobby' },
  living: { id: 'living', open: false, label: 'Living Room' },
  garage: { id: 'garage', open: false, label: 'Garage' },
  kitchen: { id: 'kitchen', open: false, label: 'Kitchen' },
  dining: { id: 'dining', open: false, label: 'Dining Room' },
  kids: { id: 'kids', open: false, label: "Kid's Bedroom" },
  master: { id: 'master', open: false, label: 'Master Bedroom' },
};

const DOORS = [
  {
    id: 'door_front',
    position: [0, DOOR_H / 2, -6],
    size: [3.05, DOOR_H, T + 0.2],
    collider: { w: 3.1, d: T + 0.4 },
    cost: 750,
    unlocks: ['lobby'],
    rotation: [0, 0, 0],
  },
  {
    id: 'door_garage',
    position: [-3, DOOR_H / 2, -2.2],
    size: [2.95, DOOR_H, T + 0.2],
    collider: { w: T + 0.4, d: 3.0 },
    cost: 1000,
    unlocks: ['garage'],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    id: 'door_living',
    position: [3, DOOR_H / 2, -2.2],
    size: [2.95, DOOR_H, T + 0.2],
    collider: { w: T + 0.4, d: 3.0 },
    cost: 1000,
    unlocks: ['living'],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    id: 'door_kitchen',
    position: [-4.5, DOOR_H / 2, 2],
    size: [2.95, DOOR_H, T + 0.2],
    collider: { w: 3.0, d: T + 0.4 },
    cost: 1250,
    unlocks: ['kitchen'],
    rotation: [0, 0, 0],
  },
  {
    id: 'door_dining',
    position: [4.5, DOOR_H / 2, 2],
    size: [2.95, DOOR_H, T + 0.2],
    collider: { w: 3.0, d: T + 0.4 },
    cost: 1250,
    unlocks: ['dining'],
    rotation: [0, 0, 0],
  },
  {
    id: 'door_kids',
    position: [-4.5, F2 + DOOR_H / 2, 2],
    size: [2.95, DOOR_H, T + 0.2],
    collider: { w: 3.0, d: T + 0.4 },
    cost: 1500,
    unlocks: ['kids'],
    rotation: [0, 0, 0],
  },
  {
    id: 'door_master',
    position: [4.5, F2 + DOOR_H / 2, 2],
    size: [2.95, DOOR_H, T + 0.2],
    collider: { w: 3.0, d: T + 0.4 },
    cost: 1500,
    unlocks: ['master'],
    rotation: [0, 0, 0],
  },
];

const WINDOWS = [
  // Front yard / porch — ground (spawn-side zombie pressure)
  win({
    id: 'win_front_l',
    room: 'lobby',
    position: [-4.2, 1.55, -6],
    facing: [0, 0, 1],
    yaw: 0,
    rotation: [0, 0, 0],
    collider: { x: -4.2, z: -6, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: -4.2, z: -7.4 },
    inside: { x: -4.2, z: -4.7 },
  }),
  win({
    id: 'win_front_r',
    room: 'lobby',
    position: [4.2, 1.55, -6],
    facing: [0, 0, 1],
    yaw: 0,
    rotation: [0, 0, 0],
    collider: { x: 4.2, z: -6, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: 4.2, z: -7.4 },
    inside: { x: 4.2, z: -4.7 },
  }),

  // Garage west
  win({
    id: 'win_garage',
    room: 'garage',
    position: [-8, 1.55, -2],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -8, z: -2, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: -9.4, z: -2 },
    inside: { x: -6.7, z: -2 },
  }),

  // Living east
  win({
    id: 'win_living',
    room: 'living',
    position: [8, 1.55, -2],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 8, z: -2, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: 9.4, z: -2 },
    inside: { x: 6.7, z: -2 },
  }),

  // Kitchen west + north
  win({
    id: 'win_kitchen_w',
    room: 'kitchen',
    position: [-8, 1.55, 4.5],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -8, z: 4.5, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: -9.4, z: 4.5 },
    inside: { x: -6.7, z: 4.5 },
  }),
  win({
    id: 'win_kitchen_n',
    room: 'kitchen',
    position: [-4, 1.55, 7],
    facing: [0, 0, -1],
    yaw: Math.PI,
    rotation: [0, Math.PI, 0],
    collider: { x: -4, z: 7, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: -4, z: 8.4 },
    inside: { x: -4, z: 5.7 },
  }),

  // Dining east + north
  win({
    id: 'win_dining_e',
    room: 'dining',
    position: [8, 1.55, 4.5],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 8, z: 4.5, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: 9.4, z: 4.5 },
    inside: { x: 6.7, z: 4.5 },
  }),
  win({
    id: 'win_dining_n',
    room: 'dining',
    position: [4, 1.55, 7],
    facing: [0, 0, -1],
    yaw: Math.PI,
    rotation: [0, Math.PI, 0],
    collider: { x: 4, z: 7, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: 4, z: 8.4 },
    inside: { x: 4, z: 5.7 },
  }),

  // Upstairs — upper hall (lobby) south windows
  win({
    id: 'win_hall_s_l',
    room: 'lobby',
    floorY: F2,
    position: [-4, F2 + 1.55, -6],
    facing: [0, 0, 1],
    yaw: 0,
    rotation: [0, 0, 0],
    collider: { x: -4, z: -6, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: -4, z: -7.4 },
    inside: { x: -4, z: -4.7 },
  }),
  win({
    id: 'win_hall_s_r',
    room: 'lobby',
    floorY: F2,
    position: [4, F2 + 1.55, -6],
    facing: [0, 0, 1],
    yaw: 0,
    rotation: [0, 0, 0],
    collider: { x: 4, z: -6, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: 4, z: -7.4 },
    inside: { x: 4, z: -4.7 },
  }),

  // Upstairs — kids (NW)
  win({
    id: 'win_kids_w',
    room: 'kids',
    floorY: F2,
    position: [-8, F2 + 1.55, 4.5],
    facing: [1, 0, 0],
    yaw: Math.PI / 2,
    rotation: [0, Math.PI / 2, 0],
    collider: { x: -8, z: 4.5, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: -9.4, z: 4.5 },
    inside: { x: -6.7, z: 4.5 },
  }),
  win({
    id: 'win_kids_n',
    room: 'kids',
    floorY: F2,
    position: [-4, F2 + 1.55, 7],
    facing: [0, 0, -1],
    yaw: Math.PI,
    rotation: [0, Math.PI, 0],
    collider: { x: -4, z: 7, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: -4, z: 8.4 },
    inside: { x: -4, z: 5.7 },
  }),

  // Upstairs — master (NE)
  win({
    id: 'win_master_e',
    room: 'master',
    floorY: F2,
    position: [8, F2 + 1.55, 4.5],
    facing: [-1, 0, 0],
    yaw: -Math.PI / 2,
    rotation: [0, -Math.PI / 2, 0],
    collider: { x: 8, z: 4.5, w: T + 0.25, d: WIN_W + 0.1 },
    outside: { x: 9.4, z: 4.5 },
    inside: { x: 6.7, z: 4.5 },
  }),
  win({
    id: 'win_master_n',
    room: 'master',
    floorY: F2,
    position: [4, F2 + 1.55, 7],
    facing: [0, 0, -1],
    yaw: Math.PI,
    rotation: [0, Math.PI, 0],
    collider: { x: 4, z: 7, w: WIN_W + 0.1, d: T + 0.25 },
    outside: { x: 4, z: 8.4 },
    inside: { x: 4, z: 5.7 },
  }),
];

/**
 * Climb south (−z): bottom near kitchen divider, top exits into upper hall.
 * (Climbing +z used to dump you into the solid bedroom wall at z=2.)
 */
const STAIRS = [
  {
    x: 0,
    z: 0.2,
    w: 3.0,
    d: 3.8, // z ∈ [-1.7, 2.1]
    y0: 0,
    y1: F2,
    axis: 'z',
    dir: -1,
    steps: 11,
  },
];

/**
 * Upper decks — hole over stairs x∈[-1.55,1.55], z∈[-1.7,2.1]
 * Decks kiss stair lips so you never drop through.
 */
const WALK_FLOORS = [
  // South of hole → upper hall (kiss stair south lip z=-1.7)
  { x: 0, z: -3.85, w: 15.9, d: 4.3, y: F2 }, // z -6 → -1.7
  // North of hole → bedroom decks (kiss stair north lip z=2.1)
  { x: 0, z: 4.55, w: 15.9, d: 5.1, y: F2 }, // z 2.0 → 7.1
  // West / east of hole (overlap south/north seams)
  { x: -5.0, z: 0.2, w: 6.9, d: 4.05, y: F2 }, // x -8.45 → -1.55, z -1.825 → 2.225
  { x: 5.0, z: 0.2, w: 6.9, d: 4.05, y: F2 },
];

const WALLBUYS = [
  {
    id: 'wb_m14',
    weaponId: 'm14',
    position: [-2.4, 1.4, -5.75],
    rotation: [0, 0, 0],
    room: 'lobby',
  },
  {
    id: 'wb_mp5',
    weaponId: 'mp5',
    position: [5.5, 1.4, -5.75],
    rotation: [0, 0, 0],
    room: 'living',
  },
  {
    id: 'wb_olympia',
    weaponId: 'olympia',
    position: [-7.75, 1.4, 0.5],
    rotation: [0, Math.PI / 2, 0],
    room: 'garage',
  },
  {
    id: 'wb_m14_kit',
    weaponId: 'm14',
    position: [-5.5, 1.4, 6.75],
    rotation: [0, Math.PI, 0],
    room: 'kitchen',
  },
  {
    id: 'wb_sniper',
    weaponId: 'sniper',
    position: [5.5, F2 + 1.4, 6.75],
    rotation: [0, Math.PI, 0],
    room: 'master',
  },
];

const SPAWN_POINTS = [
  { id: 'sp_yard1', position: [-3, 0, -9], room: 'spawn' },
  { id: 'sp_yard2', position: [3, 0, -9], room: 'spawn' },
  { id: 'sp_lobby', position: [0, 0, -4], room: 'lobby' },
  { id: 'sp_living', position: [5.5, 0, -3], room: 'living' },
  { id: 'sp_garage', position: [-5.5, 0, -3], room: 'garage' },
  { id: 'sp_kitchen', position: [-4, 0, 4.5], room: 'kitchen' },
  { id: 'sp_dining', position: [4, 0, 4.5], room: 'dining' },
  { id: 'sp_kids', position: [-4, F2, 4.5], room: 'kids' },
  { id: 'sp_master', position: [4, F2, 4.5], room: 'master' },
  { id: 'sp_hall', position: [0, F2, -3.5], room: 'lobby' },
];

const PLAYER_SPAWN = { x: 0, y: 0, z: -10 };

const FLOORS = [
  // Front yard grass / driveway
  { x: 0, z: -9.2, w: 20, d: 6.5, color: '#3a4830' },
  { x: 0, z: -8.5, w: 4.2, d: 5.0, color: '#4a4640', y: 0.014 }, // driveway
  // Ground interior
  { x: 0, z: -2, w: 6, d: 8, color: '#6a5e52' }, // lobby hardwood
  { x: -5.5, z: -2, w: 5, d: 8, color: '#4a4840' }, // garage concrete
  { x: 5.5, z: -2, w: 5, d: 8, color: '#5a5044' }, // living carpet
  { x: -4, z: 4.5, w: 8, d: 5, color: '#5a5248' }, // kitchen tile
  { x: 4, z: 4.5, w: 8, d: 5, color: '#6a5e52' }, // dining
  // Upper decks
  ...WALK_FLOORS.map((f) => ({
    ...f,
    color: '#5c5348',
    thick: 0.14,
  })),
  { x: -4, z: 4.5, w: 7.5, d: 4.6, y: F2 + 0.02, color: '#7a5a68' }, // kids pink tint
  { x: 4, z: 4.5, w: 7.5, d: 4.6, y: F2 + 0.02, color: '#5a5248' }, // master
  { x: 0, z: -3.5, w: 5.8, d: 4.5, y: F2 + 0.02, color: '#6a6054' }, // upper hall
  // Roof plate
  { x: 0, z: 0.5, w: 16.4, d: 13.4, y: F2 + WALL_H + 0.08, color: '#3a342c', thick: 0.18 },
];

const LIGHTS = [
  // Yard
  { position: [0, 3.2, -9], intensity: 3.2, distance: 12, color: '#c8b070' },
  { position: [-5, 2.8, -8], intensity: 1.8, distance: 8, color: '#a88840' },
  { position: [5, 2.8, -8], intensity: 1.8, distance: 8, color: '#a88840' },
  // Ground interior
  { position: [0, 2.7, -3], intensity: 4.0, distance: 11, color: '#e8c080' },
  { position: [-5.5, 2.5, -2], intensity: 2.6, distance: 9, color: '#c4782a' },
  { position: [5.5, 2.5, -2], intensity: 3.0, distance: 9, color: '#e0a860' },
  { position: [-4, 2.6, 4.5], intensity: 3.2, distance: 10, color: '#d48840' },
  { position: [4, 2.6, 4.5], intensity: 3.2, distance: 10, color: '#d48840' },
  // Upstairs
  { position: [0, F2 + 2.4, -3], intensity: 3.5, distance: 11, color: '#e8b868' },
  { position: [-4, F2 + 2.4, 4.5], intensity: 3.0, distance: 10, color: '#e898a0' },
  { position: [4, F2 + 2.4, 4.5], intensity: 3.2, distance: 10, color: '#e0a860' },
];

const house = {
  id: 'house',
  name: 'House',
  blurb: 'Suburban two-story. Yard breach, lobby stairs, garage & bedrooms — Siege vibes.',
  worldBound: 13,
  theme: 'suburb',
  outdoor: true,
  FLOOR_Y: 0,
  WALL_THICKNESS: T,
  WALL_HEIGHT: STORY * 2 + 0.15,
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
    position: [0, F2, -3.8],
    rotation: [0, 0, 0],
  },
  props: [
    // Yard
    { type: 'crate', position: [-6.5, 0.42, -9.5], color: 'wood' },
    { type: 'crate', position: [6.2, 0.42, -9.2], color: 'plankDark' },
    { type: 'cone', position: [2.2, 0, -8.5] },
    { type: 'dumpster', position: [-7.5, 0, -7.2], yaw: 0.2 },
    // Lobby
    { type: 'crate', position: [2.0, 0.42, -4.5], color: 'plankDark' },
    { type: 'crate', position: [-2.2, 0.42, -4.8], color: 'wood' },
    // Garage clutter
    { type: 'crate', position: [-6.5, 0.42, -4.5], color: 'wood' },
    { type: 'crate', position: [-6.5, 1.27, -4.5], color: 'plankDark' },
    { type: 'rubble', position: [-5.2, 0, 0.5] },
    { type: 'rubble', position: [-6.8, 0, -0.5] },
    // Living
    { type: 'crate', position: [6.2, 0.42, -4.2], color: 'wood' },
    { type: 'crate', position: [5.4, 0.42, 0.2], color: 'plankDark' },
    { type: 'crate', position: [6.8, 0.42, -0.8], color: 'wood' },
    // Kitchen / dining
    { type: 'crate', position: [-6.5, 0.42, 5.5], color: 'wood' },
    { type: 'crate', position: [-2.2, 0.42, 5.8], color: 'plankDark' },
    { type: 'crate', position: [6.2, 0.42, 5.2], color: 'plankDark' },
    // Parkour porch → lobby window ledge
    { type: 'platform', position: [-4.2, 0.85, -7.1], size: [1.4, 0.14, 0.9] },
    { type: 'platform', position: [4.2, 0.85, -7.1], size: [1.4, 0.14, 0.9] },
    // Upstairs kids / master
    { type: 'crate', position: [-6, F2 + 0.42, 5.2], color: 'wood' },
    { type: 'crate', position: [-5.5, F2 + 0.42, -4], color: 'plankDark' },
    { type: 'crate', position: [6.2, F2 + 0.42, 5.5], color: 'wood' },
    { type: 'crate', position: [5.8, F2 + 0.42, -4], color: 'wood' },
    { type: 'crate', position: [5.8, F2 + 1.27, -4], color: 'plankDark' },
    { type: 'rubble', position: [1.2, F2, -4.2] },
    // More clutter + lights
    { type: 'ammoCrate', position: [-1.5, 0, -5], yaw: -0.3 },
    { type: 'crate', position: [1.8, 0.42, 5.5], color: 'wood' },
    { type: 'rubble', position: [-1.2, 0, 0.8] },
    { type: 'streetLamp', position: [-3.5, 0, -10.5] },
    { type: 'streetLamp', position: [3.5, 0, -10.5] },
    { type: 'hangingBulb', position: [0, 3.2, -3], intensity: 1.0 },
    { type: 'hangingBulb', position: [-5.5, 3.1, -2], intensity: 0.85 },
    { type: 'hangingBulb', position: [5.5, 3.1, -2], intensity: 0.85 },
    { type: 'hangingBulb', position: [0, F2 + 3.0, -3], intensity: 0.95, color: '#e8b868' },
  ],
};

export default house;
