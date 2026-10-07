import { describe, expect, it } from 'vitest';
import { loadPage, ORIGIN, PAGES, readDist } from './helpers';

describe.each(PAGES)('Open Graph de $path', ({ path, lang }) => {
  const doc = loadPage(path);
  const meta = (property: string) => doc.querySelector(`meta[property="${property}"]`)?.getAttribute('content');

  it('décrit la page', () => {
    expect(meta('og:title')).toBe(doc.querySelector('title')?.text);
    expect(meta('og:description')).toBe(doc.querySelector('meta[name=description]')?.getAttribute('content'));
    expect(meta('og:url')).toBe(ORIGIN + path);
    expect(meta('og:image')).toBe(`${ORIGIN}/og.png`);
    expect(meta('og:locale')).toBe(lang === 'fr' ? 'fr_FR' : 'en_GB');
    expect(doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
  });
});

describe.each(['/fr/', '/'])('JSON-LD de %s', (path) => {
  const script = loadPage(path).querySelector('script[type="application/ld+json"]');
  const data = JSON.parse(script?.text ?? '{}');

  it('décrit une personne dans une page de profil', () => {
    expect(data['@type']).toBe('ProfilePage');
    expect(data.mainEntity['@type']).toBe('Person');
    expect(data.mainEntity.name).toBe('Pierre Lallinec');
    expect(data.mainEntity.worksFor.name).toBe('Figures');
    expect(data.mainEntity.alumniOf.map((school: { name: string }) => school.name)).toEqual(['ESSCA', 'Fordham University']);
    expect(data.mainEntity.knowsLanguage).toEqual(['fr', 'en']);
    expect(data.mainEntity.sameAs).toContain('https://www.linkedin.com/in/pierrelallinec');
    expect(data.mainEntity.image).toBe(`${ORIGIN}/photo.webp`);
  });

  it('ne contient aucun champ sensible', () => {
    for (const key of ['birthDate', 'address', 'homeLocation', 'email', 'telephone', 'birthPlace', 'gender']) {
      expect(data.mainEntity).not.toHaveProperty(key);
    }
  });
});

it('la personne décrite renvoie à la page d’accueil par défaut, en anglais', () => {
  const data = JSON.parse(loadPage('/fr/').querySelector('script[type="application/ld+json"]')!.text);
  expect(data.mainEntity.url).toBe(`${ORIGIN}/`);
  expect(data.url).toBe(`${ORIGIN}/fr/`);
});

it('les autres pages n’ont pas de JSON-LD de personne', () => {
  expect(loadPage('/fr/sport/').querySelector('script[type="application/ld+json"]')).toBeNull();
});

describe('sitemap et robots', () => {
  const sitemap = readDist('/sitemap.xml');

  it('liste les six URL avec leurs alternatives', () => {
    for (const { path, twin } of PAGES) {
      expect(sitemap).toContain(`<loc>${ORIGIN}${path}</loc>`);
      expect(sitemap).toContain(`href="${ORIGIN}${twin}"`);
    }
    expect(sitemap.match(/<url>/g)).toHaveLength(6);
  });

  it('ouvre le site et pointe vers le sitemap', () => {
    const robots = readDist('/robots.txt');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });
});

it('la page 404 existe et n’est pas indexable', () => {
  const doc = loadPage('/404.html');
  expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex');
  expect(doc.querySelector('link[rel=canonical]')).toBeNull();
  expect(doc.querySelector('html')?.getAttribute('lang')).toBe('en');
  expect(doc.querySelector('main a[href="/"]')).not.toBeNull();
  expect(doc.querySelector('main a[href="/fr/"]')).not.toBeNull();
});

it.each(PAGES)('$path déclare une icône qui existe', ({ path }) => {
  const href = loadPage(path).querySelector('link[rel=icon]')?.getAttribute('href');
  expect(href).toBe('/favicon.svg');
  expect(readDist('/favicon.svg')).toContain('<svg');
});

it.each(PAGES)('le nom accessible du choix de langue de $path contient son texte visible', ({ path }) => {
  const link = loadPage(path).querySelector('a[data-lang-switch]')!;
  const label = link.getAttribute('aria-label');
  if (label) expect(label).toContain(link.text.trim());
  expect(link.getAttribute('title')).toBeTruthy();
});

it.each([['/'], ['/fr/']])('l’accueil %s se présente par le métier, sans mention du sport', (path) => {
  const doc = loadPage(path);
  expect(doc.querySelector('title')?.text).toBe('Pierre Lallinec · Data Analyst');
  expect(doc.querySelector('meta[name=description]')?.getAttribute('content')).not.toMatch(/triathlon|sport|race|course/i);
});

it.each(PAGES)('$path déclare une icône pour l’écran d’accueil des téléphones', ({ path }) => {
  expect(loadPage(path).querySelector('link[rel=apple-touch-icon]')?.getAttribute('href')).toBe('/apple-touch-icon.png');
  expect(readDist('/apple-touch-icon.png').length).toBeGreaterThan(500);
});
