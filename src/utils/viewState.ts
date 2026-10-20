import { panelsForMode, type Mode, type Tab } from './panels.ts';

export type ViewState = { mode: Mode; panel: Tab; time: number; year: number; round: string; session: number | null };
export function parseViewState(search: string, maxDemoTime: number, currentYear = new Date().getFullYear()): ViewState {
  const params = new URLSearchParams(search);
  const mode: Mode = params.get('mode') === 'demo' ? 'demo' : params.get('mode') === 'replay' ? 'replay' : 'live';
  const panel = panelsForMode(mode).find(([id]) => id === params.get('panel'))?.[0] ?? (mode === 'live' ? 'weekend' : 'tower');
  const rawTime = params.get('time');
  const time = rawTime !== null && rawTime.trim() !== '' && Number.isFinite(Number(rawTime)) ? Math.max(0, Math.min(maxDemoTime, Number(rawTime))) : Math.min(120, maxDemoTime);
  const rawYear = Number(params.get('year'));
  const year = Number.isInteger(rawYear) && rawYear >= 1996 && rawYear <= currentYear ? rawYear : currentYear;
  const rawRound = params.get('round') ?? '';
  const round = /^[1-9]\d?$/.test(rawRound) && Number(rawRound) <= 50 ? rawRound : '';
  const rawSession = params.get('session') ?? '';
  const session = mode === 'live' && /^[1-9]\d*$/.test(rawSession) && Number.isSafeInteger(Number(rawSession)) ? Number(rawSession) : null;
  return { mode, panel, time, year, round, session };
}
export function viewURL(base: string, view: ViewState) {
  const url = new URL(base);
  for (const name of ['mode', 'panel', 'time', 'year', 'round', 'session']) url.searchParams.delete(name);
  url.searchParams.set('mode', view.mode);
  url.searchParams.set('panel', view.panel);
  if (view.mode === 'live' && view.session) url.searchParams.set('session', String(view.session));
  if (view.mode === 'demo') url.searchParams.set('time', String(Math.round(view.time)));
  if (view.mode === 'replay') {
    url.searchParams.set('year', String(view.year));
    if (view.round) url.searchParams.set('round', view.round);
  }
  return url;
}
