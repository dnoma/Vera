import {
  authorityAppropriatenessRate,
  classifyAuthorityTier,
  scoreMinimalSufficiency,
} from '../src/eval/evidence/scoring.js';
import { segmentIntoEvidenceUnits } from '../src/eval/evidence/units.js';

describe('evidence unit scoring', () => {
  test('segments non-empty lines into stable units', () => {
    const text = 'HEADER\n\nClause 1: The Parties agree.\nClause 2: WHEREAS something.\n';
    const units = segmentIntoEvidenceUnits(text);
    expect(units.length).toBe(3);
    expect(units[0]!.text.trim()).toBe('HEADER');
    expect(units[1]!.text.trim()).toBe('Clause 1: The Parties agree.');
    expect(units[2]!.text.trim()).toBe('Clause 2: WHEREAS something.');
    expect(text.slice(units[1]!.start, units[1]!.end)).toBe(units[1]!.text);
  });

  test('minimal sufficiency rewards minimal coverage and penalises extra units', () => {
    const text = 'A\nB\nC\n';
    const gold = [{ start: 2, end: 3 }]; // overlaps line "B"

    const minimal = scoreMinimalSufficiency({
      contractText: text,
      label: true,
      predictedSpans: [{ start: 2, end: 3 }],
      goldSpans: gold,
    });
    expect(minimal.minimalSufficiencyScore).toBe(1);

    const verbose = scoreMinimalSufficiency({
      contractText: text,
      label: true,
      predictedSpans: [
        { start: 2, end: 3 }, // B
        { start: 0, end: 1 }, // A (extraneous)
      ],
      goldSpans: gold,
    });
    expect(verbose.minimalSufficiencyScore).toBeLessThan(1);
  });

  test('negative label prefers no evidence', () => {
    const text = 'A\nB\n';
    const none = scoreMinimalSufficiency({
      contractText: text,
      label: false,
      predictedSpans: [],
      goldSpans: [],
    });
    expect(none.minimalSufficiencyScore).toBe(1);

    const some = scoreMinimalSufficiency({
      contractText: text,
      label: false,
      predictedSpans: [{ start: 0, end: 1 }],
      goldSpans: [],
    });
    expect(some.minimalSufficiencyScore).toBe(0);
  });

  test('authority heuristics treat WHEREAS and uppercase headings as non-operative', () => {
    expect(classifyAuthorityTier('WHEREAS the parties…')).toBe('non_operative');
    expect(classifyAuthorityTier('DEFINITIONS')).toBe('non_operative');
    expect(classifyAuthorityTier('1. Termination. The Supplier may…')).toBe('operative');

    const text = 'DEFINITIONS\n1. Termination. The Supplier may terminate.\n';
    const rate = authorityAppropriatenessRate({
      contractText: text,
      predictedSpans: [{ start: text.indexOf('DEFINITIONS'), end: text.indexOf('DEFINITIONS') + 5 }],
    });
    expect(rate.rate).toBe(0);
  });
});

