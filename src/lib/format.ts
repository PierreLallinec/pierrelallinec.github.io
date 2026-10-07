import type { Lang } from '../i18n';

const MONTHS: Record<Lang, string[]> = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** Date `AAAA`, `AAAA-MM` ou `AAAA-MM-JJ`, affichée à sa précision. */
export function formatDate(date: string, lang: Lang): string {
  const [year, month, day] = date.split('-');
  if (!month) return year;
  const monthName = MONTHS[lang][Number(month) - 1];
  if (!day) return `${monthName} ${year}`;
  const d = Number(day);
  const dayLabel = lang === 'fr' && d === 1 ? '1er' : String(d);
  return `${dayLabel} ${monthName} ${year}`;
}

/** Clé de tri : une date partielle se range à la fin de sa période. */
export function sortKey(date: string): string {
  const [year, month = '12', day = '31'] = date.split('-');
  return `${year}-${month}-${day}`;
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

export function formatNumber(n: number, lang: Lang): string {
  const separator = lang === 'fr' ? ' ' : ',';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function ordinal(n: number, lang: Lang): string {
  if (lang === 'fr') return n === 1 ? '1er' : `${n}e`;
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

export function formatRank(rank: number | undefined, total: number | undefined, lang: Lang): string {
  if (rank === undefined) return '';
  const label = ordinal(rank, lang);
  return total === undefined ? label : `${label} / ${formatNumber(total, lang)}`;
}

/** Secondes d'un temps `h:mm:ss` ou `mm:ss` ; `undefined` pour tout autre format (« 10 h 35 »). */
export function toSeconds(time: string): number | undefined {
  const match = /^(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)$/.exec(time);
  if (!match) return undefined;
  const [, h = '0', m, s] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/** Durée en minutes, lisible : « repos », « 40 min », « 1 h 20 », « 2 h ». */
export function formatDuration(minutes: number, lang: Lang): string {
  if (minutes <= 0) return lang === 'fr' ? 'repos' : 'rest';
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${String(rest).padStart(2, '0')}`;
}
