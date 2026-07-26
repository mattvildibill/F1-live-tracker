---
name: F1 Live Tracker Project
description: Overview of the F1 live tracker app built with React/TypeScript/Vite + OpenF1 API
type: project
---

F1 live tracker web app scaffolded and built in one session.

**Why:** User wanted a real-time F1 race dashboard using the free OpenF1 REST API.

**How to apply:** When adding features, follow the existing pattern: all API calls live in `useOpenF1.ts`, components receive `F1State` as a `state` prop, ERS estimation is in its own hook.

Tech: React + TypeScript + Vite, Tailwind CSS, Chart.js via react-chartjs-2. No backend.
Fallback session: 2024 Monaco GP `session_key=9222` when no live race or API is down.
OpenF1 API base: https://api.openf1.org/v1 (free, no auth needed).
