/** Quest definitions — multi-step + combat objectives. */

export const QUESTS = {
  settlingIn: {
    id: 'settlingIn',
    title: 'Settling In',
    giver: 'cook',
    blurb: 'Meet the crew around camp.',
    steps: [
      { id: 'talk_cook', type: 'talk', npcId: 'cook', label: 'Talk to Cook' },
      {
        id: 'talk_qm',
        type: 'talk',
        npcId: 'quartermaster',
        label: 'Talk to Quartermaster',
      },
      {
        id: 'talk_foreman',
        type: 'talk',
        npcId: 'foreman',
        label: 'Talk to Foreman',
      },
    ],
    reward: { scrap: 150 },
  },
  firstScrap: {
    id: 'firstScrap',
    title: 'First Scrap',
    giver: 'quartermaster',
    blurb: 'Prove you can earn or spend scrap.',
    steps: [
      {
        id: 'earn_or_buy',
        type: 'or',
        label: 'Deposit scrap from a run OR buy Vitality I',
        options: [
          { type: 'depositScrap', amount: 1 },
          { type: 'upgradeRank', upgradeId: 'vitality', level: 1 },
        ],
      },
    ],
    reward: { scrap: 200 },
  },
  holdTheLine: {
    id: 'holdTheLine',
    title: 'Hold the Line',
    giver: 'foreman',
    blurb: 'Survive to round 3, then report back.',
    steps: [
      {
        id: 'survive3',
        type: 'surviveRound',
        round: 3,
        label: 'Reach round 3 in a deploy',
      },
      {
        id: 'turn_in',
        type: 'talk',
        npcId: 'foreman',
        label: 'Report to Foreman',
      },
    ],
    reward: { scrap: 350 },
  },
  boardDuty: {
    id: 'boardDuty',
    title: 'Board Duty',
    giver: 'foreman',
    blurb: 'Rebuild windows. Mossad watches who boards.',
    steps: [
      {
        id: 'rebuild2',
        type: 'rebuildWindows',
        count: 2,
        label: 'Fully rebuild 2 windows',
      },
      {
        id: 'turn_in',
        type: 'talk',
        npcId: 'foreman',
        label: 'Report to Foreman',
      },
    ],
    reward: { scrap: 400 },
  },
  supplyRun: {
    id: 'supplyRun',
    title: 'Supply Run',
    giver: 'foreman',
    blurb: 'Kills, then invest in Quick Hands.',
    steps: [
      {
        id: 'brief',
        type: 'talk',
        npcId: 'foreman',
        label: 'Get the briefing from Foreman',
      },
      {
        id: 'kills20',
        type: 'getKills',
        count: 20,
        label: 'Get 20 kills in a single run',
      },
      {
        id: 'qh1',
        type: 'upgradeRank',
        upgradeId: 'quickHands',
        level: 1,
        label: 'Buy Quick Hands I',
      },
      {
        id: 'turn_in',
        type: 'talk',
        npcId: 'foreman',
        label: 'Turn in to Foreman',
      },
    ],
    reward: { scrap: 500 },
  },

  /** Max — parkour line */
  hopBasics: {
    id: 'hopBasics',
    title: 'Hop Basics',
    giver: 'max',
    blurb: 'Jump like a Bulgarian. Not like a Romanian fence-hopper.',
    steps: [
      {
        id: 'jumps10',
        type: 'parkourStat',
        stat: 'jumps',
        count: 10,
        label: 'Jump 10 times (camp or deploy)',
      },
      {
        id: 'turn_in',
        type: 'talk',
        npcId: 'max',
        label: 'Report to Max',
      },
    ],
    reward: { scrap: 220 },
  },
  ledgeLawyer: {
    id: 'ledgeLawyer',
    title: 'Slide Lawyer',
    giver: 'max',
    blurb: 'Sprint-slide the yard. Romanians would steal your shoes mid-slide.',
    steps: [
      {
        id: 'slides5',
        type: 'parkourStat',
        stat: 'slides',
        count: 5,
        label: 'Sprint-slide 5 times',
      },
      {
        id: 'turn_in',
        type: 'talk',
        npcId: 'max',
        label: 'Report to Max',
      },
    ],
    reward: { scrap: 320 },
  },
  roofRoyalty: {
    id: 'roofRoyalty',
    title: 'Roof Royalty',
    giver: 'max',
    blurb: "Top of Max's course. Highest crate. No excuses.",
    steps: [
      {
        id: 'summit',
        type: 'reachHeight',
        height: 2.4,
        label: "Stand on Max's top platform (≥2.4m)",
      },
      {
        id: 'high3',
        type: 'parkourStat',
        stat: 'highLands',
        count: 3,
        label: 'Land on elevated surfaces 3 times',
      },
      {
        id: 'turn_in',
        type: 'talk',
        npcId: 'max',
        label: 'Flex on Max',
      },
    ],
    reward: { scrap: 450 },
  },

  /** Duke — cowboy outfit unlock */
  trueAmerican: {
    id: 'trueAmerican',
    title: 'True American',
    giver: 'duke',
    blurb: 'Show Duke you can hold your own. Outfit on the line.',
    steps: [
      {
        id: 'kills15',
        type: 'getKills',
        count: 15,
        label: 'Get 15 kills in a single run',
      },
      {
        id: 'turn_in',
        type: 'talk',
        npcId: 'duke',
        label: 'Report to Duke',
      },
    ],
    reward: { scrap: 300, unlockOutfit: 'cowboy' },
  },

  /** 13 Years — bitter friendship gauntlet */
  thirteenYears: {
    id: 'thirteenYears',
    title: '13 Years',
    giver: 'thirteenYears',
    blurb: 'Survive to round 13. No excuses. No burnout.',
    steps: [
      {
        id: 'survive13',
        type: 'surviveRound',
        round: 13,
        label: 'Reach round 13 in a deploy',
      },
      {
        id: 'turn_in',
        type: 'talk',
        npcId: 'thirteenYears',
        label: 'Report to 13 Years',
      },
    ],
    reward: { scrap: 1300 },
  },

  /** Imagine — unlocks Transit mode on accept */
  letTheGoodTimesRoll: {
    id: 'letTheGoodTimesRoll',
    title: 'Let the Good Times Roll',
    giver: 'imagine',
    blurb: 'Ride the maps. End at Pie Yard. Milk run across the whole damn world.',
    unlockOnAccept: { unlockMode: 'transit' },
    steps: [
      {
        id: 'reach_camp',
        type: 'reachTransitMap',
        mapId: 'camp',
        label: 'Reach Pie Yard in Transit mode',
      },
      {
        id: 'turn_in',
        type: 'talk',
        npcId: 'imagine',
        label: 'Tell Imagine you made it',
      },
    ],
    reward: { scrap: 900 },
  },
};

export const QUEST_LIST = Object.values(QUESTS);

export function getQuest(id) {
  return QUESTS[id] || null;
}

export function defaultQuestState() {
  return {
    active: {},
    completed: [],
    /** Lifetime counters for quest checks */
    stats: {
      windowsRebuiltAtAccept: {},
    },
  };
}

export function defaultParkourStats() {
  return { jumps: 0, slides: 0, highLands: 0, maxHeight: 0 };
}

export function stepLabel(step) {
  return step?.label || step?.id || 'Objective';
}
