import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPlayers, getPlayer } from "../utils/vlrApi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const REGIONS = [
  {value:"all",label:"All"},{value:"na",label:"NA"},{value:"eu",label:"EU"},
  {value:"ap",label:"AP"},{value:"la",label:"LA"},{value:"br",label:"BR"},{value:"kr",label:"KR"},
];

function Avatar({p,size=48}) {
  const name = p?.ign||p?.alias||p?.name||"?";
  if (p?.img) return <img src={p.img} alt="" style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--border2)",flexShrink:0}} onError={e=>e.target.style.display="none"}/>;
  return <div style={{width:size,height:size,borderRadius:"50%",background:"var(--bg4)",border:"2px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:size*0.32,color:"var(--text2)",flexShrink:0}}>{name.slice(0,2).toUpperCase()}</div>;
}

export default function Pros() {
  const [players, setPlayers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [region, setRegion]     = useState("all");
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]     = useState(null);
  const [loadingD, setLoadingD] = useState(false);

  useEffect(() => { fetchPlayers(); }, [region, page]);
  useEffect(() => {
    setFiltered(players.filter(p=>{
      const q=search.toLowerCase();
      return !q||[p.ign,p.name,p.alias,p.team,p.current_team].some(f=>(f||"").toLowerCase().includes(q));
    }));
  }, [players,search]);

  async function fetchPlayers() {
    setLoading(true);
    try {
      const data = await getPlayers(region,30,page);
      setPlayers(data.players||data.segments||data||[]);
    } catch(_){}
    setLoading(false);
  }

  async function openPlayer(p) {
    setSelected(p); setDetail(null); setLoadingD(true);
    try {
      const id=p.id||p.player_id;
      if (id) { const d=await getPlayer(id).catch(()=>null); setDetail(d); }
    } catch(_){}
    setLoadingD(false);
  }

  const tooltipStyle={backgroundColor:"var(--bg3)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"0.78rem"};

  return (
    <div className="page">
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{color:"var(--text2)",fontSize:"0.76rem",marginBottom:"0.4rem"}}><Link to="/">Home</Link> / Pros</div>
        <h1>Professional Players</h1>
        <p style={{color:"var(--text2)",marginTop:"0.3rem",fontSize:"0.91rem"}}>Browse VCT pros — click any player for full stats and charts.</p>
      </div>

      <div style={{display:"flex",gap:"0.55rem",marginBottom:"1rem",flexWrap:"wrap"}}>
        <input placeholder="Search player or team…" value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:180}}/>
        <select value={region} onChange={e=>{setRegion(e.target.value);setPage(1);}} style={{width:130}}>
          {REGIONS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {loading ? <div className="spinner"/> : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:"0.65rem"}}>
            {filtered.map(p=>{
              const name=p.ign||p.alias||p.name;
              const team=p.team||p.current_team||"Free Agent";
              const stats=p.stats||{};
              return (
                <div key={p.id||name} className="card card-sm" style={{cursor:"pointer"}}
                  onClick={()=>openPlayer(p)}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,70,85,0.4)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}
                >
                  <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
                    <Avatar p={p}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.05rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                      <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap",marginTop:"0.2rem"}}>
                        <span className="badge badge-gray" style={{fontSize:"0.62rem"}}>{team}</span>
                        {(p.region||p.country) && <span className="badge badge-blue" style={{fontSize:"0.62rem"}}>{(p.region||p.country).toUpperCase().slice(0,3)}</span>}
                      </div>
                      {(stats.acs||stats.kd) && (
                        <div style={{display:"flex",gap:"0.5rem",marginTop:"0.4rem"}}>
                          {stats.acs && <span style={{fontSize:"0.77rem",color:"var(--accent)"}}>ACS: {stats.acs}</span>}
                          {stats.kd  && <span style={{fontSize:"0.77rem",color:"var(--text2)"}}>K/D: {stats.kd}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:"0.5rem",marginTop:"1rem",justifyContent:"center",alignItems:"center"}}>
            <button className="btn btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
            <span style={{fontSize:"0.82rem",color:"var(--text2)",padding:"0 0.5rem"}}>Page {page}</span>
            <button className="btn btn-sm" onClick={()=>setPage(p=>p+1)} disabled={filtered.length<30}>Next →</button>
          </div>
        </>
      )}

      {/* Player modal */}
      {selected && (
        <div className="modal-overlay" onClick={()=>{setSelected(null);setDetail(null);}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",gap:"1rem",marginBottom:"1.1rem",alignItems:"center"}}>
              <Avatar p={selected} size={56}/>
              <div style={{flex:1}}>
                <h2 style={{marginBottom:"0.25rem"}}>{selected.ign||selected.alias||selected.name}</h2>
                <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap"}}>
                  <span className="badge badge-gray">{detail?.team||detail?.current_team||selected.team||selected.current_team||"Free Agent"}</span>
                  {(detail?.country||selected.country) && <span className="badge badge-blue">{detail?.country||selected.country}</span>}
                  {(detail?.region||selected.region) && <span className="badge badge-purple">{(detail?.region||selected.region).toUpperCase()}</span>}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={()=>{setSelected(null);setDetail(null);}} style={{fontSize:"1.1rem",lineHeight:1}}>×</button>
            </div>

            {loadingD ? <div className="spinner"/> : (
              (() => {
                const stats = detail?.stats || selected.stats || {};
                const agents = (stats.agents||[]).slice(0,5);
                const agentChartData = agents.map(a=>({agent:a.agent||a.name,acs:parseFloat(a.acs||0),games:parseInt(a.games||a.played||0)}));
                return (
                  <div>
                    {/* Stat grid */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:"0.55rem",marginBottom:"1.1rem"}}>
                      {[["ACS",stats.acs,"var(--accent)"],["K/D",stats.kd,"var(--green)"],["HS%",stats.hs?`${stats.hs}%`:null,"var(--yellow)"],["KPR",stats.kpr,"var(--blue)"],["KAST",stats.kast?`${stats.kast}%`:null,"var(--purple)"]].filter(([,v])=>v!=null).map(([l,v,c])=>(
                        <div key={l} style={{textAlign:"center",padding:"0.75rem",background:"var(--bg3)",borderRadius:"var(--radius-sm)"}}>
                          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.4rem",fontWeight:700,color:c}}>{v}</div>
                          <div style={{fontSize:"0.7rem",color:"var(--text2)"}}>{l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Agent bar chart */}
                    {agentChartData.length>0 && (
                      <div style={{marginBottom:"1rem"}}>
                        <div style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--text2)",marginBottom:"0.6rem"}}>Agent ACS</div>
                        <ResponsiveContainer width="100%" height={130}>
                          <BarChart data={agentChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                            <XAxis dataKey="agent" stroke="var(--text2)" fontSize={11}/>
                            <YAxis stroke="var(--text2)" fontSize={11}/>
                            <Tooltip contentStyle={tooltipStyle}/>
                            <Bar dataKey="acs" fill="var(--accent)" name="ACS" radius={[3,3,0,0]}/>
                          </BarChart>
                        </ResponsiveContainer>
                        <div style={{marginTop:"0.6rem",display:"flex",flexWrap:"wrap",gap:"0.35rem"}}>
                          {agents.map(a=><span key={a.agent||a.name} className="badge badge-blue">{a.agent||a.name} ({a.games||a.played||0}g)</span>)}
                        </div>
                      </div>
                    )}

                    {!agentChartData.length && !stats.acs && (
                      <p style={{color:"var(--text2)",fontSize:"0.85rem"}}>No detailed stats available for this player.</p>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}