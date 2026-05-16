import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '@/app/api/campaign/[campaignId]/route';
import { POST } from '@/app/api/campaign/start/route';
import { PersistedCampaignSnapshotSchema } from '@/lib/contracts/gameplay';

test('playerName-only campaign creation can be loaded as a persisted campaign snapshot', async () => {
  const startResponse = await POST(
    new Request('http://localhost/api/campaign/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: 'Regent' }),
    })
  );

  assert.equal(startResponse.status, 201);

  const created = await startResponse.json();
  assert.equal(created.playerName, 'Regent');

  const getResponse = await GET(
    new Request(`http://localhost/api/campaign/${created.campaignId}`),
    { params: Promise.resolve({ campaignId: created.campaignId }) }
  );

  assert.equal(getResponse.status, 200);

  const snapshot = PersistedCampaignSnapshotSchema.safeParse(await getResponse.json());
  assert.ok(snapshot.success);
  assert.equal(snapshot.data.state.year, 1);
  assert.equal(snapshot.data.state.season, 'Spring');
});
