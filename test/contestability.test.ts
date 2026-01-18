import type { ArgumentationFramework, Contestation } from '../src/core/types.js';
import { createArgument } from '../src/core/Argument.js';
import { createRelation } from '../src/core/Relation.js';
import { createFramework } from '../src/core/ArgumentationFramework.js';
import { predictContestationEffect } from '../src/contestation/predict.js';

describe('contestability properties', () => {
  function buildFramework(): ArgumentationFramework {
    const root = createArgument('root claim', 0.5, { id: 'arg-root' });
    const pro = createArgument('pro support', 0.6, { id: 'arg-pro' });
    const con = createArgument('con attack', 0.6, { id: 'arg-con' });

    const relPro = createRelation('arg-pro', 'arg-root', 'support', 'rel-pro');
    const relCon = createRelation('arg-con', 'arg-root', 'attack', 'rel-con');

    return createFramework('arg-root', [root, pro, con], [relPro, relCon]);
  }

  test('Property 1: increasing pro base score will not decrease root', () => {
    const framework = buildFramework();
    const contestation: Contestation = {
      id: 'contest-pro-inc',
      type: 'base_score_modification',
      challenge: 'boost pro',
      targetArgumentId: 'arg-pro',
      newBaseScore: 0.9,
      submittedAt: '2024-01-01T00:00:00Z',
    };

    const effect = predictContestationEffect(framework, contestation);
    expect(effect).toBe('will_increase');
  });

  test('Property 1: increasing con base score will not increase root', () => {
    const framework = buildFramework();
    const contestation: Contestation = {
      id: 'contest-con-inc',
      type: 'base_score_modification',
      challenge: 'boost con',
      targetArgumentId: 'arg-con',
      newBaseScore: 0.9,
      submittedAt: '2024-01-01T00:00:00Z',
    };

    const effect = predictContestationEffect(framework, contestation);
    expect(effect).toBe('will_decrease');
  });

  test('Property 2: adding pro argument will not decrease root', () => {
    const framework = buildFramework();
    const contestation: Contestation = {
      id: 'contest-add-pro',
      type: 'argument_addition',
      challenge: 'add pro',
      newArgument: {
        id: 'arg-new-pro',
        content: 'new pro',
        baseScore: 0.4,
        sourceRefs: [],
        assumptions: [],
      },
      newRelation: createRelation('arg-new-pro', 'arg-root', 'support', 'rel-new-pro'),
      submittedAt: '2024-01-01T00:00:00Z',
    };

    const effect = predictContestationEffect(framework, contestation);
    expect(effect).toBe('will_increase');
  });

  test('Property 2: adding con argument will not increase root', () => {
    const framework = buildFramework();
    const contestation: Contestation = {
      id: 'contest-add-con',
      type: 'argument_addition',
      challenge: 'add con',
      newArgument: {
        id: 'arg-new-con',
        content: 'new con',
        baseScore: 0.4,
        sourceRefs: [],
        assumptions: [],
      },
      newRelation: createRelation('arg-new-con', 'arg-root', 'attack', 'rel-new-con'),
      submittedAt: '2024-01-01T00:00:00Z',
    };

    const effect = predictContestationEffect(framework, contestation);
    expect(effect).toBe('will_decrease');
  });
});
