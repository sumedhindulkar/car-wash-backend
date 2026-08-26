import { HTTP_STATUS } from '../constants/http-status';
import {
  ZoneLookupResponse,
  ZoneResponse,
  findActiveZoneByPincode,
  findActiveZoneWithAnyPincode,
  findActiveZonesNear,
  findZoneById,
  createZoneRecord,
  toZoneResponse,
  toZoneWithDistanceResponse,
  updateZoneById,
} from '../repositories/zone.repository';
import { AppError } from '../utils/app-error';
import {
  parseCreateZoneInput,
  parseUpdateZoneInput,
  parseZoneLocationQuery,
  parseZonePincode,
} from '../validation/zone.schema';

async function assertPincodesAvailable(
  pincodes: string[],
  excludeZoneId?: string,
): Promise<void> {
  const conflict = await findActiveZoneWithAnyPincode(pincodes, excludeZoneId);
  if (!conflict) {
    return;
  }

  const overlapping = conflict.pincodes.find((pincode) => pincodes.includes(pincode));
  throw new AppError(
    `Pincode ${overlapping ?? pincodes[0]} already belongs to another active zone`,
    HTTP_STATUS.CONFLICT,
  );
}

function toLookupResponse(
  zones: Awaited<ReturnType<typeof findActiveZonesNear>>,
  primaryZoneId?: string,
): ZoneLookupResponse {
  const primary = primaryZoneId
    ? zones.find((zone) => String(zone._id) === primaryZoneId)
    : undefined;

  return {
    primaryZone: primary ? toZoneWithDistanceResponse(primary) : null,
    nearbyZones: zones
      .filter((zone) => String(zone._id) !== primaryZoneId)
      .map(toZoneWithDistanceResponse),
  };
}

export async function createZone(input: unknown): Promise<ZoneResponse> {
  const parsed = parseCreateZoneInput(input);

  if (parsed.active !== false) {
    await assertPincodesAvailable(parsed.pincodes);
  }

  const zone = await createZoneRecord(parsed);
  return toZoneResponse(zone);
}

export async function getZone(zoneId: string): Promise<ZoneResponse> {
  const zone = await findZoneById(zoneId);
  if (!zone) {
    throw new AppError('Zone not found', HTTP_STATUS.NOT_FOUND);
  }

  return toZoneResponse(zone);
}

export async function updateZone(
  zoneId: string,
  input: unknown,
): Promise<ZoneResponse> {
  const existing = await findZoneById(zoneId);
  if (!existing) {
    throw new AppError('Zone not found', HTTP_STATUS.NOT_FOUND);
  }

  const parsed = parseUpdateZoneInput(input);
  const nextActive = parsed.active ?? existing.active;
  const nextPincodes = parsed.pincodes ?? existing.pincodes;

  if (nextActive) {
    await assertPincodesAvailable(nextPincodes, zoneId);
  }

  const zone = await updateZoneById(zoneId, parsed);
  if (!zone) {
    throw new AppError('Zone not found', HTTP_STATUS.NOT_FOUND);
  }

  return toZoneResponse(zone);
}

export async function deactivateZone(zoneId: string): Promise<ZoneResponse> {
  const zone = await updateZoneById(zoneId, { active: false });
  if (!zone) {
    throw new AppError('Zone not found', HTTP_STATUS.NOT_FOUND);
  }

  return toZoneResponse(zone);
}

export async function findZonesByPincode(pincodeInput: unknown): Promise<ZoneLookupResponse> {
  const pincode = parseZonePincode(pincodeInput);
  const primary = await findActiveZoneByPincode(pincode);

  if (!primary) {
    return {
      primaryZone: null,
      nearbyZones: [],
    };
  }

  const nearby = await findActiveZonesNear(primary.location.coordinates);
  return toLookupResponse(nearby, String(primary._id));
}

export async function findZonesByLocation(
  latInput: unknown,
  lngInput: unknown,
): Promise<ZoneLookupResponse> {
  const { lat, lng } = parseZoneLocationQuery({ lat: latInput, lng: lngInput });
  const zones = await findActiveZonesNear([lng, lat]);

  const nearest = zones[0];
  const primaryZoneId =
    nearest && nearest.distanceKm <= nearest.serviceRadiusKm
      ? String(nearest._id)
      : undefined;

  return toLookupResponse(zones, primaryZoneId);
}
