import { readFileSync } from 'fs';
import { backendFixturePath } from '../../../src/backend/data/fixturePaths.js';
import { normalizeJudgmentText } from '../../../src/backend/data/judgmentDocument.js';
import { buildParagraphIndex, queryParagraphs } from '../../../src/backend/data/paragraphIndex.js';

describe('ParagraphIndex', () => {
  test('retrieves deterministically with stable ordering', () => {
    const input = readFileSync(backendFixturePath('judgments/sample-judgment.txt'), 'utf-8');
    const docA = { ...normalizeJudgmentText(input), caseId: 'sg-2019-sgca-5' };
    const docB = { ...normalizeJudgmentText(input), caseId: 'sg-2024-sghc-10' };

    const index1 = buildParagraphIndex([docA, docB]);
    const hits1 = queryParagraphs(index1, 'multiple spaces');
    expect(hits1[0]).toMatchObject({ paraId: '4' });

    const index2 = buildParagraphIndex([docB, docA]);
    const hits2 = queryParagraphs(index2, 'multiple spaces');

    expect(hits1).toEqual(hits2);
  });
});

