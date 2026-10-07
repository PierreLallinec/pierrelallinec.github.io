import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
import { site } from '../../src/config';

// L'anglais est la langue par défaut, à la racine ; le français vit sous /fr/.
export const PAGES = [
  { path: '/', lang: 'en', twin: '/fr/' },
  { path: '/career/', lang: 'en', twin: '/fr/parcours/' },
  { path: '/sport/', lang: 'en', twin: '/fr/sport/' },
  { path: '/fr/', lang: 'fr', twin: '/' },
  { path: '/fr/parcours/', lang: 'fr', twin: '/career/' },
  { path: '/fr/sport/', lang: 'fr', twin: '/sport/' },
] as const;

// L'URL du site n'a qu'une source : src/config.ts.
export const ORIGIN = site.url;

export function readDist(path: string): string {
  const file = path.endsWith('/') ? `${path}index.html` : path;
  return readFileSync(resolve('dist', `.${file}`), 'utf8');
}

export function loadPage(path: string): HTMLElement {
  return parse(readDist(path));
}
