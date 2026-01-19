import { createFramework } from '../src/core/ArgumentationFramework.js';
import { createArgument } from '../src/core/Argument.js';
import { evaluateWithDFQuAD } from '../src/semantics/DFQuAD.js';
import { getFinalStrength } from '../src/core/ArgumentationFramework.js';

describe('eval edit-suite behaviours', () => {
  test('adding an attack relation should not increase root strength', () => {
    const root = createArgument('Root claim', 0.5, { id: 'arg-root', sourceRefs: [], assumptions: [] });
    const pro = createArgument('Pro', 0.8, { id: 'arg-pro', sourceRefs: [], assumptions: [] });
    const base = createFramework('arg-root', [root, pro], [
      { id: 'rel-1', from: 'arg-pro', to: 'arg-root', type: 'support' },
    ]);

    const before = getFinalStrength(evaluateWithDFQuAD(base));

    const attack = createArgument('Con', 0.7, {
      id: 'arg-con',
      sourceRefs: [],
      assumptions: [{ id: 'ass-1', statement: 'Test assumption', basis: 'unit test', isContestable: true }],
    });
    const modified = createFramework('arg-root', [root, pro, attack], [
      { id: 'rel-1', from: 'arg-pro', to: 'arg-root', type: 'support' },
      { id: 'rel-2', from: 'arg-con', to: 'arg-root', type: 'attack' },
    ]);

    const after = getFinalStrength(evaluateWithDFQuAD(modified));
    expect(after).toBeLessThanOrEqual(before + 1e-12);
  });
});

