import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate("/");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "2rem",
    }}>
      {/* Logo area */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⚡</div>
        <h1 style={{ marginBottom: "0.25rem" }}>
          VAL<span style={{ color: "var(--accent)" }}>Fantasy</span>
        </h1>
        <p style={{ color: "var(--text2)", fontSize: "0.95rem" }}>
          Fantasy esports for Valorant — compete with your friends
        </p>
      </div>

      {/* Card */}
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h2 style={{ marginBottom: "0.5rem", textAlign: "center" }}>Sign in</h2>
        <p style={{ color: "var(--text2)", fontSize: "0.85rem", textAlign: "center", marginBottom: "1.5rem" }}>
          Use your Google account to get started. Your friends will need to sign in too.
        </p>

        {error && <div className="error-msg" style={{ marginBottom: "1rem" }}>{error}</div>}

        <button
          className="btn"
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "0.75rem",
            fontSize: "0.95rem",
            gap: "0.75rem",
          }}
        >
          {/* Google G icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        <p style={{ color: "var(--text2)", fontSize: "0.78rem", textAlign: "center", marginTop: "1.25rem" }}>
          This app is private — share your invite code with friends after signing in.
        </p>
      </div>

      {/* Feature hints */}
      <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
        {[
          ["🎯", "Draft pro players"],
          ["📊", "Live match scoring"],
          ["🏆", "League leaderboard"],
          ["⚡", "ACS & POTG bonuses"],
        ].map(([icon, text]) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text2)", fontSize: "0.82rem" }}>
            <span>{icon}</span> {text}
          </div>
        ))}
      </div>
    </div>
  );
}