// lib/derive.ts
// Pure derivation over DB rows — the Phase-1 "intelligence" logic, now typed
// against Supabase rows and generalized off the hardcoded demo date.
// Everything here is a pure function of (grow, plants, entries, weatherRisks).

import type { Grow, JournalEntry, Stage } from '../db/types';

export const STAGES: Stage[] = ['Seedling', 'Vegetative', 'Pre-flower', 'Flowering', 'Late flower', 'Harvest'];
const DAY = 86_400_000;

export function daysBetween(a: string | Date, b: string | Date) {
  return Math.round((+new Date(b) - +new Date(a)) / DAY);
}
export function daysSinceTransplant(grow: Grow, now: Date = new Date()) {
  return grow.outdoor_transplant ? daysBetween(grow.outdoor_transplant, now) : 0;
}

export function estimateStage(grow: Grow, entries: JournalEntry[], now: Date = new Date()): { stage: Stage; idx: number } {
  const flowered = entries.some((e) => e.tags?.includes('Flowering observed'));
  const d = daysSinceTransplant(grow, now);
  let idx: number;
  if (flowered) idx = 3;
  else if (d > 78) idx = 2;
  else if (d > 18) idx = 1;
  else idx = 0;
  return { stage: STAGES[idx], idx };
}

// Heuristic Front Range photoperiod estimates — refined later by the Harvest
// Planner from real flowering + trichome observations. Labeled as estimates in UI.
function growYear(grow: Grow) {
  return grow.outdoor_transplant ? new Date(grow.outdoor_transplant).getFullYear() : new Date().getFullYear();
}
export function estimatedFloweringDate(grow: Grow) {
  return new Date(growYear(grow), 7, 12); // ~Aug 12
}
export function daysUntilFlowering(grow: Grow, entries: JournalEntry[], now: Date = new Date()) {
  if (entries.some((e) => e.tags?.includes('Flowering observed'))) return 0;
  const d = daysBetween(now, estimatedFloweringDate(grow));
  return d > 0 ? d : 0;
}
export function harvestWindow(grow: Grow) {
  const y = growYear(grow);
  return { from: new Date(y, 9, 4), to: new Date(y, 9, 20) }; // ~Oct 4–20
}

export interface PlanMilestone { label: string; date: Date | null; note: string }
/** Starting cultivation plan for a new grow — Front Range heuristics, not a promise. */
export function growPlan(grow: Grow): PlanMilestone[] {
  const transplant = grow.outdoor_transplant ? new Date(grow.outdoor_transplant) : null;
  const flower = estimatedFloweringDate(grow);
  const hw = harvestWindow(grow);
  const preFlowerScouting = new Date(flower);
  preFlowerScouting.setDate(preFlowerScouting.getDate() - 21);
  return [
    { label: 'Outdoor transplant', date: transplant, note: transplant ? 'Set — hardened-off plants moved outside.' : 'Not set yet — add a transplant date on My Grow.' },
    { label: 'Pre-flower scouting begins', date: preFlowerScouting, note: 'Heuristic — start checking for early pre-flower signs about 3 weeks before estimated flower onset.' },
    { label: 'Estimated flower onset', date: flower, note: 'Heuristic based on Front Range daylight, not this grow’s actual photoperiod response. Log a "Flowering observed" entry once you see it.' },
    { label: 'Estimated harvest window', date: hw.from, note: `Range, not a date: ${fmtShort(hw.from)}–${fmtShort(hw.to)}. Refine with real trichome checks once the Harvest Planner ships.` },
  ];
}

export function plantEntries(entries: JournalEntry[], plantId: string) {
  return entries
    .filter((e) => e.plant_id === plantId)
    .sort((a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at));
}
export function latestHeightCm(entries: JournalEntry[], plantId: string): number | null {
  const es = plantEntries(entries, plantId).filter((e) => e.height_cm != null);
  return es.length ? (es[es.length - 1].height_cm as number) : null;
}
export function heightSeries(entries: JournalEntry[], plantId: string) {
  return plantEntries(entries, plantId)
    .filter((e) => e.height_cm != null)
    .map((e) => ({ x: e.occurred_at, y: e.height_cm as number }));
}

export interface RiskInput { title: string; level: 'red' | 'amber' | 'ok'; advice?: string }
export interface Alert { level: 'red' | 'amber' | 'ok'; title: string; body: string }

