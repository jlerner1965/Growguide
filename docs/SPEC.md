# Grow Tracker — Build Brief (docs/SPEC.md)

The complete original spec for the Cultivation Compass grow-tracking tool
layer. `CLAUDE.md` is the lean day-to-day guide; this file is the detailed
reference each module's screen prompt points at. Read the relevant section
before building that module — don't invent fields or behavior it doesn't
describe.

Audience: adult home growers of outdoor photoperiod cannabis on Colorado's
Front Range (roughly Boulder/Weld/Larimer counties, 5,000–6,500 ft
elevation). Tone: professional agricultural software — closer to a farm
record-keeping tool than a consumer cannabis app. Never legal advice, never
a guaranteed outcome, never an invented citation.

---

## 1. Product overview & principles

- **Data model:** `Grow → Plant → JournalEntry`, with `Photo` attached to
  either. Everything else (stage, alerts, tasks, risk, height trend,
  flowering/harvest estimates) is *derived*, never stored.
- **One active grow at a time** in v1: the most recently created,
  non-archived row in `grows`. Multi-grow switching is future work.
- **Units:** canonical storage is metric (`height_cm`, temps stay in °F
  per `journal_entries.temp_f` since that's how Front Range growers read a
  thermometer) — display converts per `profiles.units`.
- **Honesty over confidence.** Anything estimated, forecast, or inferred
  (flowering dates, harvest windows, weather risk, future diagnostics)
  must say so in the UI copy, not just imply it via a clean layout.
- **Never store weather.** It's a live external signal, refetched each
  time it's needed.

## 2. Grow Setup

A multi-step wizard that creates or edits one row in `grows`. Steps and
the fields they own:

1. **Basics** — `name` (required), `indoor_start` (date, optional — many
   Front Range growers direct-sow or buy starts), `outdoor_transplant`
   (date — this is the anchor `derive.ts` uses for stage/day-count),
   `experience` (New / Some seasons / Experienced).
2. **Location** — `location` (free text, e.g. "Niwot, CO"), `elevation_ft`,
   `lat`/`lng` (default **40.1046, -105.1705** — Niwot, CO, editable),
   `sun_exposure` (Full sun / Partial / Mostly shade), `protection`
   (None / Windbreak / Greenhouse-assisted / Hoop house).
3. **Plants** — `plant_count`, `photo_type` (Photoperiod / Autoflower),
   `cultivars` (multiselect, free-entry chips — no fixed strain database
   in v1).
4. **Growing** — `container` (In-ground / Fabric pot / Plastic container /
   Raised bed), `medium` (Native soil / Amended soil / Soilless mix /
   Coco), `irrigation` (Hand watering / Drip / Soaker hose / None yet).
5. **Nutrition** — `nutrition_approach` (Organic / Synthetic / Mixed /
   Undecided), `concerns` (free text — what the grower is worried about).
6. **Review** — summary of every field with an edit-this-step affordance,
   then Save.

On save: `useCreateGrow` (new) or `useUpdateGrow` (editing the active
grow). Required: `name`. Everything else optional — a grower can save a
minimal grow and fill in details later from **My Grow**.

**Starting plan:** after creating a grow, generate a short heuristic
cultivation plan from `outdoor_transplant` (or today, if unset) using the
same offsets `derive.ts` uses for stage estimates — a handful of dated
milestones (e.g. "transplant hardening", "expected pre-flower window",
"expected flower onset ~Aug 12", "expected harvest window Oct 4–20"),
each explicitly labeled as a Front-Range heuristic, not a promise. Render
it on **My Grow**, not stored as its own table — it's `derive.ts` output.

## 3. Dashboard

Reference implementation, already built (`screens/Dashboard.tsx`). Stat
tiles (active plants, stage, flowering-in, harvest window), an
attention/tasks pair, the 7-day outlook strip, one height sparkline for
the grow's first active plant, and recent observations. Every other
screen copies its hooks → derive → render shape.

## 4. Plants

Full plant roster for the active grow: `usePlants(growId)` plus
per-plant derived values from `useJournal(growId)` filtered client-side
(`latestHeightCm`, `heightSeries`, entry counts, days since transplant).
Card grid → detail view (height chart, full timeline of that plant's
entries, quick stats). Actions: add, edit, archive/restore (soft —
`archived: true`, keeps history), duplicate (copies static fields, not
journal history), delete (hard delete, cascades entries — confirm with
plant name typed or a clear two-step confirm), and a side-by-side
compare of two plants (height series overlaid, latest stats table).

## 5. Daily Journal

