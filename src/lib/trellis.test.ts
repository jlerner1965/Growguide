// lib/trellis.test.ts
import { describe, it, expect } from 'vitest';
import { planTrellis, type TrellisInput, type MaterialItem } from './trellis';

const BASE: TrellisInput = {
  plantCount: 6,
  plantHeightCm: 120,
  plantWidthCm: 60,
  expectedExpansionPct: 0,
  postSpacingCm: 120,
  availablePostHeightCm: 200,
  netWidthCm: 120,
  netHeightCm: 150,
  rowLengthCm: 100, // deliberately small so the plant run dominates
};

const qty = (mats: MaterialItem[], item: string) => mats.find((m) => m.item === item)?.quantity ?? 0;

describe('planTrellis — canopy expansion', () => {
  it('(a) expected expansion increases the required span and materials', () => {
    const none = planTrellis({ ...BASE, expectedExpansionPct: 0 });
    const grown = planTrellis({ ...BASE, expectedExpansionPct: 50 });

    expect(grown.layout.futureCanopyWidthCm).toBeGreaterThan(none.layout.futureCanopyWidthCm);
    expect(grown.layout.totalRowLengthCm).toBeGreaterThan(none.layout.totalRowLengthCm);
    expect(grown.layout.postCount).toBeGreaterThan(none.layout.postCount);
    expect(grown.layout.netPanelCount).toBeGreaterThan(none.layout.netPanelCount);
    expect(qty(grown.materials, 'Trellis netting (total run)')).toBeGreaterThan(qty(none.materials, 'Trellis netting (total run)'));
  });
});

describe('planTrellis — materials scale with inputs', () => {
  it('(b) quantities scale with plant count', () => {
    const few = planTrellis({ ...BASE, plantCount: 4 });
    const many = planTrellis({ ...BASE, plantCount: 10 });
    expect(many.layout.totalRowLengthCm).toBeGreaterThan(few.layout.totalRowLengthCm);
    expect(many.layout.postCount).toBeGreaterThan(few.layout.postCount);
    expect(qty(many.materials, 'Plant ties / soft clips')).toBeGreaterThan(qty(few.materials, 'Plant ties / soft clips'));
    expect(qty(many.materials, 'Branch-support stakes')).toBeGreaterThan(qty(few.materials, 'Branch-support stakes'));
  });

  it('(b) quantities scale with row length when the row dominates', () => {
    const shortRow = planTrellis({ ...BASE, plantCount: 2, rowLengthCm: 300 });
    const longRow = planTrellis({ ...BASE, plantCount: 2, rowLengthCm: 900 });
    expect(longRow.layout.totalRowLengthCm).toBeGreaterThan(shortRow.layout.totalRowLengthCm);
    expect(longRow.layout.postCount).toBeGreaterThan(shortRow.layout.postCount);
    expect(longRow.layout.netPanelCount).toBeGreaterThan(shortRow.layout.netPanelCount);
  });
});

describe('planTrellis — honest output', () => {
  it('(c) always includes assumptions and never claims load ratings / capacities', () => {
    const plan = planTrellis(BASE);
    expect(plan.assumptions.length).toBeGreaterThan(0);
    // an explicit "not an engineering certification" style disclaimer is present
    expect(plan.caveats.join(' ').toLowerCase()).toContain('not an engineering');
    // and nowhere does it make an affirmative strength/load/safety claim
    const text = JSON.stringify(plan).toLowerCase();
    expect(text).not.toMatch(/rated (to|for)|holds up to|withstands|load rating of|wind[- ]load capacity of|guaranteed|certified to/);
  });

  it('substitutes defaults and flags it when inputs are non-positive', () => {
    const plan = planTrellis({ ...BASE, plantCount: 0, plantWidthCm: -5, plantHeightCm: 0 });
    expect(plan.caveats.some((c) => c.toLowerCase().includes('default'))).toBe(true);
    expect(plan.layout.postCount).toBeGreaterThanOrEqual(2);
  });
});
