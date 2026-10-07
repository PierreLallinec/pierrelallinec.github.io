import { describe, expect, it } from 'vitest';
import { site } from '../../src/config';
import { loadPage, ORIGIN, PAGES } from './helpers';

describe.each(PAGES)('$path', ({ path, lang, twin }) => {
  const doc = loadPage(path);

  it('déclare sa langue', () => {
    expect(doc.querySelector('html')?.getAttribute('lang')).toBe(lang);
  });

  it('a un titre qui commence par le nom et une description', () => {
    expect(doc.querySelector('title')?.text).toMatch(/^Pierre Lallinec/);
    expect(doc.querySelector('meta[name=description]')?.getAttribute('content')?.length).toBeGreaterThan(50);
  });

  it('a un seul h1', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
  });

  it('a une URL canonique et ses alternatives de langue', () => {
    expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(ORIGIN + path);
    const other = lang === 'fr' ? 'en' : 'fr';
    expect(doc.querySelector(`link[hreflang=${lang}]`)?.getAttribute('href')).toBe(ORIGIN + path);
    expect(doc.querySelector(`link[hreflang=${other}]`)?.getAttribute('href')).toBe(ORIGIN + twin);
    expect(doc.querySelector('link[hreflang=x-default]')?.getAttribute('href')).toBe(
      ORIGIN + (lang === 'en' ? path : twin),
    );
  });

  it('a un toggle de langue qui mène à la même page', () => {
    expect(doc.querySelector('a[data-lang-switch]')?.getAttribute('href')).toBe(twin);
  });

  it("n'affiche le lien d'agenda que s'il est renseigné", () => {
    const links = doc.querySelectorAll('a[data-agenda]');
    if (site.agenda) {
      // Au moins le pied de page ; l'accueil en porte un second.
      expect(links.length).toBeGreaterThanOrEqual(1);
      for (const link of links) expect(link.getAttribute('href')).toBe(site.agenda);
    } else {
      expect(links).toHaveLength(0);
    }
    expect(doc.querySelectorAll('a').filter((a) => !a.getAttribute('href'))).toHaveLength(0);
  });

  it('ne pointe que vers des pages internes qui existent', () => {
    const internal = doc
      .querySelectorAll('a')
      .map((a) => a.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('/fr/'));
    const known = PAGES.map((p) => p.path as string);
    for (const href of internal) expect(known).toContain(href);
  });
});

it("le h1 de l'accueil contient le nom", () => {
  expect(loadPage('/fr/').querySelector('h1')?.text).toContain('Pierre Lallinec');
  expect(loadPage('/').querySelector('h1')?.text).toContain('Pierre Lallinec');
});
