import { en } from './en';
import { fr, type Dict } from './fr';

export type Lang = 'fr' | 'en';
export type PageKey = 'home' | 'career' | 'sport';

/** La langue servie à la racine du site, et proposée par défaut aux moteurs de recherche. */
export const defaultLang: Lang = 'en';

export const langs: Lang[] = ['en', 'fr'];

export const routes: Record<PageKey, Record<Lang, string>> = {
  home: { en: '/', fr: '/fr/' },
  career: { en: '/career/', fr: '/fr/parcours/' },
  sport: { en: '/sport/', fr: '/fr/sport/' },
};

export const dict: Record<Lang, Dict> = { fr, en };

export function otherLang(lang: Lang): Lang {
  return lang === 'fr' ? 'en' : 'fr';
}

/** Libellé d'un format de course : traduit s'il est connu, sinon repris tel quel. */
export function formatLabel(format: string, lang: Lang): string {
  return dict[lang].sport.formats[format] ?? format;
}
