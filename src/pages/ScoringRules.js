import React from 'react';

const ScoringRules = () => {
  const rules = [
    { 
      event: "Kill", 
      points: "+3", 
      description: "Points awarded for each enemy player eliminated" 
    },
    { 
      event: "Death", 
      points: "-1", 
      description: "Points deducted for each time your player dies" 
    },
    { 
      event: "Assist", 
      points: "+1.5", 
      description: "Points for helping eliminate an enemy player" 
    },
    { 
      event: "First Blood", 
      points: "+2", 
      description: "Bonus for getting the first kill in a round" 
    },
    { 
      event: "Clutch (1vX)", 
      points: "+5", 
      description: "Bonus for winning a round while being the last player alive" 
    },
    { 
      event: "ACE", 
      points: "+5", 
      description: "Bonus for eliminating all 5 enemy players in a round" 
    },
    { 
      event: "Combat Score (ACS) Tier 1", 
      points: "+5", 
      description: "200+ ACS in a match" 
    },
    { 
      event: "Combat Score (ACS) Tier 2", 
      points: "+10", 
      description: "250+ ACS in a match" 
    },
    { 
      event: "Combat Score (ACS) Tier 3", 
      points: "+20", 
      description: "300+ ACS in a match" 
    },
    { 
      event: "Headshot % Tier 1", 
      points: "+3", 
      description: "25%+ headshot accuracy" 
    },
    { 
      event: "Headshot % Tier 2", 
      points: "+6", 
      description: "35%+ headshot accuracy" 
    },
    { 
      event: "Player of the Game", 
      points: "+25", 
      description: "Highest ACS in the series (awarded to 1 player)" 
    },
    { 
      event: "Top 3 ACS", 
      points: "+10", 
      description: "Finishing in top 3 ACS for the series" 
    },
    { 
      event: "Match Win", 
      points: "+10", 
      description: "Bonus for each match your team wins" 
    },
    { 
      event: "Flawless Map", 
      points: "+15", 
      description: "Team wins a map 13-0" 
    },
  ];

  const statDefinitions = [
    { term: "ACS (Average Combat Score)", definition: "Average combat score per round, measuring overall impact" },
    { term: "K/D (Kill/Death Ratio)", definition: "Kills divided by deaths, showing efficiency" },
    { term: "HS% (Headshot Percentage)", definition: "Percentage of kills that were headshots" },
    { term: "KPR (Kills Per Round)", definition: "Average kills per round played" },
    { term: "ADR (Average Damage per Round)", definition: "Average damage dealt per round" },
  ];

  return (
    <div className="page">
      <div style={{ marginBottom: "2rem" }}>
        <h1>VCT Fantasy Scoring System</h1>
        <p style={{ color: "var(--text2)", marginTop: "0.25rem", fontSize: "1rem" }}>
          Points are calculated automatically from official VCT match data. Fantasy points reflect a player's individual performance and team success.
        </p>
      </div>

      {/* Scoring Rules Table */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>📊 Scoring Rules</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", color: "var(--text)" }}>Action</th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", color: "var(--text)" }}>Points</th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", color: "var(--text)" }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, index) => (
                <tr key={index} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "1rem", fontWeight: "500" }}>{rule.event}</td>
                  <td style={{ padding: "1rem", fontWeight: "700", color: rule.points.startsWith('+') ? "var(--green)" : "var(--red)" }}>{rule.points}</td>
                  <td style={{ padding: "1rem", color: "var(--text2)", fontSize: "0.9rem" }}>{rule.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stat Definitions */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>📈 Key Statistics Explained</h2>
        <div style={{ display: "grid", gap: "1rem" }}>
          {statDefinitions.map((stat, index) => (
            <div key={index} style={{ 
              padding: "1rem", 
              background: "var(--bg2)", 
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)"
            }}>
              <div style={{ fontWeight: "600", color: "var(--accent)", marginBottom: "0.25rem" }}>
                {stat.term}
              </div>
              <div style={{ color: "var(--text2)", fontSize: "0.9rem" }}>
                {stat.definition}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="card">
        <h2 style={{ marginBottom: "1rem" }}>⚙️ How Fantasy Points Are Calculated</h2>
        <div style={{ color: "var(--text2)", lineHeight: "1.6" }}>
          <p style={{ marginBottom: "1rem" }}>
            Fantasy points are calculated automatically after each official VCT match using data from the official Valorant esports API. 
            Points are awarded based on individual player performance across all maps in a series.
          </p>
          <p style={{ marginBottom: "1rem" }}>
            <strong>Match Series:</strong> A "match" in VCT Fantasy refers to a full series (e.g., best-of-3), not individual maps. 
            Player statistics are aggregated across all maps in the series.
          </p>
          <p style={{ marginBottom: "1rem" }}>
            <strong>Live Updates:</strong> Points are updated immediately after matches conclude. During live matches, 
            you can track progress in real-time on the dashboard.
          </p>
          <p>
            <strong>Season Points:</strong> Your total fantasy points accumulate throughout the VCT season. 
            Use this to compete with friends in private leagues!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScoringRules;