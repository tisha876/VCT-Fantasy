const BASE = "https://vlr.orlandomm.net/api/v1";

async function fetchVLR(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`VLR ${res.status}: ${path}`);
  const json = await res.json();
  return json.data || json;
}

export const getPlayers      = (region = "all", limit = 30, page = 1) => fetchVLR(`/players?limit=${limit}&page=${page}&region=${region}`);
export const getPlayer       = (id) => fetchVLR(`/players/${id}`);
export const getMatches      = ()   => fetchVLR(`/matches`);
export const getResults      = ()   => fetchVLR(`/results`);
export const getMatchDetail  = (id) => fetchVLR(`/matches/${id}`);
export const getEvents       = ()   => fetchVLR(`/events`);
export const getTeam         = (id) => fetchVLR(`/teams/${id}`);

function normList(data) { return data.segments || data.matches || data.results || data || []; }
function isLiveFn(m) { return (m.status||"").toLowerCase().includes("live") || (m.time_until_match||"").toLowerCase()==="live"; }

export async function getLiveMatches()     { return normList(await getMatches()).filter(isLiveFn); }
export async function getUpcomingMatches() { return normList(await getMatches()).filter(m => !isLiveFn(m) && (m.time_until_match||"")!==""); }
export async function getRecentResults(n=20) { return normList(await getResults()).slice(0,n); }
export async function getAllMatchData()    { return normList(await getMatches()); }