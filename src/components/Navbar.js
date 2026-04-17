import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav style={{
      background: "var(--bg2)",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        height: 56,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <span style={{ fontSize: "1.4rem" }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text)" }}>
            VAL<span style={{ color: "var(--accent)" }}>Fantasy</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", flex: 1 }}>
          <Link to="/" style={{ color: "var(--text2)", fontSize: "0.88rem" }}>Home</Link>
          <Link to="/scoring-rules" style={{ color: "var(--text2)", fontSize: "0.88rem" }}>Scoring Rules</Link>
        </div>

        {/* User */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img
              src={user.photoURL}
              alt={user.displayName}
              style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid var(--border)" }}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--text2)" }}>
              {user.displayName?.split(" ")[0]}
            </span>
            <button className="btn btn-sm" onClick={handleLogout}>Sign out</button>
          </div>
        )}
      </div>
    </nav>
  );
}