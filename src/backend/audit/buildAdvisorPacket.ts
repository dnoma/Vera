import { hash } from '../../integrity/hash.js';
import type { AdvisorPacket, EvidenceParagraph } from './types.js';

type BuildAdvisorPacketArgs = {
  requestId: string;
  route: string;
  startedAt: string;
  finishedAt: string;
  input: unknown;
  output: unknown;
  evidence: Array<{ caseId: string; paraId: string; text: string }>;
  policy: { fired: string[]; notes: string[] };
  error?: { message: string };
  versions?: Partial<AdvisorPacket['versions']>;
};

export function buildAdvisorPacket(args: BuildAdvisorPacketArgs): AdvisorPacket {
  const evidence: EvidenceParagraph[] = args.evidence.map(p => ({
    ...p,
    textHash: hash({ caseId: p.caseId, paraId: p.paraId, text: p.text }),
  }));

  const packetId = hash({
    requestId: args.requestId,
    route: args.route,
    input: args.input,
  });

  return {
    packetId,
    requestId: args.requestId,
    route: args.route,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    input: args.input,
    output: args.output,
    evidence,
    policy: { fired: args.policy.fired, notes: args.policy.notes },
    ...(args.error ? { error: args.error } : {}),
    versions: {
      api: args.versions?.api ?? 'v1',
      workflows: args.versions?.workflows ?? '1',
    },
  };
}

