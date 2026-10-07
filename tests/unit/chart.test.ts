import { describe, expect, it } from 'vitest';
import { decimalYear, plot } from '../../src/lib/chart';

describe('decimalYear', () => {
  it('place une date dans son année', () => {
    expect(decimalYear('2020-01-01')).toBeCloseTo(2020, 2);
    expect(decimalYear('2020-07-02')).toBeCloseTo(2020.5, 1);
    expect(decimalYear('2020')).toBeGreaterThan(2020.9);
  });
});

describe('plot', () => {
  const box = { width: 400, height: 200, left: 20, right: 30, top: 10, bottom: 40 };
  const points = plot(
    [
      { x: 2016, y: 6427 },
      { x: 2018, y: 5534 },
      { x: 2025, y: 4762 },
    ],
    box,
  );

  it('étale le temps de gauche à droite dans le cadre', () => {
    expect(points[0].px).toBe(20);
    expect(points[2].px).toBe(370);
    expect(points[1].px).toBeGreaterThan(points[0].px);
  });

  it('place le plus rapide en haut et le plus lent en bas', () => {
    expect(points[2].py).toBe(10);
    expect(points[0].py).toBe(160);
  });

  it('centre un point unique', () => {
    expect(plot([{ x: 2020, y: 100 }], box)).toEqual([{ px: 195, py: 85 }]);
  });
});
