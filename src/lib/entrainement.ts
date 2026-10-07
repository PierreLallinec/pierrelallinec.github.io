import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const minutes = z.number().nonnegative();

const fileSchema = z.strictObject({
  maj: z.iso.date(),
  // [jour, natation, vélo, course, musculation, autre], en minutes
  jours: z.array(z.tuple([z.iso.date(), minutes, minutes, minutes, minutes, minutes])),
});

/** Les disciplines, dans l'ordre où elles se suivent sur les graphiques. */
export const DISCIPLINES = ['natation', 'velo', 'course', 'muscu', 'autre'] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export interface Day {
  natation: number;
  velo: number;
  course: number;
  muscu: number;
  autre: number;
  total: number;
}

export interface Training {
  /** Dernier jour connu : rien n'est affiché au-delà. */
  maj: string;
  /** Premier jour de données : avant lui, on ne sait rien, ce n'est pas du repos. */
  debut: string;
  days: Map<string, Day>;
}

export interface YearTotal extends Day {
  annee: number;
  jours: number;
  /** Faux pour l'année en cours : une barre partielle tromperait. */
  complete: boolean;
}

export function parseTraining(jsonText: string): Training {
  const result = fileSchema.safeParse(JSON.parse(jsonText));
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`entrainement.json : ${issue.path.join('.')} : ${issue.message}`);
  }
  const days = new Map<string, Day>();
  for (const [date, natation, velo, course, muscu, autre] of result.data.jours) {
    if (days.has(date)) throw new Error(`entrainement.json : le jour ${date} figure deux fois.`);
    const total = natation + velo + course + muscu + autre;
    // Garde-fou contre un export fautif : activités comptées deux fois, montre oubliée en marche.
    if (total > 24 * 60) throw new Error(`entrainement.json : le jour ${date} dépasse 24 heures (${total} min).`);
    days.set(date, { natation, velo, course, muscu, autre, total });
  }
  const debut = [...days.keys()].sort()[0] ?? result.data.maj;
  return { maj: result.data.maj, debut, days };
}

export function loadTraining(): Training {
  return parseTraining(readFileSync(resolve('src/data/entrainement.json'), 'utf8'));
}

export function yearTotals(training: Training): YearTotal[] {
  const lastYear = Number(training.maj.slice(0, 4));
  const years = new Map<number, YearTotal>();
  for (const [date, day] of training.days) {
    const annee = Number(date.slice(0, 4));
    const year = years.get(annee) ?? { annee, natation: 0, velo: 0, course: 0, muscu: 0, autre: 0, total: 0, jours: 0, complete: annee < lastYear };
    for (const key of [...DISCIPLINES, 'total'] as const) year[key] += day[key];
    year.jours += 1;
    years.set(annee, year);
  }
  return [...years.values()].sort((a, b) => a.annee - b.annee);
}

/** Jours d'un mois (1 à 12) placés en grille, lundi en première colonne, de `firstDate` à `lastDate` inclus. */
export function monthCells(
  year: number,
  month: number,
  lastDate: string,
  firstDate = '0000-00-00',
): { date: string; col: number; row: number }[] {
  const cells = [];
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let row = 0;
  for (let day = 1; day <= count; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const col = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
    if (day > 1 && col === 0) row += 1;
    if (date >= firstDate && date <= lastDate) cells.push({ date, col, row });
  }
  return cells;
}

/** Niveau d'intensité d'une journée : 0 repos, puis moins de 45 min, 90 min, 2 h 30, et au-delà. */
export function bucket(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 45) return 1;
  if (minutes < 90) return 2;
  if (minutes < 150) return 3;
  return 4;
}

/** Parts d'un anneau de longueur `circumference`, une par discipline pratiquée dans l'année. */
export function ringSlices(year: Day, circumference: number): { key: Discipline; start: number; length: number }[] {
  let start = 0;
  return DISCIPLINES.filter((key) => year[key] > 0).map((key) => {
    const length = (year[key] / year.total) * circumference;
    const slice = { key, start, length };
    start += length;
    return slice;
  });
}
