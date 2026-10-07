import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

const bilingual = z.strictObject({ fr: z.string().min(1), en: z.string().min(1) });
const year = z.number().int().min(1990).max(2100);

const experienceSchema = z.strictObject({
  debut: year,
  fin: year.optional(),
  structure: z.string().min(1),
  // Libellé court pour la frise, quand `structure` est trop long pour y tenir.
  repere: bilingual.optional(),
  poste: bilingual,
});

const parcoursSchema = z.strictObject({
  experiences: z.array(z.unknown()).min(1),
  // Le récit de la page Parcours, un élément par paragraphe.
  recit: z.array(bilingual).min(1),
  // Un bloc par structure. `periode` date un travail terminé, pour qu'il ne passe pas pour actuel.
  realisations: z.array(
    z.strictObject({
      titre: bilingual,
      periode: z.string().min(1).optional(),
      elements: z.array(z.strictObject({ titre: bilingual, texte: bilingual })).min(1),
    }),
  ),
  // `experiences` : où l'outil a servi, affiché au survol. « perso » désigne les projets personnels.
  outils: z.array(z.strictObject({ nom: z.string().min(1), experiences: z.array(z.string().min(1)).default([]) })).min(1),
  formation: z.strictObject({ ecoles: z.array(z.string().min(1)).min(1) }),
  langues: z.array(bilingual).min(1),
});

export type Experience = z.infer<typeof experienceSchema>;
export type Parcours = Omit<z.infer<typeof parcoursSchema>, 'experiences'> & { experiences: Experience[] };

export type TimelineStep =
  | { kind: 'role'; debut: number; fin?: number; experience: Experience }
  | { kind: 'gap'; debut: number; fin: number };

function describe(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || 'racine'} : ${i.message}`).join(' ; ');
}

export function parseParcours(yamlText: string): Parcours {
  const top = parcoursSchema.safeParse(parse(yamlText));
  if (!top.success) throw new Error(`parcours.yaml : ${describe(top.error)}`);
  const experiences = top.data.experiences.map((entry, index) => {
    const result = experienceSchema.safeParse(entry);
    if (result.success) return result.data;
    const label = (entry as { structure?: string })?.structure ?? 'sans structure';
    throw new Error(`parcours.yaml, expérience ${index + 1}, ${label} : ${describe(result.error)}`);
  });
  experiences.sort((a, b) => b.debut - a.debut);
  return { ...top.data, experiences };
}

export function loadParcours(): Parcours {
  return parseParcours(readFileSync(resolve('src/data/parcours.yaml'), 'utf8'));
}

/** Étapes de la frise, de la plus ancienne à la plus récente, avec les périodes sans expérience. */
export function timeline(experiences: Experience[]): TimelineStep[] {
  const steps: TimelineStep[] = [];
  for (const experience of [...experiences].sort((a, b) => a.debut - b.debut)) {
    const previous = steps.at(-1);
    if (previous?.fin !== undefined && previous.fin < experience.debut) {
      steps.push({ kind: 'gap', debut: previous.fin, fin: experience.debut });
    }
    steps.push({ kind: 'role', debut: experience.debut, fin: experience.fin, experience });
  }
  return steps;
}
