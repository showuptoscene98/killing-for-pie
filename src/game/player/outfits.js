/** Modular outfit system — mix body, head, face, hands, extras */

export const OUTFIT_COLORS = [
  { id: 'default', name: 'Default' },
  { id: 'grey', name: 'Grey' },
  { id: 'pink', name: 'Pink' },
];

export const OUTFIT_GENDERS = [
  { id: 'male', name: 'Male' },
  { id: 'female', name: 'Female' },
];

export const DEFAULT_OUTFIT_ID = 'chef';
export const DEFAULT_OUTFIT_COLOR = 'default';
export const DEFAULT_OUTFIT_GENDER = 'male';

const BASE = {
  chef: {
    id: 'chef',
    name: 'Chef',
    desc: 'Kitchen whites.',
    sleeve: '#f2f0e8',
    glove: '#e8e4d8',
    skin: '#d4a574',
    torso: '#f5f2ea',
    pants: '#2a2a32',
    accent: '#c43c2c',
    head: '#f5f2ea',
    mask: '#8a9a6a',
    stripe: '#f0f0f5',
    mustache: '#2a1c14',
    cigar: '#8a6a40',
    ember: '#ff6a20',
    chain: '#c8d0d8',
    cross: '#e0e8f0',
    pocket: '#c42828',
    shades: '#0a0a0c',
    shadesLens: '#1a2838',
    earpiece: '#2a2a30',
    tie: '#0c0c10',
    shirt: '#e8e8ec',
    yarmulkeColor: '#1c1c22',
  },
  delivery: {
    id: 'delivery',
    name: 'Delivery',
    desc: 'Brown jacket drip.',
    sleeve: '#6b4a2e',
    glove: '#3a3028',
    skin: '#d4a574',
    torso: '#8a5a32',
    pants: '#2c3540',
    accent: '#e8a020',
    head: '#3a3028',
    mask: '#8a9a6a',
    stripe: '#e8a020',
    mustache: '#2a1c14',
    cigar: '#8a6a40',
    ember: '#ff6a20',
    chain: '#c8d0d8',
    cross: '#e0e8f0',
    pocket: '#c42828',
    shades: '#0a0a0c',
    shadesLens: '#1a2838',
    earpiece: '#2a2a30',
    tie: '#0c0c10',
    shirt: '#e8e8ec',
    yarmulkeColor: '#1c1c22',
  },
  hazmat: {
    id: 'hazmat',
    name: 'Hazmat',
    desc: 'Yellow suit energy.',
    sleeve: '#d4c84a',
    glove: '#c8bc3a',
    skin: '#d4c84a',
    torso: '#cfc23e',
    pants: '#cfc23e',
    accent: '#3a3a28',
    head: '#cfc23e',
    mask: '#8a9a6a',
    stripe: '#3a3a28',
    mustache: '#2a1c14',
    cigar: '#8a6a40',
    ember: '#ff6a20',
    chain: '#c8d0d8',
    cross: '#e0e8f0',
    pocket: '#c42828',
    shades: '#0a0a0c',
    shadesLens: '#1a2838',
    earpiece: '#2a2a30',
    tie: '#0c0c10',
    shirt: '#e8e8ec',
    yarmulkeColor: '#1c1c22',
  },
  bulgarian: {
    id: 'bulgarian',
    name: 'Bulgarian',
    desc: 'Navy tracksuit.',
    unlock: null,
    sleeve: '#1a2a5a',
    glove: '#c49a6c',
    skin: '#c49a6c',
    torso: '#1e3270',
    pants: '#152448',
    accent: '#e8e8f0',
    head: '#c49a6c',
    mask: '#8a9a6a',
    stripe: '#f0f0f5',
    mustache: '#2a1c14',
    cigar: '#8a6a40',
    ember: '#ff6a20',
    chain: '#c8d0d8',
    cross: '#e0e8f0',
    pocket: '#c42828',
    shades: '#0a0a0c',
    shadesLens: '#1a2838',
    earpiece: '#2a2a30',
    tie: '#0c0c10',
    shirt: '#e8e8ec',
    yarmulkeColor: '#1c1c22',
  },
  maxGypsy: {
    id: 'maxGypsy',
    name: 'Max',
    desc: 'White jumpsuit. Beard. Cigarette.',
    sleeve: '#f2f2f2',
    glove: '#c49a6c',
    skin: '#c49a6c',
    torso: '#f7f7f7',
    pants: '#efefef',
    accent: '#c42828',
    head: '#c49a6c',
    mask: '#8a9a6a',
    stripe: '#2f9a45',
    mustache: '#1a120c',
    beard: '#1a120c',
    cigar: '#8a6a40',
    ember: '#ff6a20',
    chain: '#c8d0d8',
    cross: '#e0e8f0',
    pocket: '#c42828',
    shades: '#0a0a0c',
    shadesLens: '#1a2838',
    earpiece: '#2a2a30',
    tie: '#0c0c10',
    shirt: '#e8e8ec',
    yarmulkeColor: '#1c1c22',
  },
  romanian: {
    id: 'romanian',
    name: 'Romanian',
    desc: 'Blue-yellow-red tracksuit. True blood.',
    sleeve: '#002b7f',
    glove: '#c49a6c',
    skin: '#c49a6c',
    torso: '#002b7f',
    pants: '#001a4a',
    accent: '#fcd116',
    head: '#c49a6c',
    mask: '#8a9a6a',
    stripe: '#fcd116',
    mustache: '#1a120c',
    cigar: '#8a6a40',
    ember: '#ff6a20',
    chain: '#d4af37',
    cross: '#f0d060',
    pocket: '#ce1126',
    shades: '#0a0a0c',
    shadesLens: '#1a2838',
    earpiece: '#2a2a30',
    tie: '#0c0c10',
    shirt: '#e8e8ec',
    yarmulkeColor: '#1c1c22',
  },
  mossad: {
    id: 'mossad',
    name: 'Mossad Agent',
    desc: 'Black suit. Unlock: rebuild 2 windows.',
    unlock: { windowsRebuilt: 2 },
    unlockHint: 'Rebuild 2 windows to unlock',
    sleeve: '#1a1a1e',
    glove: '#0e0e12',
    skin: '#c4a882',
    torso: '#16161a',
    pants: '#121216',
    accent: '#0038b8',
    head: '#1a1a1e',
    mask: '#8a9a6a',
    stripe: '#0038b8',
    mustache: '#2a1c14',
    cigar: '#8a6a40',
    ember: '#ff6a20',
    chain: '#c8d0d8',
    cross: '#e0e8f0',
    pocket: '#c42828',
    shades: '#0a0a0c',
    shadesLens: '#1a2838',
    earpiece: '#2a2a30',
    tie: '#0c0c10',
    shirt: '#e8e8ec',
    yarmulkeColor: '#1c1c22',
  },
  callCenter: {
    id: 'callCenter',
    name: 'Call Center',
    desc: 'Blue polo. Headset. Your call is very important to us.',
    sleeve: '#3a7ab8',
    glove: '#c49a6c',
    skin: '#c49a6c',
    torso: '#4a8fd0',
    pants: '#8a7a55',
    accent: '#f0c020',
    head: '#c49a6c',
    mask: '#8a9a6a',
    stripe: '#f0c020',
    mustache: '#2a1c14',
    cigar: '#8a6a40',
    ember: '#ff6a20',
    chain: '#c8d0d8',
    cross: '#e0e8f0',
    pocket: '#c42828',
    shades: '#0a0a0c',
    shadesLens: '#1a2838',
    earpiece: '#2a2a30',
    tie: '#1a5a9a',
    shirt: '#5a9ad8',
    yarmulkeColor: '#1c1c22',
    headsetBand: '#2a2a32',
    headsetCup: '#1a1a22',
    headsetMic: '#3a3a45',
    lanyard: '#c42828',
    badge: '#f2f6fa',
    badgeAccent: '#1a5a9a',
  },
  cowboy: {
    id: 'cowboy',
    name: 'Cowboy',
    desc: 'Hat, boots, spurs. Freedom smells like gunpowder.',
    unlock: { quest: 'trueAmerican' },
    unlockHint: 'Complete True American with Duke',
    sleeve: '#6a3a22',
    glove: '#c49a6c',
    skin: '#c49a6c',
    torso: '#8a4a28',
    pants: '#2a3a58',
    accent: '#c42828',
    head: '#c49a6c',
    mask: '#8a9a6a',
    stripe: '#c42828',
    mustache: '#3a2418',
    cigar: '#8a6a40',
    ember: '#ff6a20',
    chain: '#c8d0d8',
    cross: '#e0e8f0',
    pocket: '#c42828',
    shades: '#0a0a0c',
    shadesLens: '#1a2838',
    earpiece: '#2a2a30',
    tie: '#0c0c10',
    shirt: '#d8c8a0',
    yarmulkeColor: '#1c1c22',
    hat: '#3a2818',
    hatBand: '#c42828',
    boot: '#2a1810',
    spur: '#c8b090',
    gun: '#2a2a30',
    gunGrip: '#5a3a20',
    gunMetal: '#8a9098',
  },
  /** Mix-and-match mode — palette comes from loadout.body style, not these colors */
  custom: {
    id: 'custom',
    name: 'Custom',
    desc: 'Build your own. Sliders + accessories from every outfit.',
    isCustom: true,
    sleeve: '#f2f0e8',
    glove: '#e8e4d8',
    skin: '#d4a574',
    torso: '#f5f2ea',
    pants: '#2a2a32',
    accent: '#c43c2c',
    head: '#f5f2ea',
    mask: '#8a9a6a',
    stripe: '#f0f0f5',
    mustache: '#2a1c14',
    cigar: '#8a6a40',
    ember: '#ff6a20',
    chain: '#c8d0d8',
    cross: '#e0e8f0',
    pocket: '#c42828',
    shades: '#0a0a0c',
    shadesLens: '#1a2838',
    earpiece: '#2a2a30',
    tie: '#0c0c10',
    shirt: '#e8e8ec',
    yarmulkeColor: '#1c1c22',
  },
};

