import type { CuadExample } from './types.js';
import type { LegalBenchExample } from './legalbench/types.js';
import type { VerifiedEvidence } from './corag/types.js';

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[TRUNCATED]';
}

export function baselinePrompt(example: CuadExample): { system: string; user: string } {
  const system = [
    'You are a legal contract review assistant.',
    'Answer the question using only the provided contract text.',
    'Return valid JSON only (no markdown, no prose).',
    '',
    'JSON schema:',
    '{',
    '  "answer": "yes" | "no",',
    '  "confidence": number,',
    '  "evidenceSpans": [{"start": number, "end": number, "reason": string}]',
    '}',
    '',
    'Rules:',
    '- "confidence" must be in [0,1].',
    '- Provide 1-3 evidence spans if you answer "yes"; each span MUST be a direct substring of the contract text.',
    '- For each span, provide 0-based character offsets: start (inclusive) and end (exclusive).',
    '- If you answer "no", evidenceSpans must be an empty array.',
    '- Do not use ellipses. Offsets must point into the provided contract text.',
  ].join('\n');

  const user = [
    `Question: ${example.question}`,
    '',
    'Contract text:',
    truncate(example.contractText, 12000),
  ].join('\n');

  return { system, user };
}

export function qbafPrompt(example: CuadExample, sourceId: string): { system: string; user: string } {
  const system = [
    'You are converting a legal contract question into a contestable argumentation graph.',
    'Use a Quantitative Bipolar Argumentation Framework (QBAF) as a rooted tree.',
    'Return valid JSON only (no markdown, no prose).',
    '',
    'You must output an object with:',
    '{',
    '  "framework": {',
    `    "rootClaimId": "arg-0000",`,
    '    "arguments": [',
    '      { "id": "arg-0000", "content": string, "baseScore": number, "sourceRefs": string[], "assumptions": [] },',
    '      { "id": "arg-0001", ... }',
    '    ],',
    '    "relations": [',
    '      { "id": "rel-0001", "from": "arg-0001", "to": "arg-0000", "type": "support" | "attack" }',
    '    ]',
    '  },',
    '  "evidence": [',
    '    { "argumentId": "arg-0001", "evidenceSpans": [{"start": number, "end": number, "reason": string}] }',
    '  ]',
    '}',
    '',
    'Rules:',
    `- Use only sourceRefs ["${sourceId}"] or [].`,
    '- baseScore must be in [0,1]. Use moderate values (prefer 0.2..0.8) unless the contract language is explicit and unambiguous.',
    '- Set the root argument (arg-0000) baseScore to exactly 0.5 (do not pre-load the conclusion into the root).',
    '- Keep it a tree: every non-root argument must have exactly ONE outgoing relation.',
    '- Use only the IDs "arg-0000" .. "arg-0006" and "rel-0001" .. "rel-0006".',
    '- Include at least ONE counterargument: at least one relation must be type "attack" into the root claim.',
    '- Provide 1-2 evidence spans per non-root argument.',
    '- Evidence spans must be direct substrings of the contract text with 0-based [start,end) offsets.',
    '- Do not use ellipses. Offsets must point into the provided contract text.',
    '- Root content should be the claim: "This contract contains a clause related to <Category>."',
  ].join('\n');

  const user = [
    `Question: ${example.question}`,
    `Category: ${example.category}`,
    '',
    'Contract text:',
    truncate(example.contractText, 12000),
  ].join('\n');

  return { system, user };
}

export function evidenceExtractionPrompt(
  example: CuadExample | LegalBenchExample
): { system: string; user: string } {
  const text = 'contractText' in example ? example.contractText : example.text;
  const question = example.question || ('task' in example ? example.task : 'Question');

  const system = [
    'You are a legal evidence extraction assistant.',
    'Extract 3-5 evidence passages from the text that are relevant to answering the question.',
    'Return valid JSON only (no markdown, no prose).',
    '',
    'JSON schema:',
    '{',
    '  "passages": [',
    '    {',
    '      "text": string,       // Exact quote from the source text',
    '      "stance": "supporting" | "opposing" | "neutral",',
    '      "strength": "strong" | "moderate" | "weak",',
    '      "reason": string      // Brief explanation of relevance',
    '    }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Each passage text MUST be an exact quote from the source (verbatim substring).',
    '- Include both supporting AND opposing evidence if present.',
    '- "stance" indicates whether the passage supports or opposes a "yes" answer.',
    '- Keep passages short and directly relevant.',
  ].join('\n');

  const user = [
    `Question: ${question}`,
    '',
    'Source text:',
    truncate(text, 12000),
  ].join('\n');

  return { system, user };
}

export function groundedGraphPrompt(
  example: CuadExample | LegalBenchExample,
  sourceId: string,
  evidencePassages: readonly VerifiedEvidence[]
): { system: string; user: string } {
  const category = 'category' in example ? example.category : example.task;
  const question = example.question || category;
  const system = [
    'You are constructing a QBAF argument graph grounded ONLY in provided verified evidence passages.',
    'Return valid JSON only (no markdown, no prose).',
    '',
    'You must output an object with:',
    '{',
    '  "framework": { "rootClaimId": "arg-0000", "arguments": [...], "relations": [...] },',
    '  "evidence": [{ "argumentId": "arg-0001", "evidenceSpans": [{"start": number, "end": number, "reason": string}] }]',
    '}',
    '',
    'Rules:',
    `- Use only sourceRefs ["${sourceId}"] or [].`,
    '- Root argument baseScore MUST be exactly 0.5.',
    '- Keep it a tree: each non-root argument has exactly ONE outgoing relation.',
    '- Include at least one attack relation into the root.',
    '- Evidence spans must be exact substrings of the provided source text.',
  ].join('\n');

  const evidenceText = evidencePassages
    .map((e, i) => [
      `[#${i + 1}] stance=${e.stance} strength=${e.strength}`,
      e.text,
    ].join('\n'))
    .join('\n\n');

  const user = [
    `Question: ${question}`,
    `Category: ${category}`,
    '',
    'Verified evidence passages (verbatim):',
    evidenceText,
  ].join('\n');

  return { system, user };
}
