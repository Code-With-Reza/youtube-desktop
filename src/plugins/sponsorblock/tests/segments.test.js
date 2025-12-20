import { test, expect } from '@playwright/test';

import { sortSegments } from '../segments';

test('Segment sorting', () => {
  expect(
    sortSegments([
      { segment: [0, 3], category: 'sponsor' },
      { segment: [7, 8], category: 'sponsor' },
      { segment: [5, 6], category: 'sponsor' },
    ]),
  ).toEqual([
    { segment: [0, 3], category: 'sponsor' },
    { segment: [5, 6], category: 'sponsor' },
    { segment: [7, 8], category: 'sponsor' },
  ]);

  expect(
    sortSegments([
      { segment: [0, 5], category: 'sponsor' },
      { segment: [6, 8], category: 'sponsor' },
      { segment: [4, 6], category: 'sponsor' },
    ]),
  ).toEqual([{ segment: [0, 8], category: 'sponsor' }]);

  expect(
    sortSegments([
      { segment: [0, 6], category: 'sponsor' },
      { segment: [7, 8], category: 'sponsor' },
      { segment: [4, 6], category: 'sponsor' },
    ]),
  ).toEqual([
    { segment: [0, 6], category: 'sponsor' },
    { segment: [7, 8], category: 'sponsor' },
  ]);
});
