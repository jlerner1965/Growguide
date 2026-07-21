# CLAUDE.md — Grow Tracker (Cultivation Compass tool layer)

Project context for Claude Code. Read this + `src/screens/Dashboard.tsx` before
touching anything — Dashboard is the reference pattern; every screen copies it.

## What this is
The logged-in grow-tracking tool layer of **Cultivation Compass**. Compass (the
encyclopedia) is the public front door; this is the app behind auth. Outdoor
photoperiod cannabis cultivation for adult home growers on Colorado's Front
Range. Professional agricultural-software feel — not a dispensary/"stoner" look.

## Stack & layout
React + TypeScript + Vite, TanStack Query v5, Supabase (Postgres + Auth +
Storage). Data model: `Grow → Plant → JournalEntry`; everything else is derived.

```
src/
  App.tsx              QueryClient → AuthProvider → AuthGate → screen  (add router here)
  db/                  client.ts (supabase + auth) · types.ts · api.ts (CRUD) ·
                       hooks.ts (TanStack) · importBackup.ts (Phase-1 JSON → tables)
  auth/                AuthProvider · SignIn (magic link) · AuthGate
  lib/derive.ts        PURE derived intelligence (stage, days, flowering/harvest
                       estimates, height series, alerts, tasks, risk, formatting)
  weather/useWeather.ts Open-Meteo hook + Colorado risk engine
  screens/Dashboard.tsx REFERENCE PATTERN — done
supabase/migrations/0001_grow_tracker.sql  schema + RLS + storage bucket
```

## The pattern (follow it exactly)
1. **Fetch with hooks** from `db/hooks.ts` (`useGrows`, `usePlants(growId)`,
   `useJournal(growId, filter)`, `useProfile`, mutations). Add hooks to
   `db/hooks.ts` if a screen needs one that isn't there (e.g. `useDeletePlant`).
2. **Derive with pure functions** from `lib/derive.ts`. No business logic in JSX.
3. **Render with real states** — loading / empty / error each handled explicitly.
   Never fake a loading state or leave an empty screen.

## Non-negotiable conventions
- **Never pass `user_id`.** It's set by the `auth.uid()` column default and
  enforced by RLS. Callers just insert their data.
- **Heights/widths are stored in centimetres** (`height_cm`). Convert with
  `derive.cmToIn` / `derive.fmtHeight(cm, units)` for display; convert user input
  back to cm before writing.
- **Weather is never stored** — it's fetched live via `useWeather`. No weather tables.
- **Estimates are labeled as estimates.** Flowering/harvest dates are heuristics
  (`derive.estimatedFloweringDate`, `harvestWindow`); show ranges, never a single
  guaranteed date. Diagnostics (later) must show confidence + conflicting evidence
  and never claim certainty.
- **Never invent** lab results, citations, legal requirements, or weather/diagnoses.
- **Styling inherits Compass tokens.** Reuse the existing class vocabulary
  (`card`, `pill`, `eyebrow`, `stat`, `btn`, `muted`, `small`). Map to Compass's
  design system — do NOT introduce a new visual identity or restyle from scratch.
- **Secrets:** anon key only in the client; the service_role key never touches
  frontend code.

## Tasks — port the remaining screens (Dashboard is the template)
Do these in order; each is done when it type-checks, builds, handles
loading/empty/error, and is usable on a phone.

1. **App shell + router.** Add a sidebar (desktop) + bottom bar (mobile) and
   routing (React Router). Nav: Dashboard, My Grow, Plants, Journal, Weather,
   Settings, then a "planned" group for Diagnostics/Irrigation/Nutrition/Training/
   Pest/Harvest/Photos/Reports. Dashboard already exists — route to it.

2. **`screens/Journal.tsx`** (highest daily value — do first after the shell).
   `useJournal(growId, {plantId, tag})`, `useCreateEntry`, `useDeleteEntry`,
   `usePlants` for the plant picker. Fast mobile entry form: plant select, tag
   chips (Watered/Fed/Pruned/Topped/Trained/Sprayed/Pest found/Damage/Flowering
   observed/Photograph/Harvest activity), quick fields (water gal, height →
   convert to cm, nutrients, pH, EC, temp °F, RH %, symptoms, notes). Filter by
   plant + tag. Confirm before delete.

3. **`screens/Plants.tsx`.** `usePlants(growId)`, `useJournal(growId)` for
   per-plant derived (`latestHeightCm`, `heightSeries`, entry counts),
   `useCreatePlant`/`useUpdatePlant`, plus `api.duplicatePlant`/`api.deletePlant`
   (add hooks). Cards → detail (height chart + timeline). Add/edit/archive/
   duplicate/delete (confirm destructive), compare-two-plants.

4. **`screens/GrowSetup.tsx`.** Multi-step wizard → `useCreateGrow`/`useUpdateGrow`.
   Collect the `grows` fields incl. `lat`/`lng` (default Niwot 40.1046,-105.1705).
   Active grow = most recent. Generate a starting plan (reuse the Phase-1 copy).

5. **`screens/Weather.tsx`.** Extend `useWeather` (or add `useNwsAlerts`) to also
   fetch NWS active alerts (`api.weather.gov/alerts/active?point=lat,lng`,
   best-effort, hide on failure). Render: alerts, 7-day outlook, risk cards +
   generated action checklist, refresh. Keep the honest proxy labels (CAPE =
   convective potential, RH = disease pressure — not forecasts).

6. **`screens/Settings.tsx`.** `useProfile` + `api.updateProfile` for units/theme.
   JSON export (query all → download) and **import via `importBackup`** (wire the
   Phase-1 backup file input here). Delete sample (delete grow where `is_sample`).

7. **`screens/Reports.tsx`.** Printable weekly / per-plant / season reports
   (open a print window, build HTML from the hooks' data; port the Phase-1
   `printDoc`). Include the education/uncertainty disclaimer footer.

Deferred (separate migrations first): Diagnostics (port RootDX), Irrigation,
Nutrition, Training + trellis planner, Pest/Disease library, Harvest Planner,
Photo Timeline, Encyclopedia bridge. **Full requirements for these — and every
module above — are in `docs/SPEC.md` (the complete original build brief). Read
the relevant section there before building a module.**

## Setup / verify
- `npm i @supabase/supabase-js @tanstack/react-query`
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Apply `supabase/migrations/0001_grow_tracker.sql`
- Gate each change on `tsc --noEmit` and `vite build`.
