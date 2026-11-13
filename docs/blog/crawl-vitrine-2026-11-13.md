# Crawl du 13 novembre 2026

| Contrôle | Version locale modifiée | Site en ligne |
| --- | ---: | ---: |
| Pages parcourues, redirections comprises | 134 | 24 |
| URL du sitemap | 130 | 19 |
| Guides individuels dans le sitemap | 110 | 0 |
| Pages avec erreur HTTP ou de métadonnées détectée | 0 | 0 |
| Liens internes cassés détectés | 0 | 0 |
| Fichiers d’images contrôlés | 18 | 18 |
| Fichiers manquants détectés | 0 | 0 |
| Titres ou descriptions identiques | 0 | 0 |

La liste du sitemap local comprend 20 pages de vitrine, dont le blog, et 110 guides. Les canoniques, titres H1, descriptions, robots, ancres et liens internes ont été contrôlés sur le HTML servi. Les redirections `/instituts/` vers `/` et `/ressources/` vers `/faq/` sont attendues et restent hors sitemap.

Les e-mails protégés par Cloudflare sur les pages Contact, Confidentialité et Mentions légales ont aussi été contrôlés avec JavaScript dans Chromium : les cinq liens protégés deviennent bien des liens `mailto:`. Les restrictions robots visant les crawlers d’entraînement ne sont pas interprétées comme des restrictions du groupe `*`.

Le site en ligne sert encore l’ancien blog d’attente et un sitemap de 19 pages : les changements locaux doivent être déployés pour y rendre les 110 guides accessibles. Aucun déploiement ni soumission à Search Console n’a été effectué.

Rapports détaillés : `.tmp/crawl-vitrine/rapport.html` et `.tmp/crawl-vitrine-en-ligne/rapport.html`, accompagnés de leurs données JSON et du XML récupéré. Contrôles de code : TypeScript valide et 135 tests du blog réussis.

Périmètre : lecture HTTP des pages publiques et de leurs liens internes, contrôle des sources des images `<img>`, sans envoi de formulaires, sans accès aux dossiers privés, sans audit Lighthouse ni validation juridique des contenus. Les liens externes et les images de fond CSS ne sont pas vérifiés par ce crawl.
