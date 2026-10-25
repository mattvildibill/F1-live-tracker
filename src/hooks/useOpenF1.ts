import { useState, useEffect, useRef } from 'react';
import type { F1State, Session } from '../types/f1';
import { EMPTY_STATE, openF1, sessionPhase, type Race } from '../utils/data';
import { loadTimingSnapshot } from '../utils/timingSnapshot';
import type { Tab } from '../utils/panels';
import { loadESPN } from '../utils/espn';
export function useOpenF1(enabled = true, sessionKeyOverride: number | null = null, race?: Race | null, revision = 0, panel: Tab = 'tower') {
  const raceDate = race?.date;
  const scope = JSON.stringify([sessionKeyOverride, raceDate]);
  const [result, setResult] = useState<{ scope: string; value: F1State } | null>(null);
  const cache = useRef<{ scope: string; value: F1State; discoveryAt: number } | null>(null);
  const fallbackUntil = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>; let failures = 0;
    let current: F1State = cache.current?.scope === scope ? cache.current.value : { ...EMPTY_STATE, source: 'openf1' };
    let discoveryAt = cache.current?.scope === scope ? cache.current.discoveryAt : 0;
    const publish = (value: F1State) => {
      if (controller.signal.aborted) return;
      current = value;
      cache.current = { scope, value, discoveryAt };
      setResult({ scope, value });
    };
    publish({ ...current, loadingFeeds: [] });
    async function poll() {
      if (document.hidden) { timer = setTimeout(poll, 15000); return; }
      try {
        if (!sessionKeyOverride && race && Date.now() < fallbackUntil.current) {
          publish(await loadESPN(race, controller.signal));
          failures = 0;
          timer = setTimeout(poll, 20000);
          return;
        }
        if (current.source === 'espn') current = { ...EMPTY_STATE, source: 'openf1' };
        if (!current.session || (!sessionKeyOverride && Date.now() - discoveryAt > 60000)) {
          const sessions = await openF1<Session>(sessionKeyOverride ? `/sessions?session_key=${sessionKeyOverride}` : `/sessions?year=${new Date().getFullYear()}`, controller.signal);
          const eligible = sessionKeyOverride ? sessions : sessions.filter(s => !raceDate || (Date.parse(s.date_start) >= Date.parse(raceDate) - 4 * 86400000 && Date.parse(s.date_start) <= Date.parse(raceDate) + 86400000));
          const ordered = [...eligible].sort((a,b) => Date.parse(a.date_start) - Date.parse(b.date_start));
          const now = Date.now();
          const session = ordered.find(s => Date.parse(s.date_start) <= now && Date.parse(s.date_end) >= now) ?? ordered.find(s => Date.parse(s.date_start) > now) ?? ordered.at(-1);
          if (!session) throw new Error('No session published for this race weekend yet.');
          if (session.session_key !== current.session?.session_key) current = { ...EMPTY_STATE, session, source: 'openf1' };
          discoveryAt = now;
          // Keep discovery across panel switches; changing the view should not
          // repeat a successful session lookup while core timing is loading.
          publish(current);
        }
        const session = current.session!;
        const phase = sessionPhase(session.date_start, session.date_end, Date.now());
        if (phase === 'Upcoming') { current = { ...current, statusText: 'Pre-race', isLive: false, lastUpdated: new Date(), error: undefined, isStale: false }; }
        else {
          current = await loadTimingSnapshot(current, session, phase, panel, openF1, controller.signal, publish);
        }
        failures = 0;
      } catch (error) {
        if (controller.signal.aborted) return;
        const providerError = error instanceof Error ? error.message : 'Timing unavailable';
        try {
          if (sessionKeyOverride || !race) throw error;
          current = await loadESPN(race, controller.signal);
          fallbackUntil.current = Date.now() + 300000;
          failures = 0;
        } catch (fallbackError) {
          if (controller.signal.aborted) return;
          failures++;
          const retained = cache.current?.scope === scope ? cache.current.value : current;
          current = { ...retained, isLive: false, isStale: true, statusText: 'Timing unavailable', error: `${providerError}${!sessionKeyOverride && race ? ` ${fallbackError instanceof Error ? fallbackError.message : 'Backup leaderboard unavailable.'}` : ''}` };
        }
      }
      if (controller.signal.aborted) return;
      publish({ ...current, loadingFeeds: [] });
      timer = setTimeout(poll, failures ? Math.min(300000, 30000 * 2 ** (failures - 1)) : current.source === 'espn' ? 20000 : current.isLive ? 15000 : 60000);
    }
    poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [enabled, sessionKeyOverride, raceDate, race, revision, panel, scope]);
  return result?.scope === scope ? result.value : EMPTY_STATE;
}