const COLORWAYS = {
  chef: {
    default: {},
    grey: {
      sleeve: '#c8c8c8',
      glove: '#b0b0b0',
      torso: '#d4d4d4',
      pants: '#3a3a3a',
      accent: '#6a6a6a',
      head: '#d8d8d8',
    },
    pink: {
      sleeve: '#f5d0dc',
      glove: '#eeb8c8',
      torso: '#f8dde6',
      pants: '#5a3040',
      accent: '#e85a8a',
      head: '#f8dde6',
    },
  },
  delivery: {
    default: {},
    grey: {
      sleeve: '#6a6a6a',
      glove: '#4a4a4a',
      torso: '#7a7a7a',
      pants: '#3a3a42',
      accent: '#b0b0b0',
      head: '#4a4a4a',
    },
    pink: {
      sleeve: '#a05068',
      glove: '#703048',
      torso: '#c46880',
      pants: '#3a2840',
      accent: '#ff8ab0',
      head: '#703048',
    },
  },
  hazmat: {
    default: {},
    grey: {
      sleeve: '#a8a890',
      glove: '#989880',
      skin: '#a8a890',
      torso: '#b0b098',
      pants: '#b0b098',
      accent: '#4a4a40',
      head: '#b0b098',
      mask: '#7a8070',
    },
    pink: {
      sleeve: '#e8a0c0',
      glove: '#d888b0',
      skin: '#e8a0c0',
      torso: '#f0b0cc',
      pants: '#f0b0cc',
      accent: '#803050',
      head: '#f0b0cc',
      mask: '#c080a0',
    },
  },
  bulgarian: {
    default: {},
    grey: {
      sleeve: '#4a4a52',
      glove: '#b09070',
      skin: '#b09070',
      torso: '#5a5a62',
      pants: '#3a3a42',
      accent: '#d0d0d4',
      head: '#b09070',
      stripe: '#d8d8dc',
    },
    pink: {
      sleeve: '#8a2858',
      glove: '#c49a6c',
      skin: '#c49a6c',
      torso: '#b03870',
      pants: '#701838',
      accent: '#ffe0f0',
      head: '#c49a6c',
      stripe: '#ffe8f4',
    },
  },
  maxGypsy: {
    default: {},
    grey: {
      sleeve: '#d8d8d8',
      torso: '#e0e0e0',
      pants: '#d0d0d0',
      stripe: '#4a7a50',
      pocket: '#8a3030',
      accent: '#8a3030',
      head: '#c49a6c',
      skin: '#c49a6c',
    },
    pink: {
      sleeve: '#fff0f4',
      torso: '#fff5f8',
      pants: '#ffe8f0',
      stripe: '#3a9a55',
      pocket: '#e04060',
      accent: '#e04060',
      head: '#c49a6c',
      skin: '#c49a6c',
    },
  },
  romanian: {
    default: {},
    grey: {
      sleeve: '#3a3a48',
      glove: '#b09070',
      skin: '#b09070',
      torso: '#4a4a58',
      pants: '#2a2a38',
      accent: '#d0d0a0',
      head: '#b09070',
      stripe: '#c8c8a8',
      chain: '#b0b0b0',
      cross: '#c8c8c8',
      pocket: '#6a3030',
    },
    pink: {
      sleeve: '#5a1848',
      glove: '#c49a6c',
      skin: '#c49a6c',
      torso: '#702060',
      pants: '#401030',
      accent: '#ffe060',
      head: '#c49a6c',
      stripe: '#ffe860',
      chain: '#e8c060',
      cross: '#ffd070',
      pocket: '#e04070',
    },
  },
  mossad: {
    default: {},
    grey: {
      sleeve: '#4a4a50',
      glove: '#3a3a40',
      torso: '#585860',
      pants: '#3a3a42',
      accent: '#6a8ab0',
      head: '#4a4a50',
      shades: '#2a2a30',
      shadesLens: '#3a4858',
      earpiece: '#5a5a62',
      tie: '#3a3a42',
      shirt: '#d0d0d4',
      yarmulkeColor: '#3a3a42',
    },
    pink: {
      sleeve: '#3a1828',
      glove: '#2a1018',
      torso: '#4a2030',
      pants: '#2a1018',
      accent: '#e85090',
      head: '#3a1828',
      shades: '#1a0810',
      shadesLens: '#401828',
      earpiece: '#5a3040',
      tie: '#801838',
      shirt: '#f0d0dc',
      yarmulkeColor: '#5a2038',
    },
  },
  callCenter: {
    default: {},
    grey: {
      sleeve: '#6a7a88',
      glove: '#b09070',
      skin: '#b09070',
      torso: '#7a8a98',
      pants: '#6a6558',
      accent: '#c0c0c4',
      head: '#b09070',
      shirt: '#8a9aa8',
      lanyard: '#6a6a70',
      badgeAccent: '#4a5a6a',
    },
    pink: {
      sleeve: '#c86890',
      glove: '#c49a6c',
      skin: '#c49a6c',
      torso: '#e080a8',
      pants: '#7a5560',
      accent: '#ffd060',
      head: '#c49a6c',
      shirt: '#e890b0',
      lanyard: '#e04070',
      badgeAccent: '#c05080',
    },
  },
  cowboy: {
    default: {},
    grey: {
      sleeve: '#5a5048',
      glove: '#b09070',
      skin: '#b09070',
      torso: '#6a6058',
      pants: '#3a4050',
      accent: '#a0a0a4',
      head: '#b09070',
      hat: '#3a3834',
      hatBand: '#6a6a70',
      boot: '#2a2824',
      spur: '#a8a8a8',
    },
    pink: {
      sleeve: '#a04868',
      glove: '#c49a6c',
      skin: '#c49a6c',
      torso: '#c06080',
      pants: '#403050',
      accent: '#ff70a0',
      head: '#c49a6c',
      hat: '#502838',
      hatBand: '#ff70a0',
      boot: '#301820',
      spur: '#e0b0c0',
    },
  },
};

