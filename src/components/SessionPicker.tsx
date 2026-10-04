import { useEffect, useState } from 'react';
import { openF1 } from '../utils/data';
import type { Session, Meeting } from '../types/f1';
export default function SessionPicker({ currentSessionKey, onSelect }: { currentSessionKey:number|null; onSelect:(key:number|null)=>void }) {
  const [open,setOpen]=useState(false), [year,setYear]=useState(new Date().getFullYear()), [meeting,setMeeting]=useState<number|null>(null), [meetings,setMeetings]=useState<Meeting[]>([]), [sessions,setSessions]=useState<Session[]>([]), [loading,setLoading]=useState(false), [error,setError]=useState<string|null>(null), [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!open)return;
    const c=new AbortController(); setLoading(true);setError(null);setMeetings([]);setSessions([]);
    const task=meeting?openF1<Session>(`/sessions?meeting_key=${meeting}`,c.signal).then(rows=>{if(!c.signal.aborted)setSessions(rows.sort((a,b)=>Date.parse(a.date_start)-Date.parse(b.date_start)));}):openF1<Meeting>(`/meetings?year=${year}`,c.signal).then(rows=>{if(!c.signal.aborted)setMeetings(rows.sort((a,b)=>Date.parse(b.date_start)-Date.parse(a.date_start)));});
    task.catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});
    return()=>c.abort();
  },[open,year,meeting,retry]);
  return <div style={{position:'relative'}}><button aria-expanded={open} onClick={()=>setOpen(!open)}>Browse sessions {open?'▴':'▾'}</button>{open&&<div className="session-picker" onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}><div className="flex justify-between gap-2"><label>Season <select aria-label="Session season" value={year} onChange={e=>{setYear(Number(e.target.value));setMeeting(null);}}>{Array.from({length:new Date().getFullYear()-2022},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y}>{y}</option>)}</select></label><button aria-label="Close session browser" onClick={()=>setOpen(false)}>×</button></div>{currentSessionKey!=null&&<button onClick={()=>{onSelect(null);setOpen(false);}}>Return to current weekend</button>}{meeting&&<button onClick={()=>setMeeting(null)}>← All events</button>}{loading&&<p>Loading sessions…</p>}{error&&<><p role="status">{error}</p><button onClick={()=>setRetry(n=>n+1)}>Retry</button></>}{!loading&&!error&&!meetings.length&&!sessions.length&&<p>No sessions published yet.</p>}{meetings.map(m=><button key={m.meeting_key} onClick={()=>setMeeting(m.meeting_key)}>{m.meeting_name} · {m.location}</button>)}{sessions.map(s=><button key={s.session_key} onClick={()=>{onSelect(s.session_key);setOpen(false);}}>{s.session_name} · {new Date(s.date_start).toLocaleString()}</button>)}</div>}</div>;
}
