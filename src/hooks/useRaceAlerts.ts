import { useEffect, useRef, useState, useCallback } from 'react';
import type { F1State } from '../types/f1';

export interface RaceAlert {
  id: number;
  type: 'safety-car' | 'red-flag' | 'vsc' | 'lead-change' | 'retirement' | 'drs';
  message: string;
  color: string;
}

let nextId = 0;

export function useRaceAlerts(state: F1State, enabled: boolean): {
  alerts: RaceAlert[];
  dismiss: (id: number) => void;
} {
  const [alerts, setAlerts] = useState<RaceAlert[]>([]);
  const prevLeaderRef = useRef<number | null>(null);
  const prevRCCountRef = useRef(0);
  const prevDriverCountRef = useRef(0);
  const prevPositionsRef = useRef<Map<number, number>>(new Map());

  const push = useCallback((alert: Omit<RaceAlert, 'id'>) => {
    const id = nextId++;
    setAlerts((prev) => [...prev.slice(-4), { ...alert, id }]); // keep max 5
    setTimeout(() => setAlerts((prev) => prev.filter((a) => a.id !== id)), 7000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    if (!enabled || !state.lastUpdated) return;

    // ── Lead change detection ──────────────────────────────────────────────
    const leader = state.positions.find((p) => p.position === 1);
    if (leader && prevLeaderRef.current !== null && prevLeaderRef.current !== leader.driver_number) {
      const driver = state.drivers.find((d) => d.driver_number === leader.driver_number);
      push({ type: 'lead-change', message: `${driver?.name_acronym ?? '?'} takes the lead!`, color: '#fbbf24' });
    }
    prevLeaderRef.current = leader?.driver_number ?? null;

    // ── Race control events ────────────────────────────────────────────────
    if (state.raceControl.length > prevRCCountRef.current) {
      const newMessages = state.raceControl.slice(prevRCCountRef.current);
      for (const rc of newMessages) {
        const msg = rc.message.toLowerCase();
        if (msg.includes('safety car deployed')) {
          push({ type: 'safety-car', message: `Safety Car deployed — Lap ${rc.lap_number ?? '?'}`, color: '#f59e0b' });
        } else if (msg.includes('virtual safety car')) {
          push({ type: 'vsc', message: `Virtual Safety Car — Lap ${rc.lap_number ?? '?'}`, color: '#f59e0b' });
        } else if (msg.includes('red flag')) {
          push({ type: 'red-flag', message: `Red Flag — Lap ${rc.lap_number ?? '?'}`, color: '#ef4444' });
        } else if (msg.includes('drs enabled')) {
          push({ type: 'drs', message: 'DRS Enabled', color: '#22c55e' });
        }
      }
    }
    prevRCCountRef.current = state.raceControl.length;

    // ── Retirement detection (driver disappears from positions) ────────────
    const currentDriverCount = state.positions.length;
    if (prevDriverCountRef.current > 0 && currentDriverCount < prevDriverCountRef.current) {
      const currentNums = new Set(state.positions.map((p) => p.driver_number));
      for (const [dn] of prevPositionsRef.current) {
        if (!currentNums.has(dn)) {
          const driver = state.drivers.find((d) => d.driver_number === dn);
          push({ type: 'retirement', message: `${driver?.name_acronym ?? `#${dn}`} has retired`, color: '#6b7280' });
        }
      }
    }
    prevDriverCountRef.current = currentDriverCount;
    prevPositionsRef.current = new Map(state.positions.map((p) => [p.driver_number, p.position]));
  }, [state.lastUpdated, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { alerts, dismiss };
}
