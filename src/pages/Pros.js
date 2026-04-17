import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlayers, getPlayerStats } from "../utils/scraper";

const REGIONS = [
  { value: "all", label: "All" },
  { value: "na", label: "NA" },
  { value: "eu", label: "EU" },
  { value: "ap", label: "AP" },
  { value: "la", label: "LA" },
  { value: "br", label: "BR" },
  { value: "kr", label: "KR" },
];

export default function Pros() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, [region]);

  useEffect(() => {
    filterPlayers();
  }, [players, searchQuery]);

  async function loadPlayers() {
    setLoading(true);
    try {
      const data = await getPlayers(region, 50, 1);
      const playerList = data.players || data.segments || data || [];
      setPlayers(playerList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function filterPlayers() {
    const filtered = players.filter((player) => {
      const query = searchQuery.toLowerCase();
      return (
        (player.name || "").toLowerCase().includes(query) ||
        (player.ign || "").toLowerCase().includes(query) ||
        (player.alias || "").toLowerCase().includes(query) ||
        (player.team || "").toLowerCase().includes(query) ||
        (player.current_team || "").toLowerCase().includes(query)
      );
    });
    setFilteredPlayers(filtered);
  }

  async function viewPlayerDetail(player) {
    setLoadingDetail(true);
    setSelectedPlayer({ ...player });
    try {
      // In a real implementation, you'd fetch detailed stats here
      // For now, we'll just set basic info
      setSelectedPlayer((prev) => ({ ...prev, detail: true }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div className="page">
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "2rem"
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text)",
            fontSize: "1.5rem",
            cursor: "pointer",
            padding: "0.5rem"
          }}
          title="Go back"
        >
          ← Back
        </button>
        <div style={{ flex: 1, marginLeft: "1rem" }}>
          <h1 style={{ margin: 0 }}>Professional Players</h1>
          <p style={{ color: "var(--text2)", marginTop: "0.25rem" }}>
            View player statistics and analytics to make informed fantasy decisions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input
          placeholder="Search players or teams…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={region} onChange={(e) => setRegion(e.target.value)} style={{ width: 120 }}>
          {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {filteredPlayers.map((player) => (
            <div
              key={player.id || player.ign}
              className="card"
              style={{ cursor: "pointer" }}
              onClick={() => viewPlayerDetail(player)}
            >
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                {player.img && (
                  <img
                    src={player.img}
                    alt=""
                    style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                    {player.ign || player.alias || player.name}
                  </div>
                  <div style={{ color: "var(--text2)", fontSize: "0.9rem" }}>
                    {player.team || player.current_team || "Free Agent"} · {player.country || player.region || ""}
                  </div>
                  {player.stats && (
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--accent)" }}>
                        ACS: {player.stats.acs || 'N/A'}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "var(--text2)" }}>
                        K/D: {player.stats.kd || 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }} onClick={() => setSelectedPlayer(null)}>
          <div className="card" style={{ maxWidth: 600, width: "100%", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedPlayer(null)} style={{
              position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none",
              color: "var(--text2)", fontSize: "1.2rem", cursor: "pointer"
            }}>×</button>

            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", alignItems: "center" }}>
              {selectedPlayer.img && (
                <img src={selectedPlayer.img} alt="" style={{
                  width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--border)"
                }} />
              )}
              <div>
                <h2 style={{ margin: 0 }}>{selectedPlayer.ign || selectedPlayer.alias || selectedPlayer.name}</h2>
                <div style={{ color: "var(--text2)", fontSize: "0.9rem" }}>
                  {selectedPlayer.team || selectedPlayer.current_team || "Free Agent"} · {selectedPlayer.country || selectedPlayer.region || ""}
                </div>
              </div>
            </div>

            {loadingDetail ? (
              <div className="spinner" style={{ margin: "2rem auto" }} />
            ) : selectedPlayer.detail ? (
              <div>
                <h3 style={{ marginBottom: "1rem" }}>Performance Overview</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div style={{ textAlign: "center", padding: "1rem", background: "var(--bg2)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--accent)" }}>
                      {selectedPlayer.stats?.acs || 'N/A'}
                    </div>
                    <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>ACS</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "1rem", background: "var(--bg2)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--green)" }}>
                      {selectedPlayer.stats?.kd || 'N/A'}
                    </div>
                    <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>K/D</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "1rem", background: "var(--bg2)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--red)" }}>
                      {selectedPlayer.stats?.hs || 'N/A'}%
                    </div>
                    <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>HS%</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "1rem", background: "var(--bg2)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--blue)" }}>
                      {selectedPlayer.stats?.kpr || 'N/A'}
                    </div>
                    <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>KPR</div>
                  </div>
                </div>

                {selectedPlayer.stats?.agents && selectedPlayer.stats.agents.length > 0 && (
                  <div>
                    <h3 style={{ marginBottom: "0.75rem" }}>Agent Pool</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {selectedPlayer.stats.agents.slice(0, 5).map((agent) => (
                        <span key={agent.agent} className="badge badge-blue">
                          {agent.agent} ({agent.games}g)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: "var(--text2)", fontSize: "0.9rem" }}>
                Detailed statistics not available at the moment.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}