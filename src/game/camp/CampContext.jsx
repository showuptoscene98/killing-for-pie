import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  loadCamp,
  saveCamp,
  resetCamp,
  buyUpgrade,
  bankFromRun,
  getCampBonuses,
  canBuyUpgrade,
  upgradeCost,
  CAMP_UPGRADES,
  isOutfitUnlocked,
  isPartUnlocked,
  resolvePlayableOutfitId,
  stripLockedParts,
} from './campData';
import {
  DEFAULT_OUTFIT_ID,
  DEFAULT_OUTFIT_COLOR,
  DEFAULT_OUTFIT_GENDER,
  CUSTOM_OUTFIT_ID,
  isCustomOutfitId,
  getOutfit,
  getOutfitColor,
  getOutfitGender,
  loadoutFromCamp,
  loadoutFromPreset,
  packLoadout,
  normalizeLoadout,
  resolveBodyStyleId,
  syncLegacyOutfitFields,
} from '../player/outfits';
import {
  acceptQuest as acceptQuestFn,
  turnInQuest as turnInQuestFn,
  onTalkNpc,
  onRunDeposited,
  onUpgradePurchased,
  onParkourEvent,
  getQuestLog,
} from './questSystem';

const CampContext = createContext(null);

function persistCustomLoadout(prev, patchLoadout) {
  const base = loadoutFromCamp(prev);
  const nextLoadout = normalizeLoadout({
    ...base,
    ...patchLoadout,
    extras: patchLoadout.extras ?? base.extras,
  });
  const packed = packLoadout(nextLoadout);
  const next = {
    ...prev,
    outfitId: CUSTOM_OUTFIT_ID,
    outfitLoadout: packed,
    customLoadout: packed,
    outfitColor: nextLoadout.color,
    outfitYarmulke: !!nextLoadout.extras.yarmulke,
  };
  stripLockedParts(next);
  syncLegacyOutfitFields(next);
  saveCamp(next);
  return next;
}

function persistPresetOutfit(prev, outfitId, colorId) {
  const id = resolveBodyStyleId(outfitId);
  const color = getOutfitColor(colorId ?? prev.outfitColor).id;
  const nextLoadout = loadoutFromPreset(id, color);
  const packed = packLoadout(nextLoadout);
  const next = {
    ...prev,
    outfitId: id,
    outfitLoadout: packed,
    outfitColor: color,
    outfitYarmulke: !!nextLoadout.extras.yarmulke,
  };
  stripLockedParts(next);
  syncLegacyOutfitFields(next);
  saveCamp(next);
  return next;
}

