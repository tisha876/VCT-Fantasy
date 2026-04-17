import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUpcomingMatches, getRecentResults, getLiveMatches } from "../utils/scraper";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
    
    // Set up live updates every 10 seconds
    const interval = setInterval(() => {
      loadLiveMatches();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadMatches() {
    setLoading(true);
    try {
      const [upcoming, recent, live] = await Promise.all([
        getUpcomingMatches(),
        getRecentResults(10),
        getLiveMatches()
      ]);
      setUpcomingMatches(upcoming);
      setRecentMatches(recent);
      setLiveMatches(live);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadLiveMatches() {
    try {
      const live = await getLiveMatches();
      setLiveMatches(live);
    } catch (e) {
      console.error(e);
    }
  }

  const formatMatchTime = (match) => {
    if (match.status?.toLowerCase().includes('live')) return 'LIVE';
    if (match.time_until_match) return match.time_until_match;
    if (match.date) return new Date(match.date).toLocaleDateString();
    return 'TBD';
  };

  const getMatchStatusColor = (match) => {
    if (match.status?.toLowerCase().includes('live')) return '#ff4655';
    return 'var(--text2)';
  };

  const getMatchResult = (match) => {
    const team1Name = match.team1 || match.teams?.[0]?.name || "Team 1";
    const team2Name = match.team2 || match.teams?.[1]?.name || "Team 2";
    
    // Check for explicit winner field
    if (match.winner) {
      if (match.winner.includes(team1Name) || match.winner === "team1") {
        return `${team1Name} won`;
      } else if (match.winner.includes(team2Name) || match.winner === "team2") {
        return `${team2Name} won`;
      }
      return `${match.winner} won`;
    }
    
    // Parse score like "2-1" or "13-7, 13-8, 13-5" or series score
    if (match.score) {
      // Handle series score (e.g., "2-1", "2-0")
      const scoreStr = match.score.toString().trim();
      if (scoreStr.includes('-')) {
        const scoreParts = scoreStr.split('-').map(s => s.trim());
        if (scoreParts.length === 2) {
          const team1Score = parseInt(scoreParts[0]);
          const team2Score = parseInt(scoreParts[1]);
          if (!isNaN(team1Score) && !isNaN(team2Score)) {
            if (team1Score > team2Score) {
              return `${team1Name} won ${scoreStr}`;
            } else if (team2Score > team1Score) {
              return `${team2Name} won ${scoreStr}`;
            }
          }
        }
      }
      return match.score || 'Match completed';
    }
    
    return 'Result pending';
  };

  return (
    <div className="page">
      <div style={{ marginBottom: "2rem" }}>
        <h1>Welcome to VALFantasy</h1>
        <p style={{ color: "var(--text2)", marginTop: "0.25rem" }}>
          Track live matches, build your roster, and compete with friends
        </p>
      </div>

      {/* Scrolling Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <div style={{ 
          marginBottom: "2rem", 
          background: "var(--bg2)", 
          border: "1px solid var(--border)", 
          borderRadius: "var(--radius-sm)",
          padding: "1rem",
          overflow: "hidden"
        }}>
          <h3 style={{ marginBottom: "0.75rem", color: "var(--accent)" }}>🔥 Upcoming Matches</h3>
          <div style={{
            display: "flex",
            gap: "1rem",
            animation: "scroll 30s linear infinite",
            whiteSpace: "nowrap"
          }}>
            {[...upcomingMatches, ...upcomingMatches].map((match, index) => (
              <div key={`${match.id || index}`} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.85rem",
                flexShrink: 0
              }}>
                <span>{match.team1 || match.teams?.[0]?.name || 'TBD'}</span>
                <span style={{ color: "var(--text2)" }}>vs</span>
                <span>{match.team2 || match.teams?.[1]?.name || 'TBD'}</span>
                <span style={{ color: getMatchStatusColor(match), fontSize: "0.75rem" }}>
                  {formatMatchTime(match)}
                </span>
              </div>
            ))}
          </div>
          <style>{`
            @keyframes scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>

        {/* Live Matches */}
        <div className="card">
          <h2>🔴 Live Matches</h2>
          {loading ? (
            <div className="spinner" />
          ) : liveMatches.length === 0 ? (
            <div>
              <p style={{ color: "var(--text2)", fontSize: "0.9rem", marginBottom: "1rem" }}>No live matches at the moment</p>
              <h3 style={{ color: "var(--accent)", marginBottom: "0.75rem" }}>📅 Upcoming Matches</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {upcomingMatches.slice(0, 5).map((match) => (
                  <div key={match.id} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem",
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)"
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {match.team1 || match.teams?.[0]?.name} vs {match.team2 || match.teams?.[1]?.name}
                      </div>
                      <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                        {formatMatchTime(match)}
                      </div>
                    </div>
                    <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                      {match.tournament || match.event}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {liveMatches.slice(0, 5).map((match) => (
                <div key={match.id} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem",
                  background: "var(--bg2)",
                  border: "1px solid #ff465520",
                  borderRadius: "var(--radius-sm)"
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {match.team1 || match.teams?.[0]?.name} vs {match.team2 || match.teams?.[1]?.name}
                    </div>
                    <div style={{ color: "#ff4655", fontSize: "0.8rem", fontWeight: 600 }}>
                      LIVE - {match.score || match.current_score || 'Updating...'}
                    </div>
                  </div>
                  <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                    {match.tournament || match.event}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div className="card">
          <h2>📊 Recent Results</h2>
          {loading ? (
            <div className="spinner" />
          ) : recentMatches.length === 0 ? (
            <p style={{ color: "var(--text2)", fontSize: "0.9rem" }}>No recent matches</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {recentMatches.slice(0, 5).map((match) => (
                <div key={match.id} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem",
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)"
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {match.team1 || match.teams?.[0]?.name} vs {match.team2 || match.teams?.[1]?.name}
                    </div>
                    <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                      {getMatchResult(match)}
                    </div>
                  </div>
                  <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                    {match.date ? new Date(match.date).toLocaleDateString() : 'Recent'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: "2rem" }}>
        <h2>⚡ Quick Actions</h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link to="/live-matches" className="btn btn-accent">
            🔴 View All Live Matches
          </Link>
          <Link to="/leagues" className="btn btn-accent">
            🏆 View My Leagues
          </Link>
          <Link to="/scoring-rules" className="btn">
            📋 Scoring Rules
          </Link>
        </div>
      </div>
    </div>
  );
}