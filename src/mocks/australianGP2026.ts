/**
 * 2026 Australian Grand Prix — Albert Park, Melbourne
 * Round 1 of the 2026 FIA Formula One World Championship
 * Race: 57 laps · Winner: George Russell (Mercedes)
 *
 * Key facts:
 *  - Russell wins from pole, Antonelli double-stack under VSC lap 12 → Mercedes 1-2
 *  - Ferrari (Leclerc/Hamilton) missed VSC window lap 11; pitted under second VSC lap 16-17
 *  - Verstappen started P20 after Q1 crash, charged to P6, set fastest lap
 *  - DNF: Hadjar (engine, lap 11 → triggered first VSC)
 *  - DNF: Alonso (power unit, lap 15)
 *  - DNF: Bottas (fuel system, lap 16 → triggered second VSC)
 *  - DNS: Piastri (locked rear axle on formation lap), Hulkenberg (technical)
 */

import type {
  Session, Driver, Position, Interval, Lap, CarData, Pit,
  RaceControl, Weather, Location, F1State, DriverStints, StintInfo,
} from '../types/f1';

// ─── Session ─────────────────────────────────────────────────────────────────
export const mockSession: Session = {
  session_key: 9500,
  session_name: 'Race',
  session_type: 'Race',
  status: 'finished',
  date_start: '2026-03-08T05:00:00+00:00',
  date_end:   '2026-03-08T06:27:00+00:00',
  gmt_offset: '+11:00',
  location: 'Melbourne',
  country_name: 'Australia',
  circuit_short_name: 'Melbourne',
  year: 2026,
  meeting_key: 1201,
};

// ─── Drivers (2026 grid — 11 teams, 22 cars) ─────────────────────────────────
export const mockDrivers: Driver[] = [
  // Mercedes
  { driver_number: 63, broadcast_name: 'G RUSSELL',    full_name: 'George Russell',      name_acronym: 'RUS', team_name: 'Mercedes',        team_colour: '27F4D2' },
  { driver_number: 12, broadcast_name: 'K ANTONELLI',  full_name: 'Kimi Antonelli',       name_acronym: 'ANT', team_name: 'Mercedes',        team_colour: '27F4D2' },
  // Ferrari
  { driver_number: 16, broadcast_name: 'C LECLERC',    full_name: 'Charles Leclerc',      name_acronym: 'LEC', team_name: 'Ferrari',         team_colour: 'E8002D' },
  { driver_number: 44, broadcast_name: 'L HAMILTON',   full_name: 'Lewis Hamilton',       name_acronym: 'HAM', team_name: 'Ferrari',         team_colour: 'E8002D' },
  // McLaren
  { driver_number:  4, broadcast_name: 'L NORRIS',     full_name: 'Lando Norris',         name_acronym: 'NOR', team_name: 'McLaren',         team_colour: 'FF8000' },
  { driver_number: 81, broadcast_name: 'O PIASTRI',    full_name: 'Oscar Piastri',        name_acronym: 'PIA', team_name: 'McLaren',         team_colour: 'FF8000' },  // DNS
  // Red Bull Racing
  { driver_number:  1, broadcast_name: 'M VERSTAPPEN', full_name: 'Max Verstappen',       name_acronym: 'VER', team_name: 'Red Bull Racing', team_colour: '3671C6' },
  { driver_number:  6, broadcast_name: 'I HADJAR',     full_name: 'Isack Hadjar',         name_acronym: 'HAD', team_name: 'Red Bull Racing', team_colour: '3671C6' },  // DNF lap 11
  // Aston Martin
  { driver_number: 14, broadcast_name: 'F ALONSO',     full_name: 'Fernando Alonso',      name_acronym: 'ALO', team_name: 'Aston Martin',    team_colour: '229971' },  // DNF lap 15
  { driver_number: 18, broadcast_name: 'L STROLL',     full_name: 'Lance Stroll',         name_acronym: 'STR', team_name: 'Aston Martin',    team_colour: '229971' },
  // Alpine
  { driver_number: 10, broadcast_name: 'P GASLY',      full_name: 'Pierre Gasly',         name_acronym: 'GAS', team_name: 'Alpine',          team_colour: 'FF87BC' },
  { driver_number:  7, broadcast_name: 'J DOOHAN',     full_name: 'Jack Doohan',          name_acronym: 'DOO', team_name: 'Alpine',          team_colour: 'FF87BC' },
  // Williams
  { driver_number: 23, broadcast_name: 'A ALBON',      full_name: 'Alexander Albon',      name_acronym: 'ALB', team_name: 'Williams',        team_colour: '64C4FF' },
  { driver_number: 55, broadcast_name: 'C SAINZ',      full_name: 'Carlos Sainz',         name_acronym: 'SAI', team_name: 'Williams',        team_colour: '64C4FF' },
  // Racing Bulls
  { driver_number: 30, broadcast_name: 'L LAWSON',     full_name: 'Liam Lawson',          name_acronym: 'LAW', team_name: 'Racing Bulls',    team_colour: '6692FF' },
  { driver_number:  8, broadcast_name: 'A LINDBLAD',   full_name: 'Arvid Lindblad',       name_acronym: 'LIN', team_name: 'Racing Bulls',    team_colour: '6692FF' },
  // Audi
  { driver_number:  5, broadcast_name: 'G BORTOLETO',  full_name: 'Gabriel Bortoleto',    name_acronym: 'BOR', team_name: 'Audi',            team_colour: '2D826D' },
  { driver_number: 27, broadcast_name: 'N HULKENBERG',  full_name: 'Nico Hulkenberg',     name_acronym: 'HUL', team_name: 'Audi',            team_colour: '2D826D' },  // DNS
  // Haas
  { driver_number: 87, broadcast_name: 'O BEARMAN',    full_name: 'Oliver Bearman',       name_acronym: 'BEA', team_name: 'Haas F1 Team',   team_colour: 'B6BABD' },
  { driver_number: 31, broadcast_name: 'E OCON',       full_name: 'Esteban Ocon',         name_acronym: 'OCO', team_name: 'Haas F1 Team',   team_colour: 'B6BABD' },
  // Cadillac
  { driver_number: 77, broadcast_name: 'V BOTTAS',     full_name: 'Valtteri Bottas',      name_acronym: 'BOT', team_name: 'Cadillac',        team_colour: 'C41E3A' },  // DNF lap 16
  { driver_number: 43, broadcast_name: 'F COLAPINTO',  full_name: 'Franco Colapinto',     name_acronym: 'COL', team_name: 'Cadillac',        team_colour: 'C41E3A' },
];

