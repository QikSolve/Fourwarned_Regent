import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionJobState, isTerminalJobState, assertValidJobTransition } from '@/lib/jobs/lifecycle';

test('canTransitionJobState supports queue to completion lifecycle', () => {
  assert.equal(canTransitionJobState('queued', 'claimed'), true);
  assert.equal(canTransitionJobState('claimed', 'running'), true);
  assert.equal(canTransitionJobState('running', 'completed'), true);
  assert.equal(isTerminalJobState('completed'), true);
});

test('canTransitionJobState supports failure and retry transitions', () => {
  assert.equal(canTransitionJobState('running', 'failed'), true);
  assert.equal(canTransitionJobState('failed', 'retrying'), true);
  assert.equal(canTransitionJobState('retrying', 'queued'), true);
});

test('assertValidJobTransition rejects invalid transitions', () => {
  assert.throws(() => assertValidJobTransition('queued', 'completed'));
  assert.throws(() => assertValidJobTransition('completed', 'running'));
});
