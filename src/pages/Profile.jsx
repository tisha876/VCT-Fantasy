// src/pages/Profile.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getUserGameweekHistory, upsertUserProfile } from '../utils/firestore';
import { SkeletonCard, useToast, Toast } from '../components/UI';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function Profile() {
  const { user, userProfile, setUserProfile } = useApp();
  const [gwHistory, setGwHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const { msg, show: showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    setTeamName(userProfile?.teamName ?? user.displayName ?? '');
    getUserGameweekHistory(user.uid).then(h => { setGwHistory(h); setLoading(false); });
  }, [user, userProfile]);

  async function saveName() {
    if (!teamName.trim()) return;
    await upsertUserProfile(user.uid, { teamName: teamName.trim() });
    setUserProfile(prev => ({ ...prev, teamName: teamName.trim() }));
    setEditingName(false);
    showToast('Team name updated!');
  }

  if (!user) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>Sign in to view your profile</div>
    </div>
  );

  const maxPts = gwHistory.length > 0 ? Math.max(...gwHistory.map(g => g.points ?? 0)) : 1;

  const ACHIEVEMENTS = [
    { icon: '🩸', name: 'First Blood',   desc: 'Joined your first league',         earned: true },
    { icon: '🎯', name: 'Ace',           desc: '200+ pts in one gameweek',          earned: (userProfile?.bestGW ?? 0) >= 200 },
    { icon: '⚡', name: 'Clutch Factor', desc: 'Captain scored a clutch',           earned: false },
    { icon: '📈', name: 'Analyst Pro',   desc: 'Top 10 in global league',           earned: false },
    { icon: '🏆', name: 'Champion',      desc: 'Won a private league',              earned: false },
    { icon: '🔥', name: 'On Fire',       desc: '3 consecutive green GWs',           earned: false },
  ];

  return (
    <div>
      <Toast message={msg} />

      {/* Hero */}
      <div className="flex gap-md" style={{ marginBottom: 20, alignItems: 'center' }}>
        <div className="profile-avatar-lg">
          {user.photoURL ? <img src={user.photoURL} alt="avatar" /> : (userProfile?.teamName ?? user.displayName ?? '?').slice(0,2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          {editingName ? (
            <div className="flex gap-sm" style={{ marginBottom: 6 }}>
              <input
                className="search-input"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                style={{ fontSize: 20, fontWeight: 900, padding: '6px 12px' }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={saveName}>Save</button>
              <button className="btn btn-outline btn-sm" onClick={() => setEditingName(false)}>Cancel</button>
            </div>
          ) : (
            <div
              style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginBottom: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={() => setEditingName(true)}
            >
              {userProfile?.teamName ?? user.displayName ?? 'Manager'}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>✏️</span>
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <span className="badge badge-red">Season 1</span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => signOut(auth)}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="metric-tile"><div className="val">{(userProfile?.totalPoints ?? 0).toLocaleString()}</div><div className="key">Total Pts</div></div>
        <div className="metric-tile"><div className="val" style={{ color: 'var(--gold)' }}>{userProfile?.bestRank ?? '—'}</div><div className="key">Best Rank</div></div>
        <div className="metric-tile"><div className="val">{userProfile?.bestGW ?? 0}</div><div className="key">Best GW</div></div>
        <div className="metric-tile"><div className="val">{gwHistory.length}</div><div className="key">GWs Played</div></div>
      </div>

      {/* GW form chart */}
      <div className="card">
        <div className="card-title">Season Form — Points per Gameweek</div>
        {loading ? <SkeletonCard height={90} /> : gwHistory.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
            Complete a gameweek to see your form chart.
          </div>
        ) : (
          <div className="bar-chart-wrap">
            {gwHistory.map((gw, i) => (
              <div key={i} className="bar-col">
                <div
                  className={`bar-fill${i === gwHistory.length - 1 ? ' active' : ''}`}
                  style={{ height: `${Math.round((gw.points ?? 0) / maxPts * 100)}%` }}
                >
                  <div className="bar-top-label">{gw.points ?? 0}</div>
                </div>
                <div className="bar-bottom-label">GW{gw.gwNumber ?? i + 1}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="card">
        <div className="card-title">Achievements</div>
        <div className="grid-2">
          {ACHIEVEMENTS.map(a => (
            <div key={a.name} className="ach-card" style={{ opacity: a.earned ? 1 : 0.4 }}>
              <div className="ach-icon">{a.icon}</div>
              <div>
                <div className="ach-name">{a.name}</div>
                <div className="ach-desc">{a.desc}</div>
              </div>
              {!a.earned && <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-hint)' }}>🔒</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
