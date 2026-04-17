const BASE = "https://vlr.orlandomm.net/api/v1";

async function fetchVLR(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`VLR API error: ${res.status}`);
  const json = await res.json();
  return json.data || json;
}

export async function getPlayers(region = "all", limit = 50, page = 1) {
  return fetchVLR(`/players?limit=${limit}&page=${page}&region=${region}`);
}

export async function getPlayer(id) {
  return fetchVLR(`/players/${id}`);
}

export async function getResults(region = "all") {
  return fetchVLR(`/results?region=${region}`);
}

export async function getMatches() {
  return fetchVLR(`/matches`);
}

export async function getEvents() {
  return fetchVLR(`/events`);
}

export async function getTeam(id) {
  return fetchVLR(`/teams/${id}`);
}

/**
 * Fetch player stats for a specific match.
 * VLR API returns match stats including per-player ACS, kills, deaths, etc.
 */
export async function getMatchStats(matchId) {
  return fetchVLR(`/matches/${matchId}`);
}

/**
 * Search players by name (client-side filter on the players list).
 */
export async function searchPlayers(query, region = "all") {
  const data = await getPlayers(region, 100, 1);
  const players = data.players || data.segments || data || [];
  const q = query.toLowerCase();
  return players.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.ign || "").toLowerCase().includes(q) ||
      (p.alias || "").toLowerCase().includes(q)
  );
}