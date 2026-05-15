// functions/src/index.js
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const https     = require('https');
const http      = require('http');

admin.initializeApp();
const db = admin.firestore();

// ─── Config ───────────────────────────────────────────────────────────────────
// Set via: firebase functions:config:set vlr.base_url="https://vlrggapi.vercel.app"
// Or use a self-hosted instance: http://localhost:3001
// Or the alternative: https://vlr.orlandomm.net/api/v1
const VLR_BASE = () => {
  try {
    return functions.config().vlr?.base_url ?? 'https://vlrggapi.vercel.app';
  } catch {
    return 'https://vlrggapi.vercel.app';
  }
};

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 10000, headers: { 'User-Agent': 'VCT-Fantasy/1.0' } }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`Parse error: ${raw.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ─── vlrProxy callable ────────────────────────────────────────────────────────
// Called by the React app for all VLR API requests.
// data: { endpoint: string, params?: Record<string,string> }
exports.vlrProxy = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Auth required');

  const { endpoint, params = {} } = data;
  if (!endpoint || typeof endpoint !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'endpoint required');
  }

  // Build URL
  const base = VLR_BASE();
  const qs = new URLSearchParams(params).toString();
  const url = `${base}${endpoint}${qs ? '?' + qs : ''}`;

  functions.logger.info('VLR proxy:', url);

  try {
    const json = await fetchJSON(url);
    return json;
  } catch (err) {
    functions.logger.error('VLR proxy error:', err.message, 'url:', url);
    throw new functions.https.HttpsError('unavailable', `VLR API error: ${err.message}`);
  }
});

// ─── Scoring helpers ──────────────────────────────────────────────────────────
function calcPoints(stats) {
  if (!stats) return 0;
  let pts = 0;
  const kills   = parseInt(stats.kills   ?? stats.k   ?? 0);
  const deaths  = parseInt(stats.deaths  ?? stats.d   ?? 0);
  const assists = parseInt(stats.assists ?? stats.a   ?? 0);
  const acs     = parseFloat(stats.average_combat_score ?? stats.acs ?? 0);
  const hsPct   = parseFloat(String(stats.headshot_percentage ?? '0').replace('%', ''));
  const fkpr    = parseFloat(stats.first_kills_per_round ?? 0);
  const clutch  = parseFloat(String(stats.clutch_success_percentage ?? '0').replace('%', ''));
  const won     = stats.match_won === true || stats.won === true;
  const flawless= stats.flawless === true;
  const topACS  = stats.top3_acs === true;
  const potg    = stats.potg    === true;

  pts += kills * 3;
  pts -= deaths * 1;
  pts += assists * 1.5;

  if (acs >= 300) pts += 20;
  else if (acs >= 250) pts += 10;
  else if (acs >= 200) pts += 5;

  if (hsPct >= 35) pts += 6;
  else if (hsPct >= 25) pts += 3;

  if (fkpr >= 0.15) pts += 2;
  if (clutch >= 50) pts += 5;
  if (won) pts += 10;
  if (flawless) pts += 15;
  if (topACS) pts += 10;
  if (potg) pts += 25;

  return Math.round(pts * 10) / 10;
}

// ─── scoreGameweek HTTP function ──────────────────────────────────────────────
// POST { gameweekId, leagueId }
// Called by admins (or triggered automatically) when a GW ends.
// Fetches match stats from VLR, scores all rosters, writes results.
exports.scoreGameweek = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Auth required');

  const { gameweekId, leagueId } = data;
  if (!gameweekId || !leagueId) {
    throw new functions.https.HttpsError('invalid-argument', 'gameweekId and leagueId required');
  }

  // Load gameweek
  const gwSnap = await db.collection('gameweeks').doc(gameweekId).get();
  if (!gwSnap.exists) throw new functions.https.HttpsError('not-found', 'Gameweek not found');
  const gw = gwSnap.data();

  // Fetch stats for all matches in this gameweek
  const statsMap = {}; // { [playerIgn]: aggregatedStats }
  const base = VLR_BASE();

  for (const matchId of (gw.matchIds ?? [])) {
    try {
      const detail = await fetchJSON(`${base}/v2/match/${matchId}`);
      const players = detail?.data?.players ?? detail?.players ?? [];
      for (const p of players) {
        const ign = p.ign ?? p.player ?? '';
        if (!ign) continue;
        if (!statsMap[ign]) {
          statsMap[ign] = { ...p, matchCount: 0, killsTotal: 0, deathsTotal: 0, acsTotal: 0 };
        }
        // Aggregate across maps/matches
        statsMap[ign].matchCount++;
        statsMap[ign].killsTotal  += parseInt(p.kills ?? p.k ?? 0);
        statsMap[ign].deathsTotal += parseInt(p.deaths ?? p.d ?? 0);
        statsMap[ign].acsTotal    += parseFloat(p.average_combat_score ?? p.acs ?? 0);
        statsMap[ign].average_combat_score = statsMap[ign].acsTotal / statsMap[ign].matchCount;
        statsMap[ign].kills  = statsMap[ign].killsTotal;
        statsMap[ign].deaths = statsMap[ign].deathsTotal;
      }
    } catch (err) {
      functions.logger.warn(`Could not fetch match ${matchId}:`, err.message);
    }
  }

  // Mark top3 ACS and POTG across all players
  const acsRanked = Object.entries(statsMap).sort((a, b) => b[1].average_combat_score - a[1].average_combat_score);
  acsRanked.slice(0, 1).forEach(([ign]) => { statsMap[ign].potg = true; });
  acsRanked.slice(0, 3).forEach(([ign]) => { statsMap[ign].top3_acs = true; });

  // Score all rosters in the league
  const rostersSnap = await db.collection('leagues').doc(leagueId).collection('rosters').get();
  const batch = db.batch();

  for (const rosterDoc of rostersSnap.docs) {
    const roster = rosterDoc.data();
    const userId = roster.userId;
    const playerBreakdowns = [];
    let gwTotal = 0;

    for (const pid of (roster.players ?? [])) {
      const stats = statsMap[pid];
      let pts = calcPoints(stats ?? {});
      const isCap = roster.captainId === pid;

      if (roster.activeChip === 'tripleDuelist' && isCap) pts *= 3;
      else if (isCap) pts *= 2;
      if (roster.activeChip === 'allIn') pts *= 2;

      pts = Math.round(pts);
      playerBreakdowns.push({ playerId: pid, points: pts, stats: stats ?? null });
      gwTotal += pts;
    }

    gwTotal = Math.round(gwTotal);

    // Write GW score doc
    const gwScoreRef = db
      .collection('leagues').doc(leagueId)
      .collection('gameweekScores').doc(`${gameweekId}_${userId}`);
    batch.set(gwScoreRef, {
      userId, gameweekId, leagueId,
      totalPoints: gwTotal,
      playerBreakdowns,
      scoredAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Increment season total
    batch.update(rosterDoc.ref, {
      totalPoints: admin.firestore.FieldValue.increment(gwTotal),
      transfersThisGW: 0,
      activeChip: admin.firestore.FieldValue.delete(),
    });

    // Write to user's GW history
    const histRef = db.collection('gameweekHistory').doc(`${userId}_${gameweekId}`);
    batch.set(histRef, { userId, gameweekId, leagueId, points: gwTotal, gwNumber: gw.number ?? 0 });

    // Notification
    const notifRef = db.collection('notifications').doc();
    batch.set(notifRef, {
      userId, type: 'gw_scored',
      message: `GW scored! You earned ${gwTotal} pts.`,
      metadata: { gameweekId, leagueId, gwTotal },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Mark GW as complete
  batch.update(gwSnap.ref, { status: 'complete' });

  await batch.commit();

  // Generate H2H pairings for next GW (best-effort)
  const leagueSnap = await db.collection('leagues').doc(leagueId).get();
  const members = leagueSnap.data()?.members ?? [];
  if (members.length >= 2) {
    const nextGWSnap = await db
      .collection('gameweeks')
      .where('status', '==', 'upcoming')
      .orderBy('startDate')
      .limit(1)
      .get();
    if (!nextGWSnap.empty) {
      const nextGWId = nextGWSnap.docs[0].id;
      const shuffled = [...members].sort(() => Math.random() - 0.5);
      const h2hBatch = db.batch();
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        const pairRef = db.collection('leagues').doc(leagueId).collection('h2h').doc(`${nextGWId}_${i}`);
        h2hBatch.set(pairRef, {
          player1: shuffled[i], player2: shuffled[i + 1],
          gwId: nextGWId, result: null,
        });
      }
      await h2hBatch.commit();
    }
  }

  return { success: true, playersScored: Object.keys(statsMap).length };
});

// ─── Scheduled: auto-detect completed matches → score GWs ────────────────────
// Runs every 15 min. Checks if all matches in an active GW are done.
exports.autoScoreCheck = functions.pubsub.schedule('every 15 minutes').onRun(async () => {
  const base = VLR_BASE();

  // Get active gameweeks
  const gwsSnap = await db.collection('gameweeks').where('status', '==', 'active').get();
  for (const gwDoc of gwsSnap.docs) {
    const gw = gwDoc.data();
    const matchIds = gw.matchIds ?? [];
    if (matchIds.length === 0) continue;

    // Fetch recent results
    let results;
    try {
      results = await fetchJSON(`${base}/v2/match?q=results`);
    } catch { continue; }

    const completedIds = new Set(
      (results?.data?.segments ?? []).map(m => String(m.match_id ?? m.id ?? ''))
    );

    const allDone = matchIds.every(id => completedIds.has(String(id)));
    if (!allDone) continue;

    // Score all leagues that reference this gameweek
    const leaguesSnap = await db.collection('leagues').get();
    for (const leagueDoc of leaguesSnap.docs) {
      const gwScoreCheck = await db
        .collection('leagues').doc(leagueDoc.id)
        .collection('gameweekScores')
        .where('gameweekId', '==', gwDoc.id)
        .limit(1)
        .get();

      if (!gwScoreCheck.empty) continue; // already scored

      try {
        // Re-use scoring logic inline (can't call self via HTTPS from scheduled)
        functions.logger.info(`Auto-scoring GW ${gwDoc.id} for league ${leagueDoc.id}`);
        // Fetch stats
        const statsMap = {};
        for (const matchId of matchIds) {
          try {
            const detail = await fetchJSON(`${base}/v2/match/${matchId}`);
            const players = detail?.data?.players ?? [];
            for (const p of players) {
              const ign = p.ign ?? p.player ?? '';
              if (!ign) continue;
              if (!statsMap[ign]) statsMap[ign] = { ...p };
            }
          } catch {}
        }

        const rostersSnap = await db.collection('leagues').doc(leagueDoc.id).collection('rosters').get();
        const batch = db.batch();
        for (const rDoc of rostersSnap.docs) {
          const roster = rDoc.data();
          let gwTotal = 0;
          const breakdowns = [];
          for (const pid of (roster.players ?? [])) {
            let pts = calcPoints(statsMap[pid] ?? {});
            const isCap = roster.captainId === pid;
            if (roster.activeChip === 'tripleDuelist' && isCap) pts *= 3;
            else if (isCap) pts *= 2;
            if (roster.activeChip === 'allIn') pts *= 2;
            pts = Math.round(pts);
            breakdowns.push({ playerId: pid, points: pts });
            gwTotal += pts;
          }
          const scoreRef = db.collection('leagues').doc(leagueDoc.id).collection('gameweekScores').doc(`${gwDoc.id}_${roster.userId}`);
          batch.set(scoreRef, { userId: roster.userId, gameweekId: gwDoc.id, leagueId: leagueDoc.id, totalPoints: gwTotal, playerBreakdowns: breakdowns, scoredAt: admin.firestore.FieldValue.serverTimestamp() });
          batch.update(rDoc.ref, { totalPoints: admin.firestore.FieldValue.increment(gwTotal), transfersThisGW: 0 });
        }
        batch.update(gwDoc.ref, { status: 'complete' });
        await batch.commit();
      } catch (err) {
        functions.logger.error('Auto-score error:', err);
      }
    }
  }
  return null;
});

// ─── getPlayerOwnership callable ─────────────────────────────────────────────
exports.getPlayerOwnership = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Auth required');

  const leaguesSnap = await db.collection('leagues').get();
  const counts = {};
  let total = 0;

  for (const lDoc of leaguesSnap.docs) {
    const rostersSnap = await db.collection('leagues').doc(lDoc.id).collection('rosters').get();
    for (const rDoc of rostersSnap.docs) {
      total++;
      for (const pid of (rDoc.data().players ?? [])) {
        counts[pid] = (counts[pid] ?? 0) + 1;
      }
    }
  }

  const ownership = {};
  for (const [pid, count] of Object.entries(counts)) {
    ownership[pid] = total > 0 ? Math.round((count / total) * 100) : 0;
  }
  return ownership;
});
