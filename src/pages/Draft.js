import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLeague, getRoster, saveRoster, lockRoster } from "../utils/firestore";
import { getPlayers, getPlayer, getRecentResults } from "../utils/vlrApi";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const REGIONS = [
  {value:"all",label:"All regions"},{value:"na",label:"NA"},{value:"eu",label:"EU"},
  {value:"ap",label:"AP"},{value:"la",label:"LA"},{value:"br",label:"BR"},{value:"kr",label:"KR"},
];

function Avatar({ p, size=34 }) {
  const name = p?.ign||p?.alias||p?.name||"?";
  if (p?.img) return <img src={p.img} alt="" className="player-avatar" style={{width:size,height:size}} onError={e=>e.target.style.display="none"}/>;
  return <div className="player-avatar-placeholder" style={{width:size,height:size,fontSize:size*0.32}}>{name.slice(0,2).toUpperCase()}</div>;
}

function StatBar({ label, value, max, color="var(--accent)" }) {
  const pct = max>0 ? Math.min(100,(value/max)*100) : 0;
  return (
    <div className="bar-row">
      <div className="bar-label">{label}</div>
      <div className="bar-track"><div className="bar-fill" style={{width:`${pct}%`,background:color}}/></div>
      <div className="bar-val">{typeof value==="number" ? (Number.isInteger(value)?value:value.toFixed(1)) : (value??"-")}</div>
    </div>
  );
}

