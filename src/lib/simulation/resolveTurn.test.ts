import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTurn } from './resolveTurn';
import type { Advisor, DoctrineCategory, KingdomMetrics, Procedure, Report } from '@/types/game';

const metrics: KingdomMetrics = {
  food: 50,
  morale: 50,
  gold: 50,
  threat: 50,
  adminStrain: 50,
};

const advisors: Advisor[] = [
  {
    id: 'steward',
    name: 'Aldric',
    title: 'Steward',
    region: 'Riverhold',
    competence: 100,
    loyalty: 80,
    stress: 20,
    bias: 'Fiscal Conservatism',
    ambition: 20,
    authority: 60,
    status: 'Active',
    assignedProcedures: [],
    maxProcedures: 3,
  },
];

const reports: Report[] = [
  {
    id: 'r1',
    advisorId: 'steward',
    season: 'Spring',
    year: 1,
    title: 'Grain Pressure',
    body: 'Stores are low.',
    urgency: 'high',
    choices: [
      { id: 'c1', label: 'Hold', description: 'No-op', consequences: {} },
      { id: 'c2', label: 'Buy grain', description: 'Increase food', consequences: { food: 10, gold: -5 } },
    ],
    selectedChoiceId: 'c2',
    freeTextInstruction: '',
    status: 'responded',
    scribesNote: 'Food risk rising.',
  },
];

const procedures: Procedure[] = [
  {
    id: 'p1',
    name: 'Winter Reserve Accounting',
    description: 'Track reserves.',
    assignedTo: 'steward',
    effects: { food: 3 },
  },
];

const doctrines: DoctrineCategory[] = [
  {
    id: 'd1',
    name: 'Food Security',
    selected: 'o1',
    options: [
      { id: 'o1', label: 'Conservative', description: 'Build reserves', effects: { food: 4 } },
    ],
  },
];

test('resolveTurn applies deterministic updates and keeps metrics bounded', () => {
  const result = resolveTurn(metrics, advisors, reports, procedures, doctrines, 'Spring', 1);

  assert.ok(result.newMetrics.food >= 0 && result.newMetrics.food <= 100);
  assert.ok(result.newMetrics.gold >= 0 && result.newMetrics.gold <= 100);
  assert.ok(result.newMetrics.morale >= 0 && result.newMetrics.morale <= 100);
  assert.ok(result.newMetrics.threat >= 0 && result.newMetrics.threat <= 100);
  assert.ok(result.newMetrics.adminStrain >= 0 && result.newMetrics.adminStrain <= 100);
  assert.equal(result.newAdvisors.length, 1);
  assert.ok(result.newMetrics.food > metrics.food);
});
