import { 
  doc, 
  setDoc, 
  getDoc, // Added this missing import
  arrayUnion, 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit 
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Creates a new league and ensures the user document exists.
 * Uses setDoc with merge:true to prevent "No document to update" errors.
 */
export const createLeague = async (userId, name, settings) => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const leagueRef = doc(collection(db, "leagues"));
  const leagueId = leagueRef.id;

  // Create the league document
  await setDoc(leagueRef, {
    id: leagueId,
    name,
    code,
    ownerId: userId,
    members: [userId],
    settings,
    createdAt: new Date()
  });

  // Link league to user - merge: true handles missing user docs
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    leagues: arrayUnion(leagueId)
  }, { merge: true });

  return { id: leagueId, code };
};

/**
 * Joins an existing league using an invite code.
 */
export const joinLeague = async (userId, code) => {
  const q = query(collection(db, "leagues"), where("code", "==", code));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Invalid invite code");
  }

  const leagueDoc = querySnapshot.docs[0];
  const leagueId = leagueDoc.id;

  // Add user to league members list
  await setDoc(doc(db, "leagues", leagueId), {
    members: arrayUnion(userId)
  }, { merge: true });

  // Add league ID to user's personal list
  await setDoc(doc(db, "users", userId), {
    leagues: arrayUnion(leagueId)
  }, { merge: true });

  return leagueId;
};

export const getLeague = async (leagueId) => {
  try {
    const leagueRef = doc(db, "leagues", leagueId);
    const leagueSnap = await getDoc(leagueRef);
    
    if (leagueSnap.exists()) {
      return { id: leagueSnap.id, ...leagueSnap.data() };
    } else {
      throw new Error("League not found");
    }
  } catch (error) {
    console.error("Error fetching league:", error);
    throw error;
  }
};

export const getUserLeagues = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    
    if (!userDoc.exists() || !userDoc.data().leagues) {
      return [];
    }

    const leagueIds = userDoc.data().leagues;
    if (leagueIds.length === 0) return [];

    const leagues = [];
    for (const id of leagueIds) {
      const lDoc = await getDoc(doc(db, "leagues", id));
      if (lDoc.exists()) {
        leagues.push({ id: lDoc.id, ...lDoc.data() });
      }
    }
    
    return leagues;
  } catch (error) {
    console.error("Error fetching user leagues:", error);
    throw error;
  }

  
};

export const getRoster = async (leagueId, userId) => {
  try {
    // Rosters are usually stored in a sub-collection or a specific document
    // Adjust this path if your database structure is different!
    const rosterRef = doc(db, "leagues", leagueId, "rosters", userId);
    const rosterSnap = await getDoc(rosterRef);

    if (rosterSnap.exists()) {
      return { id: rosterSnap.id, ...rosterSnap.data() };
    } else {
      // Return an empty roster if they haven't drafted anyone yet
      return { players: [] };
    }
  } catch (error) {
    console.error("Error fetching roster:", error);
    throw error;
  }
};

export const saveRoster = async (leagueId, userId, players) => {
  try {
    const rosterRef = doc(db, "leagues", leagueId, "rosters", userId);
    
    await setDoc(rosterRef, {
      userId,
      players,
      updatedAt: new Date()
    }, { merge: true });

    return true;
  } catch (error) {
    console.error("Error saving roster:", error);
    throw error;
  }
};

export const lockRoster = async (leagueId, userId) => {
  try {
    const rosterRef = doc(db, "leagues", leagueId, "rosters", userId);
    
    await setDoc(rosterRef, {
      isLocked: true,
      lockedAt: new Date()
    }, { merge: true });

    return true;
  } catch (error) {
    console.error("Error locking roster:", error);
    throw error;
  }
};

export const getLeaderboard = async (leagueId) => {
  try {
    // Queries the rosters sub-collection and sorts by points
    const rostersRef = collection(db, "leagues", leagueId, "rosters");
    const q = query(rostersRef, orderBy("totalPoints", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    throw error;
  }
};

export const getUserScores = async (userId) => {
  try {
    const scoresRef = collection(db, "users", userId, "scores");
    const q = query(scoresRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching user scores:", error);
    // Return empty array if no scores exist yet to prevent UI crashes
    return [];
  }
};

export const getMatchEvents = async (matchId) => {
  try {
    const eventsRef = collection(db, "matches", matchId, "events");
    // Sorting by timestamp ensures events appear in chronological order
    const q = query(eventsRef, orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching match events:", error);
    return [];
  }
};
export const getMatchesByStatus = async (status) => {
  try {
    const matchesRef = collection(db, "matches");
    // status would be 'scheduled' for upcoming or 'finished' for historical data
    const q = query(
      matchesRef, 
      where("status", "==", status), 
      orderBy("startTime", status === "scheduled" ? "asc" : "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error fetching ${status} matches:`, error);
    return [];
  }
};

/**
 * Fetches detailed statistics for a specific match to show in the info section.
 */
export const getMatchDetails = async (matchId) => {
  try {
    const matchRef = doc(db, "matches", matchId);
    const matchSnap = await getDoc(matchRef);

    if (matchSnap.exists()) {
      return { id: matchSnap.id, ...matchSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching match details:", error);
    throw error;
  }
};

export const getMatchHighlights = async (limitCount = 5) => {
  try {
    const matchesRef = collection(db, "matches");
    // Only get finished matches, sorted by most recent first
    const q = query(
      matchesRef, 
      where("status", "==", "finished"), 
      orderBy("startTime", "desc"),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching match highlights:", error);
    return [];
  }
};

/**
 * Fetches the top individual player performance from a specific match.
 * Useful for the "Player of the Match" part of your highlight reel.
 */
export const getTopPerformance = async (matchId) => {
  try {
    const statsRef = collection(db, "matches", matchId, "playerStats");
    const q = query(statsRef, orderBy("fantasyPoints", "desc"), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching top performance:", error);
    return null;
  }
};
export const getPlayerInfo = async (playerId) => {
  try {
    const playerRef = doc(db, "players", playerId);
    const playerSnap = await getDoc(playerRef);

    if (playerSnap.exists()) {
      return { id: playerSnap.id, ...playerSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching player info:", error);
    throw error;
  }
};

/**
 * Fetches recent performance stats for a player to show under "Player Info".
 */
export const getPlayerRecentStats = async (playerId, limitCount = 5) => {
  try {
    const statsRef = collection(db, "players", playerId, "recentStats");
    const q = query(statsRef, orderBy("date", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching recent stats:", error);
    return [];
  }
};