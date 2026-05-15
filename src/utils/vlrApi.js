// src/utils/vlrApi.js
// All calls proxy through Firebase Functions to avoid CORS.
// Base: https://vlrggapi.vercel.app  (self-host recommended — vercel free tier may be down)
// Fallback: https://vlr.orlandomm.net/api/v1  (alternative hosted instance)
// Self-host: http://localhost:3001 (clone axsddlr/vlrggapi and run locally)

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// ─── Cache ──────────────────────────────────────────────────────────────────
const CACHE = {};
const TTL = {
  matches: 30_000,       // 30s for live/upcoming
  results: 60_000,       // 1m for results
  stats: 5 * 60_000,     // 5m for stats
  rankings: 10 * 60_000, // 10m for rankings
  player: 5 * 60_000,
};

function cached(key, ttl, fetcher) {
  const now = Date.now();
  if (CACHE[key] && now - CACHE[key].ts < ttl) return Promise.resolve(CACHE[key].data);
  return fetcher().then(data => {
    CACHE[key] = { ts: now, data };
    return data;
  });
}

// ─── Firebase Function proxy ─────────────────────────────────────────────────
// The Firebase Function (functions/src/index.js) proxies all VLR requests
// to avoid CORS issues and keep the API base URL out of client code.
const vlrProxy = httpsCallable(functions, 'vlrProxy');

async function callProxy(endpoint, params = {}) {
  try {
    const result = await vlrProxy({ endpoint, params });
    return result.data;
  } catch (err) {
    console.error(`VLR proxy error [${endpoint}]:`, err);
    throw err;
  }
}

// ─── Match endpoints ─────────────────────────────────────────────────────────

/** Live matches with scores */
export function getLiveMatches() {
  return cached('live', TTL.matches, () =>
    callProxy('/v2/match', { q: 'live_score' }).then(r => r?.data?.segments ?? [])
  );
}

/** Upcoming matches */
export function getUpcomingMatches() {
  return cached('upcoming', TTL.matches, () =>
    callProxy('/v2/match', { q: 'upcoming' }).then(r => r?.data?.segments ?? [])
  );
}

/** Recent results */
export function getResults() {
  return cached('results', TTL.results, () =>
    callProxy('/v2/match', { q: 'results' }).then(r => r?.data?.segments ?? [])
  );
}

/** Full match details: per-map stats, K/D/A, ACS, agents */
export function getMatchDetails(matchId) {
  return cached(`match_${matchId}`, TTL.matches, () =>
    callProxy(`/v2/match/${matchId}`).then(r => r?.data ?? null)
  );
}

// ─── Stats endpoints ─────────────────────────────────────────────────────────

/**
 * Player stats by region + timespan.
 * region: 'na' | 'eu' | 'ap' | 'la' | 'la-s' | 'la-n' | 'oce' | 'mn' | 'gc' | 'all'
 * timespan: '60' | '90' | 'all'
 */
export function getPlayerStats(region = 'all', timespan = '60') {
  const key = `stats_${region}_${timespan}`;
  return cached(key, TTL.stats, () =>
    callProxy('/v2/stats', { region, timespan }).then(r => r?.data?.segments ?? [])
  );
}

// ─── Player profile ───────────────────────────────────────────────────────────

/** Individual player profile: agent stats, match history, team history */
export function getPlayerProfile(playerId) {
  return cached(`player_${playerId}`, TTL.player, () =>
    callProxy(`/v2/player`, { id: playerId, timespan: 'all' }).then(r => r?.data ?? null)
  );
}

// ─── Rankings ────────────────────────────────────────────────────────────────

/**
 * Team rankings by region.
 * region: 'na' | 'eu' | 'ap' | 'la-s' | 'la-n' | 'oce' | 'mn' | 'gc'
 */
export function getRankings(region = 'na') {
  return cached(`rankings_${region}`, TTL.rankings, () =>
    callProxy(`/v1/rankings/${region}`).then(r => {
      // v1 rankings shape: { status, data: [...] }
      if (Array.isArray(r?.data)) return r.data;
      if (Array.isArray(r)) return r;
      return [];
    })
  );
}

// ─── Scoring helpers ─────────────────────────────────────────────────────────

/**
 * Calculate fantasy points from a player's match stats segment.
 * Compatible with both v1 and v2 stat shapes.
 */
