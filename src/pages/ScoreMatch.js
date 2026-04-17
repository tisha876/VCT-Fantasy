import React, { useState } from 'react';
import { db } from '../utils/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const ScoreMatch = () => {
  const [matchData, setMatchData] = useState({ playerId: '', points: 0 });

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const playerRef = doc(db, "players", matchData.playerId);
      await updateDoc(playerRef, {
        totalPoints: matchData.points // Simplified scoring logic
      });
      alert("Score updated successfully!");
    } catch (error) {
      console.error("Error updating score:", error);
    }
  };

  return (
    <div className="container">
      <h2>Input Match Scores</h2>
      <form onSubmit={handleUpdate}>
        <input 
          type="text" 
          placeholder="Player ID" 
          onChange={(e) => setMatchData({...matchData, playerId: e.target.value})} 
        />
        <input 
          type="number" 
          placeholder="Points" 
          onChange={(e) => setMatchData({...matchData, points: parseInt(e.target.value)})} 
        />
        <button type="submit">Update Player Score</button>
      </form>
    </div>
  );
};

export default ScoreMatch;