/** Mix-and-match slot catalogs */
export const HEAD_OPTIONS = [
  { id: 'none', name: 'None' },
  { id: 'bald', name: 'Bald' },
  { id: 'toque', name: 'Chef Toque' },
  { id: 'cap', name: 'Cap' },
  { id: 'hood', name: 'Hazmat Hood' },
];

export const FACE_OPTIONS = [
  { id: 'none', name: 'None' },
  { id: 'mustache', name: 'Mustache' },
  { id: 'mask', name: 'Hazmat Visor' },
  { id: 'shades', name: 'Shades', unlock: 'mossad' },
];

export const HAND_OPTIONS = [
  { id: 'gloves', name: 'Gloves' },
  { id: 'bare', name: 'Bare' },
];

export const EXTRA_OPTIONS = [
  { id: 'stripes', name: 'Track Stripes' },
  { id: 'cigarette', name: 'Cigarette' },
  { id: 'beard', name: 'Beard' },
  { id: 'chain', name: 'Silver Chain' },
  { id: 'cross', name: 'Cross' },
  { id: 'pocket', name: 'Red Pocket' },
  { id: 'tie', name: 'Tie + Collar', unlock: 'mossad' },
  { id: 'earpiece', name: 'Earpiece', unlock: 'mossad' },
  { id: 'yarmulke', name: 'Yarmulke', unlock: 'mossad' },
  { id: 'headset', name: 'Headset', unlock: 'callCenter' },
  { id: 'badge', name: 'ID Badge', unlock: 'callCenter' },
  { id: 'cowboyHat', name: 'Cowboy Hat', unlock: 'cowboy' },
  { id: 'boots', name: 'Cowboy Boots', unlock: 'cowboy' },
  { id: 'spurs', name: 'Spurs', unlock: 'cowboy' },
  { id: 'revolver', name: 'Revolver', unlock: 'cowboy' },
];