function PlayerModal({ player, onClose, onAdd, onRemove, isOnRoster, isLocked, canAdd }) {
  const [detail, setDetail]   = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("stats");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const id = player.id || player.player_id;
        if (id) {
          const d = await getPlayer(id).catch(()=>null);
          setDetail(d);
        }
        const res = await getRecentResults(30).catch(()=>[]);
        const team = player.team || player.current_team || detail?.team || "";
        if (team) {
          const key = team.toLowerCase().slice(0,5);
          setMatches(res.filter(m => (m.team1||"").toLowerCase().includes(key)||(m.team2||"").toLowerCase().includes(key)).slice(0,8));
        }
      } catch(_) {}
      setLoading(false);
    })();
  }, [player]);

  const name   = player.ign||player.alias||player.name;
  const team   = detail?.team || detail?.current_team || player.team || player.current_team || "Free Agent";
  const country= detail?.country || player.country || "";
  const region2= detail?.region  || player.region  || "";
  const stats  = detail?.stats   || player.stats   || {};

  const chartStats = [
    { label:"ACS",  value:parseFloat(stats.acs||0),  max:400, color:"var(--accent)" },
    { label:"K/D",  value:parseFloat(stats.kd||0),   max:3,   color:"var(--green)" },
    { label:"KAST", value:parseFloat(stats.kast||0), max:100, color:"var(--blue)" },
    { label:"HS%",  value:parseFloat(stats.hs||0),   max:60,  color:"var(--yellow)" },
    { label:"KPR",  value:parseFloat(stats.kpr||0),  max:1.5, color:"var(--purple)" },
    { label:"APR",  value:parseFloat(stats.apr||0),  max:1,   color:"var(--orange)" },
  ].filter(s=>s.value>0);

  const agentData = (stats.agents||[]).slice(0,5).map(a=>({
    agent: a.agent||a.name, games: parseInt(a.games||a.played||0),
    acs: parseFloat(a.acs||a.rating||0),
  }));

  const recentMatchData = (stats.recent_matches||[]).slice(-10).map((m,i)=>({
    name: `M${i+1}`, acs: parseFloat(m.acs||0), kills: parseInt(m.kills||0),
  })).filter(m=>m.acs>0||m.kills>0);

  const tooltipStyle = { backgroundColor:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", fontSize:"0.78rem" };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:"flex", gap:"0.9rem", marginBottom:"1.1rem", alignItems:"center" }}>
          <Avatar p={{...player,img:player.img}} size={50}/>
          <div style={{flex:1}}>
            <h2 style={{marginBottom:"0.25rem"}}>{name}</h2>
            <div style={{ display:"flex", gap:"0.3rem", flexWrap:"wrap" }}>
              <span className="badge badge-gray">{team}</span>
              {country && <span className="badge badge-blue">{country}</span>}
              {region2 && <span className="badge badge-purple">{region2.toUpperCase()}</span>}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{fontSize:"1.1rem",lineHeight:1}}>×</button>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{marginBottom:"1rem"}}>
          {[["stats","Stats & Charts"],["agents","Agents"],["matches","Team History"]].map(([k,l])=>(
            <button key={k} className={`tab-btn ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {loading ? <div className="spinner"/> : (
          <>
            {tab==="stats" && (
              <div>
                {/* Stat pills */}
                <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap", marginBottom:"1.1rem" }}>
                  {[
                    {l:"ACS",v:stats.acs},{l:"K/D",v:stats.kd},
                    {l:"KAST",v:stats.kast?`${stats.kast}%`:null},
                    {l:"HS%",v:stats.hs?`${stats.hs}%`:null},
                    {l:"KPR",v:stats.kpr},{l:"APR",v:stats.apr},
                    {l:"FK",v:stats.fk||stats.first_kills},
                  ].filter(s=>s.v!=null&&s.v!=="").map(({l,v})=>(
                    <div key={l} className="stat-pill"><span className="stat-val">{v}</span><span className="stat-lbl">{l}</span></div>
                  ))}
                </div>

                {/* Bar charts */}
                {chartStats.length>0 ? (
                  <>
                    <div style={{ fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text2)", marginBottom:"0.7rem" }}>
                      Performance (last 60 days)
                    </div>
                    {chartStats.map(s=><StatBar key={s.label} label={s.label} value={s.value} max={s.max} color={s.color}/>)}
                  </>
                ) : <p style={{color:"var(--text2)",fontSize:"0.85rem"}}>No stat data available for this player.</p>}

                {/* Line chart for recent matches */}
                {recentMatchData.length>2 && (
                  <div style={{marginTop:"1.25rem"}}>
                    <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--text2)",marginBottom:"0.6rem"}}>Recent match ACS trend</div>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={recentMatchData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                        <XAxis dataKey="name" stroke="var(--text2)" fontSize={11}/>
                        <YAxis stroke="var(--text2)" fontSize={11}/>
                        <Tooltip contentStyle={tooltipStyle}/>
                        <Line type="monotone" dataKey="acs" stroke="var(--accent)" strokeWidth={2} dot={{r:3}} name="ACS"/>
                        <Line type="monotone" dataKey="kills" stroke="var(--green)" strokeWidth={2} dot={{r:3}} name="Kills"/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {tab==="agents" && (
              <div>
                <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--text2)",marginBottom:"0.7rem"}}>Agent pool (games played)</div>
                {agentData.length===0
                  ? <p style={{color:"var(--text2)",fontSize:"0.85rem"}}>No agent data available.</p>
                  : (
                    <>
                      {agentData.map(a=><StatBar key={a.agent} label={a.agent} value={a.games} max={Math.max(...agentData.map(x=>x.games))||1} color="var(--purple)"/>)}
                      {agentData.some(a=>a.acs>0) && (
                        <div style={{marginTop:"1rem"}}>
                          <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--text2)",marginBottom:"0.6rem"}}>ACS per agent</div>
                          <ResponsiveContainer width="100%" height={130}>
                            <BarChart data={agentData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                              <XAxis dataKey="agent" stroke="var(--text2)" fontSize={11}/>
                              <YAxis stroke="var(--text2)" fontSize={11}/>
                              <Tooltip contentStyle={tooltipStyle}/>
                              <Bar dataKey="acs" fill="var(--accent)" name="ACS" radius={[3,3,0,0]}/>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  )
                }
              </div>
            )}

            {tab==="matches" && (
              <div>
                <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--text2)",marginBottom:"0.7rem"}}>
                  Recent matches for {team} (research)
                </div>
                {matches.length===0
                  ? <p style={{color:"var(--text2)",fontSize:"0.85rem"}}>No match history found for this team.</p>
                  : matches.map((m,i)=>{
                    const t1=m.team1||m.team_a?.name||"?";
                    const t2=m.team2||m.team_b?.name||"?";
                    const score=m.score||(m.team_a?.score!=null?`${m.team_a.score}–${m.team_b?.score}`:"");
                    return (
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.45rem 0",borderBottom:"1px solid var(--border)" }}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:"0.85rem",fontWeight:500}}>{t1} vs {t2}</div>
                          <div style={{fontSize:"0.72rem",color:"var(--text2)"}}>{m.match_event||m.tournament||m.event||""}{m.date?` · ${m.date}`:""}</div>
                        </div>
                        {score && <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:"var(--text2)",fontSize:"0.95rem"}}>{score}</span>}
                        <span className="badge badge-gray">Final</span>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </>
        )}

        {/* Footer buttons */}
        <div style={{ display:"flex",gap:"0.6rem",marginTop:"1.25rem",paddingTop:"1rem",borderTop:"1px solid var(--border)" }}>
          {!isLocked && (
            isOnRoster
              ? <button className="btn" onClick={()=>{onRemove(player);onClose();}}>Remove from roster</button>
              : <button className="btn btn-accent" disabled={!canAdd} onClick={()=>{onAdd(player);onClose();}}>{canAdd?"Add to roster":"Roster full"}</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function Draft() {
  const { leagueId } = useParams();
  const { user }     = useAuth();

  const [league, setLeague]   = useState(null);
  const [roster, setRoster]   = useState([]);
  const [locked, setLocked]   = useState(false);
  const [players, setPlayers] = useState([]);
  const [search, setSearch]   = useState("");
  const [region, setRegion]   = useState("all");
  const [page, setPage]       = useState(1);
  const [loadingP, setLoadingP] = useState(false);
  const [apiErr, setApiErr]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState({type:"",text:""});
  const [selPlayer, setSelPlayer] = useState(null);

  useEffect(() => { loadLeague(); }, [leagueId]);
  useEffect(() => { fetchPlayers(); }, [region, page]);

  async function loadLeague() {
    try {
      const [l,r] = await Promise.all([getLeague(leagueId), getRoster(user.uid, leagueId)]);
      setLeague(l); setRoster(r.players||[]); setLocked(r.lockedIn||false);
    } catch(e){ console.error(e); }
  }

  async function fetchPlayers() {
    setLoadingP(true); setApiErr("");
    try {
      const data = await getPlayers(region, 30, page);
      setPlayers(data.players||data.segments||data||[]);
    } catch(_){ setApiErr("Could not load players. The VLR API may be temporarily unavailable."); }
    finally { setLoadingP(false); }
  }

  const rosterSize  = league?.settings?.rosterSize || 5;
  const maxPerTeam  = league?.settings?.maxPlayersPerTeam || 2;

  const filtered = players.filter(p => {
    const q = search.toLowerCase();
    return !q || [p.ign,p.name,p.alias,p.team,p.current_team].some(f=>(f||"").toLowerCase().includes(q));
  });

  function getId(p) { return p.id||p.player_id||p.ign; }
  function isOnRoster(p) { return roster.some(r=>getId(r)===getId(p)); }
  function teamCnt(name) { return roster.filter(r=>(r.team||r.current_team)===name).length; }
  function teamMaxed(p) { const t=p.team||p.current_team; return t?teamCnt(t)>=maxPerTeam:false; }
  function canAdd(p)    { return roster.length<rosterSize && !isOnRoster(p) && !teamMaxed(p); }

  function addPlayer(p)    { if (canAdd(p)) setRoster(prev=>[...prev,p]); }
  function removePlayer(p) { setRoster(prev=>prev.filter(r=>getId(r)!==getId(p))); }

  async function handleSave() {
    setSaving(true); setSaveMsg({});
    try { await saveRoster(user.uid,leagueId,roster); setSaveMsg({type:"success",text:"Roster saved!"}); }
    catch(e) { setSaveMsg({type:"error",text:e.message}); }
    finally { setSaving(false); }
  }

  async function handleLock() {
    if (!window.confirm("Lock your roster? No changes after this.")) return;
    setSaving(true);
    try {
      await saveRoster(user.uid,leagueId,roster);
      await lockRoster(user.uid,leagueId);
      setLocked(true); setSaveMsg({type:"success",text:"Roster locked! Good luck!"});
    } catch(e) { setSaveMsg({type:"error",text:e.message}); }
    finally { setSaving(false); }
  }

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div style={{ marginBottom:"1.25rem" }}>
        <div style={{ color:"var(--text2)", fontSize:"0.76rem", marginBottom:"0.5rem" }}>
          <Link to="/">Home</Link> / <Link to={`/league/${leagueId}`}>{league?.name||"League"}</Link> / Draft
        </div>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"1rem", flexWrap:"wrap" }}>
          <div>
            <h1>Draft Your Roster</h1>
            <p style={{ color:"var(--text2)", fontSize:"0.85rem", marginTop:"0.25rem" }}>
              Pick {rosterSize} players · Max {maxPerTeam} per team · Click <strong>Info</strong> for full stats &amp; match history
            </p>
          </div>
          {locked && <span className="badge badge-green" style={{padding:"0.4rem 0.8rem",fontSize:"0.82rem"}}>🔒 Locked</span>}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 310px", gap:"1.5rem" }}>
        {/* Player list */}
        <div>
          <div style={{ display:"flex", gap:"0.55rem", marginBottom:"0.9rem", flexWrap:"wrap" }}>
            <input placeholder="Search player, IGN or team…" value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:170}}/>
            <select value={region} onChange={e=>{setRegion(e.target.value);setPage(1);}} style={{width:130}}>
              {REGIONS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {apiErr && <div className="alert alert-error" style={{marginBottom:"0.75rem"}}>{apiErr}</div>}

          {loadingP ? (
            <div style={{display:"flex",flexDirection:"column",gap:"0.45rem"}}>
              {Array.from({length:8}).map((_,i)=>(
                <div key={i} style={{height:56,borderRadius:"var(--radius-sm)",background:"var(--bg2)",border:"1px solid var(--border)",opacity:0.5+(i*0.05)}}/>
              ))}
            </div>
          ) : (
            <>
              <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
                {filtered.map(player => {
                  const onR  = isOnRoster(player);
                  const tMax = teamMaxed(player) && !onR;
                  const rFull= roster.length>=rosterSize && !onR;
                  const team = player.team||player.current_team||"";
                  const reg  = player.region||"";

                  return (
                    <div key={getId(player)} className={`player-row ${onR?"on-roster":""}`}>
                      <Avatar p={player}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:"0.88rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {player.ign||player.alias||player.name}
                        </div>
                        <div style={{display:"flex",gap:"0.3rem",marginTop:"0.12rem",flexWrap:"wrap"}}>
                          {team && <span className="badge badge-gray" style={{fontSize:"0.62rem"}}>{team}</span>}
                          {reg  && <span className="badge badge-blue" style={{fontSize:"0.62rem"}}>{reg.toUpperCase()}</span>}
                          {player.country && <span style={{fontSize:"0.68rem",color:"var(--text2)"}}>{player.country}</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:"0.35rem",flexShrink:0}}>
                        <button
                          className={`btn btn-sm ${onR?"":"btn-accent"}`}
                          disabled={locked||rFull||(tMax&&!onR)}
                          style={{opacity:(locked||rFull||tMax)&&!onR?0.4:1}}
                          onClick={()=>onR?removePlayer(player):addPlayer(player)}
                        >
                          {onR?"Remove":tMax?"Team full":rFull?"Full":"Add"}
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={()=>setSelPlayer(player)}>Info</button>
                      </div>
                    </div>
                  );
                })}
                {filtered.length===0 && <div style={{color:"var(--text2)",textAlign:"center",padding:"2rem"}}>No players found.</div>}
              </div>
              <div style={{display:"flex",gap:"0.5rem",marginTop:"1rem",justifyContent:"center",alignItems:"center"}}>
                <button className="btn btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
                <span style={{fontSize:"0.82rem",color:"var(--text2)",padding:"0 0.5rem"}}>Page {page}</span>
                <button className="btn btn-sm" onClick={()=>setPage(p=>p+1)} disabled={filtered.length<30}>Next →</button>
              </div>
            </>
          )}
        </div>

        {/* My roster */}
        <div style={{position:"sticky",top:"calc(var(--nav-h) + 1rem)"}}>
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.9rem"}}>
              <h3>My Roster</h3>
              <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.1rem"}}>
                <span style={{color:roster.length===rosterSize?"var(--green)":"var(--text)"}}>{roster.length}</span>
                <span style={{color:"var(--text2)"}}>/{rosterSize}</span>
              </span>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:"0.4rem",marginBottom:"0.9rem"}}>
              {Array.from({length:rosterSize}).map((_,i)=>{
                const p=roster[i];
                return (
                  <div key={i} style={{
                    display:"flex",alignItems:"center",gap:"0.55rem",
                    padding:"0.45rem 0.65rem",
                    background:p?"var(--bg3)":"transparent",
                    border:`1px ${p?"solid":"dashed"} ${p?"var(--border2)":"var(--border)"}`,
                    borderRadius:"var(--radius-sm)",minHeight:44,
                  }}>
                    <span style={{color:"var(--text3)",fontSize:"0.7rem",width:14,flexShrink:0,textAlign:"center"}}>{i+1}</span>
                    {p ? (
                      <>
                        <Avatar p={p} size={26}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:"0.8rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.ign||p.alias||p.name}</div>
                          <div style={{fontSize:"0.67rem",color:"var(--text2)"}}>{p.team||p.current_team||"—"}</div>
                        </div>
                        {!locked && <button className="btn btn-ghost btn-icon" onClick={()=>removePlayer(p)} style={{color:"var(--text2)",fontSize:"0.95rem",lineHeight:1,padding:"0.15rem 0.35rem"}}>×</button>}
                      </>
                    ) : (
                      <span style={{color:"var(--text3)",fontSize:"0.77rem"}}>Empty slot</span>
                    )}
                  </div>
                );
              })}
            </div>

            {saveMsg.text && (
              <div className={`alert ${saveMsg.type==="error"?"alert-error":"alert-success"}`} style={{marginBottom:"0.65rem",fontSize:"0.8rem"}}>{saveMsg.text}</div>
            )}

            {!locked ? (
              <div style={{display:"flex",flexDirection:"column",gap:"0.45rem"}}>
                <button className="btn" onClick={handleSave} disabled={saving||roster.length===0}>{saving?"Saving…":"Save roster"}</button>
                <button className="btn btn-accent" onClick={handleLock} disabled={saving||roster.length!==rosterSize}>
                  🔒 Lock Roster ({roster.length}/{rosterSize})
                </button>
                <p style={{color:"var(--text2)",fontSize:"0.7rem",textAlign:"center",lineHeight:1.4}}>
                  Save anytime. Lock before matches start — no changes after.
                </p>
              </div>
            ) : (
              <div style={{textAlign:"center",padding:"0.5rem"}}>
                <span className="badge badge-green" style={{padding:"0.4rem 0.8rem",fontSize:"0.82rem"}}>✅ Locked</span>
                <p style={{color:"var(--text2)",fontSize:"0.73rem",marginTop:"0.4rem"}}>Points update automatically after each match.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selPlayer && (
        <PlayerModal
          player={selPlayer}
          onClose={()=>setSelPlayer(null)}
          onAdd={addPlayer}
          onRemove={removePlayer}
          isOnRoster={isOnRoster(selPlayer)}
          isLocked={locked}
          canAdd={canAdd(selPlayer)}
        />
      )}
    </div>
  );
}