// ─── Lap generation ───────────────────────────────────────────────────────────
// VSC periods: laps 11–14 (Hadjar engine), laps 16–18 (Bottas fuel)
const VSC_LAPS = new Set([11, 12, 13, 14, 16, 17, 18]);
const TOTAL_LAPS = 57;

interface DriverConfig {
  base: number;          // base lap time (seconds)
  pitLaps: number[];     // lap numbers where driver pits
  pitCosts: number[];    // time cost added on that lap (10=VSC pit, 22=normal)
  retireLap?: number;    // last lap if DNF
  trafficLaps?: number;  // first N laps with extra traffic penalty
  trafficExtra?: number; // seconds added per traffic lap
}

// Configured so cumulative times produce the correct finishing order.
// Verstappen: fastest pace but 2.5s/lap traffic penalty for laps 1-14 (started P20).
const DRIVER_CONFIGS: Record<number, DriverConfig> = {
   63: { base: 83.50, pitLaps: [12],         pitCosts: [10]            },  // Russell  P1
   12: { base: 83.54, pitLaps: [12],         pitCosts: [10]            },  // Antonelli P2
   16: { base: 83.50, pitLaps: [16, 35],     pitCosts: [10, 22]        },  // Leclerc   P3
   44: { base: 83.57, pitLaps: [17, 36],     pitCosts: [10, 22]        },  // Hamilton  P4
    4: { base: 83.80, pitLaps: [12, 34],     pitCosts: [10, 22]        },  // Norris    P5
    1: { base: 83.20, pitLaps: [15, 35],     pitCosts: [22, 22],         // Verstappen P6
         trafficLaps: 14, trafficExtra: 2.5                             },
   87: { base: 84.90, pitLaps: [22],         pitCosts: [22]            },  // Bearman   P7
    8: { base: 85.20, pitLaps: [20],         pitCosts: [22]            },  // Lindblad  P8
    5: { base: 85.30, pitLaps: [18],         pitCosts: [22]            },  // Bortoleto P9
   10: { base: 85.40, pitLaps: [22],         pitCosts: [22]            },  // Gasly    P10
   31: { base: 85.50, pitLaps: [22],         pitCosts: [22]            },  // Ocon     P11
   30: { base: 85.60, pitLaps: [20],         pitCosts: [22]            },  // Lawson   P12
   18: { base: 85.70, pitLaps: [12,25,35,45],pitCosts: [10,22,22,22]   },  // Stroll   P13 (4 stops)
    7: { base: 85.80, pitLaps: [24],         pitCosts: [22]            },  // Doohan   P14
   23: { base: 85.80, pitLaps: [20],         pitCosts: [22]            },  // Albon    P15
   55: { base: 85.90, pitLaps: [22],         pitCosts: [22]            },  // Sainz    P16
   43: { base: 86.00, pitLaps: [25],         pitCosts: [22]            },  // Colapinto P17
  // DNFs
    6: { base: 84.30, pitLaps: [],           pitCosts: [], retireLap: 11 }, // Hadjar   DNF lap 11
   14: { base: 84.60, pitLaps: [13],         pitCosts: [22], retireLap: 15 }, // Alonso DNF lap 15
   77: { base: 85.80, pitLaps: [12],         pitCosts: [10], retireLap: 16 }, // Bottas DNF lap 16
  // DNS — no laps
   81: { base: 0,     pitLaps: [],           pitCosts: []              },  // Piastri DNS
   27: { base: 0,     pitLaps: [],           pitCosts: []              },  // Hulkenberg DNS
};