/** Preset looks (no mix UI) */
export const BODY_STYLES = Object.values(BASE).filter((o) => !o.isCustom);
/** Outfit picker: presets + Custom */
export const OUTFITS = [...BODY_STYLES, BASE.custom];

export const CUSTOM_OUTFIT_ID = 'custom';

export function isCustomOutfitId(id) {
  return id === CUSTOM_OUTFIT_ID;
}

/** Palette bodies only — never "custom" */
export function resolveBodyStyleId(id) {
  if (id && BASE[id] && !BASE[id].isCustom) return id;
  return DEFAULT_OUTFIT_ID;
}

export const DEFAULT_LOADOUT = {
  body: DEFAULT_OUTFIT_ID,
  head: 'toque',
  face: 'none',
  hands: 'gloves',
  extras: {},
  color: DEFAULT_OUTFIT_COLOR,
};

/** Classic preset → modular loadout */
export function loadoutFromPreset(bodyId, colorId = DEFAULT_OUTFIT_COLOR) {
  const id = resolveBodyStyleId(bodyId);
  const color = getOutfitColor(colorId).id;
  const base = {
    body: id,
    head: 'none',
    face: 'none',
    hands: 'gloves',
    extras: {},
    color,
  };
  switch (id) {
    case 'chef':
      return { ...base, head: 'toque' };
    case 'delivery':
      return { ...base, head: 'cap' };
    case 'hazmat':
      return { ...base, head: 'hood', face: 'mask', hands: 'gloves' };
    case 'bulgarian':
      return {
        ...base,
        head: 'bald',
        face: 'mustache',
        hands: 'bare',
        extras: { stripes: true, cigarette: true, chain: true, cross: true },
      };
    case 'maxGypsy':
      return {
        ...base,
        head: 'bald',
        face: 'mustache',
        hands: 'bare',
        extras: {
          stripes: true,
          cigarette: true,
          beard: true,
          chain: true,
          cross: true,
          pocket: true,
        },
      };
    case 'romanian':
      return {
        ...base,
        head: 'bald',
        face: 'mustache',
        hands: 'bare',
        extras: {
          stripes: true,
          cigarette: true,
          chain: true,
          cross: true,
          pocket: true,
        },
      };
    case 'mossad':
      return {
        ...base,
        head: 'none',
        face: 'shades',
        hands: 'gloves',
        extras: { tie: true, earpiece: true },
      };
    case 'callCenter':
      return {
        ...base,
        head: 'none',
        face: 'none',
        hands: 'bare',
        extras: { headset: true, badge: true },
      };
    case 'cowboy':
      return {
        ...base,
        head: 'none',
        face: 'mustache',
        hands: 'bare',
        extras: {
          cowboyHat: true,
          boots: true,
          spurs: true,
          revolver: true,
        },
      };
    default:
      return base;
  }
}

