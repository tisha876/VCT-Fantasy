import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLeague, getRoster, saveRoster, lockRoster } from "../utils/firestore";
import { getPlayers, getPlayer, getRecentResults, getPlayerMatchHistory } from "../utils/scraper";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const REGIONS = [
  { value: "all", label: "All" },
  { value: "na", label: "NA" },
  { value: "eu", label: "EU" },
  { value: "ap", label: "AP" },
  { value: "la", label: "LA" },
  { value: "br", label: "BR" },
  { value: "kr", label: "KR" },
];

export default function Draft() {
  const { leagueId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [league, setLeague] = useState(null);
  const [roster, setRoster] = useState([]);
  const [locked, setLocked] = useState(false);

  // Search state
  const [players, setPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [page, setPage] = useState(1);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [apiError, setApiError] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [recentMatches, setRecentMatches] = useState([]);

  useEffect(() => {
    load();
    loadRecentMatches();
  }, [leagueId]);

  useEffect(() => {
    fetchPlayers();
  }, [region, page]);

  async function load() {
    try {
      const [l, r] = await Promise.all([getLeague(leagueId), getRoster(user.uid, leagueId)]);
      setLeague(l);
      setRoster(r.players || []);
      setLocked(r.lockedIn || false);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadRecentMatches() {
    try {
      const matches = await getRecentResults(10);
      setRecentMatches(matches);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchPlayers() {
    setLoadingPlayers(true);
    setApiError("");
    try {
      const data = await getPlayers(region, 30, page);
      const list = data.players || data.segments || data || [];
      setPlayers(list);
    } catch (e) {
      setApiError("Could not load players from VLR API. Check your connection.");
    } finally {
      setLoadingPlayers(false);
    }
  }

  const rosterSize = league?.settings?.rosterSize || 5;

  const filteredPlayers = players.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.ign || "").toLowerCase().includes(q) ||
      (p.alias || "").toLowerCase().includes(q) ||
      (p.team || "").toLowerCase().includes(q) ||
      (p.current_team || "").toLowerCase().includes(q)
    );
  });

  function isOnRoster(player) {
    const id = player.id || player.player_id;
    return roster.some((r) => (r.id || r.player_id) === id);
  }

  function addPlayer(player) {
    if (roster.length >= rosterSize) return;
    if (isOnRoster(player)) return;
    setRoster((prev) => [...prev, player]);
  }

  function removePlayer(player) {
    const id = player.id || player.player_id;
    setRoster((prev) => prev.filter((r) => (r.id || r.player_id) !== id));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    try {
      await saveRoster(user.uid, leagueId, roster);
      setSaveMsg("Roster saved!");
    } catch (e) {
      setSaveMsg("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLock() {
    if (!window.confirm("Lock your roster? You won't be able to make changes after locking.")) return;
    setSaving(true);
    try {
      await saveRoster(user.uid, leagueId, roster);
      await lockRoster(user.uid, leagueId);
      setLocked(true);
      setSaveMsg("Roster locked!");
    } catch (e) {
      setSaveMsg("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function viewPlayerDetail(player) {
    const id = player.id || player.player_id;
    if (!id) return;
    setLoadingDetail(true);
    setSelectedPlayer({ ...player });
    try {
      const detail = await getPlayer(id);
      setSelectedPlayer((prev) => ({ ...prev, ...detail, detail: true }));
    } catch (e) {
      // keep basic info
    } finally {
      setLoadingDetail(false);
    }
  }

  const maxPlayersPerTeam = league?.settings?.maxPlayersPerTeam || 2;

  function getTeamCount(teamName) {
    return roster.filter((r) => (r.team || r.current_team) === teamName).length;
  }

  function isTeamMaxed(player) {
    const team = player.team || player.current_team;
    if (!team) return false;
    return getTeamCount(team) >= maxPlayersPerTeam;
  }

  return (
    <div className="page">
      {/* Back Button */}
      <div style={{ marginBottom: "1rem" }}>
        <Link to={`/league/${leagueId}`} className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          ← Back to League
        </Link>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ color: "var(--text2)", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
          <Link to="/">Home</Link> / <Link to={`/league/${leagueId}`}>{league?.name || "League"}</Link> / Draft
        </div>
        <h1>Draft Your Roster</h1>
        <p style={{ color: "var(--text2)", marginTop: "0.25rem", fontSize: "0.9rem" }}>
          Pick {rosterSize} players · Max {maxPlayersPerTeam} per team
        </p>
      </div>

      {locked && (
        <div className="success-msg" style={{ marginBottom: "1rem" }}>
          ✅ Your roster is locked in. Good luck!
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem" }}>

        {/* Left: Player search */}
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <input
              placeholder="Search player or team…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <select value={region} onChange={(e) => { setRegion(e.target.value); setPage(1); }} style={{ width: 100 }}>
              {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {apiError && <div className="error-msg" style={{ marginBottom: "1rem" }}>{apiError}</div>}

          {loadingPlayers ? (
            <div className="spinner" />
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {filteredPlayers.map((player) => {
                  const id = player.id || player.player_id;
                  const onRoster = isOnRoster(player);
                  const teamMaxed = isTeamMaxed(player);
                  const full = roster.length >= rosterSize && !onRoster;
                  const disabled = locked || full || (teamMaxed && !onRoster);

                  return (
                    <div
                      key={id || player.ign}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.65rem 0.85rem",
                        background: onRoster ? "#ff465510" : "var(--bg2)",
                        border: `1px solid ${onRoster ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: "var(--radius-sm)",
                        transition: "border-color 0.15s",
                      }}
                    >
                      {player.img && (
                        <img src={player.img} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", background: "var(--border)", flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {player.ign || player.alias || player.name}
                        </div>
                        <div style={{ color: "var(--text2)", fontSize: "0.76rem" }}>
                          {player.team || player.current_team || "Free Agent"} · {player.country || player.region || ""}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm"
                        style={{ opacity: disabled ? 0.4 : 1 }}
                        disabled={disabled}
                        onClick={() => onRoster ? removePlayer(player) : addPlayer(player)}
                      >
                        {onRoster ? "Remove" : teamMaxed ? "Team full" : full ? "Roster full" : "Add"}
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => viewPlayerDetail(player)}
                        style={{ minWidth: 60 }}
                      >
                        Info
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" }}>
                <button className="btn btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                <span style={{ padding: "0.35rem 0.8rem", color: "var(--text2)", fontSize: "0.85rem" }}>Page {page}</span>
                <button className="btn btn-sm" onClick={() => setPage((p) => p + 1)} disabled={filteredPlayers.length < 30}>Next →</button>
              </div>
            </>
          )}
        </div>

        {/* Right: My roster */}
        <div>
          <div className="card" style={{ position: "sticky", top: 70 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2>My Roster</h2>
              <span style={{ color: "var(--text2)", fontSize: "0.85rem" }}>{roster.length}/{rosterSize}</span>
            </div>

            {/* Slots */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {Array.from({ length: rosterSize }).map((_, i) => {
                const p = roster[i];
                return (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.55rem 0.75rem",
                    background: p ? "var(--bg3)" : "var(--bg)",
                    border: `1px dashed ${p ? "var(--border)" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)",
                    minHeight: 44,
                  }}>
                    <span style={{ color: "var(--text2)", fontSize: "0.75rem", width: 16 }}>{i + 1}</span>
                    {p ? (
                      <>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{p.ign || p.alias || p.name}</div>
                          <div style={{ color: "var(--text2)", fontSize: "0.72rem" }}>
                            {p.team || p.current_team || "Free Agent"} · {p.country || p.region || ""}
                          </div>
                        </div>
                        {!locked && (
                          <button className="btn btn-sm" style={{ padding: "0.2rem 0.5rem", opacity: 0.7 }} onClick={() => removePlayer(p)}>×</button>
                        )}
                      </>
                    ) : (
                      <span style={{ color: "var(--text2)", fontSize: "0.8rem" }}>Empty slot</span>
                    )}
                  </div>
                );
              })}
            </div>

            {saveMsg && (
              <div className={saveMsg.startsWith("Error") ? "error-msg" : "success-msg"} style={{ marginBottom: "0.75rem", fontSize: "0.82rem" }}>
                {saveMsg}
              </div>
            )}

            {!locked && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button className="btn" onClick={handleSave} disabled={saving || roster.length === 0}>
                  {saving ? "Saving…" : "Save roster"}
                </button>
                <button
                  className="btn btn-accent"
                  onClick={handleLock}
                  disabled={saving || roster.length !== rosterSize}
                  title={roster.length !== rosterSize ? `Fill all ${rosterSize} slots to lock` : ""}
                >
                  🔒 Lock roster ({roster.length}/{rosterSize})
                </button>
              </div>
            )}

            {locked && (
              <div style={{ textAlign: "center", color: "var(--green)", fontSize: "0.88rem", padding: "0.5rem" }}>
                ✅ Roster locked
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Matches for Research */}
      <div className="card" style={{ marginTop: "2rem" }}>
        <h2>Recent Matches (Research)</h2>
        <p style={{ color: "var(--text2)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Review recent match results to inform your player selections
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
          {recentMatches.slice(0, 6).map((match) => (
            <div key={match.id} style={{
              padding: "1rem",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)"
            }}>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                {match.team1 || match.teams?.[0]?.name} vs {match.team2 || match.teams?.[1]?.name}
              </div>
              <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                {match.score || `${match.winner} won`}
              </div>
              <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                {match.date ? new Date(match.date).toLocaleDateString() : 'Recent'} · {match.tournament || match.event || 'VCT'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Player detail modal */}
      {selectedPlayer && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }} onClick={() => setSelectedPlayer(null)}>
          <div className="card" style={{ maxWidth: 480, width: "100%", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedPlayer(null)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", color: "var(--text2)", fontSize: "1.2rem" }}>×</button>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", alignItems: "center" }}>
              {selectedPlayer.img && (
                <img src={selectedPlayer.img} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
              )}
              <div>
                <h2>{selectedPlayer.ign || selectedPlayer.alias || selectedPlayer.name}</h2>
                <div style={{ color: "var(--text2)", fontSize: "0.83rem" }}>
                  {selectedPlayer.team || selectedPlayer.current_team || "Free Agent"} · {selectedPlayer.country || ""}
                </div>
              </div>
            </div>

            {loadingDetail ? (
              <div className="spinner" style={{ margin: "1rem auto" }} />
            ) : (
              selectedPlayer.detail && selectedPlayer.stats ? (
                <div>
                  <h3 style={{ marginBottom: "0.75rem" }}>Agent stats (last 60 days)</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                    {(selectedPlayer.stats?.agents || []).slice(0, 5).map((a) => (
                      <span key={a.agent} className="badge badge-blue">{a.agent} ({a.games}g)</span>
                    ))}
                  </div>
                  
                  {selectedPlayer.stats?.acs && (
                    <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span className="stat-pill"><span className="stat-label">ACS</span> {selectedPlayer.stats.acs}</span>
                      <span className="stat-pill"><span className="stat-label">K/D</span> {selectedPlayer.stats.kd}</span>
                      <span className="stat-pill"><span className="stat-label">HS%</span> {selectedPlayer.stats.hs}%</span>
                      <span className="stat-pill"><span className="stat-label">KPR</span> {selectedPlayer.stats.kpr}</span>
                    </div>
                  )}

                  {/* Historical Performance Chart */}
                  {selectedPlayer.stats?.recent_matches && selectedPlayer.stats.recent_matches.length > 0 && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <h3 style={{ marginBottom: "0.75rem" }}>Recent Match Performance</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={selectedPlayer.stats.recent_matches.slice(-10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="date" 
                            stroke="var(--text2)" 
                            fontSize={12}
                            tickFormatter={(date) => new Date(date).toLocaleDateString()}
                          />
                          <YAxis stroke="var(--text2)" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                            labelFormatter={(date) => new Date(date).toLocaleDateString()}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="acs" 
                            stroke="var(--accent)" 
                            strokeWidth={2}
                            name="ACS"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="kills" 
                            stroke="#ff4655" 
                            strokeWidth={2}
                            name="Kills"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Agent Performance Chart */}
                  {selectedPlayer.stats?.agents && selectedPlayer.stats.agents.length > 0 && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <h3 style={{ marginBottom: "0.75rem" }}>Agent Performance</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={selectedPlayer.stats.agents.slice(0, 5)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="agent" 
                            stroke="var(--text2)" 
                            fontSize={12}
                          />
                          <YAxis stroke="var(--text2)" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                          />
                          <Bar dataKey="acs" fill="var(--accent)" name="ACS" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: "var(--text2)", fontSize: "0.85rem" }}>
                  No detailed stats available. Player will still earn fantasy points from match results.
                </p>
              )
            )}

            <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem" }}>
              {!locked && (
                isOnRoster(selectedPlayer)
                  ? <button className="btn" onClick={() => { removePlayer(selectedPlayer); setSelectedPlayer(null); }}>Remove from roster</button>
                  : <button className="btn btn-accent" disabled={roster.length >= rosterSize || isTeamMaxed(selectedPlayer)} onClick={() => { addPlayer(selectedPlayer); setSelectedPlayer(null); }}>Add to roster</button>
              )}
              <button className="btn" onClick={() => setSelectedPlayer(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function isOnRoster(player) {
    const id = player.id || player.player_id;
    return roster.some((r) => (r.id || r.player_id) === id);
  }
}