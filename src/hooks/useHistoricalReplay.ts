import { useEffect, useMemo, useState } from 'react';
import { jolpica, raceTime, type Race, type RecordedLap } from '../utils/data';
import { replayState, type ReplayData } from '../utils/replay';
export function useHistoricalReplay(enabled: boolean) {
  const [year, setYear] = useState(new Date().getFullYear()); const [races, setRaces] = useState<Race[]>([]); const [round, setRound] = useState('');
  const [data, setData] = useState<ReplayData | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [progress, setProgress] = useState(0); const [playing, setPlaying] = useState(false); const [speed, setSpeed] = useState(1); const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const c = new AbortController(); setLoading(true); setError(null); setRaces([]); setRound(''); setData(null); setPlaying(false);
    jolpica(`${year}/races/?limit=100`, c.signal).then(d => {
      if (c.signal.aborted) return;
      const past = (d.RaceTable?.Races ?? []).filter(r => raceTime(r) + 6 * 3600000 < Date.now()).sort((a,b) => Number(b.round) - Number(a.round));
      setRaces(past); setRound(past[0]?.round ?? '');
      if (!past.length) { setError('No completed races are available in this season yet. Choose another year.'); setLoading(false); }
    }).catch(e => { if (!c.signal.aborted) { setError(e.message); setLoading(false); } });
    return () => c.abort();
  }, [enabled, year, revision]);
  useEffect(() => {
    if (!enabled || !round) return;
    const c = new AbortController(); setLoading(true); setData(null); setError(null); setProgress(0); setPlaying(false);
    async function load() {
      try {
        const result = await jolpica(`${year}/${round}/results/?limit=100`, c.signal);
        const race = result.RaceTable?.Races[0];
        if (!race?.Results?.length) throw new Error('Results for this race have not been published yet. Choose an earlier race.');
        const laps: RecordedLap[] = []; let offset = 0; let total = Infinity;
        while (offset < total) {
          const page = await jolpica(`${year}/${round}/laps/?limit=100&offset=${offset}`, c.signal);
          const rows = page.RaceTable?.Races[0]?.Laps ?? [];
          total = Number(page.total); const count = rows.reduce((n,l) => n + l.Timings.length, 0);
          if (!count && offset < total) throw new Error('Lap data was incomplete. Retry to load a complete replay.');
          for (const row of rows) { const existing = laps.find(l => l.number === row.number); if (existing) existing.Timings.push(...row.Timings); else laps.push({ ...row, Timings: [...row.Timings] }); }
          offset += count; if (!count) break;
        }
        if (!laps.length) throw new Error('Recorded lap timing is unavailable for this race. Try another race or the offline demo.');
        let pits: NonNullable<Race['PitStops']> = [];
        try { const p = await jolpica(`${year}/${round}/pitstops/?limit=100`, c.signal); pits = p.RaceTable?.Races[0]?.PitStops ?? []; } catch { /* optional */ }
        if (c.signal.aborted) return;
        setData({ race, results: race.Results!, laps: laps.sort((a,b) => Number(a.number) - Number(b.number)), pits }); setLoading(false);
      } catch(e) { if (!c.signal.aborted) { setError(e instanceof Error ? e.message : 'Replay failed'); setLoading(false); } }
    }
    load(); return () => c.abort();
  }, [enabled, year, round, revision]);
  const totalLaps = data ? Math.max(...data.laps.map(l => Number(l.number))) : 0;
  useEffect(() => {
    if (!enabled || !playing || !data) return;
    let previous = performance.now();
    const timer = setInterval(() => { const now = performance.now(); const delta = Math.min(0.25, (now - previous) / 1000); previous = now; if (document.hidden) return; setProgress(p => Math.min(totalLaps, p + delta * speed / 2)); }, 100);
    return () => clearInterval(timer);
  }, [enabled, playing, speed, totalLaps, data]);
  useEffect(() => { if (totalLaps && progress >= totalLaps) setPlaying(false); }, [progress, totalLaps]);
  const currentLap = Math.floor(progress);
  const state = useMemo(() => data ? replayState(data, currentLap) : null, [data, currentLap]);
  return { year, setYear, races, round, setRound, state, loading, error, progress, setProgress, speed, setSpeed, playing, totalLaps, toggle: () => { if (progress >= totalLaps) setProgress(0); setPlaying(p => !p); }, reset: () => { setPlaying(false); setProgress(0); }, retry: () => setRevision(n => n + 1) };
}
