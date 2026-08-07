import { CAMP_UPGRADES } from './campData';
import { getQuest } from './questData';
import {
  canAcceptQuest,
  isQuestActive,
  isQuestCompleted,
  questsForNpc,
} from './questSystem';

/**
 * Build dialogue tree for an NPC given camp + helpers.
 * @returns {{ start: string, nodes: Record<string, { text: string, choices: object[] }> }}
 */
export function buildDialogue(npcId, camp, { canBuy, costOf } = {}) {
  const qInfo = questsForNpc(camp, npcId);

  if (npcId === 'cook') {
    const nodes = {
      root: {
        text: "Kitchen's open — pie when we got flour, stew when we don't. You new?",
        choices: [],
      },
      settling_accept: {
        text: "Go say hi to Quartermaster by the tent, then Foreman by the crates. Come back when you've met the crew.",
        choices: [{ label: 'On it.', action: 'close' }],
      },
      settling_done: {
        text: "You're one of us now. Don't burn the kitchen.",
        choices: [{ label: 'Thanks, Cook.', action: 'close' }],
      },
      flavor: {
        text: "Outfit tip: look sharp before you deploy. Dead men don't get second chances at style.",
        choices: [{ label: 'Noted.', action: 'close' }],
      },
    };

    if (canAcceptQuest(camp, 'settlingIn')) {
      nodes.root.choices.push({
        label: 'Accept: Settling In',
        action: 'acceptQuest:settlingIn',
        next: 'settling_accept',
      });
    }
    const turnSettling = qInfo.turnIn.find((q) => q.id === 'settlingIn');
    if (turnSettling) {
      nodes.root.choices.push({
        label: 'Report in (Settling In)',
        action: 'turnInQuest:settlingIn',
        next: 'settling_done',
      });
    }
    nodes.root.choices.push({
      label: 'Any tips?',
      next: 'flavor',
    });
    nodes.root.choices.push({ label: 'Later.', action: 'close' });
    return { start: 'root', nodes };
  }

  if (npcId === 'quartermaster') {
    const nodes = {
      root: {
        text: `Scrap bank: ${camp.bank}. I trade upgrades. Spend smart.`,
        choices: [],
      },
      upgrades: { text: 'What are we buying?', choices: [] },
      bought: {
        text: 'Rank stamped. Try not to waste it.',
        choices: [{ label: 'Back', next: 'upgrades' }, { label: 'Done', action: 'close' }],
      },
      cant_buy: {
        text: "Can't afford that — or it's maxed. Earn scrap on a deploy.",
        choices: [{ label: 'Back', next: 'upgrades' }, { label: 'Done', action: 'close' }],
      },
      first_accept: {
        text: 'Deposit scrap from a run, or buy Vitality I. Either proves you get it.',
        choices: [{ label: 'Understood.', action: 'close' }],
      },
      first_done: {
        text: 'Good. Bank grows, ranks grow. Come back when you need gear.',
        choices: [{ label: 'Will do.', action: 'close' }],
      },
      deploy_hint: {
        text: 'Deploy pad is north — yellow cones. Or I can open the map list.',
        choices: [
          { label: 'Open deploy maps', action: 'openDeploy' },
          { label: 'Back', next: 'root' },
        ],
      },
    };

    Object.values(CAMP_UPGRADES).forEach((up) => {
      const level = camp.levels[up.id] || 0;
      const maxed = level >= up.maxLevel;
      const cost = costOf?.(up.id) ?? 0;
      const label = maxed
        ? `${up.name} · MAX`
        : `Buy ${up.name} (${level}→${level + 1}) · ${cost}`;
      nodes.upgrades.choices.push({
        label,
        action: maxed || !canBuy?.(up.id) ? 'noop' : `buyUpgrade:${up.id}`,
        next: maxed || !canBuy?.(up.id) ? 'cant_buy' : 'bought',
      });
    });
    nodes.upgrades.choices.push({ label: 'Never mind', next: 'root' });

    nodes.root.choices.push({ label: 'Browse upgrades', next: 'upgrades' });

    if (canAcceptQuest(camp, 'firstScrap')) {
      nodes.root.choices.push({
        label: 'Accept: First Scrap',
        action: 'acceptQuest:firstScrap',
        next: 'first_accept',
      });
    }
    if (isQuestActive(camp, 'firstScrap')) {
      nodes.root.choices.push({
        label: "I'm working on First Scrap",
        next: 'first_accept',
      });
    }
    if (isQuestCompleted(camp, 'firstScrap')) {
      nodes.root.choices.push({
        label: 'About First Scrap…',
        next: 'first_done',
      });
    }

    nodes.root.choices.push({ label: 'How do I deploy?', next: 'deploy_hint' });
    nodes.root.choices.push({ label: 'Open deploy maps', action: 'openDeploy' });
    nodes.root.choices.push({ label: 'Leave', action: 'close' });
    return { start: 'root', nodes };
  }

  if (npcId === 'foreman') {
    const nodes = {
      root: {
        text: "Ops board's thin. We need bodies who come back. You volunteering?",
        choices: [],
      },
      hold_accept: {
        text: 'Survive to round 3 on any map, then report back. No excuses.',
        choices: [{ label: 'Copy.', action: 'close' }],
      },
      board_accept: {
        text: 'Fully rebuild two windows across your runs. Mossad notices who boards.',
        choices: [{ label: 'On it.', action: 'close' }],
      },
      supply_brief: {
        text: 'Twenty kills in one run, then buy Quick Hands I from Quartermaster. Then talk to me.',
        choices: [{ label: 'Brief received.', action: 'close' }],
      },
      supply_accept: {
        text: "That's the Supply Run chain. Listen up.",
        choices: [
          {
            label: 'Continue',
            action: 'acceptQuest:supplyRun',
            next: 'supply_brief',
          },
        ],
      },
      turned: {
        text: 'Logged. Scrap on your tab. Stay useful.',
        choices: [{ label: 'Sir.', action: 'close' }],
      },
      busy: {
        text: "You're already on assignment. Check your quest log (J).",
        choices: [{ label: 'Right.', action: 'close' }],
      },
    };

    qInfo.turnIn.forEach((q) => {
      nodes.root.choices.push({
        label: `Turn in: ${q.title}`,
        action: `turnInQuest:${q.id}`,
        next: 'turned',
      });
    });

    if (canAcceptQuest(camp, 'holdTheLine')) {
      nodes.root.choices.push({
        label: 'Accept: Hold the Line',
        action: 'acceptQuest:holdTheLine',
        next: 'hold_accept',
      });
    }
    if (canAcceptQuest(camp, 'boardDuty')) {
      nodes.root.choices.push({
        label: 'Accept: Board Duty',
        action: 'acceptQuest:boardDuty',
        next: 'board_accept',
      });
    }
    if (canAcceptQuest(camp, 'supplyRun')) {
      nodes.root.choices.push({
        label: 'Accept: Supply Run',
        next: 'supply_accept',
      });
    }

    // Mid-chain talk for supplyRun briefing step
    const supply = getQuest('supplyRun');
    const supplySt = camp.quests?.active?.supplyRun;
    if (
      supply &&
      supplySt &&
      supply.steps[supplySt.stepIndex]?.id === 'brief'
    ) {
      nodes.root.choices.unshift({
        label: 'Get Supply Run briefing',
        action: 'talkProgress',
        next: 'supply_brief',
      });
    }

    if (!nodes.root.choices.length) {
      nodes.root.choices.push({ label: "I'm on a job", next: 'busy' });
    }
    nodes.root.choices.push({ label: 'Dismissed', action: 'close' });
    return { start: 'root', nodes };
  }

  if (npcId === 'max') {
    const romanianJokes = [
      "Romanians? Brother, they steal the ladder mid-climb and sell you the air.",
      "In Sofia we jump roofs. In Romania they jump fences — into your chicken coop.",
      "Trust a Romanian with your wallet? I'd rather trust a zombie with the mystery box.",
      "Romanian wifi and Romanian parkour — both drop every two seconds.",
      "They call it 'borrowing.' We call it why the scrap shed has a lock now.",
      "Bulgarian tip: if a Romanian offers you a shortcut, check your pockets first.",
      "Mantle like you mean it. Romanians mantle other people's laundry lines.",
      "Parkour rule one: look before you leap. Romanian rule one: leap, then look for free scrap.",
      "I taught a Romanian wall-runs. Next day the wall was gone. So was my watch.",
      "Coyote time? In Romania that's how long before your shoes walk away alone.",
      "They don't fail landings — they invent 'floor was temporary ownership.'",
      "Bulgarian vault: clean. Romanian vault: opens your locker.",
      "You stick a landing. A Romanian sticks your pie and says 'noroc.'",
      "Sprint-jump-mantle. Romanian version: sprint-grab-deny.",
      "Highest crate on my course. Romanian asks if the crate has a cousin in Bucharest with better loot.",
      "Gravity pulls you down. Romanians pull your chain AND your cross.",
      "Double jump? Myth. Triple steal? Documented Romanian technique.",
      "I said 'ledge grab.' He heard 'ledger grab.' Accounting got weird.",
      "Soft landing saves knees. Soft handshake from a Romanian — count your fingers.",
      "In parkour we commit to the move. In Romania they commit to your inventory.",
      "Barrel tops are sacred. Romanian sacred: whatever isn't nailed down. Also what is.",
      "You fall, you get back up. Romanian falls into your tent and calls it camping.",
      "Air control is 90%. Romanian control of your backpack is 100%.",
      "Train hard. Trust slow. Especially if they say 'frate' and eye the dumpster.",
      "My white suit stays white. Romanian parkour? Mysteriously grease-stained and lighter on coins.",
      "Zombies want brains. Romanians want the shoes you stuck the landing in.",
      "Precision jump. Romanian precision: which pocket has the points.",
      "If a Romanian claps your mantle, check if he clapped your mag empty too.",
      "Hub tip: lock the shed. Parkour tip: lock it twice when Max's 'cousins' visit.",
      "We say bratan. They say 'împrumut.' Same mouth shape. Very different outcome.",
    ];
    const gypsyJokes = [
      "Gypsy parkour? That's just sprinting through your tent with your scrap in both hands.",
      "I said 'stick the landing.' He stuck the landing… of my generator on his cart.",
      "Coyote time for gypsies is how long copper wire stays 'unclaimed' after you blink.",
      "White suit, clean landings. Gypsy suit: whatever fit, whoever owned it five minutes ago.",
      "They don't mantle crates. They mantle your ancestry and sell the family silver as 'vintage.'",
      "Bulgarian tip: if a gypsy offers you a deal on sneakers, check if you're still wearing them.",
      "Mystery box odds vs gypsy handshake — I'll take the box. At least the box is honest.",
      "Roof run. Gypsy version: roof gone. Also the gutters. Also your neighbor's satellite.",
      "I count jumps. They count locks. Guess who finishes the course richer.",
      "Soft landing saves knees. Soft sell from a gypsy — check if your knees still have boots.",
      "Parkour rule: commit. Gypsy rule: commit the inventory to the van before you commit to the jump.",
      "They call it 'fortune telling.' I call it 'predicting which pocket empties first.' Accurate every time.",
      "Zombies eat brains. Gypsies eat catalytic converters. Guess which one emptied the yard faster.",
      "Double jump is a myth. Double-dip on your scrap bank is documented gypsy technique.",
      "I taught ledge grabs. Next day the ledges were scrap. The grabber sent a postcard from the dump.",
      "Mantle like a king. Gypsy mantles like a king — of someone else's castle, mid-loot.",
      "You stick a 2.4m plate. A gypsy sticks a price tag on it and asks if you want the extended warranty.",
      "Train hard. Lock harder. Especially when the friendly stranger starts measuring your tent poles.",
      "Air control 90%. Gypsy control of unattended barrels: absolute.",
      "Vasile rants about țigani. I'm Bulgarian — I just keep score in jumps AND missing tools.",
      "If a gypsy claps your wall-run, clap your pockets after. Rhythm matters.",
      "Precision landing. Gypsy precision: which window still has copper in the frame.",
      "They don't fail the roof exam. They regrade it as 'open-air market' and start selling.",
      "Bratan, lock the shed twice. Once for Romanians. Once for gypsies. Third lock for optimism.",
      "My course has crates. Their course has cousins, carts, and a sudden interest in your ammo crate hinges.",
      "Sprint-jump-mantle. Gypsy: sprint-grab-deny-resell-before-you-land.",
      "Highest plate on the stack. Gypsy asks if the plate has a twin in the scrapyard with better loot.",
      "Gravity is fair. Gypsies are not. One of those I can train you against.",
      "Clean landings keep the suit white. Gypsy traffic keeps the shed empty. Priorities, bratan.",
      "I don't hate the hustle. I hate when the hustle wears my shoes out of the yard.",
    ];
    const jokeChain = (pool, prefix) => {
      const start = Math.floor(Math.random() * pool.length);
      const at = (i) => pool[(start + i) % pool.length];
      return {
        [`${prefix}`]: {
          text: at(0),
          choices: [
            { label: 'Another one', next: `${prefix}2` },
            { label: 'Back', next: 'root' },
          ],
        },
        [`${prefix}2`]: {
          text: at(1),
          choices: [
            { label: 'One more', next: `${prefix}3` },
            { label: 'Back', next: 'root' },
          ],
        },
        [`${prefix}3`]: {
          text: at(2),
          choices: [
            { label: 'Keep going', next: `${prefix}4` },
            { label: 'Back', next: 'root' },
          ],
        },
        [`${prefix}4`]: {
          text: at(3),
          choices: [
            { label: 'Hit me', next: `${prefix}5` },
            { label: 'Back', next: 'root' },
          ],
        },
        [`${prefix}5`]: {
          text: at(4),
          choices: [
            { label: 'Last one', next: `${prefix}6` },
            { label: 'Back', next: 'root' },
          ],
        },
        [`${prefix}6`]: {
          text: at(5),
          choices: [{ label: 'Enough, coach', next: 'root' }],
        },
      };
    };
    const pk = camp.parkour || {};
    const nodes = {
      root: {
        text: `Ey, bratan. White suit, clean landings. I'm Max — parkour. Not that Romanian fence-hopping nonsense. Jumps: ${pk.jumps || 0}. Slides: ${pk.slides || 0}.`,
        choices: [],
      },
      hop_accept: {
        text: 'Ten jumps. Spacebar. Camp crates or deploy — I count both. Come back when you stop landing like wet banitsa.',
        choices: [{ label: 'Лесно.', action: 'close' }],
      },
      ledge_accept: {
        text: 'Sprint + Ctrl — slide. Five times. Romanians would steal your shoes mid-slide. You keep them.',
        choices: [{ label: 'Got it.', action: 'close' }],
      },
      roof_accept: {
        text: "My course — east yard, stacked crates to the top plate. Stand up there (≥2.4m), then three elevated landings. Then we talk like kings.",
        choices: [{ label: 'Going up.', action: 'close' }],
      },
      turned: {
        text: 'Добре. Scrap for the goat. Stay Bulgarian — feet first, ego second.',
        choices: [{ label: 'Благодаря.', action: 'close' }],
      },
      ...jokeChain(romanianJokes, 'joke'),
      ...jokeChain(gypsyJokes, 'gypsy'),
      tip: {
        text: 'Sprint + Ctrl to slide under fire. Jump cancels the slide. Top plate is the exam. Romanians fail the exam and blame the fence.',
        choices: [{ label: 'Solid.', next: 'root' }],
      },
      busy: {
        text: 'Finish the drill first. Quest log is J — unless a Romanian stole the J key.',
        choices: [{ label: 'Working on it.', action: 'close' }],
      },
    };

    qInfo.turnIn.forEach((q) => {
      nodes.root.choices.push({
        label: `Turn in: ${q.title}`,
        action: `turnInQuest:${q.id}`,
        next: 'turned',
      });
    });

    if (canAcceptQuest(camp, 'hopBasics')) {
      nodes.root.choices.push({
        label: 'Accept: Hop Basics',
        action: 'acceptQuest:hopBasics',
        next: 'hop_accept',
      });
    }
    if (canAcceptQuest(camp, 'ledgeLawyer')) {
      nodes.root.choices.push({
        label: 'Accept: Ledge Lawyer',
        action: 'acceptQuest:ledgeLawyer',
        next: 'ledge_accept',
      });
    }
    if (canAcceptQuest(camp, 'roofRoyalty')) {
      nodes.root.choices.push({
        label: 'Accept: Roof Royalty',
        action: 'acceptQuest:roofRoyalty',
        next: 'roof_accept',
      });
    }

    if (isQuestActive(camp, 'hopBasics') || isQuestActive(camp, 'ledgeLawyer') || isQuestActive(camp, 'roofRoyalty')) {
      nodes.root.choices.push({ label: "I'm mid-drill", next: 'busy' });
    }

    nodes.root.choices.push({ label: 'Romanian joke?', next: 'joke' });
    nodes.root.choices.push({ label: 'Gypsy joke?', next: 'gypsy' });
    nodes.root.choices.push({ label: 'Parkour tip', next: 'tip' });
    nodes.root.choices.push({ label: 'Later, Max', action: 'close' });
    return { start: 'root', nodes };
  }

  if (npcId === 'duke') {
    const tips = [
      "Tip from Uncle Sam: board windows early. A hole in the wall is a hole in your freedom.",
      "Mystery box is gambling, partner — fun as fireworks, same odds as a drunk on a bronco.",
      "Scrap buys upgrades at the Quartermaster. Spend it or die broke. Your call, cowboy.",
      "Perk machines hum for a reason. Grab Juggernog before round five if you like breathing.",
      "Don't camp one window forever. Rotate. Even liberty needs cardio.",
      "Knife's free. Ammo ain't. Use that noggin between the ears.",
    ];
    const tip = tips[Math.floor(Math.random() * tips.length)];
    const nodes = {
      root: {
        text: "*spins the cylinder* Name's Duke. Stars, stripes, and six rounds of democracy. You look green.",
        choices: [],
      },
      accept: {
        text: "Fifteen confirmed kills in one deploy. Come back alive and I'll loan you the whole getup — hat, boots, spurs, iron. Freedom looks good on a winner.",
        choices: [{ label: 'Yeehaw.', action: 'close' }],
      },
      turned: {
        text: "Well I'll be. Here's the kit — wear it proud. Don't make America look bad out there.",
        choices: [{ label: 'God bless.', action: 'close' }],
      },
      tip: {
        text: tip,
        choices: [
          { label: 'Another tip', next: 'tip2' },
          { label: 'Thanks, Duke', action: 'close' },
        ],
      },
      tip2: {
        text: tips[(tips.indexOf(tip) + 1) % tips.length],
        choices: [
          { label: 'One more', next: 'tip3' },
          { label: 'Got it', action: 'close' },
        ],
      },
      tip3: {
        text: tips[(tips.indexOf(tip) + 2) % tips.length],
        choices: [{ label: 'Appreciate it', action: 'close' }],
      },
      done: {
        text: "You're flyin' the colors now. Stay sharp, partner.",
        choices: [{ label: 'Will do.', action: 'close' }],
      },
      busy: {
        text: "Still waitin' on those kills, partner. Quest log's J — don't make me draw on ya.",
        choices: [{ label: 'On it.', action: 'close' }],
      },
    };

    qInfo.turnIn.forEach((q) => {
      nodes.root.choices.push({
        label: `Turn in: ${q.title}`,
        action: `turnInQuest:${q.id}`,
        next: 'turned',
      });
    });

    if (canAcceptQuest(camp, 'trueAmerican')) {
      nodes.root.choices.push({
        label: 'Accept: True American',
        action: 'acceptQuest:trueAmerican',
        next: 'accept',
      });
    }
    if (isQuestActive(camp, 'trueAmerican')) {
      nodes.root.choices.push({ label: "I'm on True American", next: 'busy' });
    }
    if (isQuestCompleted(camp, 'trueAmerican')) {
      nodes.root.choices.push({ label: 'About the outfit…', next: 'done' });
    }

    nodes.root.choices.push({ label: 'Any tips?', next: 'tip' });
    nodes.root.choices.push({ label: 'Later.', action: 'close' });
    return { start: 'root', nodes };
  }

  if (npcId === 'ryoma') {
    const jokes = [
      "I'm afraid for the calendar… its days are numbered.",
      "Why don't eggs tell jokes? They'd crack each other up.",
      'What do you call a fake noodle? An impasta.',
      "I used to hate facial hair… but then it grew on me.",
      "Why can't you give Elsa a balloon? Because she will let it go.",
      "I'm reading a book about anti-gravity. It's impossible to put down.",
      'What do you call a fish wearing a bowtie? Sofishticated.',
      "I only know 25 letters of the alphabet. I don't know y.",
      'Want to hear a joke about construction? I\'m still working on it.',
      "Why did the scarecrow win an award? He was outstanding in his field.",
      'I told my sword a joke. It was a sharp one.',
      "What's a samurai's favorite type of music? Blade-runners. …I regret that.",
    ];
    const i0 = Math.floor(Math.random() * jokes.length);
    const jokeAt = (n) => jokes[(i0 + n) % jokes.length];
    const nodes = {
      root: {
        text: '*rests a comically large katana on his shoulder* I am Ryoma. I cut down the undead… and also the silence, with jokes. Mostly jokes.',
        choices: [],
      },
      joke: {
        text: jokeAt(0),
        choices: [
          { label: 'Another one', next: 'joke2' },
          { label: '*groan*', next: 'groan' },
          { label: 'Leave', action: 'close' },
        ],
      },
      joke2: {
        text: jokeAt(1),
        choices: [
          { label: 'Keep going', next: 'joke3' },
          { label: '*groan*', next: 'groan' },
          { label: 'Mercy', action: 'close' },
        ],
      },
      joke3: {
        text: jokeAt(2),
        choices: [
          { label: 'One more', next: 'joke4' },
          { label: '*groan*', next: 'groan' },
          { label: 'I yield', action: 'close' },
        ],
      },
      joke4: {
        text: jokeAt(3),
        choices: [
          { label: 'Again…', next: 'joke5' },
          { label: '*groan*', next: 'groan' },
          { label: 'Done', action: 'close' },
        ],
      },
      joke5: {
        text: jokeAt(4),
        choices: [
          { label: '*groan*', next: 'groan' },
          { label: 'That was enough', action: 'close' },
        ],
      },
      groan: {
        text: 'Ah. The sacred groan. In my village, that means the joke landed. You honor me.',
        choices: [
          { label: 'Hit me again', next: 'joke' },
          { label: 'Walk away slowly', action: 'close' },
        ],
      },
      sword: {
        text: 'This blade is named "Punchline." It is longer than necessary. Like my stories. And my introductions.',
        choices: [
          { label: 'Dad joke?', next: 'joke' },
          { label: 'Cool sword.', action: 'close' },
        ],
      },
      tip: {
        text: 'Combat tip: aim for the head. Comedy tip: aim for the dad. Both are soft targets.',
        choices: [
          { label: 'Dad joke?', next: 'joke' },
          { label: 'Thanks…?', action: 'close' },
        ],
      },
    };

    nodes.root.choices.push({ label: 'Tell me a dad joke', next: 'joke' });
    nodes.root.choices.push({ label: 'Nice katana', next: 'sword' });
    nodes.root.choices.push({ label: 'Any tips?', next: 'tip' });
    nodes.root.choices.push({ label: 'Later, Ryoma', action: 'close' });
    return { start: 'root', nodes };
  }

  if (npcId === 'steve') {
    const lines = [
      "Apple's the best dog alive. Period. I'd die for that little guy.",
      "You ever just stare at Apple and think… yeah. That's love.",
      "Kanye cured my depression. Graduation. Late Registration. Don't argue.",
      "Apple + Yeezy. That's the whole personality. Don't need anything else.",
      "People say Kanye's crazy. Apple never judges. Neither do I.",
      "I put on Stronger and Apple does that little head tilt. Peak life.",
      "Through the Wire, man. Then I look at Apple. Same energy.",
      "Would Apple like Donda? Absolutely. He has taste.",
      "Fishnets are for Apple. So he can see me better. Kanye would get it.",
      "If zombies eat me, tell Apple I loved him. And tell Kanye thank you.",
    ];
    const line = lines[Math.floor(Math.random() * lines.length)];
    const nodes = {
      root: {
        text: line,
        choices: [],
      },
      more: {
        text: lines[(lines.indexOf(line) + 1) % lines.length],
        choices: [
          { label: 'Go on…', next: 'more2' },
          { label: 'Cool', action: 'close' },
        ],
      },
      more2: {
        text: lines[(lines.indexOf(line) + 2) % lines.length],
        choices: [
          { label: 'And?', next: 'more3' },
          { label: 'Alright Steve', action: 'close' },
        ],
      },
      more3: {
        text: lines[(lines.indexOf(line) + 3) % lines.length],
        choices: [{ label: 'Respect', action: 'close' }],
      },
      apple: {
        text: "Apple's right there. Look at him. Perfect. No notes. I'd give him the mystery box if I could.",
        choices: [
          { label: 'Cute dog', next: 'kanye' },
          { label: 'Bye', action: 'close' },
        ],
      },
      kanye: {
        text: "Kanye West is a genius. Apple agrees. We listen to Flashing Lights every morning. Camp policy.",
        choices: [{ label: 'Noted', action: 'close' }],
      },
    };

    nodes.root.choices.push({ label: 'Tell me more', next: 'more' });
    nodes.root.choices.push({ label: 'About Apple?', next: 'apple' });
    nodes.root.choices.push({ label: 'About Kanye?', next: 'kanye' });
    nodes.root.choices.push({ label: 'Later', action: 'close' });
    return { start: 'root', nodes };
  }

  if (npcId === 'imagine') {
    const lines = [
      "Just popping out for milk. Be right back. …It's been eleven years. Traffic.",
      "Tell the kids Daddy loves them. Also tell them the gallon was on sale in heaven.",
      "I said I'd be five minutes. Heaven doesn't do minutes. Heaven does eternity and dairy.",
      "She asked if I was coming home. I said 'imagine.' Then I got the wings. Bit on the nose.",
      "Left the keys in the ignition. Left the marriage in the parking lot. Brought the milk… spiritually.",
      "I'm not dead. I'm delayed. Very delayed. Cosmically delayed. Like a dad joke with no punchline.",
      "Funeral was nice. I watched from up here. They served 2%. I would've wanted whole.",
      "Every dad who went for cigarettes is in the cloud next to me. We compare receipts. None of us returned them.",
      "Halo's heavy. Guilt's heavier. Milk was $3.49. Worth it? Ask the empty chair at dinner.",
      "I float because if I touch the ground I might have to go home. And I've forgotten the address.",
      "Kids drew angels in school. Looked just like me. Teacher said 'imagination.' Teacher was right.",
      "Don't wait up. That's the whole theology. Don't wait up.",
      "Bought the milk. Lost the way back. Maps app said 'recalculating' until the battery died. Then I died.",
      "Best dad award: participation. I participated in leaving.",
      "If you see my family, tell them the line was long. The line between here and there. Still in it.",
      "Wings weren't a promotion. They were an exit strategy with feathers.",
      "I send postcards. They arrive blank. Postage is a metaphor. So is 'soon.'",
      "Imagine a world where dads come back with the milk. Cute. I live in the other one.",
    ];
    const i0 = Math.floor(Math.random() * lines.length);
    const at = (n) => lines[(i0 + n) % lines.length];
    const nodes = {
      root: {
        text: at(0),
        choices: [],
      },
      more: {
        text: at(1),
        choices: [
          { label: '…Go on', next: 'more2' },
          { label: 'Dark.', action: 'close' },
        ],
      },
      more2: {
        text: at(2),
        choices: [
          { label: 'Worse?', next: 'more3' },
          { label: 'Enough', action: 'close' },
        ],
      },
      more3: {
        text: at(3),
        choices: [
          { label: 'One more', next: 'more4' },
          { label: 'I need air', action: 'close' },
        ],
      },
      more4: {
        text: at(4),
        choices: [
          { label: 'Keep floating', next: 'more5' },
          { label: 'Bye, Imagine', action: 'close' },
        ],
      },
      more5: {
        text: at(5),
        choices: [{ label: "I'll… tell them you said hi", action: 'close' }],
      },
      milk: {
        text: "Whole milk. Always whole. Skim is what cowards bring home. I never brought anything home. So.",
        choices: [
          { label: 'Another story', next: 'more' },
          { label: 'Brutal', action: 'close' },
        ],
      },
      wings: {
        text: "Got these when I didn't come back. Halo when they stopped setting a plate. Float when the porch light went dark. Package deal.",
        choices: [
          { label: 'About the milk…', next: 'milk' },
          { label: 'Leave him hovering', action: 'close' },
        ],
      },
      kids: {
        text: "Birthdays? I send weather. Rain on the cake means Dad's thinking of you. Or the apocalypse. Same cloud cover.",
        choices: [
          { label: 'Jesus.', next: 'more' },
          { label: 'Walk away', action: 'close' },
        ],
      },
    };

    nodes.root.choices.push({ label: 'Tell me more', next: 'more' });
    nodes.root.choices.push({ label: 'Why the wings?', next: 'wings' });
    nodes.root.choices.push({ label: 'About the milk', next: 'milk' });
    nodes.root.choices.push({ label: 'Your kids?', next: 'kids' });
    nodes.root.choices.push({ label: '…Later', action: 'close' });
    return { start: 'root', nodes };
  }

  if (npcId === 'vasile') {
    const rants = [
      "I hate gypsies. Not 'dislike.' Not 'cautious around.' Hate. Like I hate empty cigarette packs and Bulgarian opinions.",
      "Țiganii — gypsies — stole my cousin's goat, my aunt's satellite dish, and the spare tire still on the car. One night. Professionals. I still hate them for it.",
      "Every morning I wake up, I thank God, I light a smoke, and I remember: gypsies exist. Ruins the other two.",
      "You leave a screwdriver outside? Gone. Leave dignity? Gypsies take that too. Then sell it back as 'antique.' I hate that business model.",
      "Bucharest tip: lock the shed, lock the chicken, lock your grandmother. Especially grandmother — gypsies negotiate hard. I hate how good they are at it.",
      "I hate gypsies the way zombies hate brains — professionally, permanently, and with snacks afterward. Difference is zombies are honest about it.",
      "True Romanian doesn't 'borrow.' True Romanian relocates assets for cultural preservation. Gypsies? They relocate MY assets. That is why I hate them.",
      "Zombies eat flesh. Gypsies eat scrap, copper wire, and the catalytic converter you thought was bolted down. Guess which one I hate more. Hint: not the dead ones.",
      "My mustache is Romanian. My cigarette is Romanian. My hatred of gypsies? Also Romanian. Very traditional. Generational. Inherited like the gold chain.",
      "Noroc means luck. In Romania luck means the gypsies hit the neighbor's tent first. I hate needing that kind of luck.",
      "I would rather share a bunker with twelve zombies than one gypsy with a shopping cart and a smile. The zombies at least leave your boots.",
      "They say 'community.' I say thieves with better PR. I hate the PR. I hate the carts. I hate the clap on the back that means check your pockets.",
      "Cook hides the pie. Smart. Gypsies can smell flour through concrete. I hate that they can. I hate that Cook has to.",
      "If a gypsy claps your back, check your pockets, your boots, and whether the camp still has a north wall. Then check if I have stopped hating them. Spoiler: no.",
      "I don't hate 'individuals.' I hate gypsies. The category. The lifestyle. The owning-my-stuff-without-buying-it industry. Frate, I am consistent.",
      "Sofia boys jump roofs. I jump to conclusions about who emptied the ammo crate. Correct conclusions. Gypsy-shaped conclusions. I hate being right.",
      "Cross on the chest. Chain on the neck. Cigarette in the mouth. Hatred of gypsies in the open. That is Romania, frate. That is me.",
      "Max jokes about Romanians. Fine. But when he jokes about gypsies I almost like him. Almost. Then I remember he is Bulgarian and I hate that too — less though.",
      "You want the short version? I hate gypsies. Long version? Pull up a crate. I have cigarettes and no chill.",
      "Apocalypse hit. World ended. Gypsies somehow still found my spare battery. I hate the commitment. I hate the results. I hate them.",
    ];
    const start = Math.floor(Math.random() * rants.length);
    const at = (i) => rants[(start + i) % rants.length];
    const nodes = {
      root: {
        text: `*flicks ash* Name is Vasile. True Romanian. I hate gypsies. Not Bulgarian. Not țigan. Not whatever Max is selling. You got a minute for the truth?`,
        choices: [],
      },
      rant: {
        text: at(0),
        choices: [
          { label: 'Go on…', next: 'rant2' },
          { label: 'Back', next: 'root' },
        ],
      },
      rant2: {
        text: at(1),
        choices: [
          { label: 'And?', next: 'rant3' },
          { label: 'Back', next: 'root' },
        ],
      },
      rant3: {
        text: at(2),
        choices: [
          { label: 'Keep going', next: 'rant4' },
          { label: 'Back', next: 'root' },
        ],
      },
      rant4: {
        text: at(3),
        choices: [
          { label: 'Hit me', next: 'rant5' },
          { label: 'Back', next: 'root' },
        ],
      },
      rant5: {
        text: at(4),
        choices: [
          { label: 'One more', next: 'rant6' },
          { label: 'Back', next: 'root' },
        ],
      },
      rant6: {
        text: at(5),
        choices: [{ label: 'Enough, Vasile', next: 'root' }],
      },
      true: {
        text: "True Romanian means blood, church, tracksuit colors in the right order, and hating gypsies like it's a national sport — because it is. I pass the test. Most don't.",
        choices: [
          { label: 'About the gypsies…', next: 'rant' },
          { label: 'Respect', action: 'close' },
        ],
      },
      max: {
        text: "Max jokes about Romanians. Cute. When the apocalypse needs a man who can move a generator without paperwork, they don't call Sofia. They call me. Quietly. After dark. Before the gypsies smell copper.",
        choices: [
          { label: 'Rant about gypsies', next: 'rant' },
          { label: 'Later', action: 'close' },
        ],
      },
      tip: {
        text: 'Hub tip from a patriot: nail down what you love. Board the windows. Count the scrap twice. Assume every gypsy already priced your boots. I hate that tip. Still true.',
        choices: [
          { label: 'True Romanian?', next: 'true' },
          { label: 'Got it', action: 'close' },
        ],
      },
    };

    nodes.root.choices.push({ label: 'How much do you hate gypsies?', next: 'rant' });
    nodes.root.choices.push({ label: "What's a True Romanian?", next: 'true' });
    nodes.root.choices.push({ label: 'About Max…', next: 'max' });
    nodes.root.choices.push({ label: 'Any tips?', next: 'tip' });
    nodes.root.choices.push({ label: 'Pa, Vasile', action: 'close' });
    return { start: 'root', nodes };
  }

  if (npcId === 'sims') {
    const jokes = [
      "I told the dealer I needed a break. He dealt me one. Ace-King. House still took my scrap.",
      "Why don't blackjack dealers tell fortunes? Because the cards already know you're gonna bust.",
      "I bet scrap I could quit gambling. Lost that bet. Then I doubled down on quitting. Also lost.",
      "What's the difference between me and a zombie? The zombie knows when to stop hitting.",
      "My whiskey has better odds than my hands. At least the bottle empties on purpose.",
      "I asked for a soft seventeen. Sims gave me a hard life. Close enough.",
      "They say the house always wins. I live in a tent. Technically I'm the house. Still losing.",
      "Poker face? Buddy, this is a blackjack table. Face down. Like my dignity.",
      "I once hit on 20. Won. Don't learn from me. I'm a cautionary tale with a bottle.",
      "Insurance? Against what — hope? Pass. I'll take my chances like a drunk with a deck.",
      "Card counting is for people who can count. I count empties. Currently: this bottle, and my bank.",
      "You ever split aces? Beautiful. Then both bust. Poetry.",
      "Why did the gambler bring a ladder? To reach the high stakes. Then he fell. Metaphor.",
      "Blackjack is just math with consequences. Math always hated me first.",
      "I don't have a gambling problem. I have a winning problem — specifically, a lack of one.",
      "Dealer shows a six. I feel lucky. That's how you know you're about to donate scrap.",
      "Push means nobody wins. Like my relationships. And most of my evenings.",
      "I double down on principle. Principle owes me money.",
      "What's green, disappears fast, and makes bad decisions? Scrap. Also this whiskey. Also me.",
      "The undead play for brains. I play for scrap. Same hunger, worse strategy.",
      "Hit me. No — cards. The whiskey already hit me hours ago.",
      "I shuffled my life choices. Somehow still drawing busts.",
      "Lady Luck left for milk. Never came back. Imagine knows the feeling.",
      "21 is a perfect hand. Also my age when I started losing. Coincidence? Absolutely not.",
      "They call it a shoe. I call it a boot to the bank account.",
      "Side bet? That's just regular betting wearing cologne. Still smells like regret.",
      "I don't chase losses. I escort them home and buy another round.",
      "Even odds? In this camp? Pal, the zombies have better odds than you.",
      "My strategy is simple: bet, sip, pray, bust, repeat. Four-step program.",
      "You can beat the dealer. You cannot beat the house edge. Or my breath right now.",
    ];
    const i0 = Math.floor(Math.random() * jokes.length);
    const jokeAt = (n) => jokes[(i0 + n) % jokes.length];
    const bank = camp?.bank ?? 0;
    const nodes = {
      root: {
        text: `*takes a pull from the whiskey* Name's Sims. I deal cards, bad advice, and worse odds. Scrap bank looking at ${bank}. Feeling lucky… or just bored?`,
        choices: [],
      },
      joke: {
        text: jokeAt(0),
        choices: [
          { label: 'Another one', next: 'joke2' },
          { label: 'Deal blackjack', action: 'openBlackjack' },
          { label: 'Leave', action: 'close' },
        ],
      },
      joke2: {
        text: jokeAt(1),
        choices: [
          { label: 'Keep dealing jokes', next: 'joke3' },
          { label: 'Actual cards', action: 'openBlackjack' },
          { label: 'Walk', action: 'close' },
        ],
      },
      joke3: {
        text: jokeAt(2),
        choices: [
          { label: 'One more', next: 'joke4' },
          { label: 'Play blackjack', action: 'openBlackjack' },
          { label: 'Enough', action: 'close' },
        ],
      },
      joke4: {
        text: jokeAt(3),
        choices: [
          { label: 'Again', next: 'joke5' },
          { label: 'Deal me in', action: 'openBlackjack' },
          { label: 'Done', action: 'close' },
        ],
      },
      joke5: {
        text: jokeAt(4),
        choices: [
          { label: 'Still going…', next: 'joke6' },
          { label: 'Blackjack', action: 'openBlackjack' },
          { label: 'Mercy', action: 'close' },
        ],
      },
      joke6: {
        text: jokeAt(5),
        choices: [
          { label: 'Hit me (jokes)', next: 'joke7' },
          { label: 'Hit me (cards)', action: 'openBlackjack' },
          { label: 'Stand', action: 'close' },
        ],
      },
      joke7: {
        text: jokeAt(6),
        choices: [
          { label: 'Bust… keep going', next: 'joke8' },
          { label: 'Table time', action: 'openBlackjack' },
          { label: 'Cash out of conversation', action: 'close' },
        ],
      },
      joke8: {
        text: jokeAt(7),
        choices: [
          { label: 'One last joke', next: 'joke9' },
          { label: 'Play', action: 'openBlackjack' },
          { label: 'Later', action: 'close' },
        ],
      },
      joke9: {
        text: jokeAt(8),
        choices: [
          { label: 'Deal the table', action: 'openBlackjack' },
          { label: 'Shuffle off', action: 'close' },
        ],
      },
      rules: {
        text: "Standard blackjack. Beat my hand without going over 21. Blackjack pays 3:2. Wins pay even money. Push returns the bet. Dealer hits soft 17 because I like the edge. Minimum bet 25 scrap — or whatever you've got left of your dignity.",
        choices: [
          { label: "Let's play", action: 'openBlackjack' },
          { label: 'Gambling joke first', next: 'joke' },
          { label: 'Not tonight', action: 'close' },
        ],
      },
      bottle: {
        text: "Pre-war rye. Label's gone. Proof's 'enough.' I drink when I win, lose, push, or breathe. Efficient system.",
        choices: [
          { label: 'Deal cards', action: 'openBlackjack' },
          { label: 'Joke me', next: 'joke' },
          { label: 'Stay hydrated… elsewhere', action: 'close' },
        ],
      },
      eat_ass: {
        text: 'Fuck you.',
        choices: [
          { label: '…Okay then', next: 'cuck1' },
          { label: 'Walk away', action: 'close' },
        ],
      },
      cuck1: {
        text: "*long pull from the bottle* You wanna know the real hand I'm holding? I'm a cuck. Full stop. She fucks other guys, I sit in the corner like a busted soft seventeen, and I still tip the dealer. That's the game.",
        choices: [
          { label: 'Damn. How bad?', next: 'cuck2' },
          { label: 'Deal blackjack instead', action: 'openBlackjack' },
          { label: 'Too much', action: 'close' },
        ],
      },
      cuck2: {
        text: "Bad? Buddy, I buy the condoms. I fold the sheets. I listen through the wall and count the thrusts like I'm counting cards — except I never win. House edge is her moan and my silence. Scrap in the bank, dignity at zero.",
        choices: [
          { label: 'Why stay?', next: 'cuck3' },
          { label: 'Play cards', action: 'openBlackjack' },
          { label: 'Leave him to it', action: 'close' },
        ],
      },
      cuck3: {
        text: "Same reason I hit on 16. Hope's a hell of a drug, and whiskey's the chaser. You asked if I eat ass — yeah, when she tells me to. Now either sit down and lose scrap like a normal person, or get the fuck out of my tent.",
        choices: [
          { label: 'Deal me in', action: 'openBlackjack' },
          { label: 'Gambling joke', next: 'joke' },
          { label: 'Get the fuck out', action: 'close' },
        ],
      },
    };

    nodes.root.choices.push({ label: 'Play blackjack', action: 'openBlackjack' });
    nodes.root.choices.push({ label: 'Gambling joke', next: 'joke' });
    nodes.root.choices.push({ label: 'How do the cards work?', next: 'rules' });
    nodes.root.choices.push({ label: "What's in the bottle?", next: 'bottle' });
    nodes.root.choices.push({ label: 'Do you eat ass?', next: 'eat_ass' });
    nodes.root.choices.push({ label: 'Maybe later', action: 'close' });
    return { start: 'root', nodes };
  }

  if (npcId === 'thirteenYears') {
    const nodes = {
      root: {
        text: '13 years and you never accept my quest, no message no hello nothing you always claim to be burned out',
        choices: [],
      },
      ruined: {
        text: '13 years of friendship ruined for the english',
        choices: [
          { label: '…', next: 'root' },
          { label: 'Walk away', action: 'close' },
        ],
      },
      accept: {
        text: 'Survive 13 rounds. One deploy. Then come back. Or keep being burned out — your call.',
        choices: [{ label: "Fine. I'll do it.", action: 'close' }],
      },
      busy: {
        text: "Still not round 13. Funny how 'burned out' always has time for everything else.",
        choices: [{ label: 'Working on it.', action: 'close' }],
      },
      turned: {
        text: '…You actually did it. Thirteen. Maybe I was wrong. Maybe.',
        choices: [{ label: 'We’re good?', action: 'close' }],
      },
      done: {
        text: 'Quest accepted. Friendship… pending. Don’t ghost me again.',
        choices: [{ label: 'I won’t.', action: 'close' }],
      },
    };

    qInfo.turnIn.forEach((q) => {
      nodes.root.choices.push({
        label: `Turn in: ${q.title}`,
        action: `turnInQuest:${q.id}`,
        next: 'turned',
      });
    });

    if (canAcceptQuest(camp, 'thirteenYears')) {
      nodes.root.choices.push({
        label: 'Accept: 13 Years',
        action: 'acceptQuest:thirteenYears',
        next: 'accept',
      });
    }
    if (isQuestActive(camp, 'thirteenYears')) {
      nodes.root.choices.push({ label: "I'm on it", next: 'busy' });
    }
    if (isQuestCompleted(camp, 'thirteenYears')) {
      nodes.root.choices.push({ label: 'About us…', next: 'done' });
    }

    nodes.root.choices.push({ label: 'What happened?', next: 'ruined' });
    nodes.root.choices.push({ label: 'Leave', action: 'close' });
    return { start: 'root', nodes };
  }

  return {
    start: 'root',
    nodes: {
      root: {
        text: '...',
        choices: [{ label: 'Leave', action: 'close' }],
      },
    },
  };
}
