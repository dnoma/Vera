import { readFileSync } from 'fs';
import type { CaseMeta } from './types.js';
import { backendFixturePath } from './fixturePaths.js';
import { assertValidCaseRegistry } from './validateCaseRegistry.js';

function normalizeCitationKey(rawCitation: string): string {
  return rawCitation
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u00a0\s]+/g, ' ')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeNameKey(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u00a0\s]+/g, ' ')
    .trim();
}

export function assertSingaporeOnly(caseMeta: CaseMeta): void {
  if (caseMeta.jurisdiction !== 'SG') {
    throw new Error(`Non-Singapore jurisdiction not allowed: ${caseMeta.jurisdiction}`);
  }
}

export interface CaseRegistry {
  getCaseById(caseId: string): CaseMeta | undefined;
  findCasesByCitation(rawCitation: string): readonly CaseMeta[];
  findCasesByPartyName(query: string): readonly CaseMeta[];
}

function stableCaseOrder(a: CaseMeta, b: CaseMeta): number {
  return a.caseId.localeCompare(b.caseId);
}

export function createCaseRegistry(cases: readonly CaseMeta[]): CaseRegistry {
  const caseById = new Map<string, CaseMeta>();
  const casesByCitationKey = new Map<string, CaseMeta[]>();
  const casesByPartySearchKey = new Map<string, CaseMeta[]>();

  for (const meta of cases) {
    assertSingaporeOnly(meta);
    caseById.set(meta.caseId, meta);

    for (const citation of [...meta.neutralCitations, ...meta.reportCitations]) {
      const key = normalizeCitationKey(citation);
      const list = casesByCitationKey.get(key) ?? [];
      list.push(meta);
      casesByCitationKey.set(key, list);
    }

    const partyKeys = [meta.partyNames.canonical, ...meta.partyNames.aliases].map(normalizeNameKey);
    for (const key of partyKeys) {
      const list = casesByPartySearchKey.get(key) ?? [];
      list.push(meta);
      casesByPartySearchKey.set(key, list);
    }
  }

  for (const list of casesByCitationKey.values()) {
    list.sort(stableCaseOrder);
  }
  for (const list of casesByPartySearchKey.values()) {
    list.sort(stableCaseOrder);
  }

  const allCases = [...cases].sort(stableCaseOrder);

  return {
    getCaseById(caseId: string): CaseMeta | undefined {
      return caseById.get(caseId);
    },
    findCasesByCitation(rawCitation: string): readonly CaseMeta[] {
      const key = normalizeCitationKey(rawCitation);
      return casesByCitationKey.get(key) ?? [];
    },
    findCasesByPartyName(query: string): readonly CaseMeta[] {
      const q = normalizeNameKey(query);
      if (!q) {
        return [];
      }

      const exact = casesByPartySearchKey.get(q);
      if (exact && exact.length > 0) {
        return exact;
      }

      return allCases.filter(meta => {
        const keys = [meta.partyNames.canonical, ...meta.partyNames.aliases].map(normalizeNameKey);
        return keys.some(k => k.includes(q));
      });
    },
  };
}

export function loadFixtureCaseRegistry(): CaseRegistry {
  const raw = readFileSync(backendFixturePath('case-registry.sample.json'), 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  assertValidCaseRegistry(parsed);
  return createCaseRegistry(parsed);
}

