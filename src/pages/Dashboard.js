import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createLeague, joinLeague, getUserLeagues } from "../utils/firestore";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("leagues"); // leagues | create | join
  const [leagueName, setLeagueName] = useState("");
  const [region, setRegion] = useState("all");
  const [rosterSize, setRosterSize] = useState(5);
  const [joinCode, setJoinCode] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [working, setWorking] = useState(false);

  useEffect(() => {
    loadLeagues();
  }, []);

  async function loadLeagues() {
    setLoading(true);
    try {
      const data = await getUserLeagues(user.uid);
      setLeagues(data);
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
      const { id, code } = await createLeague(user.uid, leagueName.trim(), { region, rosterSize: Number(rosterSize) });
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
      const id = await joinLeague(user.uid, joinCode.trim().toUpperCase());
      setMsg({ type: "success", text: "Joined league!" });
      await loadLeagues();
      setTimeout(() => navigate(`/league/${id}`), 1000);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setWorking(false);
    }
  }

  const REGIONS = [
    { value: "all", label: "All regions" },
    { value: "na", label: "North America" },
    { value: "eu", label: "Europe" },
    { value: "ap", label: "Asia-Pacific" },
    { value: "la", label: "Latin America" },
    { value: "br", label: "Brazil" },
    { value: "kr", label: "Korea" },
    { value: "jp", label: "Japan" },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1>Welcome, {user.displayName?.split(" ")[0]} ⚡</h1>
        <p style={{ color: "var(--text2)", marginTop: "0.25rem" }}>
          Your VALFantasy dashboard — create or join a private league with friends.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
        {[["leagues", "My Leagues"], ["create", "Create League"], ["join", "Join League"]].map(([key, label]) => (
          <button
            key={key}
            className="btn"
            onClick={() => { setTab(key); setMsg({}); }}
            style={{
              background: tab === key ? "var(--accent)" : undefined,
              borderColor: tab === key ? "var(--accent)" : undefined,
              color: tab === key ? "#fff" : undefined,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* My Leagues */}
      {tab === "leagues" && (
        <div>
          {loading ? (
            <div className="spinner" />
          ) : leagues.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🏆</div>
              <h2 style={{ marginBottom: "0.5rem" }}>No leagues yet</h2>
              <p style={{ color: "var(--text2)", marginBottom: "1.5rem" }}>
                Create a league and share the code with friends, or join one.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                <button className="btn btn-accent" onClick={() => setTab("create")}>Create a league</button>
                <button className="btn" onClick={() => setTab("join")}>Join a league</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {leagues.map((league) => (
                <Link key={league.id} to={`/league/${league.id}`} style={{ textDecoration: "none" }}>
                  <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                  >
                    <div style={{ fontSize: "2rem" }}>🏆</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--text)" }}>{league.name}</div>
                      <div style={{ color: "var(--text2)", fontSize: "0.83rem", marginTop: "0.2rem" }}>
                        {league.members?.length || 0} members · Code: <span style={{ color: "var(--accent)", fontWeight: 700, letterSpacing: "0.05em" }}>{league.code}</span>
                        {" · "}{league.settings?.region?.toUpperCase() || "ALL"} region
                        {" · "}{league.settings?.rosterSize || 5} players per roster
                      </div>
                    </div>
                    <span style={{ color: "var(--text2)" }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create */}
      {tab === "create" && (
        <div className="card" style={{ maxWidth: 480 }}>
          <h2 style={{ marginBottom: "1.25rem" }}>Create a league</h2>
          {msg.text && (
            <div className={msg.type === "error" ? "error-msg" : "success-msg"} style={{ marginBottom: "1rem" }}>
              {msg.text}
            </div>
          )}
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label>League name</label>
              <input
                value={leagueName}
                onChange={e => setLeagueName(e.target.value)}
                placeholder="e.g. The Immortal League"
                required
              />
            </div>
            <div>
              <label>Region focus</label>
              <select value={region} onChange={e => setRegion(e.target.value)}>
                {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label>Roster size (players per team)</label>
              <select value={rosterSize} onChange={e => setRosterSize(e.target.value)}>
                {[3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} players</option>)}
              </select>
            </div>
            <button className="btn btn-accent" type="submit" disabled={working} style={{ justifyContent: "center" }}>
              {working ? "Creating…" : "Create league"}
            </button>
          </form>
        </div>
      )}

      {/* Join */}
      {tab === "join" && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 style={{ marginBottom: "1.25rem" }}>Join a league</h2>
          <p style={{ color: "var(--text2)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
            Enter the 6-character invite code your friend shared with you.
          </p>
          {msg.text && (
            <div className={msg.type === "error" ? "error-msg" : "success-msg"} style={{ marginBottom: "1rem" }}>
              {msg.text}
            </div>
          )}
          <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label>Invite code</label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB3X9Z"
                maxLength={6}
                style={{ letterSpacing: "0.15em", fontWeight: 700, fontSize: "1.1rem", textAlign: "center" }}
                required
              />
            </div>
            <button className="btn btn-accent" type="submit" disabled={working} style={{ justifyContent: "center" }}>
              {working ? "Joining…" : "Join league"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}