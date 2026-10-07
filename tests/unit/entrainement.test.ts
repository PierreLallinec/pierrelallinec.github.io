import { describe, expect, it } from 'vitest';
import { bucket, loadTraining, monthCells, parseTraining, ringSlices, yearTotals } from '../../src/lib/entrainement';

const sample = JSON.stringify({
  maj: '2025-02-03',
  jours: [
    ['2024-01-01', 30, 0, 45, 20, 0],
    ['2024-12-31', 0, 120, 0, 0, 15],
    ['2025-02-03', 0, 0, 60, 0, 0],
  ],
});

describe('parseTraining', () => {
  it('lit les jours et leur total', () => {
    const training = parseTraining(sample);
    expect(training.maj).toBe('2025-02-03');
    expect(training.days.get('2024-01-01')).toEqual({ natation: 30, velo: 0, course: 45, muscu: 20, autre: 0, total: 95 });
  });

  it.each([
    ['une date mal formée', sample.replace('2024-01-01', '01/01/2024')],
    ['des minutes négatives', sample.replace('"2024-01-01",30', '"2024-01-01",-30')],
    ['un jour en double', sample.replace('2024-12-31', '2024-01-01')],
    ['une journée de plus de 24 heures', sample.replace('"2024-12-31",0,120', '"2024-12-31",0,1500')],
  ])('refuse %s', (_label, json) => {
    expect(() => parseTraining(json)).toThrow(/entrainement\.json/);
  });
});

describe('yearTotals', () => {
  const training = parseTraining(sample);

  it('additionne par année et par discipline, en minutes', () => {
    expect(yearTotals(training)).toEqual([
      { annee: 2024, natation: 30, velo: 120, course: 45, muscu: 20, autre: 15, total: 230, jours: 2, complete: true },
      { annee: 2025, natation: 0, velo: 0, course: 60, muscu: 0, autre: 0, total: 60, jours: 1, complete: false },
    ]);
  });
});

describe('monthCells', () => {
  it('place chaque jour dans sa colonne de semaine, lundi en premier', () => {
    const cells = monthCells(2024, 1, '2026-01-01');
    expect(cells).toHaveLength(31);
    expect(cells[0]).toMatchObject({ date: '2024-01-01', col: 0, row: 0 });
    expect(cells[6]).toMatchObject({ date: '2024-01-07', col: 6, row: 0 });
    expect(cells[7]).toMatchObject({ date: '2024-01-08', col: 0, row: 1 });
  });

  it('commence au bon jour quand le mois ne débute pas un lundi', () => {
    expect(monthCells(2025, 2, '2026-01-01')[0]).toMatchObject({ date: '2025-02-01', col: 5, row: 0 });
    expect(monthCells(2024, 2, '2026-01-01')).toHaveLength(29);
  });

  it('ne remonte pas avant la première date connue', () => {
    expect(monthCells(2018, 2, '2026-01-01', '2018-02-11')[0]).toMatchObject({ date: '2018-02-11', col: 6, row: 1 });
    expect(monthCells(2018, 1, '2026-01-01', '2018-02-11')).toEqual([]);
  });

  it('s’arrête à la dernière date connue', () => {
    expect(monthCells(2025, 2, '2025-02-03').map((c) => c.date)).toEqual(['2025-02-01', '2025-02-02', '2025-02-03']);
    expect(monthCells(2025, 3, '2025-02-03')).toEqual([]);
  });
});

describe('bucket', () => {
  it('range une durée en cinq niveaux', () => {
    expect([0, 1, 44, 45, 89, 90, 149, 150, 1600].map(bucket)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

it('le fichier réel se charge', () => {
  expect(loadTraining().days.size).toBeGreaterThan(100);
});

describe('ringSlices', () => {
  it('découpe un anneau en parts proportionnelles, sans les disciplines vides', () => {
    const [year] = yearTotals(parseTraining(sample));
    const slices = ringSlices(year, 100);
    expect(slices.map((s) => s.key)).toEqual(['natation', 'velo', 'course', 'muscu', 'autre']);
    expect(slices[0]).toMatchObject({ start: 0, length: (30 / 230) * 100 });
    expect(slices.at(-1)!.start + slices.at(-1)!.length).toBeCloseTo(100, 6);
  });

  it('ignore une discipline à zéro', () => {
    const year = yearTotals(parseTraining(sample))[1];
    expect(ringSlices(year, 100).map((s) => s.key)).toEqual(['course']);
  });
});
