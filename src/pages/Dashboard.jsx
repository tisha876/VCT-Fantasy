// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from './AppContext';
import { subscribeRoster, subscribeLeaderboard, getGameweekScore } from './firestore';
import { useLiveMatches, useUpcomingMatches } from './useVLR';
import { GameweekBanner, SkeletonCard, PointsAnimator, PlayerAvatarCircle, FormIndicator, avatarColor } from './UI';

export default function Dashboard() {
  const { user, currentGameweek, activeLeagueId, myLeagues } = useApp();
  const [roster, setRoster] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gwScore, setGwScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const { matches: liveMatches } = useLiveMatches();
  const { data: upcoming } = useUpcomingMatches();

  // Subscribe to roster + leaderboard
  useEffect(() => {
    if (!user || !activeLeagueId) { setLoading(false); return; }
    const unsubRoster = subscribeRoster(activeLeagueId, user.uid, r => {
      setRoster(r);
      setLoading(false);
    });
    const unsubLb = subscribeLeaderboard(activeLeagueId, lb => setLeaderboard(lb));
    return () => { unsubRoster(); unsubLb(); };
  }, [user, activeLeagueId]);

  // Load gameweek score
  useEffect(() => {
    if (!activeLeagueId || !currentGameweek || !user) return;
    getGameweekScore(activeLeagueId, currentGameweek.id, user.uid).then(setGwScore);
  }, [activeLeagueId, currentGameweek, user]);

  const myRank = leaderboard.findIndex(r => r.userId === user?.uid) + 1;
  const first = leaderboard[0];
  const gwPts = gwScore?.totalPoints ?? 0;

  // Find user's players in live matches
  const rosterPlayerIds = roster?.players ?? [];
  const myActivePlayers = liveMatches.flatMap(m => {
    // We'd match by ign in a real implementation
    return [];
  });

  if (!user) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <h2 style={{ marginBottom: 12 }}>Welcome to VCT Fantasy</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Sign in to start managing your roster.</p>
      <Link to="/login" className="btn btn-primary">Sign In with Google</Link>
    </div>
  );

  return (
    <div>
      {/* Gameweek Banner */}
      {currentGameweek ? (
        <GameweekBanner gameweek={currentGameweek} />
      ) : (
        <div className="gw-banner gw-banner-upcoming">
          <div><div className="gw-name">No active gameweek</div><div className="gw-sub">Check back soon</div></div>
        </div>
      )}

      {/* Top grid */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        {/* My team summary */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">My Team This Gameweek</div>
          {loading ? <SkeletonCard height={120} /> : (
            <>
              <div className="flex-between" style={{ marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>
                    <PointsAnimator value={gwPts} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>points this GW</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {myRank > 0 && <span className="badge badge-gold">{myRank}{suffix(myRank)}</span>}
                  {myRank > 1 && first && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                      -{(first.totalPoints - (leaderboard[myRank - 1]?.totalPoints ?? 0)).toLocaleString()} behind 1st
                    </div>
                  )}
                </div>
              </div>

              {/* Player chips */}
              {(roster?.players?.length ?? 0) > 0 ? (
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  {(roster.players ?? []).slice(0, 5).map(pid => {
                    const bd = gwScore?.playerBreakdowns?.find(b => b.playerId === pid);
                    const isCap = roster.captainId === pid;
                    return (
                      <div key={pid} style={{
                        flex: 1, background: 'var(--surface2)', borderRadius: 8, padding: '8px 3px',
                        textAlign: 'center', border: `0.5px solid ${isCap ? 'var(--gold)' : 'var(--border)'}`,
                      }}>
                        <PlayerAvatarCircle name={pid} size={30} />
                        <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pid.length > 6 ? pid.slice(0,5) : pid}</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--red)' }}>{bd?.points ?? 0}</div>
                        {isCap && <div style={{ fontSize: 7, color: 'var(--gold)', fontWeight: 700 }}>CAP</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
                  No players drafted yet.
                </div>
              )}
              <Link to="/team" className="btn btn-primary full-width" style={{ display: 'flex' }}>Edit Team</Link>
            </>
          )}
        </div>

        {/* Leaderboard */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">League Standings</div>
          {myLeagues.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              <Link to="/leagues" style={{ color: 'var(--red)' }}>Join or create a league</Link> to see standings.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                {leaderboard.slice(0, 5).map(row => {
                  const isYou = row.userId === user?.uid;
                  return (
                    <div key={row.id} className={`lb-row${isYou ? ' you' : ''}`}>
                      <div className={`lb-rank${row.rank === 1 ? ' r1' : ''}`}>{row.rank === 1 ? '🥇' : row.rank}</div>
                      <div className="flex" style={{ gap: 8, alignItems: 'center', minWidth: 0 }}>
                        <PlayerAvatarCircle name={row.userId} size={26} />
                        <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isYou ? <strong>You</strong> : row.userId.slice(0, 10)}
                        </span>
                      </div>
                      <div className="lb-gw">{gwScore?.totalPoints ?? 0}</div>
                      <div className="lb-pts">{row.totalPoints.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
              <Link to="/leagues" style={{ fontSize: 11, color: 'var(--red)', display: 'block', textAlign: 'right', textDecoration: 'none' }}>
                Full standings →
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="metric-tile"><div className="val"><PointsAnimator value={gwPts} /></div><div className="key">GW Points</div></div>
        <div className="metric-tile"><div className="val" style={{ color: 'var(--gold)' }}>{myRank > 0 ? `${myRank}${suffix(myRank)}` : '—'}</div><div className="key">League Rank</div></div>
        <div className="metric-tile"><div className="val">{leaderboard.find(r => r.userId === user?.uid)?.totalPoints?.toLocaleString() ?? 0}</div><div className="key">Total Pts</div></div>
        <div className="metric-tile"><div className="val">{rosterPlayerIds.length}/5</div><div className="key">Players Picked</div></div>
      </div>

      {/* Live matches */}
      {liveMatches.length > 0 && (
        <div className="card">
          <div className="card-title">
            <span className="live-pip" style={{ marginRight: 6 }} />
            Live Now
          </div>
          {liveMatches.slice(0, 2).map(m => (
            <div key={m.matchId} className="live-match-card">
              <div className="flex-between" style={{ marginBottom: 10 }}>
                <span className="badge badge-red"><span className="live-pip" />Live</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.currentMap || m.roundInfo}</span>
              </div>
              <div className="match-scoreline">
                <div className="team-block">
                  <div className="team-abbr">{m.team1}</div>
                  <div className="team-score">{m.score1}</div>
                </div>
                <div className="score-sep">:</div>
                <div className="team-block">
                  <div className="team-abbr">{m.team2}</div>
                  <div className="team-score">{m.score2}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
                {m.tournamentName}
              </div>
            </div>
          ))}
          <Link to="/live" style={{ fontSize: 11, color: 'var(--red)', display: 'block', textAlign: 'right', textDecoration: 'none', marginTop: 4 }}>
            View all live →
          </Link>
        </div>
      )}

      {/* Upcoming fixtures */}
      <div className="card">
        <div className="card-title">Upcoming Fixtures</div>
        {(upcoming ?? []).slice(0, 6).map((m, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderTop: i > 0 ? '0.5px solid var(--border)' : 'none',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {m.team1} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {m.team2}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.tournamentName}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
              {m.timeCompleted || 'TBD'}
            </div>
          </div>
        ))}
        {(!upcoming || upcoming.length === 0) && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No upcoming fixtures data available.</div>
        )}
      </div>
    </div>
  );
}

function suffix(n) {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}