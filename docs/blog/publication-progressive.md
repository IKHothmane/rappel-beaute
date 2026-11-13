# Préparer une publication progressive des 110 guides

> Proposition antérieure conservée pour référence. Le propriétaire a ensuite demandé l’affichage de tous les guides sur la vitrine : le catalogue public de 110 guides est désormais défini dans `src/lib/blog/public.ts`, sans passage par l’administration.

Les 100 adresses initiales sont conservées. La catégorie **SEO local & Google Maps** ajoute dix guides d’environ 520 à 590 mots. Quatre articles prioritaires ont été développés : environ 1 500 mots pour le guide de choix 2027 et 770 à 925 mots pour les trois autres, selon le comptage du contenu visible, FAQ et tableaux compris.

Les sources Google, Fresha et Planity ont été consultées le **13 novembre 2026**. Les comparaisons restent documentaires et sont publiées par Rappel Beauty ; elles ne sont pas présentées comme des essais indépendants. Aucun tarif étranger n’est converti en devis marocain, et la disponibilité au Maroc des services concurrents reste à confirmer. Les captures proviennent des fichiers déjà utilisés sur le site, sans fabrication d’avis, de résultats ni de captures Google.

Le contenu tarifaire récupéré en ligne et la configuration locale ne concordent pas sur l’annuel et la durée d’essai. Aucun de ces nombres n’est donc figé dans les nouveaux guides : ils renvoient vers la page Tarifs et une confirmation des conditions. Cette intervention ne modifie pas les tarifs du produit ; leur harmonisation reste à valider avant publication.

## Lot 1 — relire les quatre pages prioritaires

| Ordre proposé | URL conservée | Contrôle avant publication |
| --- | --- | --- |
| 1 | `/blog/meilleur-logiciel-institut-beaute-2027/` | Relire la comparaison, les limites géographiques, le WhatsApp assisté et les sources datées. |
| 2 | `/blog/logiciel-gestion-institut-beaute-maroc/` | Valider les parcours réels, la capture de caisse et les limites de reprise de données. |
| 3 | `/blog/prix-logiciel-institut-beaute-maroc/` | Reconfirmer l’offre publique et distinguer prix réel et exemple fictif. |
| 4 | `/blog/choisir-logiciel-institut-beaute/` | Vérifier les scénarios, la grille de test et les réponses détaillées. |

## Lot 2 — préparer une fiche locale utilisable

1. `/blog/optimiser-fiche-google-business-profile-institut-beaute/`
2. `/blog/creer-valider-fiche-google-institut-maroc/`
3. `/blog/categorie-services-fiche-google-institut/`
4. `/blog/adresse-horaires-google-maps-institut/`
5. `/blog/photos-fiche-google-institut-beaute/`

Vérifier les règles Google dans les sources au moment de la publication et la cohérence des exemples avec l’activité visée. Les exemples d’instituts sont fictifs et aucune fiche locale réelle n’a été auditée dans ces articles.

## Lot 3 — avis, réservation et mesure

1. `/blog/lien-qr-code-avis-google-institut/`
2. `/blog/repondre-avis-negatif-google-institut/`
3. `/blog/ajouter-lien-reservation-fiche-google-institut/`
4. `/blog/mesurer-performance-fiche-google-institut/`
5. `/blog/recherches-locales-google-maps-institut-maroc/`

Vérifier la neutralité de la demande d’avis, la confidentialité des réponses et les options réellement accessibles sur la fiche. Un lien externe de réservation ne prouve pas une intégration native « Réserver avec Google ».

## Circuit technique existant

Chaque article reste en brouillon jusqu’à sa validation explicite dans l’atelier. Publier un seul guide ouvre uniquement son URL et l’ajoute au sitemap avec ses métadonnées ; les autres brouillons restent exclus. Les suggestions d’articles associés utilisent seulement les articles publics et les liens commerciaux restent disponibles dès le premier guide.

Pour chaque publication, contrôler l’URL publique, la canonique, les dates, `BlogPosting`, le rendu mobile, les captures et les liens. Vérifier ensuite l’apparition dans le sitemap. L’ajout au sitemap n’est pas une garantie d’indexation immédiate ni de positionnement.

Aucune publication réelle ni modification de la base distante n’a été effectuée. La migration éditoriale préparée précédemment reste une étape du déploiement, après vérification sur l’environnement prévu. Les versions déjà enregistrées en base restent prioritaires : elles ne sont pas écrasées par les nouvelles propositions source.

## Relecture hors ligne

Exécuter `node scripts/blog/export-review.cjs` produit `.tmp/rappel-beauty-110-guides-relecture.html`. Le document contient les 110 propositions, les tableaux, les captures embarquées, les sources et les filtres par thème. Il ne publie aucun contenu et ne lit pas de données clientes.

## Validation de cette mise à jour

- TypeScript : réussi.
- Vitest : 133 tests réussis, dont les 110 fiches, les formats enrichis et la publication limitée à un guide.
- Playwright : trois parcours réussis ; vérification supplémentaire de l’atelier après retrait des montants contradictoires.
- PostgreSQL embarqué isolé : conservation des tableaux et captures après enregistrement, publication et retrait, sans accès à la base distante.
- Captures du comparatif vérifiées sur ordinateur et mobile ; pas de débordement horizontal de la page.

Ces contrôles valident le code et le circuit local. Ils ne constituent pas une approbation éditoriale humaine ni un déploiement.
