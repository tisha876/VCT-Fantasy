// src/pages/Leagues.jsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { createLeague, joinLeague, subscribeLeaderboard, getH2HRecord, getGameweekLeaderboard } from '../utils/firestore';
import { SkeletonCard, EmptyState, PlayerAvatarCircle, useToast, Toast } from '../components/UI';

export default function Leagues() {
  const { user, myLeagues, refreshLeagues, activeLeagueId, setActiveLeagueId, currentGameweek } = useApp();
  const [tab, setTab] = useState('standings');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gwLeaderboard, setGwLeaderboard] = useState([]);
  const [h2hRecords, setH2hRecords] = useState([]);
  const { msg, show: showToast } = useToast();

  useEffect(() => {
    if (!activeLeagueId) return;
    const unsub = subscribeLeaderboard(activeLeagueId, setLeaderboard);
    return unsub;
  }, [activeLeagueId]);

  useEffect(() => {
    if (!activeLeagueId || !currentGameweek) return;
    getGameweekLeaderboard(activeLeagueId, currentGameweek.id).then(setGwLeaderboard);
  }, [activeLeagueId, currentGameweek]);

  useEffect(() => {
    if (!activeLeagueId || !user) return;
    getH2HRecord(activeLeagueId, user.uid).then(setH2hRecords);
  }, [activeLeagueId, user]);

  const league = myLeagues.find(l => l.id === activeLeagueId);

  const tabs = [
    { key: 'standings', label: 'Standings' },
    { key: 'gw',        label: 'GW Scores' },
    { key: 'h2h',       label: 'H2H' },
    { key: 'settings',  label: 'Settings' },
  ];

  return (
    <div>
      <Toast message={msg} />

      {/* Action buttons */}
      <div className="flex gap-sm" style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create League</button>
        <button className="btn btn-outline" onClick={() => setShowJoin(true)}>Join League</button>
      </div>

      {/* My leagues list */}
      {myLeagues.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="No leagues yet"
          subtitle="Create a private league or join one with an invite code."
          cta="Create League"
          onCta={() => setShowCreate(true)}
        />
      ) : (
        <>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
            My Leagues
          </div>

          {myLeagues.map(l => {
            const myRank = leaderboard.findIndex(r => r.userId === user?.uid) + 1;
            const isActive = l.id === activeLeagueId;
            return (
              <div
                key={l.id}
                onClick={() => setActiveLeagueId(l.id)}
                style={{
                  background: 'var(--surface)', borderRadius: 12,
                  border: `0.5px solid ${isActive ? 'rgba(255,70,85,0.35)' : 'var(--border)'}`,
                  padding: 18, marginBottom: 10, cursor: 'pointer',
                  transition: 'border-color 0.12s',
                }}
              >
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {l.name}
                      {isActive && <span className="badge badge-red" style={{ fontSize: 9 }}>Active</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {l.members?.length ?? 0} managers · Invite: <span style={{ fontFamily: 'monospace', color: 'var(--gold)', letterSpacing: 2 }}>{l.inviteCode}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>
                      {myRank > 0 ? myRank : '—'}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/{l.members?.length ?? '?'}</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your rank</div>
                  </div>
                </div>
                <div style={{ display: 'flex', borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
                  {[
                    { v: leaderboard.find(r => r.userId === user?.uid)?.totalPoints?.toLocaleString() ?? 0, k: 'Total Pts' },
                    { v: l.budgetEnabled ? 'On' : 'Off', k: 'Budget' },
                    { v: l.freeTransfersPerGW ?? 1, k: 'Free Trans/GW' },
                  ].map(s => (
                    <div key={s.k} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{s.k}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Active league detail */}
          {activeLeagueId && (
            <div className="card" style={{ marginTop: 8 }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '0.5px solid var(--border)' }}>
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, color: tab === t.key ? 'var(--red)' : 'var(--text-muted)',
                      borderBottom: `2px solid ${tab === t.key ? 'var(--red)' : 'transparent'}`,
                      transition: 'all 0.12s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'standings' && <StandingsTab leaderboard={leaderboard} userId={user?.uid} />}
              {tab === 'gw' && <GWTab gwLeaderboard={gwLeaderboard} userId={user?.uid} />}
              {tab === 'h2h' && <H2HTab records={h2hRecords} userId={user?.uid} />}
              {tab === 'settings' && <SettingsTab league={league} onCopy={() => showToast('Invite code copied!')} />}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreate && <CreateLeagueModal onClose={() => setShowCreate(false)} onCreated={async (id) => { await refreshLeagues(); setActiveLeagueId(id); setShowCreate(false); showToast('League created!'); }} />}
      {showJoin && <JoinLeagueModal onClose={() => setShowJoin(false)} onJoined={async (id) => { await refreshLeagues(); setActiveLeagueId(id); setShowJoin(false); showToast('Joined league!'); }} />}
    </div>
  );
}

// ─── Standings Tab ────────────────────────────────────────────────────────────
function StandingsTab({ leaderboard, userId }) {
  if (leaderboard.length === 0) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No scores yet</div>;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 60px 80px', gap: 10, padding: '0 12px 10px', borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
        {['#', 'Manager', 'GW', 'Total'].map(h => (
          <div key={h} style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)', fontWeight: 600, textAlign: h === 'Total' || h === 'GW' ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>
      {leaderboard.map(row => (
        <div key={row.id} className={`lb-row${row.userId === userId ? ' you' : ''}`}>
          <div className={`lb-rank${row.rank === 1 ? ' r1' : ''}`}>{row.rank === 1 ? '🥇' : row.rank}</div>
          <div className="flex" style={{ gap: 8, alignItems: 'center', minWidth: 0 }}>
            <PlayerAvatarCircle name={row.userId} size={26} />
            <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.userId === userId ? <strong>You</strong> : row.userId.slice(0, 14)}
            </span>
          </div>
          <div className="lb-gw">—</div>
          <div className="lb-pts">{(row.totalPoints ?? 0).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// ─── GW Tab ───────────────────────────────────────────────────────────────────
function GWTab({ gwLeaderboard, userId }) {
  if (gwLeaderboard.length === 0) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No gameweek scores yet</div>;
  return (
    <div>
      {gwLeaderboard.map((row, i) => (
        <div key={row.userId} className={`lb-row${row.userId === userId ? ' you' : ''}`}>
          <div className={`lb-rank${i === 0 ? ' r1' : ''}`}>{i + 1}</div>
          <div className="flex" style={{ gap: 8, alignItems: 'center', flex: 1 }}>
            <PlayerAvatarCircle name={row.userId} size={26} />
            <span style={{ fontSize: 13 }}>{row.userId === userId ? <strong>You</strong> : row.userId.slice(0, 14)}</span>
          </div>
          <div className="lb-pts">{row.totalPoints}</div>
        </div>
      ))}
    </div>
  );
}

// ─── H2H Tab ──────────────────────────────────────────────────────────────────
function H2HTab({ records, userId }) {
  if (records.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Head-to-head matchups will appear after the first gameweek completes.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {records.map((r, i) => {
        const opp = r.player1 === userId ? r.player2 : r.player1;
        const result = r.result;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px' }}>
            <div className="flex" style={{ gap: 10, alignItems: 'center' }}>
              <PlayerAvatarCircle name={opp} size={32} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>{opp.slice(0, 14)}</div>
            </div>
            <div className="flex" style={{ gap: 5 }}>
              {result ? (
                <span className={`h2h-badge h2h-${result}`}>{result.toUpperCase()}</span>
              ) : (
                <span className="badge badge-gray">Pending</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ league, onCopy }) {
  if (!league) return null;
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          { label: 'League Name', val: league.name },
          { label: 'Invite Code', val: league.inviteCode, mono: true, copyable: true },
          { label: 'Budget System', val: league.budgetEnabled ? 'Enabled' : 'Disabled' },
          { label: 'Free Transfers / GW', val: league.freeTransfersPerGW ?? 1 },
          { label: 'Transfer Cost (pts)', val: league.transferCostPts ?? 4 },
          { label: 'Members', val: league.members?.length ?? 0 },
        ].map(s => (
          <div key={s.label} className="flex-between">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</span>
            <div className="flex" style={{ gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: s.mono ? 'monospace' : 'inherit', color: s.mono ? 'var(--gold)' : 'var(--text)', letterSpacing: s.mono ? 3 : 0 }}>
                {s.val}
              </span>
              {s.copyable && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => { navigator.clipboard?.writeText(s.val); onCopy(); }}
                >
                  Copy
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Create League Modal ──────────────────────────────────────────────────────
function CreateLeagueModal({ onClose, onCreated }) {
  const { user } = useApp();
  const [name, setName] = useState('');
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const id = await createLeague(user.uid, name.trim(), { budgetEnabled });
      onCreated(id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Create League</div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>League Name</label>
          <input
            className="search-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. SentinelSquad Private"
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <input type="checkbox" id="budget" checked={budgetEnabled} onChange={e => setBudgetEnabled(e.target.checked)} />
          <label htmlFor="budget" style={{ fontSize: 13, cursor: 'pointer' }}>Enable budget system (100cr per manager)</label>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-primary full-width" onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create League'}
          </button>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Join League Modal ────────────────────────────────────────────────────────
function JoinLeagueModal({ onClose, onJoined }) {
  const { user } = useApp();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    if (!code.trim()) return;
    setLoading(true); setError('');
    try {
      const id = await joinLeague(user.uid, code.trim());
      onJoined(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Join League</div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Invite Code</label>
          <input
            className="search-input"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. X4K9PQ"
            style={{ fontFamily: 'monospace', letterSpacing: 4, fontSize: 18, textAlign: 'center' }}
            maxLength={8}
            autoFocus
          />
        </div>
        {error && <div style={{ color: '#ff8a93', fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <div className="flex gap-sm">
          <button className="btn btn-primary full-width" onClick={handleJoin} disabled={loading || !code.trim()}>
            {loading ? 'Joining...' : 'Join League'}
          </button>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
