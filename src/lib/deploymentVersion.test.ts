import test from 'node:test';
import assert from 'node:assert/strict';
import { getDeploymentVersion } from './deploymentVersion';

test('getDeploymentVersion falls back to local-dev', () => {
  const original = process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION;
  try {
    delete process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION;

    assert.equal(getDeploymentVersion(), 'local-dev');
  } finally {
    if (typeof original === 'string') {
      process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION = original;
    } else {
      delete process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION;
    }
  }
});

test('getDeploymentVersion trims configured deployment labels', () => {
  const original = process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION;
  try {
    process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION = '  deploy abc1234  ';

    assert.equal(getDeploymentVersion(), 'deploy abc1234');
  } finally {
    if (typeof original === 'string') {
      process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION = original;
    } else {
      delete process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION;
    }
  }
});
