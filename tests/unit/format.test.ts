import { describe, expect, it } from 'vitest';
import { formatDate, formatDuration, formatNumber, formatRank, sortKey, toSeconds, yearOf } from '../../src/lib/format';

describe('formatDate', () => {
  it('formate une date complète', () => {
    expect(formatDate('2023-10-01', 'fr')).toBe('1er octobre 2023');
    expect(formatDate('2023-10-01', 'en')).toBe('1 October 2023');
    expect(formatDate('2025-04-27', 'fr')).toBe('27 avril 2025');
  });

  it("suit la précision d'une date partielle", () => {
    expect(formatDate('2019-10', 'fr')).toBe('octobre 2019');
    expect(formatDate('2019-10', 'en')).toBe('October 2019');
    expect(formatDate('2020', 'fr')).toBe('2020');
  });
});

describe('sortKey', () => {
  it('place une date partielle en fin de période', () => {
    expect(sortKey('2019-06') > sortKey('2019-06-02')).toBe(true);
    expect(sortKey('2023') > sortKey('2023-10-01')).toBe(true);
    expect(sortKey('2019') < sortKey('2020-01-01')).toBe(true);
  });
});

describe('yearOf', () => {
  it("extrait l'année quelle que soit la précision", () => {
    expect(yearOf('2023-10-01')).toBe(2023);
    expect(yearOf('2019-10')).toBe(2019);
    expect(yearOf('2020')).toBe(2020);
  });
});

describe('formatNumber', () => {
  it('sépare les milliers selon la langue', () => {
    expect(formatNumber(2290, 'fr')).toBe('2 290');
    expect(formatNumber(2290, 'en')).toBe('2,290');
    expect(formatNumber(42894, 'fr')).toBe('42 894');
    expect(formatNumber(537, 'fr')).toBe('537');
  });
});

describe('formatRank', () => {
  it('affiche le rang et son effectif', () => {
    expect(formatRank(97, 2290, 'fr')).toBe('97e / 2 290');
    expect(formatRank(97, 2290, 'en')).toBe('97th / 2,290');
  });

  it('affiche le rang seul sans effectif', () => {
    expect(formatRank(41, undefined, 'fr')).toBe('41e');
    expect(formatRank(41, undefined, 'en')).toBe('41st');
  });

  it('gère les ordinaux particuliers', () => {
    expect(formatRank(1, 10, 'fr')).toBe('1er / 10');
    expect(formatRank(1, 10, 'en')).toBe('1st / 10');
    expect(formatRank(21, undefined, 'en')).toBe('21st');
    expect(formatRank(22, undefined, 'en')).toBe('22nd');
    expect(formatRank(2, 444, 'fr')).toBe('2e / 444');
    expect(formatRank(2, 444, 'en')).toBe('2nd / 444');
    expect(formatRank(3, undefined, 'en')).toBe('3rd');
    expect(formatRank(11, undefined, 'en')).toBe('11th');
    expect(formatRank(112, undefined, 'en')).toBe('112th');
    expect(formatRank(123, undefined, 'en')).toBe('123rd');
  });

  it('renvoie une chaîne vide sans rang, même avec un effectif', () => {
    expect(formatRank(undefined, undefined, 'fr')).toBe('');
    expect(formatRank(undefined, 500, 'fr')).toBe('');
  });
});

describe('toSeconds', () => {
  it('convertit h:mm:ss et mm:ss', () => {
    expect(toSeconds('9:58:59')).toBe(35939);
    expect(toSeconds('1:09:48')).toBe(4188);
    expect(toSeconds('45:07')).toBe(2707);
  });

  it('renvoie undefined pour un temps sans secondes ou en texte libre', () => {
    expect(toSeconds('10 h 35')).toBeUndefined();
    expect(toSeconds('24 h')).toBeUndefined();
    expect(toSeconds('1:75:00')).toBeUndefined();
  });
});

describe('formatDuration', () => {
  it('écrit une durée en minutes de façon lisible', () => {
    expect(formatDuration(0, 'fr')).toBe('repos');
    expect(formatDuration(0, 'en')).toBe('rest');
    expect(formatDuration(40, 'fr')).toBe('40 min');
    expect(formatDuration(80, 'fr')).toBe('1 h 20');
    expect(formatDuration(120, 'en')).toBe('2 h');
    expect(formatDuration(125, 'fr')).toBe('2 h 05');
  });
});
