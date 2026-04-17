const BASE = "https://vlr.orlandomm.net/api/v1";

async function fetchVLR(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`VLR API error: ${res.status} on ${path}`);
  const json = await res.json();
  return json.data || json;
}

export async function getPlayers(region = "all", limit = 30, page = 1) {
  return fetchVLR(`/players?limit=${limit}&page=${page}&region=${region}`);
}

export async function getPlayer(id) {
  return fetchVLR(`/players/${id}`);
}

export async function getMatches() {
  return fetchVLR(`/matches`);
}

export async function getResults() {
  return fetchVLR(`/results`);
}

export async function getMatchDetail(matchId) {
  return fetchVLR(`/matches/${matchId}`);
}

export async function getEvents() {
  return fetchVLR(`/events`);
}

export async function getTeam(id) {
  return fetchVLR(`/teams/${id}`);
}

export async function getLiveMatches() {
  const data = await getMatches();
  const all = data.segments || data.matches || data || [];
  return all.filter(
    (m) =>
      (m.status || "").toLowerCase().includes("live") ||
      (m.time_until_match || "").toLowerCase() === "live"
  );
}

export async function getUpcomingMatches() {
  const data = await getMatches();
  const all = data.segments || data.matches || data || [];
  return all.filter(
    (m) =>
      !(m.status || "").toLowerCase().includes("live") &&
      (m.time_until_match || "") !== ""
  );
}

export async function getRecentResults(limit = 20) {
  const data = await getResults();
  const all = data.segments || data.results || data || [];
  return all.slice(0, limit);
}

export async function getAllMatchData() {
  const data = await getMatches();
  return data.segments || data.matches || data || [];
}