export function CampProvider({ children }) {
  const [camp, setCamp] = useState(() => loadCamp());
  const [lastRun, setLastRun] = useState(null);

  const refreshCamp = useCallback(() => {
    setCamp(loadCamp());
  }, []);

  const purchase = useCallback((upgradeId) => {
    setCamp((prev) => {
      if (!canBuyUpgrade(prev, upgradeId)) return prev;
      let next = buyUpgrade(prev, upgradeId);
      next = onUpgradePurchased(next, upgradeId);
      saveCamp(next);
      return next;
    });
  }, []);

  const acceptQuest = useCallback((questId) => {
    setCamp((prev) => {
      const next = acceptQuestFn(prev, questId);
      saveCamp(next);
      return next;
    });
  }, []);

  const turnInQuest = useCallback((questId) => {
    setCamp((prev) => {
      const { camp: next } = turnInQuestFn(prev, questId);
      saveCamp(next);
      return next;
    });
  }, []);

  const talkNpc = useCallback((npcId) => {
    setCamp((prev) => {
      const next = onTalkNpc(prev, npcId);
      saveCamp(next);
      return next;
    });
  }, []);

  /** Select a named preset (locked look) or Custom (mix mode) */
  const setOutfit = useCallback((outfitId) => {
    const rawId = typeof outfitId === 'string' ? outfitId : getOutfit(outfitId).id;
    setCamp((prev) => {
      if (isCustomOutfitId(rawId)) {
        const seed =
          prev.customLoadout && typeof prev.customLoadout === 'object'
            ? normalizeLoadout(prev.customLoadout)
            : isCustomOutfitId(prev.outfitId)
              ? loadoutFromCamp(prev)
              : loadoutFromPreset(
                  resolveBodyStyleId(prev.outfitId),
                  prev.outfitColor || DEFAULT_OUTFIT_COLOR
                );
        // Drop locked palette body if needed
        if (!isOutfitUnlocked(prev, seed.body)) {
          seed.body = DEFAULT_OUTFIT_ID;
        }
        return persistCustomLoadout(prev, seed);
      }

      if (!isOutfitUnlocked(prev, rawId)) return prev;
      const next = { ...prev };
      // Remember mix when leaving Custom
      if (isCustomOutfitId(prev.outfitId)) {
        next.customLoadout = packLoadout(loadoutFromCamp(prev));
      }
      return persistPresetOutfit(next, rawId, next.outfitColor);
    });
  }, []);

  /** Custom only — change color palette body style */
  const setOutfitStyle = useCallback((styleId) => {
    const id = resolveBodyStyleId(styleId);
    setCamp((prev) => {
      if (!isCustomOutfitId(prev.outfitId)) return prev;
      if (!isOutfitUnlocked(prev, id)) return prev;
      return persistCustomLoadout(prev, { body: id });
    });
  }, []);

  const setOutfitColor = useCallback((colorId) => {
    const id = getOutfitColor(colorId).id;
    setCamp((prev) => {
      if (isCustomOutfitId(prev.outfitId)) {
        return persistCustomLoadout(prev, { color: id });
      }
      return persistPresetOutfit(prev, prev.outfitId, id);
    });
  }, []);

  const setOutfitHead = useCallback((headId) => {
    setCamp((prev) => {
      if (!isCustomOutfitId(prev.outfitId)) return prev;
      return persistCustomLoadout(prev, { head: headId });
    });
  }, []);

  const setOutfitFace = useCallback((faceId) => {
    setCamp((prev) => {
      if (!isCustomOutfitId(prev.outfitId)) return prev;
      if (!isPartUnlocked(prev, 'face', faceId)) return prev;
      return persistCustomLoadout(prev, { face: faceId });
    });
  }, []);

  const setOutfitHands = useCallback((handsId) => {
    setCamp((prev) => {
      if (!isCustomOutfitId(prev.outfitId)) return prev;
      return persistCustomLoadout(prev, { hands: handsId });
    });
  }, []);

  const setOutfitExtra = useCallback((extraId, on) => {
    setCamp((prev) => {
      if (!isCustomOutfitId(prev.outfitId)) return prev;
      if (on && !isPartUnlocked(prev, 'extra', extraId)) return prev;
      const base = loadoutFromCamp(prev);
      const extras = { ...base.extras };
      if (on) extras[extraId] = true;
      else delete extras[extraId];
      return persistCustomLoadout(prev, { extras });
    });
  }, []);

  const setOutfitLoadout = useCallback((loadout) => {
    setCamp((prev) => {
      const n = normalizeLoadout(loadout, DEFAULT_OUTFIT_ID);
      if (!isOutfitUnlocked(prev, n.body)) return prev;
      if (!isCustomOutfitId(prev.outfitId) && prev.outfitId !== n.body) {
        // Applying full loadout implies Custom mode
      }
      return persistCustomLoadout(prev, n);
    });
  }, []);

  const setOutfitYarmulke = useCallback((on) => {
    setCamp((prev) => {
      if (!isCustomOutfitId(prev.outfitId)) return prev;
      if (on && !isPartUnlocked(prev, 'extra', 'yarmulke')) return prev;
      const base = loadoutFromCamp(prev);
      const extras = { ...base.extras };
      if (on) extras.yarmulke = true;
      else delete extras.yarmulke;
      return persistCustomLoadout(prev, { extras });
    });
  }, []);

  const setOutfitGender = useCallback((genderId) => {
    const id = getOutfitGender(genderId).id;
    setCamp((prev) => {
      const next = { ...prev, outfitGender: id };
      saveCamp(next);
      return next;
    });
  }, []);

  const depositRun = useCallback((runStats) => {
    const prev = loadCamp();
    const { camp: banked, earned, achievements } = bankFromRun(prev, runStats);
    const next = onRunDeposited(banked, {
      round: runStats.round || 0,
      kills: runStats.kills || 0,
      earned,
    });
    saveCamp(next);
    setCamp(next);
    const summary = { ...runStats, earned, achievements };
    setLastRun(summary);
    return summary;
  }, []);

  const recordParkour = useCallback((event) => {
    setCamp((prev) => {
      const next = onParkourEvent(prev, event);
      saveCamp(next);
      return next;
    });
  }, []);

  const clearLastRun = useCallback(() => setLastRun(null), []);

  const wipeProgress = useCallback(() => {
    const next = resetCamp();
    setCamp(next);
    setLastRun(null);
    return next;
  }, []);

  const bonuses = useMemo(() => getCampBonuses(camp), [camp]);
  const outfitLoadout = useMemo(() => loadoutFromCamp(camp), [camp]);
  const questLog = useMemo(() => getQuestLog(camp), [camp]);

  const value = useMemo(
    () => ({
      camp,
      bonuses,
      lastRun,
      questLog,
      purchase,
      acceptQuest,
      turnInQuest,
      talkNpc,
      setOutfit,
      setOutfitStyle,
      setOutfitColor,
      setOutfitHead,
      setOutfitFace,
      setOutfitHands,
      setOutfitExtra,
      setOutfitLoadout,
      setOutfitYarmulke,
      setOutfitGender,
      depositRun,
      recordParkour,
      clearLastRun,
      refreshCamp,
      wipeProgress,
      canBuy: (id) => canBuyUpgrade(camp, id),
      costOf: (id) => upgradeCost(id, camp.levels[id] || 0),
      upgrades: CAMP_UPGRADES,
      isOutfitUnlocked: (id) => isOutfitUnlocked(camp, id),
      isPartUnlocked: (type, id) => isPartUnlocked(camp, type, id),
      outfitId: resolvePlayableOutfitId(camp, camp.outfitId || DEFAULT_OUTFIT_ID),
      outfitColor: camp.outfitColor || DEFAULT_OUTFIT_COLOR,
      outfitGender: camp.outfitGender || DEFAULT_OUTFIT_GENDER,
      outfitYarmulke: !!camp.outfitYarmulke,
      outfitLoadout,
    }),
    [
      camp,
      bonuses,
      lastRun,
      questLog,
      purchase,
      acceptQuest,
      turnInQuest,
      talkNpc,
      setOutfit,
      setOutfitStyle,
      setOutfitColor,
      setOutfitHead,
      setOutfitFace,
      setOutfitHands,
      setOutfitExtra,
      setOutfitLoadout,
      setOutfitYarmulke,
      setOutfitGender,
      depositRun,
      recordParkour,
      clearLastRun,
      refreshCamp,
      wipeProgress,
      outfitLoadout,
    ]
  );

  return <CampContext.Provider value={value}>{children}</CampContext.Provider>;
}

export function useCamp() {
  const ctx = useContext(CampContext);
  if (!ctx) throw new Error('useCamp must be used within CampProvider');
  return ctx;
}
