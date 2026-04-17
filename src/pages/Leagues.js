import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createLeague, joinLeague, getUserLeagues } from "../utils/firestore";

const REGIONS = [
  {value:"all",label:"All regions"},{value:"na",label:"North America"},{value:"eu",label:"Europe"},
  {value:"ap",label:"Asia-Pacific"},{value:"la",label:"Latin America"},{value:"br",label:"Brazil"},
  {value:"kr",label:"Korea"},{value:"jp",label:"Japan"},
];

export default function Leagues() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("leagues");
  const [name, setName]       = useState("");
  const [region, setRegion]   = useState("all");
  const [rosterSize, setRS]   = useState(5);
  const [joinCode, setJoinCode] = useState("");
  const [startPts, setStartPts] = useState(false);
  const [carryover, setCarryover] = useState(0);
  const [msg, setMsg]   = useState({type:"",text:""});
  const [working, setWorking] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setLeagues(await getUserLeagues(user.uid)); } catch(e){ console.error(e); }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault(); setWorking(true); setMsg({});
    try {
      const {id,code} = await createLeague(user.uid, name.trim(), {region, rosterSize:Number(rosterSize)});
      setMsg({type:"success",text:`League created! Code: ${code}`});
      await load();
      setTimeout(()=>navigate(`/league/${id}`),1400);
    } catch(e){ setMsg({type:"error",text:e.message}); }
    finally { setWorking(false); }
  }

  async function handleJoin(e) {
    e.preventDefault(); setWorking(true); setMsg({});
    try {
      const id = await joinLeague(user.uid, joinCode.trim().toUpperCase(), startPts?carryover:0);
      setMsg({type:"success",text:"Joined!"});
      await load();
      setTimeout(()=>navigate(`/league/${id}`),1000);
    } catch(e){ setMsg({type:"error",text:e.message}); }
    finally { setWorking(false); }
  }

  return (
    <div className="page">
      <div style={{marginBottom:"1.75rem"}}>
        <div style={{color:"var(--text2)",fontSize:"0.76rem",marginBottom:"0.4rem"}}><Link to="/">Home</Link> / Leagues</div>
        <h1>Leagues</h1>
        <p style={{color:"var(--text2)",marginTop:"0.3rem"}}>Create or join private fantasy leagues with friends.</p>
      </div>

      <div className="tabs">
        {[["leagues",`My Leagues (${leagues.length})`],["create","Create League"],["join","Join League"]].map(([k,l])=>(
          <button key={k} className={`tab-btn ${tab===k?"active":""}`} onClick={()=>{setTab(k);setMsg({});}}>{l}</button>
        ))}
      </div>

      {tab==="leagues" && (
        loading ? <div className="spinner"/> :
        leagues.length===0 ? (
          <div className="card" style={{textAlign:"center",padding:"3rem 2rem"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.9rem"}}>🏆</div>
            <h2 style={{marginBottom:"0.4rem"}}>No leagues yet</h2>
            <p style={{color:"var(--text2)",marginBottom:"1.5rem",maxWidth:320,margin:"0 auto 1.5rem"}}>Create a league and invite your friends.</p>
            <div style={{display:"flex",gap:"0.65rem",justifyContent:"center"}}>
              <button className="btn btn-accent" onClick={()=>setTab("create")}>Create league</button>
              <button className="btn" onClick={()=>setTab("join")}>Join league</button>
            </div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"0.65rem"}}>
            {leagues.map(l=>(
              <Link key={l.id} to={`/league/${l.id}`} style={{textDecoration:"none"}}>
                <div className="card" style={{display:"flex",alignItems:"center",gap:"1rem",cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,70,85,0.4)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}
                >
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.15rem",marginBottom:"0.3rem"}}>{l.name}</div>
                    <div style={{display:"flex",gap:"0.35rem",flexWrap:"wrap"}}>
                      <span className="badge badge-accent" style={{fontFamily:"monospace"}}>{l.code}</span>
                      <span className="badge badge-gray">{l.members?.length||0} members</span>
                      <span className="badge badge-purple">{l.settings?.region?.toUpperCase()||"ALL"}</span>
                      <span className="badge badge-blue">{l.settings?.rosterSize||5}p roster</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:"0.45rem"}}>
                    <Link to={`/league/${l.id}/draft`} className="btn btn-sm btn-accent" onClick={e=>e.stopPropagation()}>Draft</Link>
                    <Link to={`/league/${l.id}/leaderboard`} className="btn btn-sm" onClick={e=>e.stopPropagation()}>Board</Link>
                  </div>
                  <span style={{color:"var(--text2)"}}>→</span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {tab==="create" && (
        <div style={{maxWidth:480}}>
          <div className="card">
            <h2 style={{marginBottom:"1.1rem"}}>Create a league</h2>
            {msg.text && <div className={`alert ${msg.type==="error"?"alert-error":"alert-success"}`} style={{marginBottom:"0.9rem"}}>{msg.text}</div>}
            <form onSubmit={handleCreate} style={{display:"flex",flexDirection:"column",gap:"0.9rem"}}>
              <div><label>League name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. The Immortal League" required/></div>
              <div><label>Region</label>
                <select value={region} onChange={e=>setRegion(e.target.value)}>
                  {REGIONS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div><label>Roster size</label>
                <select value={rosterSize} onChange={e=>setRS(e.target.value)}>
                  {[3,4,5,6,7].map(n=><option key={n} value={n}>{n} players</option>)}
                </select>
              </div>
              <button className="btn btn-accent" type="submit" disabled={working} style={{justifyContent:"center"}}>{working?"Creating…":"Create league"}</button>
            </form>
          </div>
        </div>
      )}

      {tab==="join" && (
        <div style={{maxWidth:440}}>
          <div className="card">
            <h2 style={{marginBottom:"0.5rem"}}>Join a league</h2>
            <p style={{color:"var(--text2)",fontSize:"0.84rem",marginBottom:"1.1rem"}}>Enter the 6-character invite code from your friend.</p>
            {msg.text && <div className={`alert ${msg.type==="error"?"alert-error":"alert-success"}`} style={{marginBottom:"0.9rem"}}>{msg.text}</div>}
            <form onSubmit={handleJoin} style={{display:"flex",flexDirection:"column",gap:"0.9rem"}}>
              <div>
                <label>Invite code</label>
                <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="AB3X9Z" maxLength={6}
                  style={{letterSpacing:"0.2em",fontFamily:"monospace",fontWeight:700,fontSize:"1.2rem",textAlign:"center"}} required/>
              </div>

              {/* Late-joiner option */}
              <div style={{padding:"0.85rem",background:"var(--bg3)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)"}}>
                <label style={{display:"flex",alignItems:"center",gap:"0.55rem",cursor:"pointer",textTransform:"none",letterSpacing:0,fontWeight:500,fontSize:"0.86rem",color:"var(--text)",marginBottom:0}}>
                  <input type="checkbox" checked={startPts} onChange={e=>setStartPts(e.target.checked)}/>
                  Joining mid-season? Start with carry-over points
                </label>
                {startPts && (
                  <div style={{marginTop:"0.7rem"}}>
                    <label>Starting points (agreed with league owner)</label>
                    <input type="number" min={0} value={carryover} onChange={e=>setCarryover(Number(e.target.value))} placeholder="e.g. 250"/>
                    <p style={{color:"var(--text2)",fontSize:"0.72rem",marginTop:"0.35rem"}}>Confirm this number with the owner first.</p>
                  </div>
                )}
              </div>

              <button className="btn btn-accent" type="submit" disabled={working} style={{justifyContent:"center"}}>{working?"Joining…":"Join league"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}