import React, { useState, useEffect } from "react";
import { getLiveMatches } from "../utils/scraper";

export default function LiveMatchTracker() {
  const [liveMatches, setLiveMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiveMatches();
    
    // Poll for live match updates every 5 seconds
    const interval = setInterval(loadLiveMatches, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadLiveMatches() {
    try {
      const live = getLiveMatches();
      setLiveMatches(live);
      if (!selectedMatch && live.length > 0) {
        setSelectedMatch(live[0]);
      } else if (selectedMatch) {
        const updated = live.find(m => m.id === selectedMatch.id);
        if (updated) setSelectedMatch(updated);
      }
      setLoading(false);
    } catch (e) {
      console.error('Error loading live matches:', e);
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="spinner" />;
  }

  if (liveMatches.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text2)" }}>
        <p>🎮 No live matches at the moment</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
      {/* Match list */}
      <div className="card" style={{ maxHeight: "600px", overflowY: "auto" }}>
        <h3>🔴 Live Matches</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {liveMatches.map((match) => (
            <div
              key={match.id}
              onClick={() => setSelectedMatch(match)}
              style={{
                padding: "0.75rem",
                background: selectedMatch?.id === match.id ? "var(--accent)" : "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                {match.team1} vs {match.team2}
              </div>
              <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                {match.tournament}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Match details with 2D view */}
      {selectedMatch && (
        <div className="card">
          <h3>Match Overview</h3>
          
          {/* Teams and Score */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "1rem",
            marginBottom: "1.5rem",
            alignItems: "center"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                {selectedMatch.team1}
              </div>
              <div style={{ color: "var(--text2)", fontSize: "0.9rem" }}>
                {selectedMatch.tournament}
              </div>
            </div>

            <div style={{
              background: "var(--bg2)",
              padding: "1rem",
              borderRadius: "var(--radius-sm)",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>
                {selectedMatch.score || "LIVE"}
              </div>
              <div style={{ color: "var(--text2)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                LIVE
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                {selectedMatch.team2}
              </div>
              <div style={{ color: "var(--text2)", fontSize: "0.9rem" }}>
                {new Date(selectedMatch.date).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* 2D Map View simulation */}
          <div style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "1.5rem",
            marginBottom: "1.5rem"
          }}>
            <h4 style={{ marginBottom: "1rem", textAlign: "center" }}>Current Map</h4>
            
            <div style={{
              background: "#1a1a1a",
              border: "2px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "1rem",
              aspectRatio: "16/9",
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Team A area (left) */}
              <div style={{
                position: "absolute",
                left: "1rem",
                top: "1rem",
                width: "30%",
                height: "30%",
                background: "#ff465520",
                border: "2px solid #ff4655",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ff4655",
                fontWeight: 600
              }}>
                {selectedMatch.team1} Spawn
              </div>

              {/* Team B area (right) */}
              <div style={{
                position: "absolute",
                right: "1rem",
                bottom: "1rem",
                width: "30%",
                height: "30%",
                background: "#0066ff20",
                border: "2px solid #0066ff",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0066ff",
                fontWeight: 600
              }}>
                {selectedMatch.team2} Spawn
              </div>

              {/* Center text */}
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                color: "var(--text2)"
              }}>
                <div style={{ fontSize: "0.9rem" }}>Live Map</div>
                <div style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Updating in real-time</div>
              </div>
            </div>
          </div>

          {/* Match Info */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem"
          }}>
            <div style={{
              background: "var(--bg2)",
              padding: "0.75rem",
              borderRadius: "var(--radius-sm)"
            }}>
              <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>Tournament</div>
              <div style={{ fontWeight: 600 }}>{selectedMatch.tournament}</div>
            </div>

            <div style={{
              background: "var(--bg2)",
              padding: "0.75rem",
              borderRadius: "var(--radius-sm)"
            }}>
              <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>Status</div>
              <div style={{ fontWeight: 600, color: "#ff4655" }}>🔴 LIVE</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
