import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLeague, getLeaderboard, getUserScores } from "../utils/firestore";

const medals = ["🥇","🥈","🥉"];

export default function Leaderboard() {
  const { leagueId } = useParams();
  const { user }     = useAuth();
  const [league, setLeague] = useState(null);
  const [board,  setBoard]  = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("standings");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [l,b,s] = await Promise.all([getLeague(leagueId),getLeaderboard(leagueId),getUserScores(user.uid,leagueId)]);
        setLeague(l); setBoard(b);
        setScores(s.sort((a,b)=>(b.submittedAt?.seconds||0)-(a.submittedAt?.seconds||0)));
      } catch(e){ console.error(e); }
      setLoading(false);
    })();
  }, [leagueId]);

  const myEntry = board.find(e=>e.userId===user.uid);
  const myRank  = board.findIndex(e=>e.userId===user.uid)+1;

  if (loading) return <div className="page"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{color:"var(--text2)",fontSize:"0.76rem",marginBottom:"0.4rem"}}>
          <Link to="/">Home</Link> / <Link to={`/league/${leagueId}`}>{league?.name}</Link> / Leaderboard
        </div>
        <h1>🏆 Leaderboard</h1>
      </div>

      {myEntry && (
        <div style={{padding:"1rem 1.25rem",marginBottom:"1.5rem",background:"rgba(255,70,85,0.05)",border:"1px solid rgba(255,70,85,0.22)",borderRadius:"var(--radius)",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap"}}>
          <div style={{fontSize:"1.75rem"}}>{medals[myRank-1]||`#${myRank}`}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.05rem"}}>You — {myEntry.displayName}</div>
            <div style={{color:"var(--text2)",fontSize:"0.78rem"}}>{myEntry.matchesPlayed||0} matches scored{myEntry.carryover?` · ${myEntry.carryover} carryover pts`:""}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"2rem",fontWeight:700,color:"var(--accent)",lineHeight:1}}>{(myEntry.totalPoints||0).toFixed(1)}</div>
            <div style={{color:"var(--text2)",fontSize:"0.7rem"}}>total pts</div>
          </div>
        </div>
      )}

      <div className="tabs">
        {[["standings","Standings"],["history","My Match History"]].map(([k,l])=>(
          <button key={k} className={`tab-btn ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==="standings" && (
        <div className="card" style={{padding:"0.75rem"}}>
          <div className="lb-row header"><span>#</span><span>Player</span><span style={{textAlign:"right"}}>Matches</span><span style={{textAlign:"right"}}>Points</span><span style={{textAlign:"right"}}>Avg</span></div>
          <div style={{height:1,background:"var(--border)",margin:"0.3rem 0"}}/>
          {board.length===0 ? (
            <div style={{textAlign:"center",padding:"2rem",color:"var(--text2)"}}>No scores yet — points appear after matches are scored.</div>
          ) : board.map((entry,i)=>{
            const me=entry.userId===user.uid;
            const avg=entry.matchesPlayed?(entry.totalPoints/entry.matchesPlayed).toFixed(1):"—";
            return (
              <div key={entry.id} className={`lb-row ${me?"me":""}`}>
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"0.95rem"}}>{medals[i]||i+1}</span>
                <div style={{display:"flex",alignItems:"center",gap:"0.5rem",minWidth:0}}>
                  {entry.photoURL && <img src={entry.photoURL} alt="" style={{width:24,height:24,borderRadius:"50%",flexShrink:0}}/>}
                  <span style={{fontWeight:me?700:400,fontSize:"0.86rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {entry.displayName||"—"}{me&&<span style={{color:"var(--accent)",marginLeft:4,fontSize:"0.68rem"}}>(you)</span>}
                    {entry.carryover>0&&<span style={{color:"var(--text2)",marginLeft:4,fontSize:"0.66rem"}}>+{entry.carryover}co</span>}
                  </span>
                </div>
                <span style={{textAlign:"right",color:"var(--text2)",fontSize:"0.83rem"}}>{entry.matchesPlayed||0}</span>
                <span style={{textAlign:"right",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.05rem",color:me?"var(--accent)":"var(--text)"}}>{(entry.totalPoints||0).toFixed(1)}</span>
                <span style={{textAlign:"right",color:"var(--text2)",fontSize:"0.83rem"}}>{avg}</span>
              </div>
            );
          })}
        </div>
      )}

      {tab==="history" && (
        scores.length===0 ? (
          <div className="card" style={{textAlign:"center",padding:"2rem",color:"var(--text2)"}}>No scored matches yet.</div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            {scores.map(sc=>(
              <div key={sc.id} className="card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.7rem"}}>
                  <div>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.05rem"}}>{sc.matchName||`Match ${sc.matchId}`}</div>
                    <div style={{color:"var(--text2)",fontSize:"0.75rem"}}>{sc.date||""}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.55rem",fontWeight:700,color:"var(--accent)",lineHeight:1}}>{sc.totalPoints?.toFixed(1)}</div>
                    <div style={{color:"var(--text2)",fontSize:"0.68rem"}}>pts</div>
                  </div>
                </div>
                {sc.playerBreakdowns?.length>0 && (
                  <div style={{display:"flex",flexDirection:"column",gap:"0.32rem"}}>
                    {sc.playerBreakdowns.map(pb=>(
                      <div key={pb.playerId} style={{display:"flex",alignItems:"center",gap:"0.55rem",padding:"0.38rem 0.6rem",background:"var(--bg3)",borderRadius:"var(--radius-sm)"}}>
                        <span style={{flex:1,fontSize:"0.83rem",fontWeight:600}}>{pb.playerName}</span>
                        {pb.isPOTG && <span className="badge badge-yellow">⚡ POTG</span>}
                        {pb.isTop3ACS && !pb.isPOTG && <span className="badge badge-purple">Top 3</span>}
                        <span style={{fontSize:"0.72rem",color:"var(--text2)",fontFamily:"monospace"}}>{pb.kills}K/{pb.deaths}D/{pb.assists}A · {pb.acs}ACS</span>
                        <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:"var(--accent)",minWidth:46,textAlign:"right"}}>{pb.points>0?"+":""}{pb.points?.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}