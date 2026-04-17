import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createLeague, joinLeague, getUserLeagues, getRoster } from "../utils/firestore";
import { calculateLeaguePoints } from "../utils/pointsCalculator";

export default function Leagues() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaguePoints, setLeaguePoints] = useState({}); // Map of leagueId -> points
  const [tab, setTab] = useState("leagues"); // leagues | create | join
  const [leagueName, setLeagueName] = useState("");
  const [region, setRegion] = useState("all");
  const [rosterSize, setRosterSize] = useState(5);
  const [usePreSeasonPoints, setUsePreSeasonPoints] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [working, setWorking] = useState(false);

  useEffect(() => {
    loadLeagues();
    // Set up interval to update points every 30 seconds
    const interval = setInterval(updateLeaguePoints, 30000);
    return () => clearInterval(interval);
  }, []);

  async function updateLeaguePoints() {
    try {
      const data = await getUserLeagues(user.uid);
      const pointsMap = {};
      
      for (const league of data) {
        try {
          const roster = await getRoster(user.uid, league.id);
          const players = roster.players || [];
          if (players.length > 0) {
            const result = await calculateLeaguePoints(players);
            pointsMap[league.id] = result.total || 0;
          } else {
            pointsMap[league.id] = 0;
          }
        } catch (e) {
          console.error(`Error calculating points for league ${league.id}:`, e);
          pointsMap[league.id] = 0;
        }
      }
      
      setLeaguePoints(pointsMap);
    } catch (e) {
      console.error("Error updating league points:", e);
    }
  }

  async function loadLeagues() {
    setLoading(true);
    try {
      const data = await getUserLeagues(user.uid);
      setLeagues(data);
      // Calculate points after loading leagues
      await updateLeaguePoints();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!leagueName.trim()) return;
    setWorking(true);
    setMsg({});
    try {
      const { id, code } = await createLeague(user.uid, leagueName.trim(), { region, rosterSize: Number(rosterSize), usePreSeasonPoints });
      setMsg({ type: "success", text: `League created! Invite code: ${code}` });
      await loadLeagues();
      setTimeout(() => navigate(`/league/${id}`), 1500);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setWorking(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setWorking(true);
    setMsg({});
    try {
      const leagueId = await joinLeague(user.uid, joinCode.trim().toUpperCase());
      setMsg({ type: "success", text: "Joined league successfully!" });
      await loadLeagues();
      setTimeout(() => navigate(`/league/${leagueId}`), 1500);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="page">
      <div style={{ marginBottom: "2rem" }}>
        <h1>My Leagues</h1>
        <p style={{ color: "var(--text2)", marginTop: "0.25rem" }}>
          Create or join leagues to compete with friends
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          className={`btn ${tab === "leagues" ? "btn-accent" : "btn-secondary"}`}
          onClick={() => setTab("leagues")}
        >
          My Leagues ({leagues.length})
        </button>
        <button
          className={`btn ${tab === "create" ? "btn-accent" : "btn-secondary"}`}
          onClick={() => setTab("create")}
        >
          Create League
        </button>
        <button
          className={`btn ${tab === "join" ? "btn-accent" : "btn-secondary"}`}
          onClick={() => setTab("join")}
        >
          Join League
        </button>
      </div>

      {msg.text && (
        <div className={`msg ${msg.type}`} style={{ marginBottom: "1rem" }}>
          {msg.text}
        </div>
      )}

      {tab === "leagues" && (
        <div>
          {loading ? (
            <div className="spinner" />
          ) : leagues.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text2)" }}>
              <p>You haven't joined any leagues yet.</p>
              <p style={{ marginTop: "0.5rem" }}>
                <button className="btn btn-accent" onClick={() => setTab("create")}>
                  Create your first league
                </button>
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {leagues.map((league) => (
                <div key={league.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0 }}>{league.name}</h3>
                      <p style={{ color: "var(--text2)", margin: "0.25rem 0", fontSize: "0.9rem" }}>
                        {league.members?.length || 1} members · Region: {league.settings?.region || "All"} · Roster: {league.settings?.rosterSize || 5}
                      </p>
                      {leaguePoints[league.id] !== undefined && (
                        <p style={{ color: "var(--accent)", margin: "0.5rem 0 0 0", fontSize: "0.95rem", fontWeight: 600 }}>
                          💰 Your Points: {leaguePoints[league.id]}
                        </p>
                      )}
                    </div>
                    <Link to={`/league/${league.id}`} className="btn">
                      View League
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "create" && (
        <div className="card">
          <h2>Create New League</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600 }}>
                League Name
              </label>
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                placeholder="Enter league name"
                required
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600 }}>
                  Region
                </label>
                <select value={region} onChange={(e) => setRegion(e.target.value)}>
                  <option value="all">All Regions</option>
                  <option value="na">North America</option>
                  <option value="eu">Europe</option>
                  <option value="ap">Asia Pacific</option>
                  <option value="la">Latin America</option>
                  <option value="br">Brazil</option>
                  <option value="kr">Korea</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600 }}>
                  Roster Size
                </label>
                <select value={rosterSize} onChange={(e) => setRosterSize(e.target.value)}>
                  <option value={3}>3 players</option>
                  <option value={5}>5 players</option>
                  <option value={7}>7 players</option>
                  <option value={10}>10 players</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={usePreSeasonPoints}
                  onChange={(e) => setUsePreSeasonPoints(e.target.checked)}
                />
                Include pre-season points
              </label>
              <p style={{ color: "var(--text2)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                If checked, players will start with points earned from matches before the league was created
              </p>
            </div>

            <button type="submit" className="btn btn-accent" disabled={working}>
              {working ? "Creating…" : "Create League"}
            </button>
          </form>
        </div>
      )}

      {tab === "join" && (
        <div className="card">
          <h2>Join League</h2>
          <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600 }}>
                Invite Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={6}
                required
                style={{ width: "100%", textTransform: "uppercase" }}
              />
            </div>

            <button type="submit" className="btn btn-accent" disabled={working}>
              {working ? "Joining…" : "Join League"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}