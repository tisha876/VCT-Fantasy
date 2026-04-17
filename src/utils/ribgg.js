/**
 * Data source using VLR.gg API with fallbacks and better error handling
 * VLR API is more reliable for Valorant esports data
 */

const BASE = "https://vlr.orlandomm.net/api/v1";

async function fetchVLR(path) {
  try {
    const url = `${BASE}${path}`;
    console.log(`Fetching from VLR: ${url}`);
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "VALFantasy/1.0"
      },
      cache: "no-store"
    });
    
    if (!res.ok) {
      console.warn(`VLR API error: ${res.status} on ${path}`);
      return null;
    }
    
    const json = await res.json();
    return json.data || json;
  } catch (e) {
    console.error("VLR fetch error:", e);
    return null;
  }
}

export async function getPlayers(region = "all", limit = 30, page = 1) {
  try {
    const data = await fetchVLR(`/players?limit=${limit}&page=${page}&region=${region}`);
    if (!data) return [];
    return data.players || data.segments || [];
  } catch (e) {
    console.error("Error fetching players:", e);
    return [];
  }
}

export async function getPlayer(id) {
  try {
    const data = await fetchVLR(`/players/${id}`);
    if (!data) return null;
    return data;
  } catch (e) {
    console.error("Error fetching player:", e);
    return null;
  }
}

export async function getMatches() {
  try {
    const data = await fetchVLR(`/matches`);
    if (!data) return [];
    return data.segments || data.matches || [];
  } catch (e) {
    console.error("Error fetching matches:", e);
    return [];
  }
}

export async function getResults() {
  try {
    const data = await fetchVLR(`/results`);
    if (!data) return [];
    return data.segments || data.results || [];
  } catch (e) {
    console.error("Error fetching results:", e);
    return [];
  }
}

export async function getMatchDetail(matchId) {
  try {
    const data = await fetchVLR(`/matches/${matchId}`);
    if (!data) return null;
    return data;
  } catch (e) {
    console.error("Error fetching match detail:", e);
    return null;
  }
}

export async function getEvents() {
  try {
    const data = await fetchVLR(`/events`);
    if (!data) return [];
    return data.events || data.segments || [];
  } catch (e) {
    console.error("Error fetching events:", e);
    return [];
  }
}

export async function getTeam(id) {
  try {
    const data = await fetchVLR(`/teams/${id}`);
    if (!data) return null;
    return data;
  } catch (e) {
    console.error("Error fetching team:", e);
    return null;
  }
}

export async function getLiveMatches() {
  try {
    const data = await fetchVLR(`/matches`);
    if (!data) return [];
    const all = data.segments || data.matches || [];
    return all.filter(
      (m) =>
        (m.status || "").toLowerCase().includes("live") ||
        (m.time_until_match || "").toLowerCase() === "live"
    );
  } catch (e) {
    console.error("Error fetching live matches:", e);
    return [];
  }
}

export async function getUpcomingMatches() {
  try {
    const data = await fetchVLR(`/matches`);
    if (!data) return [];
    const all = data.segments || data.matches || [];
    return all.filter(
      (m) =>
        !(m.status || "").toLowerCase().includes("live") &&
        (m.time_until_match || "") !== ""
    );
  } catch (e) {
    console.error("Error fetching upcoming matches:", e);
    return [];
  }
}

export async function getRecentResults(limit = 20) {
  try {
    const data = await fetchVLR(`/results`);
    if (!data) return [];
    const all = data.segments || data.results || [];
    return all.slice(0, limit);
  } catch (e) {
    console.error("Error fetching recent results:", e);
    return [];
  }
}

export async function getAllMatchData() {
  try {
    const data = await fetchVLR(`/matches`);
    if (!data) return [];
    return data.segments || data.matches || [];
  } catch (e) {
    console.error("Error fetching all match data:", e);
    return [];
  }
}

/**
 * Get player statistics for analytics
 */
export async function getPlayerStats(playerId) {
  try {
    const data = await fetchVLR(`/players/${playerId}`);
    if (!data) return null;
    return data;
  } catch (e) {
    console.error("Error fetching player stats:", e);
    return null;
  }
}

/**
 * Get player match history
 */
export async function getPlayerMatchHistory(playerId, limit = 20) {
  try {
    const data = await fetchVLR(`/players/${playerId}/stats`);
    if (!data) return [];
    return data.matches || [];
  } catch (e) {
    console.error("Error fetching player match history:", e);
    return [];
  }
}

/**
 * Get team statistics
 */
export async function getTeamStats(teamId) {
  try {
    const data = await fetchVLR(`/teams/${teamId}`);
    if (!data) return null;
    return data;
  } catch (e) {
    console.error("Error fetching team stats:", e);
    return null;
  }
}
