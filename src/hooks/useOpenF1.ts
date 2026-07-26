import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  F1State, Session, Driver, Position, Interval, Lap,
  CarData, Pit, RaceControl, Weather, Location, OpenF1Stint,
  TeamRadioMsg,
} from '../types/f1';
import { useErsEstimator } from './useErsEstimator';
import { mockF1State } from '../mocks/australianGP2026';
import { deriveStints } from '../utils/stintUtils';

const BASE = '/openf1/v1';
const POLL_MS = 3000;
const API_FAIL_THRESHOLD = 2; // use mock after this many consecutive failures

async function apiFetch<T>(path: string): Promise<T[]> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`OpenF1 ${path} → ${res.status}`);
  return res.json();
}

function latestByDriver<T extends { driver_number: number }>(items: T[]): T[] {
  const map = new Map<number, T>();
  for (const item of items) map.set(item.driver_number, item);
  return Array.from(map.values());
}

const INITIAL_STATE: F1State = {
  session: null,
  drivers: [],
  positions: [],
  intervals: [],
  laps: [],
  carData: [],
  pits: [],
  raceControl: [],
  weather: null,
  locations: [],
  stints: {},
  teamRadio: [],
  ersStates: {},
  isLive: false,
  isStale: false,
  lastUpdated: null,
  currentLap: 0,
  totalLaps: 0,
};

