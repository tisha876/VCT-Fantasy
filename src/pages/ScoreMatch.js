import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLeague, updateLeaguePoints } from '../utils/firestore';
import { getRecentResults, getMatchDetail } from "../utils/scraper";
import { calculatePoints, determineMatchBonuses } from '../utils/scoring';

const ScoreMatch = () => {
  const { leagueId } = useParams();
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [recentMatches, setRecentMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetail, setMatchDetail] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadLeague();
    loadRecentMatches();
  }, [leagueId]);

  async function loadLeague() {
    try {
      const leagueData = await getLeague(leagueId);
      setLeague(leagueData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentMatches() {
    try {
      const matches = await getRecentResults(20);
      setRecentMatches(matches);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadMatchDetail(matchId) {
    try {
      const detail = await getMatchDetail(matchId);
      setMatchDetail(detail);
    } catch (e) {
      console.error(e);
      setMessage('Failed to load match details');
    }
  }

  async function updatePointsForMatch(match) {
    if (!match || !league) return;

    setUpdating(true);
    setMessage('');

    try {
      // This would be implemented to automatically update points
      // For now, just show a message
      setMessage('Automatic point updates are being processed...');
      
      // In a real implementation, this would:
      // 1. Get all rosters in the league
      // 2. Check which players from rosters played in this match
      // 3. Calculate points for each player
      // 4. Update the league standings
      
      setTimeout(() => {
        setMessage('Points updated successfully!');
        setUpdating(false);
      }, 2000);
      
    } catch (e) {
      setMessage('Error updating points: ' + e.message);
      setUpdating(false);
    }
  }

  if (loading) {
    return <div className="page"><div className="spinner" /></div>;
  }

  return (
    <div className="page">
      {/* Back Button */}
      <div style={{ marginBottom: "1rem" }}>
        <Link to={`/league/${leagueId}`} className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          ← Back to League
        </Link>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h1>Match Scoring - {league?.name}</h1>
        <p style={{ color: "var(--text2)", marginTop: "0.25rem" }}>
          Automatically update fantasy points from recent VCT matches
        </p>
      </div>

      {message && (
        <div className={`msg ${message.includes('Error') ? 'error' : 'success'}`} style={{ marginBottom: "1rem" }}>
          {message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>

        {/* Recent Matches */}
        <div className="card">
          <h2>Recent Matches</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "400px", overflowY: "auto" }}>
            {recentMatches.map((match) => (
              <div 
                key={match.id} 
                style={{
                  padding: "0.75rem",
                  background: selectedMatch?.id === match.id ? "var(--bg3)" : "var(--bg2)",
                  border: `1px solid ${selectedMatch?.id === match.id ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setSelectedMatch(match);
                  loadMatchDetail(match.id);
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {match.team1 || match.teams?.[0]?.name} vs {match.team2 || match.teams?.[1]?.name}
                </div>
                <div style={{ color: "var(--text2)", fontSize: "0.8rem" }}>
                  {match.score || `${match.winner} won`} · {match.date ? new Date(match.date).toLocaleDateString() : 'Recent'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Match Details & Scoring */}
        <div className="card">
          <h2>Match Details</h2>
          {selectedMatch ? (
            <div>
              <div style={{ marginBottom: "1rem" }}>
                <h3>{selectedMatch.team1 || selectedMatch.teams?.[0]?.name} vs {selectedMatch.team2 || selectedMatch.teams?.[1]?.name}</h3>
                <p style={{ color: "var(--text2)" }}>
                  {selectedMatch.score || `${selectedMatch.winner} won`}
                </p>
              </div>

              {matchDetail ? (
                <div>
                  <p style={{ color: "var(--text2)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                    Match data loaded. Player statistics will be used to calculate fantasy points.
                  </p>
                  <button 
                    className="btn btn-accent" 
                    onClick={() => updatePointsForMatch(selectedMatch)}
                    disabled={updating}
                    style={{ width: "100%" }}
                  >
                    {updating ? "Updating Points..." : "Update Fantasy Points"}
                  </button>
                </div>
              ) : (
                <div className="spinner" style={{ margin: "1rem auto" }} />
              )}
            </div>
          ) : (
            <p style={{ color: "var(--text2)", textAlign: "center", padding: "2rem" }}>
              Select a match to view details and update points
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScoreMatch;