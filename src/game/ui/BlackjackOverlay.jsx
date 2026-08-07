import React, { useCallback, useMemo, useState } from 'react';
import { loadCamp, saveCamp } from '../camp/campData';
import { play, unlockAudio } from '../audio/sound';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const BETS = [25, 50, 100, 250, 500];

const BANTER = [
  'House likes those odds.',
  '*sips* Bold.',
  'Math is undefeated. So am I. Wait—',
  'Cards don’t care about your feelings.',
  'Whiskey says hit. Whiskey’s a liar.',
  'I’ve seen worse. I’ve also dealt worse.',
  'Scrap talks. Busts scream.',
  'Don’t chase. Chase me instead — I’m easier to catch.',
];

function freshDeck() {
  const d = [];
  for (const s of SUITS) {
    for (const r of RANKS) d.push({ rank: r, suit: s });
  }
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardValue(rank) {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
}

function handTotal(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c.rank);
    if (c.rank === 'A') aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

/** True if best total still counts an ace as 11. */
function isSoft(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c.rank);
    if (c.rank === 'A') aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return aces > 0 && total <= 21;
}

function isBlackjack(cards) {
  return cards.length === 2 && handTotal(cards) === 21;
}

function cardColor(suit) {
  return suit === '♥' || suit === '♦' ? '#c42828' : '#e8e2d4';
}

function CardFace({ card, hidden }) {
  if (hidden || !card) {
    return (
      <div className="bj-card bj-card--back" aria-hidden>
        <span>?</span>
      </div>
    );
  }
  return (
    <div className="bj-card" style={{ color: cardColor(card.suit) }}>
      <span className="bj-card-rank">{card.rank}</span>
      <span className="bj-card-suit">{card.suit}</span>
    </div>
  );
}

function HandRow({ label, cards, hideHole, total }) {
  return (
    <div className="bj-hand">
      <div className="bj-hand-meta">
        <span className="bj-hand-label">{label}</span>
        <span className="bj-hand-total">{hideHole ? '?' : total}</span>
      </div>
      <div className="bj-cards">
        {cards.map((c, i) => (
          <CardFace key={i} card={c} hidden={hideHole && i === 1} />
        ))}
      </div>
    </div>
  );
}

/**
 * Hub blackjack — bets scrap from camp.bank.
 * Blackjack 3:2, win 1:1, push returns bet. Dealer hits soft 17.
 */
