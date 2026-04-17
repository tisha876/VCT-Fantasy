import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getLeague, getRoster, getMatchEvents, getAllRosters,
  submitUserMatchScore, getLeaderboard, createMatchEvent, markMatchScored,
} from "../utils/firestore";
import { getRecentResults, getMatchDetail } from "../utils/vlrApi";
import { calculatePoints, determineMatchBonuses } from "../utils/scoring";

export default function League() {
  const { leagueId } = useParams();
  const { user }     = useAuth();
  const [league, setLeague]       = useState(null);
  const [roster, setRoster]       = useState([]);
  const [events, setEvents]       = useState([]);
  const [results, setResults]     = useState([]);
  const [leaderboard, setLB]      = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("overview");
  const timerRef = useRef(null);
  const medals = ["🥇","🥈","🥉"];
  const scoringRef = useRef(false);

  useEffect(() => {
  if (!leagueId || !user?.uid) return;

  load();

  const run = () => {
    if (document.visibilityState === "visible") {
      autoScore();
    }
  };

  timerRef.current = setInterval(run, 10000);

  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, [leagueId, user?.uid]);

  async function load() {
  if (!user?.uid) return;

  setLoading(true);
  try {
    const [l, r, e, res, lb] = await Promise.all([
      getLeague(leagueId),
      getRoster(user.uid, leagueId),
      getMatchEvents(leagueId),
      getRecentResults(20).catch(() => []),
      getLeaderboard(leagueId),
    ]);

    setLeague(l);
    setRoster(r?.players || []);
    setEvents(e || []);
    setResults(res || []);
    setLB(lb || []);
  } catch (e) {
    console.error("LOAD ERROR:", e);
  } finally {
    setLoading(false);
  }
}

  async function autoScore() {
  if (scoringRef.current) return; // prevent overlap
  scoringRef.current = true;

  try {
    if (!leagueId) return;

    const evList = await getMatchEvents(leagueId);
    if (!evList?.length) return;

    const unscored = evList.filter(e => !e.scored && e.matchId);
    if (!unscored.length) return;

    const allRosters = await getAllRosters(leagueId);

    for (const ev of unscored) {
      try {
        const matchData = await getMatchDetail(ev.matchId);
        if (!matchData) continue;

        const playerStats = extractStats(matchData);
        if (!playerStats.length) continue;

        const bonuses = determineMatchBonuses(playerStats);

        for (const r of allRosters || []) {
          let total = 0;
          const breakdowns = [];

          for (const rp of (r.players || [])) {

            // 🔥 FIXED NAME MATCHING
            const normalize = (str) =>
              (str || "")
                .toLowerCase()
                .replace(/\s+/g, "")
                .replace(/[^a-z0-9]/g, "");

            const pName = normalize(rp.ign || rp.alias || rp.name);

            const matched = playerStats.find(p =>
              normalize(p.player || p.ign || p.name) === pName
            );

            if (!matched) continue;

            const b = bonuses[matched.id || matched.player] || {};
            const won =
              normalize(matched.team) === normalize(ev.winner);

            const res = calculatePoints(
              matched,
              b.isTop3ACS,
              b.isPOTG,
              won
            );

            total += res.total;

            breakdowns.push({
              playerId: rp.id || rp.ign,
              playerName: rp.ign || rp.name,
              ...res.stats,
              points: res.total,
              isPOTG: b.isPOTG,
              isTop3ACS: b.isTop3ACS
            });
          }

          if (total > 0) {
            await submitUserMatchScore(
              leagueId,
              ev.matchId,
              r.userId,
              {
                totalPoints: total,
                playerBreakdowns: breakdowns,
                matchName: `${ev.team1} vs ${ev.team2}`,
                date: ev.date,
                displayName: r.displayName || r.userId,
                photoURL: r.photoURL || "",
              }
            );
          }
        }

        // 🔥 CRITICAL: mark AFTER successful scoring
        await markMatchScored(leagueId, ev.id);

      } catch (err) {
        console.error("MATCH ERROR:", ev.matchId, err);
      }
    }

    const lb = await getLeaderboard(leagueId);
    setLB(lb || []);

  } catch (err) {
    console.error("AUTOSCORE ERROR:", err);
  } finally {
    scoringRef.current = false;
  }
}

  function extractStats(data) {
  const raw = data?.players || data?.stats || data?.segments || [];

  return raw
    .filter(p => p?.player || p?.ign || p?.name)
    .map(p => ({
      id: p.id || p.player_id || p.ign,
      player: p.player || p.ign || p.name,
      kills: Number(p.kills || p.k || 0),
      deaths: Number(p.deaths || p.d || 0),
      assists: Number(p.assists || p.a || 0),
      acs: Number(p.acs || p.combat_score || 0),
      fk: Number(p.fk || p.first_kills || 0),
      clutches: Number(p.cl || p.clutches || 0),
      hs: Number(p.hs || p.headshot_pct || 0),
      team: p.team || p.team_name || "",
    }));
}

  const isOwner = league?.ownerId === user?.uid;

  if (loading) return <div className="page"><div className="spinner"/></div>;
  if (!league)  return <div className="page"><div className="alert alert-error">League not found.</div></div>;

  return (
    <div className="page">
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"1rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
        <div>
          <div style={{color:"var(--text2)",fontSize:"0.76rem",marginBottom:"0.4rem"}}>
            <Link to="/">Home</Link> / <Link to="/leagues">Leagues</Link> / {league.name}
          </div>
          <h1>{league.name}</h1>
          <div style={{display:"flex",gap:"0.35rem",marginTop:"0.45rem",flexWrap:"wrap"}}>
            <span className="badge badge-accent" style={{fontFamily:"monospace"}}>{league.code}</span>
            <span className="badge badge-gray">{league.members?.length||0} members</span>
            <span className="badge badge-purple">{league.settings?.region?.toUpperCase()||"ALL"}</span>
            {isOwner && <span className="badge badge-yellow">Owner</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:"0.55rem",flexWrap:"wrap"}}>
          <Link to={`/league/${leagueId}/draft`} className="btn btn-accent">✏️ {roster.length?"Edit Roster":"Draft Players"}</Link>
          <Link to={`/league/${leagueId}/leaderboard`} className="btn">🏆 Leaderboard</Link>
        </div>
      </div>

      <div className="tabs">
        {[["overview","Overview"],["events","Match Events"],["results","Recent Results"]].map(([k,l])=>(
          <button key={k} className={`tab-btn ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==="overview" && (
        <div>
          <div className="grid-2" style={{gap:"1.25rem",marginBottom:"1.25rem"}}>
            {/* My roster */}
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.9rem"}}>
                <h2>My Roster</h2>
                <Link to={`/league/${leagueId}/draft`} className="btn btn-sm">Edit</Link>
              </div>
              {roster.length===0 ? (
                <div style={{textAlign:"center",padding:"1.5rem 0",color:"var(--text2)"}}>
                  <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🎯</div>
                  <p>No players drafted yet.</p>
                  <Link to={`/league/${leagueId}/draft`} className="btn btn-accent btn-sm" style={{marginTop:"0.75rem",display:"inline-flex"}}>Draft now</Link>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
                  {roster.map((p,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"0.55rem",padding:"0.45rem 0.6rem",background:"var(--bg3)",borderRadius:"var(--radius-sm)"}}>
                      <span style={{color:"var(--text3)",fontSize:"0.7rem",width:14,textAlign:"center"}}>{i+1}</span>
                      {p.img && <img src={p.img} alt="" style={{width:26,height:26,borderRadius:"50%",objectFit:"cover"}}/>}
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:"0.85rem"}}>{p.ign||p.alias||p.name}</div>
                        <div style={{fontSize:"0.7rem",color:"var(--text2)"}}>{p.team||p.current_team||"—"}</div>
                      </div>
                      {(p.region||p.country) && <span className="badge badge-blue" style={{fontSize:"0.62rem"}}>{(p.region||p.country||"").toUpperCase().slice(0,3)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mini leaderboard */}
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.9rem"}}>
                <h2>Standings</h2>
                <Link to={`/league/${leagueId}/leaderboard`} className="btn btn-sm">Full</Link>
              </div>
              {leaderboard.length===0 ? (
                <div style={{textAlign:"center",padding:"1.5rem 0",color:"var(--text2)",fontSize:"0.85rem"}}>
                  No scores yet. Points update automatically after matches.
                </div>
              ) : leaderboard.slice(0,5).map((e,i)=>{
                const me = e.userId===user.uid;
                return (
                  <div key={e.id} className={`lb-row ${me?"me":""}`} style={{marginBottom:"0.2rem",gridTemplateColumns:"28px 1fr 70px"}}>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>{medals[i]||i+1}</span>
                    <div style={{display:"flex",alignItems:"center",gap:"0.45rem",minWidth:0}}>
                      {e.photoURL && <img src={e.photoURL} alt="" style={{width:22,height:22,borderRadius:"50%",flexShrink:0}}/>}
                      <span style={{fontSize:"0.83rem",fontWeight:me?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {e.displayName||"—"}{me&&<span style={{color:"var(--accent)",marginLeft:4,fontSize:"0.68rem"}}>(you)</span>}
                      </span>
                    </div>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1rem",color:me?"var(--accent)":"var(--text)",textAlign:"right"}}>
                      {(e.totalPoints||0).toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invite */}
          <div className="card" style={{display:"flex",alignItems:"center",gap:"1.25rem",flexWrap:"wrap"}}>
            <div style={{flex:1}}>
              <h3>Invite Friends</h3>
              <p style={{color:"var(--text2)",fontSize:"0.82rem",marginTop:"0.2rem"}}>Share this code — friends join from the Leagues page.</p>
            </div>
            <div style={{fontFamily:"monospace",fontSize:"1.7rem",fontWeight:700,color:"var(--accent)",letterSpacing:"0.22em",padding:"0.55rem 1.1rem",background:"var(--bg3)",border:"2px solid rgba(255,70,85,0.3)",borderRadius:"var(--radius-sm)"}}>
              {league.code}
            </div>
            <button className="btn btn-sm" onClick={()=>navigator.clipboard.writeText(league.code)}>Copy</button>
          </div>
        </div>
      )}

      {tab==="events" && (
        <div>
          <p style={{color:"var(--text2)",fontSize:"0.85rem",marginBottom:"1rem"}}>
            Points auto-calculate every 10 seconds from VLR match data. Add a match ID below to trigger scoring.
          </p>
          {isOwner && <AddEventForm leagueId={leagueId} onAdded={load}/>}
          {events.length===0 ? (
            <div style={{color:"var(--text2)",textAlign:"center",padding:"2rem"}}>No match events yet.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.55rem",marginTop:"1rem"}}>
              {events.map(ev=>(
                <div key={ev.id} style={{display:"flex",alignItems:"center",gap:"1rem",padding:"0.7rem 1rem",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",flexWrap:"wrap"}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:"0.88rem"}}>{ev.team1} vs {ev.team2}</div>
                    <div style={{fontSize:"0.72rem",color:"var(--text2)",marginTop:"0.1rem"}}>
                      {ev.event||"VCT"}{ev.date?` · ${ev.date}`:""} · ID: <span style={{fontFamily:"monospace"}}>{ev.matchId||"—"}</span>
                    </div>
                  </div>
                  <span className={`badge ${ev.scored?"badge-green":"badge-yellow"}`}>{ev.scored?"✅ Scored":"⏳ Pending"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==="results" && (
        <div>
          <p style={{color:"var(--text2)",fontSize:"0.85rem",marginBottom:"1rem"}}>
            Recent VCT results — use these for research before drafting.
          </p>
          {results.length===0 ? (
            <div style={{color:"var(--text2)",textAlign:"center",padding:"2rem"}}>No results available.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
              {results.map((m,i)=>{
                const t1=m.team1||m.team_a?.name||"TBD";
                const t2=m.team2||m.team_b?.name||"TBD";
                const score=m.score||(m.team_a?.score!=null?`${m.team_a.score}–${m.team_b?.score}`:"");
                const event=m.match_event||m.tournament||m.event||"";
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"1rem",padding:"0.6rem 1rem",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)"}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:"0.88rem"}}>{t1} vs {t2}</div>
                      <div style={{fontSize:"0.72rem",color:"var(--text2)",marginTop:"0.1rem"}}>{event}{m.date?` · ${m.date}`:""}</div>
                    </div>
                    {score && <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1rem",color:"var(--text2)"}}>{score}</div>}
                    <span className="badge badge-gray">Final</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddEventForm({ leagueId, onAdded }) {
  const [form, setForm] = useState({ matchId:"",team1:"",team2:"",event:"",date:"",winner:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  async function handle(e) {
    e.preventDefault();
    if (!form.matchId.trim()||!form.team1.trim()||!form.team2.trim()) return;
    setSaving(true);
    try {
      await createMatchEvent(leagueId, form);
      setMsg("Match added! Auto-scoring within 10 seconds.");
      setForm({ matchId:"",team1:"",team2:"",event:"",date:"",winner:"" });
      onAdded();
    } catch(e){ setMsg("Error: "+e.message); }
    finally { setSaving(false); }
  }

  const f = (k) => e => setForm(p=>({...p,[k]:e.target.value}));

  return (
    <div className="card" style={{marginBottom:"1rem"}}>
      <h3 style={{ marginBottom: "0.75rem" }}>
  Add Match Event{" "}
  <span
    style={{
      color: "var(--text2)",
      fontSize: "0.75rem",
      fontWeight: 400
    }}
  >
    (Owner only)
  </span>
</h3>
      <p style={{color:"var(--text2)",fontSize:"0.8rem",marginBottom:"0.9rem"}}>
        Enter a VLR match ID to add an event. Points will auto-calculate after the match ends.
        <br/>
        Find match IDs in the URL on VLR, e.g. 
         <span style={{fontFamily:"monospace"}}>vlr.gg/&lt;matchId&gt;</span>
      </p>
      {msg && <div className="alert alert-info" style={{marginBottom:"0.7rem",fontSize:"0.8rem"}}>{msg}</div>}
      <form onSubmit={handle}>
        <div className="grid-2" style={{gap:"0.65rem",marginBottom:"0.65rem"}}>
          <div><label>VLR Match ID *</label><input value={form.matchId} onChange={f("matchId")} placeholder="e.g. 391823" required/></div>
          <div><label>Event</label><input value={form.event} onChange={f("event")} placeholder="e.g. VCT 2025 Americas"/></div>
          <div><label>Team 1 *</label><input value={form.team1} onChange={f("team1")} placeholder="e.g. Sentinels" required/></div>
          <div><label>Team 2 *</label><input value={form.team2} onChange={f("team2")} placeholder="e.g. Cloud9" required/></div>
          <div><label>Date</label><input value={form.date} onChange={f("date")} placeholder="e.g. Apr 17 2025"/></div>
          <div><label>Winner (for +10 win bonus)</label><input value={form.winner} onChange={f("winner")} placeholder="e.g. Sentinels"/></div>
        </div>
        <button className="btn btn-accent btn-sm" type="submit" disabled={saving}>{saving?"Adding…":"Add match event"}</button>
      </form>
    </div>
  );
}