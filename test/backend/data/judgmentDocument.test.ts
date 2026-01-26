import { readFileSync } from 'fs';
import { backendFixturePath } from '../../../src/backend/data/fixturePaths.js';
import type { JudgmentParagraph } from '../../../src/backend/data/types.js';
import {
  extractParagraphWindow,
  getParagraph,
  hashJudgment,
  normalizeJudgmentText,
} from '../../../src/backend/data/judgmentDocument.js';

describe('JudgmentDocument normalization', () => {
  test('extracts stable paragraph IDs and offsets', () => {
    const input = readFileSync(backendFixturePath('judgments/sample-judgment.txt'), 'utf-8');
    const doc = normalizeJudgmentText(input);

    expect(doc.paragraphs.map((p: JudgmentParagraph) => p.paraId)).toEqual([
      'preamble',
      '1',
      '2',
      '3',
      '4',
    ]);

    for (const para of doc.paragraphs) {
      expect(doc.fullText.slice(para.charStart, para.charEnd)).toBe(para.text);
    }

    expect(getParagraph(doc, '2')?.text).toBe('Second paragraph with a tab.');
  });

  test('is deterministic and hash-stable', () => {
    const input = readFileSync(backendFixturePath('judgments/sample-judgment.txt'), 'utf-8');
    const a = normalizeJudgmentText(input);
    const b = normalizeJudgmentText(input);

    expect(a).toEqual(b);
    expect(hashJudgment(a)).toBe(hashJudgment(b));
  });

  test('extractParagraphWindow returns deterministic context', () => {
    const input = readFileSync(backendFixturePath('judgments/sample-judgment.txt'), 'utf-8');
    const doc = normalizeJudgmentText(input);

    const window = extractParagraphWindow(doc, ['3'], 1);
    expect(window.map((p: JudgmentParagraph) => p.paraId)).toEqual(['2', '3', '4']);
  });
});
