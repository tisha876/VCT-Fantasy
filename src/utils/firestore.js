import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc,
  query, where, orderBy, serverTimestamp, arrayUnion, increment, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

// ── Leagues ──────────────────────────────────────────────────────────────────

export async function createLeague(userId, name, settings = {}) {
  const code = Math.random().toString(36).substring(2,8).toUpperCase();
  const ref  = await addDoc(collection(db,"leagues"), {
    name, code, ownerId: userId, members: [userId],
    settings: { rosterSize:5, maxPlayersPerTeam:2, region:"all", ...settings },
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db,"users",userId), { leagues: arrayUnion(ref.id) }, { merge:true });
  return { id: ref.id, code };
}

export async function joinLeague(userId, code, startingPoints = 0) {
  const q = query(collection(db,"leagues"), where("code","==",code));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("League not found. Check the invite code.");
  const leagueId = snap.docs[0].id;
  const batch = writeBatch(db);
  batch.update(doc(db,"leagues",leagueId), { members: arrayUnion(userId) });
  batch.set(doc(db,"users",userId), { leagues: arrayUnion(leagueId) }, { merge:true });
  if (startingPoints > 0) {
    batch.set(doc(db,"leagues",leagueId,"leaderboard",userId),
      { userId, totalPoints: startingPoints, matchesPlayed:0, carryover: startingPoints }, { merge:true });
  }
  await batch.commit();
  return leagueId;
}

export async function getLeague(leagueId) {
  const snap = await getDoc(doc(db,"leagues",leagueId));
  if (!snap.exists()) throw new Error("League not found");
  return { id: snap.id, ...snap.data() };
}

export async function getUserLeagues(userId) {
  const snap = await getDoc(doc(db,"users",userId));
  if (!snap.exists()) return [];
  const ids = snap.data().leagues || [];
  const results = await Promise.allSettled(ids.map(id => getLeague(id)));
  return results.filter(r => r.status==="fulfilled").map(r => r.value);
}

// ── Rosters ──────────────────────────────────────────────────────────────────

// NOTE: old code had args flipped (leagueId, userId). This version is (userId, leagueId).
export async function getRoster(userId, leagueId) {
  const snap = await getDoc(doc(db,"leagues",leagueId,"rosters",userId));
  return snap.exists() ? snap.data() : { players:[], lockedIn:false };
}

export async function saveRoster(userId, leagueId, players) {
  await setDoc(doc(db,"leagues",leagueId,"rosters",userId),
    { players, updatedAt: serverTimestamp(), lockedIn: false }, { merge:true });
}

export async function lockRoster(userId, leagueId) {
  await setDoc(doc(db,"leagues",leagueId,"rosters",userId),
    { lockedIn: true, lockedAt: serverTimestamp() }, { merge:true });
}

export async function getAllRosters(leagueId) {
  const snap = await getDocs(collection(db,"leagues",leagueId,"rosters"));
  return snap.docs.map(d => ({ userId: d.id, ...d.data() }));
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export async function submitUserMatchScore(leagueId, matchId, userId, scoreData) {
  await setDoc(doc(db,"leagues",leagueId,"scores",`${userId}_${matchId}`),
    { userId, matchId, ...scoreData, submittedAt: serverTimestamp() });
  const lbRef = doc(db,"leagues",leagueId,"leaderboard",userId);
  const lbSnap = await getDoc(lbRef);
  if (lbSnap.exists()) {
    await updateDoc(lbRef, {
      totalPoints: increment(scoreData.totalPoints || 0),
      matchesPlayed: increment(1),
      displayName: scoreData.displayName || "",
      photoURL: scoreData.photoURL || "",
    });
  } else {
    await setDoc(lbRef, {
      userId, totalPoints: scoreData.totalPoints || 0, matchesPlayed: 1,
      displayName: scoreData.displayName || "", photoURL: scoreData.photoURL || "",
    });
  }
}

export async function getLeaderboard(leagueId) {
  const snap = await getDocs(
    query(collection(db,"leagues",leagueId,"leaderboard"), orderBy("totalPoints","desc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getUserScores(userId, leagueId) {
  const snap = await getDocs(
    query(collection(db,"leagues",leagueId,"scores"), where("userId","==",userId))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Match events ──────────────────────────────────────────────────────────────

export async function createMatchEvent(leagueId, data) {
  const ref = await addDoc(collection(db,"leagues",leagueId,"matchEvents"),
    { ...data, createdAt: serverTimestamp(), scored: false });
  return ref.id;
}

export async function getMatchEvents(leagueId) {
  try {
    const snap = await getDocs(
      query(collection(db,"leagues",leagueId,"matchEvents"), orderBy("createdAt","desc"))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) { return []; }
}

export async function markMatchScored(leagueId, eventId) {
  await updateDoc(doc(db,"leagues",leagueId,"matchEvents",eventId), { scored: true });
}

// ── Legacy stubs (keep old callers happy) ────────────────────────────────────
export async function updateLeaguePoints() { return {}; }
