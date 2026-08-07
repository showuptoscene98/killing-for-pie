import { QUESTS, getQuest, defaultQuestState, stepLabel } from './questData';

export function normalizeQuests(raw) {
  const base = defaultQuestState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    active: { ...(raw.active || {}) },
    completed: Array.isArray(raw.completed) ? [...raw.completed] : [],
    stats: { ...base.stats, ...(raw.stats || {}) },
  };
}

export function ensureQuestState(camp) {
  if (!camp.quests) camp.quests = defaultQuestState();
  else camp.quests = normalizeQuests(camp.quests);
  return camp.quests;
}

function ensureParkour(camp) {
  if (!camp.parkour || typeof camp.parkour !== 'object') {
    camp.parkour = { jumps: 0, slides: 0, highLands: 0, maxHeight: 0 };
  } else if (camp.parkour.slides == null && camp.parkour.mantles != null) {
    camp.parkour.slides = camp.parkour.mantles | 0;
  }
  return camp.parkour;
}

function cloneQuests(quests) {
  return {
    active: { ...quests.active },
    completed: [...quests.completed],
    stats: { ...(quests.stats || {}) },
  };
}

function applyReward(camp, reward) {
  if (!reward) return camp;
  let next = camp;
  if (reward.scrap) {
    next = { ...next, bank: (next.bank || 0) + reward.scrap };
  }
  if (reward.unlockOutfit) {
    const unlocked = new Set(next.unlockedOutfits || []);
    unlocked.add(reward.unlockOutfit);
    next = { ...next, unlockedOutfits: [...unlocked] };
  }
  if (reward.unlockMode) {
    const modes = new Set(next.unlockedModes || []);
    modes.add(reward.unlockMode);
    next = { ...next, unlockedModes: [...modes] };
  }
  return next;
}

function advanceStep(camp, quests, questId, q) {
  const st = quests.active[questId];
  if (!st) return { camp, completed: false, reward: null };
  st.stepIndex += 1;
  st.progress = 0;
  if (st.stepIndex >= q.steps.length) {
    delete quests.active[questId];
    if (!quests.completed.includes(questId)) quests.completed.push(questId);
    const reward = q.reward || null;
    return {
      camp: applyReward({ ...camp, quests: cloneQuests(quests) }, reward),
      completed: true,
      reward,
    };
  }
  return {
    camp: { ...camp, quests: cloneQuests(quests) },
    completed: false,
    reward: null,
  };
}

export function isQuestCompleted(camp, questId) {
  return !!ensureQuestState(camp).completed.includes(questId);
}

export function isQuestActive(camp, questId) {
  return !!ensureQuestState(camp).active[questId];
}

export function canAcceptQuest(camp, questId) {
  if (!getQuest(questId)) return false;
  if (isQuestCompleted(camp, questId)) return false;
  if (isQuestActive(camp, questId)) return false;
  if (questId === 'ledgeLawyer' && !isQuestCompleted(camp, 'hopBasics')) return false;
  if (questId === 'roofRoyalty' && !isQuestCompleted(camp, 'ledgeLawyer')) return false;
  return true;
}

export function acceptQuest(camp, questId) {
  const q = getQuest(questId);
  if (!q || !canAcceptQuest(camp, questId)) return camp;
  const quests = ensureQuestState(camp);
  const pk = ensureParkour(camp);
  const active = {
    ...quests.active,
    [questId]: {
      stepIndex: 0,
      progress: 0,
      acceptedAtWindows: camp.windowsRebuilt || 0,
      acceptedAtJumps: pk.jumps || 0,
      acceptedAtSlides: pk.slides || 0,
      acceptedAtHighLands: pk.highLands || 0,
      reachedHeight: false,
    },
  };
  let next = {
    ...camp,
    parkour: { ...pk },
    quests: { ...cloneQuests(quests), active },
  };
  if (q.unlockOnAccept) {
    next = applyReward(next, q.unlockOnAccept);
  }
  return next;
}

export function isModeUnlocked(camp, modeId) {
  if (!modeId || modeId === 'classic') return true;
  if ((camp.unlockedModes || []).includes(modeId)) return true;
  // Completing the Imagine quest also keeps Transit unlocked
  if (modeId === 'transit' && isQuestCompleted(camp, 'letTheGoodTimesRoll')) {
    return true;
  }
  if (modeId === 'transit' && isQuestActive(camp, 'letTheGoodTimesRoll')) {
    return true;
  }
  return false;
}

export function onTalkNpc(camp, npcId) {
  const quests = ensureQuestState(camp);
  let next = camp;
  let changed = false;
  Object.keys(quests.active).forEach((qid) => {
    const q = getQuest(qid);
    const st = next.quests?.active?.[qid] || quests.active[qid];
    if (!q || !st) return;
    const step = q.steps[st.stepIndex];
    if (!step) return;
    if (step.type === 'talk' && step.npcId === npcId) {
      const qs = ensureQuestState(next);
      const result = advanceStep(next, qs, qid, q);
      next = result.camp;
      changed = true;
    }
  });
  return changed ? next : camp;
}

