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
    '  "citations": [{"quote": string, "reason": string}]',
    '}',
    '',
    'Rules:',
    '- "confidence" must be in [0,1].',
    '- Provide 1-3 citations, each a verbatim quote from the contract text (short excerpts).',
    '- If you answer "no", citations may be empty.',
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
    `    "rootClaimId": "arg-root",`,
    '    "arguments": [',
    '      { "id": "arg-root", "content": string, "baseScore": number, "sourceRefs": string[], "assumptions": [] },',
    '      { "id": "arg-1", ... }',
    '    ],',
    '    "relations": [',
    '      { "id": "rel-1", "from": "arg-1", "to": "arg-root", "type": "support" | "attack" }',
    '    ]',
    '  },',
    '  "evidence": [',
    '    { "argumentId": "arg-1", "quotes": [{"quote": string, "reason": string}] }',
    '  ]',
    '}',
    '',
    'Rules:',
    `- Use only sourceRefs ["${sourceId}"] or [].`,
    '- baseScore must be in [0,1].',
    '- Keep it a tree: every non-root argument must have exactly ONE outgoing relation.',
    '- Use only the IDs "arg-root", "arg-1".. "arg-6" and "rel-1".. "rel-6".',
    '- Provide 1-2 short verbatim evidence quotes per non-root argument.',
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

