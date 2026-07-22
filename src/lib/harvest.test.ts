// lib/harvest.test.ts
import { describe, it, expect } from 'vitest';
import { estimateHarvest, TRICHOME_TAG, type Confidence } from './harvest';
import type { Grow, Plant, JournalEntry } from '../db/types';

const RANK: Record<Confidence, number> = { Low: 0, Moderate: 1, High: 2 };
const NOW = new Date('2026-09-15T12:00:00Z');

function makeGrow(over: Partial<Grow> = {}): Grow {
  return {
    id: 'g1', user_id: 'u1', name: 'Test grow', location: null, lat: 40.1, lng: -105.1,
    elevation_ft: null, indoor_start: null, outdoor_transplant: '2026-05-20',
    plant_count: 1, cultivars: [], photo_type: 'Photoperiod', container: null, medium: null,
    irrigation: null, sun_exposure: null, protection: null, nutrition_approach: null,
    experience: null, concerns: null, is_sample: false, archived: false,
    created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z', ...over,
  };
}
function makePlant(over: Partial<Plant> = {}): Plant {
  return {
    id: 'p1', grow_id: 'g1', user_id: 'u1', name: 'Plant 1', cultivar: null, source: null,
    start_date: null, transplant_date: null, medium: null, location: null, stage: 'Flowering',
    health: null, archived: false, notes: null,
    created_at: '2026-05-20T00:00:00Z', updated_at: '2026-05-20T00:00:00Z', ...over,
  };
}
let seq = 0;
function entry(over: Partial<JournalEntry> = {}): JournalEntry {
  seq += 1;
  return {
    id: `e${seq}`, grow_id: 'g1', plant_id: 'p1', user_id: 'u1',
    occurred_at: '2026-09-01T00:00:00Z', tags: [], water_vol_gal: null, height_cm: null,
    width_cm: null, nutrients: null, ph: null, ec: null, temp_f: null, rh_pct: null,
    soil_moisture: null, symptoms: null, notes: null, created_at: '2026-09-01T00:00:00Z', ...over,
  };
}
const flowerObserved = () => entry({ occurred_at: '2026-08-12T00:00:00Z', tags: ['Flowering observed'] });
const trichomeCheck = (stage: string, date: string) => entry({ occurred_at: date, tags: [TRICHOME_TAG, stage] });

describe('estimateHarvest — always a range', () => {
  it('(a) returns a window (from < to), never a single date', () => {
    const cases: JournalEntry[][] = [
      [],
      [flowerObserved()],
      [trichomeCheck('Mostly cloudy', '2026-09-10T00:00:00Z')],
      [flowerObserved(), trichomeCheck('Cloudy with some amber', '2026-09-12T00:00:00Z')],
    ];
    for (const entries of cases) {
      const est = estimateHarvest({ grow: makeGrow(), plant: makePlant(), entries, now: NOW });
      expect(est.window.from).toBeInstanceOf(Date);
      expect(est.window.to).toBeInstanceOf(Date);
      expect(+est.window.to).toBeGreaterThan(+est.window.from);
    }
  });
});

describe('estimateHarvest — signals raise confidence', () => {
  it('(b) an actual "Flowering observed" entry raises confidence vs. no entry', () => {
    const base = { grow: makeGrow(), plant: makePlant(), now: NOW };
    const without = estimateHarvest({ ...base, entries: [] });
    const withFlip = estimateHarvest({ ...base, entries: [flowerObserved()] });
    expect(RANK[withFlip.confidence]).toBeGreaterThan(RANK[without.confidence]);
    expect(withFlip.anchor).toBe('flowering-observed');
    expect(without.anchor).toBe('heuristic');
  });

  it('a recent trichome check anchors to trichomes and, with a flip, reaches High', () => {
    const est = estimateHarvest({
      grow: makeGrow(), plant: makePlant({ health: 8, cultivar: 'Durban' }), now: NOW,
      entries: [flowerObserved(), trichomeCheck('Cloudy with some amber', '2026-09-12T00:00:00Z')],
    });
    expect(est.anchor).toBe('trichomes');
    expect(est.readyNow).toBe(true);
    expect(est.confidence).toBe('High');
  });
});

describe('estimateHarvest — missing data', () => {
  it('(c) thin data lowers confidence and populates the "what\'s missing" list', () => {
    const sparse = estimateHarvest({ grow: makeGrow({ cultivars: [] }), plant: makePlant({ health: null, cultivar: null }), entries: [], now: NOW });
    expect(sparse.confidence).toBe('Low');
    expect(sparse.missing.length).toBeGreaterThan(0);
    const joined = sparse.missing.join(' ').toLowerCase();
    expect(joined).toContain('trichome');
    expect(joined).toContain('flowering observed');

    // richer input both raises confidence and shrinks the missing list
    const rich = estimateHarvest({
      grow: makeGrow({ cultivars: ['Durban'] }), plant: makePlant({ health: 8, cultivar: 'Durban' }), now: NOW,
      entries: [flowerObserved(), trichomeCheck('Mostly cloudy', '2026-09-13T00:00:00Z')],
    });
    expect(RANK[rich.confidence]).toBeGreaterThan(RANK[sparse.confidence]);
    expect(rich.missing.length).toBeLessThan(sparse.missing.length);
  });
});

describe('estimateHarvest — weather cautions', () => {
  it('surfaces frost and wet risks as cautions without shifting the window', () => {
    const entries = [flowerObserved()];
    const plain = estimateHarvest({ grow: makeGrow(), plant: makePlant(), entries, now: NOW });
    const withRisk = estimateHarvest({
      grow: makeGrow(), plant: makePlant(), entries, now: NOW,
      weatherRisks: [{ title: 'Cold / frost', level: 'red' }, { title: 'Heavy rain', level: 'amber' }],
    });
    expect(withRisk.cautions.length).toBe(2);
    // cautions are additive — the window is identical to the no-risk case
    expect(+withRisk.window.from).toBe(+plain.window.from);
    expect(+withRisk.window.to).toBe(+plain.window.to);
  });
});
