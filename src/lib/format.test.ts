// lib/format.test.ts
import { describe, it, expect } from 'vitest';
import { fmtHeight, fmtLength, fmtVolume, fmtTemp, cmToLengthInput, lengthUnit } from './derive';

describe('imperial display helpers (default)', () => {
  it('fmtHeight defaults to inches', () => {
    expect(fmtHeight(60, 'imperial')).toMatch(/\bin$/);
    expect(fmtHeight(60, 'imperial')).not.toContain('cm');
  });

  it('fmtLength shows inches, switching to feet when large — never cm by default', () => {
    expect(fmtLength(60)).toMatch(/\bin$/);          // ~24 in
    expect(fmtLength(300)).toMatch(/\bft$/);         // ~9.8 ft
    expect(fmtLength(60)).not.toContain('cm');
    expect(fmtLength(null)).toBe('—');
  });

  it('fmtVolume shows gallons by default, never litres', () => {
    expect(fmtVolume(2.49)).toMatch(/\bgal$/);
    expect(fmtVolume(2.49)).not.toMatch(/\bL$/);
  });

  it('fmtTemp shows °F by default', () => {
    expect(fmtTemp(72)).toBe('72°F');
  });

  it('length inputs are labelled and valued in inches by default', () => {
    expect(lengthUnit('imperial')).toBe('in');
    expect(cmToLengthInput(2.54, 'imperial')).toBeCloseTo(1, 3); // 2.54 cm = 1 in
  });
});

describe('metric only when explicitly chosen', () => {
  it('switches units when the preference is metric', () => {
    expect(fmtLength(60, 'metric')).toBe('60 cm');
    expect(fmtVolume(1, 'metric')).toMatch(/\bL$/);
    expect(fmtTemp(32, 'metric')).toBe('0°C');
    expect(lengthUnit('metric')).toBe('cm');
    expect(cmToLengthInput(60, 'metric')).toBe(60);
  });
});
