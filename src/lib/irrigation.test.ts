// lib/irrigation.test.ts
import { describe, it, expect } from 'vitest';
import { emitterOutput, containerVolume, weeklyTotals, plannedVsActual, demandContext } from './irrigation';
import type { JournalEntry } from '../db/types';

let seq = 0;
function entry(over: Partial<JournalEntry> = {}): JournalEntry {
  seq += 1;
  return {
    id: `e${seq}`, grow_id: 'g1', plant_id: 'p1', user_id: 'u1',
    occurred_at: '2026-07-01T12:00:00Z', tags: ['Watered'], water_vol_gal: null, height_cm: null,
    width_cm: null, nutrients: null, ph: null, ec: null, temp_f: null, rh_pct: null,
    soil_moisture: null, symptoms: null, notes: null, created_at: '2026-07-01T12:00:00Z', ...over,
  };
}

describe('emitterOutput', () => {
  it('(a) computes delivered gallons correctly for known inputs', () => {
    expect(emitterOutput({ emitterCount: 4, flowRateGph: 1, runtimeMinutes: 30 })).toBe(2);
    expect(emitterOutput({ emitterCount: 2, flowRateGph: 0.5, runtimeMinutes: 60 })).toBe(1);
    expect(emitterOutput({ emitterCount: 6, flowRateGph: 2, runtimeMinutes: 15 })).toBe(3);
    expect(emitterOutput({ emitterCount: 0, flowRateGph: 2, runtimeMinutes: 60 })).toBe(0);
  });
});

describe('containerVolume', () => {
  it('computes cylinder and rectangular volume and always states an assumption', () => {
    // 20 cm diameter × 30 cm tall cylinder ≈ 9.42 L ≈ 2.49 gal
    const cyl = containerVolume({ shape: 'cylinder', diameterCm: 20, heightCm: 30 });
    expect(cyl.liters).toBeCloseTo(9.4, 1);
    expect(cyl.gallons).toBeCloseTo(2.49, 1);
    expect(cyl.rootZoneHoldingGalEstimate).toBeLessThan(cyl.gallons); // a fraction of total
    expect(cyl.assumption.length).toBeGreaterThan(0);

    // 40×30×25 cm bed = 30 L
    const rect = containerVolume({ shape: 'rectangular', lengthCm: 40, widthCm: 30, heightCm: 25 });
    expect(rect.liters).toBeCloseTo(30, 1);
  });
});

describe('weeklyTotals', () => {
  it('(b) sums only entries with water_vol_gal, grouped into the right week', () => {
    const entries: JournalEntry[] = [
      entry({ occurred_at: '2026-07-01T10:00:00Z', water_vol_gal: 2 }),   // week of Mon Jun 29
      entry({ occurred_at: '2026-07-03T10:00:00Z', water_vol_gal: 1.5 }), // same week
      entry({ occurred_at: '2026-07-08T10:00:00Z', water_vol_gal: 3 }),   // week of Mon Jul 6
      entry({ occurred_at: '2026-07-09T10:00:00Z', water_vol_gal: null }), // ignored (no volume)
      entry({ occurred_at: '2026-07-02T10:00:00Z', water_vol_gal: 1, plant_id: 'other' }), // filtered out below
    ];
    const totals = weeklyTotals(entries, { plantId: 'p1' });
    expect(totals).toHaveLength(2);
    expect(totals[0]).toEqual({ weekStart: '2026-06-29', gallons: 3.5 });
    expect(totals[1]).toEqual({ weekStart: '2026-07-06', gallons: 3 });
    // the null-volume entry and the other-plant entry contributed nothing
    const grandTotal = totals.reduce((s, w) => s + w.gallons, 0);
    expect(grandTotal).toBe(6.5);
  });
});

describe('plannedVsActual', () => {
  it('reports the gap without prescribing a need', () => {
    const now = new Date('2026-07-10T12:00:00Z');
    const entries: JournalEntry[] = [
      entry({ occurred_at: '2026-07-08T10:00:00Z', water_vol_gal: 4 }),
      entry({ occurred_at: '2026-07-05T10:00:00Z', water_vol_gal: 3 }),
      entry({ occurred_at: '2026-06-01T10:00:00Z', water_vol_gal: 99 }), // outside 7-day window
    ];
    const r = plannedVsActual({ plannedGalPerEvent: 2, eventsPerWeek: 3, entries, plantId: 'p1', now });
    expect(r.actualLast7DaysGal).toBe(7);
    expect(r.plannedWeeklyGal).toBe(6);
    expect(r.differenceGal).toBe(1);
    expect(r.note.toLowerCase()).toContain('hand check');
  });
});

describe('demandContext', () => {
  it('(c) returns qualitative text only — no prescriptive gallon figures', () => {
    const out = demandContext({
      weatherRisks: [{ title: 'Extreme heat', level: 'amber' }, { title: 'Heavy rain', level: 'red' }],
      days: [{ hi: 96, precip: 0.5, gust: 35 }],
    });
    expect(Array.isArray(out.notes)).toBe(true);
    expect(out.notes.every((n) => typeof n === 'string' && n.length > 0)).toBe(true);
    // qualitative only: no digits anywhere (so no "needs X gallons")
    expect(out.notes.join(' ')).not.toMatch(/\d/);
    // and it always defers to a physical check
    expect(out.notes.join(' ').toLowerCase()).toContain('hand check');
  });

  it('gives a neutral note when there is no strong driver', () => {
    const out = demandContext({ weatherRisks: [{ title: 'Extreme heat', level: 'ok' }], days: [] });
    expect(out.notes.join(' ').toLowerCase()).toContain('soil');
  });
});
