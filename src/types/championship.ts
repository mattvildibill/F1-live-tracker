// Types for the Jolpica-F1 API (community successor to Ergast)
// https://api.jolpi.ca/ergast/f1/...

export interface DriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    permanentNumber?: string;
    code?: string;
    givenName: string;
    familyName: string;
    nationality: string;
  };
  Constructors: { constructorId: string; name: string; nationality: string }[];
}

export interface ConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: { constructorId: string; name: string; nationality: string };
}

export interface ScheduledRace {
  season: string;
  round: string;
  raceName: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM:SSZ
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { locality: string; country: string; lat: string; long: string };
  };
  // Present on completed rounds when fetched with results
  Results?: {
    position: string;
    Driver: { code?: string; givenName: string; familyName: string };
    Constructor: { name: string };
    status: string;
  }[];
}

export interface ChampionshipData {
  season: string | null;
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  schedule: ScheduledRace[];
  lastRace: ScheduledRace | null; // most recent completed round, with podium results
  loading: boolean;
  error: string | null;
}
