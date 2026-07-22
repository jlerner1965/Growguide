// lib/nutrition.ts
// PURE nutrition/mixing logic. No I/O, no randomness — deterministic functions
// of their inputs, fully unit-testable.
//
// HARD RULES: never recommend a specific product, brand, or feeding schedule;
// never output "your plant needs X" (the app cannot know). Every calculation
// states its units and assumptions and never returns a bare unitless number.
// Least-aggressive-first: verify pH/EC and the root zone before feeding.

import type { JournalEntry } from '../db/types';

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

// ---------- units ----------
export type VolumeUnit = 'ml' | 'L' | 'tsp' | 'tbsp' | 'oz' | 'gal';
export interface Measure { value: number; unit: VolumeUnit }

// Every unit expressed in millilitres.
const ML: Record<VolumeUnit, number> = {
  ml: 1, L: 1000, tsp: 4.928922, tbsp: 14.786765, oz: 29.573530, gal: 3785.411784,
};
const METRIC = new Set<VolumeUnit>(['ml', 'L']);
const systemOf = (u: VolumeUnit): 'metric' | 'imperial' => (METRIC.has(u) ? 'metric' : 'imperial');

/** Convert a value between volume units. Always returns a labelled Measure — never a bare number. */
export function convert(value: number, from: VolumeUnit, to: VolumeUnit): Measure {
  const ml = (value || 0) * ML[from];
  return { value: round(ml / ML[to], 4), unit: to };
}
/** A human-readable measure, e.g. "12.5 ml". Never a bare number. */
export function fmtMeasure(m: Measure): string {
  return `${round(m.value, 2)} ${m.unit}`;
}

// ---------- mix calculator ----------
export type RateUnit = `${VolumeUnit}/${VolumeUnit}`;
export interface MixInput {
  productRate: number;      // amount of product per one "per" unit
  rateUnit: RateUnit;       // e.g. "ml/L" or "tsp/gal" (amountUnit/perUnit)
  solutionVolume: number;   // the batch you're mixing
  volumeUnit: VolumeUnit;
}
export interface MixResult {
  /** The concentrate you ADD to the batch. */
  productToAdd: Measure;
  /** The FINAL mixed solution volume the product goes into. */
  finalSolutionVolume: Measure;
  ratePerUnit: string;
  labels: { concentrate: string; finalSolution: string };
  assumptions: string[];
  warnings: string[];
}

function parseRate(rateUnit: RateUnit): { amountUnit: VolumeUnit; perUnit: VolumeUnit } | null {
  const [a, p] = rateUnit.split('/') as [VolumeUnit, VolumeUnit];
  if (!(a in ML) || !(p in ML)) return null;
  return { amountUnit: a, perUnit: p };
}

export function mixSolution(input: MixInput): MixResult {
  const parsed = parseRate(input.rateUnit);
  const assumptions: string[] = [];
  const warnings: string[] = [];

  if (!parsed) {
    return {
      productToAdd: { value: 0, unit: 'ml' },
      finalSolutionVolume: { value: round(input.solutionVolume || 0, 2), unit: input.volumeUnit },
      ratePerUnit: `${input.productRate} ${input.rateUnit}`,
      labels: { concentrate: 'Product (concentrate) to add', finalSolution: 'Final mixed solution volume' },
      assumptions,
      warnings: ['The rate unit could not be understood — expected something like "ml/L" or "tsp/gal".'],
    };
  }

  const { amountUnit, perUnit } = parsed;
  // How many "per" units are in the batch, then multiply by the rate.
  const perUnits = convert(input.solutionVolume, input.volumeUnit, perUnit).value;
  const totalAmount = (input.productRate || 0) * perUnits;

  assumptions.push('The product is added TO the stated final solution volume (dilution), and the product\'s own volume is treated as negligible next to the batch.');
  assumptions.push('This is arithmetic from the rate you entered — the product\'s label, not this tool, is the source of the correct rate.');

  // Unit-confusion check: rate expressed in a different measurement system than the batch.
  if (systemOf(perUnit) !== systemOf(input.volumeUnit)) {
    warnings.push(`Your rate is per ${perUnit} but your batch is in ${input.volumeUnit} — different measurement systems. Double-check you didn't mix up units.`);
  }
  if (systemOf(amountUnit) !== systemOf(perUnit)) {
    warnings.push(`Your rate mixes ${amountUnit} with ${perUnit} — unusual. Confirm the label actually reads that way.`);
  }

  return {
    productToAdd: { value: round(totalAmount, 3), unit: amountUnit },
    finalSolutionVolume: { value: round(input.solutionVolume || 0, 2), unit: input.volumeUnit },
    ratePerUnit: `${input.productRate} ${amountUnit} per 1 ${perUnit}`,
    labels: { concentrate: 'Product (concentrate) to add', finalSolution: 'Final mixed solution volume' },
    assumptions,
    warnings,
  };
}

// ---------- application history ----------
export interface FeedEvent {
  id: string; occurredAt: string; nutrients: string | null;
  waterVolGal: number | null; ph: number | null; ec: number | null;
}
export interface ApplicationHistory {
  feeds: FeedEvent[];
  phSeries: { x: string; y: number }[];
  ecSeries: { x: string; y: number }[];
}
export function applicationHistory(entries: JournalEntry[], opts?: { plantId?: string }): ApplicationHistory {
  const scoped = entries.filter((e) => (opts?.plantId ? e.plant_id === opts.plantId : true));
  const feeds: FeedEvent[] = scoped
    .filter((e) => e.tags?.includes('Fed') || e.nutrients != null)
    .map((e) => ({ id: e.id, occurredAt: e.occurred_at, nutrients: e.nutrients, waterVolGal: e.water_vol_gal, ph: e.ph, ec: e.ec }))
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  const asc = [...scoped].sort((a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at));
  const phSeries = asc.filter((e) => e.ph != null).map((e) => ({ x: e.occurred_at, y: e.ph as number }));
  const ecSeries = asc.filter((e) => e.ec != null).map((e) => ({ x: e.occurred_at, y: e.ec as number }));
  return { feeds, phSeries, ecSeries };
}