export function normalizeLoadout(raw, fallbackBody = DEFAULT_OUTFIT_ID) {
  if (!raw || typeof raw !== 'object') {
    return loadoutFromPreset(fallbackBody, DEFAULT_OUTFIT_COLOR);
  }
  const body = resolveBodyStyleId(
    raw.body && !isCustomOutfitId(raw.body) ? raw.body : fallbackBody
  );
  const head = HEAD_OPTIONS.some((h) => h.id === raw.head) ? raw.head : 'none';
  const face = FACE_OPTIONS.some((f) => f.id === raw.face) ? raw.face : 'none';
  const hands = HAND_OPTIONS.some((h) => h.id === raw.hands) ? raw.hands : 'gloves';
  const color = getOutfitColor(raw.color || DEFAULT_OUTFIT_COLOR).id;
  const extras = {};
  EXTRA_OPTIONS.forEach((e) => {
    if (raw.extras?.[e.id]) extras[e.id] = true;
  });
  if (raw.yarmulke || raw.outfitYarmulke) extras.yarmulke = true;
  return { body, head, face, hands, extras, color };
}

export function getOutfitUnlock(id) {
  if (isCustomOutfitId(id)) return null;
  return BASE[id]?.unlock || null;
}

export function outfitNeedsUnlock(id) {
  return !!getOutfitUnlock(id);
}

