/**
 * Web scraper for Valorant esports data using public APIs
 * Loads all data at startup and continuously updates live matches
 */

// Multiple data sources to ensure reliability
const DATA_SOURCES = {
  vlr: "https://vlr.orlandomm.net/api/v1",
  // Add other sources as fallbacks
};

// Cache for scraped data
let cachedData = {
  players: [],
  upcomingMatches: [],
  recentMatches: [],
  liveMatches: [],
  lastUpdate: null
};

/**
 * Fetch from VLR API with error handling
 */
async function fetchVLRData(endpoint) {
  try {
    const url = `${DATA_SOURCES.vlr}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${endpoint}`);
    }
    
    const json = await response.json();
    return json.data || json;
  } catch (e) {
    console.error(`Error fetching ${endpoint}:`, e);
    throw e;
  }
}

/**
 * Scrape players from VLR API
 */
async function scrapePlayersFromVLR(region = "all", limit = 30) {
  try {
    console.log(`Fetching players for region: ${region}`);
    const data = await fetchVLRData(`/players?limit=${limit}&page=1&region=${region}`);
    
    const players = (data.players || data.segments || data || [])
      .slice(0, limit)
      .map((p, i) => ({
        id: p.id || p.player_id || `player-${i}`,
        name: p.name || '',
        ign: p.ign || p.alias || p.name || '',
        team: p.team || p.current_team || 'Free Agent',
        country: p.country || p.region || '',
        img: p.img || p.image || '',
        region: region,
        stats: {
          acs: p.acs ? parseInt(p.acs) : 0,
          kd: p.kd ? parseFloat(p.kd) : 0,
          hs: p.hs ? parseInt(p.hs) : 0,
          kpr: p.kpr ? parseFloat(p.kpr) : 0
        }
      }));
    
    console.log(`Successfully fetched ${players.length} players for region ${region}`);
    return players;
  } catch (e) {
    console.error(`Failed to scrape players for region ${region}:`, e);
    throw e;
  }
}

/**
 * Scrape match data from VLR API with region filtering
 */
async function scrapeMatchesFromVLR(type = "upcoming", region = null) {
  try {
    let endpoint;
    if (type === 'live') {
      endpoint = '/matches';
    } else if (type === 'recent') {
      endpoint = '/results?limit=100';
    } else {
      endpoint = '/matches?limit=100';
    }
    
    // Add region filter if provided
    if (region && region !== 'all') {
      endpoint += `${endpoint.includes('?') ? '&' : '?'}region=${region}`;
    }
    
    console.log(`Fetching ${type} matches`);
    const data = await fetchVLRData(endpoint);
    
    let matches = (data.segments || data.matches || data.results || data || [])
      .map((m, i) => {
        const team1Name = m.team1 || m.teams?.[0]?.name || m.t1 || m.t1_name || 'TBD';
        const team2Name = m.team2 || m.teams?.[1]?.name || m.t2 || m.t2_name || 'TBD';
        
        return {
          id: m.id || m.match_id || `match-${i}`,
          team1: team1Name,
          team2: team2Name,
          team1_id: m.t1_id || m.teams?.[0]?.id,
          team2_id: m.t2_id || m.teams?.[1]?.id,
          score: m.score || m.match_score || '',
          status: m.status || type,
          tournament: m.tournament || m.event || m.league || '',
          date: m.date || m.timestamp || new Date().toISOString(),
          time_until_match: m.time_until_match || m.eta || '',
          region: m.region || region || 'EMEA',
          teams: [
            { name: team1Name, id: m.t1_id || m.teams?.[0]?.id },
            { name: team2Name, id: m.t2_id || m.teams?.[1]?.id }
          ],
          winner: m.winner || null,
          match_data: m // Store full match data for detailed view
        };
      });
    
    // Filter by type
    if (type === 'live') {
      matches = matches.filter(m => 
        (m.status || '').toLowerCase().includes('live') || 
        (m.time_until_match || '').toLowerCase() === 'live'
      );
    } else if (type === 'upcoming') {
      matches = matches.filter(m => 
        !(m.status || '').toLowerCase().includes('live') &&
        (m.time_until_match || '') !== ''
      );
    }
    
    console.log(`Successfully fetched ${matches.length} ${type} matches`);
    return matches;
  } catch (e) {
    console.error(`Failed to scrape ${type} matches:`, e);
    throw e;
  }
}

/**
 * Initialize and load all data
 */
