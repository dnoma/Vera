export type Jurisdiction = 'SG';

export type LawNetDocId = string | { source: 'lawnet'; id: string };

export interface PartyNames {
  canonical: string;
  aliases: string[];
}

export interface CaseMeta {
  caseId: string;
  jurisdiction: Jurisdiction;
  court: string;
  decisionDate: string;
  neutralCitations: string[];
  reportCitations: string[];
  partyNames: PartyNames;
  lawnetDocId?: LawNetDocId;
  status?: 'published' | 'unreported';
  treatment?: string;
}

export interface JudgmentParagraph {
  paraId: string;
  text: string;
  charStart: number;
  charEnd: number;
  isHeading?: boolean;
}

export interface JudgmentDocument {
  rawText: string;
  fullText: string;
  paragraphs: readonly JudgmentParagraph[];
}

export interface ParagraphHit {
  caseId: string;
  paraId: string;
  score: number;
}