export function useOpenF1(enabled = true, sessionKeyOverride: number | null = null) {
  const [state, setState] = useState<F1State>(INITIAL_STATE);
  const sessionKeyRef = useRef<number | string>('latest');
  const allLapsRef = useRef<Lap[]>([]);
  const allPitsRef = useRef<Pit[]>([]);
  const allRaceControlRef = useRef<RaceControl[]>([]);
  const allStintsRef = useRef<OpenF1Stint[]>([]);
  const failCountRef = useRef(0);
  const usingMockRef = useRef(false);
  const { update: updateErs } = useErsEstimator();

  const fetchAll = useCallback(async () => {
    // If already on mock, don't keep hammering the API
    if (usingMockRef.current) return;

    const sk = sessionKeyRef.current;
    const q = `session_key=${sk}`;

    try {
      const [positions, intervals, latestLaps, carDataArr, pits, raceControl, weatherArr, locations, drivers, stintsRes, teamRadioArr] =
        await Promise.allSettled([
          apiFetch<Position>(`/position?${q}`),
          apiFetch<Interval>(`/intervals?${q}`),
          apiFetch<Lap>(`/laps?${q}`),
          apiFetch<CarData>(`/car_data?${q}&speed>=0`),
          apiFetch<Pit>(`/pit?${q}`),
          apiFetch<RaceControl>(`/race_control?${q}`),
          apiFetch<Weather>(`/weather?${q}`),
          apiFetch<Location>(`/location?${q}`),
          apiFetch<Driver>(`/drivers?${q}`),
          apiFetch<OpenF1Stint>(`/stints?${q}`),
          apiFetch<TeamRadioMsg>(`/team_radio?${q}`),
        ]);

      const getVal = <T>(r: PromiseSettledResult<T[]>): T[] =>
        r.status === 'fulfilled' ? r.value : [];

      const posArr = getVal(positions);
      const intArr = getVal(intervals);
      const lapArr = getVal(latestLaps);
      const cdArr = getVal(carDataArr);
      const pitArr = getVal(pits);
      const rcArr = getVal(raceControl);
      const wArr = getVal(weatherArr);
      const locArr = getVal(locations);
      const drvArr = getVal(drivers);
      const stintsArr = getVal(stintsRes);
      const radioArr = getVal(teamRadioArr);

      // If every endpoint failed, count as a failure
      const totalData = posArr.length + intArr.length + lapArr.length + drvArr.length;
      if (totalData === 0) {
        failCountRef.current++;
        if (failCountRef.current >= API_FAIL_THRESHOLD) {
          usingMockRef.current = true;
          setState({ ...mockF1State, isStale: false, lastUpdated: new Date() });
        } else {
          setState((prev) => ({ ...prev, isStale: true }));
        }
        return;
      }

      // Successful fetch — reset fail count
      failCountRef.current = 0;

      for (const lap of lapArr) {
        const exists = allLapsRef.current.find(
          (l) => l.driver_number === lap.driver_number && l.lap_number === lap.lap_number
        );
        if (!exists) allLapsRef.current.push(lap);
      }

      for (const pit of pitArr) {
        const exists = allPitsRef.current.find(
          (p) => p.driver_number === pit.driver_number && p.lap_number === pit.lap_number
        );
        if (!exists) allPitsRef.current.push(pit);
      }

      for (const rc of rcArr) {
        const exists = allRaceControlRef.current.find((r) => r.date === rc.date && r.message === rc.message);
        if (!exists) allRaceControlRef.current.push(rc);
      }

      // Stints: replace by driver+stint_number (API returns full list each poll)
      for (const s of stintsArr) {
        const idx = allStintsRef.current.findIndex(
          (x) => x.driver_number === s.driver_number && x.stint_number === s.stint_number
        );
        if (idx === -1) allStintsRef.current.push(s);
        else allStintsRef.current[idx] = s; // update lap_end as stint progresses
      }

      const latestPos = latestByDriver(posArr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      const latestInt = latestByDriver(intArr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      const latestCar = latestByDriver(cdArr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      const latestLoc = latestByDriver(locArr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

      const weather = wArr.length ? wArr[wArr.length - 1] : null;
      const stints = deriveStints(allLapsRef.current, allPitsRef.current, allStintsRef.current);
      const ersStates = latestCar.length ? updateErs(latestCar) : {};
      const currentLap = allLapsRef.current.length
        ? Math.max(...allLapsRef.current.map((l) => l.lap_number))
        : 0;

      setState((prev) => ({
        ...prev,
        drivers: drvArr.length ? drvArr : prev.drivers,
        positions: latestPos.length ? latestPos : prev.positions,
        intervals: latestInt.length ? latestInt : prev.intervals,
        laps: allLapsRef.current,
        carData: latestCar.length ? latestCar : prev.carData,
        pits: allPitsRef.current,
        raceControl: allRaceControlRef.current,
        teamRadio: radioArr.length ? radioArr : prev.teamRadio,
        weather,
        locations: latestLoc.length ? latestLoc : prev.locations,
        stints,
        ersStates,
        isStale: false,
        lastUpdated: new Date(),
        currentLap,
      }));
    } catch {
      failCountRef.current++;
      if (failCountRef.current >= API_FAIL_THRESHOLD) {
        usingMockRef.current = true;
        setState({ ...mockF1State, isStale: false, lastUpdated: new Date() });
      } else {
        setState((prev) => ({ ...prev, isStale: true }));
      }
    }
  }, [updateErs]);

  useEffect(() => {
    if (!enabled) return;
    // Reset accumulators whenever the target session changes
    allLapsRef.current = [];
    allPitsRef.current = [];
    allRaceControlRef.current = [];
    allStintsRef.current = [];
    failCountRef.current = 0;
    usingMockRef.current = false;
    setState({ ...INITIAL_STATE });

    async function initSession() {
      try {
        const query = sessionKeyOverride != null
          ? `/sessions?session_key=${sessionKeyOverride}`
          : '/sessions?session_key=latest';
        const sessions = await apiFetch<Session>(query);
        if (sessions.length) {
          const s = sessions[0];
          const isLive = sessionKeyOverride == null && (s.status === 'started' || !s.date_end);
          sessionKeyRef.current = sessionKeyOverride ?? (isLive ? 'latest' : s.session_key);
          setState((prev) => ({ ...prev, session: s, isLive }));
        } else {
          throw new Error('no session');
        }
      } catch {
        // Session API unavailable — pre-saturate fail counter so mock loads on first failed poll
        failCountRef.current = API_FAIL_THRESHOLD - 1;
      }
      fetchAll();
    }
    initSession();
  }, [fetchAll, enabled, sessionKeyOverride]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(id);
  }, [fetchAll, enabled]);

  return state;
}
