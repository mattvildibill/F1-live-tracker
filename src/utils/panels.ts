export type Tab = 'weekend' | 'command' | 'tower' | 'map' | 'sectors' | 'telemetry' | 'ers' | 'tyres' | 'pits' | 'h2h' | 'gaps' | 'radio' | 'champ';
export type Mode = 'live' | 'replay' | 'demo';

const panels: [Tab, string][] = [
  ['weekend', 'Race weekend'], ['command', 'Command center'], ['tower', 'Timing tower'],
  ['map', 'Track map'], ['champ', 'Championship'], ['sectors', 'Sectors'],
  ['telemetry', 'Telemetry'], ['ers', 'ERS estimate'], ['tyres', 'Tyre strategy'],
  ['pits', 'Pit lane'], ['h2h', 'Head to head'], ['gaps', 'Pace comparison'], ['radio', 'Race control'],
];
const unavailableInReplay = new Set<Tab>(['sectors', 'telemetry', 'ers', 'tyres', 'radio']);
export const primaryPanelIds = new Set<Tab>(['weekend', 'command', 'tower', 'map', 'champ']);

// Keep every supported panel reachable without presenting thirteen equal-weight tabs.
export function panelsForMode(mode: Mode): [Tab, string][] {
  return panels
    .filter(([id]) => mode !== 'replay' || !unavailableInReplay.has(id))
    .map(([id, label]) => [id, id === 'map' && mode === 'replay' ? 'Position history' : label]);
}
