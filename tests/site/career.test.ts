import { describe, expect, it } from 'vitest';
import { site } from '../../src/config';
import { loadParcours } from '../../src/lib/parcours';
import { loadPage } from './helpers';

const fr = loadPage('/fr/parcours/');
const en = loadPage('/career/');
const parcours = loadParcours();

describe('page Parcours', () => {
  it('raconte le parcours en paragraphes, dans la langue de la page', () => {
    const paragraphs = fr.querySelectorAll('[data-story] p');
    expect(paragraphs).toHaveLength(parcours.recit.length);
    expect(paragraphs[0].text).toContain("J'ai commencé par la finance");
    expect(en.querySelectorAll('[data-story] p')[0].text).toContain('I started in finance');
    expect(en.querySelector('[data-story]')?.text).not.toContain("J'ai");
  });

  it('décrit le rôle tenu chez Cigusto sans s’attribuer le développement', () => {
    for (const doc of [fr, en]) {
      const text = doc.querySelector('main')?.text ?? '';
      expect(text).not.toMatch(/j'ai (conçu|construit|développé) un ERP/i);
      expect(text).not.toMatch(/I (built|developed|coded) (an|the) ERP/i);
    }
    expect(fr.querySelector('[data-story]')?.text).toContain('rôle produit');
  });

  it('reprend les précisions de Pierre sur Comet, les enseignes et Figures', () => {
    const story = { fr: fr.querySelector('[data-story]')?.text ?? '', en: en.querySelector('[data-story]')?.text ?? '' };
    expect(story.en).toMatch(/Comet, which was part of the Kima Ventures portfolio/);
    expect(story.fr).toMatch(/Comet, une société du portefeuille de Kima Ventures/);
    expect(story.en).toContain('hairdressing');
    expect(story.fr).toContain('coiffure');
    expect(story.en).not.toMatch(/clothing and services|three tools/);
    expect(story.fr).not.toMatch(/trois outils/);
    expect(story.en).toContain('several tools');
  });

  it('place à côté du récit la formation, les langues et le bouton LinkedIn', () => {
    for (const doc of [fr, en]) {
      const aside = doc.querySelector('.career-intro aside');
      expect(aside?.querySelector('[data-education]')).not.toBeNull();
      expect(aside?.querySelector('[data-languages]')).not.toBeNull();
      expect(aside?.querySelector(`a.button[href="${site.linkedin}"]`)?.text.trim()).toBe('LinkedIn');
      expect(doc.querySelector('.career-intro [data-story]')).not.toBeNull();
    }
  });

  it('présente un bloc de réalisations par structure', () => {
    const blocks = fr.querySelectorAll('[data-block]');
    expect(blocks).toHaveLength(parcours.realisations.length);
    blocks.forEach((block, i) => {
      expect(block.querySelector('h2')?.text).toContain(parcours.realisations[i].titre.fr);
      expect(block.querySelectorAll('[data-realisation]')).toHaveLength(parcours.realisations[i].elements.length);
    });
    const titles = en.querySelectorAll('[data-block] h2').map((h) => h.text);
    expect(titles.some((t) => t.includes('Figures'))).toBe(true);
    const cigusto = fr.querySelectorAll('[data-block]').find((b) => b.querySelector('h2')?.text.includes('Cigusto'));
    expect(cigusto?.querySelectorAll('[data-realisation] h3').map((h) => h.text.trim())).toEqual(['ERP', 'WMS', 'BI']);
    expect(cigusto?.querySelector('h2')?.text).not.toMatch(/\d{4}/);
  });

  it('affiche les outils en étiquettes, dans l’ordre du fichier', () => {
    const tags = fr.querySelectorAll('.tag .tag-name').map((n) => n.text.trim());
    expect(tags).toEqual(parcours.outils.map((o) => o.nom));
    expect(tags).not.toContain('XGBoost');
  });

  it('révèle au survol ou au clavier les expériences liées à un outil', () => {
    const tag = (doc: typeof fr, name: string) => doc.querySelectorAll('.tag').find((t) => t.querySelector('.tag-name')?.text.trim() === name);
    const sql = tag(fr, 'SQL')!;
    expect(sql.getAttribute('tabindex')).toBe('0');
    expect(sql.querySelector('.tag-tip')?.text).toMatch(/Comet.*Cigusto.*Figures.*Projets perso/s);
    expect(tag(en, 'SQL')!.querySelector('.tag-tip')?.text).toContain('Side projects');
    for (const name of ['LLM', 'Git']) expect(tag(en, name)!.querySelector('.tag-tip')?.text.trim()).toBe('Side projects, Figures');
    const bare = parcours.outils.find((o) => o.experiences.length === 0);
    if (bare) {
      expect(tag(fr, bare.nom)!.querySelector('.tag-tip')).toBeNull();
      expect(tag(fr, bare.nom)!.hasAttribute('tabindex')).toBe(false);
    }
  });

  it('affiche les écoles sans années, et les langues traduites', () => {
    const education = fr.querySelector('[data-education]')?.text ?? '';
    for (const school of ['ESSCA', 'Fordham University']) expect(education).toContain(school);
    expect(education).not.toMatch(/\b(19|20)\d{2}\b/);
    expect(fr.querySelectorAll('[data-languages] li').map((n) => n.text.trim())).toEqual(['Français', 'Anglais']);
    expect(en.querySelectorAll('[data-languages] li').map((n) => n.text.trim())).toEqual(['French', 'English']);
  });

  it('n’affiche ni valeur manquante ni mention du télétravail', () => {
    for (const doc of [fr, en]) {
      expect(doc.text).not.toMatch(/undefined|null|NaN/);
      expect(doc.text).not.toMatch(/télétravail|remote/i);
    }
  });
});