function makeLaps(): Lap[] {
  const laps: Lap[] = [];
  for (const [dnStr, cfg] of Object.entries(DRIVER_CONFIGS)) {
    const dn = Number(dnStr);
    if (cfg.base === 0) continue; // DNS
    const maxLap = cfg.retireLap ?? TOTAL_LAPS;

    for (let lap = 1; lap <= maxLap; lap++) {
      const isVSC = VSC_LAPS.has(lap);
      const pitIdx = cfg.pitLaps.indexOf(lap);
      const isPit = pitIdx >= 0;
      const isTraffic = cfg.trafficLaps != null && lap <= cfg.trafficLaps;

      // Deterministic variation (no random — same data every run)
      const variation = Math.sin(lap * 0.7 + dn * 0.31) * 0.35 + Math.cos(lap * 0.4 + dn * 0.17) * 0.15;

      let lapTime = cfg.base + variation;
      if (lap === 1)  lapTime += 6.5;                          // standing start / formation lap
      if (isVSC)      lapTime += 10;                           // VSC pace
      if (isPit)      lapTime += cfg.pitCosts[pitIdx];         // pit stop time loss
      if (isTraffic)  lapTime += cfg.trafficExtra ?? 0;        // traffic in early laps

      // Tyre deg: +0.025s per lap since last pit (or start)
      const lastPit = [...cfg.pitLaps].reverse().find((p) => p < lap) ?? 0;
      lapTime += (lap - lastPit) * 0.025;

      const s1 = lapTime * 0.285 + Math.sin(lap * 1.1 + dn * 0.5) * 0.15;
      const s2 = lapTime * 0.385 + Math.sin(lap * 0.9 + dn * 0.3) * 0.12;
      const s3 = lapTime - s1 - s2;

      laps.push({
        driver_number: dn,
        lap_number: lap,
        lap_duration: parseFloat(lapTime.toFixed(3)),
        duration_sector_1: parseFloat(s1.toFixed(3)),
        duration_sector_2: parseFloat(s2.toFixed(3)),
        duration_sector_3: parseFloat(s3.toFixed(3)),
        is_pit_out_lap: pitIdx >= 0 && pitIdx < cfg.pitLaps.length - 1
          ? lap === cfg.pitLaps[pitIdx - 1] + 1
          : false,
        date_start: '',
        session_key: 9500,
        meeting_key: 1201,
      });
    }
  }
  return laps;
}

export const mockLaps: Lap[] = makeLaps();

// ─── Pit stops ────────────────────────────────────────────────────────────────
function makePits(): Pit[] {
  const pits: Pit[] = [];
  for (const [dnStr, cfg] of Object.entries(DRIVER_CONFIGS)) {
    const dn = Number(dnStr);
    cfg.pitLaps.forEach((lap, i) => {
      pits.push({
        driver_number: dn,
        lap_number: lap,
        pit_duration: cfg.pitCosts[i] === 10 ? 2.3 + Math.sin(dn * 0.7) * 0.2
                                              : 2.8 + Math.sin(dn * 0.9) * 0.3,
        date: '',
        session_key: 9500,
        meeting_key: 1201,
      });
    });
  }
  return pits;
}
export const mockPits: Pit[] = makePits();