export function partNeedsUnlock(partType, partId) {
  if (partType === 'body') return getOutfitUnlock(partId);
  if (partType === 'face') {
    return FACE_OPTIONS.find((f) => f.id === partId)?.unlock || null;
  }
  if (partType === 'extra') {
    return EXTRA_OPTIONS.find((e) => e.id === partId)?.unlock || null;
  }
  return null;
}

export function getOutfitColor(id) {
  return OUTFIT_COLORS.find((c) => c.id === id) || OUTFIT_COLORS[0];
}

export function getOutfitGender(id) {
  return OUTFIT_GENDERS.find((g) => g.id === id) || OUTFIT_GENDERS[0];
}

/** Build loadout from saved camp (presets are always canonical defaults) */
export function loadoutFromCamp(camp) {
  if (!camp) return { ...DEFAULT_LOADOUT, extras: {} };
  const color = camp.outfitColor || DEFAULT_OUTFIT_COLOR;

  if (isCustomOutfitId(camp.outfitId)) {
    const raw = camp.outfitLoadout || camp.customLoadout;
    if (raw && typeof raw === 'object') {
      return normalizeLoadout(
        {
          ...raw,
          color: camp.outfitColor || raw.color,
          yarmulke: camp.outfitYarmulke || raw.extras?.yarmulke,
        },
        resolveBodyStyleId(raw.body) || DEFAULT_OUTFIT_ID
      );
    }
    // First time opening Custom — seed from chef default
    return loadoutFromPreset(DEFAULT_OUTFIT_ID, color);
  }

  // Named outfits: always the designed default look (ignore leftover mix junk)
  const presetId = resolveBodyStyleId(camp.outfitId || DEFAULT_OUTFIT_ID);
  return loadoutFromPreset(presetId, color);
}

/** Keep legacy outfitId / color / yarmulke fields in sync with loadout */
export function syncLegacyOutfitFields(camp) {
  const n = loadoutFromCamp(camp);
  camp.outfitLoadout = packLoadout(n);
  if (!isCustomOutfitId(camp.outfitId)) {
    camp.outfitId = n.body;
  } else {
    camp.outfitId = CUSTOM_OUTFIT_ID;
    camp.customLoadout = packLoadout(n);
  }
  camp.outfitColor = n.color;
  camp.outfitYarmulke = !!n.extras.yarmulke;
  return n;
}

export function legacyFieldsFromLoadout(loadout, modeId) {
  const n = normalizeLoadout(loadout);
  const custom = isCustomOutfitId(modeId);
  return {
    outfitId: custom ? CUSTOM_OUTFIT_ID : n.body,
    outfitColor: n.color,
    outfitYarmulke: !!n.extras.yarmulke,
    outfitLoadout: packLoadout(n),
    ...(custom ? { customLoadout: packLoadout(n) } : {}),
  };
}

export function outfitColorIndex(id) {
  const i = OUTFIT_COLORS.findIndex((c) => c.id === id);
  return i >= 0 ? i : 0;
}

export function outfitColorIdAt(index) {
  const n = OUTFIT_COLORS.length;
  const i = ((index % n) + n) % n;
  return OUTFIT_COLORS[i].id;
}

function cycleList(list, id, delta) {
  const i = list.findIndex((x) => x.id === id);
  const idx = i >= 0 ? i : 0;
  const n = list.length;
  return list[((idx + delta) % n + n) % n].id;
}

