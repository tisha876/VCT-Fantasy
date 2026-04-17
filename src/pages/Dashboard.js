import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMatches, getResults } from "../utils/vlrApi";
import { getUserLeagues } from "../utils/firestore";

function isLive(m) {
  return (m.status||"").toLowerCase().includes("live") || (m.time_until_match||"").toLowerCase()==="live";
}

function MatchCard({ m, isResult }) {
  const live = !isResult && isLive(m);
  const t1    = m.team1 || m.team_a?.name || "TBD";
  const t2    = m.team2 || m.team_b?.name || "TBD";
  const score = m.score || (m.team_a?.score!=null ? `${m.team_a.score} – ${m.team_b?.score}` : null);
  const time  = m.time_until_match || m.date || "";
  const event = m.match_event || m.tournament || m.event || "";

  return (
    <div className={`match-card ${live?"live-card":""}`}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.5rem" }}>
        <span style={{ fontSize:"0.68rem", color:"var(--text2)", maxWidth:"65%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{event}</span>
        {live
          ? <span className="badge badge-live" style={{ display:"flex",gap:4,alignItems:"center" }}><span className="live-dot" style={{width:5,height:5}}/>LIVE</span>
          : isResult ? <span className="badge badge-gray">Final</span>
          : <span style={{ fontSize:"0.7rem",color:"var(--text2)" }}>{time}</span>
        }
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
        <div style={{ flex:1, textAlign:"right", fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:"1rem" }}>{t1}</div>
        <div style={{ minWidth:56, textAlign:"center" }}>
          {score
            ? <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:"1.05rem", color: live?"var(--live)":"var(--text2)" }}>{score}</span>
            : <span style={{ fontSize:"0.72rem", color:"var(--text3)" }}>VS</span>
          }
        </div>
        <div style={{ flex:1, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:"1rem" }}>{t2}</div>
      </div>
    </div>
  );
}

