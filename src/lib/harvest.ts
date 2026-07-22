// lib/harvest.ts
// PURE harvest-timing estimation. No I/O, no randomness — a deterministic
// function of (grow, plant, entries, weatherRisks[, now]), so it is fully
// unit-testable.
//
// HARD RULE: never present a single confident harvest date. Always a WINDOW
// (from/to) plus a coarse confidence and the assumptions behind it. Breeder
// flowering estimates are never trusted on their own — the estimate leans on
// this plant's own logged signals (an actual "Flowering observed" flip and,
// best of all, real trichome observations). Weather danger is surfaced as a
// "consider harvesting earlier" caution, never a silent shift of the window.

import type { Grow, Plant, JournalEntry } from '../db/types';
import { estimatedFloweringDate } from './derive';

export type Confidence = 'Low' | 'Moderate' | 'High';

export type TrichomeStage =
  | 'Mostly clear'
  | 'Mostly cloudy'
  | 'Cloudy with some amber'
  | 'Mostly amber';

export const TRICHOME_TAG = 'Trichome check';
export const TRICHOME_STAGES: TrichomeStage[] = ['Mostly clear', 'Mostly cloudy', 'Cloudy with some amber', 'Mostly amber'];

/** Plain-English guide shown next to the logger. Guidance, not a guarantee. */
export const TRICHOME_GUIDE: Record<TrichomeStage, string> = {
  'Mostly clear': 'Not ready. Clear/translucent heads mean immature resin — harvesting now gives low potency. Keep checking.',
  'Mostly cloudy': 'Approaching peak. Milky/cloudy heads suggest near-maximum THC. Many growers target this window; check every day or two.',
  'Cloudy with some amber': 'Ripe window. A mix of cloudy with some amber is the common "balanced" harvest point. Good time to harvest for most.',
  'Mostly amber': 'Late/degrading. Lots of amber means resin is past peak and shifting toward a heavier, more sedative profile. Harvest soon if you want to stop the slide.',
};

// A minimal weather-risk shape so this module doesn't depend on the weather hook.
export interface HarvestWeatherRisk {
  title: string;
  level: 'red' | 'amber' | 'ok';
  advice?: string;
}

export interface HarvestCaution {
  level: 'amber' | 'red';
  title: string;
  body: string;
}

export interface HarvestEstimate {
  window: { from: Date; to: Date };
  confidence: Confidence;
  /** What the window is anchored to (best signal available). */
  anchor: 'trichomes' | 'flowering-observed' | 'heuristic';
  /** Whether logged trichomes indicate the plant is in its ripe window now. */
  readyNow: boolean;
  /** The inputs/assumptions that drove this estimate. */
  drivers: string[];
  /** What extra data would sharpen it. */
  missing: string[];
  /** Weather-driven "consider harvesting earlier" cautions — never shift the window silently. */
  cautions: HarvestCaution[];
}

export interface HarvestArgs {
  grow: Grow;
  plant: Plant;
  entries: JournalEntry[];
  weatherRisks?: HarvestWeatherRisk[];
  now?: Date;
}

const DAY = 86_400_000;
const addDays = (d: Date, n: number) => new Date(+d + n * DAY);
const daysBetween = (a: Date, b: Date) => Math.round((+b - +a) / DAY);

export interface TrichomeObservation { stage: TrichomeStage; date: Date }

/** Most recent trichome-check entry for a plant (tagged TRICHOME_TAG + a stage tag). */
export function latestTrichomeCheck(entries: JournalEntry[], plantId: string): TrichomeObservation | null {
  const checks = entries
    .filter((e) => e.plant_id === plantId && e.tags?.includes(TRICHOME_TAG))
    .map((e) => {
      const stage = e.tags.find((t) => (TRICHOME_STAGES as string[]).includes(t)) as TrichomeStage | undefined;
      return stage ? { stage, date: new Date(e.occurred_at) } : null;
    })
    .filter((x): x is TrichomeObservation => x !== null)
    .sort((a, b) => +b.date - +a.date);
  return checks[0] ?? null;
}

/** Earliest logged "Flowering observed" date for this plant (or whole-grow), if any. */
function floweringObservedDate(entries: JournalEntry[], plantId: string): Date | null {
  const flips = entries
    .filter((e) => (e.plant_id === plantId || e.plant_id === null) && e.tags?.includes('Flowering observed'))
    .map((e) => new Date(e.occurred_at))
    .sort((a, b) => +a - +b);
  return flips[0] ?? null;
}

