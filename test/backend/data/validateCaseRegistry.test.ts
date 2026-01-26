import { assertValidCaseRegistry } from '../../../src/backend/data/validateCaseRegistry.js';

describe('backend data schemas', () => {
  test('case registry schema accepts valid payload', () => {
    const payload = [
      {
        caseId: 'case-1',
        jurisdiction: 'SG',
        court: 'SGHC',
        decisionDate: '2024-01-01',
        neutralCitations: ['[2024] SGHC 1'],
        reportCitations: ['(2024) 1 SLR 1'],
        partyNames: { canonical: 'A v B', aliases: ['A versus B'] },
      },
    ];

    expect(() => assertValidCaseRegistry(payload)).not.toThrow();
  });

  test('case registry schema rejects non-SG jurisdiction', () => {
    const payload = [
      {
        caseId: 'case-1',
        jurisdiction: 'US',
        court: 'SGHC',
        decisionDate: '2024-01-01',
        neutralCitations: ['[2024] SGHC 1'],
        reportCitations: ['(2024) 1 SLR 1'],
        partyNames: { canonical: 'A v B', aliases: [] },
      },
    ];

    expect(() => assertValidCaseRegistry(payload)).toThrow(/Invalid case registry payload/i);
  });
});

