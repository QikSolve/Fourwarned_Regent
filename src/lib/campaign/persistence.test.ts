import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnapshot, migrateSnapshot, CAMPAIGN_STATE_VERSION } from './persistence';
import type { GameState } from '@/lib/gameTypes';

const state: GameState = {
  phase: 'reports',
  season: 'Spring',
  year: 1,
  metrics: { food: 50, morale: 50, gold: 50, threat: 50, adminStrain: 50 },
  advisors: [
    {
      id: 'steward',
      name: 'Aldric',
      title: 'Steward',
      region: 'Riverhold',
      competence: 70,
      loyalty: 80,
      stress: 20,
      bias: 'Fiscal Conservatism',
      ambition: 20,
      authority: 60,
      status: 'Active',
      assignedProcedures: [],
      maxProcedures: 3,
    },
  ],
  reports: [
    {
      id: 'r1',
      advisorId: 'steward',
      season: 'Spring',
      year: 1,
      title: 'Food warning',
      body: 'Food pressure rising',
      urgency: 'medium',
      choices: [
        { id: 'c1', label: 'Option A', description: 'Tradeoff A', consequences: { food: 2 } },
        { id: 'c2', label: 'Option B', description: 'Tradeoff B', consequences: { gold: 1 } },
      ],
      selectedChoiceId: null,
      freeTextInstruction: '',
      status: 'pending',
      scribesNote: 'Take action soon.',
    },
  ],
  procedures: [],
  doctrines: [],
  scribeMessages: [
    { id: 'm1', text: 'Welcome', type: 'welcome', season: 'Spring', year: 1 },
  ],
  activeReportId: null,
  showProceduresModal: false,
  selectedAdvisorId: null,
  turnHistory: [],
};

test('createSnapshot emits current version', () => {
  const snapshot = createSnapshot(state);
  assert.equal(snapshot.version, CAMPAIGN_STATE_VERSION);
  assert.deepEqual(snapshot.state, state);
});

test('migrateSnapshot supports legacy raw game state payloads', () => {
  const migrated = migrateSnapshot(state);
  assert.ok(migrated);
  assert.equal(migrated?.version, CAMPAIGN_STATE_VERSION);
  assert.equal(migrated?.state.year, 1);
});

test('migrateSnapshot rejects invalid payloads', () => {
  const migrated = migrateSnapshot({ invalid: true });
  assert.equal(migrated, null);
});