// Trichome-anchored window offsets (days relative to the observation date).
const TRICHOME_WINDOW: Record<TrichomeStage, { from: number; to: number; ready: boolean }> = {
  'Mostly clear': { from: 10, to: 26, ready: false },
  'Mostly cloudy': { from: 2, to: 14, ready: false },
  'Cloudy with some amber': { from: -2, to: 8, ready: true },
  'Mostly amber': { from: -6, to: 3, ready: true },
};

export function estimateHarvest(args: HarvestArgs): HarvestEstimate {
  const { grow, plant, entries } = args;
  const now = args.now ?? new Date();
  const weatherRisks = args.weatherRisks ?? [];

  const trich = latestTrichomeCheck(entries, plant.id);
  const trichRecent = trich !== null && daysBetween(trich.date, now) <= 14 && daysBetween(trich.date, now) >= 0;
  const flowerDate = floweringObservedDate(entries, plant.id);
  const cultivarKnown = !!(plant.cultivar || (grow.cultivars && grow.cultivars.length > 0));
  const auto = grow.photo_type === 'Autoflower';

  const drivers: string[] = [];
  const missing: string[] = [];

  // ---- window ----
  let from: Date;
  let to: Date;
  let anchor: HarvestEstimate['anchor'];
  let readyNow = false;

  if (trich) {
    const w = TRICHOME_WINDOW[trich.stage];
    from = addDays(trich.date, w.from);
    to = addDays(trich.date, w.to);
    readyNow = w.ready;
    anchor = 'trichomes';
    drivers.push(`Latest trichome check: "${trich.stage}" on ${trich.date.toLocaleDateString()}.`);
  } else {
    const flowering = flowerDate ?? estimatedFloweringDate(grow);
    const minD = auto ? 49 : 56;
    const maxD = auto ? 68 : 77;
    from = addDays(flowering, minD);
    to = addDays(flowering, maxD);
    anchor = flowerDate ? 'flowering-observed' : 'heuristic';
    if (flowerDate) {
      drivers.push(`Anchored to your logged "Flowering observed" on ${flowerDate.toLocaleDateString()}, plus a ${auto ? '7–10' : '8–11'}-week flowering range.`);
    } else {
      drivers.push(`Regional heuristic flower onset (~${estimatedFloweringDate(grow).toLocaleDateString()}) plus a ${auto ? '7–10' : '8–11'}-week flowering range — no logged flip yet.`);
    }
  }

  // Health / cultivar widen or annotate the window (never a breeder promise).
  const healthKnown = plant.health != null;
  if (!healthKnown || (plant.health as number) <= 4) {
    from = addDays(from, -3);
    to = addDays(to, 3);
  }
  if (cultivarKnown) {
    drivers.push(`Cultivar noted (${plant.cultivar || grow.cultivars.join(', ')}) — used only as a rough guide, not a breeder countdown.`);
  }
  if (auto) drivers.push('Autoflower: timing runs from the plant\'s own clock, not daylight.');

  // ---- confidence (from real anchoring signals only) ----
  let score = 0;
  if (flowerDate) score += 2;
  if (trich) score += 1;
  if (trichRecent) score += 1;
  const confidence: Confidence = score >= 4 ? 'High' : score >= 2 ? 'Moderate' : 'Low';

  // ---- what would sharpen it ----
  if (!trich) missing.push('No trichome checks logged — the single best ripeness signal. Log one (10–60x loupe) once pistils darken and curl.');
  else if (!trichRecent) missing.push('Your latest trichome check is over two weeks old — log a fresh one; ripeness moves quickly.');
  if (!flowerDate) missing.push('No "Flowering observed" entry — the window rests on a regional heuristic, not this plant\'s actual flip. Log the flip when you see pistils.');
  if (!healthKnown) missing.push('Plant health not recorded — a stressed plant may ripen off-schedule.');
  if (!cultivarKnown) missing.push('Cultivar not set — using a generic photoperiod range rather than a cultivar-typical one.');

  // ---- weather cautions (surfaced, never silently applied) ----
  const cautions: HarvestCaution[] = [];
  for (const r of weatherRisks) {
    if (r.level === 'ok') continue;
    const t = r.title.toLowerCase();
    if (/frost|freeze|cold/.test(t)) {
      cautions.push({
        level: r.level,
        title: 'Frost/cold risk ahead',
        body: 'A hard frost can end the season abruptly. Consider harvesting earlier, or protect the plants, rather than waiting for peak trichomes.',
      });
    } else if (/rain|botrytis|mold|mildew|humid|wet/.test(t)) {
      cautions.push({
        level: r.level,
        title: 'Prolonged wet / bud-rot pressure',
        body: 'Extended moisture in dense buds raises botrytis (bud rot) risk. Inspect dense colas daily and consider harvesting earlier if rot appears.',
      });
    }
  }

  return { window: { from, to }, confidence, anchor, readyNow, drivers, missing, cautions };
}
