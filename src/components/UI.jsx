// src/components/UI.jsx
import React, { useEffect, useRef, useState } from 'react';

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
export function SkeletonLoader({ lines = 3, height = 14, gap = 10 }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height,
            marginBottom: i < lines - 1 ? gap : 0,
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 100 }) {
  return <div className="skeleton skeleton-block" style={{ height, marginBottom: 14 }} />;
}

// ─── Form Indicator ───────────────────────────────────────────────────────────
// pts array: last 5 gameweek points, most recent last
export function FormIndicator({ pts = [], size = 8 }) {
  function tier(p) {
    if (p >= 35) return 'g';
    if (p >= 18) return 'a';
    return 'r';
  }
  const dots = pts.slice(-5);
  while (dots.length < 5) dots.unshift(null);
  return (
    <div className="form-dots">
      {dots.map((p, i) => (
        <span
          key={i}
          className={`form-dot form-dot-${p !== null ? tier(p) : 'r'}`}
          style={{ width: size, height: size, opacity: p === null ? 0.2 : 1 }}
          title={p !== null ? `${p} pts` : 'No data'}
        />
      ))}
    </div>
  );
}

// ─── Gameweek Banner ──────────────────────────────────────────────────────────
export function GameweekBanner({ gameweek, compact = false }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!gameweek?.deadlineDate) return;
    function tick() {
      const deadline = gameweek.deadlineDate?.toDate?.() ?? new Date(gameweek.deadlineDate);
      const diff = deadline - Date.now();
      if (diff <= 0) { setTimeLeft('Deadline passed'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gameweek?.deadlineDate]);

  if (!gameweek) return null;

  const variantClass = {
    active: 'gw-banner-active',
    upcoming: 'gw-banner-upcoming',
    complete: 'gw-banner-complete',
  }[gameweek.status] ?? 'gw-banner-upcoming';

  const badgeClass = {
    active: 'badge-green',
    upcoming: 'badge-blue',
    complete: 'badge-gray',
  }[gameweek.status] ?? 'badge-gray';

  return (
    <div className={`gw-banner ${variantClass}`}>
      <div>
        <div className="gw-name">{gameweek.name ?? 'Gameweek'}</div>
        {!compact && (
          <div className="gw-sub">
            {gameweek.matchIds?.length ?? 0} matches in this gameweek
          </div>
        )}
        {gameweek.status === 'active' && timeLeft && (
          <div className="gw-countdown">{timeLeft}</div>
        )}
      </div>
      <span className={`badge ${badgeClass}`}>
        {gameweek.status === 'active' && <span className="live-pip" />}
        {gameweek.status === 'active' ? 'Active' : gameweek.status === 'upcoming' ? 'Upcoming' : 'Complete'}
      </span>
    </div>
  );
}

// ─── Points Animator ──────────────────────────────────────────────────────────
export function PointsAnimator({ value, duration = 800, className = '', style = {} }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = Number(value) || 0;
    if (from === to) return;
    const start = performance.now();
    function frame(now) {
      const pct = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (pct < 1) requestAnimationFrame(frame);
      else prevRef.current = to;
    }
    requestAnimationFrame(frame);
  }, [value, duration]);

  return <span className={className} style={style}>{display}</span>;
}

// ─── Player Card (compact row) ────────────────────────────────────────────────
const AVATAR_COLORS = ['#e24b4a','#1d9e75','#ba7517','#185fa5','#7f77dd','#d85a30','#d4537e','#639922'];
export function avatarColor(name = '') {
  let h = 0;
  for (const c of name) { h = ((h << 5) - h) + c.charCodeAt(0); h |= 0; }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function PlayerAvatarCircle({ name = '', size = 36, photoUrl = null }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.3, background: photoUrl ? 'transparent' : avatarColor(name) }}
    >
      {photoUrl ? <img src={photoUrl} alt={name} /> : initials}
    </div>
  );
}

