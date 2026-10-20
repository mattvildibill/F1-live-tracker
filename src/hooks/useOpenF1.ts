import { useState, useEffect, useRef } from 'react';
import type { F1State, Session } from '../types/f1';
import { EMPTY_STATE, openF1, sessionPhase, type Race } from '../utils/data';
import { loadTimingSnapshot } from '../utils/timingSnapshot';
import type { Tab } from '../utils/panels';
export function useOpenF1(enabled = true, sessionKeyOverride: number | null = null, race?: Race | null, revision = 0, panel: Tab = 'tower') {
  const raceDate = race?.date;
  const scope = JSON.stringify([sessionKeyOverride, raceDate]);
  const [result, setResult] = useState<{ scope: string; value: F1State } | null>(null);
  const cache = useRef<{ scope: string; value: F1State; discoveryAt: number } | null>(null);
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
        failures++;
        current = { ...current, isLive: false, isStale: true, statusText: 'Timing unavailable', error: error instanceof Error ? error.message : 'Timing unavailable' };
      }
      if (controller.signal.aborted) return;
      publish({ ...current, loadingFeeds: [] });
      timer = setTimeout(poll, failures ? Math.min(300000, 30000 * 2 ** (failures - 1)) : current.isLive ? 15000 : 60000);
    }
    poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [enabled, sessionKeyOverride, raceDate, revision, panel, scope]);
  return result?.scope === scope ? result.value : EMPTY_STATE;
}