export async function initializeScraper() {
  try {
    console.log('🔄 Initializing data loader...');
    
    // Load player data by region in parallel
    const playerRegions = ['all', 'na', 'eu', 'ap', 'la', 'br', 'kr'];
    console.log(`📥 Fetching players from ${playerRegions.length} regions...`);
    
    const playerResults = await Promise.allSettled(
      playerRegions.map(region => scrapePlayersFromVLR(region, 30))
    );
    
    // Combine successful player data
    let allPlayers = [];
    playerResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        allPlayers = allPlayers.concat(result.value);
      } else {
        console.warn(`Failed to fetch players for region ${playerRegions[idx]}:`, result.reason);
      }
    });
    
    cachedData.players = allPlayers.slice(0, 200); // Keep top 200 unique players
    console.log(`✅ Loaded ${cachedData.players.length} players`);

    // Load match data by region
    console.log(`📥 Fetching match data...`);
    const regions = ['na', 'eu', 'oce', 'apac', 'me', 'vn'];
    const matchResults = await Promise.allSettled([
      scrapeMatchesFromVLR('upcoming'),
      ...regions.map(r => scrapeMatchesFromVLR('recent', r)),
      scrapeMatchesFromVLR('live')
    ]);

    if (matchResults[0].status === 'fulfilled') {
      cachedData.upcomingMatches = matchResults[0].value;
      console.log(`✅ Loaded ${cachedData.upcomingMatches.length} upcoming matches`);
    } else {
      console.error('Failed to load upcoming matches:', matchResults[0].reason);
      cachedData.upcomingMatches = [];
    }

    // Combine recent matches from all regions
    cachedData.recentMatches = [];
    for (let i = 1; i <= regions.length; i++) {
      if (matchResults[i].status === 'fulfilled') {
        cachedData.recentMatches = cachedData.recentMatches.concat(matchResults[i].value);
      }
    }
    // Keep only last 30 recent matches total
    cachedData.recentMatches = cachedData.recentMatches.slice(0, 30);
    console.log(`✅ Loaded ${cachedData.recentMatches.length} recent matches across all regions`);

    if (matchResults[regions.length + 1].status === 'fulfilled') {
      cachedData.liveMatches = matchResults[regions.length + 1].value;
      console.log(`✅ Loaded ${cachedData.liveMatches.length} live matches`);
    } else {
      console.error('Failed to load live matches:', matchResults[regions.length + 1].reason);
      cachedData.liveMatches = [];
    }

    cachedData.lastUpdate = Date.now();
    console.log('✨ Data initialization complete!');
    
    // Start live match updates every 10 seconds
    startLiveMatchUpdater();
  } catch (e) {
    console.error('💥 Failed to initialize data loader:', e);
    throw e;
  }
}

/**
 * Start periodic live match updates
 */
let liveUpdateInterval = null;

function startLiveMatchUpdater() {
  if (liveUpdateInterval) clearInterval(liveUpdateInterval);
  
  console.log('🔄 Starting live match updater (every 10 seconds)...');
  
  liveUpdateInterval = setInterval(async () => {
    try {
      const live = await scrapeMatchesFromVLR('live');
      cachedData.liveMatches = live;
      console.log(`[${new Date().toLocaleTimeString()}] Updated live matches: ${live.length} active`);
    } catch (e) {
      console.error('Error updating live matches:', e);
    }
  }, 10000); // Update every 10 seconds
}

export function stopLiveMatchUpdater() {
  if (liveUpdateInterval) {
    clearInterval(liveUpdateInterval);
    liveUpdateInterval = null;
  }
}

// Public API functions using cached data

export function getPlayers(region = 'all', limit = 30, page = 1) {
  let players = cachedData.players;
  
  if (region !== 'all') {
    players = players.filter(p => p.region === region || p.region === 'all');
  }
  
  const start = (page - 1) * limit;
  return players.slice(start, start + limit);
}

export function getPlayer(id) {
  return cachedData.players.find(p => p.id === id) || null;
}

export function getMatches() {
  return [...cachedData.upcomingMatches, ...cachedData.liveMatches];
}

export function getResults() {
  return cachedData.recentMatches;
}

export function getMatchDetail(matchId) {
  const match = [...cachedData.upcomingMatches, ...cachedData.liveMatches, ...cachedData.recentMatches]
    .find(m => m.id === matchId);
  return match || null;
}

export function getEvents() {
  // Return unique tournaments from matches
  const tournaments = new Set();
  [...cachedData.upcomingMatches, ...cachedData.liveMatches, ...cachedData.recentMatches]
    .forEach(m => m.tournament && tournaments.add(m.tournament));
  return Array.from(tournaments).map(name => ({ id: name, name }));
}

export function getTeam(id) {
  // Find all matches with this team
  const teamMatches = [...cachedData.upcomingMatches, ...cachedData.liveMatches, ...cachedData.recentMatches]
    .filter(m => m.team1 === id || m.team2 === id);
  
  if (teamMatches.length === 0) return null;
  
  return {
    id,
    name: id,
    matches: teamMatches
  };
}

export function getLiveMatches() {
  return cachedData.liveMatches;
}

export function getUpcomingMatches() {
  return cachedData.upcomingMatches;
}

export function getRecentResults(limit = 20, region = null) {
  let matches = cachedData.recentMatches;
  
  if (region && region !== 'all') {
    matches = matches.filter(m => m.region?.toLowerCase() === region.toLowerCase());
  }
  
  return matches.slice(0, limit);
}

export function getRecentResultsByRegion(region, limit = 5) {
  return cachedData.recentMatches
    .filter(m => m.region?.toLowerCase() === region.toLowerCase())
    .slice(0, limit);
}

export function getAllMatchData() {
  return [...cachedData.upcomingMatches, ...cachedData.liveMatches, ...cachedData.recentMatches];
}

export function getPlayerStats(playerId) {
  const player = getPlayer(playerId);
  return player?.stats || null;
}

export function getPlayerMatchHistory(playerId, limit = 20) {
  const player = getPlayer(playerId);
  if (!player) return [];
  
  // Filter matches by player's team
  const matches = [...cachedData.upcomingMatches, ...cachedData.liveMatches, ...cachedData.recentMatches]
    .filter(m => m.team1 === player.team || m.team2 === player.team)
    .slice(0, limit);
  
  return matches;
}

export function getTeamStats(teamId) {
  const team = getTeam(teamId);
  if (!team) return null;
  
  // Calculate team stats from matches
  const matches = team.matches;
  let wins = 0;
  matches.forEach(m => {
    if ((m.team1 === teamId && m.score?.startsWith('2')) || (m.team2 === teamId && m.score?.endsWith('2'))) {
      wins++;
    }
  });
  
  return {
    id: teamId,
    name: teamId,
    wins,
    matches: matches.length,
    winRate: matches.length > 0 ? (wins / matches.length * 100).toFixed(1) : 0
  };
}

// Initialize on module load
initializeScraper().catch(console.error);
