import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { HTTP_STATUS } from '../src/constants/http-status';
import { Zone } from '../src/models/zone.model';

dotenv.config();

type ApiResult = {
  status: number;
  json: {
    success: boolean;
    data?: unknown;
    message?: string;
  };
};

const ANDHERI_WEST: [number, number] = [72.8347, 19.1364];
const ANDHERI_EAST: [number, number] = [72.8547, 19.1364];
const JOGESHWARI: [number, number] = [72.8747, 19.1364];
const FAR_POINT: [number, number] = [77.209, 28.6139];

let server: Server;
let baseUrl: string;

async function api(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<ApiResult> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: response.status,
    json: (await response.json()) as ApiResult['json'],
  };
}

function zonePayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: 'Andheri West',
    pincodes: ['400053'],
    location: {
      type: 'Point',
      coordinates: ANDHERI_WEST,
    },
    serviceRadiusKm: 5,
    workerIds: [],
    ...overrides,
  };
}

describe('Zone module', () => {
  before(async () => {
    const mongodbUri = process.env.MONGODB_URI;
    if (!mongodbUri) {
      throw new Error('MONGODB_URI is required to run zone tests');
    }

    await mongoose.connect(mongodbUri, { dbName: 'car-wash-zone-test' });
    await Zone.syncIndexes();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  beforeEach(async () => {
    await Zone.deleteMany({});
  });

  it('creates a zone with one pincode', async () => {
    const result = await api('POST', '/zones', zonePayload());

    assert.equal(result.status, HTTP_STATUS.CREATED);
    assert.equal(result.json.success, true);

    const zone = result.json.data as Record<string, unknown>;
    assert.equal(zone.name, 'Andheri West');
    assert.deepEqual(zone.pincodes, ['400053']);
    assert.equal(zone.serviceRadiusKm, 5);
    assert.equal(zone.active, true);
    assert.deepEqual(zone.workerIds, []);
    assert.ok(typeof zone.id === 'string');
  });

  it('rejects a zone with zero pincodes', async () => {
    const result = await api('POST', '/zones', zonePayload({ pincodes: [] }));

    assert.equal(result.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(result.json.success, false);
    assert.match(String(result.json.message), /at least one pincode/i);
  });

  it('creates a zone with multiple pincodes', async () => {
    const result = await api(
      'POST',
      '/zones',
      zonePayload({ pincodes: ['400053', '400058', '400061'] }),
    );

    assert.equal(result.status, HTTP_STATUS.CREATED);
    const zone = result.json.data as Record<string, unknown>;
    assert.deepEqual(zone.pincodes, ['400053', '400058', '400061']);
  });

  it('rejects a duplicate pincode belonging to another active zone', async () => {
    const first = await api('POST', '/zones', zonePayload());
    assert.equal(first.status, HTTP_STATUS.CREATED);

    const second = await api(
      'POST',
      '/zones',
      zonePayload({
        name: 'Andheri East',
        pincodes: ['400053'],
        location: { type: 'Point', coordinates: ANDHERI_EAST },
      }),
    );

    assert.equal(second.status, HTTP_STATUS.CONFLICT);
    assert.match(String(second.json.message), /already belongs to another active zone/i);
  });

  it('updates a zone', async () => {
    const created = await api('POST', '/zones', zonePayload());
    const zone = created.json.data as { id: string };

    const updated = await api('PATCH', `/zones/${zone.id}`, {
      name: 'Andheri West Central',
      serviceRadiusKm: 6,
      pincodes: ['400053', '400058'],
    });

    assert.equal(updated.status, HTTP_STATUS.OK);
    const data = updated.json.data as Record<string, unknown>;
    assert.equal(data.name, 'Andheri West Central');
    assert.equal(data.serviceRadiusKm, 6);
    assert.deepEqual(data.pincodes, ['400053', '400058']);
  });

  it('rejects a duplicate pincode during update', async () => {
    const west = await api('POST', '/zones', zonePayload());
    const east = await api(
      'POST',
      '/zones',
      zonePayload({
        name: 'Andheri East',
        pincodes: ['400069'],
        location: { type: 'Point', coordinates: ANDHERI_EAST },
      }),
    );
    assert.equal(west.status, HTTP_STATUS.CREATED);
    assert.equal(east.status, HTTP_STATUS.CREATED);

    const eastId = (east.json.data as { id: string }).id;
    const result = await api('PATCH', `/zones/${eastId}`, {
      pincodes: ['400069', '400053'],
    });

    assert.equal(result.status, HTTP_STATUS.CONFLICT);
    assert.match(String(result.json.message), /already belongs to another active zone/i);
  });

  it('deactivates a zone on delete', async () => {
    const created = await api('POST', '/zones', zonePayload());
    const zoneId = (created.json.data as { id: string }).id;

    const deleted = await api('DELETE', `/zones/${zoneId}`);
    assert.equal(deleted.status, HTTP_STATUS.OK);
    assert.equal((deleted.json.data as { active: boolean }).active, false);

    const fetched = await api('GET', `/zones/${zoneId}`);
    assert.equal(fetched.status, HTTP_STATUS.OK);
    assert.equal((fetched.json.data as { active: boolean }).active, false);
  });

  it('finds the primary zone by pincode', async () => {
    await api('POST', '/zones', zonePayload({ pincodes: ['400053', '400058'] }));

    const result = await api('GET', '/zones/by-pincode/400053');
    assert.equal(result.status, HTTP_STATUS.OK);

    const data = result.json.data as {
      primaryZone: { name: string; pincodes: string[] } | null;
      nearbyZones: unknown[];
    };
    assert.ok(data.primaryZone);
    assert.equal(data.primaryZone.name, 'Andheri West');
    assert.ok(data.primaryZone.pincodes.includes('400053'));
  });

  it('finds nearby zones by pincode sorted by distance', async () => {
    const west = await api('POST', '/zones', zonePayload());
    await api(
      'POST',
      '/zones',
      zonePayload({
        name: 'Andheri East',
        pincodes: ['400069'],
        location: { type: 'Point', coordinates: ANDHERI_EAST },
      }),
    );
    await api(
      'POST',
      '/zones',
      zonePayload({
        name: 'Jogeshwari',
        pincodes: ['400102'],
        location: { type: 'Point', coordinates: JOGESHWARI },
      }),
    );

    const westId = (west.json.data as { id: string }).id;
    const result = await api('GET', '/zones/by-pincode/400053');
    const data = result.json.data as {
      primaryZone: { id: string; name: string };
      nearbyZones: { id: string; name: string; distanceKm: number }[];
    };

    assert.equal(data.primaryZone.id, westId);
    assert.equal(data.nearbyZones.length, 2);
    assert.ok(!data.nearbyZones.some((zone) => zone.id === westId));
    assert.equal(data.nearbyZones[0].name, 'Andheri East');
    assert.equal(data.nearbyZones[1].name, 'Jogeshwari');
    assert.ok(data.nearbyZones[0].distanceKm < data.nearbyZones[1].distanceKm);
  });

  it('finds the primary zone by latitude and longitude', async () => {
    await api('POST', '/zones', zonePayload());

    const result = await api(
      'GET',
      `/zones/by-location?lat=${ANDHERI_WEST[1]}&lng=${ANDHERI_WEST[0]}`,
    );
    const data = result.json.data as {
      primaryZone: { name: string; distanceKm: number; serviceRadiusKm: number } | null;
    };

    assert.ok(data.primaryZone);
    assert.equal(data.primaryZone.name, 'Andheri West');
    assert.ok(data.primaryZone.distanceKm <= data.primaryZone.serviceRadiusKm);
  });

  it('finds nearby zones by latitude and longitude without duplicating primary', async () => {
    const west = await api('POST', '/zones', zonePayload());
    await api(
      'POST',
      '/zones',
      zonePayload({
        name: 'Andheri East',
        pincodes: ['400069'],
        location: { type: 'Point', coordinates: ANDHERI_EAST },
      }),
    );

    const westId = (west.json.data as { id: string }).id;
    const result = await api(
      'GET',
      `/zones/by-location?lat=${ANDHERI_WEST[1]}&lng=${ANDHERI_WEST[0]}`,
    );
    const data = result.json.data as {
      primaryZone: { id: string };
      nearbyZones: { id: string; name: string; distanceKm: number }[];
    };

    assert.equal(data.primaryZone.id, westId);
    assert.ok(!data.nearbyZones.some((zone) => zone.id === westId));
    assert.equal(data.nearbyZones[0].name, 'Andheri East');
    assert.ok(data.nearbyZones[0].distanceKm > 0);
  });

  it('does not return inactive zones in pincode or location lookup', async () => {
    const created = await api('POST', '/zones', zonePayload());
    const zoneId = (created.json.data as { id: string }).id;
    await api('DELETE', `/zones/${zoneId}`);

    const byPincode = await api('GET', '/zones/by-pincode/400053');
    const pincodeData = byPincode.json.data as {
      primaryZone: unknown;
      nearbyZones: unknown[];
    };
    assert.equal(pincodeData.primaryZone, null);
    assert.deepEqual(pincodeData.nearbyZones, []);

    const byLocation = await api(
      'GET',
      `/zones/by-location?lat=${ANDHERI_WEST[1]}&lng=${ANDHERI_WEST[0]}`,
    );
    const locationData = byLocation.json.data as {
      primaryZone: unknown;
      nearbyZones: unknown[];
    };
    assert.equal(locationData.primaryZone, null);
    assert.deepEqual(locationData.nearbyZones, []);
  });

  it('allows a pincode to be reused after the original zone is deactivated', async () => {
    const original = await api('POST', '/zones', zonePayload());
    const zoneId = (original.json.data as { id: string }).id;
    await api('DELETE', `/zones/${zoneId}`);

    const reused = await api(
      'POST',
      '/zones',
      zonePayload({
        name: 'Replacement Zone',
        location: { type: 'Point', coordinates: ANDHERI_EAST },
      }),
    );

    assert.equal(reused.status, HTTP_STATUS.CREATED);
    assert.deepEqual((reused.json.data as { pincodes: string[] }).pincodes, ['400053']);
  });

  it('does not treat a nearby zone as primary when the point is outside its radius', async () => {
    await api(
      'POST',
      '/zones',
      zonePayload({
        serviceRadiusKm: 1,
        location: { type: 'Point', coordinates: ANDHERI_WEST },
      }),
    );

    const result = await api(
      'GET',
      `/zones/by-location?lat=${ANDHERI_EAST[1]}&lng=${ANDHERI_EAST[0]}`,
    );
    const data = result.json.data as {
      primaryZone: unknown;
      nearbyZones: { name: string }[];
    };

    assert.equal(data.primaryZone, null);
    assert.equal(data.nearbyZones[0]?.name, 'Andheri West');
  });

  it('validates invalid latitude and longitude', async () => {
    await api('POST', '/zones', zonePayload());

    const badLat = await api('GET', '/zones/by-location?lat=91&lng=72.8347');
    assert.equal(badLat.status, HTTP_STATUS.BAD_REQUEST);
    assert.match(String(badLat.json.message), /latitude/i);

    const badLng = await api('GET', '/zones/by-location?lat=19.1364&lng=181');
    assert.equal(badLng.status, HTTP_STATUS.BAD_REQUEST);
    assert.match(String(badLng.json.message), /longitude/i);

    const invalidLat = await api('GET', `/zones/by-location?lat=abc&lng=${ANDHERI_WEST[0]}`);
    assert.equal(invalidLat.status, HTTP_STATUS.BAD_REQUEST);

    const missing = await api('GET', '/zones/by-location');
    assert.equal(missing.status, HTTP_STATUS.BAD_REQUEST);
  });

  it('validates invalid pincode on create and lookup', async () => {
    const created = await api('POST', '/zones', zonePayload({ pincodes: ['123'] }));
    assert.equal(created.status, HTTP_STATUS.BAD_REQUEST);
    assert.match(String(created.json.message), /pincode/i);

    const lookup = await api('GET', '/zones/by-pincode/12ab56');
    assert.equal(lookup.status, HTTP_STATUS.BAD_REQUEST);
    assert.match(String(lookup.json.message), /pincode/i);
  });

  it('rejects invalid location coordinates on create', async () => {
    const result = await api(
      'POST',
      '/zones',
      zonePayload({
        location: { type: 'Point', coordinates: [72.8347, 100] },
      }),
    );

    assert.equal(result.status, HTTP_STATUS.BAD_REQUEST);
    assert.match(String(result.json.message), /latitude/i);
  });

  it('does not include far zones outside the nearby search distance', async () => {
    await api('POST', '/zones', zonePayload());
    await api(
      'POST',
      '/zones',
      zonePayload({
        name: 'Delhi',
        pincodes: ['110001'],
        location: { type: 'Point', coordinates: FAR_POINT },
      }),
    );

    const result = await api('GET', '/zones/by-pincode/400053');
    const data = result.json.data as {
      primaryZone: { name: string };
      nearbyZones: { name: string }[];
    };

    assert.equal(data.primaryZone.name, 'Andheri West');
    assert.ok(!data.nearbyZones.some((zone) => zone.name === 'Delhi'));
  });
});
