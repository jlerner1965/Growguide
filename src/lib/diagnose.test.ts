// lib/diagnose.test.ts
import { describe, it, expect } from 'vitest';
import { diagnose, type DiagnoseInput, type Explanation, type Confidence } from './diagnose';

const RANK: Record<Confidence, number> = { Low: 0, Moderate: 1, High: 2 };
const maxConfidence = (rs: Explanation[]) => Math.max(...rs.map((r) => RANK[r.confidence]));
const isRanked = (rs: Explanation[]) => rs.every((r, i) => i === 0 || rs[i - 1].score >= r.score);

// A spread of inputs, including empty and thin, to exercise the invariants.
const SAMPLES: DiagnoseInput[] = [
  {},
  { leafColor: 'Pale/yellow' },
  { pestEvidence: 'Webbing', leafColor: 'Mottled/speckled', recentWeather: 'Hot' },
  { spotsLesions: 'Gray fuzzy', recentWeather: 'Heavy rain', affectedPart: 'New/upper growth' },
  { rootZone: 'Waterlogged/soggy', recentIrrigation: 'More than usual', wilting: 'Yes' },
  { affectedPart: 'Old/lower growth', leafColor: 'Pale/yellow', progression: 'Gradual (weeks)', growthRate: 'Normal' },
];

describe('diagnose — structural invariants', () => {
  it('(a) always returns a ranked array of at least two possibilities', () => {
    for (const input of SAMPLES) {
      const results = diagnose(input);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(isRanked(results)).toBe(true);
    }
  });

  it('(b) never emits a result without at least one evidenceFor', () => {
    for (const input of SAMPLES) {
      for (const r of diagnose(input)) {
        expect(r.evidenceFor.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('every result carries the full guidance shape (safe actions, do-nots, help)', () => {
    for (const r of diagnose({ leafColor: 'Pale/yellow', affectedPart: 'Old/lower growth' })) {
      expect(r.safeActions.length).toBeGreaterThanOrEqual(1);
      expect(r.doNot.length).toBeGreaterThanOrEqual(1);
      expect(typeof r.whenToGetHelp).toBe('string');
      expect(r.whenToGetHelp.length).toBeGreaterThan(0);
      expect(['Low', 'Moderate', 'High']).toContain(r.confidence);
    }
  });
});

describe('diagnose — surfaces conflicting evidence', () => {
  it('(b) yellowing on NEW growth surfaces evidenceAgainst for the mobile-nutrient (N) explanation', () => {
    const results = diagnose({ leafColor: 'Pale/yellow', affectedPart: 'New/upper growth' });
    const nitrogen = results.find((r) => r.label.startsWith('Nitrogen deficiency'));
    expect(nitrogen).toBeDefined();
    expect(nitrogen!.evidenceFor.length).toBeGreaterThanOrEqual(1);
    expect(nitrogen!.evidenceAgainst.length).toBeGreaterThanOrEqual(1);
    // and at least one explanation overall carries conflicting evidence
    expect(results.some((r) => r.evidenceAgainst.length > 0)).toBe(true);
  });
});

describe('diagnose — confidence honesty', () => {
  it('(c) thin input yields lower confidence than richer, corroborated input', () => {
    const rich = diagnose({
      pestEvidence: 'Webbing',
      leafColor: 'Mottled/speckled',
      recentWeather: 'Hot',
      affectedPart: 'New/upper growth',
      progression: 'Gradual (weeks)',
      scope: 'One plant',
      wilting: 'No',
      ph: 'In range (6-7)',
      ec: 'In range',
    });
    const thin = diagnose({ leafColor: 'Pale/yellow' });

    expect(maxConfidence(thin)).toBeLessThan(maxConfidence(rich));
    // thin input can never read as confident
    expect(thin.every((r) => r.confidence === 'Low')).toBe(true);
  });

  it('empty input is all Low confidence (no certainty from nothing)', () => {
    expect(diagnose({}).every((r) => r.confidence === 'Low')).toBe(true);
  });
});
