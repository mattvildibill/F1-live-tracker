// In dev we go through the Vite proxy; in production (static hosting like
// GitHub Pages) we hit the CORS-enabled OpenF1 API directly.
export const OPENF1_BASE = import.meta.env.DEV
  ? '/openf1/v1'
  : 'https://api.openf1.org/v1';