Highest daily-use screen. One entry = one moment in time, optionally tied
to a specific plant (`plant_id: null` means "whole grow" — e.g. "watered
everything"). Tag vocabulary (`journal_entries.tags`, multi-select):
Watered, Fed, Pruned, Topped, Trained, Sprayed, Pest found, Damage,
Flowering observed, Photograph, Harvest activity. `Flowering observed` is
load-bearing — `derive.estimateStage` uses it to flip a plant into the
Flowering stage regardless of day-count.

Quick fields: water volume (gal), height (grower enters in their
preferred unit, **convert to cm before writing** `height_cm`), nutrients
(free text), pH, EC, temp (°F), RH (%), soil moisture (free text),
symptoms (free text — feeds future Diagnostics), notes. Entry list
newest-first; filter by plant and by tag (`useJournal(growId, {plantId,
tag})`). Confirm before delete — journal entries are the primary record,
losing one silently would be a data-loss bug.

## 6. Weather Risks

Two layers. `weather/useWeather.ts` is the always-on Open-Meteo hook
(no API key, CORS-friendly) that also powers the Dashboard's 7-day strip
and computes the risk cards: Extreme heat, High wind, Cold/frost, Heavy
rain, and — when hourly CAPE / RH are present — Convective/hail potential
and Mildew/botrytis pressure / Low humidity.

The full **Weather Risks** screen adds NWS active alerts:
`GET https://api.weather.gov/alerts/active?point={lat},{lng}` with
`Accept: application/geo+json`. Best-effort only — if the fetch fails
(CORS, offline, NWS outage), hide the alerts section entirely; never
render a fabricated "no alerts" state as if it were confirmed. Layout:
official NWS alerts (if any) → 7-day outlook → risk cards sorted
red > amber > ok → a generated action checklist built from whichever
risks are amber/red (e.g. wind amber → "inspect stakes and ties") → a
manual refresh control.

**Keep the proxy labels honest.** CAPE is convective/hail *potential*,
not a hail forecast. RH-hours-above-85% is disease *pressure*, not a
mildew diagnosis. The copy must say "potential" / "pressure", never
assert an outcome.

## 7. Diagnostics (deferred)

Working name "RootDX" from the Phase-1 prototype. Symptom-based
differential: grower picks observed symptoms (leaf color/pattern,
location on plant, texture, recent journal context) and gets ranked
possible causes with a confidence indicator and the conflicting evidence
that would rule each one out — never a single confident diagnosis. Needs
its own migration (a `diagnostic_sessions` or similar table, or it may be
computable purely from existing `journal_entries.symptoms` + tags — decide
when specced in detail) before wiring a screen.

## 8. Irrigation (deferred)

Track and plan watering: target frequency/volume by stage and container
size, a log view derived from `journal_entries` tagged `Watered`, and
(optionally) a manual reminder schedule. Needs a schema decision on
whether schedules are their own table or derived — spec in detail before
building.

## 9. Nutrition (deferred)

Feeding schedule by stage and `nutrition_approach`, deficiency/excess
symptom reference cross-linked with Diagnostics, and a feed log derived
from `journal_entries` tagged `Fed`. Needs a nutrient-program table if
growers are to save a custom schedule.

## 10. Training + trellis planner (deferred)

Topping/LST/trellising guidance keyed to stage and canopy stage, plus a
simple trellis layout planner (grid or SCROG net dimensions vs. plant
spacing). Log entries already exist (`Topped`, `Trained` tags); a planner
needs a small `training_plans` table for saved layouts.

## 11. Pest & Disease library (deferred)

Reference library (Colorado Front Range relevant pests/diseases — spider
mites, aphids, powdery mildew, botrytis, etc.) cross-linked to
Diagnostics and to the `Pest found` / `Damage` journal tags. Static
content table + images; no user data schema beyond what already exists.

## 12. Harvest Planner (deferred)

Refines the Grow Setup heuristic harvest window using real trichome/
flowering observations logged in the Journal, plus a dry/cure checklist
once `Harvest activity` is logged. Needs a small `harvest_plans` table
(target window, trichome check-ins) to persist grower-adjusted estimates
separately from the pure heuristic.

## 13. Photo Timeline (deferred)

Visual timeline over `photos` (already migrated — see `db/types.ts`
`Photo` and `db/api.ts` `uploadPhoto`/`photoUrl`). Per-plant filmstrip,
compare-two-dates slider, and profile-photo selection (`is_profile`).
Screen work only — the table and storage bucket already exist.

## 14. Reports

Printable, not exported-as-file: build clean HTML in-memory and open it
in a new window for the browser's native print/save-as-PDF. Three kinds:

- **Weekly summary** — date range picker (default: last 7 days),
  observations grouped by day, any unresolved issues (last `Pest
  found`/`Damage` entry with no later "resolved" signal), upcoming
  actions from `derive.upcomingTasks`.
- **Individual plant** — one plant's full timeline, height chart, current
  stats, health note.
- **Full season** — the whole grow from `outdoor_transplant` (or first
  entry) to today: stage progression, all plants summarized, key
  observations, weather-risk moments worth noting.

Every report ends with the same disclaimer footer: cultivation estimates
and derived guidance are heuristics for a home-growing hobbyist, not
professional agronomic, legal, or safety advice, and Colorado law on
possession/cultivation limits is the grower's own responsibility to know
and follow.

## 15. Encyclopedia bridge (deferred)

Cross-links from tracker screens (a cultivar name, a pest, a stage) out
to the public Compass encyclopedia. No new data — just contextual links
once the encyclopedia's URL scheme is finalized.

## 16. Settings & data

`useProfile` / `updateProfile` for `display_name`, `units`, `theme`,
`experience`. **Export:** query the signed-in user's grows, plants,
journal entries, and photo metadata and download as one JSON file — this
is the real backup; nothing is synced elsewhere. **Restore:** file input
→ `importBackup` (maps the Phase-1 standalone-app JSON shape into the
Supabase tables; camelCase → snake_case happens only in that function).
**Delete sample data:** delete the grow where `is_sample = true`
(cascades plants/entries/photos) — confirm first, this is destructive.