export function RoleBadge({ role }) {
  const map = {
    Duelist: 'badge-red',
    Initiator: 'badge-amber',
    Controller: 'badge-green',
    Sentinel: 'badge-blue',
    IGL: 'badge-purple',
  };
  return <span className={`badge ${map[role] ?? 'badge-gray'}`} style={{ fontSize: 9 }}>{role}</span>;
}

export function RegionBadge({ region }) {
  const map = { NA: 'badge-blue', EMEA: 'badge-green', LA: 'badge-purple', PAC: 'badge-amber', 'LA-S': 'badge-purple', 'LA-N': 'badge-purple' };
  return <span className={`badge ${map[region] ?? 'badge-gray'}`}>{region}</span>;
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────
export function TransferModal({ outPlayer, inPlayer, isFree, cost, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Confirm Transfer</div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 40 }}>OUT</span>
            <PlayerAvatarCircle name={outPlayer?.ign ?? ''} />
            <div>
              <div style={{ fontWeight: 700 }}>{outPlayer?.ign}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{outPlayer?.org}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
            <span style={{ fontSize: 12, color: 'var(--green-text)', width: 40 }}>IN</span>
            <PlayerAvatarCircle name={inPlayer?.ign ?? ''} />
            <div>
              <div style={{ fontWeight: 700 }}>{inPlayer?.ign}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inPlayer?.org}</div>
            </div>
          </div>
        </div>
        {!isFree && (
          <div style={{ background: 'rgba(255,70,85,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            <span style={{ color: 'var(--red)', fontWeight: 700 }}>-{cost} pts</span> will be deducted for this transfer.
          </div>
        )}
        {isFree && (
          <div style={{ background: 'rgba(245,197,24,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--gold)' }}>
            Free transfer — no points deducted.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary full-width" onClick={onConfirm}>Confirm Transfer</button>
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Chip Selector ────────────────────────────────────────────────────────────
const CHIPS = [
  { key: 'tripleDuelist', name: 'Triple Duelist', icon: '🎯', desc: '3× captain pts for one GW' },
  { key: 'allIn',         name: 'All In',          icon: '⚡', desc: '2× all players this GW' },
  { key: 'scout',         name: 'Scout',            icon: '👁', desc: 'See all opponents\' rosters' },
  { key: 'analystMode',   name: 'Analyst Mode',     icon: '📊', desc: 'Unlock advanced map stats' },
];

export function ChipSelector({ chips = {}, activeChip, onActivate, gwId }) {
  return (
    <div className="chip-grid">
      {CHIPS.map(c => {
        const available = chips[c.key] === true;
        const isActive = activeChip === c.key;
        return (
          <div
            key={c.key}
            className={`chip-card ${!available ? 'used' : ''}`}
            onClick={() => available && !isActive && onActivate?.(c.key, gwId)}
          >
            <div className="chip-icon">{c.icon}</div>
            <div className="chip-name">{c.name}</div>
            <div className="chip-desc">{c.desc}</div>
            <div className="chip-avail">
              {isActive ? '✓ Active' : available ? 'Available' : 'Used'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Toast Provider ───────────────────────────────────────────────────────────
export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

export function useToast() {
  const [msg, setMsg] = useState('');
  const timerRef = useRef(null);
  const show = (message, duration = 2500) => {
    setMsg(message);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMsg(''), duration);
  };
  return { msg, show };
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, subtitle, cta, onCta }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{subtitle}</div>}
      {cta && <button className="btn btn-primary" onClick={onCta}>{cta}</button>}
    </div>
  );
}

// ─── Difficulty Badge ─────────────────────────────────────────────────────────
export function DifficultyBadge({ level }) {
  const map = {
    1: { label: 'Easy', bg: 'rgba(29,158,117,0.15)', color: '#5dcaa5' },
    2: { label: 'Med',  bg: 'rgba(186,117,23,0.2)',  color: '#ef9f27' },
    3: { label: 'Hard', bg: 'rgba(255,70,85,0.15)',  color: '#ff8a93' },
  };
  const s = map[level] ?? map[2];
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 10, padding: '2px 8px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {s.label}
    </span>
  );
}
