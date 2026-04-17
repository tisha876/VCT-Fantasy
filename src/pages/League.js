import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLeague, getRoster, getMatchEvents } from "../utils/firestore";

export default function League() {
  const { leagueId } = useParams();
  const { user } = useAuth();
  const [league, setLeague] = useState(null);
  const [roster, setRoster] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [leagueId]);

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
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "var(--text2)", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
            <Link to="/">Home</Link> / {league.name}
          </div>
          <h1>{league.name}</h1>
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

        {/* Recent Match Events */}
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>Match Events</h2>
          {events.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text2)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
              <p>No match events yet.</p>
              {isOwner && (
                <Link to={`/league/${leagueId}/score`} className="btn" style={{ marginTop: "1rem", display: "inline-flex" }}>
                  Add match event
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {events.slice(0, 6).map((ev) => (
                <div key={ev.id} style={{
                  padding: "0.75rem",
                  background: "var(--bg3)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                      {ev.team1} vs {ev.team2}
                    </div>
                    <span className={`badge ${ev.scored ? "badge-green" : "badge-yellow"}`}>
                      {ev.scored ? "Scored" : "Pending"}
                    </span>
                  </div>
                  <div style={{ color: "var(--text2)", fontSize: "0.77rem", marginTop: "0.25rem" }}>
                    {ev.event || "VCT"} · {ev.date || ""}
                  </div>
                </div>
              ))}
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