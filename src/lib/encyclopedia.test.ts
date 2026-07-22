// lib/encyclopedia.test.ts
import { describe, it, expect } from 'vitest';
import { ARTICLES, ARTICLE_IDS, SECTIONS, searchArticles } from './encyclopedia';
import { GLOSSARY } from './glossary';

describe('encyclopedia — article integrity', () => {
  it('(a) every article has a non-empty body, summary, and section', () => {
    expect(ARTICLES.length).toBeGreaterThan(0);
    for (const a of ARTICLES) {
      expect(a.summary.trim().length, `${a.id} summary`).toBeGreaterThan(0);
      expect(a.section.trim().length, `${a.id} section`).toBeGreaterThan(0);
      expect(a.body.length, `${a.id} body`).toBeGreaterThan(0);
      for (const b of a.body) {
        const hasContent = (b.text?.trim().length ?? 0) > 0 || (b.items?.length ?? 0) > 0;
        expect(hasContent, `${a.id} has an empty body block`).toBe(true);
      }
    }
  });

  it('(b) every relatedId resolves to a real article', () => {
    for (const a of ARTICLES) {
      for (const rid of a.relatedIds) {
        expect(ARTICLE_IDS.has(rid), `${a.id} -> unknown related "${rid}"`).toBe(true);
      }
    }
  });

  it('article ids are unique', () => {
    expect(new Set(ARTICLES.map((a) => a.id)).size).toBe(ARTICLES.length);
  });

  it('every glossary term referenced by an article is defined', () => {
    for (const a of ARTICLES) {
      for (const t of a.glossaryTerms) {
        expect(GLOSSARY[t], `${a.id} -> undefined glossary term "${t}"`).toBeTruthy();
      }
    }
  });
});

describe('encyclopedia — honest content', () => {
  it('(c) no article contains a product brand, a dose, or a legal claim', () => {
    const text = JSON.stringify(ARTICLES).toLowerCase();
    const BRANDS = [
      'neem', 'spinosad', 'pyrethrin', 'malathion', 'carbaryl', 'sevin', 'bonide', 'monterey',
      'safer brand', 'general hydroponics', 'fox farm', 'advanced nutrients', 'botanicare',
    ];
    for (const b of BRANDS) expect(text.includes(b), `must not mention "${b}"`).toBe(false);

    // no product dose/rate patterns (a number + a volume/measure unit, or "per gallon/liter")
    expect(text).not.toMatch(/\d+(\.\d+)?\s?(ml|milliliter|tsp|tbsp|teaspoon|tablespoon|oz|ounce|gal|gallon)s?\b/);
    expect(text).not.toMatch(/\bper\s+(gallon|liter|litre|gal)\b/);

    // no legal/regulatory language
    expect(text).not.toMatch(/\b(legal|illegal|law|laws|licen[sc]e|regulation|regulatory|permit)\b/);
  });

  it('does not assert breeder timing, yield, or potency as fact', () => {
    // spot-check: flowering/harvest articles explicitly hedge cultivar-specific timing
    const flowering = ARTICLES.find((a) => a.id === 'flowering')!;
    expect(JSON.stringify(flowering.body).toLowerCase()).toMatch(/cultivar-specific|rough expectation|not a schedule/);
  });
});

describe('encyclopedia — coverage & search', () => {
  it('(d) every required section has at least one article', () => {
    for (const section of SECTIONS) {
      expect(ARTICLES.some((a) => a.section === section), `no article for section "${section}"`).toBe(true);
    }
  });

  it('search matches titles, summaries, and body text, and respects the section filter', () => {
    expect(searchArticles('bud rot').some((a) => a.id === 'diseases')).toBe(true);
    expect(searchArticles('trichome').some((a) => a.id === 'harvest-readiness')).toBe(true);
    const inSection = searchArticles('', 'Drying');
    expect(inSection.length).toBeGreaterThan(0);
    expect(inSection.every((a) => a.section === 'Drying')).toBe(true);
  });
});
