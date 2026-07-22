// lib/nutrition.test.ts
import { describe, it, expect } from 'vitest';
import {
  convert, mixSolution, applicationHistory, overlapWarnings, feedAdvisability, fmtMeasure,
} from './nutrition';
import type { JournalEntry } from '../db/types';

let seq = 0;
function entry(over: Partial<JournalEntry> = {}): JournalEntry {
  seq += 1;
  return {
    id: `e${seq}`, grow_id: 'g1', plant_id: 'p1', user_id: 'u1',
    occurred_at: '2026-07-01T12:00:00Z', tags: [], water_vol_gal: null, height_cm: null,
    width_cm: null, nutrients: null, ph: null, ec: null, temp_f: null, rh_pct: null,
    soil_moisture: null, symptoms: null, notes: null, created_at: '2026-07-01T12:00:00Z', ...over,
  };
}

describe('mixSolution', () => {
  it('(a) labels concentrate vs final solution and never returns a bare unitless number', () => {
    const r = mixSolution({ productRate: 2, rateUnit: 'ml/L', solutionVolume: 5, volumeUnit: 'L' });
    // 2 ml/L × 5 L = 10 ml of concentrate
    expect(r.productToAdd).toEqual({ value: 10, unit: 'ml' });
    expect(r.finalSolutionVolume).toEqual({ value: 5, unit: 'L' });
    // both results are labelled Measures, not bare numbers
    expect(typeof r.productToAdd.unit).toBe('string');
    expect(typeof r.finalSolutionVolume.unit).toBe('string');
    // the concentrate/final distinction is explicit
    expect(r.labels.concentrate.toLowerCase()).toContain('concentrate');
    expect(r.labels.finalSolution.toLowerCase()).toContain('final');
    expect(r.assumptions.length).toBeGreaterThan(0);
  });

  it('warns when the rate and batch use different measurement systems', () => {
    const r = mixSolution({ productRate: 2, rateUnit: 'ml/L', solutionVolume: 5, volumeUnit: 'gal' });
    expect(r.warnings.some((w) => w.toLowerCase().includes('mix up units'))).toBe(true);
  });
});

describe('convert', () => {
  it('(b) unit conversions are correct for known inputs, with unit labels', () => {
    expect(convert(1, 'gal', 'oz').value).toBeCloseTo(128, 0);
    expect(convert(1, 'tbsp', 'tsp').value).toBeCloseTo(3, 2);
    expect(convert(1000, 'ml', 'L')).toEqual({ value: 1, unit: 'L' });
    expect(convert(1, 'L', 'ml')).toEqual({ value: 1000, unit: 'ml' });
    // formatted output is never a bare number
    expect(fmtMeasure(convert(1, 'gal', 'L'))).toMatch(/^3\.79 L$/);
  });
});

describe('applicationHistory', () => {
  it('builds a feed timeline plus pH and EC series', () => {
    const entries: JournalEntry[] = [
      entry({ occurred_at: '2026-07-01T00:00:00Z', tags: ['Fed'], nutrients: 'Grow 5-1-1', ph: 6.2, ec: 1.4 }),
      entry({ occurred_at: '2026-07-05T00:00:00Z', tags: ['Watered'], ph: 6.4 }),
      entry({ occurred_at: '2026-07-03T00:00:00Z', tags: ['Fed'], nutrients: 'Bloom 1-3-2', ph: 6.0, ec: 1.8 }),
    ];
    const h = applicationHistory(entries, { plantId: 'p1' });
    expect(h.feeds).toHaveLength(2);              // only Fed / nutrients entries
    expect(h.feeds[0].occurredAt).toBe('2026-07-03T00:00:00Z'); // newest first
    expect(h.phSeries.map((p) => p.y)).toEqual([6.2, 6.0, 6.4]); // chronological
    expect(h.ecSeries).toHaveLength(2);
  });
});

describe('overlapWarnings', () => {
  it('flags overlapping primary nutrients by category, without naming brands', () => {
    const warnings = overlapWarnings([{ name: 'A', npk: '5-1-1' }, { name: 'B', npk: '8-2-2' }, { name: 'C', npk: '1-3-2' }]);
    expect(warnings.some((w) => w.includes('nitrogen-dominant'))).toBe(true);
    // does not echo the user-entered product names
    expect(warnings.join(' ')).not.toContain('A');
    // single nutrient of a kind -> no false overlap for phosphorus
    expect(warnings.some((w) => w.includes('phosphorus'))).toBe(false);
  });
});

describe('feedAdvisability', () => {
  it('(c) returns cautions (never a prescription) and warns on a stressed/waterlogged plant', () => {
    const a = feedAdvisability({ plantHealth: 3, rootZone: 'Waterlogged/soggy', recentWeather: 'Hot', symptoms: 'lower leaves yellow', wilting: true });
    expect(Array.isArray(a.cautions)).toBe(true);
    expect(a.cautions.length).toBeGreaterThan(0);
    expect(a.holdSuggested).toBe(true); // red caution present
    expect(a.cautions.some((c) => /waterlog|anaerobic/i.test(c.title + c.body))).toBe(true);
    // never a prescription: no dosing/"needs X" language anywhere in the output
    const text = JSON.stringify(a).toLowerCase();
    expect(text).not.toMatch(/needs?\s+\d|add\s+\d|feed\s+\d|\d+\s?(ml|tsp|tbsp|oz|gal)\b/);
    expect(a.reminder.toLowerCase()).toContain('cannot tell you what your plant needs');
  });

  it('still nudges toward verification even when nothing is flagged', () => {
    const a = feedAdvisability({ plantHealth: 9, rootZone: 'Moist/healthy', recentWeather: 'Normal' });
    expect(a.holdSuggested).toBe(false);
    expect(a.cautions.length).toBeGreaterThan(0); // an info nudge, not silence
  });
});
