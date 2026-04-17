import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LiveMatchTracker from "../components/LiveMatchTracker";

export default function LiveMatches() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "2rem" }}>
      {/* Header with back button */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "2rem"
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text)",
            fontSize: "1.5rem",
            cursor: "pointer",
            padding: "0.5rem"
          }}
          title="Go back"
        >
          ← Back
        </button>
        <h1 style={{ flex: 1, marginLeft: "1rem" }}>🔴 Live Matches</h1>
      </div>

      {/* Live Match Tracker Component */}
      <LiveMatchTracker />
    </div>
  );
}
