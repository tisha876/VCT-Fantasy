import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { auth, db } from "./firebase";

// ─── LEAGUES ────────────────────────────────────────────────────────────────

export async function createLeague(userId, leagueName, settings = {}) {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ref = await addDoc(collection(db, "leagues"), {
    name: leagueName,
    code,
    ownerId: userId,
    members: [userId],
    settings: {
      rosterSize: settings.rosterSize || 5,
      maxPlayersPerTeam: settings.maxPlayersPerTeam || 2,
      region: settings.region || "all",
      ...settings,
    },
    createdAt: serverTimestamp(),
  });
  // Add to user's leagues
  await updateDoc(doc(db, "users", userId), {
    leagues: arrayUnion(ref.id),
  });
  return { id: ref.id, code };
}

export async function joinLeague(userId, code) {
  const q = query(collection(db, "leagues"), where("code", "==", code));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("League not found. Check your invite code.");
  const leagueDoc = snap.docs[0];
  const leagueId = leagueDoc.id;
  await updateDoc(doc(db, "leagues", leagueId), {
    members: arrayUnion(userId),
  });
  await updateDoc(doc(db, "users", userId), {
    leagues: arrayUnion(leagueId),
  });
  return leagueId;
}

export async function getLeague(leagueId) {
  const snap = await getDoc(doc(db, "leagues", leagueId));
  if (!snap.exists()) throw new Error("League not found");
  return { id: snap.id, ...snap.data() };
}

export async function getUserLeagues(userId) {
  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) return [];
  const leagueIds = userSnap.data().leagues || [];
  if (!leagueIds.length) return [];
  const leagues = await Promise.all(leagueIds.map((id) => getLeague(id)));
  return leagues;
}

// ─── ROSTERS ────────────────────────────────────────────────────────────────

export async function getRoster(userId, leagueId) {
  const snap = await getDoc(doc(db, "leagues", leagueId, "rosters", userId));
  if (!snap.exists()) return { players: [], lockedIn: false };
  return snap.data();
}

export async function saveRoster(userId, leagueId, players) {
  await setDoc(doc(db, "leagues", leagueId, "rosters", userId), {
    players,
    updatedAt: serverTimestamp(),
    lockedIn: false,
  });
}

export async function lockRoster(userId, leagueId) {
  await updateDoc(doc(db, "leagues", leagueId, "rosters", userId), {
    lockedIn: true,
    lockedAt: serverTimestamp(),
  });
}

// ─── SCORING ────────────────────────────────────────────────────────────────

export async function submitMatchScore(leagueId, matchId, userId, scoreData) {
  await setDoc(
    doc(db, "leagues", leagueId, "scores", `${userId}_${matchId}`),
    {
      userId,
      matchId,
      ...scoreData,
      submittedAt: serverTimestamp(),
    }
  );
  // Update leaderboard total
  await updateDoc(doc(db, "leagues", leagueId, "leaderboard", userId), {
    totalPoints: increment(scoreData.totalPoints),
    matchesPlayed: increment(1),
    displayName: scoreData.displayName,
    photoURL: scoreData.photoURL,
  }).catch(async () => {
    // doc doesn't exist yet
    await setDoc(doc(db, "leagues", leagueId, "leaderboard", userId), {
      userId,
      totalPoints: scoreData.totalPoints,
      matchesPlayed: 1,
      displayName: scoreData.displayName,
      photoURL: scoreData.photoURL,
    });
  });
}

export async function getLeaderboard(leagueId) {
  const snap = await getDocs(
    query(
      collection(db, "leagues", leagueId, "leaderboard"),
      orderBy("totalPoints", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserScores(userId, leagueId) {
  const snap = await getDocs(
    query(
      collection(db, "leagues", leagueId, "scores"),
      where("userId", "==", userId)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getMatchScores(leagueId, matchId) {
  const snap = await getDocs(
    query(
      collection(db, "leagues", leagueId, "scores"),
      where("matchId", "==", matchId)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── MATCH EVENTS ────────────────────────────────────────────────────────────

/**
 * Admin: Mark a match as scorable and store raw stat data.
 */
export async function createMatchEvent(leagueId, matchData) {
  const ref = await addDoc(
    collection(db, "leagues", leagueId, "matchEvents"),
    {
      ...matchData,
      createdAt: serverTimestamp(),
      scored: false,
    }
  );
  return ref.id;
}

export async function getMatchEvents(leagueId) {
  const snap = await getDocs(
    query(
      collection(db, "leagues", leagueId, "matchEvents"),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function markMatchScored(leagueId, eventId) {
  await updateDoc(doc(db, "leagues", leagueId, "matchEvents", eventId), {
    scored: true,
  });
}