export function cycleHead(id, delta = 1) {
  return cycleList(HEAD_OPTIONS, id, delta);
}
export function cycleFace(id, delta = 1) {
  return cycleList(FACE_OPTIONS, id, delta);
}
export function cycleHands(id, delta = 1) {
  return cycleList(HAND_OPTIONS, id, delta);
}
export function bodyIndex(id) {
  const i = BODY_STYLES.findIndex((o) => o.id === id);
  return i >= 0 ? i : 0;
}
export function bodyIdAt(index) {
  const n = BODY_STYLES.length;
  const i = ((index % n) + n) % n;
  return BODY_STYLES[i].id;
}

export function outfitChoiceIndex(id) {
  const i = OUTFITS.findIndex((o) => o.id === id);
  return i >= 0 ? i : 0;
}
export function outfitChoiceIdAt(index) {
  const n = OUTFITS.length;
  const i = ((index % n) + n) % n;
  return OUTFITS[i].id;
}

/** Full resolved look for rendering + HUD */
export function resolveOutfit(loadoutOrId, colorId) {
  let loadout;
  if (typeof loadoutOrId === 'string') {
    if (isCustomOutfitId(loadoutOrId)) {
      loadout = loadoutFromPreset(DEFAULT_OUTFIT_ID, colorId || DEFAULT_OUTFIT_COLOR);
    } else {
      loadout = loadoutFromPreset(loadoutOrId, colorId || DEFAULT_OUTFIT_COLOR);
    }
  } else {
    loadout = normalizeLoadout(loadoutOrId, loadoutOrId?.body || DEFAULT_OUTFIT_ID);
    if (colorId) loadout.color = getOutfitColor(colorId).id;
  }

  const styleId = resolveBodyStyleId(loadout.body);
  const base = BASE[styleId] || BASE.chef;
  const way = COLORWAYS[base.id]?.[loadout.color] || {};
  const pal = { ...base, ...way };

  const extras = loadout.extras || {};
  const glove = loadout.hands === 'bare' ? pal.skin : pal.glove;
  const head = loadout.head;
  const face = loadout.face;

  return {
    ...pal,
    id: base.id,
    name: base.name,
    desc: base.desc,
    unlock: base.unlock || null,
    unlockHint: base.unlockHint || null,
    colorId: loadout.color,
    loadout: { ...loadout, body: styleId },
    head,
    face,
    hands: loadout.hands,
    glove,
    showToque: head === 'toque',
    showCap: head === 'cap',
    showHood: head === 'hood',
    showBald: head === 'bald',
    showHair: head !== 'bald' && head !== 'hood',
    showMustache: face === 'mustache',
    showMask: face === 'mask',
    showShades: face === 'shades',
    showStripes: !!extras.stripes,
    showCigarette: !!extras.cigarette,
    showBeard: !!extras.beard,
    showChain: !!extras.chain,
    showCross: !!extras.cross,
    showPocket: !!extras.pocket,
    showTie: !!extras.tie,
    showEarpiece: !!extras.earpiece,
    showYarmulke: !!extras.yarmulke,
    showHeadset: !!extras.headset,
    showBadge: !!extras.badge,
    showCowboyHat: !!extras.cowboyHat,
    showBoots: !!extras.boots,
    showSpurs: !!extras.spurs,
    showRevolver: !!extras.revolver,
    showBulgarianKit:
      !!extras.stripes ||
      !!extras.cigarette ||
      !!extras.beard ||
      !!extras.chain ||
      !!extras.cross ||
      !!extras.pocket ||
      face === 'mustache',
    showMossadKit:
      face === 'shades' ||
      !!extras.tie ||
      !!extras.earpiece ||
      !!extras.yarmulke,
    showCallCenterKit: !!extras.headset || !!extras.badge,
    showCowboyKit:
      !!extras.cowboyHat ||
      !!extras.boots ||
      !!extras.spurs ||
      !!extras.revolver,
  };
}

/** @deprecated prefer resolveOutfit(loadout) — kept for callers using body+color */
export function getOutfit(id, colorId = DEFAULT_OUTFIT_COLOR) {
  if (isCustomOutfitId(id)) return { ...BASE.custom, colorId };
  return resolveOutfit(id, colorId);
}

export function outfitIndex(id) {
  return outfitChoiceIndex(id);
}

export function outfitIdAt(index) {
  return outfitChoiceIdAt(index);
}

/** Compact net payload */
export function packLoadout(loadout) {
  const n = normalizeLoadout(loadout);
  return {
    body: n.body,
    head: n.head,
    face: n.face,
    hands: n.hands,
    color: n.color,
    extras: { ...n.extras },
  };
}
