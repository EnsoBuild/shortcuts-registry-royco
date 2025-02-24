import { expect } from 'vitest';

export function expectBigIntToBeCloseTo(received: bigint, expected: bigint, tolerance: bigint = 1n): void {
  expect(
    received >= expected - tolerance && received <= expected + tolerance,
    `- Expected: ${expected}, + Received: ${received}, +/- Tolerance: ${tolerance}. `,
  ).toBe(true);
}
