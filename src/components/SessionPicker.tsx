import { useEffect, useState } from 'react';
import { openF1 } from '../utils/data';
import { valueForRequest, type ScopedResult } from '../utils/scopedRequest';
import type { Session, Meeting } from '../types/f1';

type SessionResults = { meetings: Meeting[]; sessions: Session[]; error: string | null };

export default function SessionPicker({ currentSessionKey, onSelect }: { currentSessionKey: number | null; onSelect: (key: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [meeting, setMeeting] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<ScopedResult<SessionResults> | null>(null);
  const requestKey = JSON.stringify([year, meeting, retry]);
  const data = valueForRequest(requestKey, result);
  const meetings = data?.meetings ?? [];
  const sessions = data?.sessions ?? [];
  const error = data?.error;
  const loading = open && !data;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const task: Promise<SessionResults> = meeting != null
      ? openF1<Session>(`/sessions?meeting_key=${meeting}`, controller.signal).then(rows => ({ meetings: [], sessions: [...rows].sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start)), error: null }))
      : openF1<Meeting>(`/meetings?year=${year}`, controller.signal).then(rows => ({ meetings: [...rows].sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start)), sessions: [], error: null }));
    task.then(value => {
      if (!controller.signal.aborted) setResult({ key: requestKey, value });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key: requestKey, value: { meetings: [], sessions: [], error: error instanceof Error ? error.message : 'Sessions unavailable. Try again.' } });
    });
    return () => controller.abort();
  }, [open, year, meeting, requestKey]);

  return <div style={{ position: 'relative' }}>
    <button aria-expanded={open} onClick={() => { if (!open) setRetry(n => n + 1); setOpen(!open); }}>Browse sessions {open ? '▴' : '▾'}</button>
    {open && <div className="session-picker" onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
      <div className="flex justify-between gap-2"><label>Season <select aria-label="Session season" value={year} onChange={e => { setYear(Number(e.target.value)); setMeeting(null); }}>{Array.from({ length: new Date().getFullYear() - 2022 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y}>{y}</option>)}</select></label><button aria-label="Close session browser" onClick={() => setOpen(false)}>×</button></div>
      {currentSessionKey != null && <button onClick={() => { onSelect(null); setOpen(false); }}>Return to current weekend</button>}
      {meeting != null && <button onClick={() => setMeeting(null)}>← All events</button>}
      {loading && <p>Loading sessions…</p>}
      {error && <><p role="status">{error}</p><button onClick={() => setRetry(n => n + 1)}>Retry</button></>}
      {!loading && !error && !meetings.length && !sessions.length && <p>No sessions published yet.</p>}
      {meetings.map(m => <button key={m.meeting_key} onClick={() => setMeeting(m.meeting_key)}>{m.meeting_name} · {m.location}</button>)}
      {sessions.map(s => <button key={s.session_key} onClick={() => { onSelect(s.session_key); setOpen(false); }}>{s.session_name} · {new Date(s.date_start).toLocaleString()}</button>)}
    </div>}
  </div>;
}