export default function BlackjackOverlay({ open, bank, onClose, onBankChange }) {
  const [phase, setPhase] = useState('bet'); // bet | player | dealer | result
  const [bet, setBet] = useState(25);
  const [deck, setDeck] = useState(() => freshDeck());
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [msg, setMsg] = useState('Place a bet. House edge included free of charge.');
  const [banter, setBanter] = useState('');
  const [payout, setPayout] = useState(0);

  const playerTotal = useMemo(() => handTotal(player), [player]);
  const dealerTotal = useMemo(() => handTotal(dealer), [dealer]);
  const hideHole = phase === 'player';

  const mutateBank = useCallback(
    (delta) => {
      const camp = loadCamp();
      const next = { ...camp, bank: Math.max(0, (camp.bank || 0) + delta) };
      saveCamp(next);
      onBankChange?.(next.bank);
      return next.bank;
    },
    [onBankChange]
  );

  const draw = useCallback((from) => {
    const d = [...from];
    if (d.length < 8) {
      const refill = freshDeck();
      d.push(...refill);
    }
    const card = d.pop();
    return { card, deck: d };
  }, []);

  const resetToBet = useCallback((line) => {
    setPhase('bet');
    setPlayer([]);
    setDealer([]);
    setPayout(0);
    setMsg(line || 'Another hand? Or save what’s left of your scrap.');
    setBanter(BANTER[Math.floor(Math.random() * BANTER.length)]);
  }, []);

  const settle = useCallback(
    (pHand, dHand, wager) => {
      const p = handTotal(pHand);
      const d = handTotal(dHand);
      const pBJ = isBlackjack(pHand);
      const dBJ = isBlackjack(dHand);

      let delta = 0;
      let line = '';

      if (p > 21) {
        line = `Bust at ${p}. Sims keeps the ${wager} scrap. *toasts the bottle*`;
        delta = 0; // already deducted
      } else if (d > 21) {
        delta = wager * 2;
        line = `Dealer busts (${d}). You take ${wager} scrap. Don’t spend it all on whiskey.`;
      } else if (pBJ && !dBJ) {
        delta = wager + Math.floor(wager * 1.5);
        line = `Blackjack! 3:2 pays ${Math.floor(wager * 1.5)} scrap profit. Sims scowls into the bottle.`;
      } else if (dBJ && !pBJ) {
        line = `Dealer blackjack. ${wager} scrap evaporates like hope.`;
        delta = 0;
      } else if (pBJ && dBJ) {
        delta = wager;
        line = 'Double blackjack. Push. Bet returned. Even the cards are bored.';
      } else if (p > d) {
        delta = wager * 2;
        line = `${p} beats ${d}. You win ${wager} scrap. Beginner’s luck ages poorly.`;
      } else if (p < d) {
        line = `${d} beats ${p}. House takes ${wager}. Sip of victory for Sims.`;
        delta = 0;
      } else {
        delta = wager;
        line = `Push at ${p}. Bet returned. Nobody wins. My favorite outcome.`;
      }

      if (delta > 0) mutateBank(delta);
      setPayout(delta - wager);
      setMsg(line);
      setPhase('result');
      setBanter(BANTER[Math.floor(Math.random() * BANTER.length)]);
    },
    [mutateBank]
  );

  const deal = useCallback(() => {
    unlockAudio();
    play('menuClick');
    const wager = Math.min(bet, bank);
    if (wager < 1 || bank < 1) {
      setMsg('You’re broke. Come back when the zombies drop scrap… or when I feel charitable. I won’t.');
      return;
    }
    if (bank < wager) {
      setMsg(`Need ${wager} scrap. You’ve got ${bank}. Math again.`);
      return;
    }

    mutateBank(-wager);
    let d = freshDeck();
    const p = [];
    const dl = [];
    for (let i = 0; i < 2; i++) {
      let r = draw(d);
      p.push(r.card);
      d = r.deck;
      r = draw(d);
      dl.push(r.card);
      d = r.deck;
    }
    setDeck(d);
    setPlayer(p);
    setDealer(dl);
    setBet(wager);
    setPayout(0);

    const pBJ = isBlackjack(p);
    const dBJ = isBlackjack(dl);
    if (pBJ || dBJ) {
      settle(p, dl, wager);
      return;
    }
    setPhase('player');
    setMsg(`Bet ${wager}. Hit or stand. Dealer shows ${dl[0].rank}${dl[0].suit}.`);
    setBanter(BANTER[Math.floor(Math.random() * BANTER.length)]);
  }, [bet, bank, mutateBank, draw, settle]);

  const hit = useCallback(() => {
    unlockAudio();
    play('menuHover');
    const { card, deck: d } = draw(deck);
    const next = [...player, card];
    setDeck(d);
    setPlayer(next);
    const t = handTotal(next);
    if (t > 21) {
      settle(next, dealer, bet);
    } else {
      setMsg(`You have ${t}. Feeling clever?`);
    }
  }, [deck, player, dealer, bet, draw, settle]);

  const stand = useCallback(() => {
    unlockAudio();
    play('menuHover');
    let d = [...deck];
    let dl = [...dealer];
    // Dealer hits soft 17; stands on hard 17+
    while (handTotal(dl) < 17 || (handTotal(dl) === 17 && isSoft(dl))) {
      const r = draw(d);
      dl.push(r.card);
      d = r.deck;
      if (handTotal(dl) > 21) break;
    }
    setDeck(d);
    setDealer(dl);
    settle(player, dl, bet);
  }, [deck, dealer, player, bet, draw, settle]);

  const onPickBet = (n) => {
    unlockAudio();
    play('menuHover');
    setBet(Math.min(n, Math.max(1, bank)));
  };

  if (!open) return null;

  const canAct = phase === 'player';
  const availableBets = BETS.filter((b) => b <= bank);
  if (bank > 0 && availableBets.length === 0) availableBets.push(Math.min(bank, 25));

  return (
    <div className="hub-deploy-overlay bj-overlay" role="dialog" aria-modal="true">
      <div className="hub-deploy-panel bj-panel">
        <button type="button" className="dialogue-close" onClick={onClose}>
          Esc
        </button>
        <h2>Sims · Blackjack</h2>
        <p className="bj-sub">
          Scrap: <strong>{bank}</strong>
          {phase !== 'bet' && phase !== 'result' ? ` · Bet ${bet}` : ''}
        </p>
        {banter && <p className="bj-banter">“{banter}”</p>}

        {(phase === 'player' || phase === 'dealer' || phase === 'result') && (
          <>
            <HandRow
              label="Sims"
              cards={dealer}
              hideHole={hideHole}
              total={dealerTotal}
            />
            <HandRow label="You" cards={player} hideHole={false} total={playerTotal} />
          </>
        )}

        <p className="bj-msg">{msg}</p>
        {phase === 'result' && (
          <p className="bj-payout">
            {payout > 0 ? `+${payout} scrap` : payout < 0 ? `${payout} scrap` : '±0 scrap'}
          </p>
        )}

        {phase === 'bet' && (
          <div className="bj-actions">
            <p className="coop-section-label">Bet</p>
            <div className="hub-deploy-modes">
              {(availableBets.length ? availableBets : [25]).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`hub-mode-btn${bet === n ? ' is-selected' : ''}`}
                  disabled={n > bank}
                  onClick={() => onPickBet(n)}
                >
                  {n}
                </button>
              ))}
              {bank > 0 && (
                <button
                  type="button"
                  className={`hub-mode-btn${bet === bank ? ' is-selected' : ''}`}
                  onClick={() => onPickBet(bank)}
                >
                  All-in ({bank})
                </button>
              )}
            </div>
            <div className="bj-row">
              <button type="button" className="menu-btn" disabled={bank < 1} onClick={deal}>
                Deal
              </button>
              <button type="button" className="menu-btn menu-btn--ghost" onClick={onClose}>
                Walk away
              </button>
            </div>
          </div>
        )}

        {canAct && (
          <div className="bj-row">
            <button type="button" className="menu-btn" onClick={hit}>
              Hit
            </button>
            <button type="button" className="menu-btn" onClick={stand}>
              Stand
            </button>
          </div>
        )}

        {phase === 'result' && (
          <div className="bj-row">
            <button
              type="button"
              className="menu-btn"
              onClick={() => resetToBet('Same table. Fresh shame.')}
            >
              Play again
            </button>
            <button type="button" className="menu-btn menu-btn--ghost" onClick={onClose}>
              Cash out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
