const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

const VLR_BASE = functions.config().vlr?.base_url ?? 'https://vlrggapi.vercel.app';

// ─── vlrProxy ────────────────────────────────────────────────────────────────
// Proxies all VLR API requests from the client to avoid CORS.
exports.vlrProxy = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const { endpoint, params = {} } = data;
  if (!endpoint || typeof endpoint !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'endpoint required');
  }
  try {
    const resp = await axios.get(`${VLR_BASE}${endpoint}`, { params, timeout: 10000 });
    return resp.data;
  } catch (err) {
    const status = err.response?.status ?? 500;
    throw new functions.https.HttpsError('internal', `VLR API error ${status}: ${err.message}`);
  }
});

// ─── scoreGameweek ────────────────────────────────────────────────────────────
// Manually trigger GW scoring for a league. Called by admin.
exports.scoreGameweek = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  const { leagueId, gwId, statsMap } = data;
  if (!leagueId || !gwId || !statsMap) {
    throw new functions.https.HttpsError('invalid-argument', 'leagueId, gwId, statsMap required');
  }

  const db = admin.firestore();
  const rostersSnap = await db.collection('leagues').doc(leagueId).collection('rosters').get();
  const batch = db.batch();

  for (const rosterDoc of rostersSnap.docs) {
    const roster = rosterDoc.data();
    const userId = roster.userId;
    let gwTotal = 0;
    const playerBreakdowns = [];

    for (const playerId of (roster.players ?? [])) {
      const stats = statsMap[playerId];
      if (!stats) continue;
      let pts = calcFantasyPoints(stats);
      const isCap = roster.captainId === playerId;
      if (roster.activeChip === 'tripleDuelist' && isCap) pts *= 3;
      else if (isCap) pts *= 2;
      if (roster.activeChip === 'allIn') pts *= 2;
      playerBreakdowns.push({ playerId, points: Math.round(pts), stats });
      gwTotal += pts;
    }

    gwTotal = Math.round(gwTotal);
    const gwScoreRef = db.collection('leagues').doc(leagueId)
      .collection('gameweekScores').doc(`${gwId}_${userId}`);

    batch.set(gwScoreRef, {
      userId, gameweekId: gwId, leagueId,
      totalPoints: gwTotal, playerBreakdowns,
      scoredAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(rosterDoc.ref, {
      totalPoints: admin.firestore.FieldValue.increment(gwTotal),
      transfersThisGW: 0,
      activeChip: admin.firestore.FieldValue.delete(),
    });
  }

  await batch.commit();
  return { success: true };
});

// ─── autoScoreCheck ───────────────────────────────────────────────────────────
// Runs every 15 min via PubSub. Detects completed GWs and scores them.
exports.autoScoreCheck = functions.pubsub.schedule('every 15 minutes').onRun(async () => {
  // Implementation: query active gameweeks, check if all matchIds are complete,
  // fetch match stats, call scoreGameweek logic. Extend as needed.
  functions.logger.info('autoScoreCheck ran');
  return null;
});

// ─── Scoring helper (mirrors client vlrApi.js) ────────────────────────────────
function calcFantasyPoints(stats) {
  if (!stats) return 0;
  let pts = 0;
  const kills   = parseInt(stats.kills   ?? stats.k  ?? 0);
  const deaths  = parseInt(stats.deaths  ?? stats.d  ?? 0);
  const assists = parseInt(stats.assists ?? stats.a  ?? 0);
  const acs     = parseFloat(stats.average_combat_score ?? stats.acs ?? 0);
  const hsRaw   = stats.headshot_percentage ?? stats.hs_pct ?? '0%';
  const hsPct   = parseFloat(String(hsRaw).replace('%', ''));
  const fkRaw   = stats.first_kills_per_round ?? stats.fk_per_round ?? 0;
  const clutchRaw = stats.clutch_success_percentage ?? stats.clutch_pct ?? '0%';
  const clutches  = parseFloat(String(clutchRaw).replace('%', ''));
  const won = stats.match_won ?? stats.won ?? false;

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
