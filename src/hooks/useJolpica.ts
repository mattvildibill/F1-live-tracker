import { useState, useEffect, useRef } from 'react';
import type {
  ChampionshipData, DriverStanding, ConstructorStanding, ScheduledRace,
} from '../types/championship';

/**
 * Jolpica-F1 — the community-maintained successor to the Ergast API.
 * Serves championship standings, the season calendar, and race results.
 *
 * In dev we go through the Vite proxy (/jolpica → api.jolpi.ca) to sidestep
 * CORS; in production builds we hit the API directly (it sends CORS headers).
 */
const BASE = import.meta.env.DEV
  ? '/jolpica/ergast/f1'
  : 'https://api.jolpi.ca/ergast/f1';

const REFRESH_MS = 5 * 60 * 1000; // standings don't change mid-session — 5 min is plenty

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function jolpicaFetch(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Jolpica ${path} → ${res.status}`);
  const json = await res.json();
  return json?.MRData;
}

const EMPTY: ChampionshipData = {
  season: null,
  driverStandings: [],
  constructorStandings: [],
  schedule: [],
  lastRace: null,
  loading: true,
  error: null,
};

export function useJolpica(enabled = true): ChampionshipData {
  const [data, setData] = useState<ChampionshipData>(EMPTY);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function fetchAll() {
      try {
        const [driversRes, constructorsRes, scheduleRes, lastRes] = await Promise.allSettled([
          jolpicaFetch('/current/driverstandings/?format=json'),
          jolpicaFetch('/current/constructorstandings/?format=json'),
          jolpicaFetch('/current/races/?format=json&limit=30'),
          jolpicaFetch('/current/last/results/?format=json'),
        ]);
        if (cancelled) return;

        const drivers: DriverStanding[] =
          driversRes.status === 'fulfilled'
            ? driversRes.value?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? []
            : [];
        const constructors: ConstructorStanding[] =
          constructorsRes.status === 'fulfilled'
            ? constructorsRes.value?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
            : [];
        const schedule: ScheduledRace[] =
          scheduleRes.status === 'fulfilled'
            ? scheduleRes.value?.RaceTable?.Races ?? []
            : [];
        const lastRace: ScheduledRace | null =
          lastRes.status === 'fulfilled'
            ? lastRes.value?.RaceTable?.Races?.[0] ?? null
            : null;

        const season =
          (driversRes.status === 'fulfilled' && driversRes.value?.StandingsTable?.season) ||
          (scheduleRes.status === 'fulfilled' && scheduleRes.value?.RaceTable?.season) ||
          null;

        const gotAnything = drivers.length || constructors.length || schedule.length;
        setData({
          season,
          driverStandings: drivers,
          constructorStandings: constructors,
          schedule,
          lastRace,
          loading: false,
          error: gotAnything ? null : 'No championship data returned',
        });
        fetchedRef.current = true;
      } catch (e) {
        if (cancelled) return;
        setData((prev) => ({
          ...prev,
          loading: false,
          error: fetchedRef.current ? prev.error : (e instanceof Error ? e.message : 'Fetch failed'),
        }));
      }
    }

    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [enabled]);

  return data;
}