// ─── Race control messages ────────────────────────────────────────────────────
export const mockRaceControl: RaceControl[] = [
  { date: '2026-03-08T05:00:30+00:00', lap_number: 1,  category: 'Flag',       flag: 'GREEN',    message: 'GREEN LIGHT — RACE START',                                     scope: 'Track',  sector: null, driver_number: null, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:01:10+00:00', lap_number: 1,  category: 'Other',      flag: null,       message: 'DRS ENABLED',                                                  scope: 'Track',  sector: null, driver_number: null, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:16:20+00:00', lap_number: 11, category: 'SafetyCar',  flag: 'SC',       message: 'VIRTUAL SAFETY CAR DEPLOYED — CAR 6 (HAD) STOPPED T1',         scope: 'Track',  sector: null, driver_number: 6,    session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:16:25+00:00', lap_number: 11, category: 'Drs',        flag: null,       message: 'DRS DISABLED',                                                 scope: 'Track',  sector: null, driver_number: null, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:17:10+00:00', lap_number: 12, category: 'Other',      flag: null,       message: 'CAR 6 (HAD) RETIRED — ENGINE FAILURE',                         scope: 'Track',  sector: null, driver_number: 6,    session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:21:30+00:00', lap_number: 14, category: 'SafetyCar',  flag: 'GREEN',    message: 'VIRTUAL SAFETY CAR ENDING — TRACK CLEAR',                      scope: 'Track',  sector: null, driver_number: null, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:22:00+00:00', lap_number: 14, category: 'Drs',        flag: null,       message: 'DRS ENABLED',                                                  scope: 'Track',  sector: null, driver_number: null, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:23:50+00:00', lap_number: 15, category: 'Other',      flag: null,       message: 'CAR 14 (ALO) RETIRED — HONDA POWER UNIT FAILURE',              scope: 'Track',  sector: null, driver_number: 14,   session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:25:10+00:00', lap_number: 16, category: 'SafetyCar',  flag: 'SC',       message: 'VIRTUAL SAFETY CAR DEPLOYED — CAR 77 (BOT) STOPPED T12',       scope: 'Track',  sector: null, driver_number: 77,   session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:25:15+00:00', lap_number: 16, category: 'Drs',        flag: null,       message: 'DRS DISABLED',                                                 scope: 'Track',  sector: null, driver_number: null, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:28:20+00:00', lap_number: 18, category: 'SafetyCar',  flag: 'GREEN',    message: 'VIRTUAL SAFETY CAR ENDING — TRACK CLEAR',                      scope: 'Track',  sector: null, driver_number: null, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:28:30+00:00', lap_number: 18, category: 'Drs',        flag: null,       message: 'DRS ENABLED',                                                  scope: 'Track',  sector: null, driver_number: null, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:45:00+00:00', lap_number: 27, category: 'Flag',       flag: 'YELLOW',   message: 'YELLOW FLAG SECTOR 2 — DEBRIS ON CIRCUIT',                     scope: 'Sector', sector: 2,    driver_number: null, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:45:45+00:00', lap_number: 27, category: 'Flag',       flag: 'GREEN',    message: 'TRACK CLEAR',                                                  scope: 'Track',  sector: null, driver_number: null, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T06:10:00+00:00', lap_number: 46, category: 'Other',      flag: null,       message: 'CAR 18 (STR) FIVE SECOND TIME PENALTY — UNSAFE RELEASE IN PIT LANE', scope: 'Track', sector: null, driver_number: 18, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T06:24:30+00:00', lap_number: 56, category: 'Flag',       flag: 'GREEN',    message: 'FINAL LAP',                                                    scope: 'Track',  sector: null, driver_number: null, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T06:26:45+00:00', lap_number: 57, category: 'Flag',       flag: 'CHEQUERED',message: 'CHEQUERED FLAG — RACE COMPLETE',                                scope: 'Track',  sector: null, driver_number: null, session_key: 9500, meeting_key: 1201 },
  // ── Team radio messages ────────────────────────────────────────────────────
  { date: '2026-03-08T05:03:15+00:00', lap_number: 2,  category: 'Other', flag: null, message: '[TEAM RADIO] RUS: "Car feels good, managing tyres well, pushing hard."', scope: 'Driver', sector: null, driver_number: 63, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:07:40+00:00', lap_number: 6,  category: 'Other', flag: null, message: '[TEAM RADIO] MERCEDES to ANT: "Gap to Russell is 1.4, keep the pace."',  scope: 'Driver', sector: null, driver_number: 12, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:11:00+00:00', lap_number: 9,  category: 'Other', flag: null, message: '[TEAM RADIO] VER: "I\'m through four cars already. These tyres are flying."', scope: 'Driver', sector: null, driver_number: 1,  session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:15:50+00:00', lap_number: 11, category: 'Other', flag: null, message: '[TEAM RADIO] MERCEDES to RUS: "Stay out, stay out — VSC is likely, box next lap."', scope: 'Driver', sector: null, driver_number: 63, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:17:05+00:00', lap_number: 12, category: 'Other', flag: null, message: '[TEAM RADIO] MERCEDES to RUS: "Box box box. Medium tyres. Good gap on Ferrari."', scope: 'Driver', sector: null, driver_number: 63, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:17:25+00:00', lap_number: 12, category: 'Other', flag: null, message: '[TEAM RADIO] FERRARI to LEC: "Hold position, VSC is ending, we wait."',           scope: 'Driver', sector: null, driver_number: 16, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:17:40+00:00', lap_number: 12, category: 'Other', flag: null, message: '[TEAM RADIO] LEC: "We should have pitted! This is wrong. I\'m losing time."',     scope: 'Driver', sector: null, driver_number: 16, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:22:10+00:00', lap_number: 14, category: 'Other', flag: null, message: '[TEAM RADIO] RED BULL to VER: "You\'re P10 and rising. Brilliant pace Max."',     scope: 'Driver', sector: null, driver_number: 1,  session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:25:20+00:00', lap_number: 16, category: 'Other', flag: null, message: '[TEAM RADIO] FERRARI to LEC: "Box box box. Hard tyres. Go go go!"',               scope: 'Driver', sector: null, driver_number: 16, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:32:00+00:00', lap_number: 20, category: 'Other', flag: null, message: '[TEAM RADIO] NOR: "Target is Antonelli. How much time do I need?"',               scope: 'Driver', sector: null, driver_number: 4,  session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T05:45:30+00:00', lap_number: 27, category: 'Other', flag: null, message: '[TEAM RADIO] RUS: "I\'m managing everything. Gap is comfortable, keep pushing."', scope: 'Driver', sector: null, driver_number: 63, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T06:10:30+00:00', lap_number: 46, category: 'Other', flag: null, message: '[TEAM RADIO] STR: "That was not an unsafe release! I had the gap!"',             scope: 'Driver', sector: null, driver_number: 18, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T06:20:00+00:00', lap_number: 52, category: 'Other', flag: null, message: '[TEAM RADIO] MERCEDES to RUS: "George, you\'re going to win this race. Manage it home."', scope: 'Driver', sector: null, driver_number: 63, session_key: 9500, meeting_key: 1201 },
  { date: '2026-03-08T06:26:50+00:00', lap_number: 57, category: 'Other', flag: null, message: '[TEAM RADIO] RUS: "YES! Incredible team! What a way to start the season!"',       scope: 'Driver', sector: null, driver_number: 63, session_key: 9500, meeting_key: 1201 },
];

