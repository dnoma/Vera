import { createCaseRegistry, loadFixtureCaseRegistry } from '../../../src/backend/data/caseRegistry.js';
import type { CaseMeta } from '../../../src/backend/data/types.js';

describe('CaseRegistry', () => {
  test('fixture registry resolves by caseId', () => {
    const registry = loadFixtureCaseRegistry();
    const meta = registry.getCaseById('sg-2019-sgca-5');
    expect(meta?.court).toBe('SGCA');
    expect(meta?.neutralCitations[0]).toBe('[2019] SGCA 5');
  });

  test('citation lookup tolerates messy variants', () => {
    const registry = loadFixtureCaseRegistry();
    expect(registry.findCasesByCitation(' [2019]  sgca   5 ')).toHaveLength(1);
    expect(registry.findCasesByCitation('(2019)2 SLR 200')).toHaveLength(1);
    expect(registry.findCasesByCitation('[2019] SGCA 5')[0]?.caseId).toBe('sg-2019-sgca-5');
  });

  test('party name search matches canonical and aliases', () => {
    const registry = loadFixtureCaseRegistry();
    expect(registry.findCasesByPartyName('foo')).toHaveLength(1);
    expect(registry.findCasesByPartyName('pp v tan')[0]?.caseId).toBe('sg-2024-sghc-10');
  });

  test('enforces SG-only boundary', () => {
    const bad = {
      caseId: 'x',
      jurisdiction: 'US',
      court: 'SGHC',
      decisionDate: '2024-01-01',
      neutralCitations: [],
      reportCitations: [],
      partyNames: { canonical: 'A v B', aliases: [] },
    } as unknown as CaseMeta;

    expect(() => createCaseRegistry([bad])).toThrow(/Non-Singapore jurisdiction/i);
  });
});

