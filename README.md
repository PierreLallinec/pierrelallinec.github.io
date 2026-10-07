# Site personnel de Pierre Lallinec

Site statique bilingue (français, anglais) construit avec Astro et publié sur GitHub Pages.

Tout ce qui se trouve dans ce dépôt est public, historique compris. N'y écrire que ce qui peut s'afficher.

## Ajouter une course

Ouvrir `src/data/courses.yaml` et ajouter une entrée, n'importe où dans le fichier (le tri est automatique) :

```yaml
- date: 2027-05-16
  nom: Triathlon de l'île Charlemagne
  discipline: triathlon
  format: M
  temps: "2:01:30"
```

Ces cinq champs sont obligatoires. Les autres sont facultatifs :

| Champ | Exemple | Remarque |
|---|---|---|
| `lieu` | `Orléans` | Ville seule. |
| `classement` | `2` | Au scratch. Pas de classement par catégorie d'âge. |
| `participants` | `444` | À omettre s'il n'est pas connu. |
| `lien` | `https://...` | Page du résultat officiel. Le temps devient cliquable. Jamais une adresse qui contient le numéro de dossard (`bib-123`). |
| `mention` | `{ fr: Record personnel, en: Personal best }` | Si une langue manque, la mention n'apparaît pas dans cette langue. |
| `marquante` | `true` | Affiche la course dans « Ce dont je suis fier ». |
| `partiels` | voir ci-dessous | Triathlons. `natation`, `velo`, `course` ; `t1` et `t2` facultatifs. |

```yaml
  partiels:
    natation: "21:43"
    t1: "1:10"
    velo: "1:00:28"
    t2: "0:55"
    course: "38:58"
```

Règles de saisie :

- `date` : `AAAA-MM-JJ`. Si le jour est inconnu, `AAAA-MM` ou `AAAA`.
- `discipline` : `triathlon`, `course`, `velo` ou `trail`.
- Les temps entre guillemets.
- Rien de personnel : ni dossard, ni catégorie d'âge, ni nom d'un proche.

### Changer les courses mises en avant

« Ce dont je suis fier » affiche les courses marquées `marquante: true`, regroupées par discipline et rangées de la plus courte à la plus longue. Pour remplacer une course, retirer la ligne de l'ancienne et l'ajouter à la nouvelle.

## Mettre à jour le calendrier d'entraînement

```bash
npm run donnees
```

Le script lit, en lecture seule, la base du projet Personal trainer (`~/Claude/Projects/Personal trainer/db/training.duckdb`) et réécrit `src/data/entrainement.json`. Ce fichier ne contient que des minutes par jour et par discipline. Marche et randonnée sont exclues. Publier ensuite comme d'habitude.

## Modifier la page Parcours

`src/data/parcours.yaml` :

- `recit` : le texte, un élément par paragraphe.
- `realisations` : les blocs « Construit chez Figures ».
- `outils` : les étiquettes.
- `experiences` : la frise de l'accueil. Années seulement.

Chaque texte existe en `fr` et en `en`.

## Modifier les autres textes

`src/i18n/fr.ts` et `src/i18n/en.ts` : menu, titres, texte d'accueil.

## Le bouton « Discutons »

Son adresse est dans `src/config.ts`, champ `agenda`. S'il est vide, le bouton disparaît de tout le site.

## Vérifier et republier

```bash
npm install        # une fois
npm run dev        # aperçu sur http://localhost:4321
npm run check      # tests et build
```

Publier : `git add src && git commit -m "Ajout d'une course" && git push`. GitHub Actions relance les vérifications et met le site en ligne en deux minutes environ. Si une vérification échoue, l'ancienne version reste en ligne et l'onglet Actions du dépôt indique l'entrée fautive.

Une course peut aussi s'ajouter depuis github.com : ouvrir `src/data/courses.yaml`, cliquer sur le crayon, enregistrer.

## Confidentialité

`npm run check` échoue si le site généré contient une adresse e-mail, un numéro de téléphone, les mots « dossard » ou « télétravail », ou une catégorie d'âge de triathlon (MS1, MS2…). Ce filet ne remplace pas la relecture : il ne reconnaît pas un numéro de dossard isolé, ni les catégories des autres sports.

Un contrôle supplémentaire compare le site à une liste de termes interdits, `tests/liste-noire.local.txt`, un terme par ligne. Ce fichier reste sur la machine de Pierre et n'est jamais publié, pour ne pas révéler ce qu'il sert à cacher. Sans lui, ce contrôle est sauté.

## Passer au domaine pierrelallinec.fr

1. Sur GitHub, dans Settings → Pages → Custom domain, saisir `pierrelallinec.fr` et enregistrer. Le site étant déployé par GitHub Actions, c'est ce réglage qui compte : un fichier `CNAME` dans le dépôt serait ignoré.
2. Chez le registrar, créer un enregistrement `ALIAS` ou quatre enregistrements `A` vers GitHub Pages, et un `CNAME` `www` vers `pierrelallinec.github.io` (voir la documentation de GitHub Pages sur les domaines personnalisés).
3. Dans `src/config.ts`, remplacer `url` par `https://pierrelallinec.fr`. C'est le seul endroit du code à modifier : les URL canoniques, le plan du site et les tests en découlent.
4. `npm run check`, puis publier.
5. Une fois le certificat émis, cocher « Enforce HTTPS » dans Settings → Pages.

## Première publication

Dans Settings → Pages du dépôt, régler « Source » sur « GitHub Actions ». Sans ce réglage, le premier déploiement échoue.

## Après la première publication

- Déclarer le site dans Google Search Console et lui soumettre `sitemap.xml`.
- Ajouter l'adresse du site au profil LinkedIn : ce lien entrant aide Google à associer le site au nom.

## Organisation

- `src/data/` : les contenus.
- `src/lib/` : lecture, validation et mise en forme des données.
- `src/components/pages/` : une page par fichier, commune aux deux langues.
- `src/pages/` : les URL. Chaque fichier ne fait que choisir la langue.
- `scripts/` : l'export des données d'entraînement.
- `tests/unit/` : logique. `tests/site/` : contrôles sur le site généré.
