// lib/pests.test.ts
import { describe, it, expect } from 'vitest';
import { PROFILES, SEVERITY_SCALE, SEVERITY_ORDER, type Severity } from './pests';

describe('pests library — completeness', () => {
  it('(a) every profile has non-empty lookAlikes, scoutingProcedure, and followUpInterval', () => {
    expect(PROFILES.length).toBeGreaterThan(0);
    for (const p of PROFILES) {
      expect(p.lookAlikes.length, `${p.id} lookAlikes`).toBeGreaterThan(0);
      expect(p.lookAlikes.every((x) => x.trim().length > 0)).toBe(true);
      expect(p.scoutingProcedure.length, `${p.id} scoutingProcedure`).toBeGreaterThan(0);
      expect(p.scoutingProcedure.every((x) => x.trim().length > 0)).toBe(true);
      expect(typeof p.followUpInterval).toBe('string');
      expect(p.followUpInterval.trim().length, `${p.id} followUpInterval`).toBeGreaterThan(0);
    }
  });

  it('covers the required pests and diseases', () => {
    const ids = new Set(PROFILES.map((p) => p.id));
    for (const required of ['aphids', 'spider-mites', 'thrips', 'caterpillars', 'grasshoppers', 'whiteflies', 'fungus-gnats', 'russet-mites', 'powdery-mildew', 'botrytis', 'septoria', 'root-rot']) {
      expect(ids.has(required), `missing ${required}`).toBe(true);
    }
  });

  it('the russet-mite profile disambiguates against nutrient burn', () => {
    const russet = PROFILES.find((p) => p.id === 'russet-mites')!;
    expect(russet.lookAlikes.join(' ').toLowerCase()).toContain('nutrient burn');
  });
});

describe('pests library — honest content', () => {
  it('(b) no profile names a specific product/brand or gives a dose/rate', () => {
    const text = JSON.stringify(PROFILES).toLowerCase();
    // common consumer pesticide product/brand/active-substance names we must not recommend
    const BRANDS = [
      'neem', 'spinosad', 'pyrethrin', 'pyrethrum', 'malathion', 'carbaryl', 'sevin',
      'captain jack', 'safer brand', 'monterey', 'bonide', 'avid', 'forbid', 'azamax',
      'azadirachtin', 'abamectin', 'imidacloprid', 'bifenthrin', 'copper fungicide',
      'sulfur burner', 'regalia', 'serenade', 'einstein oil', 'insecticidal soap',
    ];
    for (const b of BRANDS) expect(text.includes(b), `must not mention "${b}"`).toBe(false);

    // no dose/rate patterns (a number followed by a volume/measure unit, or "per gallon/liter", or a percent)
    expect(text).not.toMatch(/\d+(\.\d+)?\s?(ml|milliliter|liter|litre|oz|ounce|gal|gallon|tsp|tbsp|teaspoon|tablespoon)s?\b/);
    expect(text).not.toMatch(/\bper\s+(gallon|gal|liter|litre)\b/);
    expect(text).not.toMatch(/\d\s?%/);
  });

  it('does not state legal/regulatory requirements', () => {
    const text = JSON.stringify(PROFILES).toLowerCase();
    expect(text).not.toMatch(/is illegal|required by law|legally required|you must (register|report)/);
  });
});

describe('pests library — severity scale', () => {
  it('(c) severity scale is ordered least → most severe with guidance', () => {
    const expected: Severity[] = ['Observation only', 'Monitor', 'Intervention may be warranted', 'Serious risk'];
    expect(SEVERITY_SCALE.map((s) => s.level)).toEqual(expected);
    expect(SEVERITY_ORDER).toEqual(expected);
    for (const s of SEVERITY_SCALE) expect(s.meaning.trim().length).toBeGreaterThan(0);
  });
});
