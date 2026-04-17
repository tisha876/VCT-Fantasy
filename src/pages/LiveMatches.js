import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getMatches, getResults } from "../utils/vlrApi";

function isLive(m) {
  return (m.status||"").toLowerCase().includes("live") || (m.time_until_match||"").toLowerCase()==="live";
}

export default function LiveMatches() {
  const [matches, setMatches]   = useState([]);
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab]           = useState("live");
  const timerRef = useRef(null);

  async function load() {
    try {
      const [md, rd] = await Promise.all([
        getMatches().catch(()=>({segments:[]})),
        getResults().catch(()=>({segments:[]})),
      ]);
      const all = md.segments||md.matches||md||[];
      setMatches(all);
      setResults((rd.segments||rd.results||rd||[]).slice(0,20));
      const live = all.filter(isLive);
      if (!selected && live.length) setSelected(live[0]);
    } catch(_) {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 10000);
    return () => clearInterval(timerRef.current);
  }, []);

  const liveMatches     = matches.filter(isLive);
  const upcomingMatches = matches.filter(m=>!isLive(m)&&(m.time_until_match||"")!=="");

  const displayList = tab==="live"?liveMatches : tab==="upcoming"?upcomingMatches : results;

  return (
    <div className="page">
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{color:"var(--text2)",fontSize:"0.76rem",marginBottom:"0.4rem"}}><Link to="/">Home</Link> / Live Matches</div>
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <h1>Live Matches</h1>
          {liveMatches.length>0 && (
            <span className="badge badge-live" style={{display:"flex",gap:5,alignItems:"center",padding:"0.3rem 0.7rem"}}>
              <span className="live-dot"/>LIVE · {liveMatches.length}
            </span>
          )}
          {!loading && <span style={{fontSize:"0.75rem",color:"var(--text3)"}}>auto-refreshes every 10s</span>}
        </div>
      </div>

      <div className="tabs">
        {[
          ["live",`Live (${liveMatches.length})`],
          ["upcoming","Upcoming"],
          ["results","Results"],
        ].map(([k,l])=>(
          <button key={k} className={`tab-btn ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {loading ? <div className="spinner"/> : (
        <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:"1.5rem",alignItems:"start"}}>
          {/* List */}
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            {displayList.length===0 ? (
              <div style={{color:"var(--text2)",padding:"2rem",textAlign:"center"}}>
                {tab==="live"?"No live matches right now.":tab==="upcoming"?"No upcoming matches.":"No results."}
              </div>
            ) : displayList.map((m,i)=>{
              const live = isLive(m);
              const t1   = m.team1||m.team_a?.name||"TBD";
              const t2   = m.team2||m.team_b?.name||"TBD";
              const score= m.score||(m.team_a?.score!=null?`${m.team_a.score}–${m.team_b?.score}`:"");
              const time = m.time_until_match||m.date||"";
              const event= m.match_event||m.tournament||m.event||"";
              const isSel= selected===m || (selected?.id && selected.id===m.id);
              return (
                <div key={i} onClick={()=>setSelected(m)}
                  className={live?"match-card live-card":"match-card"}
                  style={{cursor:"pointer",borderColor:isSel?"var(--accent)":"",background:isSel?"var(--bg3)":""}}
                >
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.35rem"}}>
                    <span style={{fontSize:"0.68rem",color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{event}</span>
                    {live
                      ? <span className="badge badge-live" style={{display:"flex",gap:4,alignItems:"center"}}><span className="live-dot" style={{width:5,height:5}}/>LIVE</span>
                      : tab==="results" ? <span className="badge badge-gray">Final</span>
                      : <span style={{fontSize:"0.68rem",color:"var(--text2)"}}>{time}</span>
                    }
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                    <div style={{flex:1,textAlign:"right",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"0.95rem"}}>{t1}</div>
                    <div style={{minWidth:48,textAlign:"center"}}>
                      {score
                        ? <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:live?"var(--live)":"var(--text2)",fontSize:"0.95rem"}}>{score}</span>
                        : <span style={{color:"var(--text3)",fontSize:"0.7rem"}}>VS</span>
                      }
                    </div>
                    <div style={{flex:1,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"0.95rem"}}>{t2}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected ? (
            <div className="card">
              {(() => {
                const live = isLive(selected);
                const t1   = selected.team1||selected.team_a?.name||"TBD";
                const t2   = selected.team2||selected.team_b?.name||"TBD";
                const score= selected.score||(selected.team_a?.score!=null?`${selected.team_a.score} – ${selected.team_b?.score}`:"");
                const event= selected.match_event||selected.tournament||selected.event||"";
                const time = selected.time_until_match||selected.date||"";
                return (
                  <>
                    <div style={{marginBottom:"1.25rem"}}>
                      <div style={{fontSize:"0.76rem",color:"var(--text2)",marginBottom:"0.4rem"}}>{event}</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"1rem",alignItems:"center"}}>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.3rem"}}>{t1}</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          {score
                            ? <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.8rem",color:live?"var(--live)":"var(--accent)"}}>{score}</div>
                            : <div style={{color:"var(--text3)",fontWeight:600,fontSize:"0.9rem"}}>VS</div>
                          }
                          {live && (
                            <div style={{display:"flex",gap:5,justifyContent:"center",alignItems:"center",marginTop:"0.25rem"}}>
                              <span className="live-dot"/>
                              <span style={{color:"var(--live)",fontSize:"0.72rem",fontWeight:700}}>LIVE</span>
                            </div>
                          )}
                          {!live && time && <div style={{fontSize:"0.72rem",color:"var(--text2)",marginTop:"0.2rem"}}>{time}</div>}
                        </div>
                        <div>
                          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.3rem"}}>{t2}</div>
                        </div>
                      </div>
                    </div>

                    {/* Pseudo map view */}
                    {live && (
                      <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"1.25rem",marginBottom:"1.1rem"}}>
                        <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"0.75rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--text2)",marginBottom:"0.75rem",textAlign:"center"}}>
                          Current Map
                        </div>
                        <div style={{position:"relative",aspectRatio:"16/9",background:"#0d0d14",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",overflow:"hidden"}}>
                          {/* Team areas */}
                          <div style={{position:"absolute",top:"1rem",left:"1rem",width:"32%",height:"32%",background:"rgba(255,70,85,0.12)",border:"1.5px solid var(--accent)",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",color:"var(--accent)",fontWeight:600}}>{t1} Spawn</div>
                          <div style={{position:"absolute",bottom:"1rem",right:"1rem",width:"32%",height:"32%",background:"rgba(91,196,245,0.12)",border:"1.5px solid var(--blue)",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",color:"var(--blue)",fontWeight:600}}>{t2} Spawn</div>
                          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                            <div style={{fontSize:"0.85rem",color:"var(--text2)",fontWeight:600}}>Live Map</div>
                            <div style={{fontSize:"0.68rem",color:"var(--text3)",marginTop:"0.2rem"}}>Data from VLR API</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid-2" style={{gap:"0.6rem"}}>
                      {[
                        ["Tournament", event||"—"],
                        ["Status",     live?"🔴 LIVE":"Completed"],
                        ["Match ID",   selected.id||"—"],
                        ["Series",     selected.match_series||selected.series||"—"],
                      ].map(([k,v])=>(
                        <div key={k} style={{background:"var(--bg3)",padding:"0.65rem 0.85rem",borderRadius:"var(--radius-sm)"}}>
                          <div style={{color:"var(--text2)",fontSize:"0.7rem",marginBottom:"0.15rem"}}>{k}</div>
                          <div style={{fontWeight:600,fontSize:"0.87rem"}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="card" style={{textAlign:"center",padding:"3rem",color:"var(--text2)"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.75rem"}}>🎮</div>
              <p>Select a match to view details.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}