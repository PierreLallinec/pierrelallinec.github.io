import { describe, expect, it } from 'vitest';
import { featured, loadCourses } from '../../src/lib/courses';
import { loadTraining, yearTotals } from '../../src/lib/entrainement';
import { formatDate, toSeconds } from '../../src/lib/format';
import { loadPage } from './helpers';

const fr = loadPage('/fr/sport/');
const en = loadPage('/sport/');
// Les effectifs viennent du fichier : ajouter une course ne casse aucun test.
const courses = loadCourses();
const training = loadTraining();
const rows = (doc: typeof fr) => doc.querySelectorAll('table.courses tbody tr');

describe('page Sport', () => {
  it('met en avant les courses marquantes du fichier', () => {
    expect(fr.querySelectorAll('[data-featured]')).toHaveLength(featured(courses).length);
    expect(en.querySelectorAll('[data-featured]')).toHaveLength(featured(courses).length);
  });

  it('liste toutes les courses dans des tableaux par année', () => {
    expect(rows(fr)).toHaveLength(courses.length);
    expect(rows(en)).toHaveLength(courses.length);
    const years = fr.querySelectorAll('[data-year]').map((n) => Number(n.getAttribute('data-year')));
    expect(years).toEqual([...new Set(courses.map((c) => Number(c.date.slice(0, 4))))]);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it('écrit les résultats dans le HTML', () => {
    expect(fr.text).toContain('9:58:59');
    expect(fr.text).toContain('97e / 2 290');
    expect(en.text).toContain('97th / 2,290');
  });

  it('affiche un rang seul quand l’effectif manque', () => {
    const row = rows(fr).find((r) => r.text.includes('Triathlon de Cannes'));
    expect(row?.querySelector('[data-rank]')?.text.trim()).toBe('41e');
  });

  it('laisse la case vide sans classement', () => {
    const row = rows(fr).find((r) => r.text.includes('10 km de Tours'));
    expect(row?.querySelector('[data-rank]')?.text.trim()).toBe('');
    expect(fr.text).not.toMatch(/undefined|NaN|null/);
    expect(en.text).not.toMatch(/undefined|NaN|null/);
  });

  it('date chaque course avec un élément time, à la précision du fichier', () => {
    const times = fr.querySelectorAll('table.courses tbody time');
    expect(times.map((t) => t.getAttribute('datetime'))).toEqual(courses.map((c) => c.date));
    for (const course of courses) {
      expect(fr.text).toContain(formatDate(course.date, 'fr'));
      expect(en.text).toContain(formatDate(course.date, 'en'));
    }
  });

  it('replie les temps par discipline', () => {
    const row = rows(fr).find((r) => r.text.includes('Triathlon de Cannes'));
    expect(row?.querySelector('details summary')?.text).toContain('Temps par discipline');
    expect(row?.querySelector('details')?.text).toContain('2:44:21');
    const plain = rows(fr).find((r) => r.text.includes('10 km de Tours'));
    expect(plain?.querySelector('details')).toBeNull();
  });

  it('fait du temps un lien vers le résultat officiel quand il existe', () => {
    const linked = courses.filter((c) => c.lien);
    const links = fr.querySelectorAll('td.race-time a[data-official]');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(linked.map((c) => c.lien));
    for (const link of links) expect(link.getAttribute('title')).toBe('Résultat officiel');
    expect(fr.querySelector('tbody th a')).toBeNull();
    const plain = rows(fr).find((r) => r.text.includes('10 km de Tours'));
    expect(plain?.querySelector('td.race-time a')).toBeNull();
  });

  it('traduit mentions, disciplines et formats', () => {
    expect(fr.text).toContain('Premier Ironman sous les 10 heures');
    expect(en.text).toContain('First sub-10 Ironman');
    expect(en.text).not.toContain('Premier Ironman');
    expect(en.text).toContain('half marathon');
    expect(en.text).not.toContain('Course à pied');
  });

  it('structure le tableau', () => {
    expect(fr.querySelectorAll('table.courses thead th[scope=col]').length).toBeGreaterThanOrEqual(5);
    expect(fr.querySelectorAll('table.courses tbody th[scope=row]')).toHaveLength(courses.length);
    expect(fr.querySelectorAll('table.courses caption').length).toBe(fr.querySelectorAll('table.courses').length);
  });
});

describe('graphiques de la page Sport', () => {
  it('dessine la barre de temps partiels des courses marquantes qui les ont', () => {
    const card = fr.querySelectorAll('[data-featured]').find((c) => c.text.includes('Ironman de Barcelone'));
    const grow = card!
      .querySelectorAll('[data-segment]')
      .map((s) => Number(/flex-grow:\s*(\d+)/.exec(s.getAttribute('style') ?? '')?.[1]));
    expect(grow).toEqual([4188, 17468, 13674]);
  });

  it('range les fiertés par discipline, du temps le plus court au plus long', () => {
    const groups = fr.querySelectorAll('[data-proud]');
    const order = ['triathlon', 'course', 'velo', 'trail'];
    const present = order.filter((d) => featured(courses).some((c) => c.discipline === d));
    expect(groups.map((g) => g.getAttribute('data-proud'))).toEqual(present);
    for (const group of groups) {
      const discipline = group.getAttribute('data-proud');
      const expected = featured(courses)
        .filter((c) => c.discipline === discipline)
        .sort((a, b) => (toSeconds(a.temps) ?? Infinity) - (toSeconds(b.temps) ?? Infinity))
        .map((c) => c.nom);
      expect(group.querySelectorAll('[data-featured] h4').map((h) => h.text.trim())).toEqual(expected);
    }
    expect(fr.querySelector('#featured')?.text).toBe('Ce dont je suis fier');
    expect(en.querySelector('#featured')?.text).toBe('Most proud of');
  });

  it('n’affiche plus la progression ni les heures par an', () => {
    for (const doc of [fr, en]) {
      expect(doc.querySelector('[data-progress]')).toBeNull();
      expect(doc.querySelector('[data-volume]')).toBeNull();
      expect(doc.querySelector('#progress')).toBeNull();
    }
  });

  it('titre la section d’entraînement et la légende d’un clin d’œil', () => {
    expect(fr.querySelector('#volume')?.text).toBe('Entraînement');
    expect(en.querySelector('#volume')?.text).toBe('Training');
    expect(fr.querySelector('#volume + .section-intro')?.text.trim()).toBe("J'aime la data, et vous ?");
    expect(en.querySelector('#volume + .section-intro')?.text.trim()).toBe('I love data. How about you?');
  });

  it('montre un point par jour de la première à la dernière année, dans une bande à faire défiler', () => {
    const lastYear = Number(training.maj.slice(0, 4));
    const firstDate = [...training.days.keys()].sort()[0];
    const firstYear = Number(firstDate.slice(0, 4));
    const span = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);
    for (const doc of [fr, en]) {
      const blocks = doc.querySelectorAll('[data-calendar-year]');
      expect(blocks.map((b) => Number(b.getAttribute('data-calendar-year')))).toEqual(span);
      const full = blocks.at(-2)!;
      expect(full.querySelectorAll('svg[data-month]')).toHaveLength(12);
      const days = full.querySelectorAll('circle[data-day]');
      expect([365, 366]).toContain(days.length);
      const levels = new Set(days.map((d) => d.getAttribute('data-level')));
      expect(levels.size).toBeGreaterThanOrEqual(4);
      const dayOfYear = Math.round((Date.parse(training.maj) - Date.UTC(lastYear, 0, 1)) / 86400000) + 1;
      expect(blocks.at(-1)!.querySelectorAll('circle[data-day]')).toHaveLength(dayOfYear);
      // Aucun point avant le premier jour de données : ce ne serait pas du repos, mais de l'inconnu.
      const firstDays = blocks[0].querySelectorAll('circle[data-day] title').map((t) => t.text);
      expect(firstDays.length).toBeLessThan(365);
      const strip = doc.querySelector('[data-calendar] .calendar-years');
      expect(strip?.getAttribute('tabindex')).toBe('0');
      expect(strip?.getAttribute('role')).toBe('region');
      expect(doc.querySelectorAll('[data-calendar] button[data-scroll]')).toHaveLength(2);
    }
  });

  it('coiffe chaque année d’un anneau : heures au centre, répartition par discipline autour', () => {
    const totals = new Map(yearTotals(training).map((y) => [y.annee, y]));
    for (const block of fr.querySelectorAll('[data-calendar-year]')) {
      const year = totals.get(Number(block.getAttribute('data-calendar-year')));
      const ring = block.querySelector('[data-ring]');
      // Une année sans aucune activité n'a pas d'anneau.
      if (!year) {
        expect(ring).toBeNull();
        continue;
      }
      expect(ring?.querySelector('.ring-hours')?.text.trim()).toBe(String(Math.round(year.total / 60)));
      const keys = ring!.querySelectorAll('circle[data-slice]').map((c) => c.getAttribute('data-slice'));
      expect(keys).toEqual(['natation', 'velo', 'course', 'muscu', 'autre'].filter((k) => year[k as 'natation'] > 0));
    }
    expect(fr.querySelector('[data-calendar] .ring-legend')?.text).toMatch(/Natation.*Vélo.*Course à pied.*Musculation.*Autre/s);
    expect(en.querySelector('[data-calendar] .ring-legend')?.text).toMatch(/Swim.*Bike.*Run.*Strength.*Other/s);
  });

  it('ponctue les infobulles à l’anglaise sur les pages anglaises', () => {
    const titles = en.querySelectorAll('circle[data-day] title, circle[data-slice] title').map((t) => t.text);
    expect(titles.length).toBeGreaterThan(100);
    for (const title of titles.slice(0, 300)) expect(title).toMatch(/^[^:]*\S: \S/);
  });

  it('ne publie que des durées', () => {
    const titles = fr.querySelectorAll('circle[data-day] title').map((t) => t.text);
    expect(titles.length).toBeGreaterThan(2900);
    for (const title of titles.slice(0, 200)) expect(title).toMatch(/^\d{1,2}(er)? [a-zéû]+ \d{4} : (repos|\d+ min|\d+ h( \d{2})?)$/);
  });

});
