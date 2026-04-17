import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserLeagues } from "../utils/firestore";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState([]);
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef(null);

  useEffect(() => {
    if (user) getUserLeagues(user.uid).then(setLeagues).catch(() => {});
  }, [user]);

  useEffect(() => {
    const handler = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (path) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path))
      ? "nav-link active" : "nav-link";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" fill="none" stroke="var(--accent)" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="3" fill="var(--accent)" opacity="0.85"/>
          </svg>
          VAL<span className="accent">Fantasy</span>
        </Link>

        <div className="nav-links">
          <Link to="/" className={isActive("/")}>Home</Link>

          <Link to="/live-matches" className={isActive("/live-matches")} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="nav-live-dot" />Live
          </Link>

          <Link to="/pros" className={isActive("/pros")}>Pros</Link>

          {/* Leagues dropdown */}
          <div className="nav-dd" ref={ddRef}>
            <button
              className={`nav-link btn-ghost ${location.pathname.includes("/league") || location.pathname === "/leagues" ? "active" : ""}`}
              style={{ border: "none", background: ddOpen ? "var(--bg3)" : undefined, display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => setDdOpen(o => !o)}
            >
              Leagues
              <svg width="10" height="10" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.5, marginTop: 1 }}>
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {ddOpen && (
              <div className="nav-dd-menu">
                <Link to="/leagues" className="nav-dd-item" onClick={() => setDdOpen(false)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="var(--text2)"><rect x="1" y="3" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M5 3V2a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.2"/></svg>
                  Manage leagues
                </Link>
                {leagues.length > 0 && <div className="nav-dd-sep" />}
                {leagues.slice(0, 6).map(l => (
                  <Link key={l.id} to={`/league/${l.id}`} className="nav-dd-item" onClick={() => setDdOpen(false)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="var(--yellow)"><path d="M6 1l1.4 2.8L10.5 4.3l-2.25 2.2.53 3.1L6 8.1 3.22 9.6l.53-3.1L1.5 4.3l3.1-.5L6 1z"/></svg>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</span>
                    <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "0.65rem", color: "var(--text3)" }}>{l.code}</span>
                  </Link>
                ))}
                <div className="nav-dd-sep" />
                <Link to="/leagues" className="nav-dd-item" onClick={() => setDdOpen(false)} style={{ color: "var(--accent)", fontSize: "0.8rem" }}>
                  + Create / Join league
                </Link>
              </div>
            )}
          </div>

          <Link to="/scoring-rules" className={isActive("/scoring-rules")}>Scoring</Link>
        </div>

        {/* User */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginLeft: "auto", flexShrink: 0 }}>
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || "U")}&background=ff4655&color=fff`}
              alt="" style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid var(--border2)", flexShrink: 0 }} />
            <span style={{ fontSize: "0.83rem", color: "var(--text2)", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.displayName?.split(" ")[0] || user.email?.split("@")[0]}
            </span>
            <button className="btn btn-sm btn-ghost" onClick={handleLogout} style={{ color: "var(--text2)" }}>Out</button>
          </div>
        )}
      </div>
    </nav>
  );
}