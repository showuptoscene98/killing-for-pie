/** Persistent meta achievements — tracked in camp save */

export const ACHIEVEMENTS = [
  {
    id: 'firstBlood',
    name: 'First Blood',
    desc: 'Kill your first zombie.',
    icon: '✝',
  },
  {
    id: 'slaughterhouse',
    name: 'Slaughterhouse',
    desc: 'Rack up 50 lifetime kills.',
    icon: '⚔',
  },
  {
    id: 'exterminator',
    name: 'Exterminator',
    desc: 'Rack up 250 lifetime kills.',
    icon: '☠',
  },
  {
    id: 'round5',
    name: 'Warming Up',
    desc: 'Reach round 5 in a single run.',
    icon: 'Ⅴ',
  },
  {
    id: 'round10',
    name: 'Holding the Line',
    desc: 'Reach round 10 in a single run.',
    icon: 'Ⅹ',
  },
  {
    id: 'round15',
    name: 'Siege Veteran',
    desc: 'Reach round 15 in a single run.',
    icon: '✦',
  },
  {
    id: 'carpenter',
    name: 'Carpenter',
    desc: 'Fully rebuild a window.',
    icon: '▣',
  },
  {
    id: 'contractor',
    name: 'Contractor',
    desc: 'Fully rebuild 10 windows.',
    icon: '⌂',
  },
  {
    id: 'openSesame',
    name: 'Open Sesame',
    desc: 'Buy your first door.',
    icon: '▣',
  },
  {
    id: 'mysteryMeat',
    name: 'Mystery Meat',
    desc: 'Spin the mystery box.',
    icon: '?',
  },
  {
    id: 'nuclearOption',
    name: 'Nuclear Option',
    desc: 'Pick up a Nuke power-up.',
    icon: '☢',
  },
  {
    id: 'oneShot',
    name: 'One Shot',
    desc: 'Pick up Insta-Kill.',
    icon: '◉',
  },
  {
    id: 'payday',
    name: 'Payday',
    desc: 'Pick up Double Points.',
    icon: '✕',
  },
  {
    id: 'boardMaster',
    name: 'Board Master',
    desc: 'Nail 50 boards lifetime.',
    icon: '=',
  },
  {
    id: 'scrapLord',
    name: 'Scrap Lord',
    desc: 'Bank 2,500 scrap lifetime.',
    icon: '$',
  },
  {
    id: 'veteran',
    name: 'Veteran',
    desc: 'Finish 10 runs.',
    icon: '★',
  },
];

export function defaultAchievementState() {
  return {
    unlocked: {},
    stats: {
      kills: 0,
      windows: 0,
      doors: 0,
      boxSpins: 0,
      boards: 0,
      nukes: 0,
      instakills: 0,
      doublePoints: 0,
      highestRound: 0,
      runs: 0,
    },
  };
}

export function normalizeAchievements(raw) {
  const base = defaultAchievementState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    unlocked: { ...base.unlocked, ...(raw.unlocked || {}) },
    stats: { ...base.stats, ...(raw.stats || {}) },
  };
}

export function getAchievement(id) {
  return ACHIEVEMENTS.find((a) => a.id === id) || null;
}

function unlock(camp, id, newly) {
  const ach = camp.achievements || (camp.achievements = defaultAchievementState());
  if (ach.unlocked[id]) return;
  ach.unlocked[id] = Date.now();
  const def = getAchievement(id);
  if (def) newly.push(def);
}

/** Mutates camp.achievements; returns newly unlocked defs */
export function applyAchievementEvent(camp, event, payload = {}) {
  if (!camp.achievements) camp.achievements = defaultAchievementState();
  const s = camp.achievements.stats;
  const newly = [];

  if (event === 'kill') {
    s.kills += payload.count || 1;
    if (s.kills >= 1) unlock(camp, 'firstBlood', newly);
    if (s.kills >= 50) unlock(camp, 'slaughterhouse', newly);
    if (s.kills >= 250) unlock(camp, 'exterminator', newly);
  }

  if (event === 'round') {
    const r = payload.round || 0;
    if (r > s.highestRound) s.highestRound = r;
    if (r >= 5) unlock(camp, 'round5', newly);
    if (r >= 10) unlock(camp, 'round10', newly);
    if (r >= 15) unlock(camp, 'round15', newly);
  }

  if (event === 'window') {
    s.windows += 1;
    if (s.windows >= 1) unlock(camp, 'carpenter', newly);
    if (s.windows >= 10) unlock(camp, 'contractor', newly);
  }

  if (event === 'board') {
    s.boards += payload.count || 1;
    if (s.boards >= 50) unlock(camp, 'boardMaster', newly);
  }

  if (event === 'door') {
    s.doors += 1;
    if (s.doors >= 1) unlock(camp, 'openSesame', newly);
  }

  if (event === 'boxSpin') {
    s.boxSpins += 1;
    if (s.boxSpins >= 1) unlock(camp, 'mysteryMeat', newly);
  }

  if (event === 'powerup') {
    const t = payload.type;
    if (t === 'nuke') {
      s.nukes += 1;
      unlock(camp, 'nuclearOption', newly);
    } else if (t === 'instakill') {
      s.instakills += 1;
      unlock(camp, 'oneShot', newly);
    } else if (t === 'doublepoints') {
      s.doublePoints += 1;
      unlock(camp, 'payday', newly);
    }
  }

  if (event === 'runEnd') {
    // camp.runs already bumped in bankFromRun
    s.runs = Math.max(s.runs, camp.runs || 0);
    const r = payload.round || 0;
    if (r > s.highestRound) s.highestRound = r;
    if (r >= 5) unlock(camp, 'round5', newly);
    if (r >= 10) unlock(camp, 'round10', newly);
    if (r >= 15) unlock(camp, 'round15', newly);
    if (s.runs >= 10) unlock(camp, 'veteran', newly);
    const banked = payload.totalBanked ?? camp.totalBanked ?? 0;
    if (banked >= 2500) unlock(camp, 'scrapLord', newly);
  }

  if (event === 'bank') {
    const banked = payload.totalBanked ?? camp.totalBanked ?? 0;
    if (banked >= 2500) unlock(camp, 'scrapLord', newly);
  }

  return newly;
}

/** Queue toast banners so they don't stomp ROUND N */
export function queueAchievementBanners(state, newly) {
  if (!state || !newly?.length) return;
  if (!state._achBannerQueue) state._achBannerQueue = [];
  for (let i = 0; i < newly.length; i++) {
    state._achBannerQueue.push(newly[i]);
  }
  if (!state.roundBanner || (state.roundBannerTimer || 0) <= 0) {
    const next = state._achBannerQueue.shift();
    if (next) {
      state.roundBanner = `ACHIEVEMENT: ${next.name}`;
      state.roundBannerTimer = 3.2;
    }
  }
}

export function achievementProgress(camp) {
  const unlocked = camp?.achievements?.unlocked || {};
  const total = ACHIEVEMENTS.length;
  let done = 0;
  for (let i = 0; i < total; i++) {
    if (unlocked[ACHIEVEMENTS[i].id]) done += 1;
  }
  return { done, total };
}
