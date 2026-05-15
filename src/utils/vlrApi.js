// src/utils/vlrApi.js
// Proxy hosted on Render.com — free, no CORS issues.
// Replace PROXY_URL with your actual Render service URL after deploying proxy.js.

const PROXY_URL = process.env.REACT_APP_PROXY_URL || 'https://vlr-proxy-q0iy.onrender.com/';

// ─── Cache ──────────────────────────────────────────────────────────────────
const CACHE = {};
const TTL = {
  matches:  30_000,
  results:  60_000,
  stats:    5  * 60_000,
  rankings: 10 * 60_000,
  player:   5  * 60_000,
};

function cached(key, ttl, fetcher) {
  const now = Date.now();
  if (CACHE[key] && now - CACHE[key].ts < ttl) return Promise.resolve(CACHE[key].data);
  return fetcher().then(data => { CACHE[key] = { ts: now, data }; return data; });
}

async function callProxy(endpoint, params = {}) {
  const url = new URL(`${PROXY_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`VLR API ${resp.status}: ${endpoint}`);
  return resp.json();
}

// ─── Match endpoints ─────────────────────────────────────────────────────────

export function getLiveMatches() {
  return cached('live', TTL.matches, () =>
    callProxy('/v2/match', { q: 'live_score' }).then(r => r?.data?.segments ?? [])
  );
}

export function getUpcomingMatches() {
  return cached('upcoming', TTL.matches, () =>
    callProxy('/v2/match', { q: 'upcoming' }).then(r => r?.data?.segments ?? [])
  );
}

export function getResults() {
  return cached('results', TTL.results, () =>
    callProxy('/v2/match', { q: 'results' }).then(r => r?.data?.segments ?? [])
  );
}

export function getMatchDetails(matchId) {
  return cached(`match_${matchId}`, TTL.matches, () =>
    callProxy(`/v2/match/${matchId}`).then(r => r?.data ?? null)
  );
}

// ─── Stats endpoints ─────────────────────────────────────────────────────────

export function getPlayerStats(region = 'all', timespan = '60') {
  const key = `stats_${region}_${timespan}`;
  return cached(key, TTL.stats, () =>
    callProxy('/v2/stats', { region, timespan }).then(r => r?.data?.segments ?? [])
  );
}

export function getPlayerProfile(playerId) {
  return cached(`player_${playerId}`, TTL.player, () =>
    callProxy(`/v2/player`, { id: playerId, timespan: 'all' }).then(r => r?.data ?? null)
  );
}

// ─── Rankings ────────────────────────────────────────────────────────────────

export function getRankings(region = 'na') {
  return cached(`rankings_${region}`, TTL.rankings, () =>
    callProxy(`/v1/rankings/${region}`).then(r => {
      if (Array.isArray(r?.data)) return r.data;
      if (Array.isArray(r)) return r;
      return [];
    })
  );
}

// ─── Scoring helpers ─────────────────────────────────────────────────────────

export function calcFantasyPoints(stats) {
  if (!stats) return 0;
  let pts = 0;
  const kills     = parseInt(stats.kills   ?? stats.k  ?? 0);
  const deaths    = parseInt(stats.deaths  ?? stats.d  ?? 0);
  const assists   = parseInt(stats.assists ?? stats.a  ?? 0);
  const acs       = parseFloat(stats.average_combat_score ?? stats.acs ?? 0);
  const hsRaw     = stats.headshot_percentage ?? stats.hs_pct ?? '0%';
  const hsPct     = parseFloat(String(hsRaw).replace('%', ''));
  const fkRaw     = stats.first_kills_per_round ?? stats.fk_per_round ?? 0;
  const clutchRaw = stats.clutch_success_percentage ?? stats.clutch_pct ?? '0%';
  const clutches  = parseFloat(String(clutchRaw).replace('%', ''));
  const won       = stats.match_won ?? stats.won ?? false;

  pts += kills * 3;
  pts -= deaths * 1;
  pts += assists * 1.5;
  if (acs >= 300) pts += 20;
  else if (acs >= 250) pts += 10;
  else if (acs >= 200) pts += 5;
  if (hsPct >= 35) pts += 6;
  else if (hsPct >= 25) pts += 3;
  if (parseFloat(fkRaw) >= 0.15) pts += 2;
  if (clutches >= 50) pts += 5;
  if (won) pts += 10;
  return Math.round(pts * 10) / 10;
}

export function fixtureDifficulty(opponentRank, totalTeams = 10) {
  const pct = opponentRank / totalTeams;
  if (pct <= 0.3) return 3;
  if (pct <= 0.6) return 2;
  return 1;
}

export const DIFFICULTY_LABEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
export const DIFFICULTY_COLOR = {
  1: { bg: 'rgba(29,158,117,0.15)', color: '#5dcaa5' },
  2: { bg: 'rgba(186,117,23,0.2)',  color: '#ef9f27' },
  3: { bg: 'rgba(255,70,85,0.15)',  color: '#ff7a85' },
};

// ─── Normalise helpers ───────────────────────────────────────────────────────

export function normaliseStatSegment(seg) {
  return {
    ign:       seg.player ?? seg.ign ?? '',
    org:       seg.org ?? seg.team ?? '',
    region:    seg.region ?? '',
    rating:    parseFloat(seg.rating ?? 0),
    acs:       parseFloat(seg.average_combat_score ?? seg.acs ?? 0),
    kd:        parseFloat(seg.kill_deaths ?? seg.kd ?? 0),
    kast:      seg.kill_assists_survived_traded ?? seg.kast ?? '',
    adr:       parseFloat(seg.average_damage_per_round ?? seg.adr ?? 0),
    kpr:       parseFloat(seg.kills_per_round ?? seg.kpr ?? 0),
    apr:       parseFloat(seg.assists_per_round ?? seg.apr ?? 0),
    fkpr:      parseFloat(seg.first_kills_per_round ?? seg.fkpr ?? 0),
    fdpr:      parseFloat(seg.first_deaths_per_round ?? seg.fdpr ?? 0),
    hsPct:     seg.headshot_percentage ?? seg.hs_pct ?? '0%',
    clutchPct: seg.clutch_success_percentage ?? seg.clutch_pct ?? '0%',
  };
}

export function normaliseLiveMatch(seg) {
  return {
    matchId:        seg.match_id ?? seg.id ?? '',
    matchPage:      seg.match_page ?? '',
    team1:          seg.team1 ?? seg.team_one ?? '',
    team2:          seg.team2 ?? seg.team_two ?? '',
    score1:         seg.score1 ?? seg.team_one_score ?? '0',
    score2:         seg.score2 ?? seg.team_two_score ?? '0',
    flag1:          seg.flag1 ?? '',
    flag2:          seg.flag2 ?? '',
    roundInfo:      seg.round_info ?? '',
    tournamentName: seg.tournament_name ?? seg.event_name ?? '',
    tournamentIcon: seg.tournament_icon ?? '',
    timeCompleted:  seg.time_completed ?? '',
    currentMap:     seg.current_map ?? '',
    mapNumber:      seg.map_number ?? '',
  };
}