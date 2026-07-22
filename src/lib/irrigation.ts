// lib/irrigation.ts
// PURE irrigation calculators. No I/O, no randomness — deterministic functions
// of their inputs, fully unit-testable.
//
// HARD RULE: the app cannot know a plant's actual water need without a physical
// soil check. Nothing here outputs a prescriptive "your plant needs X gallons"
// or a schedule. The calculators describe hardware output, container capacity,
// and what you have ALREADY logged; demand context is qualitative text only.
// Every result defers to a hand check of the root zone. Rain reduces but never
// replaces inspection.

import type { JournalEntry } from '../db/types';

const L_PER_GAL = 3.78541;
const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

/** How-to shown next to every calculated number — the real source of truth. */
export const SOIL_CHECK_HOWTO: string[] = [
  'Probe 5–8 cm into the root zone — is it moist or dry at that depth?',
  'Lift or heft the container — a light pot is dry; a heavy one still holds water.',
  'Look for even wetting across the surface and some drainage from the bottom.',
  'When unsure, wait and re-check — overwatering harms roots as much as underwatering.',
];

// ---------- emitter output ----------
export interface EmitterInput {
  emitterCount: number;
  flowRateGph: number;      // gallons per hour, per emitter
  runtimeMinutes: number;
}
/** Gallons a drip/emitter setup DELIVERS for a given runtime (hardware math, not a need). */
export function emitterOutput({ emitterCount, flowRateGph, runtimeMinutes }: EmitterInput): number {
  const g = (emitterCount || 0) * (flowRateGph || 0) * ((runtimeMinutes || 0) / 60);
  return round(Math.max(0, g), 3);
}

// ---------- container volume ----------
export type ContainerShape = 'cylinder' | 'rectangular';
export interface ContainerInput {
  shape: ContainerShape;
  diameterCm?: number;   // cylinder
  lengthCm?: number;     // rectangular
  widthCm?: number;      // rectangular
  heightCm: number;      // fill depth of medium
}
export interface ContainerVolume {
  liters: number;
  gallons: number;
  /** Rough plant-available water the root zone can hold — an ESTIMATE, stated as such. */
  rootZoneHoldingGalEstimate: number;
  assumption: string;
}

// Fraction of container volume held as plant-available water at field capacity
// for a typical potting mix. A rough planning figure only — real media vary widely.
const AVAILABLE_WATER_FRACTION = 0.25;

export function containerVolume(input: ContainerInput): ContainerVolume {
  const h = Math.max(0, input.heightCm || 0);
  let cm3 = 0;
  if (input.shape === 'cylinder') {
    const r = Math.max(0, (input.diameterCm || 0) / 2);
    cm3 = Math.PI * r * r * h;
  } else {
    cm3 = Math.max(0, input.lengthCm || 0) * Math.max(0, input.widthCm || 0) * h;
  }
  const liters = cm3 / 1000;
  const gallons = liters / L_PER_GAL;
  return {
    liters: round(liters, 1),
    gallons: round(gallons, 2),
    rootZoneHoldingGalEstimate: round(gallons * AVAILABLE_WATER_FRACTION, 2),
    assumption: `Assumes about ${Math.round(AVAILABLE_WATER_FRACTION * 100)}% of the container volume is plant-available water at field capacity for a typical potting mix. Real media differ a lot — treat this as a rough ceiling, not a target, and confirm by hand.`,
  };
}

// ---------- weekly totals from the journal ----------
export interface WeekTotal { weekStart: string; gallons: number }

