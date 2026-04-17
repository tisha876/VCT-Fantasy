import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLeague, getRoster, getMatchEvents } from "../utils/firestore";
import { calculateLeaguePoints } from "../utils/pointsCalculator";

export default function League() {
  const { leagueId } = useParams();
  const { user } = useAuth();
  const [league, setLeague] = useState(null);
  const [roster, setRoster] = useState([]);
  const [events, setEvents] = useState([]);
  const [userPoints, setUserPoints] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // Set up interval to update points every 30 seconds
    const interval = setInterval(updateUserPoints, 30000);
    return () => clearInterval(interval);
  }, [leagueId]);

  async function updateUserPoints() {
    try {
      const rosterData = await getRoster(user.uid, leagueId);
      const players = rosterData.players || [];
      if (players.length > 0) {
        const result = await calculateLeaguePoints(players);
        setUserPoints(result.total || 0);
      } else {
        setUserPoints(0);
      }
    } catch (e) {
      console.error("Error calculating user points:", e);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const [l, r, e] = await Promise.all([
        getLeague(leagueId),
        getRoster(user.uid, leagueId),
        getMatchEvents(leagueId),
      ]);
      setLeague(l);
      setRoster(r.players || []);
      setEvents(e);
      
      // Calculate initial points
      if ((r.players || []).length > 0) {
        const result = await calculateLeaguePoints(r.players);
        setUserPoints(result.total || 0);
      } else {
        setUserPoints(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="page"><div className="spinner" /></div>;
  if (!league) return <div className="page"><p>League not found.</p></div>;

  const isOwner = league.ownerId === user.uid;

  return (
    <div className="page">
      {/* Back Button */}
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/leagues" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          ← Back to Leagues
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "var(--text2)", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
            <Link to="/">Home</Link> / {league.name}
          </div>
          <h1>{league.name}</h1>
          {userPoints !== null && (
            <div style={{ 
              fontSize: "1.1rem", 
              fontWeight: 600, 
              color: "var(--accent)", 
              marginTop: "0.5rem",
              marginBottom: "0.5rem"
            }}>
              💰 Your Points: {userPoints}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <span className="badge badge-accent">Code: {league.code}</span>
            <span className="badge badge-blue">{league.members?.length || 0} members</span>
            <span className="badge badge-purple">{league.settings?.region?.toUpperCase() || "ALL"}</span>
            <span className="badge badge-green">{league.settings?.rosterSize || 5}-player rosters</span>
            {isOwner && <span className="badge badge-yellow">Owner</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link to={`/league/${leagueId}/draft`} className="btn btn-accent">
            ✏️ {roster.length ? "Edit Roster" : "Draft Players"}
          </Link>
          <Link to={`/league/${leagueId}/leaderboard`} className="btn">
            🏆 Leaderboard
          </Link>
          {isOwner && (
            <Link to={`/league/${leagueId}/score`} className="btn">
              📊 Score Match
            </Link>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ gap: "1.5rem" }}>
        {/* My Roster */}
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>My Roster</h2>
          {roster.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text2)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎯</div>
              <p>No players drafted yet.</p>
              <Link to={`/league/${leagueId}/draft`} className="btn btn-accent" style={{ marginTop: "1rem", display: "inline-flex" }}>
                Draft players
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {roster.map((p, i) => (
                <div key={p.id || i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.6rem 0.75rem",
                  background: "var(--bg3)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}>
                  {p.img && (
                    <img src={p.img} alt={p.name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", background: "var(--border)" }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.name || p.alias || p.ign}</div>
                    <div style={{ color: "var(--text2)", fontSize: "0.77rem" }}>{p.team || p.current_team || "Free Agent"}</div>
                  </div>
                  <span className="badge badge-blue">{p.country || ""}</span>
                </div>
              ))}
              <Link to={`/league/${leagueId}/draft`} className="btn btn-sm" style={{ justifyContent: "center", marginTop: "0.25rem" }}>
                Edit roster
              </Link>
            </div>
          )}
        </div>

        {/* Player Match Schedule */}
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>Player Match Schedule</h2>
          {roster.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text2)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📅</div>
              <p>Draft players to see their upcoming matches</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* This would be populated with actual player match data */}
              <div style={{
                padding: "1rem",
                background: "var(--bg3)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                textAlign: "center",
                color: "var(--text2)"
              }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🔄</div>
                <p>Match schedules will be available once the season begins</p>
                <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
                  You'll see upcoming matches for your drafted players here
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Invite */}
      <div className="card" style={{ marginTop: "1.5rem", background: "linear-gradient(135deg, var(--bg2), var(--bg3))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <h3>Invite Friends</h3>
            <p style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Share this code and they can join from the home screen.
            </p>
          </div>
          <div style={{
            background: "var(--bg)",
            border: "2px solid var(--accent)",
            borderRadius: "var(--radius-sm)",
            padding: "0.75rem 1.5rem",
            fontFamily: "monospace",
            fontSize: "1.5rem",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "var(--accent)",
          }}>
            {league.code}
          </div>
          <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(league.code)}>
            Copy code
          </button>
        </div>
      </div>
    </div>
  );
}