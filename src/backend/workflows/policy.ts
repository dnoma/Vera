import type { CaseMeta } from './ports.js';

export type PolicyResult<T> = {
  value: T;
  fired: string[];
  notes: string[];
};

export function enforceSingaporeOnly(caseMeta: CaseMeta | null): PolicyResult<{ ok: boolean }> {
  if (!caseMeta) {
    return { value: { ok: false }, fired: ['case.unknown'], notes: ['Unknown caseId'] };
  }

  if (caseMeta.jurisdiction === 'SG') {
    return { value: { ok: true }, fired: [], notes: [] };
  }

  if (caseMeta.jurisdiction === 'UNKNOWN') {
    return {
      value: { ok: false },
      fired: ['case.jurisdiction_unknown'],
      notes: ['Case jurisdiction unknown; treating as unverified'],
    };
  }

  return {
    value: { ok: false },
    fired: ['case.non_sg'],
    notes: ['Non-Singapore authority is not allowed'],
  };
}

export function enforceExactQuote<T extends { status: string; notes: string[] }>(
  result: T
): PolicyResult<T> {
  if (result.status === 'exact') {
    return { value: result, fired: [], notes: [] };
  }
  return {
    value: { ...result, notes: [...result.notes, 'Policy: quote must be exact to be verified'] },
    fired: ['quote.not_exact'],
    notes: ['Quote verification was not exact'],
  };
}

export function enforceGroundingOk<T extends { groundingOk: boolean; verdict: string }>(
  result: T
): PolicyResult<T> {
  if (result.groundingOk) {
    return { value: result, fired: [], notes: [] };
  }
  return {
    value: { ...result, verdict: 'needs_context' } as T,
    fired: ['proposition.grounding_failed'],
    notes: ['Grounding failed; forcing verdict=needs_context'],
  };
}

