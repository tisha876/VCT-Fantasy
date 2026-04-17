/**
 * Automatic fantasy points calculation from match results
 * Updates player points based on actual VCT match data
 */

import { getRecentResults, getPlayer } from './scraper';
import { SCORING_RULES } from './scoring';

export async function calculatePlayerPointsFromMatches(playerId) {
  try {
    const player = getPlayer(playerId);
    if (!player) return { total: 0, breakdown: {}, error: 'Player not found' };

    // Get matches where this player's team participated
    const recentMatches = getRecentResults(50);
    const playerTeamMatches = recentMatches.filter(m => 
      m.team1?.toLowerCase() === player.team?.toLowerCase() || 
      m.team2?.toLowerCase() === player.team?.toLowerCase()
    );

    let totalPoints = 0;
    const breakdown = {};

    // Score each match
    playerTeamMatches.forEach((match, idx) => {
      // Determine if player's team won
      const playerTeamWon = 
        (match.team1 === player.team && match.winner?.includes(player.team)) ||
        (match.team2 === player.team && match.winner?.includes(player.team));

      // Base match win bonus
      if (playerTeamWon) {
        const winBonus = SCORING_RULES.matchWin || 10;
        breakdown[`match_${idx}`] = winBonus;
        totalPoints += winBonus;
      }

      // Tournament bonus
      if (match.tournament) {
        const tourneyBonus = 5; // Base tournament bonus
        breakdown[`tournament_${idx}`] = tourneyBonus;
        totalPoints += tourneyBonus;
      }
    });

    return {
      total: totalPoints,
      breakdown,
      matchesPlayed: playerTeamMatches.length,
      stats: player.stats
    };
  } catch (e) {
    console.error('Error calculating player points:', e);
    return { total: 0, breakdown: {}, error: e.message };
  }
}

/**
 * Calculate all league member points automatically
 */
export async function calculateLeaguePoints(rosterPlayers) {
  try {
    const playerPoints = {};

    for (const player of rosterPlayers) {
      const points = await calculatePlayerPointsFromMatches(player.id);
      playerPoints[player.id] = points.total;
    }

    return playerPoints;
  } catch (e) {
    console.error('Error calculating league points:', e);
    return {};
  }
}

/**
 * Get live match tracking data for a team
 */
export function getLiveMatchTrackingData(teamName) {
  try {
    // Get the live match if team is playing
    const liveMatches = require('./scraper').getLiveMatches();
    const teamLiveMatch = liveMatches.find(m =>
      m.team1?.toLowerCase() === teamName?.toLowerCase() ||
      m.team2?.toLowerCase() === teamName?.toLowerCase()
    );

    if (!teamLiveMatch) {
      return null;
    }

    return {
      matchId: teamLiveMatch.id,
      opponent: teamLiveMatch.team1 === teamName ? teamLiveMatch.team2 : teamLiveMatch.team1,
      score: teamLiveMatch.score || '0-0',
      tournament: teamLiveMatch.tournament,
      timestamp: Date.now(),
      fullMatch: teamLiveMatch
    };
  } catch (e) {
    console.error('Error getting live match data:', e);
    return null;
  }
}

/**
 * Update player total points in Firestore based on match results
 * This is called periodically by the parent app
 */
export async function syncPlayerPointsToFirestore(userId, leagueId, rosterPlayers) {
  try {
    const playerPoints = {};

    for (const player of rosterPlayers || []) {
      const result = await calculatePlayerPointsFromMatches(player.id || player.player_id);
      playerPoints[player.id || player.player_id] = result.total;
    }

    return playerPoints;
  } catch (e) {
    console.error('Error syncing player points:', e);
    return {};
  }
}
