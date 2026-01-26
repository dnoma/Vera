import type { AdvisorPacket } from './types.js';

export type AdvisorPacketStore = {
  save(packet: AdvisorPacket): Promise<void>;
  get(packetId: string): Promise<AdvisorPacket | null>;
};

export class InMemoryAdvisorPacketStore implements AdvisorPacketStore {
  private readonly packets = new Map<string, AdvisorPacket>();

  async save(packet: AdvisorPacket): Promise<void> {
    this.packets.set(packet.packetId, packet);
  }

  async get(packetId: string): Promise<AdvisorPacket | null> {
    return this.packets.get(packetId) ?? null;
  }
}

