import { useState, useEffect, useMemo } from 'react';
import type { Meeting, Session } from '../types/f1';

import { OPENF1_BASE as BASE } from '../utils/api';


interface Props {
  currentSessionKey: number | null;
  onSelect: (sessionKey: number | null) => void; // null = back to latest
}

/**
 * Browse any OpenF1 meeting/session back to 2023 and load it into the cockpit.
 * Fetches lazily: years → meetings on open, sessions when a meeting is picked.
 */
export default function SessionPicker({ currentSessionKey, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingKey, setMeetingKey] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    const list = [];
    for (let i = y; i >= 2023; i--) list.push(i);
    return list;
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setMeetings([]); setMeetingKey(null); setSessions([]);
    fetch(`${BASE}/meetings?year=${year}`)
      .then((r) => r.json())
      .then((rows: Meeting[]) => {
        if (cancelled) return;
        setMeetings([...rows].sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime()));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, year]);

  useEffect(() => {
    if (meetingKey == null) { setSessions([]); return; }
    let cancelled = false;
    fetch(`${BASE}/sessions?meeting_key=${meetingKey}`)
      .then((r) => r.json())
      .then((rows: Session[]) => {
        if (!cancelled) setSessions([...rows].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [meetingKey]);

  const btnCls =
    'px-3 py-1 rounded text-xs font-semibold border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 cursor-pointer';

  return (
    <div className="relative inline-block">
      <button className={btnCls} onClick={() => setOpen((o) => !o)}>
        📅 {currentSessionKey ? 'Session loaded' : 'Browse sessions'} {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-80 max-h-96 overflow-y-auto rounded-lg border border-gray-700 bg-gray-950 shadow-xl p-3 space-y-3">
          <div className="flex items-center gap-2">
            <select
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 flex-1"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => <option key={y} value={y}>{y} season</option>)}
            </select>
            {currentSessionKey && (
              <button
                className="text-xs text-red-400 hover:text-red-300"
                onClick={() => { onSelect(null); setOpen(false); }}
              >
                ✕ Back to latest
              </button>
            )}
          </div>

          {loading && <p className="text-xs text-gray-500">Loading meetings…</p>}

          {!meetingKey && meetings.map((m) => (
            <button
              key={m.meeting_key}
              className="block w-full text-left px-2 py-1.5 rounded hover:bg-gray-900 text-sm text-gray-300"
              onClick={() => setMeetingKey(m.meeting_key)}
            >
              <span className="font-semibold">{m.meeting_name}</span>
              <span className="text-xs text-gray-600 ml-2">{m.location}</span>
            </button>
          ))}

          {meetingKey != null && (
            <>
              <button className="text-xs text-gray-500 hover:text-gray-300" onClick={() => setMeetingKey(null)}>
                ← All {year} events
              </button>
              {sessions.map((s) => (
                <button
                  key={s.session_key}
                  className={`block w-full text-left px-2 py-1.5 rounded text-sm ${
                    s.session_key === currentSessionKey
                      ? 'bg-red-950/40 text-red-300'
                      : 'hover:bg-gray-900 text-gray-300'
                  }`}
                  onClick={() => { onSelect(s.session_key); setOpen(false); }}
                >
                  <span className="font-semibold">{s.session_name}</span>
                  <span className="text-xs text-gray-600 ml-2">
                    {new Date(s.date_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              ))}
              {!sessions.length && <p className="text-xs text-gray-500">Loading sessions…</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
