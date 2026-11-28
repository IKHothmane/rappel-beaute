"""Rapproche les exports OSM et Overture pour Casablanca."""

import json
import math
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

from collecte_osm import COLUMNS, export


GENERIC_NAMES = {
    "barber", "barbershop", "beautysalon", "coiffeur", "coiffeuse", "coiffure",
    "hammam", "institutdebeaute", "salon", "salondebeaute", "salondecoiffure", "spa",
    "حلاق", "حلاقة", "حمام",
}
SERVICE_NAME = re.compile(
    r"\b(?:spa|h[ao]mm?am|massage|bien[ -]être|esthétique|institut|salon|coiffure|"
    r"coiffeu\w*|barber\w*|barbier|nails?|ongles?|cils|sourcils?)\b|حمام|حلاق"
)
NON_SERVICE_NAME = re.compile(
    r"\b(?:accessoires?|parapharmacie|pharmacie|drugstore|parfumerie|boutique|market|"
    r"store|shop|caftans?|huiles?|oils?|academ[yi]e?|school|dentiste|expo)\b"
)


def qualify(overture):
    accepted, review, excluded = [], [], []
    for row in overture:
        name = row["nom"].casefold()
        service_in_name = SERVICE_NAME.search(name)
        if not service_in_name and NON_SERVICE_NAME.search(name):
            excluded.append((row, "Nom évoquant une activité hors cible, sans indice de soin ou de coiffure."))
            continue
        if "barber" in name or "barbier" in name:
            if row["categorie"] in {"Spa", "Salon de coiffure", "Institut de beauté / esthétique"}:
                row = {**row, "categorie": "Barbier / coiffure hommes"}
        if row["categorie"] == "Spa" and not service_in_name:
            review.append((row, "Catégorie Spa attribuée par Overture. Le nom ne confirme pas le service."))
        accepted.append(row)
    return accepted, review, excluded


def normalized_name(name):
    return "".join(
        character for character in unicodedata.normalize("NFKD", name.casefold())
        if character.isalnum()
    )


def distance(left, right):
    latitude = (left["latitude"] + right["latitude"]) / 2
    dy = left["latitude"] - right["latitude"]
    dx = (left["longitude"] - right["longitude"]) * math.cos(math.radians(latitude))
    return math.hypot(dx, dy) * 111_195


def merge(osm, overture):
    consolidated, matches = [], []
    by_name = defaultdict(list)
    for row in [*osm, *overture]:
        record = {column: row.get(column) for column in COLUMNS}
        for field in ("latitude", "longitude"):
            record[field] = round(record[field], 7)
        if record["whatsapp"]:
            record["whatsapp"] = re.sub(
                r"^https?://wa\.me/\+(?=\d)", "https://wa.me/", record["whatsapp"], flags=re.I
            )
        name = normalized_name(record["nom"])
        maximum_distance = 0 if not name or name in GENERIC_NAMES else 35
        close = [
            candidate for candidate in by_name[name]
            if distance(record, candidate) <= maximum_distance
        ]
        if len(close) != 1:
            consolidated.append(record)
            by_name[name].append(record)
            continue
        existing = close[0]
        matches.append((
            record["nom"],
            f'{existing["identifiant"]} — {existing["url_source"]}',
            f'{record["identifiant"]} — {record["url_source"]}',
        ))
        for field in COLUMNS:
            if not existing[field]:
                existing[field] = record[field]
            elif field in {"url_source", "attribution"} and record[field] and record[field] not in existing[field].split(" | "):
                existing[field] += " | " + record[field]
    return sorted(consolidated, key=lambda row: (row["categorie"], row["nom"].casefold())), matches


if __name__ == "__main__":
    osm = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    overture = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    accepted, review, excluded = qualify(overture)
    merged, duplicates = merge(osm, accepted)
    export(merged, duplicates, None, Path(sys.argv[3]), sys.argv[4], (
        ("Source complémentaire", "Overture Maps Places — https://docs.overturemaps.org/guides/places/"),
        ("Version Overture", "2026-11-18.0"),
        ("Fiches OpenStreetMap avant rapprochement", len(osm)),
        ("Fiches Overture avant rapprochement", len(overture)),
        ("Fiches écartées par le filtre d’activité", len(excluded)),
        ("Fiches signalées pour vérification", len(review)),
        ("Rapprochement consolidé", "Même nom normalisé et distance maximale de 35 m, avec une seule correspondance. Certains noms génériques exigent des coordonnées identiques."),
        ("Correspondances consolidées", len(duplicates)),
        ("Couverture", "Activité et coordonnées non confirmées par contact. Des doublons peuvent subsister."),
        ("CityInfo et Télécontact", "Annuaires soumis à des conditions restreignant la réutilisation commerciale."),
        ("Autres sources", "Aucune collecte Google Places, Pages Jaunes Maroc, Coiffeur.ma ou réseaux sociaux."),
    ), (("Activité à vérifier", review), ("Fiches écartées", excluded)))