// ─── Weather ──────────────────────────────────────────────────────────────────
export const mockWeather: Weather = {
  date: '2026-03-08T06:00:00+00:00',
  air_temperature: 24.3,
  track_temperature: 41.7,
  humidity: 38,
  wind_speed: 3.2,
  wind_direction: 210,
  rainfall: 0,
  session_key: 9500,
  meeting_key: 1201,
};

// ─── Track locations (approximate Albert Park positions) ─────────────────────
// These are used by the live TrackMap as a fallback; the simulator uses
// continuous path interpolation instead.
const TRACK_SHAPE: [number, number][] = [
  [590,145],[590,345],[560,430],[490,460],[400,460],[290,440],[210,390],
  [148,270],[160,140],[265,92],[395,92],[465,200],[462,230],[478,278],
  [516,268],[516,220],[536,166],[590,152],
];

function interpolateTrack(t: number): [number, number] {
  const n = TRACK_SHAPE.length;
  const idx = Math.floor(t * n) % n;
  const next = (idx + 1) % n;
  const frac = (t * n) % 1;
  const [x1, y1] = TRACK_SHAPE[idx];
  const [x2, y2] = TRACK_SHAPE[next];
  return [x1 + (x2 - x1) * frac, y1 + (y2 - y1) * frac];
}

