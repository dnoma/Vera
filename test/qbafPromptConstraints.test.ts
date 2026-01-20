import type { CuadExample } from '../src/eval/types.js';
import { qbafPrompt } from '../src/eval/prompts.js';

describe('QBAF prompt constraints', () => {
  test('requires at least one attack relation and neutral root base score', () => {
    const example: CuadExample = {
      contractTitle: 'C',
      category: 'Termination',
      label: true,
      qaId: 'qa',
      question: 'Does the contract contain a termination clause?',
      contractText: 'A\nB\n',
      goldSpans: [{ start: 0, end: 1 }],
    };

    const { system } = qbafPrompt(example, 'src-123');
    expect(system).toContain('at least one relation must be type "attack"');
    expect(system).toContain('baseScore to exactly 0.5');
  });
});

