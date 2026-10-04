# Project guidance

Read README.md and docs/DEPLOYMENT.md. Preserve separation between live data, historical recorded replay and the explicitly synthetic offline demo. Never use mock data as a network-error fallback. Unknown timing, sectors, tyres, GPS or battery data must remain unknown. Provider errors must be visible and recoverable.

React + TypeScript + Vite. `useRaceWeekend` owns independent calendar, qualifying, standings and weather. `useOpenF1` owns session discovery/polling through the shared rate-limited `openF1` client. `useHistoricalReplay` loads complete paginated lap data; `utils/replay.ts` derives the selected lap state. `useRaceSimulator` is only the offline demo. Analysis panels are lazy-loaded.

Run `npm run build` and `node --test tests/*.test.mjs` on Node 24 before release. Only publish to the existing F1 project. Portfolio metadata is maintained in the separate matt-vildibill-portfolio repository.
