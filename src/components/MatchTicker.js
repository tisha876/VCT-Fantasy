import React, { useState, useEffect, useRef } from "react";
import { getMatches, getResults } from "../utils/vlrApi";

function isLive(m) {
  return (m.status || "").toLowerCase().includes("live") ||
    (m.time_until_match || "").toLowerCase() === "live";
}

export default function MatchTicker() {
  const [items, setItems] = useState([]);
  const timerRef = useRef(null);

  async function load() {
    try {
      const [md, rd] = await Promise.all([
        getMatches().catch(() => ({ segments: [] })),
        getResults().catch(() => ({ segments: [] })),
      ]);
      const matches = md.segments || md.matches || md || [];
      const results = rd.segments || rd.results || rd || [];
      const combined = [
        ...matches.slice(0, 14).map(m => ({ ...m, _type: "match" })),
        ...results.slice(0, 10).map(m => ({ ...m, _type: "result" })),
      ];
      if (combined.length) setItems(combined);
    } catch (_) {}
  }

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  if (!items.length) return null;
  const doubled = [...items, ...items];

  return (
    <div className="ticker-wrap">
      <div className="ticker-label">
        <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="var(--accent)"/></svg>
        VCT
      </div>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div className="ticker-scroll">
          {doubled.map((m, i) => {
            const live = isLive(m);
            const t1 = m.team1 || m.team_a?.name || "TBD";
            const t2 = m.team2 || m.team_b?.name || "TBD";
            const score = m.score || (m.team_a?.score != null ? `${m.team_a.score}–${m.team_b?.score}` : null);
            const time = live ? "LIVE" : (m.time_until_match || m.date || "");
            const event = m.match_event || m.tournament || m.event || "";
            return (
              <div key={i} className="ticker-item">
                {live && <span className="live-dot" />}
                <span className="tn">{t1}</span>
                {score
                  ? <span className="sc">{score}</span>
                  : <span style={{ color: "var(--text3)", fontSize: "0.72rem" }}>vs</span>
                }
                <span className="tn">{t2}</span>
                {time && (
                  <span style={{ fontSize: "0.7rem", color: live ? "var(--live)" : "var(--text2)", fontWeight: live ? 700 : 400 }}>
                    {time}
                  </span>
                )}
                {event && <span className="ev">· {event}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}