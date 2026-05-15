// src/pages/ScoringRules.jsx
import React from 'react';

const SCORING = [
  { category: 'Combat', rules: [
    { label: 'Kill',             pts: '+3',   note: 'Per kill', neg: false },
    { label: 'Death',            pts: '-1',   note: 'Per death', neg: true },
    { label: 'Assist',           pts: '+1.5', note: 'Per assist', neg: false },
    { label: 'First Blood',      pts: '+2',   note: 'Per first blood in round', neg: false },
    { label: 'Clutch (1vX win)', pts: '+5',   note: 'Per clutch round won', neg: false },
  ]},
  { category: 'ACS Bonuses', rules: [
    { label: 'ACS 200+',             pts: '+5',  note: 'Per map', neg: false },
    { label: 'ACS 250+',             pts: '+10', note: 'Replaces 200+', neg: false },
    { label: 'ACS 300+',             pts: '+20', note: 'Replaces 250+', neg: false },
    { label: 'Top 3 ACS in series',  pts: '+10', note: 'vs all players in match', neg: false },
    { label: 'Player of the Game',   pts: '+25', note: 'Highest ACS in series', neg: false },
  ]},
  { category: 'Headshot %', rules: [
    { label: 'HS% 25%+', pts: '+3', note: 'Per map', neg: false },
    { label: 'HS% 35%+', pts: '+6', note: 'Per map, replaces 25%+', neg: false },
  ]},
  { category: 'Team Performance', rules: [
    { label: 'Match Win',           pts: '+10', note: 'Full series win', neg: false },
    { label: 'Flawless Map (13-0)', pts: '+15', note: 'Per flawless map', neg: false },
  ]},
];

const CHIPS = [
  { name: 'Triple Duelist', icon: '🎯', effect: "Triple your captain's points for one gameweek", limit: 'Once/season' },
  { name: 'All In',         icon: '⚡', effect: 'All 5 players score double points',             limit: 'Once/season' },
  { name: 'Scout',          icon: '👁', effect: "See all opponents' rosters for one gameweek",   limit: 'Once/season' },
  { name: 'Analyst Mode',   icon: '📊', effect: 'Unlock advanced map stats for one gameweek',    limit: 'Once/season' },
];

export default function ScoringRules() {
  return (
    <div style={{ maxWidth: 700 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Fantasy points are calculated from VCT match stats pulled from the VLR.gg API after each match completes.
          Your captain earns double points. Chips apply multipliers on top.
        </div>
      </div>

      {SCORING.map(section => (
        <div className="card" key={section.category} style={{ marginBottom: 14 }}>
          <div className="card-title">{section.category}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', textAlign: 'left', padding: '0 0 10px', fontWeight: 600 }}>Action</th>
                <th style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', textAlign: 'right', padding: '0 0 10px', fontWeight: 600 }}>Points</th>
                <th style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', textAlign: 'right', padding: '0 0 10px', fontWeight: 600 }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {section.rules.map(r => (
                <tr key={r.label} style={{ borderTop: '0.5px solid var(--border)' }}>
                  <td style={{ padding: '10px 0', fontSize: 13, fontWeight: 500 }}>{r.label}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontSize: 16, fontWeight: 900, color: r.neg ? '#ff8a93' : 'var(--green-text)' }}>{r.pts}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">Chips & Power-ups</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CHIPS.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 10 }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{c.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.effect}</div>
              </div>
              <span className="badge badge-gold">{c.limit}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">Captain</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <p>Your <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Captain</span> earns <strong style={{ color: 'var(--text)' }}>2× all points</strong> for that gameweek.</p>
          <p style={{ marginTop: 8 }}>With the <span style={{ color: 'var(--red)', fontWeight: 700 }}>Triple Duelist</span> chip active, your captain earns <strong style={{ color: 'var(--text)' }}>3× points</strong> instead.</p>
          <p style={{ marginTop: 8 }}>You can change your captain any time before the gameweek deadline locks.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Transfers</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <p>Each manager gets <span style={{ color: 'var(--text)', fontWeight: 600 }}>1 free transfer per gameweek</span>.</p>
          <p style={{ marginTop: 8 }}>Additional transfers cost <span style={{ color: 'var(--red)', fontWeight: 700 }}>4 points each</span>, deducted from your GW total.</p>
          <p style={{ marginTop: 8 }}>Free transfers <strong style={{ color: 'var(--text)' }}>do not roll over</strong>. Wildcards (×2 per season) allow unlimited free transfers for one GW.</p>
        </div>
      </div>
    </div>
  );
}