export function computeAlerts(grow: Grow, entries: JournalEntry[], weatherRisks: RiskInput[] = [], now: Date = new Date()): Alert[] {
  const out: Alert[] = [];
  for (const r of weatherRisks.filter((r) => r.level !== 'ok')) {
    out.push({ level: r.level, title: r.title, body: r.advice ?? '' });
  }
  const pest = [...entries].reverse().find((e) => e.tags?.includes('Pest found'));
  if (pest) {
    out.push({
      level: 'amber',
      title: 'Pest observed — monitor',
      body: `Logged ${new Date(pest.occurred_at).toLocaleDateString()}. Re-scout leaf undersides in 3–4 days before deciding on any intervention.`,
    });
  }
  const duf = daysUntilFlowering(grow, entries, now);
  if (duf > 0 && duf <= 28) {
    out.push({
      level: 'ok',
      title: 'Flowering transition approaching',
      body: `~${duf} days to estimated flower onset. Begin pre-flower scouting and support planning.`,
    });
  }
  return out;
}

export interface Task { title: string; sub: string; when: string }
export function upcomingTasks(_grow: Grow, entries: JournalEntry[], weatherRisks: RiskInput[] = []): Task[] {
  const tasks: Task[] = [];
  if (weatherRisks.some((r) => /wind/i.test(r.title) && r.level !== 'ok')) {
    tasks.push({ title: 'Inspect stakes & supports', sub: 'Before forecast high wind', when: 'Soon' });
  }
  const pest = [...entries].reverse().find((e) => e.tags?.includes('Pest found'));
  if (pest) tasks.push({ title: 'Re-scout leaf undersides', sub: 'Follow-up on last pest note', when: 'In 3 days' });
  tasks.push({ title: 'Verify drip runtime vs. soil moisture', sub: 'Confirm by hand before adjusting', when: 'This week' });
  return tasks;
}

export function riskLevel(weatherRisks: RiskInput[]): { label: string; cls: 'red' | 'amber' | 'ok' } {
  if (weatherRisks.some((r) => r.level === 'red')) return { label: 'High', cls: 'red' };
  if (weatherRisks.some((r) => r.level === 'amber')) return { label: 'Elevated', cls: 'amber' };
  return { label: 'Low', cls: 'ok' };
}

// ---- formatting ----
// US imperial is the default and only unit shown, unless the user has chosen
// 'metric' in their profile. Metric may remain the canonical STORAGE unit
// (e.g. height_cm) but is never displayed by default.
export type Units = 'imperial' | 'metric';
const GAL_PER_L = 0.2641720524;

export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (inches: number) => inches * 2.54;
/** Convert a length typed in the user's preferred unit into the canonical cm for storage. */
export const heightInputToCm = (value: number, units: Units) => (units === 'imperial' ? inToCm(value) : value);
/** The label for length inputs in the user's units. */
export const lengthUnit = (units: Units) => (units === 'imperial' ? 'in' : 'cm');
/** A canonical-cm value rendered as a NUMBER in the user's input unit (for controlled inputs). */
export function cmToLengthInput(cm: number, units: Units): number {
  const v = units === 'imperial' ? cmToIn(cm) : cm;
  return Math.round(v * 10) / 10;
}

export function fmtHeight(cm: number | null, units: Units) {
  if (cm == null) return '—';
  const v = units === 'imperial' ? cmToIn(cm) : cm;
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units === 'imperial' ? 'in' : 'cm'}`;
}
/** Length for general display: inches, switching to feet once large; cm only if metric. */
export function fmtLength(cm: number | null, units: Units = 'imperial') {
  if (cm == null) return '—';
  if (units === 'metric') return `${Math.round(cm)} cm`;
  const inches = cm / 2.54;
  if (inches >= 24) return `${(inches / 12).toFixed(1)} ft`;
  return `${inches.toFixed(inches < 10 ? 1 : 0)} in`;
}
/** Volume for display: gallons by default; litres only if metric. Input is gallons (canonical). */
export function fmtVolume(gallons: number | null, units: Units = 'imperial') {
  if (gallons == null) return '—';
  if (units === 'metric') return `${(gallons / GAL_PER_L).toFixed(1)} L`;
  return `${Math.round(gallons * 100) / 100} gal`;
}
/** Temperature for display: °F by default; °C only if metric. Input is °F (canonical). */
export function fmtTemp(f: number | null, units: Units = 'imperial') {
  if (f == null) return '—';
  if (units === 'metric') return `${Math.round(((f - 32) * 5) / 9)}°C`;
  return `${Math.round(f)}°F`;
}
export const fmtShort = (d: string | Date) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const fmtDateTime = (d: string | Date) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
