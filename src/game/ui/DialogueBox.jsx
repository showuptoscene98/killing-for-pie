import React from 'react';

export default function DialogueBox({
  open,
  speaker,
  text,
  choices = [],
  onChoose,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="dialogue-overlay" role="dialog" aria-modal="true">
      <div className="dialogue-box">
        {speaker && <p className="dialogue-speaker">{speaker}</p>}
        <p className="dialogue-text">{text}</p>
        <div className="dialogue-choices">
          {choices.map((c, i) => (
            <button
              key={i}
              type="button"
              className="dialogue-choice"
              onClick={() => onChoose?.(c)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button type="button" className="dialogue-close" onClick={onClose}>
          Esc
        </button>
      </div>
    </div>
  );
}
