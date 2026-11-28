# Prospects beauté à Casablanca

Le périmètre correspond à la commune de Casablanca telle que cartographiée dans OpenStreetMap ([relation 4072985](https://www.openstreetmap.org/relation/4072985)). Les champs absents de la source restent vides. La présence d'une fiche n'atteste ni de l'activité actuelle ni de la validité de ses coordonnées.

Les deux textes fournis mentionnent une estimation de 2 967 références brutes. Ils ne contiennent ni les fiches ni un relevé reproductible de leurs décomptes. Les conditions consultées chez [CityInfo](https://about.city-info.online/fr/terms-of-use/) et [Télécontact](https://www.telecontact.ma/conditions-generales-d-utilisation) restreignent la réutilisation commerciale de leurs annuaires.

## Reproduire l'extraction OpenStreetMap

Installer `osmium` et `openpyxl` dans un environnement Python, puis télécharger le fichier Maroc au format PBF depuis [Geofabrik](https://download.geofabrik.de/africa/morocco.html).

```sh
python -m pip install osmium==4.3.2 openpyxl==3.1.5
python collecte_osm.py chemin/vers/morocco-latest.osm.pbf exports/openstreetmap
```

Le collecteur lit les établissements portant des étiquettes de coiffure, beauté, massage, spa, bain public ou sauna et conserve les fiches nommées situées dans le polygone communal. Il utilise le point du commerce ou le centre de son contour. Le rapprochement OpenStreetMap fusionne uniquement un nom normalisé associé aux mêmes coordonnées.

Les feuilles Excel donnent le détail par catégorie, les lignes ayant des coordonnées de contact et la couverture de la source. Chaque fiche contient un lien vers son objet cartographique. Données © contributeurs OpenStreetMap, sous [licence ODbL](https://www.openstreetmap.org/copyright).

## Reproduire l'extraction Overture

Le collecteur utilise la version [Overture Maps Places 2026-11-18.0](https://docs.overturemaps.org/guides/places/). Il lit les groupes Parquet intersectant le périmètre communal et applique une sélection de catégories. Les fournisseurs, licences, catégories et niveaux de confiance d'origine figurent dans l'export JSON Overture.

```sh
python -m pip install pyarrow shapely
python -c "import json,sys; from collecte_osm import commune_polygons; print(json.dumps(dict(type='MultiPolygon',coordinates=commune_polygons(sys.argv[1]))))" chemin/vers/morocco-latest.osm.pbf > casablanca-boundary.geojson
python collecte_overture.py casablanca-boundary.geojson exports/overture/casablanca.json 2026-11-27
```

## Consolider les deux sources

```sh
python consolider.py exports/openstreetmap/prospects_casablanca.json exports/overture/casablanca.json exports 2026-11-27
```

Le rapprochement utilise le nom normalisé et une distance maximale de 35 mètres. Pour les noms génériques listés dans le collecteur, il exige des coordonnées identiques. Une ligne avec plusieurs correspondances possibles est conservée. Le classeur consigne les rapprochements et conserve les liens vers les sources. Les fichiers par source restent disponibles sous `exports/openstreetmap` et `exports/overture`.

Le filtre d'activité écarte les noms qui évoquent un commerce hors cible sans indice de prestation de beauté ou de coiffure. L'onglet « Fiches écartées » permet de revoir ces décisions. Les spas dont le nom ne confirme pas le service restent dans la liste et figurent également dans l'onglet « Activité à vérifier ».

Les exports restent locaux et sont ignorés par Git. La collecte s'arrête à Casablanca en attendant validation du résultat. Google Places n'a pas été utilisé et aucun appel payant n'a été effectué.
