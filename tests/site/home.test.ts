import { describe, expect, it } from 'vitest';
import { site } from '../../src/config';
import { loadPage, readDist } from './helpers';

describe.each([['/fr/'], ['/']])('accueil %s', (path) => {
  const doc = loadPage(path);

  it('affiche le portrait avec un texte alternatif', () => {
    const img = doc.querySelector('img.portrait');
    expect(img?.getAttribute('src')).toBe('/photo.webp');
    expect(img?.getAttribute('alt')).toContain('Pierre Lallinec');
    expect(img?.getAttribute('width')).toBeTruthy();
  });

  it('présente d’abord le métier, la vie personnelle en une phrase à la fin', () => {
    const intro = doc.querySelector('.intro')?.text ?? '';
    expect(intro).toMatch(/^Data analyst/);
    const sentences = intro.trim().split(/(?<=\.)\s+/).filter(Boolean);
    expect(sentences.length).toBeGreaterThanOrEqual(3);
    expect(sentences.slice(0, -1).join(' ')).not.toMatch(/famil|sport/i);
    expect(sentences.at(-1)).toMatch(/famil/i);
  });

  it('retourne le portrait comme une pièce, vers la photo de triathlon', () => {
    const coin = doc.querySelector('button.coin');
    expect(coin?.getAttribute('aria-pressed')).toBe('false');
    expect(coin?.getAttribute('aria-label')).toBeTruthy();
    const faces = coin!.querySelectorAll('img');
    expect(faces.map((img) => img.getAttribute('src'))).toEqual(['/photo.webp', '/photo-sport.webp']);
    for (const img of faces) expect(img.getAttribute('alt')).toContain('Pierre Lallinec');
    expect(readDist('/photo-sport.webp').length).toBeGreaterThan(1000);
  });

  it('ne répète ni le menu ni le pied de page', () => {
    expect(doc.querySelector('.doors')).toBeNull();
    expect(doc.querySelector('.hero a')).toBeNull();
    expect(doc.querySelector('.site-footer')).toBeNull();
  });

  it('ne montre aucun résultat sportif', () => {
    expect(doc.querySelector('[data-splitbar]')).toBeNull();
    expect(doc.text).not.toMatch(/Ironman|\d:\d\d:\d\d/);
  });
});

describe.each([
  ['/fr/', 'Discutons'],
  ['/', "Let's chat"],
  ['/fr/sport/', 'Discutons'],
  ['/career/', "Let's chat"],
])('menu de %s', (path, talk) => {
  const header = loadPage(path).querySelector('.site-header');

  it('porte le bouton de rendez-vous, ouvert dans un nouvel onglet', () => {
    const button = header?.querySelector('a[data-agenda]');
    expect(button?.text.trim()).toBe(talk);
    expect(button?.getAttribute('href')).toBe(site.agenda);
    expect(button?.getAttribute('target')).toBe('_blank');
    expect(button?.getAttribute('rel')).toContain('noopener');
    expect(button?.classList.contains('button')).toBe(true);
  });

  it('ne porte pas le lien LinkedIn, réservé à la page Parcours', () => {
    expect(header?.querySelector(`a[href="${site.linkedin}"]`)).toBeNull();
  });
});

describe.each([
  ['/fr/', 'Stages en finance'],
  ['/', 'Finance internships'],
])('frise de parcours de %s', (path, firstRole) => {
  const frise = loadPage(path).querySelector('[data-timeline]');

  it('va de la première étape à Figures', () => {
    const roles = frise!.querySelectorAll('[data-step] .tl-role').map((n) => n.text.trim());
    expect(roles[0]).toBe(firstRole);
    expect(frise!.querySelectorAll('[data-step] .tl-org').at(-1)?.text.trim()).toBe('Figures');
  });

  it('couvre 2020 à 2022 par la période freelance, sans trou', () => {
    const steps = frise!.querySelectorAll('[data-step]').map((n) => n.text);
    expect(steps.some((t) => t.includes('Data Analyst & Product Manager') && t.includes('Freelance'))).toBe(true);
    expect(frise!.querySelector('.tl-gap')).toBeNull();
  });

  it('marque chaque changement par son année', () => {
    const years = frise!.querySelectorAll('.tl-year').map((n) => Number(n.text));
    expect(years.length).toBeGreaterThanOrEqual(3);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });
});

it.each(['/fr/parcours/', '/fr/sport/', '/career/', '/sport/'])('le pied de page de %s ne porte aucun lien', (path) => {
  const footer = loadPage(path).querySelector('.site-footer');
  expect(footer?.text).toContain('Pierre Lallinec');
  expect(footer?.querySelectorAll('a')).toHaveLength(0);
});