export function turnInQuest(camp, questId) {
  const q = getQuest(questId);
  const quests = ensureQuestState(camp);
  const st = quests.active[questId];
  if (!q || !st) return { camp, turnedIn: false, reward: null };

  const step = q.steps[st.stepIndex];
  if (step && step.type === 'talk') {
    const result = advanceStep(camp, quests, questId, q);
    return {
      camp: result.camp,
      turnedIn: result.completed,
      reward: result.reward,
    };
  }

  return { camp, turnedIn: false, reward: null };
}

function parkourDelta(st, pk, stat) {
  if (stat === 'jumps') return (pk.jumps || 0) - (st.acceptedAtJumps || 0);
  if (stat === 'slides') return (pk.slides || 0) - (st.acceptedAtSlides || 0);
  if (stat === 'mantles') return (pk.slides || 0) - (st.acceptedAtSlides || st.acceptedAtMantles || 0);
  if (stat === 'highLands') return (pk.highLands || 0) - (st.acceptedAtHighLands || 0);
  return 0;
}

function stepSatisfied(camp, step, st, runEvent) {
  if (!step) return false;
  if (step.type === 'talk') return false;
  if (step.type === 'or') {
    return (step.options || []).some((opt) =>
      stepSatisfied(camp, opt, st, runEvent)
    );
  }
  if (step.type === 'spendScrap') {
    return (st.progress || 0) >= (step.amount || 1);
  }
  if (step.type === 'upgradeRank') {
    return (camp.levels?.[step.upgradeId] || 0) >= (step.level || 1);
  }
  if (step.type === 'surviveRound') {
    return (
      (runEvent?.round || 0) >= (step.round || 1) || (st.progress || 0) >= 1
    );
  }
  if (step.type === 'getKills') {
    return (
      (runEvent?.kills || 0) >= (step.count || 1) || (st.progress || 0) >= 1
    );
  }
  if (step.type === 'rebuildWindows') {
    const since = st.acceptedAtWindows || 0;
    const now = camp.windowsRebuilt || 0;
    return now - since >= (step.count || 1);
  }
  if (step.type === 'depositScrap') {
    return (
      (runEvent?.earned || 0) >= (step.amount || 1) || (st.progress || 0) >= 1
    );
  }
  if (step.type === 'parkourStat') {
    const pk = ensureParkour(camp);
    return parkourDelta(st, pk, step.stat) >= (step.count || 1);
  }
  if (step.type === 'reachHeight') {
    return !!st.reachedHeight || (ensureParkour(camp).maxHeight || 0) >= (step.height || 2);
  }
  if (step.type === 'reachTransitMap') {
    return (
      (st.progress || 0) >= 1 ||
      !!(runEvent?.transitReached || []).includes(step.mapId)
    );
  }
  return false;
}

export function onUpgradePurchased(camp, upgradeId) {
  const quests = ensureQuestState(camp);
  let next = camp;
  let changed = false;
  Object.keys({ ...quests.active }).forEach((qid) => {
    const q = getQuest(qid);
    const st = ensureQuestState(next).active[qid];
    if (!q || !st) return;
    const step = q.steps[st.stepIndex];
    if (!step) return;
    const check = (s) =>
      s?.type === 'upgradeRank' &&
      s.upgradeId === upgradeId &&
      (next.levels?.[upgradeId] || 0) >= (s.level || 1);
    if (check(step) || (step.type === 'or' && (step.options || []).some(check))) {
      const result = advanceStep(next, ensureQuestState(next), qid, q);
      next = result.camp;
      changed = true;
    }
  });
  return changed ? next : camp;
}

export function onRunDeposited(camp, { round = 0, kills = 0, earned = 0, transitReached = [] } = {}) {
  const runEvent = { round, kills, earned, transitReached };
  let next = camp;
  let changed = false;
  const quests = ensureQuestState(next);
  Object.keys({ ...quests.active }).forEach((qid) => {
    const q = getQuest(qid);
    const st = ensureQuestState(next).active[qid];
    if (!q || !st) return;
    const step = q.steps[st.stepIndex];
    if (!step) return;

    let ok = false;
    if (step.type === 'surviveRound' && round >= (step.round || 1)) ok = true;
    else if (step.type === 'getKills' && kills >= (step.count || 1)) ok = true;
    else if (step.type === 'depositScrap' && earned >= (step.amount || 1))
      ok = true;
    else if (
      step.type === 'reachTransitMap' &&
      (transitReached || []).includes(step.mapId)
    )
      ok = true;
    else if (step.type === 'or' && stepSatisfied(next, step, st, runEvent))
      ok = true;

    if (ok) {
      st.progress = 1;
      const result = advanceStep(next, ensureQuestState(next), qid, q);
      next = result.camp;
      changed = true;
    }
  });
  return changed ? next : camp;
}

