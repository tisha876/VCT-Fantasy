/**
 * Fantasy scoring system for Valorant esports.
 *
 * Points are awarded per match based on in-game stats scraped from VLR.
 * A "match" here is a full series (e.g. best-of-3); maps are individual games within it.
 */

export const SCORING_RULES = {
  // Per-kill
  kill: 3,
  // Per-death (negative)
  death: -1,
  // Per-assist
  assist: 1.5,
  // First blood in a round
  firstBlood: 2,
  // Per clutch (1vX wins) — approximated via VLR clutch stat
  clutch: 5,
  // ACS threshold bonuses (combat score per round)
  acs_tier1: { threshold: 200, points: 5 },  // 200+ ACS
  acs_tier2: { threshold: 250, points: 10 }, // 250+ ACS
  acs_tier3: { threshold: 300, points: 20 }, // 300+ ACS
  // Player of the Game (top ACS in the series, awarded to top 1 player)
  potg: 25,
  // Top-3 ACS bonus
  top3acs: 10,
  // Match win bonus
  matchWin: 10,
  // Flawless map (team wins 13-0) — approximated if available
  flawlessMap: 15,
  // HS% bonus tiers
  hs_tier1: { threshold: 25, points: 3 }, // 25%+ headshot
  hs_tier2: { threshold: 35, points: 6 }, // 35%+ headshot
};

/**
 * Calculate fantasy points for a player given their stats object.
 * 
 * @param {Object} stats - Player stats object from VLR API
 * @param {boolean} isTop3ACS - Whether this player is in the top 3 ACS for the series
 * @param {boolean} isPOTG - Whether this player has the highest ACS (Player of the Game)
 * @param {boolean} wonMatch - Whether the player's team won the match
 * @returns {Object} { total, breakdown }
 */
export function calculatePoints(stats, isTop3ACS, isPOTG, wonMatch) {
  const breakdown = {};
  let total = 0;

  const kills = parseInt(stats.kills) || 0;
  const deaths = parseInt(stats.deaths) || 0;
  const assists = parseInt(stats.assists) || 0;
  const acs = parseFloat(stats.acs) || 0;
  const fk = parseInt(stats.fk) || parseInt(stats.first_kills) || 0;
  const clutches = parseInt(stats.clutches) || parseInt(stats.cl) || 0;
  const hsPercent = parseFloat(stats.hs) || parseFloat(stats.headshot_pct) || 0;

  breakdown.kills = kills * SCORING_RULES.kill;
  breakdown.deaths = deaths * SCORING_RULES.death;
  breakdown.assists = assists * SCORING_RULES.assist;
  breakdown.firstBloods = fk * SCORING_RULES.firstBlood;
  breakdown.clutches = clutches * SCORING_RULES.clutch;

  // ACS tier bonus
  if (acs >= SCORING_RULES.acs_tier3.threshold) {
    breakdown.acsTier = SCORING_RULES.acs_tier3.points;
  } else if (acs >= SCORING_RULES.acs_tier2.threshold) {
    breakdown.acsTier = SCORING_RULES.acs_tier2.points;
  } else if (acs >= SCORING_RULES.acs_tier1.threshold) {
    breakdown.acsTier = SCORING_RULES.acs_tier1.points;
  } else {
    breakdown.acsTier = 0;
  }

  // HS% bonus
  if (hsPercent >= SCORING_RULES.hs_tier2.threshold) {
    breakdown.hsBonus = SCORING_RULES.hs_tier2.points;
  } else if (hsPercent >= SCORING_RULES.hs_tier1.threshold) {
    breakdown.hsBonus = SCORING_RULES.hs_tier1.points;
  } else {
    breakdown.hsBonus = 0;
  }

  breakdown.top3acs = isTop3ACS ? SCORING_RULES.top3acs : 0;
  breakdown.potg = isPOTG ? SCORING_RULES.potg : 0;
  breakdown.matchWin = wonMatch ? SCORING_RULES.matchWin : 0;

  total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return {
    total: Math.round(total * 10) / 10,
    breakdown,
    stats: { kills, deaths, assists, acs, fk, clutches, hsPercent },
  };
}

/**
 * Given an array of player stat objects for a match, determine POTG and top-3 ACS.
 * Returns a map of playerId -> { isPOTG, isTop3ACS }
 */
export function determineMatchBonuses(playerStats) {
  const sorted = [...playerStats].sort(
    (a, b) => (parseFloat(b.acs) || 0) - (parseFloat(a.acs) || 0)
  );
  const result = {};
  sorted.forEach((p, idx) => {
    result[p.id || p.player] = {
      isPOTG: idx === 0,
      isTop3ACS: idx < 3,
    };
  });
  return result;
}