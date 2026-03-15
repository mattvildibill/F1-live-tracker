// 2025/2026 F1 team colors (fallback to OpenF1 team_colour when available)
const TEAM_COLORS: Record<string, string> = {
  'Red Bull Racing': '#3671C6',
  'Ferrari': '#E8002D',
  'Mercedes': '#27F4D2',
  'McLaren': '#FF8000',
  'Aston Martin': '#229971',
  'Alpine': '#FF87BC',
  'Williams': '#64C4FF',
  'Racing Bulls': '#6692FF',
  'Kick Sauber': '#52E252',
  'Haas F1 Team': '#B6BABD',
  // Aliases
  'Red Bull': '#3671C6',
  'Haas': '#B6BABD',
  'Alfa Romeo': '#C92D4B',
  'AlphaTauri': '#5E8FAA',
  'Sauber': '#52E252',
};

export function getTeamColor(teamName: string, fallback?: string): string {
  if (fallback && fallback !== '000000' && fallback !== 'FFFFFF') {
    return `#${fallback.replace('#', '')}`;
  }
  for (const [key, color] of Object.entries(TEAM_COLORS)) {
    if (teamName?.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return fallback ? `#${fallback}` : '#6b7280';
}

export default TEAM_COLORS;
