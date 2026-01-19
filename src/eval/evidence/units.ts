export type EvidenceUnitKind = 'line';

export type EvidenceUnit = {
  readonly id: string;
  readonly kind: EvidenceUnitKind;
  readonly start: number;
  readonly end: number;
  readonly text: string;
};

function isValidRange(text: string, start: number, end: number): boolean {
  return Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start && end <= text.length;
}

/**
 * Segments contract text into reviewable evidence units.
 *
 * This intentionally prefers conservative, reviewer-friendly units over token spans.
 * The first implementation uses non-empty lines because CUAD contracts are heavily
 * newline-structured and line-level references map well to legal review.
 */
export function segmentIntoEvidenceUnits(contractText: string): readonly EvidenceUnit[] {
  const units: EvidenceUnit[] = [];
  let offset = 0;
  let lineIndex = 0;

  while (offset <= contractText.length) {
    const nextNewline = contractText.indexOf('\n', offset);
    const lineEnd = nextNewline === -1 ? contractText.length : nextNewline;
    const rawLine = contractText.slice(offset, lineEnd);

    const trimmed = rawLine.trim();
    if (trimmed.length > 0) {
      // Use the original offsets (including leading/trailing whitespace) so citations remain reproducible.
      const start = offset;
      const end = lineEnd;
      if (isValidRange(contractText, start, end)) {
        units.push({
          id: `u-${String(lineIndex).padStart(5, '0')}`,
          kind: 'line',
          start,
          end,
          text: contractText.slice(start, end),
        });
      }
    }

    lineIndex++;
    if (nextNewline === -1) break;
    offset = nextNewline + 1;
  }

  return units;
}

export function unitIdsOverlappingSpan(
  units: readonly EvidenceUnit[],
  span: { start: number; end: number }
): readonly string[] {
  if (!Number.isFinite(span.start) || !Number.isFinite(span.end)) return [];
  if (span.end <= span.start) return [];

  const overlapping: string[] = [];
  for (const u of units) {
    const overlapStart = Math.max(u.start, span.start);
    const overlapEnd = Math.min(u.end, span.end);
    if (overlapEnd > overlapStart) overlapping.push(u.id);
  }
  return overlapping;
}

