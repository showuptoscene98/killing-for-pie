import { useCallback, useEffect, useMemo } from 'react';
import { useCamp } from '../camp/CampContext';
import {
  OUTFITS,
  BODY_STYLES,
  OUTFIT_COLORS,
  HEAD_OPTIONS,
  FACE_OPTIONS,
  HAND_OPTIONS,
  EXTRA_OPTIONS,
  isCustomOutfitId,
  bodyIndex,
  bodyIdAt,
  outfitChoiceIndex,
  outfitChoiceIdAt,
  outfitColorIndex,
  outfitColorIdAt,
  cycleHead,
  cycleFace,
  cycleHands,
  getOutfit,
  getOutfitColor,
} from '../player/outfits';
import OutfitPreview from './OutfitPreview';
import { play, unlockAudio } from '../audio/sound';

function SlotRow({ label, value, onPrev, onNext, locked }) {
  return (
    <>
      <label className="customize-label">{label}</label>
      <div className="customize-slider-row">
        <button type="button" className="customize-arrow" aria-label={`Previous ${label}`} onClick={onPrev}>
          ‹
        </button>
        <div className={`customize-slot-value${locked ? ' customize-slot-value--locked' : ''}`}>
          {value}
          {locked ? ' · LOCKED' : ''}
        </div>
        <button type="button" className="customize-arrow" aria-label={`Next ${label}`} onClick={onNext}>
          ›
        </button>
      </div>
    </>
  );
}

