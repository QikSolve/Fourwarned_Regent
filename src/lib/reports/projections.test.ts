import test from 'node:test';
import assert from 'node:assert/strict';
import type { Report } from '@/lib/gameTypes';
import { findNextPendingReportId, getProjectedDeltaForReport, getProjectedDeltaForRespondedReports } from './projections';

const baseReport = {
  advisorId: 'steward',
  season: 'Spring',
  year: 1,
  body: 'body',
  urgency: 'medium',
  freeTextInstruction: '',
  scribesNote: 'note',
} as const;

const reports: Report[] = [
  {
    ...baseReport,
    id: 'r1',
    title: 'r1',
    selectedChoiceId: 'c1',
    status: 'responded',
    choices: [
      { id: 'c1', label: 'l1', description: 'd1', consequences: { gold: -5, morale: 2 } },
    ],
  },
  {
    ...baseReport,
    id: 'r2',
    title: 'r2',
    selectedChoiceId: null,
    status: 'pending',
    choices: [
      { id: 'c2', label: 'l2', description: 'd2', consequences: { threat: -3 } },
    ],
  },
  {
    ...baseReport,
    id: 'r3',
    title: 'r3',
    selectedChoiceId: 'c3',
    status: 'responded',
    choices: [
      { id: 'c3', label: 'l3', description: 'd3', consequences: { gold: -4, food: 1 } },
    ],
  },
];

test('getProjectedDeltaForReport returns selected choice consequence deltas', () => {
  assert.deepEqual(getProjectedDeltaForReport(reports[0]), {
    food: 0,
    morale: 2,
    gold: -5,
    threat: 0,
    adminStrain: 0,
  });
});

test('getProjectedDeltaForRespondedReports sums only responded reports', () => {
  assert.deepEqual(getProjectedDeltaForRespondedReports(reports), {
    food: 1,
    morale: 2,
    gold: -9,
    threat: 0,
    adminStrain: 0,
  });
});

test('findNextPendingReportId finds next pending report in agenda order', () => {
  assert.equal(findNextPendingReportId(reports, 'r1'), 'r2');
});

test('findNextPendingReportId wraps to earlier pending report when needed', () => {
  const wrappedReports: Report[] = [
    { ...reports[0], status: 'pending', selectedChoiceId: null },
    { ...reports[1], status: 'responded', selectedChoiceId: 'c2', choices: [{ id: 'c2', label: 'l2', description: 'd2', consequences: {} }] },
    { ...reports[2], status: 'responded' },
  ];
  assert.equal(findNextPendingReportId(wrappedReports, 'r3'), 'r1');
});
