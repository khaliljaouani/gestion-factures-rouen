import React from 'react';
import './progress.css';

export default function ProgressOverlay({ open, title = 'Traitement en cours…', progress = 0, subtitle }) {
  if (!open) return null;
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="overlay-root">
      <div className="overlay-card">
        <div className="overlay-title">{title}</div>
        {subtitle ? <div className="overlay-subtitle">{subtitle}</div> : null}
        <div className="bar-wrap" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="bar" style={{ width: `${pct}%` }} />
        </div>
        <div className="pct">{pct}%</div>
        <div className="spinner" aria-hidden />
      </div>
    </div>
  );
}
