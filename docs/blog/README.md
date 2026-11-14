# Blog public Rappel Beauty

Les 110 guides du code sont des **brouillons**. La vitrine et le sitemap ne lisent que les lignes `BlogArticle` au statut `published`, avec un `reviewedBy` renseigné et une date de publication atteinte. Retirer un article dans l’administration (retour au brouillon) le retire du blog public.

- `/blog/` affiche ces articles publiés, sans pagination, avec recherche et filtre parmi 11 thèmes. Sans article relu, la page indique que les guides sont en préparation et n’est pas indexée.
- `/blog/[slug]/` affiche un guide publié, avec la navigation et le footer du site vitrine, ses sources, sa FAQ et des articles associés. Un brouillon répond 404.
- Le menu principal et le footer proposent un accès au blog.
- Le sitemap contient le blog et seulement les adresses publiées ; les variantes de recherche restent en `noindex`.

`publishedArticles()` dans `src/lib/blog/public.ts` délègue à `listPublishedArticles()`. Les fichiers de `src/lib/blog/content/` préparent les propositions ; ils ne les publient pas. Aucun compte fictif de relecteur n’est attribué. Les exemples marocains restent explicitement fictifs et les comparaisons sont documentaires, sans classement indépendant revendiqué.

L’affichage administratif a été retiré : son entrée de menu et ses composants de rédaction/lecture ne sont plus utilisés. Les anciennes adresses `/content/blog/` et `/content/blog/[slug]/` redirigent vers la vitrine. La publication et le retrait passent par l’API éditoriale protégée, qui enregistre le relecteur authentifié. Modifier un guide visible se fait dans ce stockage, pas en redéployant un brouillon du code.

`node scripts/blog/export-review.cjs` produit aussi une copie locale complète et 110 fichiers autonomes dans `.tmp/rappel-beauty-guides/`, accessibles via `index.html`. Ces copies sont des exports de relecture, distincts des pages publiques.

Vérifications : `npm run typecheck`, `node node_modules/vitest/vitest.mjs run tests/blog`, et `e2e/blog.spec.ts` sur un serveur isolé. Les tests navigateur contrôlent la page d’attente tant qu’aucun guide n’est relu, l’absence des brouillons dans le sitemap, et la protection des API administratives.

La publication reste progressive : un guide n’entre sur la vitrine qu’après relecture humaine. Aucun déploiement distant ni migration distante n’a été exécuté dans cette intervention.

## Crawl de la vitrine

`node scripts/blog/crawl-vitrine.cjs http://127.0.0.1:3115 .tmp/crawl-vitrine` parcourt le sitemap et les liens internes publics, y compris les 110 guides. Remplacer l’origine par `https://rappelbeauty.com` pour contrôler le déploiement. Chaque exécution produit `rapport.html`, `rapport.json` et une copie du sitemap ciblé.

Le contrôle porte sur les codes HTTP, les titres H1, les descriptions, les canoniques, l’indexation, les doublons, les liens internes, les ancres et les fichiers des images. Les règles robots du groupe `*` sont distinguées des groupes de robots d’entraînement. Les liens e-mail protégés par Cloudflare sont signalés comme nécessitant JavaScript. Le script n’envoie aucun formulaire et ne mesure pas les performances réelles du navigateur.
