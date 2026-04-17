import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLeague, getLeaderboard, getUserScores, getRoster } from "../utils/firestore";

export default function Leaderboard() {
  const { leagueId } = useParams();
  const { user } = useAuth();
  const [league, setLeague] = useState(null);
  const [board, setBoard] = useState([]);
  const [myScores, setMyScores] = useState([]);
  const [myRoster, setMyRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("board");

  useEffect(() => {
    load();
  }, [leagueId]);

  async function load() {
    setLoading(true);
    try {
      const [l, b, s, r] = await Promise.all([
        getLeague(leagueId),
        getLeaderboard(leagueId),
        getUserScores(user.uid, leagueId),
        getRoster(user.uid, leagueId),
      ]);
      setLeague(l);
      setBoard(b);
      setMyScores(s);
      setMyRoster(r.players || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const medals = ["🥇", "🥈", "🥉"];

  if (loading) return <div className="page"><div className="spinner" /></div>;

  const myEntry = board.find((b) => b.userId === user.uid);

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
          <Link to="/">Home</Link> / <Link to={`/league/${leagueId}`}>{league?.name}</Link> / Leaderboard
        </div>
        <h1>🏆 Leaderboard</h1>
      </div>

      {/* My standing card */}
      {myEntry && (
        <div className="card" style={{ marginBottom: "1.5rem", background: "linear-gradient(135deg, #ff465510, var(--bg2))", borderColor: "var(--accent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ fontSize: "2rem" }}>
              {medals[board.indexOf(myEntry)] || `#${board.indexOf(myEntry) + 1}`}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>You — {myEntry.displayName}</div>
              <div style={{ color: "var(--text2)", fontSize: "0.83rem" }}>
                {myEntry.matchesPlayed || 0} matches played
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>{myEntry.totalPoints?.toFixed(1)}</div>
              <div style={{ color: "var(--text2)", fontSize: "0.77rem" }}>total pts</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {[["board", "Standings"], ["history", "My Match History"]].map(([key, label]) => (
          <button key={key} className="btn" onClick={() => setTab(key)}
            style={{ background: tab === key ? "var(--accent)" : undefined, borderColor: tab === key ? "var(--accent)" : undefined, color: tab === key ? "#fff" : undefined }}>
            {label}
          </button>
        ))}
      </div>

      {/* Standings */}
      {tab === "board" && (
        <div className="card">
          {board.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text2)" }}>
              No scores yet — wait for the first match to be scored.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text2)", fontSize: "0.8rem" }}>
                  <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", width: 40 }}>#</th>
                  <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Player</th>
                  <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Matches</th>
                  <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Points</th>
                  <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Avg/Match</th>
                </tr>
              </thead>
              <tbody>
                {board.map((entry, idx) => {
                  const isMe = entry.userId === user.uid;
                  const avg = entry.matchesPlayed ? (entry.totalPoints / entry.matchesPlayed).toFixed(1) : "—";
                  return (
                    <tr key={entry.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: isMe ? "#ff465508" : undefined,
                      }}>
                      <td style={{ padding: "0.7rem 0.75rem", fontWeight: 700, color: "var(--text2)" }}>
                        {medals[idx] || idx + 1}
                      </td>
                      <td style={{ padding: "0.7rem 0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          {entry.photoURL && (
                            <img src={entry.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
                          )}
                          <span style={{ fontWeight: isMe ? 700 : 500 }}>
                            {entry.displayName}
                            {isMe && <span style={{ color: "var(--accent)", marginLeft: "0.4rem", fontSize: "0.75rem" }}>(you)</span>}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "0.7rem 0.75rem", textAlign: "right", color: "var(--text2)" }}>{entry.matchesPlayed || 0}</td>
                      <td style={{ padding: "0.7rem 0.75rem", textAlign: "right", fontWeight: 700, color: isMe ? "var(--accent)" : "var(--text)" }}>
                        {(entry.totalPoints || 0).toFixed(1)}
                      </td>
                      <td style={{ padding: "0.7rem 0.75rem", textAlign: "right", color: "var(--text2)" }}>{avg}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Match history */}
      {tab === "history" && (
        <div>
          {myScores.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--text2)" }}>
              No scored matches yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {myScores
                .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))
                .map((score) => (
                  <div key={score.id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{score.matchName || `Match ${score.matchId}`}</div>
                        <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>{score.date || ""}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: "1.3rem", color: "var(--accent)" }}>{score.totalPoints?.toFixed(1)} pts</div>
                      </div>
                    </div>

                    {/* Per-player breakdown */}
                    {score.playerBreakdowns && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {score.playerBreakdowns.map((pb) => (
                          <div key={pb.playerId} style={{
                            display: "flex", alignItems: "center", gap: "0.75rem",
                            padding: "0.4rem 0.6rem",
                            background: "var(--bg3)", borderRadius: "var(--radius-sm)",
                          }}>
                            <span style={{ flex: 1, fontSize: "0.85rem", fontWeight: 500 }}>{pb.playerName}</span>
                            {pb.isPOTG && <span className="badge badge-yellow">⚡ POTG</span>}
                            {pb.isTop3ACS && !pb.isPOTG && <span className="badge badge-purple">Top 3 ACS</span>}
                            <span style={{ display: "flex", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text2)" }}>
                              <span>{pb.kills}K/{pb.deaths}D/{pb.assists}A</span>
                              <span>ACS {pb.acs}</span>
                            </span>
                            <span style={{ fontWeight: 700, color: "var(--accent)", minWidth: 50, textAlign: "right" }}>+{pb.points?.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}