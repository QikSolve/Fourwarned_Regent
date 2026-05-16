import type { GameState } from '@/lib/gameTypes';
import { PersistedCampaignSnapshotSchema, type PersistedCampaignSnapshot } from '@/lib/contracts/gameplay';

export const CAMPAIGN_STATE_VERSION = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nowIso() {
  return new Date().toISOString();
}

export function createSnapshot(state: GameState): PersistedCampaignSnapshot {
  return {
    version: CAMPAIGN_STATE_VERSION,
    savedAt: nowIso(),
    state,
  };
}

export function migrateSnapshot(input: unknown): PersistedCampaignSnapshot | null {
  const current = PersistedCampaignSnapshotSchema.safeParse(input);
  if (current.success) {
    return current.data;
  }

  // v1 compatibility: previously persisted either raw game state, or
  // an envelope with { version: 1, state }.
  if (!isRecord(input)) {
    return null;
  }

  const legacyStateCandidate = isRecord(input.state) ? input.state : input;
  const migrated = PersistedCampaignSnapshotSchema.safeParse({
    version: CAMPAIGN_STATE_VERSION,
    savedAt: nowIso(),
    state: legacyStateCandidate,
  });

  return migrated.success ? migrated.data : null;
}
