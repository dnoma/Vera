export type AdvisorPacketPolicy = {
  fired: string[];
  notes: string[];
};

export type EvidenceParagraph = {
  caseId: string;
  paraId: string;
  text: string;
  textHash: string;
};

export type AdvisorPacket = {
  packetId: string;
  requestId: string;
  route: string;
  startedAt: string;
  finishedAt: string;
  input: unknown;
  output: unknown;
  evidence: EvidenceParagraph[];
  policy: AdvisorPacketPolicy;
  error?: { message: string };
  versions: {
    api: string;
    workflows: string;
  };
};

