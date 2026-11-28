"""Export des établissements de la commune depuis Overture Places 2026-11-18.0."""

import argparse
import io
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import pyarrow.parquet as pq
from shapely.geometry import Point, shape


SOURCE = (
    "https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com/"
    "release/2026-11-18.0/theme=places/type=place/"
    "part-00005-e25dbd2b-28db-5594-82f8-cca5c9f74641-c000.zstd.parquet"
)
CATEGORIES = {
    "barber": "Barbier / coiffure hommes",
    "beauty_salon": "Institut de beauté / esthétique",
    "day_spa": "Spa",
    "hair_replacement": "Soins capillaires",
    "hair_salon": "Salon de coiffure",
    "hair_stylist": "Salon de coiffure",
    "health_spa": "Spa",
    "laser_hair_removal": "Épilation",
    "makeup_artist": "Maquillage",
    "massage_therapy": "Massage",
    "medical_spa": "Centre médico-esthétique",
    "nail_salon": "Manucure et pédicure",
    "skin_care_and_makeup": "Soins du visage / maquillage",
    "spa": "Spa",
    "tanning_salon": "Bronzage",
    "wellness_service": "Bien-être",
}
FIELDS = (
    "id", "names", "taxonomy", "addresses", "emails", "phones", "websites", "socials",
    "confidence", "sources", "bbox", "operating_status",
)


class RemoteParquet(io.RawIOBase):
    def __init__(self):
        with urlopen(Request(SOURCE, method="HEAD"), timeout=30) as response:
            self.size = int(response.headers["Content-Length"])
        self.position = 0
        self.cache = [(self.size - 65536, self.fetch(self.size - 65536, 65536))]

    def fetch(self, start, length):
        end = start + length - 1
        request = Request(SOURCE, headers={"Range": f"bytes={start}-{end}"})
        with urlopen(request, timeout=45) as response:
            if response.status != 206 or response.headers.get("Content-Range") != f"bytes {start}-{end}/{self.size}":
                raise OSError("Réponse HTTP Range incohérente")
            content = response.read(length + 1)
        if len(content) != length:
            raise OSError("Plage Parquet incomplète")
        return content

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=io.SEEK_SET):
        position = (0, self.position, self.size)[whence] + offset
        if position < 0:
            raise ValueError("Position négative")
        self.position = position
        return position

    def read(self, size=-1):
        remaining = max(self.size - self.position, 0)
        length = remaining if size < 0 else min(size, remaining)
        start = self.position
        self.position += length
        if length == 0:
            return b""
        for offset, data in self.cache:
            if offset <= start and start + length <= offset + len(data):
                return data[start - offset : start - offset + length]
        return self.fetch(start, length)

    def cache_group(self, group):
        columns = [group.column(i) for i in range(group.num_columns)]
        starts = [col.dictionary_page_offset or col.data_page_offset for col in columns]
        start = min(starts)
        end = max(offset + col.total_compressed_size for offset, col in zip(starts, columns))
        self.cache[1:] = [(start, self.fetch(start, end - start))]


def candidate_groups(parquet, bounds):
    west, south, east, north = bounds
    for i in range(parquet.num_row_groups):
        group = parquet.metadata.row_group(i)
        stats = {group.column(j).path_in_schema: group.column(j).statistics for j in range(group.num_columns)}
        x, y = stats.get("bbox.xmin"), stats.get("bbox.ymin")
        if not x or not y or not x.has_min_max or not y.has_min_max:
            yield i
        elif x.min <= east and x.max >= west and y.min <= north and y.max >= south:
            yield i


def phone_numbers(values):
    numbers = []
    for value in values or ():
        digits = re.sub(r"\D", "", value)
        if re.fullmatch(r"0[5-8]\d{8}", digits):
            numbers.append("+212" + digits[1:])
        elif re.fullmatch(r"(?:00)?212[5-8]\d{8}", digits):
            numbers.append("+" + digits.removeprefix("00"))
    return "; ".join(dict.fromkeys(numbers))


