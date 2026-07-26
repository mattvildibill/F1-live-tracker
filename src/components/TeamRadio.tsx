import { useMemo, useState } from 'react';
import type { F1State, RaceControl, TeamRadioMsg } from '../types/f1';
import { getTeamColor } from '../utils/teamColors';
import EmptyState from './EmptyState';

interface Props {
  state: F1State;
}

type Filter = 'all' | 'flags' | 'sc' | 'drs' | 'penalties' | 'radio';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'flags', label: '🚩 Flags' },
  { id: 'sc', label: '🚗 SC / VSC' },
  { id: 'drs', label: 'DRS' },
  { id: 'penalties', label: '⚖ Penalties' },
  { id: 'radio', label: '📻 Team Radio' },
];

function flagStyle(rc: RaceControl): { bg: string; text: string; label: string } {
  const msg = rc.message.toLowerCase();
  const flag = (rc.flag ?? '').toLowerCase();

  if (msg.includes('[team radio]')) return { bg: 'bg-indigo-950/40 border-indigo-800/40', text: 'text-indigo-300', label: '📻 TEAM RADIO' };
  if (flag === 'red' || msg.includes('red flag')) return { bg: 'bg-red-900/60 border-red-700/50', text: 'text-red-300', label: '🚩 RED FLAG' };
  if (flag === 'double yellow' || msg.includes('double yellow')) return { bg: 'bg-yellow-900/60 border-yellow-600/50', text: 'text-yellow-200', label: '🟡🟡 DOUBLE YELLOW' };
  if (flag === 'yellow' || msg.includes('yellow')) return { bg: 'bg-yellow-900/40 border-yellow-700/40', text: 'text-yellow-300', label: '🟡 YELLOW' };
  if (msg.includes('safety car deployed')) return { bg: 'bg-orange-900/40 border-orange-700/40', text: 'text-orange-300', label: '🚗 SAFETY CAR' };
  if (msg.includes('virtual safety car')) return { bg: 'bg-orange-900/30 border-orange-800/40', text: 'text-orange-400', label: '🚗 VSC' };
  if (msg.includes('drs enabled')) return { bg: 'bg-green-900/40 border-green-700/40', text: 'text-green-300', label: '✅ DRS ENABLED' };
  if (msg.includes('drs disabled')) return { bg: 'bg-gray-800/60 border-gray-700/40', text: 'text-gray-400', label: '❌ DRS DISABLED' };
  if (msg.includes('penalty')) return { bg: 'bg-purple-950/40 border-purple-800/40', text: 'text-purple-300', label: '⚖ PENALTY' };
  if (flag === 'green' || msg.includes('green flag') || msg.includes('track clear')) return { bg: 'bg-green-900/30 border-green-800/40', text: 'text-green-400', label: '🟢 GREEN' };
  if (msg.includes('pit lane') || msg.includes('pit exit')) return { bg: 'bg-blue-900/30 border-blue-800/40', text: 'text-blue-400', label: '🔵 PIT' };
  return { bg: 'bg-gray-800/40 border-gray-700/30', text: 'text-gray-400', label: '📻 INFO' };
}

function matchesFilter(rc: RaceControl, filter: Filter): boolean {
  if (filter === 'all') return true;
  const msg = rc.message.toLowerCase();
  const flag = (rc.flag ?? '').toLowerCase();
  switch (filter) {
    case 'flags': return !!flag || msg.includes('flag') || msg.includes('track clear');
    case 'sc': return msg.includes('safety car');
    case 'drs': return msg.includes('drs');
    case 'penalties': return msg.includes('penalty') || msg.includes('investigation') || msg.includes('deleted');
    case 'radio': return msg.includes('[team radio]');
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return dateStr;
  }
}

type FeedItem =
  | { kind: 'rc'; date: string; rc: RaceControl }
  | { kind: 'audio'; date: string; radio: TeamRadioMsg };

export default function TeamRadio({ state }: Props) {
  const { raceControl, teamRadio, drivers } = state;
  const [filter, setFilter] = useState<Filter>('all');
  const driverMap = useMemo(() => new Map(drivers.map((d) => [d.driver_number, d])), [drivers]);

  const items: FeedItem[] = useMemo(() => {
    const rcItems: FeedItem[] = raceControl
      .filter((rc) => matchesFilter(rc, filter))
      .map((rc) => ({ kind: 'rc', date: rc.date, rc }));
    const audioItems: FeedItem[] =
      filter === 'all' || filter === 'radio'
        ? teamRadio.map((r) => ({ kind: 'audio' as const, date: r.date, radio: r }))
        : [];
    return [...rcItems, ...audioItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [raceControl, teamRadio, filter]);

  return (
    <div className="p-4">
      {/* Filter bar */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-2.5 py-1 rounded text-xs font-semibold border ${
              filter === f.id
                ? 'bg-gray-800 border-gray-600 text-white'
                : 'bg-transparent border-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-600 self-center">{items.length} messages</span>
      </div>

      {!items.length ? (
        <EmptyState icon="📻" title="No messages match this filter yet" subtitle="Flag, safety car, and team radio events will appear here during the session." />
      ) : (
        <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
          {items.map((item, i) => {
            if (item.kind === 'audio') {
              const d = driverMap.get(item.radio.driver_number);
              const color = d ? getTeamColor(d.team_name, d.team_colour) : '#6b7280';
              return (
                <div key={`a${i}`} className="rounded-lg border px-4 py-3 bg-indigo-950/30 border-indigo-800/40">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">🎙 RADIO</span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-200">
                      <span className="w-1 h-4 rounded-sm" style={{ backgroundColor: color }} />
                      {d ? `${d.name_acronym} — ${d.team_name}` : `Car #${item.radio.driver_number}`}
                    </span>
                    <audio controls preload="none" src={item.radio.recording_url} className="h-8 max-w-[240px] flex-1" />
                    <span className="text-xs text-gray-500 whitespace-nowrap font-mono ml-auto">{formatTime(item.date)}</span>
                  </div>
                </div>
              );
            }
            const { rc } = item;
            const { bg, text, label } = flagStyle(rc);
            return (
              <div key={`r${i}`} className={`rounded-lg border px-4 py-3 ${bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${text} mr-2`}>{label}</span>
                    {rc.lap_number && (
                      <span className="text-xs text-gray-500">Lap {rc.lap_number}</span>
                    )}
                    <p className="text-sm text-gray-200 mt-1">{rc.message}</p>
                    {rc.scope && rc.scope !== 'Track' && rc.scope !== 'Driver' && (
                      <span className="text-xs text-gray-500">Scope: {rc.scope}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap font-mono">{formatTime(rc.date)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
