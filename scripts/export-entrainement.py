"""Exporte les minutes de sport par jour vers src/data/entrainement.json.

Lit en lecture seule la base du projet Personal trainer (activités Garmin).
N'écrit que des durées par jour et par discipline : ni lieu, ni parcours, ni fréquence cardiaque.

    npm run donnees
"""

import json
import os
import sys
from collections import defaultdict
from pathlib import Path

import duckdb

BASE = Path(os.environ.get("BASE_ENTRAINEMENT", Path.home() / "Claude/Projects/Personal trainer/db/training.duckdb"))
SORTIE = Path(__file__).resolve().parent.parent / "src/data/entrainement.json"

DISCIPLINES = {
    "natation": ("lap_swimming", "open_water_swimming"),
    "velo": ("road_biking", "virtual_ride", "indoor_cycling", "cycling", "mountain_biking", "gravel_cycling"),
    "course": ("running", "treadmill_running", "indoor_running", "trail_running"),
    "muscu": ("strength_training", "hiit"),
}
ORDRE = ("natation", "velo", "course", "muscu", "autre")
# Marche et randonnée ne sont pas de l'entraînement : une grande randonnée fausserait le calendrier.
EXCLUS = ("hiking", "walking")
# Une activité multisport est l'enveloppe d'un triathlon : ses segments sont déjà comptés à part.
ENVELOPPES = ("multi_sport",)


def discipline(sport: str) -> str:
    for nom, sports in DISCIPLINES.items():
        if sport in sports:
            return nom
    return "autre"


def aberrante(sport: str, minutes: float, km: float) -> bool:
    """Montre oubliée en marche : plus de 16 h d'affilée, ou une nage de plus d'une heure quasi immobile."""
    if minutes > 16 * 60:
        return True
    return discipline(sport) == "natation" and minutes > 60 and km / (minutes / 60) < 0.6


def recouvrement(a: tuple[float, float], b: tuple[float, float]) -> float:
    return max(0.0, min(a[1], b[1]) - max(a[0], b[0]))


def minutes_par_jour(activites: list[tuple]) -> dict[str, dict[str, float]]:
    """activites : (jour, début en minutes depuis minuit, durée en minutes, sport, km), triées par début."""
    par_jour: dict[str, list[tuple]] = defaultdict(list)
    for jour, debut, minutes, sport, km in activites:
        if sport in EXCLUS or minutes <= 0 or aberrante(sport, minutes, km or 0):
            continue
        par_jour[jour].append((debut, minutes, sport))

    resultat: dict[str, dict[str, float]] = {}
    for jour, seances in par_jour.items():
        segments = [s for s in seances if s[2] not in ENVELOPPES]
        gardees: list[tuple[str, tuple[float, float], float]] = []
        for debut, minutes, sport in sorted(seances, key=lambda s: -s[1]):
            fenetre = (debut, debut + minutes)
            if sport in ENVELOPPES:
                # L'enveloppe n'est gardée que si aucun segment ne la détaille.
                if any(recouvrement(fenetre, (d, d + m)) > 0 for d, m, _ in segments):
                    continue
            nom = discipline(sport)
            # Deux enregistrements du même effort (montre et compteur) : on n'en compte qu'un.
            if any(n == nom and recouvrement(fenetre, f) > 0.5 * minutes for n, f, _ in gardees):
                continue
            gardees.append((nom, fenetre, minutes))
        total = {nom: 0.0 for nom in ORDRE}
        for nom, _, minutes in gardees:
            total[nom] += minutes
        if sum(total.values()) > 0:
            resultat[jour] = total
    return resultat


def main() -> None:
    if not BASE.exists():
        sys.exit(f"Base introuvable : {BASE}")
    connexion = duckdb.connect(str(BASE), read_only=True)
    activites = connexion.execute(
        """
        select
          strftime(start_time::date, '%Y-%m-%d'),
          hour(start_time) * 60 + minute(start_time) + second(start_time) / 60,
          duration_s / 60,
          sport,
          distance_m / 1000
        from activities
        where duration_s > 0
        order by start_time
        """
    ).fetchall()
    jours = [[jour, *(round(valeurs[nom]) for nom in ORDRE)] for jour, valeurs in sorted(minutes_par_jour(activites).items())]
    trop = [ligne for ligne in jours if sum(ligne[1:]) > 24 * 60]
    if trop:
        sys.exit(f"Journées de plus de 24 heures, export refusé : {trop}")
    SORTIE.write_text(json.dumps({"maj": jours[-1][0], "jours": jours}, separators=(",", ":")) + "\n")
    plus_longues = sorted(jours, key=lambda ligne: -sum(ligne[1:]))[:5]
    print(f"{len(jours)} jours écrits, du {jours[0][0]} au {jours[-1][0]}")
    print("Journées les plus longues :", [(ligne[0], f"{sum(ligne[1:]) // 60} h {sum(ligne[1:]) % 60:02d}") for ligne in plus_longues])


if __name__ == "__main__":
    main()
