import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { HTTP_STATUS } from '../src/constants/http-status';
import { Worker } from '../src/models/worker.model';
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

let server: Server;
let baseUrl: string;
let zoneId: string;

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

function workerPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: 'Rahul Sharma',
    phone: '9876543210',
    aadharNumber: '123456789012',
    zoneId,
    primaryLocation: {
      type: 'Point',
      coordinates: ANDHERI_WEST,
    },
    ...overrides,
  };
}

describe('Worker module', () => {
  before(async () => {
    const mongodbUri = process.env.MONGODB_URI;
    if (!mongodbUri) {
      throw new Error('MONGODB_URI is required to run worker tests');
    }

    await mongoose.connect(mongodbUri, { dbName: 'car-wash-worker-test' });
    await Promise.all([Zone.syncIndexes(), Worker.syncIndexes()]);

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
    await Promise.all([Worker.deleteMany({}), Zone.deleteMany({})]);

    const zone = await Zone.create({
      name: 'Andheri West',
      pincodes: ['400053'],
      location: {
        type: 'Point',
        coordinates: ANDHERI_WEST,
      },
      serviceRadiusKm: 5,
      workerIds: [],
    });
    zoneId = String(zone._id);
  });

  it('creates a worker without exposing aadharNumber', async () => {
    const result = await api('POST', '/workers', workerPayload());

    assert.equal(result.status, HTTP_STATUS.CREATED);
    assert.equal(result.json.success, true);

    const data = result.json.data as Record<string, unknown>;
    assert.equal(typeof data.id, 'string');
    assert.equal(data.name, 'Rahul Sharma');
    assert.equal(data.phone, '9876543210');
    assert.equal(data.zoneId, zoneId);
    assert.deepEqual(data.primaryLocation, {
      type: 'Point',
      coordinates: ANDHERI_WEST,
    });
    assert.equal('aadharNumber' in data, false);
  });

  it('rejects create when zone does not exist', async () => {
    const result = await api(
      'POST',
      '/workers',
      workerPayload({ zoneId: new mongoose.Types.ObjectId().toString() }),
    );

    assert.equal(result.status, HTTP_STATUS.NOT_FOUND);
    assert.equal(result.json.success, false);
    assert.equal(result.json.message, 'Zone not found');
  });

  it('rejects create with duplicate phone', async () => {
    await api('POST', '/workers', workerPayload());
    const result = await api('POST', '/workers', workerPayload());

    assert.equal(result.status, HTTP_STATUS.CONFLICT);
    assert.equal(result.json.success, false);
    assert.equal(result.json.message, 'Phone number already exists');
  });

  it('rejects create with invalid aadhaar', async () => {
    const result = await api(
      'POST',
      '/workers',
      workerPayload({ aadharNumber: '12345' }),
    );

    assert.equal(result.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(result.json.success, false);
  });

  it('updates worker details without exposing aadharNumber', async () => {
    const created = await api('POST', '/workers', workerPayload());
    const workerId = (created.json.data as Record<string, unknown>).id as string;

    const result = await api('PATCH', `/workers/${workerId}`, {
      name: 'Rahul S',
      primaryLocation: {
        type: 'Point',
        coordinates: [72.84, 19.14],
      },
    });

    assert.equal(result.status, HTTP_STATUS.OK);
    assert.equal(result.json.success, true);

    const data = result.json.data as Record<string, unknown>;
    assert.equal(data.id, workerId);
    assert.equal(data.name, 'Rahul S');
    assert.equal(data.phone, '9876543210');
    assert.deepEqual(data.primaryLocation, {
      type: 'Point',
      coordinates: [72.84, 19.14],
    });
    assert.equal('aadharNumber' in data, false);
  });

  it('updates worker details by phone number', async () => {
    await api('POST', '/workers', workerPayload());

    const result = await api('PATCH', '/workers/9876543210', {
      name: 'Rahul By Phone',
    });

    assert.equal(result.status, HTTP_STATUS.OK);
    assert.equal(result.json.success, true);

    const data = result.json.data as Record<string, unknown>;
    assert.equal(data.name, 'Rahul By Phone');
    assert.equal(data.phone, '9876543210');
    assert.equal('aadharNumber' in data, false);
  });

  it('rejects update when phone is provided', async () => {
    const created = await api('POST', '/workers', workerPayload());
    const workerId = (created.json.data as Record<string, unknown>).id as string;

    const result = await api('PATCH', `/workers/${workerId}`, {
      phone: '9876543211',
      name: 'Rahul S',
    });

    assert.equal(result.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(result.json.success, false);
    assert.equal(result.json.message, 'Phone number cannot be updated');
  });

  it('rejects update when worker is not found', async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const result = await api('PATCH', `/workers/${missingId}`, {
      name: 'Rahul S',
    });

    assert.equal(result.status, HTTP_STATUS.NOT_FOUND);
    assert.equal(result.json.success, false);
    assert.equal(result.json.message, 'Worker not found');
  });

  it('looks up a worker by ObjectId without exposing aadharNumber', async () => {
    const created = await api('POST', '/workers', workerPayload());
    const workerId = (created.json.data as Record<string, unknown>).id;

    const result = await api('GET', `/workers/${String(workerId)}`);

    assert.equal(result.status, HTTP_STATUS.OK);
    assert.equal(result.json.success, true);

    const data = result.json.data as Record<string, unknown>;
    assert.equal(data.id, workerId);
    assert.equal(data.name, 'Rahul Sharma');
    assert.equal(data.phone, '9876543210');
    assert.equal(data.zoneId, zoneId);
    assert.deepEqual(data.primaryLocation, {
      type: 'Point',
      coordinates: ANDHERI_WEST,
    });
    assert.equal('aadharNumber' in data, false);
  });

  it('looks up a worker by phone number', async () => {
    await api('POST', '/workers', workerPayload());

    const result = await api('GET', '/workers/9876543210');

    assert.equal(result.status, HTTP_STATUS.OK);
    assert.equal(result.json.success, true);

    const data = result.json.data as Record<string, unknown>;
    assert.equal(data.phone, '9876543210');
    assert.equal('aadharNumber' in data, false);
  });

  it('returns 404 when worker is not found by id', async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const result = await api('GET', `/workers/${missingId}`);

    assert.equal(result.status, HTTP_STATUS.NOT_FOUND);
    assert.equal(result.json.success, false);
    assert.equal(result.json.message, 'Worker not found');
  });

  it('returns 404 when worker is not found by phone', async () => {
    const result = await api('GET', '/workers/9876543210');

    assert.equal(result.status, HTTP_STATUS.NOT_FOUND);
    assert.equal(result.json.success, false);
    assert.equal(result.json.message, 'Worker not found');
  });

  it('returns 400 for an invalid identifier that is neither ObjectId nor phone', async () => {
    const result = await api('GET', '/workers/not-a-worker');

    assert.equal(result.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(result.json.success, false);
  });
});
