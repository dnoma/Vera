import { loadFixtureCaseRegistry } from '../../../src/backend/data/caseRegistry.js';
import { normalizeJudgmentText } from '../../../src/backend/data/judgmentDocument.js';
import { FixtureLawNetClient, toLawNetId } from '../../../src/backend/data/lawNetClient.js';
import { buildParagraphIndex, queryParagraphs } from '../../../src/backend/data/paragraphIndex.js';

describe('FixtureLawNetClient', () => {
  test('fetches case text from fixtures and supports paragraph retrieval', async () => {
    const registry = loadFixtureCaseRegistry();
    const meta = registry.getCaseById('sg-2019-sgca-5');
    expect(meta?.lawnetDocId).toBeTruthy();

    const client = new FixtureLawNetClient();
    const text = await client.fetchCaseText(toLawNetId(meta!.lawnetDocId!));
    const doc = { ...normalizeJudgmentText(text), caseId: meta!.caseId };

    const index = buildParagraphIndex([doc]);
    const hits = queryParagraphs(index, 'multiple spaces');

    expect(hits[0]).toMatchObject({ caseId: 'sg-2019-sgca-5', paraId: '4' });
  });
});