export default function CharacterCustomize() {
  const {
    camp,
    setOutfit,
    setOutfitStyle,
    setOutfitColor,
    setOutfitHead,
    setOutfitFace,
    setOutfitHands,
    setOutfitExtra,
    setOutfitGender,
    refreshCamp,
    isOutfitUnlocked,
    isPartUnlocked,
    outfitLoadout,
  } = useCamp();

  useEffect(() => {
    refreshCamp?.();
  }, [refreshCamp]);

  const selectedId = camp.outfitId || 'chef';
  const isCustom = isCustomOutfitId(selectedId);
  const loadout = outfitLoadout || {
    body: 'chef',
    head: 'toque',
    face: 'none',
    hands: 'gloves',
    extras: {},
    color: camp.outfitColor || 'default',
  };
  const genderId = camp.outfitGender || 'male';
  const colorId = loadout.color || 'default';
  const choiceIdx = outfitChoiceIndex(selectedId);
  const styleIdx = bodyIndex(loadout.body);
  const colorIdx = outfitColorIndex(colorId);
  const choiceMeta = getOutfit(selectedId);
  const color = getOutfitColor(colorId);
  const bodyUnlocked = isOutfitUnlocked?.(selectedId) ?? true;
  const styleUnlocked = isOutfitUnlocked?.(loadout.body) ?? true;
  const need = choiceMeta.unlock?.windowsRebuilt ?? 0;
  const progress = Math.min(camp.windowsRebuilt || 0, need || 0);

  const headName = HEAD_OPTIONS.find((h) => h.id === loadout.head)?.name || 'None';
  const faceName = FACE_OPTIONS.find((f) => f.id === loadout.face)?.name || 'None';
  const handsName = HAND_OPTIONS.find((h) => h.id === loadout.hands)?.name || 'Gloves';
  const styleName = BODY_STYLES.find((b) => b.id === loadout.body)?.name || 'Chef';
  const faceLocked = !(isPartUnlocked?.('face', loadout.face) ?? true);

  const click = useCallback((fn) => {
    unlockAudio();
    play('menuHover');
    fn();
  }, []);

  const browseOutfit = useCallback(
    (nextIdx) => {
      click(() => {
        const n = OUTFITS.length;
        let idx = ((nextIdx % n) + n) % n;
        const dir = nextIdx >= choiceIdx ? 1 : -1;
        for (let i = 0; i < n; i += 1) {
          const id = outfitChoiceIdAt(idx);
          if (isCustomOutfitId(id) || (isOutfitUnlocked?.(id) ?? true)) {
            setOutfit(id);
            return;
          }
          idx = (idx + dir + n) % n;
        }
      });
    },
    [click, setOutfit, isOutfitUnlocked, choiceIdx]
  );

  const browseStyle = useCallback(
    (nextIdx) => {
      click(() => {
        const n = BODY_STYLES.length;
        let idx = ((nextIdx % n) + n) % n;
        const dir = nextIdx >= styleIdx ? 1 : -1;
        for (let i = 0; i < n; i += 1) {
          const id = bodyIdAt(idx);
          if (isOutfitUnlocked?.(id) ?? true) {
            setOutfitStyle?.(id);
            return;
          }
          idx = (idx + dir + n) % n;
        }
      });
    },
    [click, setOutfitStyle, isOutfitUnlocked, styleIdx]
  );

  const extrasOn = useMemo(() => loadout.extras || {}, [loadout.extras]);

  return (
    <div className="customize-panel customize-panel--mix">
      <p className="menu-eyebrow">Loadout look</p>
      <h2 className="customize-title">Character</h2>
      <OutfitPreview outfitLoadout={loadout} outfitGender={genderId} />
      <div className="customize-meta">
        <span className="customize-name">
          {isCustom ? `Custom · ${styleName}` : choiceMeta.name} · {color.name}
          {!bodyUnlocked && <span className="customize-lock"> LOCKED</span>}
        </span>
        <span className="customize-desc">
          {isCustom
            ? 'Mix head, face, hands & accessories'
            : 'Default look — pick Custom to mix parts'}
        </span>
        {!bodyUnlocked && need > 0 && (
          <span className="customize-unlock">
            {choiceMeta.unlockHint || `Rebuild ${need} windows`} — {progress}/{need}
          </span>
        )}
      </div>

      <label className="customize-label">Gender</label>
      <div className="customize-gender-row">
        <button
          type="button"
          className={`customize-toggle${genderId === 'male' ? ' customize-toggle--on' : ''}`}
          onClick={() => click(() => setOutfitGender('male'))}
          aria-pressed={genderId === 'male'}
        >
          Male
        </button>
        <button
          type="button"
          className={`customize-toggle${genderId === 'female' ? ' customize-toggle--on' : ''}`}
          onClick={() => click(() => setOutfitGender('female'))}
          aria-pressed={genderId === 'female'}
        >
          Female
        </button>
      </div>

      <SlotRow
        label="Outfit"
        value={isCustom ? 'Custom' : choiceMeta.name}
        onPrev={() => browseOutfit(choiceIdx - 1)}
        onNext={() => browseOutfit(choiceIdx + 1)}
        locked={!bodyUnlocked}
      />
      <div className="customize-dots">
        {OUTFITS.map((o, i) => {
          const on = i === choiceIdx;
          const locked = !isCustomOutfitId(o.id) && !(isOutfitUnlocked?.(o.id) ?? true);
          return (
            <button
              key={o.id}
              type="button"
              className={`customize-dot${on ? ' customize-dot--on' : ''}${locked ? ' customize-dot--locked' : ''}`}
              aria-label={o.name}
              onClick={() => browseOutfit(i)}
            />
          );
        })}
      </div>

      {isCustom && (
        <>
          <SlotRow
            label="Base style"
            value={styleName}
            onPrev={() => browseStyle(styleIdx - 1)}
            onNext={() => browseStyle(styleIdx + 1)}
            locked={!styleUnlocked}
          />
          <div className="customize-dots">
            {BODY_STYLES.map((o, i) => {
              const on = i === styleIdx;
              const locked = !(isOutfitUnlocked?.(o.id) ?? true);
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`customize-dot${on ? ' customize-dot--on' : ''}${locked ? ' customize-dot--locked' : ''}`}
                  aria-label={o.name}
                  onClick={() => browseStyle(i)}
                />
              );
            })}
          </div>

          <SlotRow
            label="Head"
            value={headName}
            onPrev={() => click(() => setOutfitHead(cycleHead(loadout.head, -1)))}
            onNext={() => click(() => setOutfitHead(cycleHead(loadout.head, 1)))}
          />
          <SlotRow
            label="Face"
            value={faceName}
            onPrev={() =>
              click(() => {
                let id = cycleFace(loadout.face, -1);
                for (let i = 0; i < FACE_OPTIONS.length; i += 1) {
                  if (isPartUnlocked?.('face', id) ?? true) {
                    setOutfitFace(id);
                    return;
                  }
                  id = cycleFace(id, -1);
                }
              })
            }
            onNext={() =>
              click(() => {
                let id = cycleFace(loadout.face, 1);
                for (let i = 0; i < FACE_OPTIONS.length; i += 1) {
                  if (isPartUnlocked?.('face', id) ?? true) {
                    setOutfitFace(id);
                    return;
                  }
                  id = cycleFace(id, 1);
                }
              })
            }
            locked={faceLocked}
          />
          <SlotRow
            label="Hands"
            value={handsName}
            onPrev={() => click(() => setOutfitHands(cycleHands(loadout.hands, -1)))}
            onNext={() => click(() => setOutfitHands(cycleHands(loadout.hands, 1)))}
          />

          <label className="customize-label">Extras</label>
          <div className="customize-extras">
            {EXTRA_OPTIONS.map((ex) => {
              const locked = !(isPartUnlocked?.('extra', ex.id) ?? true);
              const on = !!extrasOn[ex.id];
              return (
                <button
                  key={ex.id}
                  type="button"
                  className={`customize-toggle customize-extra${on ? ' customize-toggle--on' : ''}${locked ? ' customize-extra--locked' : ''}`}
                  disabled={locked}
                  aria-pressed={on}
                  onClick={() => click(() => setOutfitExtra(ex.id, !on))}
                >
                  {ex.name}
                  {locked ? ' · LOCKED' : ''}
                </button>
              );
            })}
          </div>
        </>
      )}

      <label className="customize-label">Color</label>
      <div className="customize-slider-row">
        <button
          type="button"
          className="customize-arrow"
          aria-label="Previous color"
          onClick={() => click(() => setOutfitColor(outfitColorIdAt(colorIdx - 1)))}
        >
          ‹
        </button>
        <input
          type="range"
          className="customize-slider"
          min={0}
          max={OUTFIT_COLORS.length - 1}
          step={1}
          value={colorIdx}
          onChange={(e) => click(() => setOutfitColor(outfitColorIdAt(Number(e.target.value))))}
          aria-label="Color slider"
        />
        <button
          type="button"
          className="customize-arrow"
          aria-label="Next color"
          onClick={() => click(() => setOutfitColor(outfitColorIdAt(colorIdx + 1)))}
        >
          ›
        </button>
      </div>
      <div className="customize-color-swatches">
        {OUTFIT_COLORS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`color-swatch color-swatch--${c.id}${i === colorIdx ? ' color-swatch--on' : ''}`}
            aria-label={c.name}
            title={c.name}
            onClick={() => click(() => setOutfitColor(c.id))}
          />
        ))}
      </div>

      <p className="customize-note">Visible to other players in your session</p>
    </div>
  );
}