// Final-lap positions for static previews
const FINAL_ORDER = [63, 12, 16, 44, 4, 1, 87, 8, 5, 10, 31, 30, 18, 7, 23, 55, 43, 6, 14, 77];
export const mockLocations: Location[] = FINAL_ORDER.map((dn, i) => {
  const t = ((i / 20) + 0.95) % 1;
  const [x, y] = interpolateTrack(t);
  return { driver_number: dn, date: '', x: Math.round(x), y: Math.round(y), z: 0, session_key: 9500, meeting_key: 1201 };
});

// ─── Realistic tyre compound sequences per driver ────────────────────────────
// Based on 2026 Australian GP strategy:
// - Drivers who pitted under VSC1 (lap 12): SOFT → MEDIUM (cheap VSC stop)
// - Ferrari missed VSC1, pitted under VSC2 (lap 16-17): SOFT → HARD (longer stint)
// - Norris: 2-stop SOFT → MEDIUM → HARD
// - Verstappen started P20 on MEDIUM to have tyre advantage at the end, → SOFT
const DRIVER_COMPOUND_SEQUENCES: Record<number, string[]> = {
  63:  ['SOFT', 'MEDIUM'],                   // Russell: 1-stop VSC1
  12:  ['SOFT', 'MEDIUM'],                   // Antonelli: 1-stop VSC1
  16:  ['SOFT', 'HARD'],                     // Leclerc: 1-stop VSC2 (Ferrari missed VSC1)
  44:  ['SOFT', 'HARD'],                     // Hamilton: 1-stop VSC2
   4:  ['SOFT', 'MEDIUM', 'HARD'],           // Norris: 2-stop
   1:  ['MEDIUM', 'SOFT'],                   // Verstappen: reversed strategy from P20
  87:  ['SOFT', 'MEDIUM'],                   // Bearman
   8:  ['SOFT', 'MEDIUM'],                   // Lindblad
   5:  ['SOFT', 'HARD'],                     // Bortoleto
  10:  ['SOFT', 'MEDIUM'],                   // Gasly
  31:  ['SOFT', 'HARD'],                     // Ocon
  30:  ['SOFT', 'MEDIUM'],                   // Lawson
  18:  ['SOFT', 'MEDIUM', 'HARD', 'MEDIUM'], // Stroll: 4-stop
   7:  ['SOFT', 'HARD'],                     // Doohan
  23:  ['SOFT', 'MEDIUM'],                   // Albon
  55:  ['SOFT', 'HARD'],                     // Sainz
  43:  ['SOFT', 'MEDIUM'],                   // Colapinto
   6:  ['SOFT'],                             // Hadjar: S only (DNF lap 11)
  14:  ['SOFT', 'MEDIUM'],                   // Alonso: pitted then DNF
  77:  ['SOFT', 'MEDIUM'],                   // Bottas: pitted VSC1 then DNF
  81:  [],                                   // Piastri: DNS
  27:  [],                                   // Hulkenberg: DNS
};

// ─── Qualifying grid positions (race start order) ────────────────────────────
// Used in Race Tower to show position gain/loss vs. grid.
export const STARTING_GRID: Record<number, number> = {
  63:  1,  // Russell — pole
  12:  2,  // Antonelli
  16:  3,  // Leclerc
  44:  4,  // Hamilton
   4:  5,  // Norris
  87:  6,  // Bearman
  10:  7,  // Gasly
  31:  8,  // Ocon
  18:  9,  // Stroll
   8: 10,  // Lindblad
   5: 11,  // Bortoleto
  30: 12,  // Lawson
  43: 13,  // Colapinto
  23: 14,  // Albon
  55: 15,  // Sainz
   7: 16,  // Doohan
  77: 17,  // Bottas
  14: 18,  // Alonso
   6: 19,  // Hadjar
   1: 20,  // Verstappen — Q1 crash, started last
  81:  0,  // Piastri — DNS
  27:  0,  // Hulkenberg — DNS
};

