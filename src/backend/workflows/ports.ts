export type Jurisdiction = 'SG' | 'OTHER' | 'UNKNOWN';

export type CaseMeta = {
  caseId: string;
  label: string;
  jurisdiction: Jurisdiction;
};

export type Paragraph = {
  caseId: string;
  paraId: string;
  text: string;
};

export type CaseRegistryPort = {
  getCase(caseId: string): Promise<CaseMeta | null>;
  searchByCitation(rawCitation: string): Promise<CaseMeta[]>;
};

export type JudgmentTextPort = {
  getParagraphs(caseId: string, paraIds?: string[]): Promise<Paragraph[]>;
};

export type VerificationPort = {
  resolveCitation(rawCitation: string, candidates: CaseMeta[]): Promise<{
    status: 'resolved' | 'ambiguous' | 'not_found' | 'error';
    caseId?: string;
    candidates: Array<{ caseId: string; label: string }>;
    confidence: number;
    notes: string[];
  }>;

  verifyQuote(input: {
    caseId: string;
    quote: string;
    paraHint?: string;
  }): Promise<{
    status: 'exact' | 'partial' | 'not_found' | 'error';
    matches: Array<{ paraId: string; text: string; score: number }>;
    matchScore: number;
    notes: string[];
  }>;

  verifyProposition(input: {
    proposition: string;
    evidence: Array<{ caseId: string; paraId: string; text: string }>;
  }): Promise<{
    verdict: 'supported' | 'contradicted' | 'needs_context' | 'unknown';
    supportSpans: Array<{ caseId: string; paraId: string; start: number; end: number; text: string }>;
    counterSpans: Array<{ caseId: string; paraId: string; start: number; end: number; text: string }>;
    confidence: number;
    groundingOk: boolean;
  }>;
};

export type WorkflowPorts = {
  caseRegistry: CaseRegistryPort;
  judgmentText: JudgmentTextPort;
  verification: VerificationPort;
};

