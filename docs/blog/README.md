# Blog public Rappel Beauty

Les 110 guides du catalogue sont affichés directement sur la vitrine et inclus dans le sitemap, sans condition de statut, de relecteur ou de date de publication.

- `/blog/` affiche tous les guides, sans pagination, avec recherche et filtre parmi 11 thèmes.
- `/blog/[slug]/` affiche le contenu du guide et ses métadonnées indexables. Une adresse inconnue répond 404.
- Le sitemap contient les 20 pages fixes et les 110 guides, soit 130 URL sans article supplémentaire en base. Les variantes de recherche restent en `noindex`.
- Aucun statut de rédaction ou de relecture n’est affiché sur les pages publiques.

`publishedArticles()` dans `src/lib/blog/public.ts` conserve son nom pour les consommateurs existants. Il construit le catalogue à partir de `BLOG_DRAFTS`, valide les contenus et fusionne par slug les versions éditoriales déjà publiques. Une version publique en base remplace le guide du même slug ; les articles supplémentaires déjà publics sont conservés. Le catalogue intégré reste visible sans base, en cas d’erreur de lecture et indépendamment de son statut interne. Les protections de l’API éditoriale et les règles d’isolation de la base restent inchangées.

Les anciennes adresses administratives `/content/blog/` et `/content/blog/[slug]/` redirigent vers la vitrine. Modifier le catalogue intégré se fait dans `src/lib/blog/content/`, puis par déploiement. Aucun relecteur ni date de publication fictifs ne sont attribués aux guides intégrés.

`node scripts/blog/export-review.cjs` produit une copie locale et 110 fichiers autonomes dans `.tmp/rappel-beauty-guides/`, accessibles via `index.html`.

Vérifications : `npm run typecheck`, `node node_modules/vitest/vitest.mjs run tests/blog`, et `e2e/blog.spec.ts` sur un serveur isolé. Les tests couvrent le catalogue immédiat, les URL du sitemap, l’indexation, les pages inconnues et les API administratives protégées.

## Crawl de la vitrine

`node scripts/blog/crawl-vitrine.cjs http://127.0.0.1:3115 .tmp/crawl-vitrine` parcourt le sitemap et les liens internes publics, y compris les 110 guides. Remplacer l’origine par `https://rappelbeauty.com` pour contrôler le déploiement. Chaque exécution produit `rapport.html`, `rapport.json` et une copie du sitemap ciblé.

Le contrôle porte sur les codes HTTP, les titres H1, les descriptions, les canoniques, l’indexation, les doublons, les liens internes, les ancres et les fichiers des images. Les règles robots du groupe `*` sont distinguées des groupes de robots d’entraînement. Les liens e-mail protégés par Cloudflare sont signalés comme nécessitant JavaScript. Le script n’envoie aucun formulaire et ne mesure pas les performances réelles du navigateur.
