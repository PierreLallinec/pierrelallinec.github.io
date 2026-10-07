import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { sortKey, toSeconds, yearOf } from './format';

const bilingual = z.strictObject({ fr: z.string().optional(), en: z.string().optional() });

/** Vrai pour une date partielle, ou pour un jour qui existe (30 février refusé). */
function isRealDate(date: string): boolean {
  const [year, month, day] = date.split('-').map(Number);
  if (day === undefined) return true;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

const courseSchema = z.strictObject({
  // YAML lit `2020` comme un nombre : on le ramène à une chaîne.
  date: z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(
      z
        .string()
        .regex(/^[12]\d{3}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/, 'attendu AAAA, AAAA-MM ou AAAA-MM-JJ')
        .refine(isRealDate, 'ce jour n’existe pas dans le calendrier'),
    ),
  nom: z.string().min(1),
  lieu: z.string().min(1).optional(),
  discipline: z.enum(['triathlon', 'course', 'velo', 'trail']),
  format: z.union([z.string(), z.number()]).transform(String).pipe(z.string().min(1)),
  temps: z.string().min(1),
  classement: z.number().int().positive().optional(),
  participants: z.number().int().positive().optional(),
  lien: z.url().optional(),
  mention: bilingual.optional(),
  marquante: z.boolean().default(false),
  partiels: z
    .strictObject({
      natation: z.string().min(1),
      t1: z.string().min(1).optional(),
      velo: z.string().min(1),
      t2: z.string().min(1).optional(),
      course: z.string().min(1),
    })
    .optional(),
});

export type Course = z.infer<typeof courseSchema>;

export function parseCourses(yamlText: string): Course[] {
  const raw: unknown = parse(yamlText);
  if (!Array.isArray(raw)) throw new Error('courses.yaml : le fichier doit être une liste de courses.');
  const courses = raw.map((entry, index) => {
    const result = courseSchema.safeParse(entry);
    if (result.success) return result.data;
    const label = `${entry?.nom ?? 'sans nom'} (${entry?.date ?? 'sans date'})`;
    const issues = result.error.issues.map((i) => `${i.path.join('.') || 'entrée'} : ${i.message}`).join(' ; ');
    throw new Error(`courses.yaml, entrée ${index + 1}, ${label} : ${issues}`);
  });
  return courses.sort((a, b) => sortKey(b.date).localeCompare(sortKey(a.date)));
}

export function loadCourses(): Course[] {
  return parseCourses(readFileSync(resolve('src/data/courses.yaml'), 'utf8'));
}

export function featured(courses: Course[]): Course[] {
  return courses.filter((c) => c.marquante);
}

export function groupByYear(courses: Course[]): { year: number; courses: Course[] }[] {
  const groups: { year: number; courses: Course[] }[] = [];
  for (const course of courses) {
    const year = yearOf(course.date);
    const last = groups.at(-1);
    if (last?.year === year) last.courses.push(course);
    else groups.push({ year, courses: [course] });
  }
  return groups;
}

/** Courses d'un même format dont le temps est chiffrable, de la plus ancienne à la plus récente. */
export function progression(courses: Course[], format: string): { course: Course; seconds: number }[] {
  return courses
    .filter((course) => course.format === format)
    .flatMap((course) => {
      const seconds = toSeconds(course.temps);
      return seconds === undefined ? [] : [{ course, seconds }];
    })
    .sort((a, b) => sortKey(a.course.date).localeCompare(sortKey(b.course.date)));
}