function ScrollingMatches({ matches }) {
  if (!matches.length) return null;
  const doubled = [...matches, ...matches];
  return (
    <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--radius)", overflow:"hidden", padding:"0.75rem 0" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", padding:"0 1rem 0.6rem", borderBottom:"1px solid var(--border)", marginBottom:"0.5rem" }}>
        <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="none" stroke="var(--orange)" strokeWidth="1.5"/><path d="M6 3v3l2 1.5" stroke="var(--orange)" strokeWidth="1.2" strokeLinecap="round"/></svg>
        <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text2)" }}>
          Upcoming Matches
        </span>
      </div>
      <div style={{ overflow:"hidden", padding:"0 0.5rem" }}>
        <div style={{ display:"flex", gap:"0.6rem", animation:"ticker 40s linear infinite", width:"max-content" }}>
          {doubled.map((m,i) => {
            const t1 = m.team1 || m.team_a?.name || "TBD";
            const t2 = m.team2 || m.team_b?.name || "TBD";
            const time = m.time_until_match || "";
            return (
              <div key={i} style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.35rem 0.85rem", background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", fontSize:"0.82rem", flexShrink:0, whiteSpace:"nowrap" }}>
                <span style={{ fontWeight:600 }}>{t1}</span>
                <span style={{ color:"var(--text3)" }}>vs</span>
                <span style={{ fontWeight:600 }}>{t2}</span>
                {time && <span style={{ color:"var(--text2)", fontSize:"0.72rem" }}>{time}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [matchData, setMatchData]   = useState([]);
  const [resultData, setResultData] = useState([]);
  const [leagues, setLeagues]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("upcoming");
  const timerRef = useRef(null);

  async function load() {
    try {
      const [md, rd, ld] = await Promise.all([
        getMatches().catch(()=>({segments:[]})),
        getResults().catch(()=>({segments:[]})),
        getUserLeagues(user.uid).catch(()=>[]),
      ]);
      setMatchData(md.segments||md.matches||md||[]);
      setResultData((rd.segments||rd.results||rd||[]).slice(0,20));
      setLeagues(ld);
    } catch(_) {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 10000);
    return () => clearInterval(timerRef.current);
  }, []);

  const liveMatches     = matchData.filter(isLive);
  const upcomingMatches = matchData.filter(m => !isLive(m) && (m.time_until_match||"")!=="");

  const displayMatches = tab==="live" ? liveMatches : tab==="upcoming" ? upcomingMatches : resultData;
  const medals = ["🥇","🥈","🥉"];

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"1rem", flexWrap:"wrap" }}>
          <div>
            <div style={{ color:"var(--text2)", fontSize:"0.76rem", fontWeight:600, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:"0.4rem" }}>
              Welcome back, {user.displayName?.split(" ")[0] || user.email?.split("@")[0]}
            </div>
            <h1 style={{ fontSize:"2.3rem", marginBottom:"0.4rem" }}>VAL<span style={{color:"var(--accent)"}}>Fantasy</span></h1>
            <p style={{ color:"var(--text2)", maxWidth:460, fontSize:"0.93rem" }}>
              Draft VCT pros, track live matches, and outperform your friends in a private fantasy league.
            </p>
          </div>
          <div style={{ display:"flex", gap:"0.65rem", flexWrap:"wrap", paddingTop:"0.2rem" }}>
            <Link to="/leagues"    className="btn btn-accent btn-lg">My Leagues</Link>
            <Link to="/live-matches" className="btn btn-lg">🔴 Live</Link>
          </div>
        </div>

        {liveMatches.length > 0 && (
          <div style={{ marginTop:"1.25rem", display:"flex", alignItems:"center", gap:"0.7rem", padding:"0.65rem 1rem", background:"rgba(34,197,94,0.05)", border:"1px solid rgba(34,197,94,0.22)", borderRadius:"var(--radius-sm)" }}>
            <span className="live-dot" />
            <span style={{ color:"var(--live)", fontWeight:600, fontSize:"0.88rem" }}>
              {liveMatches.length} match{liveMatches.length>1?"es":""} live now
            </span>
            <span style={{ color:"var(--text2)", fontSize:"0.8rem" }}>— scores auto-refresh every 10s</span>
          </div>
        )}
      </div>

      <div style={{ maxWidth:1120, margin:"0 auto", padding:"0 1.5rem 2.5rem" }}>
        {/* Scrolling upcoming */}
        {!loading && upcomingMatches.length > 0 && (
          <div style={{ marginBottom:"1.5rem" }}>
            <ScrollingMatches matches={upcomingMatches.slice(0,16)} />
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:"1.5rem", alignItems:"start" }}>
          {/* Main: match feed */}
          <div>
            {/* Stat row */}
            <div className="grid-4" style={{ marginBottom:"1.25rem" }}>
              {[
                { label:"Live",     val: loading?"—":liveMatches.length,     color:"var(--live)" },
                { label:"Upcoming", val: loading?"—":upcomingMatches.length, color:"var(--blue)" },
                { label:"Results",  val: loading?"—":resultData.length,      color:"var(--text2)" },
                { label:"Leagues",  val: loading?"—":leagues.length,         color:"var(--yellow)" },
              ].map(({label,val,color}) => (
                <div key={label} className="card card-flat" style={{ textAlign:"center", padding:"1rem 0.75rem" }}>
                  <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:"1.8rem", fontWeight:700, color }}>{val}</div>
                  <div style={{ fontSize:"0.7rem", color:"var(--text2)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="tabs">
              {liveMatches.length>0 && (
                <button className={`tab-btn ${tab==="live"?"active":""}`} onClick={()=>setTab("live")}>
                  <span style={{display:"flex",alignItems:"center",gap:5}}><span className="live-dot"/>Live ({liveMatches.length})</span>
                </button>
              )}
              <button className={`tab-btn ${tab==="upcoming"?"active":""}`} onClick={()=>setTab("upcoming")}>Upcoming</button>
              <button className={`tab-btn ${tab==="results"?"active":""}`} onClick={()=>setTab("results")}>Results</button>
            </div>

            {loading ? <div className="spinner"/> : displayMatches.length===0 ? (
              <div style={{ color:"var(--text2)", textAlign:"center", padding:"2rem" }}>No matches found.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
                {displayMatches.slice(0,18).map((m,i) => (
                  <MatchCard key={i} m={m} isResult={tab==="results"} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: leagues */}
          <div>
            <div className="sec-hdr">
              <span className="sec-title">My Leagues</span>
              <Link to="/leagues" className="btn btn-xs btn-ghost" style={{ fontSize:"0.76rem" }}>Manage →</Link>
            </div>

            {leagues.length===0 ? (
              <div className="card" style={{ textAlign:"center", padding:"2rem 1rem" }}>
                <div style={{ fontSize:"1.75rem", marginBottom:"0.6rem" }}>🏆</div>
                <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:"1.05rem", marginBottom:"0.35rem" }}>No leagues yet</div>
                <p style={{ color:"var(--text2)", fontSize:"0.82rem", marginBottom:"1rem" }}>Create a private league and invite your crew.</p>
                <Link to="/leagues" className="btn btn-accent btn-sm" style={{ display:"inline-flex" }}>Get started</Link>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.55rem" }}>
                {leagues.map(l => (
                  <Link key={l.id} to={`/league/${l.id}`} style={{ textDecoration:"none" }}>
                    <div className="card card-sm" style={{ cursor:"pointer" }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,70,85,0.4)"}
                      onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}
                    >
                      <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:"1rem", marginBottom:"0.35rem" }}>{l.name}</div>
                      <div style={{ display:"flex", gap:"0.3rem", flexWrap:"wrap", marginBottom:"0.6rem" }}>
                        <span className="badge badge-gray">{l.members?.length||0} members</span>
                        <span className="badge badge-accent" style={{ fontFamily:"monospace" }}>{l.code}</span>
                        <span className="badge badge-gray">{l.settings?.region?.toUpperCase()||"ALL"}</span>
                      </div>
                      <div style={{ display:"flex", gap:"0.4rem" }}>
                        <Link to={`/league/${l.id}/draft`} className="btn btn-xs btn-accent" onClick={e=>e.stopPropagation()}>Draft</Link>
                        <Link to={`/league/${l.id}/leaderboard`} className="btn btn-xs" onClick={e=>e.stopPropagation()}>Board</Link>
                      </div>
                    </div>
                  </Link>
                ))}
                <Link to="/leagues" className="btn btn-sm" style={{ justifyContent:"center" }}>+ Create / Join</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}