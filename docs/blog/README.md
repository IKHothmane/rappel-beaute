# Blog public Rappel Beauty

À la demande du propriétaire, les 110 guides sont disponibles sur le **site vitrine**, sans accès administrateur et sans attendre une migration de base de données.

- `/blog/` affiche les 110 fiches sans pagination, avec recherche et filtre parmi 11 thèmes.
- `/blog/[slug]/` affiche le guide complet, avec la navigation et le footer du site vitrine, ses sources, sa FAQ et des articles associés.
- Le menu principal et le footer proposent un accès au blog.
- Le sitemap contient le blog et les 110 adresses individuelles ; les variantes de recherche restent en `noindex`.

Le catalogue public est construit dans `src/lib/blog/public.ts` à partir des fichiers de `src/lib/blog/content/`. La date de mise à disposition est le 13 novembre 2026 ; aucun compte fictif de relecteur n’est attribué. Les exemples marocains restent explicitement fictifs et les comparaisons sont documentaires, sans classement indépendant revendiqué.

L’affichage administratif a été retiré : son entrée de menu et ses composants de rédaction/lecture ne sont plus utilisés. Les anciennes adresses `/content/blog/` et `/content/blog/[slug]/` redirigent vers la vitrine. Les API éditoriales et la migration préparées antérieurement restent protégées et indépendantes ; leurs brouillons ne sont jamais lus par le catalogue public. Modifier un guide visible nécessite de modifier sa source puis de déployer le site.

`node scripts/blog/export-review.cjs` produit aussi une copie locale complète et 110 fichiers autonomes dans `.tmp/rappel-beauty-guides/`, accessibles via `index.html`. Ces copies sont des exports de relecture, distincts des pages publiques.

Vérifications : `npm run typecheck`, `node node_modules/vitest/vitest.mjs run tests/blog`, et `e2e/blog.spec.ts` sur un serveur isolé. Les tests navigateur contrôlent l’affichage des 110 fiches, les filtres, les pages individuelles, le sitemap et la protection des API administratives.

Le précédent plan de publication progressive décrit une proposition antérieure ; il ne constitue plus un prérequis pour afficher le catalogue demandé. Aucun déploiement distant ni migration distante n’a été exécuté dans cette intervention.

## Crawl de la vitrine

`node scripts/blog/crawl-vitrine.cjs http://127.0.0.1:3115 .tmp/crawl-vitrine` parcourt le sitemap et les liens internes publics, y compris les 110 guides. Remplacer l’origine par `https://rappelbeauty.com` pour contrôler le déploiement. Chaque exécution produit `rapport.html`, `rapport.json` et une copie du sitemap ciblé.

Le contrôle porte sur les codes HTTP, les titres H1, les descriptions, les canoniques, l’indexation, les doublons, les liens internes, les ancres et les fichiers des images. Les règles robots du groupe `*` sont distinguées des groupes de robots d’entraînement. Les liens e-mail protégés par Cloudflare sont signalés comme nécessitant JavaScript. Le script n’envoie aucun formulaire et ne mesure pas les performances réelles du navigateur.
