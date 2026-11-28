"""Export des établissements cartographiés dans la commune de Casablanca."""

import csv
import json
import re
import sqlite3
import sys
import unicodedata
from collections import Counter
from datetime import date
from pathlib import Path

import osmium
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter


COMMUNE = 4072985
CREDIT = "© OpenStreetMap contributors — ODbL"
LICENSE = "https://www.openstreetmap.org/copyright"
COLUMNS = (
    "identifiant", "nom", "categorie", "ville", "quartier", "adresse", "code_postal",
    "telephone", "whatsapp", "email", "site_web", "instagram", "facebook", "tiktok",
    "latitude", "longitude", "horaires", "services", "url_source", "date_collecte",
    "attribution",
)


def inside_ring(x, y, ring):
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def commune_polygons(path):
    processor = (
        osmium.FileProcessor(path)
        .with_locations("flex_mem")
        .with_areas(osmium.filter.IdFilter({COMMUNE}))
        .with_filter(osmium.filter.EntityFilter(osmium.osm.AREA))
    )
    factory = osmium.geom.GeoJSONFactory()
    for obj in processor:
        if obj.is_area() and not obj.from_way() and obj.orig_id() == COMMUNE:
            return json.loads(factory.create_multipolygon(obj))["coordinates"]
    raise RuntimeError(f"Limite communale OSM introuvable : {COMMUNE}")


def category(tags, name):
    shop, amenity, leisure, tourism = (
        tags.get(key, "") for key in ("shop", "amenity", "leisure", "tourism")
    )
    services = set(tags.get("beauty", "").lower().split(";"))
    if shop in {"hairdresser", "barber"} or amenity == "hairdresser":
        male_only = tags.get("male") == "yes" and tags.get("female") != "yes"
        if shop == "barber" or tags.get("hairdresser") in {"barber", "men"} or male_only or re.search(r"barber|barbier", name, re.I):
            return "Barbier / coiffure hommes"
        return "Salon de coiffure"
    if amenity == "public_bath" or leisure == "sauna":
        return "Hammam / bain public / sauna"
    if "spa" in (amenity, leisure) or "spa" in services or tourism == "spa_resort":
        return "Spa"
    if shop == "nail_salon" or services & {"nails", "manicure", "pedicure"}:
        return "Manucure et pédicure"
    if shop == "massage" or "massage" in services:
        return "Massage"
    if services & {"eyebrow", "eyebrows", "eyelash", "eyelashes"}:
        return "Cils et sourcils"
    if services & {"make_up", "makeup", "permanent_makeup"}:
        return "Maquillage"
    if shop == "beauty" or tags.get("beauty") or leisure == "tanning_salon":
        return "Institut de beauté / esthétique"
    return ""


def phone_number(raw):
    numbers = []
    for item in raw.split(";"):
        digits = re.sub(r"\D", "", item)
        if re.fullmatch(r"0[5-8]\d{8}", digits):
            numbers.append("+212" + digits[1:])
        elif re.fullmatch(r"(?:00)?212[5-8]\d{8}", digits):
            numbers.append("+" + digits.removeprefix("00"))
    return "; ".join(dict.fromkeys(numbers))


def collect(path, collected_on):
    polygons = commune_polygons(path)
    points = [point for polygon in polygons for point in polygon[0]]
    west, south = map(min, zip(*points))
    east, north = map(max, zip(*points))
    keys = ("shop", "amenity", "leisure", "beauty", "tourism")
    processor = (
        osmium.FileProcessor(path)
        .with_locations("flex_mem")
        .with_areas(osmium.filter.KeyFilter(*keys))
        .with_filter(osmium.filter.KeyFilter(*keys))
    )
    rows = []
    unnamed = 0
    for obj in processor:
        tags = obj.tags
        name = tags.get("name:fr") or tags.get("name", "")
        kind = category(tags, name)
        if not kind:
            continue
        if obj.is_node():
            x, y, entity = obj.lon, obj.lat, "node"
        elif obj.is_area():
            outline = next(iter(obj.outer_rings()), None)
            if outline is None or not all(node.location.valid() for node in outline):
                continue
            xs, ys = zip(*[(node.lon, node.lat) for node in outline])
            x, y = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
            entity = "way" if obj.from_way() else "relation"
        else:
            continue

        if not (west <= x <= east and south <= y <= north):
            continue
        if not any(inside_ring(x, y, polygon[0]) and not any(inside_ring(x, y, hole) for hole in polygon[1:]) for polygon in polygons):
            continue
        if not name.strip():
            unnamed += 1
            continue
        contact = lambda key: tags.get(f"contact:{key}") or tags.get(key, "")
        address = tags.get("addr:full") or " ".join(filter(None, [tags.get("addr:housenumber"), tags.get("addr:street")]))
        identifier = f"{entity}/{obj.orig_id() if obj.is_area() else obj.id}"
        values = (
            identifier, name.strip(), kind, "Casablanca", tags.get("addr:suburb") or tags.get("addr:district"),
            address, tags.get("addr:postcode"), phone_number(contact("phone") or contact("mobile")),
            contact("whatsapp"), contact("email"), contact("website"), contact("instagram"),
            contact("facebook"), contact("tiktok"), round(y, 7), round(x, 7),
            tags.get("opening_hours"), tags.get("beauty") or tags.get("hairdresser"),
            f"https://www.openstreetmap.org/{identifier}", collected_on, CREDIT,
        )
        rows.append(dict(zip(COLUMNS, values)))
    return sorted(rows, key=lambda row: (row["categorie"], row["nom"].casefold())), unnamed


