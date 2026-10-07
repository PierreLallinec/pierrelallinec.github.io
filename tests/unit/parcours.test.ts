import { describe, expect, it } from 'vitest';
import { loadParcours, parseParcours, timeline } from '../../src/lib/parcours';

const minimal = `
experiences:
  - debut: 2022
    structure: Figures
    poste: { fr: Data Analyst, en: Data Analyst }
recit:
  - { fr: Premier paragraphe., en: First paragraph. }
realisations:
  - titre: { fr: Construit chez Figures, en: Built at Figures }
    elements:
      - titre: { fr: Un outil, en: A tool }
        texte: { fr: Ce qu'il fait., en: What it does. }
outils:
  - { nom: SQL, experiences: [Comet, perso] }
  - { nom: Git }
formation:
  ecoles: [ESSCA]
langues:
  - { fr: Français, en: French }
`;

const older = `  - debut: 2018\n    fin: 2020\n    structure: Comet\n    poste: { fr: A, en: A }\n`;

describe('parseParcours', () => {
  it('lit un fichier minimal', () => {
    const parcours = parseParcours(minimal);
    expect(parcours.experiences[0].structure).toBe('Figures');
    expect(parcours.experiences[0].fin).toBeUndefined();
    expect(parcours.outils).toEqual([{ nom: 'SQL', experiences: ['Comet', 'perso'] }, { nom: 'Git', experiences: [] }]);
    expect(parcours.formation.ecoles).toEqual(['ESSCA']);
    expect(parcours.langues[0].en).toBe('French');
    expect(parcours.recit).toEqual([{ fr: 'Premier paragraphe.', en: 'First paragraph.' }]);
    expect(parcours.realisations[0].titre.en).toBe('Built at Figures');
    expect(parcours.realisations[0].elements[0].titre.en).toBe('A tool');
    expect(parcours.realisations[0].periode).toBeUndefined();
  });

  it('trie les expériences de la plus récente à la plus ancienne', () => {
    const parcours = parseParcours(minimal.replace('experiences:\n', `experiences:\n${older}`));
    expect(parcours.experiences.map((e) => e.debut)).toEqual([2022, 2018]);
  });

  it.each([
    ['un poste sans anglais', minimal.replace(', en: Data Analyst', ''), /Figures.*poste/s],
    ['une date au mois', minimal.replace('debut: 2022', 'debut: 2022-09'), /Figures.*debut/s],
    ['des années de formation', minimal.replace('ecoles: [ESSCA]', 'ecoles: [ESSCA]\n  annees: 2010-2015'), /formation/],
    ['un outil sans nom', minimal.replace('  - { nom: Git }', '  - { experiences: [Comet] }'), /outils/],
    ['un paragraphe sans anglais', minimal.replace(', en: First paragraph.', ''), /recit/],
    ['une réalisation sans texte', minimal.replace("        texte: { fr: Ce qu'il fait., en: What it does. }\n", ''), /realisations/],
  ])('refuse %s', (_label, yaml, pattern) => {
    expect(() => parseParcours(yaml)).toThrow(pattern);
  });
});

describe('timeline', () => {
  const parcours = parseParcours(minimal.replace('experiences:\n', `experiences:\n${older}`));

  it('range les étapes de la plus ancienne à la plus récente', () => {
    const steps = timeline(parcours.experiences);
    expect(steps.filter((s) => s.kind === 'role').map((s) => s.debut)).toEqual([2018, 2022]);
  });

  it('signale une période sans expérience entre deux étapes', () => {
    const steps = timeline(parcours.experiences);
    expect(steps.map((s) => s.kind)).toEqual(['role', 'gap', 'role']);
    expect(steps[1]).toMatchObject({ kind: 'gap', debut: 2020, fin: 2022 });
  });

  it('n’invente pas de trou quand les étapes se suivent', () => {
    const joined = parseParcours(minimal.replace('experiences:\n', `experiences:\n${older.replace('2020', '2022')}`));
    expect(timeline(joined.experiences).map((s) => s.kind)).toEqual(['role', 'role']);
  });
});

describe('le fichier réel', () => {
  const parcours = loadParcours();

  it('se charge, avec un récit et des réalisations dans les deux langues', () => {
    expect(parcours.recit.length).toBeGreaterThanOrEqual(3);
    expect(parcours.realisations.length).toBeGreaterThanOrEqual(1);
    expect(parcours.formation.ecoles).toContain('ESSCA');
  });

  it('ne contient que ce qui s’affiche : pas de puces d’expérience restées en réserve', () => {
    expect(JSON.stringify(parcours)).not.toContain('points');
  });
});