def social(values, domains):
    for value in values or ():
        host = (urlparse(value).hostname or "").lower()
        if any(host == domain or host.endswith("." + domain) for domain in domains):
            return value
    return ""


def normalize(row, collected_on):
    name = ((row.get("names") or {}).get("primary") or "").strip()
    taxonomy = (row.get("taxonomy") or {}).get("primary")
    status = row.get("operating_status") or ""
    if not name or taxonomy not in CATEGORIES or "closed" in status.casefold():
        return None
    category = CATEGORIES[taxonomy]
    if taxonomy in {"spa", "beauty_salon", "health_spa"} and re.search(r"\bhammam\b|\u062d\u0645\u0627\u0645", name, re.I):
        category = "Hammam / bain public / sauna"
    elif taxonomy == "beauty_salon" and re.search(r"\b(brows?|sourcils?|lashes|cils)\b", name, re.I):
        category = "Cils et sourcils"
    address = next((item for item in row.get("addresses") or () if item.get("country") in {"MA", None}), {})
    socials = row.get("socials") or []
    sites = row.get("websites") or []
    urls = socials + sites
    providers = row.get("sources") or []
    licenses = sorted({s["license"] for s in providers if s.get("license")})
    return {
        "identifiant": "overture:" + row["id"],
        "nom": name,
        "categorie": category,
        "ville": "Casablanca",
        "quartier": "",
        "adresse": address.get("freeform") or "",
        "code_postal": address.get("postcode") or "",
        "telephone": phone_numbers(row.get("phones")),
        "whatsapp": social(urls, ("wa.me", "whatsapp.com")),
        "email": "; ".join(dict.fromkeys(row.get("emails") or [])),
        "site_web": next(iter(sites), ""),
        "instagram": social(urls, ("instagram.com",)),
        "facebook": social(urls, ("facebook.com", "fb.com", "fb.me")),
        "tiktok": social(urls, ("tiktok.com",)),
        "latitude": row["bbox"]["ymin"],
        "longitude": row["bbox"]["xmin"],
        "horaires": "",
        "services": "",
        "url_source": SOURCE,
        "date_collecte": collected_on,
        "attribution": "Overture Maps Foundation — " + " / ".join(licenses),
        "categorie_source": taxonomy,
        "confiance_source": row.get("confidence"),
        "statut_source": status,
        "licences_source": licenses,
        "fournisseurs_source": sorted({s["dataset"] for s in providers if s.get("dataset")}),
    }


def collect(polygon, collected_on):
    rows = {}
    with RemoteParquet() as source:
        parquet = pq.ParquetFile(source)
        for i in candidate_groups(parquet, polygon.bounds):
            source.cache_group(parquet.metadata.row_group(i))
            batch = parquet.read_row_group(i, columns=FIELDS)
            for candidate in batch.to_pylist():
                bbox = candidate.get("bbox")
                if not bbox or not polygon.covers(Point(bbox["xmin"], bbox["ymin"])):
                    continue
                row = normalize(candidate, collected_on)
                if row:
                    rows[row["identifiant"]] = row
    return sorted(rows.values(), key=lambda row: (row["nom"].casefold(), row["identifiant"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("boundary", type=Path, help="Géométrie GeoJSON de la commune")
    parser.add_argument("output", type=Path, help="Sortie JSON")
    parser.add_argument("date_collecte", help="Date de collecte YYYY-MM-DD")
    args = parser.parse_args()
    boundary = json.loads(args.boundary.read_text(encoding="utf-8"))
    if boundary.get("type") == "Feature":
        boundary = boundary["geometry"]
    rows = collect(shape(boundary), args.date_collecte)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(rows)} fiches Overture")
    for category, count in Counter(row["categorie"] for row in rows).most_common():
        print(f"{count:>4}  {category}")


if __name__ == "__main__":
    main()
