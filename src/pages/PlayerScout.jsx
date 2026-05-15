// src/pages/PlayerScout.jsx
import React, { useState, useMemo } from 'react';
import { usePlayerStats } from '../hooks/useVLR';
import { SkeletonCard, FormIndicator, RoleBadge, RegionBadge, PlayerAvatarCircle, EmptyState } from '../components/UI';

const REGIONS = ['all','na','eu','ap','la'];
const SORT_KEYS = { acs: 'ACS', kd: 'K/D', kpr: 'KPR', apr: 'APR', fkpr: 'FK/R', rating: 'Rating' };

export default function PlayerScout() {
  const [region, setRegion] = useState('all');
  const [timespan, setTimespan] = useState('60');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('acs');
  const [sortDir, setSortDir] = useState(-1); // -1 = desc
  const [expanded, setExpanded] = useState(null);

  const { players, loading, error } = usePlayerStats(region, timespan);

  const filtered = useMemo(() => {
    let list = players;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.ign.toLowerCase().includes(q) || p.org.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => sortDir * (b[sortKey] - a[sortKey]));
    return list;
  }, [players, search, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(-1); }
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <input
          className="search-input"
          placeholder="Search player or team..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select
          value={timespan}
          onChange={e => setTimespan(e.target.value)}
          style={{ background: 'var(--surface2)', color: 'var(--text)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0 14px', fontSize: 12, cursor: 'pointer' }}
        >
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="filter-bar">
        {REGIONS.map(r => (
          <span key={r} className={`filter-chip${region === r ? ' active' : ''}`} onClick={() => setRegion(r)}>
            {r === 'all' ? 'All Regions' : r.toUpperCase()}
          </span>
        ))}
      </div>

      <div className="flex-between" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {loading ? 'Loading...' : `${filtered.length} players`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Click column headers to sort · Click row to expand
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'rgba(255,70,85,0.08)', borderColor: 'rgba(255,70,85,0.3)', color: '#ff8a93', fontSize: 13 }}>
          <strong>API Error:</strong> {error.message}. The VLR API may be self-hosted — check your Firebase Function proxy configuration.
        </div>
      )}

      {loading ? (
        <>
          <SkeletonCard height={50} />
          <SkeletonCard height={50} />
          <SkeletonCard height={50} />
          <SkeletonCard height={50} />
          <SkeletonCard height={50} />
        </>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="No players found" subtitle="Try adjusting your search or region filter" />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Player</th>
                <th>Region</th>
                {Object.entries(SORT_KEYS).map(([key, label]) => (
                  <th
                    key={key}
                    className={sortKey === key ? 'sorted' : ''}
                    onClick={() => handleSort(key)}
                  >
                    {label} {sortKey === key ? (sortDir === -1 ? '↓' : '↑') : ''}
                  </th>
                ))}
                <th>HS%</th>
                <th>Clutch%</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <React.Fragment key={p.ign + p.org}>
                  <tr onClick={() => setExpanded(expanded === p.ign ? null : p.ign)}>
                    <td style={{ paddingLeft: 20 }}>
                      <div className="flex" style={{ gap: 10, alignItems: 'center' }}>
                        <PlayerAvatarCircle name={p.ign} size={34} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{p.ign}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.org}</div>
                        </div>
                      </div>
                    </td>
                    <td><RegionBadge region={(p.region || region).toUpperCase()} /></td>
                    <td style={{ fontWeight: 700, color: 'var(--red)' }}>{p.acs.toFixed(1)}</td>
                    <td style={{ color: p.kd >= 1.2 ? 'var(--green-text)' : p.kd >= 1 ? 'var(--text)' : '#ff8a93' }}>{p.kd.toFixed(2)}</td>
                    <td>{p.kpr.toFixed(2)}</td>
                    <td>{p.apr.toFixed(2)}</td>
                    <td>{p.fkpr.toFixed(2)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.rating.toFixed(2)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.hsPct}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.clutchPct}</td>
                  </tr>
                  {expanded === p.ign && (
                    <tr>
                      <td colSpan={10} style={{ padding: 0 }}>
                        <PlayerExpandedRow player={p} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PlayerExpandedRow({ player: p }) {
  const stats = [
    { label: 'ACS',         val: p.acs.toFixed(1),   desc: 'Avg Combat Score' },
    { label: 'K/D',         val: p.kd.toFixed(2),    desc: 'Kill/Death Ratio' },
    { label: 'KAST',        val: p.kast,              desc: 'Kill/Assist/Survived/Traded' },
    { label: 'ADR',         val: p.adr.toFixed(1),   desc: 'Avg Damage/Round' },
    { label: 'KPR',         val: p.kpr.toFixed(2),   desc: 'Kills/Round' },
    { label: 'APR',         val: p.apr.toFixed(2),   desc: 'Assists/Round' },
    { label: 'FKPR',        val: p.fkpr.toFixed(2),  desc: 'First Kills/Round' },
    { label: 'FDPR',        val: p.fdpr.toFixed(2),  desc: 'First Deaths/Round' },
    { label: 'HS%',         val: p.hsPct,             desc: 'Headshot %' },
    { label: 'Clutch%',     val: p.clutchPct,         desc: 'Clutch Success %' },
  ];

  return (
    <div style={{ background: 'rgba(255,70,85,0.04)', borderTop: '0.5px solid var(--border)', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <PlayerAvatarCircle name={p.ign} size={52} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>{p.ign}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.org}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Rating: {p.rating.toFixed(2)}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{s.val || '—'}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
