export interface Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  headshot_url?: string;
  country_code?: string;
}

export interface Position {
  driver_number: number;
  date: string;
  position: number;
  session_key: number;
  meeting_key: number;
}

export interface Interval {
  driver_number: number;
  date: string;
  gap_to_leader: number | null;
  interval: number | null;
  session_key: number;
  meeting_key: number;
}

export interface Lap {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  is_pit_out_lap: boolean;
  date_start: string;
  session_key: number;
  meeting_key: number;
  segments_sector_1?: number[];
  segments_sector_2?: number[];
  segments_sector_3?: number[];
}

export interface CarData {
  driver_number: number;
  date: string;
  throttle: number;
  brake: number;
  speed: number;
  rpm: number;
  n_gear: number;
  drs: number;
  session_key: number;
  meeting_key: number;
}

export interface Pit {
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;
  date: string;
  session_key: number;
  meeting_key: number;
}

export interface RaceControl {
  date: string;
  lap_number: number | null;
  category: string;
  flag: string | null;
  message: string;
  scope: string | null;
  sector: number | null;
  driver_number: number | null;
  session_key: number;
  meeting_key: number;
}

export interface Weather {
  date: string;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  wind_speed: number;
  wind_direction: number;
  rainfall: number;
  session_key: number;
  meeting_key: number;
}

export interface Session {
  session_key: number;
  session_name: string;
  session_type: string;
  status: string;
  date_start: string;
  date_end: string;
  gmt_offset: string;
  location: string;
  country_name: string;
  circuit_short_name: string;
  year: number;
  meeting_key: number;
}

export interface Location {
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
  session_key: number;
  meeting_key: number;
}

export interface StintInfo {
  compound: 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET' | string;
  startLap: number;
  endLap: number;
  tyreAge: number;
}

export interface DriverStints {
  [driverNumber: number]: StintInfo[];
}

export interface ERSState {
  charge: number; // 0–100
  mode: 'Harvest' | 'Boost' | 'Depleting' | 'Balanced';
  estimatedMJ: number;
}

export interface F1State {
  session: Session | null;
  drivers: Driver[];
  positions: Position[];
  intervals: Interval[];
  laps: Lap[];
  carData: CarData[];
  pits: Pit[];
  raceControl: RaceControl[];
  weather: Weather | null;
  locations: Location[];
  stints: DriverStints;
  ersStates: { [driverNumber: number]: ERSState };
  isLive: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  currentLap: number;
  totalLaps: number;
}
