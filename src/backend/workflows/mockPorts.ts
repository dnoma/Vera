import type {
  CaseMeta,
  CaseRegistryPort,
  JudgmentTextPort,
  Paragraph,
  VerificationPort,
} from './ports.js';

export class MockCaseRegistryPort implements CaseRegistryPort {
  private readonly cases = new Map<string, CaseMeta>();
  private readonly citationIndex = new Map<string, string[]>();

  constructor() {
    const c1: CaseMeta = { caseId: 'SG-CASE-1', label: '[2020] SGCA 1', jurisdiction: 'SG' };
    const c2: CaseMeta = { caseId: 'SG-CASE-2', label: '[2021] SGCA 2', jurisdiction: 'SG' };
    const c3: CaseMeta = { caseId: 'UK-CASE-1', label: '[1999] UKHL 1', jurisdiction: 'OTHER' };
    for (const c of [c1, c2, c3]) this.cases.set(c.caseId, c);

    this.citationIndex.set('SGCA-1', ['SG-CASE-1']);
    this.citationIndex.set('AMB', ['SG-CASE-1', 'SG-CASE-2']);
    this.citationIndex.set('UK', ['UK-CASE-1']);
  }

  async getCase(caseId: string): Promise<CaseMeta | null> {
    return this.cases.get(caseId) ?? null;
  }

  async searchByCitation(rawCitation: string): Promise<CaseMeta[]> {
    for (const [key, ids] of this.citationIndex.entries()) {
      if (rawCitation.includes(key)) {
        return ids.map(id => this.cases.get(id)!).filter(Boolean);
      }
    }
    return [];
  }
}

export class MockJudgmentTextPort implements JudgmentTextPort {
  private readonly paragraphs = new Map<string, Paragraph[]>();

  constructor() {
    this.paragraphs.set('SG-CASE-1', [
      { caseId: 'SG-CASE-1', paraId: 'p1', text: 'The court finds the duty is non-delegable.' },
      { caseId: 'SG-CASE-1', paraId: 'p2', text: 'On the evidence, the appeal is dismissed.' },
    ]);
    this.paragraphs.set('SG-CASE-2', [
      { caseId: 'SG-CASE-2', paraId: 'p10', text: 'The standard of review is correctness.' },
    ]);
  }

  async getParagraphs(caseId: string, paraIds?: string[]): Promise<Paragraph[]> {
    const paras = this.paragraphs.get(caseId) ?? [];
    if (!paraIds) return paras;
    const wanted = new Set(paraIds);
    return paras.filter(p => wanted.has(p.paraId));
  }
}

export class MockVerificationPort implements VerificationPort {
  constructor(private readonly judgmentText: JudgmentTextPort) {}

  async resolveCitation(rawCitation: string, candidates: CaseMeta[]) {
    if (candidates.length === 0) {
      return { status: 'not_found' as const, candidates: [], confidence: 0, notes: ['No candidates found'] };
    }
    if (candidates.length === 1) {
      const c = candidates[0]!;
      return {
        status: 'resolved' as const,
        caseId: c.caseId,
        candidates: [{ caseId: c.caseId, label: c.label }],
        confidence: 1,
        notes: [`Resolved from ${rawCitation}`],
      };
    }
    return {
      status: 'ambiguous' as const,
      candidates: candidates.map(c => ({ caseId: c.caseId, label: c.label })),
      confidence: 0.4,
      notes: ['Multiple candidates; requires disambiguation'],
    };
  }

  async verifyQuote(input: { caseId: string; quote: string; paraHint?: string | undefined }) {
    const paras = await this.judgmentText.getParagraphs(input.caseId);
    const hits = paras
      .filter(p => p.text.includes(input.quote))
      .map(p => ({ paraId: p.paraId, text: p.text, score: 1 }));

    if (hits.length > 0) {
      return { status: 'exact' as const, matches: hits, matchScore: 1, notes: [] };
    }

    return { status: 'not_found' as const, matches: [], matchScore: 0, notes: ['Quote not found'] };
  }

  async verifyProposition(input: { proposition: string; evidence: Array<{ caseId: string; paraId: string; text: string }> }) {
    if (input.evidence.length === 0) {
      return {
        verdict: 'needs_context' as const,
        supportSpans: [],
        counterSpans: [],
        confidence: 0,
        groundingOk: false,
      };
    }
    const joined = input.evidence.map(e => e.text).join('\n');
    const supported = joined.toLowerCase().includes(input.proposition.toLowerCase());
    return {
      verdict: supported ? ('supported' as const) : ('needs_context' as const),
      supportSpans: supported
        ? [{ caseId: input.evidence[0]!.caseId, paraId: input.evidence[0]!.paraId, start: 0, end: input.proposition.length, text: input.proposition }]
        : [],
      counterSpans: [],
      confidence: supported ? 0.9 : 0.4,
      groundingOk: true,
    };
  }
}