export function calcFantasyPoints(stats) {
  if (!stats) return 0;
  let pts = 0;

  const kills   = parseInt(stats.kills ?? stats.k ?? 0);
  const deaths  = parseInt(stats.deaths ?? stats.d ?? 0);
  const assists = parseInt(stats.assists ?? stats.a ?? 0);
  const acs     = parseFloat(stats.average_combat_score ?? stats.acs ?? 0);
  const hsRaw   = stats.headshot_percentage ?? stats.hs_pct ?? '0%';
  const hsPct   = parseFloat(String(hsRaw).replace('%', ''));
  const fkRaw   = stats.first_kills_per_round ?? stats.fk_per_round ?? 0;
  const clutchRaw = stats.clutch_success_percentage ?? stats.clutch_pct ?? '0%';
  const clutches = parseFloat(String(clutchRaw).replace('%', ''));
  const won     = stats.match_won ?? stats.won ?? false;

  pts += kills * 3;
  pts -= deaths * 1;
  pts += assists * 1.5;

  // ACS bonuses
  if (acs >= 300) pts += 20;
  else if (acs >= 250) pts += 10;
  else if (acs >= 200) pts += 5;

  // Headshot bonuses
  if (hsPct >= 35) pts += 6;
  else if (hsPct >= 25) pts += 3;

  // First blood (approximate from fk_per_round > 0.15)
  if (parseFloat(fkRaw) >= 0.15) pts += 2;

  // Clutch bonus (approximate)
  if (clutches >= 50) pts += 5;

  // Match win
  if (won) pts += 10;

  return Math.round(pts * 10) / 10;
}

/**
 * Derive fixture difficulty (1=easy, 2=medium, 3=hard) for a team
 * based on opponent rank in rankings list.
 */
export function fixtureDifficulty(opponentRank, totalTeams = 10) {
  const pct = opponentRank / totalTeams;
  if (pct <= 0.3) return 3; // top 30% → hard
  if (pct <= 0.6) return 2; // mid → medium
  return 1;                  // lower → easy
}

export const DIFFICULTY_LABEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
export const DIFFICULTY_COLOR = {
  1: { bg: 'rgba(29,158,117,0.15)', color: '#5dcaa5' },
  2: { bg: 'rgba(186,117,23,0.2)',  color: '#ef9f27' },
  3: { bg: 'rgba(255,70,85,0.15)',  color: '#ff7a85' },
};

// ─── Normalise helpers ───────────────────────────────────────────────────────

/** Normalise v1 stats segment into a consistent shape */
export function normaliseStatSegment(seg) {
  return {
    ign: seg.player ?? seg.ign ?? '',
    org: seg.org ?? seg.team ?? '',
    region: seg.region ?? '',
    rating: parseFloat(seg.rating ?? 0),
    acs: parseFloat(seg.average_combat_score ?? seg.acs ?? 0),
    kd: parseFloat(seg.kill_deaths ?? seg.kd ?? 0),
    kast: seg.kill_assists_survived_traded ?? seg.kast ?? '',
    adr: parseFloat(seg.average_damage_per_round ?? seg.adr ?? 0),
    kpr: parseFloat(seg.kills_per_round ?? seg.kpr ?? 0),
    apr: parseFloat(seg.assists_per_round ?? seg.apr ?? 0),
    fkpr: parseFloat(seg.first_kills_per_round ?? seg.fkpr ?? 0),
    fdpr: parseFloat(seg.first_deaths_per_round ?? seg.fdpr ?? 0),
    hsPct: seg.headshot_percentage ?? seg.hs_pct ?? '0%',
    clutchPct: seg.clutch_success_percentage ?? seg.clutch_pct ?? '0%',
  };
}

/** Normalise v2 live match segment */
export function normaliseLiveMatch(seg) {
  return {
    matchId: seg.match_id ?? seg.id ?? '',
    matchPage: seg.match_page ?? '',
    team1: seg.team1 ?? seg.team_one ?? '',
    team2: seg.team2 ?? seg.team_two ?? '',
    score1: seg.score1 ?? seg.team_one_score ?? '0',
    score2: seg.score2 ?? seg.team_two_score ?? '0',
    flag1: seg.flag1 ?? '',
    flag2: seg.flag2 ?? '',
    roundInfo: seg.round_info ?? '',
    tournamentName: seg.tournament_name ?? seg.event_name ?? '',
    tournamentIcon: seg.tournament_icon ?? '',
    timeCompleted: seg.time_completed ?? '',
    currentMap: seg.current_map ?? '',
    mapNumber: seg.map_number ?? '',
  };
}