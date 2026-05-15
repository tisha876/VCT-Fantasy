// src/pages/LiveMatches.jsx
import React, { useState } from 'react';
import { useLiveMatches, useResults, useMatchDetails } from './useVLR';
import { SkeletonCard } from './UI';
import { useApp } from './AppContext';

export default function LiveMatches() {
  const { matches: live, loading: liveLoading } = useLiveMatches();
  const { data: results, loading: resLoading } = useResults();
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  return (
    <div>
      {/* Live */}
      <div style={{ marginBottom: 24 }}>
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-pip" /> Live Matches
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-refreshes every 30s</span>
        </div>

        {liveLoading ? (
          <>
            <SkeletonCard height={160} />
            <SkeletonCard height={160} />
          </>
        ) : live.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📺</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>No matches live right now</div>
            <div style={{ fontSize: 12 }}>Check upcoming fixtures below</div>
          </div>
        ) : (
          live.map(m => (
            <LiveMatchCard
              key={m.matchId}
              match={m}
              selected={selectedMatchId === m.matchId}
              onSelect={() => setSelectedMatchId(m.matchId === selectedMatchId ? null : m.matchId)}
            />
          ))
        )}
      </div>

      {/* Results */}
      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>
          Recent Results
        </div>
        {resLoading ? <SkeletonCard height={200} /> : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {(results ?? []).slice(0, 10).map((m, i) => (
              <ResultRow key={i} match={m} idx={i} />
            ))}
            {(!results || results.length === 0) && (
              <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>No recent results</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveMatchCard({ match, selected, onSelect }) {
  const { data: details, loading } = useMatchDetails(selected ? match.matchId : null);

  return (
    <div className="live-match-card" style={{ marginBottom: 14, cursor: 'pointer' }} onClick={onSelect}>
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <span className="badge badge-red"><span className="live-pip" />Live</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {match.roundInfo || match.currentMap || match.tournamentName}
        </span>
      </div>

      <div className="match-scoreline">
        <div className="team-block">
          <div className="team-abbr">{match.team1}</div>
          <div className="team-score">{match.score1}</div>
          <div className="team-name">{match.team1}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            {match.currentMap || 'Map'}
          </div>
          <div className="score-sep">:</div>
        </div>
        <div className="team-block">
          <div className="team-abbr">{match.team2}</div>
          <div className="team-score">{match.score2}</div>
          <div className="team-name">{match.team2}</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
        {match.tournamentName}
      </div>

      {selected && (
        <div style={{ marginTop: 16, borderTop: '0.5px solid var(--border)', paddingTop: 14 }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 10 }}>
              Loading match details...
            </div>
          ) : details ? (
            <MatchDetailExpanded details={details} />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
              Detailed stats not yet available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchDetailExpanded({ details }) {
  // details shape varies by API response; render what we have
  const maps = details?.maps ?? details?.match_maps ?? [];
  const players = details?.players ?? details?.player_stats ?? [];

  if (players.length > 0) {
    return (
      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
          Player Stats
        </div>
        <table className="data-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>ACS</th>
              <th>K</th>
              <th>D</th>
              <th>A</th>
              <th>HS%</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700 }}>{p.ign ?? p.player ?? p.name ?? '—'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{p.org ?? p.team ?? '—'}</td>
                <td style={{ color: 'var(--red)', fontWeight: 700 }}>{Math.round(parseFloat(p.average_combat_score ?? p.acs ?? 0))}</td>
                <td>{p.kills ?? p.k ?? '—'}</td>
                <td>{p.deaths ?? p.d ?? '—'}</td>
                <td>{p.assists ?? p.a ?? '—'}</td>
                <td>{p.headshot_percentage ?? p.hs_pct ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
      {JSON.stringify(details).slice(0, 200)}...
    </div>
  );
}

function ResultRow({ match, idx }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px',
      borderTop: idx > 0 ? '0.5px solid var(--border)' : 'none',
    }}>
      <div style={{ fontSize: 13 }}>
        <span style={{ fontWeight: 700 }}>{match.team1}</span>
        <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>
          {match.score1} – {match.score2}
        </span>
        <span style={{ fontWeight: 700 }}>{match.team2}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{match.tournamentName}</div>
        <div style={{ fontSize: 10, color: 'var(--text-hint)' }}>{match.timeCompleted}</div>
      </div>
    </div>
  );
}