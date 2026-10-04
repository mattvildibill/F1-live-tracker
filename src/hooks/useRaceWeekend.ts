import { useEffect, useState } from 'react';
import { jolpica, json, selectWeekend, type MRData, type Race, type Result } from '../utils/data';
export type Forecast = { current?: { time: string; temperature_2m: number; relative_humidity_2m: number; precipitation: number; wind_speed_10m: number }; hourly?: { time: string[]; precipitation_probability: number[] } };
export function useRaceWeekend() {
  const [data, setData] = useState<{ race: Race | null; qualifying: Result[]; standings: MRData['StandingsTable']; weather: Forecast | null; updated: Date | null; error: string | null; warnings: string[]; loading: boolean }>({ race: null, qualifying: [], standings: undefined, weather: null, updated: null, error: null, warnings: [], loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const schedule = await jolpica(`${new Date().getFullYear()}/races/?limit=100`, controller.signal);
        const race = selectWeekend(schedule.RaceTable?.Races ?? [], Date.now());
        if (!race) throw new Error('No race calendar is available for this season.');
        const [quali, standings, weather] = await Promise.allSettled([
          jolpica(`${race.season}/${race.round}/qualifying/?limit=100`, controller.signal),
          jolpica(`${race.season}/driverstandings/?limit=100`, controller.signal),
          json<Forecast>(`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(race.Circuit.Location.lat)}&longitude=${encodeURIComponent(race.Circuit.Location.long)}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&hourly=precipitation_probability&forecast_days=7&timezone=UTC`, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setData({ race, qualifying: quali.status === 'fulfilled' ? quali.value.RaceTable?.Races[0]?.QualifyingResults ?? [] : [], standings: standings.status === 'fulfilled' ? standings.value.StandingsTable : undefined, weather: weather.status === 'fulfilled' ? weather.value : null, updated: new Date(), error: null, loading: false, warnings: [quali.status === 'rejected' ? 'Qualifying feed unavailable.' : '', standings.status === 'rejected' ? 'Championship feed unavailable.' : '', weather.status === 'rejected' ? 'Weather feed unavailable.' : ''].filter(Boolean) });
      } catch (error) { if (!controller.signal.aborted) setData(prev => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Weekend data unavailable' })); }
      if (!controller.signal.aborted) timer = setTimeout(load, 300000);
    }
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [revision]);
  return { ...data, refresh: () => setRevision(n => n + 1) };
}