def deduplicate(rows):
    result, index, duplicates = [], {}, []
    for row in rows:
        name = " ".join(unicodedata.normalize("NFKC", row["nom"]).casefold().split())
        key = (name, row["latitude"], row["longitude"])
        existing = index.get(key)
        if existing is None:
            index[key] = row
            result.append(row)
            continue
        duplicates.append((row["nom"], existing["url_source"], row["url_source"]))
        for field in COLUMNS:
            if not existing[field]:
                existing[field] = row[field]
    return result, duplicates


def safe(value):
    if isinstance(value, str) and value.lstrip()[:1] in ("=", "+", "-", "@"):
        return "'" + value
    return value


def add_sheet(workbook, title, headers, records):
    sheet = workbook.create_sheet(title)
    sheet.append(headers)
    for record in records:
        sheet.append(record)
        for cell in sheet[sheet.max_row]:
            if isinstance(cell.value, str):
                cell.data_type = "s"
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    for cell in sheet[1]:
        cell.fill = PatternFill("solid", fgColor="173F3C")
        cell.font = Font(bold=True, color="FFFFFF")
    for cells in sheet.columns:
        width = max(len(str(cell.value or "")) for cell in cells)
        sheet.column_dimensions[get_column_letter(cells[0].column)].width = min(62, max(15, width + 2))


def export(rows, duplicates, unnamed, output, collected_on, additional_sources=(), review_sheets=()):
    output.mkdir(parents=True, exist_ok=True)
    counts = Counter(row["categorie"] for row in rows)
    fields = lambda records: ([row[column] for column in COLUMNS] for row in records)
    workbook = Workbook()
    workbook.remove(workbook.active)
    add_sheet(workbook, "Casablanca", COLUMNS, fields(rows))
    add_sheet(workbook, "Statistiques", ("Catégorie", "Nombre"), sorted(counts.items()))
    add_sheet(workbook, "Statistiques par ville", ("Ville", "Nombre"), (("Casablanca", len(rows)),))
    add_sheet(workbook, "Avec téléphone", COLUMNS, fields(row for row in rows if row["telephone"]))
    add_sheet(workbook, "Avec email", COLUMNS, fields(row for row in rows if row["email"]))
    add_sheet(workbook, "Avec WhatsApp", COLUMNS, fields(row for row in rows if row["whatsapp"]))
    add_sheet(workbook, "Site web non renseigné", COLUMNS, fields(row for row in rows if not row["site_web"]))
    add_sheet(workbook, "Fiches rapprochées", ("Nom", "Fiche conservée", "Autre fiche"), duplicates)
    for title, records in review_sheets:
        add_sheet(workbook, title, COLUMNS + ("motif",), (
            [row[column] for column in COLUMNS] + [reason] for row, reason in records
        ))
    source_notes = (
        ("Couverture", "Fiches issues de la carte OSM. Activité et coordonnées non confirmées par contact."),
        ("Dédoublonnage", "Même nom normalisé et mêmes coordonnées. Des doublons proches peuvent subsister."),
    )
    add_sheet(workbook, "Sources et couverture", ("Indicateur", "Valeur"), (
        ("Attribution", CREDIT), ("Licence", LICENSE),
        ("Source", "https://download.geofabrik.de/africa/morocco.html"),
        ("Périmètre", f"https://www.openstreetmap.org/relation/{COMMUNE}"),
        ("Date de collecte", collected_on), ("Fiches exportées", len(rows)),
        ("Objets OSM sans nom écartés", unnamed), ("Fiches rapprochées", len(duplicates)),
        ("Total fourni", "2 967 références brutes estimées. Fiches d'origine non fournies."),
        *(additional_sources or source_notes),
    ))
    workbook.save(output / "Rappel_Beauty_Prospects_Casablanca.xlsx")
    with (output / "prospects_casablanca.csv").open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.writer(file, delimiter=";")
        writer.writerow(COLUMNS)
        writer.writerows([safe(value) for value in record] for record in fields(rows))
    with (output / "prospects_casablanca.json").open("w", encoding="utf-8") as file:
        json.dump(rows, file, ensure_ascii=False, indent=2)
        file.write("\n")
    schema = ", ".join(
        f'{column} {"REAL" if column in {"latitude", "longitude"} else "TEXT"}'
        + (" PRIMARY KEY" if column == "identifiant" else "")
        for column in COLUMNS
    )
    placeholders = ", ".join("?" for _ in COLUMNS)
    connection = sqlite3.connect(output / "prospects_casablanca.db")
    try:
        with connection:
            connection.execute(f"CREATE TABLE IF NOT EXISTS prospects ({schema})")
            connection.execute("DELETE FROM prospects")
            connection.executemany(f"INSERT INTO prospects VALUES ({placeholders})", fields(rows))
    finally:
        connection.close()
    print(json.dumps({"fiches": len(rows), "sans_nom": unnamed, "doublons": len(duplicates),
                      "telephone": sum(bool(row["telephone"]) for row in rows),
                      "email": sum(bool(row["email"]) for row in rows),
                      "whatsapp": sum(bool(row["whatsapp"]) for row in rows),
                      "categories": counts}, ensure_ascii=True))


if __name__ == "__main__":
    collected_on = sys.argv[3] if len(sys.argv) > 3 else date.today().isoformat()
    records, without_name = collect(sys.argv[1], collected_on)
    unique, exact_duplicates = deduplicate(records)
    export(unique, exact_duplicates, without_name, Path(sys.argv[2]), collected_on)
