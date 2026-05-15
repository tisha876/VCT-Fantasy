// src/context/AppContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { getCurrentGameweek } from './firestore';
import { getUserLeagues } from './firestore';
import { upsertUserProfile, getUserProfile } from './firestore';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentGameweek, setCurrentGameweek] = useState(null);
  const [myLeagues, setMyLeagues] = useState([]);
  const [activeLeagueId, setActiveLeagueId] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Upsert profile on login
        await upsertUserProfile(firebaseUser.uid, {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
        const profile = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile);
        // Load leagues
        const leagues = await getUserLeagues(firebaseUser.uid);
        setMyLeagues(leagues);
        if (leagues.length > 0 && !activeLeagueId) {
          setActiveLeagueId(leagues[0].id);
        }
      } else {
        setUserProfile(null);
        setMyLeagues([]);
        setActiveLeagueId(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Load current gameweek
  useEffect(() => {
    getCurrentGameweek().then(gw => setCurrentGameweek(gw)).catch(() => {});
  }, []);

  const refreshLeagues = async () => {
    if (!user) return;
    const leagues = await getUserLeagues(user.uid);
    setMyLeagues(leagues);
  };

  const value = {
    user,
    userProfile,
    setUserProfile,
    authLoading,
    currentGameweek,
    setCurrentGameweek,
    myLeagues,
    refreshLeagues,
    activeLeagueId,
    setActiveLeagueId,
    notifications,
    setNotifications,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}