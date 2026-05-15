// src/hooks/useVLR.js
import { useState, useEffect, useCallback } from 'react';
import {
  getLiveMatches, getUpcomingMatches, getResults,
  getMatchDetails, getPlayerStats, getRankings,
  normaliseLiveMatch, normaliseStatSegment
} from '../utils/vlrApi';

function useAsync(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(() => {
    setLoading(true);
    fetcher()
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e))
      .finally(() => setLoading(false));
  }, deps); // eslint-disable-line

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run };
}

export function useLiveMatches() {
  const { data, loading, error, refetch } = useAsync(
    () => getLiveMatches().then(segs => segs.map(normaliseLiveMatch))
  );
  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(refetch, 30_000);
    return () => clearInterval(id);
  }, [refetch]);
  return { matches: data ?? [], loading, error, refetch };
}

export function useUpcomingMatches() {
  return useAsync(() => getUpcomingMatches().then(segs => segs.map(normaliseLiveMatch)));
}

export function useResults() {
  return useAsync(() => getResults().then(segs => segs.map(normaliseLiveMatch)));
}

export function useMatchDetails(matchId) {
  return useAsync(() => getMatchDetails(matchId), [matchId]);
}

export function usePlayerStats(region = 'all', timespan = '60') {
  const { data, loading, error, refetch } = useAsync(
    () => getPlayerStats(region, timespan).then(segs => segs.map(normaliseStatSegment)),
    [region, timespan]
  );
  return { players: data ?? [], loading, error, refetch };
}

export function useRankings(region = 'na') {
  return useAsync(() => getRankings(region), [region]);
}

// Polling hook for live match auto-scoring
export function useLiveScoring(matchIds, interval = 15_000) {
  const [scores, setScores] = useState({});

  useEffect(() => {
    if (!matchIds || matchIds.length === 0) return;
    const fetchAll = async () => {
      const results = {};
      for (const id of matchIds) {
        try {
          const detail = await getMatchDetails(id);
          if (detail) results[id] = detail;
        } catch {}
      }
      setScores(results);
    };
    fetchAll();
    const id = setInterval(fetchAll, interval);
    return () => clearInterval(id);
  }, [matchIds?.join(','), interval]); // eslint-disable-line

  return scores;
}