// ---------- overlap warnings ----------
export interface ProductInput { name?: string; npk?: string }

type Dominant = 'nitrogen' | 'phosphorus' | 'potassium' | 'cal-mag' | 'unknown';

function dominantNutrient(p: ProductInput): Dominant {
  const npk = (p.npk ?? '').match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/);
  if (npk) {
    const [n, ph, k] = [Number(npk[1]), Number(npk[2]), Number(npk[3])];
    const max = Math.max(n, ph, k);
    if (max > 0) {
      if (n === max) return 'nitrogen';
      if (ph === max) return 'phosphorus';
      return 'potassium';
    }
  }
  const name = (p.name ?? '').toLowerCase();
  if (/cal[\s-]?mag|calcium|magnesium/.test(name)) return 'cal-mag';
  if (/nitrogen|grow|veg/.test(name)) return 'nitrogen';
  if (/bloom|flower|phosph|\bpk\b/.test(name)) return 'phosphorus';
  if (/potassium|\bk\b/.test(name)) return 'potassium';
  return 'unknown';
}

/** Flags likely overlap when several inputs are dominant in the same nutrient. Categories only — no brands. */
export function overlapWarnings(products: ProductInput[]): string[] {
  const counts: Record<Dominant, number> = { nitrogen: 0, phosphorus: 0, potassium: 0, 'cal-mag': 0, unknown: 0 };
  for (const p of products) counts[dominantNutrient(p)] += 1;
  const label: Record<Dominant, string> = {
    nitrogen: 'nitrogen-dominant', phosphorus: 'phosphorus-dominant', potassium: 'potassium-dominant',
    'cal-mag': 'calcium/magnesium', unknown: 'unclassified',
  };
  const out: string[] = [];
  (['nitrogen', 'phosphorus', 'potassium', 'cal-mag'] as Dominant[]).forEach((k) => {
    if (counts[k] >= 2) out.push(`${counts[k]} inputs look ${label[k]} — they may overlap. Confirm you are not stacking the same primary nutrient.`);
  });
  return out;
}

// ---------- feed advisability (cautions, never a prescription) ----------
export interface FeedAdvisabilityInput {
  plantHealth?: number | null;
  recentWeather?: string | null;
  rootZone?: string | null;
  symptoms?: string | null;
  wilting?: boolean;
}
export interface FeedCaution { level: 'red' | 'amber' | 'info'; title: string; body: string }
export interface FeedAdvisability {
  cautions: FeedCaution[];
  holdSuggested: boolean; // true if any red caution
  reminder: string;
}

export function feedAdvisability(input: FeedAdvisabilityInput): FeedAdvisability {
  const cautions: FeedCaution[] = [];
  const rz = (input.rootZone ?? '').toLowerCase();
  const wx = (input.recentWeather ?? '').toLowerCase();
  const sym = (input.symptoms ?? '').toLowerCase();

  if (/waterlog|soggy|foul|smell/.test(rz)) {
    cautions.push({ level: 'red', title: 'Waterlogged / anaerobic root zone', body: 'Do not feed a soggy or foul-smelling root zone — fix drainage first. Adding nutrients to struggling roots concentrates salts and makes it worse.' });
  }
  if (input.wilting) {
    cautions.push({ level: 'red', title: 'Plant is wilting', body: 'A wilting plant has a water or root problem first. Resolve that before feeding; nutrients will not fix wilt and may add stress.' });
  }
  if (input.plantHealth != null && input.plantHealth <= 4) {
    cautions.push({ level: 'amber', title: `Plant looks stressed (health ${input.plantHealth}/10)`, body: 'Feeding a stressed plant often deepens the stress. Stabilize conditions first, then reassess.' });
  }
  if (/hot|heat/.test(wx)) {
    cautions.push({ level: 'amber', title: 'Recent heat stress', body: 'In a heat wave, water demand comes first. Hold heavy feeding until the plant is not heat-stressed.' });
  }
  if (/cold|frost/.test(wx)) {
    cautions.push({ level: 'amber', title: 'Recent cold', body: 'Cold slows nutrient uptake; feeding into a cold-stalled plant risks salt buildup in the root zone.' });
  }
  if (/yellow|chloros|pale|spot|burn|deficien/.test(sym)) {
    cautions.push({ level: 'info', title: 'Yellowing is not automatically a deficiency', body: 'Lower-leaf yellowing late in the season is often natural senescence, and pH lockout mimics a deficiency even when nutrients are present. Check pH/EC and which leaves are affected before feeding.' });
  }
  if (cautions.length === 0) {
    cautions.push({ level: 'info', title: 'No obvious reason to hold off', body: 'Nothing here flags a problem — but feeding is still a last step, not a default. Confirm pH/EC and root-zone condition first.' });
  }

  return {
    cautions,
    holdSuggested: cautions.some((c) => c.level === 'red'),
    reminder: 'Least-aggressive first: verify root-zone pH and EC and the physical soil condition before adding nutrients. This tool cannot tell you what your plant needs — it only flags reasons to be cautious.',
  };
}
