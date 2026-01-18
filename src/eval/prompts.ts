import type { CuadExample } from './types.js';

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
    '- baseScore must be in [0,1].',
    '- Keep it a tree: every non-root argument must have exactly ONE outgoing relation.',
    '- Use only the IDs "arg-0000" .. "arg-0006" and "rel-0001" .. "rel-0006".',
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
