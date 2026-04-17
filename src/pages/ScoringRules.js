import React from "react";
import { Link } from "react-router-dom";
import { SCORING_CATEGORIES } from "../utils/scoring";

function ptsClass(n) { return n>15?"big":n<0?"neg":"pos"; }

export default function ScoringRules() {
  return (
    <div className="page">
      <div style={{marginBottom:"1.75rem"}}>
        <div style={{color:"var(--text2)",fontSize:"0.76rem",marginBottom:"0.4rem"}}><Link to="/">Home</Link> / Scoring Rules</div>
        <h1>Scoring Rules</h1>
        <p style={{color:"var(--text2)",marginTop:"0.35rem",maxWidth:520,fontSize:"0.93rem"}}>
          Points calculate automatically from VLR match data — no manual input needed.
        </p>
      </div>

      {/* How it works */}
      <div className="card" style={{marginBottom:"2rem",borderColor:"rgba(255,70,85,0.2)",background:"rgba(255,70,85,0.04)"}}>
        <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
          {[
            {icon:"📡",title:"Auto-scored",body:"Points pull from the VLR API after every match. No manual work required."},
            {icon:"⚡",title:"POTG +25",body:"Highest ACS in a full series earns Player of the Game bonus."},
            {icon:"🏆",title:"Win bonus",body:"Every player on the winning team earns +10 on top of their stats."},
            {icon:"🔒",title:"Lock before kick-off",body:"Save your roster before the match starts. No edits after locking."},
          ].map(({icon,title,body})=>(
            <div key={title} style={{flex:"1 1 180px",minWidth:160}}>
              <div style={{fontSize:"1.4rem",marginBottom:"0.35rem"}}>{icon}</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"0.95rem",marginBottom:"0.2rem"}}>{title}</div>
              <div style={{color:"var(--text2)",fontSize:"0.81rem",lineHeight:1.5}}>{body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="grid-2" style={{gap:"0.9rem",marginBottom:"2rem"}}>
        {SCORING_CATEGORIES.map(cat=>(
          <div key={cat.category} className="rule-section">
            <div className="rule-header"><span>{cat.icon}</span><span>{cat.category}</span></div>
            {cat.rules.map(rule=>(
              <div key={rule.key} className="rule-row">
                <div>
                  <div style={{fontWeight:500,fontSize:"0.88rem"}}>{rule.label}</div>
                  <div style={{color:"var(--text2)",fontSize:"0.73rem",marginTop:"0.08rem"}}>{rule.desc}</div>
                </div>
                <div className={`rule-pts ${ptsClass(rule.points)}`}>
                  {rule.points>0?"+":""}{rule.points}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Worked example */}
      <div className="card">
        <h2 style={{marginBottom:"1.1rem"}}>Example calculation</h2>
        <div style={{display:"flex",gap:"2rem",flexWrap:"wrap"}}>
          <div style={{flex:"1 1 240px"}}>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"0.78rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--text2)",marginBottom:"0.65rem"}}>Player stats (series)</div>
            {[["Kills","24","var(--green)"],["Deaths","14","var(--accent)"],["Assists","8","var(--blue)"],["ACS","278","var(--yellow)"],["First Bloods","3","var(--orange)"],["HS%","38%","var(--purple)"]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"0.38rem 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{color:"var(--text2)",fontSize:"0.83rem"}}>{l}</span>
                <span style={{color:c,fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{flex:"1 1 240px"}}>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"0.78rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--text2)",marginBottom:"0.65rem"}}>Fantasy points breakdown</div>
            {[["24 kills × 3","+72","var(--green)"],["14 deaths × −1","−14","var(--accent)"],["8 assists × 1.5","+12","var(--blue)"],["ACS 278 (250+ tier)","+10","var(--yellow)"],["3 first bloods × 2","+6","var(--orange)"],["HS% 38% (35%+ tier)","+6","var(--purple)"],["Match win bonus","+10","var(--green)"],["Top 3 ACS","+10","var(--yellow)"]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"0.38rem 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{color:"var(--text2)",fontSize:"0.8rem"}}>{l}</span>
                <span style={{color:c,fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>{v}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"0.6rem 0"}}>
              <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>Total</span>
              <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.25rem",fontWeight:700,color:"var(--yellow)"}}>112 pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat glossary */}
      <div className="card" style={{marginTop:"1.25rem"}}>
        <h2 style={{marginBottom:"1rem"}}>Key stat definitions</h2>
        <div className="grid-2">
          {[
            ["ACS","Average Combat Score — overall round impact."],
            ["K/D","Kills divided by deaths — efficiency."],
            ["HS%","Percentage of kills that were headshots."],
            ["KPR","Kills per round average."],
            ["KAST%","Rounds with Kill, Assist, Survive or Trade."],
            ["APR","Assists per round average."],
          ].map(([term,def])=>(
            <div key={term} style={{padding:"0.75rem",background:"var(--bg3)",borderRadius:"var(--radius-sm)"}}>
              <div style={{fontWeight:700,color:"var(--accent)",fontSize:"0.88rem",marginBottom:"0.15rem"}}>{term}</div>
              <div style={{color:"var(--text2)",fontSize:"0.8rem"}}>{def}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}