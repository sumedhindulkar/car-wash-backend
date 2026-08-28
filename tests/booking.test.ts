import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { IServiceItem } from '../src/models/service.model';
import { allowedCapacity } from '../src/services/booking-availability';
import {
  buildOneTimeWash,
  compareOneTimePricing,
} from '../src/services/booking-pricing';
import { generateOccurrences } from '../src/services/subscription-schedule';

function serviceItem(overrides: Partial<IServiceItem> = {}): IServiceItem {
  return {
    slug: 'foam-wash',
    title: 'Exterior Foam Wash & Tyre Polish',
    description: 'Foam wash',
    image: 'foam.png',
    pricing: { oneTime: 230, monthly: 200 },
    durationMinutes: 20,
    mandatory: true,
    selected: true,
    active: true,
    monthlyRule: 'every_visit',
    ...overrides,
  };
}

const CATALOG: IServiceItem[] = [
  serviceItem(),
  serviceItem({
    slug: 'rat-repellent',
    title: 'Rat Repellent',
    pricing: { oneTime: 150, monthly: 130 },
    durationMinutes: 5,
    mandatory: false,
  }),
  serviceItem({
    slug: 'ceramic-coating',
    title: 'Ceramic Coating',
    pricing: { oneTime: 900, monthly: null },
    durationMinutes: 60,
    mandatory: false,
    active: false,
  }),
];

function submittedOneTime(overrides: Record<string, unknown> = {}) {
  return {
    weeks: [
      {
        week: 1,
        washes: [
          {
            washNumber: 1,
            items: [
              {
                slug: 'foam-wash',
                title: 'Exterior Foam Wash & Tyre Polish',
                price: 230,
                durationMinutes: 20,
              },
              {
                slug: 'rat-repellent',
                title: 'Rat Repellent',
                price: 150,
                durationMinutes: 5,
              },
            ],
            totalPrice: 380,
            totalDurationMinutes: 25,
          },
        ],
        totalPrice: 380,
        totalDurationMinutes: 25,
      },
    ],
    totalPrice: 380,
    totalDurationMinutes: 25,
    totalWashes: 1,
    ...overrides,
  };
}

describe('Zone slot capacity', () => {
  it('uses the direct worker count below two workers', () => {
    assert.equal(allowedCapacity(0), 0);
    assert.equal(allowedCapacity(1), 1);
  });

  it('applies 85 percent utilisation rounded down from two workers upward', () => {
    assert.equal(allowedCapacity(2), 1);
    assert.equal(allowedCapacity(8), 6);
    assert.equal(allowedCapacity(10), 8);
  });
});

describe('One-time booking pricing', () => {
  it('prices mandatory plus selected items with the one-time catalog price', () => {
    const wash = buildOneTimeWash(CATALOG, ['rat-repellent']);

    assert.deepEqual(
      wash.items.map((item) => item.slug),
      ['foam-wash', 'rat-repellent'],
    );
    assert.equal(wash.totalPrice, 380);
    assert.equal(wash.totalDurationMinutes, 25);
  });

  it('accepts a submitted payload that matches the catalog', () => {
    const wash = buildOneTimeWash(CATALOG, ['rat-repellent']);
    assert.deepEqual(compareOneTimePricing(wash, submittedOneTime()), []);
  });

  it('rejects a tampered item price and reports the expected value', () => {
    const wash = buildOneTimeWash(CATALOG, ['rat-repellent']);
    const submitted = submittedOneTime();
    submitted.weeks[0].washes[0].items[1].price = 1;
    submitted.weeks[0].washes[0].totalPrice = 231;
    submitted.weeks[0].totalPrice = 231;
    submitted.totalPrice = 231;

    const errors = compareOneTimePricing(wash, submitted);

    assert.ok(errors.some((error) => error.includes('Price of rat-repellent must be 150')));
    assert.ok(errors.some((error) => error.includes('Total price must be 380')));
  });

  it('rejects an inactive item', () => {
    assert.throws(() => buildOneTimeWash(CATALOG, ['ceramic-coating']), {
      message: 'Feature is not available: ceramic-coating',
    });
  });

  it('rejects an unknown item', () => {
    assert.throws(() => buildOneTimeWash(CATALOG, ['gold-plating']), {
      message: /Unknown feature: gold-plating/,
    });
  });

  it('rejects a payload with more than one wash', () => {
    const wash = buildOneTimeWash(CATALOG, []);
    const submitted = submittedOneTime();
    submitted.weeks[0].washes.push({ ...submitted.weeks[0].washes[0], washNumber: 2 });

    assert.deepEqual(compareOneTimePricing(wash, submitted), [
      'A one-time booking must contain exactly one week with one wash',
    ]);
  });
});

describe('Subscription date generation', () => {
  // 2026-08-31 is a Monday.
  const MONDAY = '2026-08-31';

  it('generates four weekly bookings for ONCE_A_WEEK', () => {
    const occurrences = generateOccurrences('ONCE_A_WEEK', MONDAY, '08:00');

    assert.deepEqual(
      occurrences.map((occurrence) => occurrence.date),
      ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'],
    );
    assert.ok(occurrences.every((occurrence) => occurrence.startTime === '08:00'));
  });

  it('pairs Monday with Thursday for TWICE_A_WEEK', () => {
    const occurrences = generateOccurrences('TWICE_A_WEEK', MONDAY, '08:00');

    assert.equal(occurrences.length, 8);
    assert.deepEqual(
      occurrences.slice(0, 2).map((occurrence) => occurrence.date),
      ['2026-08-31', '2026-09-03'],
    );
  });

  it('pairs Wednesday with Saturday for TWICE_A_WEEK', () => {
    const occurrences = generateOccurrences('TWICE_A_WEEK', '2026-09-02', '08:00');

    assert.deepEqual(
      occurrences.slice(0, 2).map((occurrence) => occurrence.date),
      ['2026-09-02', '2026-09-05'],
    );
  });

  it('generates twelve alternate-day bookings and never lands on Sunday', () => {
    const occurrences = generateOccurrences('ALTERNATE_DAYS', MONDAY, '08:00');

    assert.equal(occurrences.length, 12);
    assert.deepEqual(
      occurrences.slice(0, 3).map((occurrence) => occurrence.date),
      ['2026-08-31', '2026-09-02', '2026-09-04'],
    );
    assert.ok(occurrences.every((occurrence) => occurrence.startAt.getUTCDay() !== 0));
  });

  it('moves a Sunday occurrence to Monday', () => {
    const occurrences = generateOccurrences('ALTERNATE_DAYS', '2026-09-04', '08:00');

    // Friday, Sunday -> Monday, Tuesday
    assert.deepEqual(
      occurrences.slice(0, 3).map((occurrence) => occurrence.date),
      ['2026-09-04', '2026-09-07', '2026-09-08'],
    );
  });

  it('books the same slot fourteen days later for TWICE_A_MONTH', () => {
    const occurrences = generateOccurrences('TWICE_A_MONTH', '2026-09-12', '10:00');

    assert.deepEqual(
      occurrences.map((occurrence) => occurrence.date),
      ['2026-09-12', '2026-09-26'],
    );
  });
});
