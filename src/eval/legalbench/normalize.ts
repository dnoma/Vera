type Normalizer = (text: string) => string;

function stripLeadingMarker(text: string, markers: readonly string[]): string {
  const lower = text.toLowerCase();
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx >= 0) {
      return text.slice(idx + marker.length).trim();
    }
  }
  return text;
}

function stripWrappingQuotes(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

const normalizeCitationOpen: Normalizer = text => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const stripped = stripLeadingMarker(trimmed, [
    'citation:',
    'cite:',
    'answer:',
    'the citation is',
    'citation is',
    'relevant citation is',
  ]);
  const firstLine = stripped.split(/\r?\n/)[0]?.trim() ?? stripped.trim();
  const unquoted = stripWrappingQuotes(firstLine);
  return unquoted.replace(/[.;]+$/, '').trim();
};

const normalizeSaraNumeric: Normalizer = text => {
  const cleaned = text.replace(/[$,]/g, '');
  const match = cleaned.match(/-?\d+/);
  return match ? match[0] : text.trim();
};

const normalizeDefinitionExtraction: Normalizer = text => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const stripped = stripLeadingMarker(trimmed, [
    'definitions:',
    'definition:',
    'answer:',
    'terms:',
    'the terms are',
    'the definitions are',
  ]);
  const cleaned = stripped
    .replace(/\r?\n+/g, ',')
    .replace(/[;|]+/g, ',')
    .replace(/^\s*[-*]\s*/g, '');
  const parts = cleaned
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return trimmed;
  return parts.join(', ');
};

const NORMALIZERS: Record<string, Normalizer> = {
  citation_prediction_open: normalizeCitationOpen,
  sara_numeric: normalizeSaraNumeric,
  definition_extraction: normalizeDefinitionExtraction,
};

export function normalizeLegalBenchOutput(task: string, output: string): string {
  const normalizer = NORMALIZERS[task];
  const trimmed = output.trim();
  if (!normalizer) return trimmed;
  const normalized = normalizer(trimmed);
  return normalized || trimmed;
}