/** Mid-run: arrived at a Transit destination map. */
export function onTransitMapReached(camp, mapId) {
  if (!mapId) return camp;
  let next = camp;
  let changed = false;
  const quests = ensureQuestState(next);
  Object.keys({ ...quests.active }).forEach((qid) => {
    const q = getQuest(qid);
    const st = ensureQuestState(next).active[qid];
    if (!q || !st) return;
    const step = q.steps[st.stepIndex];
    if (step?.type === 'reachTransitMap' && step.mapId === mapId) {
      st.progress = 1;
      const result = advanceStep(next, ensureQuestState(next), qid, q);
      next = result.camp;
      changed = true;
    }
  });
  return changed ? next : camp;
}

export function onWindowsRebuilt(camp) {
  let next = camp;
  let changed = false;
  const quests = ensureQuestState(next);
  Object.keys({ ...quests.active }).forEach((qid) => {
    const q = getQuest(qid);
    const st = ensureQuestState(next).active[qid];
    if (!q || !st) return;
    const step = q.steps[st.stepIndex];
    if (step?.type === 'rebuildWindows' && stepSatisfied(next, step, st, null)) {
      const result = advanceStep(next, ensureQuestState(next), qid, q);
      next = result.camp;
      changed = true;
    }
  });
  return changed ? next : camp;
}

/** Record parkour action and auto-advance matching quest steps. */
export function onParkourEvent(camp, event = {}) {
  const pk = { ...ensureParkour(camp) };
  if (event.jump) pk.jumps = (pk.jumps || 0) + 1;
  if (event.slide) pk.slides = (pk.slides || 0) + 1;
  if (typeof event.floorY === 'number') {
    if (event.floorY > (pk.maxHeight || 0)) pk.maxHeight = event.floorY;
    if (event.highLand && event.floorY >= 0.7) {
      pk.highLands = (pk.highLands || 0) + 1;
    }
  }
  let next = { ...camp, parkour: pk };
  const quests = ensureQuestState(next);
  Object.keys({ ...quests.active }).forEach((qid) => {
    const q = getQuest(qid);
    const st = ensureQuestState(next).active[qid];
    if (!q || !st) return;
    const step = q.steps[st.stepIndex];
    if (!step) return;

    if (step.type === 'reachHeight' && (pk.maxHeight || 0) >= (step.height || 2)) {
      st.reachedHeight = true;
      const result = advanceStep(next, ensureQuestState(next), qid, q);
      next = result.camp;
      return;
    }
    if (step.type === 'parkourStat' && stepSatisfied(next, step, st, null)) {
      const result = advanceStep(next, ensureQuestState(next), qid, q);
      next = result.camp;
    }
  });
  return next;
}

export function getQuestLog(camp) {
  const quests = ensureQuestState(camp);
  const pk = ensureParkour(camp);
  const active = Object.keys(quests.active)
    .map((id) => {
      const q = getQuest(id);
      const st = quests.active[id];
      if (!q || !st) return null;
      const step = q.steps[st.stepIndex];
      let progress = st.progress || 0;
      let progressMax = 0;
      if (step?.type === 'parkourStat') {
        progress = parkourDelta(st, pk, step.stat);
        progressMax = step.count || 1;
      }
      return {
        id,
        title: q.title,
        blurb: q.blurb,
        giver: q.giver,
        stepIndex: st.stepIndex,
        stepTotal: q.steps.length,
        currentStep: stepLabel(step),
        progress,
        progressMax,
        readyToTurnIn: step?.type === 'talk',
      };
    })
    .filter(Boolean);

  const completed = quests.completed
    .map((id) => getQuest(id))
    .filter(Boolean)
    .map((q) => ({ id: q.id, title: q.title }));

  const available = Object.values(QUESTS)
    .filter((q) => canAcceptQuest(camp, q.id))
    .map((q) => ({
      id: q.id,
      title: q.title,
      blurb: q.blurb,
      giver: q.giver,
    }));

  return { active, completed, available };
}

export function questsForNpc(camp, npcId) {
  const log = getQuestLog(camp);
  return {
    canAccept: log.available.filter((q) => q.giver === npcId),
    activeHere: log.active.filter((q) => q.giver === npcId || q.readyToTurnIn),
    turnIn: log.active.filter((q) => {
      const qDef = getQuest(q.id);
      const step = qDef?.steps[q.stepIndex];
      return step?.type === 'talk' && step.npcId === npcId;
    }),
  };
}