function mondayOf(dateStr: string): string {
  const dt = new Date(dateStr);
  const dow = (dt.getDay() + 6) % 7; // 0 = Monday
  dt.setDate(dt.getDate() - dow);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

/** Gallons per ISO week from logged entries that actually recorded a water volume. */
export function weeklyTotals(entries: JournalEntry[], opts?: { plantId?: string }): WeekTotal[] {
  const byWeek = new Map<string, number>();
  for (const e of entries) {
    if (e.water_vol_gal == null) continue;                    // only real irrigation events
    if (opts?.plantId && e.plant_id !== opts.plantId) continue;
    const wk = mondayOf(e.occurred_at);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + e.water_vol_gal);
  }
  return Array.from(byWeek.entries())
    .map(([weekStart, gallons]) => ({ weekStart, gallons: round(gallons, 2) }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// ---------- planned vs. actual ----------
export interface PlannedVsActualInput {
  plannedGalPerEvent: number;
  eventsPerWeek: number;
  entries: JournalEntry[];
  plantId?: string;
  now?: Date;
}
export interface PlannedVsActual {
  plannedWeeklyGal: number;
  actualLast7DaysGal: number;
  differenceGal: number;   // actual - planned (positive = you watered more than planned)
  note: string;
}

const DAY = 86_400_000;
export function plannedVsActual(input: PlannedVsActualInput): PlannedVsActual {
  const now = input.now ?? new Date();
  const since = +now - 7 * DAY;
  let actual = 0;
  for (const e of input.entries) {
    if (e.water_vol_gal == null) continue;
    if (input.plantId && e.plant_id !== input.plantId) continue;
    if (+new Date(e.occurred_at) < since) continue;
    actual += e.water_vol_gal;
  }
  const planned = (input.plannedGalPerEvent || 0) * (input.eventsPerWeek || 0);
  const actualR = round(actual, 2);
  const plannedR = round(planned, 2);
  const diff = round(actualR - plannedR, 2);
  const gap = Math.abs(diff);
  const note = plannedR === 0
    ? `You logged ${actualR} gal over the last 7 days. Set a plan above to compare — and remember the root zone, not the plan, is the real guide.`
    : `Last 7 days: ${actualR} gal logged vs. a plan of ~${plannedR} gal/week — ${gap} gal ${diff >= 0 ? 'more' : 'less'} than planned. This is a bookkeeping gap, not a verdict: only a hand check of the soil says whether it was too much, too little, or fine.`;
  return { plannedWeeklyGal: plannedR, actualLast7DaysGal: actualR, differenceGal: diff, note };
}

// ---------- qualitative demand context ----------
export interface DemandRisk { title: string; level: 'red' | 'amber' | 'ok'; advice?: string }
export interface DemandDay { hi?: number; precip?: number; gust?: number }
export interface DemandContextInput { weatherRisks?: DemandRisk[]; days?: DemandDay[] }

/**
 * A QUALITATIVE read on what recent/near weather does to water demand — never a
 * number of gallons. It always ends by deferring to a physical soil check.
 */
export function demandContext(input: DemandContextInput): { notes: string[] } {
  const notes: string[] = [];
  const risks = input.weatherRisks ?? [];
  const days = input.days ?? [];
  const hasRisk = (re: RegExp) => risks.some((r) => r.level !== 'ok' && re.test(r.title.toLowerCase()));

  const hot = hasRisk(/heat|hot/) || days.some((d) => (d.hi ?? 0) >= 90);
  const dry = hasRisk(/low humidity|humidity|dry/);
  const windy = hasRisk(/wind/) || days.some((d) => (d.gust ?? 0) >= 30);
  const wet = hasRisk(/rain|heavy rain|wet/) || days.some((d) => (d.precip ?? 0) >= 0.25);

  if (hot) notes.push('Recent or expected heat raises water demand — check the root zone deeper before adding runtime, rather than assuming.');
  if (dry) notes.push('Low humidity speeds transpiration, so the surface can mislead — feel the soil below it.');
  if (windy) notes.push('Wind dries plants and medium faster; verify by hand before and after windy spells.');
  if (wet) notes.push('Recent rain reduces watering need but does not replace inspection — probe the root zone before adding any water.');
  if (notes.length === 0) notes.push('No strong weather driver right now. Let the soil, not the calendar, set your timing.');

  notes.push('Whatever the weather, a hand check of the root zone is the deciding signal.');
  return { notes };
}
