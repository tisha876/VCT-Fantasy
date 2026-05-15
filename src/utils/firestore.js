// src/utils/firestore.js
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  increment, arrayUnion, deleteField, writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { calcFantasyPoints, normaliseStatSegment } from './vlrApi';

// ─── Gameweeks ───────────────────────────────────────────────────────────────

export async function getGameweeks() {
  const snap = await getDocs(query(collection(db, 'gameweeks'), orderBy('startDate', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCurrentGameweek() {
  // Try active first
  let snap = await getDocs(query(collection(db, 'gameweeks'), where('status', '==', 'active'), limit(1)));
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  // Fall back to next upcoming
  snap = await getDocs(query(collection(db, 'gameweeks'), where('status', '==', 'upcoming'), orderBy('startDate'), limit(1)));
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  return null;
}

export function subscribeGameweek(gwId, cb) {
  return onSnapshot(doc(db, 'gameweeks', gwId), snap => cb({ id: snap.id, ...snap.data() }));
}

export async function createGameweek(data) {
  return addDoc(collection(db, 'gameweeks'), {
    ...data,
    status: 'upcoming',
    createdAt: serverTimestamp(),
  });
}

export async function updateGameweekStatus(gwId, status) {
  return updateDoc(doc(db, 'gameweeks', gwId), { status });
}

// ─── Leagues ─────────────────────────────────────────────────────────────────

export async function createLeague(userId, leagueName, settings = {}) {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const leagueRef = await addDoc(collection(db, 'leagues'), {
    name: leagueName,
    createdBy: userId,
    members: [userId],
    inviteCode: code,
    createdAt: serverTimestamp(),
    budgetEnabled: settings.budgetEnabled ?? false,
    budgetTotal: settings.budgetTotal ?? 100,
    freeTransfersPerGW: settings.freeTransfersPerGW ?? 1,
    transferCostPts: settings.transferCostPts ?? 4,
  });
  // Create user roster doc
  await setDoc(doc(db, 'leagues', leagueRef.id, 'rosters', userId), {
    userId,
    players: [],
    captainId: null,
    budget: settings.budgetTotal ?? 100,
    totalPoints: 0,
    transfersThisGW: 0,
    wildcardsLeft: 2,
    chips: { tripleDuelist: true, allIn: true, scout: true, analystMode: true },
    createdAt: serverTimestamp(),
  });
  return leagueRef.id;
}

export async function joinLeague(userId, inviteCode) {
  const snap = await getDocs(query(collection(db, 'leagues'), where('inviteCode', '==', inviteCode.toUpperCase()), limit(1)));
  if (snap.empty) throw new Error('League not found');
  const leagueDoc = snap.docs[0];
  const leagueId = leagueDoc.id;
  const data = leagueDoc.data();
  if (data.members.includes(userId)) throw new Error('Already in this league');
  await updateDoc(doc(db, 'leagues', leagueId), { members: arrayUnion(userId) });
  await setDoc(doc(db, 'leagues', leagueId, 'rosters', userId), {
    userId,
    players: [],
    captainId: null,
    budget: data.budgetTotal ?? 100,
    totalPoints: 0,
    transfersThisGW: 0,
    wildcardsLeft: 2,
    chips: { tripleDuelist: true, allIn: true, scout: true, analystMode: true },
    createdAt: serverTimestamp(),
  });
  return leagueId;
}

export async function getUserLeagues(userId) {
  const snap = await getDocs(query(collection(db, 'leagues'), where('members', 'array-contains', userId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeLeague(leagueId, cb) {
  return onSnapshot(doc(db, 'leagues', leagueId), snap => cb({ id: snap.id, ...snap.data() }));
}

// ─── Rosters ─────────────────────────────────────────────────────────────────

export async function getRoster(leagueId, userId) {
  const snap = await getDoc(doc(db, 'leagues', leagueId, 'rosters', userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeRoster(leagueId, userId, cb) {
  return onSnapshot(doc(db, 'leagues', leagueId, 'rosters', userId), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() });
  });
}

export async function updateRoster(leagueId, userId, players, captainId) {
  return updateDoc(doc(db, 'leagues', leagueId, 'rosters', userId), {
    players,
    captainId,
    lastUpdated: serverTimestamp(),
  });
}

export async function makeTransfer(leagueId, userId, outPlayerId, inPlayerId, isFree, costPts) {
  const rosterRef = doc(db, 'leagues', leagueId, 'rosters', userId);
  const snap = await getDoc(rosterRef);
  if (!snap.exists()) throw new Error('Roster not found');
  const roster = snap.data();
  const players = roster.players.filter(p => p !== outPlayerId);
  players.push(inPlayerId);
  const updates = {
    players,
    lastUpdated: serverTimestamp(),
    transfersThisGW: increment(1),
  };
  if (!isFree) updates.totalPoints = increment(-costPts);
  await updateDoc(rosterRef, updates);
  // Log transfer
  await addDoc(collection(db, 'leagues', leagueId, 'transfers'), {
    userId, outPlayerId, inPlayerId,
    isFree, costPts: isFree ? 0 : costPts,
    timestamp: serverTimestamp(),
  });
}

export async function activateChip(leagueId, userId, chipName, gwId) {
  const rosterRef = doc(db, 'leagues', leagueId, 'rosters', userId);
  await updateDoc(rosterRef, {
    [`chips.${chipName}`]: false,
    [`activeChip`]: chipName,
    [`chipActivatedGW`]: gwId,
  });
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function getLeaderboard(leagueId) {
  const snap = await getDocs(
    query(collection(db, 'leagues', leagueId, 'rosters'), orderBy('totalPoints', 'desc'))
  );
  return snap.docs.map((d, i) => ({ rank: i + 1, id: d.id, ...d.data() }));
}

export function subscribeLeaderboard(leagueId, cb) {
  return onSnapshot(
    query(collection(db, 'leagues', leagueId, 'rosters'), orderBy('totalPoints', 'desc')),
    snap => cb(snap.docs.map((d, i) => ({ rank: i + 1, id: d.id, ...d.data() })))
  );
}

// ─── Gameweek Scores ─────────────────────────────────────────────────────────

export async function getGameweekScore(leagueId, gwId, userId) {
  const id = `${gwId}_${userId}`;
  const snap = await getDoc(doc(db, 'leagues', leagueId, 'gameweekScores', id));
  return snap.exists() ? snap.data() : null;
}

export async function getGameweekLeaderboard(leagueId, gwId) {
  const snap = await getDocs(
    query(
      collection(db, 'leagues', leagueId, 'gameweekScores'),
      where('gameweekId', '==', gwId),
      orderBy('totalPoints', 'desc')
    )
  );
  return snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() }));
}

/**
 * Score a gameweek for all members of a league.
 * Called after all matches in the gameweek complete.
 * statsMap: { [playerIgn]: normalisedStatSegment }
 */
export async function scoreGameweek(leagueId, gwId, statsMap) {
  const rosters = await getDocs(collection(db, 'leagues', leagueId, 'rosters'));
  const batch = writeBatch(db);

  for (const rosterDoc of rosters.docs) {
    const roster = rosterDoc.data();
    const userId = roster.userId;
    const playerBreakdowns = [];
    let gwTotal = 0;

    for (const playerId of (roster.players ?? [])) {
      const stats = statsMap[playerId];
      if (!stats) continue;
      let pts = calcFantasyPoints(stats);
      const isCap = roster.captainId === playerId;

      // Apply chip multipliers
      if (roster.activeChip === 'tripleDuelist' && isCap) pts *= 3;
      else if (isCap) pts *= 2;
      if (roster.activeChip === 'allIn') pts *= 2;

      playerBreakdowns.push({ playerId, points: Math.round(pts), stats });
      gwTotal += pts;
    }

    gwTotal = Math.round(gwTotal);

    // Write gameweek score document
    const gwScoreRef = doc(db, 'leagues', leagueId, 'gameweekScores', `${gwId}_${userId}`);
    batch.set(gwScoreRef, {
      userId, gameweekId: gwId, leagueId,
      totalPoints: gwTotal,
      playerBreakdowns,
      scoredAt: serverTimestamp(),
    });

    // Increment total season points on roster
    batch.update(rosterDoc.ref, {
      totalPoints: increment(gwTotal),
      transfersThisGW: 0, // reset transfers for new GW
      activeChip: deleteField(),
    });
  }

  await batch.commit();
}

// ─── H2H ─────────────────────────────────────────────────────────────────────

export async function generateH2HPairings(leagueId, gwId, memberIds) {
  const batch = writeBatch(db);
  const shuffled = [...memberIds].sort(() => Math.random() - 0.5);
  const pairings = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const pair = { player1: shuffled[i], player2: shuffled[i + 1], gwId, result: null };
    pairings.push(pair);
    batch.set(doc(db, 'leagues', leagueId, 'h2h', `${gwId}_${i}`), pair);
  }
  await batch.commit();
  return pairings;
}

export async function getH2HRecord(leagueId, userId) {
  const snap = await getDocs(
    query(collection(db, 'leagues', leagueId, 'h2h'), where('player1', 'in', [userId]))
  );
  const snap2 = await getDocs(
    query(collection(db, 'leagues', leagueId, 'h2h'), where('player2', '==', userId))
  );
  return [...snap.docs.map(d => d.data()), ...snap2.docs.map(d => d.data())];
}

// ─── Player Ownership ────────────────────────────────────────────────────────

export async function getPlayerOwnership() {
  const cached = sessionStorage.getItem('playerOwnership');
  if (cached) return JSON.parse(cached);

  const leaguesSnap = await getDocs(collection(db, 'leagues'));
  const counts = {};
  let totalRosters = 0;

  for (const leagueDoc of leaguesSnap.docs) {
    const rostersSnap = await getDocs(collection(db, 'leagues', leagueDoc.id, 'rosters'));
    for (const rosterDoc of rostersSnap.docs) {
      totalRosters++;
      for (const pid of (rosterDoc.data().players ?? [])) {
        counts[pid] = (counts[pid] ?? 0) + 1;
      }
    }
  }

  const ownership = {};
  for (const [pid, count] of Object.entries(counts)) {
    ownership[pid] = totalRosters > 0 ? Math.round((count / totalRosters) * 100) : 0;
  }

  sessionStorage.setItem('playerOwnership', JSON.stringify(ownership));
  return ownership;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(userId) {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? snap.data() : null;
}

export async function upsertUserProfile(userId, data) {
  await setDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getUserGameweekHistory(userId) {
  const snap = await getDocs(
    query(
      collection(db, 'gameweekHistory'),
      where('userId', '==', userId),
      orderBy('gwNumber')
    )
  );
  return snap.docs.map(d => d.data());
}

// ─── Notifications ───────────────────────────────────────────────────────────

export function subscribeNotifications(userId, cb) {
  return onSnapshot(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20)
    ),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function markNotificationRead(notifId) {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
}

export async function createNotification(userId, type, message, metadata = {}) {
  await addDoc(collection(db, 'notifications'), {
    userId, type, message, metadata,
    read: false,
    createdAt: serverTimestamp(),
  });
}