import { describe, expect, it } from 'vitest';
import { featured, groupByYear, loadCourses, parseCourses, progression } from '../../src/lib/courses';
import { sortKey } from '../../src/lib/format';

const minimal = `
- date: 2023-10-01
  nom: Course A
  discipline: triathlon
  format: Ironman
  temps: "9:58:59"
`;

describe('parseCourses', () => {
  it('lit une entrée minimale', () => {
    const [course] = parseCourses(minimal);
    expect(course.nom).toBe('Course A');
    expect(course.marquante).toBe(false);
    expect(course.classement).toBeUndefined();
  });

  it('accepte une année écrite sans guillemets', () => {
    const [course] = parseCourses(minimal.replace('2023-10-01', '2020'));
    expect(course.date).toBe('2020');
  });

  it('accepte un mois seul', () => {
    const [course] = parseCourses(minimal.replace('2023-10-01', '2019-10'));
    expect(course.date).toBe('2019-10');
  });

  it('trie de la plus récente à la plus ancienne, dates partielles en fin de période', () => {
    const courses = parseCourses(`
- { date: 2019-06-02, nom: Début juin, discipline: triathlon, format: M, temps: "2:28:13" }
- { date: 2019, nom: Fin 2019, discipline: trail, format: nocturne, temps: "2 h 04" }
- { date: 2019-06, nom: Juin, discipline: triathlon, format: L, temps: "4:52:31" }
- { date: 2023-10-01, nom: Récente, discipline: triathlon, format: Ironman, temps: "9:58:59" }
`);
    expect(courses.map((c) => c.nom)).toEqual(['Récente', 'Fin 2019', 'Juin', 'Début juin']);
  });

  it.each([
    ['une discipline inconnue', minimal.replace('triathlon', 'natation'), /Course A.*discipline/s],
    ['une date mal formée', minimal.replace('2023-10-01', '01/10/2023'), /Course A.*date/s],
    ['un jour qui n’existe pas', minimal.replace('2023-10-01', '2023-02-30'), /Course A.*date/s],
    ['un 29 février hors année bissextile', minimal.replace('2023-10-01', '2023-02-29'), /Course A.*date/s],
    ['une année zéro', minimal.replace('2023-10-01', '"0000"'), /Course A.*date/s],
    ['un temps manquant', minimal.replace('  temps: "9:58:59"\n', ''), /Course A.*temps/s],
    ['un classement non entier', `${minimal}  classement: premier\n`, /Course A.*classement/s],
    ['un lien qui n’est pas une URL', `${minimal}  lien: pas-une-url\n`, /Course A.*lien/s],
    ['un champ inconnu', `${minimal}  notes: privé\n`, /Course A/],
  ])('refuse %s en nommant la course', (_label, yaml, pattern) => {
    expect(() => parseCourses(yaml)).toThrow(pattern);
  });

  it('refuse un fichier qui n’est pas une liste', () => {
    expect(() => parseCourses('nom: seul')).toThrow(/liste/);
  });

  it('accepte le 29 février d’une année bissextile', () => {
    expect(parseCourses(minimal.replace('2023-10-01', '2024-02-29'))[0].date).toBe('2024-02-29');
  });

  it('accepte une mention dans une seule langue', () => {
    const [course] = parseCourses(`${minimal}  mention:\n    fr: Record personnel\n`);
    expect(course.mention?.fr).toBe('Record personnel');
    expect(course.mention?.en).toBeUndefined();
  });
});

describe('featured et groupByYear', () => {
  const courses = parseCourses(`
- { date: 2023-10-01, nom: A, discipline: triathlon, format: Ironman, temps: "9:58:59", marquante: true }
- { date: 2023, nom: B, discipline: course, format: 10 km, temps: "37:45" }
- { date: 2021-08-22, nom: C, discipline: triathlon, format: Ironman, temps: "10 h 35", marquante: true }
`);

  it('ne garde que les courses marquantes, dans l’ordre', () => {
    expect(featured(courses).map((c) => c.nom)).toEqual(['A', 'C']);
  });

  it('regroupe par année décroissante, sans année vide', () => {
    const groups = groupByYear(courses);
    expect(groups.map((g) => g.year)).toEqual([2023, 2021]);
    expect(groups[0].courses.map((c) => c.nom)).toEqual(['B', 'A']);
  });
});

describe('le fichier réel', () => {
  const courses = loadCourses();

  // Aucun nombre figé ici : ajouter une course ne doit jamais casser un test.
  it('se charge, trié, avec au moins une course marquante', () => {
    expect(courses.length).toBeGreaterThan(0);
    expect(featured(courses).length).toBeGreaterThan(0);
    const keys = courses.map((c) => sortKey(c.date));
    expect(keys).toEqual([...keys].sort().reverse());
  });

  it('ne lie aucun résultat dont l’adresse contient un numéro de dossard', () => {
    for (const course of courses) expect(course.lien ?? '', course.nom).not.toMatch(/bib[-_=/]?\d+/i);
  });

  it('ne contient aucune catégorie d’âge', () => {
    expect(JSON.stringify(courses)).not.toMatch(/\bMS\d\b/);
  });
});

describe('progression', () => {
  const courses = parseCourses(`
- { date: 2025-04-27, nom: C, discipline: course, format: semi-marathon, temps: "1:19:22" }
- { date: 2016-03-06, nom: A, discipline: course, format: semi-marathon, temps: "1:47:07" }
- { date: 2018, nom: B, discipline: course, format: semi-marathon, temps: "1 h 32" }
- { date: 2019-09-22, nom: D, discipline: course, format: 10 km, temps: "39:03" }
`);

  it('garde un format, du plus ancien au plus récent, en secondes', () => {
    const points = progression(courses, 'semi-marathon');
    expect(points.map((p) => p.course.nom)).toEqual(['A', 'C']);
    expect(points.map((p) => p.seconds)).toEqual([6427, 4762]);
  });

  it('écarte les temps sans secondes', () => {
    expect(progression(courses, 'semi-marathon').some((p) => p.course.nom === 'B')).toBe(false);
  });
});
