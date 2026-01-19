import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { generateAuditId, extractAttributes } from '../result.js';
import type { DisclosureContext } from '../../qr/types.js';

const holderArb = fc.string({ minLength: 6, maxLength: 48 });
const presentationArb = fc.string({ minLength: 6, maxLength: 48 });
const standardFields = [
  'show_full_name',
  'show_age',
  'show_age_over_18',
  'show_age_over_21',
  'show_city_state',
  'show_full_address',
];

const contextArb: fc.Arbitrary<Record<string, unknown>> = fc
  .record({
    show_full_name: fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: undefined }),
    show_age: fc.option(fc.integer({ min: 0, max: 120 }), { nil: undefined }),
    show_age_over_18: fc.option(fc.boolean(), { nil: undefined }),
    show_age_over_21: fc.option(fc.boolean(), { nil: undefined }),
    show_city_state: fc.option(fc.string({ minLength: 2, maxLength: 120 }), { nil: undefined }),
    show_full_address: fc.option(fc.string({ minLength: 2, maxLength: 160 }), { nil: undefined }),
  })
  .chain((base) =>
    fc
      .dictionary(
        fc.string({ minLength: 3, maxLength: 24 }).filter((k) => !standardFields.includes(k)),
        fc.oneof(fc.boolean(), fc.integer(), fc.double({ noNaN: true }), fc.string()),
        { maxKeys: 5 }
      )
      .map((custom) => ({ ...custom, ...base }))
  );

describe('Verification property tests', () => {
  it('generateAuditId is deterministic and stable for identical input', () => {
    fc.assert(
      fc.property(holderArb, presentationArb, fc.date(), (holder, presentationId, timestamp) => {
        const id1 = generateAuditId(holder, presentationId, timestamp);
        const id2 = generateAuditId(holder, presentationId, new Date(timestamp.getTime()));

        expect(id1).toBe(id2);
        expect(id1.startsWith('audit-')).toBe(true);
        expect(id1.length).toBeGreaterThan(12);
      }),
      { numRuns: 75 }
    );
  });

  it('generateAuditId changes whenever any input changes', () => {
    fc.assert(
      fc.property(holderArb, presentationArb, fc.date(), (holder, presentationId, timestamp) => {
        const base = generateAuditId(holder, presentationId, timestamp);
        const mutated = generateAuditId(`${holder}-x`, presentationId, timestamp);

        expect(mutated).not.toBe(base);
      }),
      { numRuns: 50 }
    );
  });

  it('extractAttributes preserves disclosed and custom fields without leaking undefined', () => {
    fc.assert(
      fc.property(contextArb, (context) => {
        const attributes = extractAttributes(context as DisclosureContext, []);

        if (context.show_full_name !== undefined) {
          expect(attributes.fullName).toBe(String(context.show_full_name));
        }
        if (context.show_age !== undefined) {
          expect(attributes.age).toBe(Number(context.show_age));
        }
        if (context.show_age_over_18 === true) {
          expect(attributes.ageOver18).toBe(true);
        }
        if (context.show_age_over_21 === true) {
          expect(attributes.ageOver21).toBe(true);
        }
        if (context.show_city_state !== undefined) {
          expect(attributes.cityState).toBe(String(context.show_city_state));
        }
        if (context.show_full_address !== undefined) {
          expect(attributes.fullAddress).toBe(String(context.show_full_address));
        }

        const customKeys = Object.keys(context).filter(
          (key) => !standardFields.includes(key) && context[key] !== undefined
        );

        if (customKeys.length === 0) {
          expect(attributes.customAttributes ?? {}).toEqual({});
        } else {
          customKeys.forEach((key) => {
            expect(attributes.customAttributes?.[key]).toEqual(context[key]);
          });
          Object.values(attributes.customAttributes ?? {}).forEach((value) => {
            expect(value).not.toBeUndefined();
          });
        }
      }),
      { numRuns: 60 }
    );
  });
});