// ─── Derived data ─────────────────────────────────────────────────────────────
function buildMockStints(): DriverStints {
  const stints: DriverStints = {};

  for (const [dnStr, cfg] of Object.entries(DRIVER_CONFIGS)) {
    const dn = Number(dnStr);
    if (cfg.base === 0) continue;
    const maxLap = cfg.retireLap ?? TOTAL_LAPS;
    const compounds = DRIVER_COMPOUND_SEQUENCES[dn] ?? ['SOFT', 'MEDIUM', 'HARD'];
    const list: StintInfo[] = [];
    let start = 1, ci = 0;
    for (const pit of cfg.pitLaps) {
      if (pit > maxLap) break;
      list.push({ compound: compounds[ci] ?? 'MEDIUM', startLap: start, endLap: pit, tyreAge: pit - start });
      start = pit + 1; ci++;
    }
    list.push({ compound: compounds[ci] ?? 'HARD', startLap: start, endLap: maxLap, tyreAge: maxLap - start });
    stints[dn] = list;
  }
  return stints;
}

function buildFinalPositions(): Position[] {
  return FINAL_ORDER.map((dn, i) => ({
    driver_number: dn, date: '', position: i + 1, session_key: 9500, meeting_key: 1201,
  }));
}

function buildFinalIntervals(): Interval[] {
  // Cumulative times from lap data
  const cumMap = new Map<number, number>();
  for (const dn of FINAL_ORDER) {
    const driverLaps = mockLaps.filter((l) => l.driver_number === dn);
    cumMap.set(dn, driverLaps.reduce((s, l) => s + (l.lap_duration ?? 0), 0));
  }
  const leaderTime = cumMap.get(FINAL_ORDER[0]) ?? 0;
  return FINAL_ORDER.map((dn, i) => ({
    driver_number: dn,
    date: '',
    gap_to_leader: i === 0 ? 0 : parseFloat(((cumMap.get(dn) ?? 0) - leaderTime).toFixed(3)),
    interval: i === 0 ? 0 : parseFloat(((cumMap.get(dn) ?? 0) - (cumMap.get(FINAL_ORDER[i - 1]) ?? 0)).toFixed(3)),
    session_key: 9500,
    meeting_key: 1201,
  }));
}

export const mockErsStates: Record<number, { charge: number; mode: 'Harvest' | 'Boost' | 'Depleting' | 'Balanced'; estimatedMJ: number }> = {};
FINAL_ORDER.forEach((dn, i) => {
  const charge = Math.max(20, 88 - i * 3 + Math.sin(dn * 0.5) * 5);
  mockErsStates[dn] = {
    charge: parseFloat(charge.toFixed(1)),
    mode: i % 4 === 0 ? 'Boost' : i % 4 === 1 ? 'Harvest' : i % 4 === 2 ? 'Depleting' : 'Balanced',
    estimatedMJ: parseFloat(((charge / 100) * 4.0).toFixed(2)),
  };
});

export const mockCarData: CarData[] = FINAL_ORDER.map((dn, i) => ({
  driver_number: dn,
  date: '',
  throttle: i < 6 ? 95 + Math.sin(dn) * 4 : 70 + Math.sin(dn * 0.7) * 25,
  brake: 0,
  speed: 315 - i * 4 + Math.sin(dn * 0.3) * 8,
  rpm: 11800 - i * 60,
  n_gear: 8,
  drs: i < 12 ? 12 : 8,
  session_key: 9500,
  meeting_key: 1201,
}));

// ─── Full mock F1State (final-lap snapshot) ───────────────────────────────────
export const mockF1State: F1State = {
  session: mockSession,
  drivers: mockDrivers,
  positions: buildFinalPositions(),
  intervals: buildFinalIntervals(),
  laps: mockLaps,
  carData: mockCarData,
  pits: mockPits,
  raceControl: mockRaceControl,
  weather: mockWeather,
  locations: mockLocations,
  stints: buildMockStints(),
  ersStates: mockErsStates,
  isLive: false,
  isStale: false,
  lastUpdated: new Date('2026-03-08T06:27:00Z'),
  currentLap: TOTAL_LAPS,
  totalLaps: TOTAL_LAPS,
};

export { TOTAL_LAPS, DRIVER_CONFIGS };
