import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';

const LIST = 'tests/liste-noire.local.txt';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const textFiles = files('dist').filter((f) => /\.(html|xml|txt|json|js|css|svg)$/.test(f));

/** Texte brut du fichier, plus son texte visible décodé (`&amp;` devient `&`) pour le HTML. */
function searchable(file: string): string {
  const raw = readFileSync(file, 'utf8');
  return file.endsWith('.html') ? `${raw}\n${parse(raw).text}` : raw;
}

describe('confidentialité du site généré', () => {
  it('ne contient ni e-mail ni numéro de téléphone', () => {
    for (const file of textFiles) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
      expect(text, file).not.toMatch(/(\+33|\b0)[1-9]([ .]?\d{2}){4}\b/);
    }
  });

  it('ne contient aucune catégorie d’âge ni mention de dossard', () => {
    // Le texte visible est contrôlé ici ; les adresses des liens le sont dans le test suivant.
    for (const file of textFiles.filter((f) => f.endsWith('.html'))) {
      const visible = parse(readFileSync(file, 'utf8')).text;
      expect(visible, file).not.toMatch(/\bMS\d\b/);
      expect(visible, file).not.toMatch(/dossard|\bbib\b/i);
    }
  });

  it('ne lie aucune page dont l’adresse contient un numéro de dossard', () => {
    for (const file of textFiles.filter((f) => f.endsWith('.html'))) {
      const hrefs = parse(readFileSync(file, 'utf8')).querySelectorAll('a').map((a) => a.getAttribute('href') ?? '');
      for (const href of hrefs) expect(href, file).not.toMatch(/bib[-_=/]?\d+|dossard/i);
    }
  });

  it('ne dit rien du télétravail ni du lieu de résidence', () => {
    for (const file of textFiles.filter((f) => f.endsWith('.html'))) {
      const visible = parse(readFileSync(file, 'utf8')).text;
      expect(visible, file).not.toMatch(/télétravail|remote|j'habite|basé à|based in/i);
    }
  });

  it.skipIf(!existsSync(LIST))('ne contient aucun terme de la liste noire', () => {
    const terms = readFileSync(LIST, 'utf8')
      .split('\n')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    expect(terms.length).toBeGreaterThan(0);
    for (const file of textFiles) {
      const text = searchable(file).toLowerCase();
      for (const term of terms) expect(text.includes(term), `« ${term} » dans ${file}`).toBe(false);
    }
  });
});
