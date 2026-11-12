# Analyse du code du site vitrine — 12 novembre 2026

## Suivi des corrections

Les constats ci-dessous décrivent l’état avant correction. Les correctifs suivants ont été appliqués :

- Capture réelle de caisse rétablie ; références aux deux anciennes images absentes supprimées.
- Destination du module services de la démo corrigée vers l’ancre existante `#rdv`.
- Bouton de demande de démo dirigé vers `/demo/`.
- `PageHero` et `Reveal` rendus côté serveur avec un contenu visible par défaut ; animation CSS désactivée lorsque la réduction des mouvements est demandée.
- Lien d’évitement ajouté avant la navigation.
- Exports inutilisés et ancien composant `ScrollToTop` supprimés.
- Chargement direct de Google Analytics et Google Tag Manager retiré du layout racine. Leur chargement sur la vitrine dépend désormais du choix de mesure d’audience ; le footer permet de modifier ce choix. Le retrait recharge la page et retire les cookies Google de mesure accessibles au site.
- Texte de confidentialité aligné sur les parcours réels d’inscription et d’e-mail.
- Champs juridiques manquants laissés vides, à la demande de l’utilisateur ; aucune information d’entreprise ou d’hébergement inventée.
- Tests existants complétés par le décodage des images ; scénarios ajoutés pour les liens, le menu, le clavier, l’absence de JavaScript, la réduction des mouvements, le brouillon de contact et le choix de mesure d’audience.

Validation après correction :

- `npm.cmd run typecheck` : réussi après les derniers changements.
- 63 contrôles d’affichage et d’images réussis : 21 pages sur mobile (360 px), tablette (768 px) et ordinateur (1440 px).
- Sept scénarios d’interaction validés. Le premier passage a donné 68 réussites sur 70 : la navigation de démo a dépassé le délai pendant la compilation locale, et le retrait ne supprimait pas un cookie limité à un sous-chemin. Le délai du test a été adapté et la suppression étendue aux chemins concernés. Les deux scénarios ont ensuite réussi lors d’une reprise ciblée.
- Acceptation, refus, préférence persistée, retrait et conservation des cookies techniques vérifiés ; scripts Google remplacés par des réponses vides pendant ces tests. Aucun vrai message ni compte créé.
- Présentation du choix de mesure d’audience contrôlée visuellement à 390 px et 1440 px.

Les mesures Core Web Vitals restent hors de ce contrôle fonctionnel.

## Résultat de l’analyse initiale

Note indicative de qualité du code : **7,5/10**. Cette appréciation repose sur la lecture du code et les contrôles ci-dessous ; ce n’est pas un score Lighthouse.

La base est structurée : Next.js App Router, TypeScript strict, pages majoritairement statiques, composants partagés et variables communes pour la typographie et les couleurs. Plusieurs défauts précis restent à corriger, surtout sur la page caisse, certains liens et les textes de confidentialité.

## Périmètre et contrôles

- 25 fichiers `page.tsx` dans le groupe marketing, comprenant les pages techniques et les pages redirigées.
- 61 fichiers TypeScript dans les pages et les dossiers de composants vitrine sélectionnés ; 15 déclarent une frontière client. Le composant de hero animé, situé dans `components/ui`, est également examiné.
- 28 feuilles CSS dans ces dossiers.
- Analyse des imports locaux, des images référencées, des métadonnées et des formulaires.
- `npm.cmd run typecheck` : **réussi**.
- Lecture des tests Playwright existants : 21 pages sur trois tailles d’écran. Ces tests n’ont pas été exécutés dans cet audit.
- Aucune modification du code applicatif ; ce rapport est le seul document ajouté.

## Défauts confirmés lors de l’analyse initiale, par priorité

### 1. Image absente sur la page caisse — priorité haute

`src/components/www/ProductViews.tsx:24` utilise `/marketing/screen-caisse.png`, qui n’existe pas dans `public`. `ReceiptView` est réellement rendu par `src/app/(marketing)/caisse/page.tsx:102`.

Conséquence : la page référence une image introuvable. La validité TypeScript ne détecte pas ce problème.

Correction recommandée : utiliser la capture existante `/site/rappelbeauty-caisse-pc-reel.webp` avec ses dimensions 2200 × 1250.

### 2. Confidentialité et scripts de mesure incohérents — priorité haute avant publication

`src/app/(marketing)/confidentialite/page.tsx:69` décrit une vitrine locale avec uniquement des cookies techniques de développement. Pourtant `src/app/layout.tsx:108` charge Google Analytics, et le script suivant charge Google Tag Manager, sans condition de consentement visible dans ce layout.

Le texte évoque également un ancien parcours de demandes de démo et d’essai, alors que le contact prépare un e-mail et que l’inscription professionnelle crée un compte via une API.

Correction recommandée : aligner les informations affichées sur les traitements effectivement utilisés et décider explicitement comment les scripts de mesure doivent être activés. Le contenu du conteneur GTM n’a pas été inspecté : un double comptage Analytics n’est donc pas établi.

Les mentions légales comportent encore des informations à compléter : éditeur, forme juridique, siège, hébergement et immatriculation (`src/components/www/LegalMentions.tsx:25`). Ce rapport constate leur caractère incomplet ; il ne constitue pas une validation juridique.

### 3. Lien de la démo vers une ancre absente — priorité moyenne

`src/components/www/DemoExplorer.tsx:64` pointe vers `/fonctionnalites/#services`. La page cible définit les modules `rdv`, `clientes`, `caisse`, `stock`, `equipe` et `analytics`, mais aucun identifiant `services`.

Conséquence : le visiteur arrive sur la page sans atteindre la section annoncée.

Correction recommandée : ajouter une vraie section identifiée `services` ou viser une destination existante pertinente.

### 4. Bouton « Demander une démo » dirigé vers l’inscription — priorité moyenne

Dans `src/components/www/PageHero.tsx:51`, les boutons de demande de démo et de demande d’essai pointent tous deux vers `/professionnel/`. Le composant est notamment utilisé par le blog.

Correction recommandée : diriger le bouton de démo vers `/demo/` ou `/contact/?subject=demo#contact-form`, et conserver `/professionnel/` pour l’inscription.

### 5. Contenus masqués avant l’animation JavaScript — priorité moyenne

`PageHero` initialise notamment le titre avec `opacity: 0`. `src/components/www/Reveal.tsx:29` masque également son contenu jusqu’à l’animation `whileInView`.

En cas d’échec de JavaScript, les contenus concernés restent invisibles. Ces composants ne consultent pas `useReducedMotion`, contrairement au hero panoramique qui le fait déjà.

Correction recommandée : assurer un contenu visible par défaut et adapter les animations à la préférence de réduction des mouvements. Le manque de lien d’évitement vers le contenu dans le layout marketing mérite aussi d’être corrigé pour faciliter la navigation au clavier.

### 6. Tests visuels qui ne détectent pas les images cassées — priorité moyenne

`e2e/vitrine.spec.ts` contrôle le statut de la page, le nombre de titres principaux, les débordements et la présence de l’attribut `alt`. Une image inexistante avec un attribut `alt` satisfait néanmoins ce dernier contrôle.

Correction recommandée : compléter les tests avec le décodage des images ou un contrôle de `naturalWidth`, et vérifier les principales destinations et ancres. Ajouter des scénarios sur la démo, le menu mobile et le brouillon de contact, sans envoyer de vrais messages ni créer de vrais comptes.

### 7. Nettoyage restant, limité à des symboles précis — priorité basse

La recherche des imports et usages dans `src` confirme les candidats suivants :

- `ServicesView`, dans `ProductViews.tsx`, n’est pas appelé ; il référence aussi une image absente, `/marketing/screen-services.png`.
- `RevealStagger` et `RevealItem`, dans `Reveal.tsx`, ne sont pas appelés.
- `ScrollToTop` est importé dans `src/app/layout.tsx:4`, sans être rendu.

Le graphe d’imports ne signale aucun fichier entièrement isolé dans les dossiers de composants vitrine étudiés. Il serait donc incorrect de supprimer des dossiers entiers sur cette seule analyse. `ReceiptView` et `Reveal`, par exemple, restent utilisés même si certains autres exports de leurs fichiers ne le sont plus.

## Limites fonctionnelles à connaître

Le formulaire de contact prépare un lien `mailto:`. L’utilisateur doit ouvrir sa messagerie et envoyer lui-même le message. Le formulaire du footer utilise également cette méthode ; il ne constitue pas une inscription automatique à une base de newsletter.

Ces comportements sont annoncés dans l’interface : ils ne sont pas classés comme des erreurs. Un envoi directement depuis le site demanderait une fonctionnalité serveur et une gestion d’erreur adaptées.

## Points solides

- TypeScript strict et contrôle de types réussi.
- Navigation et footer communs ; blocs partagés dans `blocks.tsx` et `ShowcaseLanding.tsx`.
- Variables communes pour les tailles, les espacements et la palette.
- Prix et durée d’essai centralisés dans `PUBLIC_OFFER`, repris dans les pages et les données structurées.
- Métadonnées des pages commerciales regroupées : titre, description, canonical, Open Graph et Twitter.
- Images généralement rendues avec `next/image`, dimensions et attribut `sizes`.
- Navigation clavier des onglets de l’application, états ARIA et styles de focus présents.
- Gestion des états de chargement et des erreurs pour la connexion et l’inscription ; validation serveur et limitation de débit présentes sur l’API d’inscription.
- Le blog est volontairement en attente et non indexable ; ce choix n’est pas une erreur SEO.

## Performances : observations et limites

Les outils Chrome DevTools MCP ne sont pas disponibles dans cette session. Le skill [web-perf](<C:/Users/hp/.codex/skills/web-perf/SKILL.md>), section « FIRST », demande : « If unavailable, STOP—the chrome-devtools MCP server isn't configured. » La partie mesure s’arrête donc à ce constat ; l’analyse de code peut être menée séparément.

| Mesure | Résultat |
| --- | --- |
| LCP | Non mesuré |
| INP | Non mesuré |
| CLS | Non mesuré |
| Score Lighthouse | Non mesuré |
| Poids réseau réellement transféré | Non mesuré |

Observations vérifiables dans le code :

- Le hero de l’accueil utilise Framer Motion et huit images, dont les deux centrales sont prioritaires. Son coût doit être mesuré avant de proposer une simplification.
- Le PNG décoratif du footer pèse 1 774 457 octets sur disque. Il passe par `next/image` : ce poids source n’est pas son poids réseau réel et ne prouve pas une lenteur.
- La configuration des images prévoit WebP, des tailles limitées et un cache de 31 jours.
- La feuille commune démo/contact représente environ 19,5 ko de source et 3,9 ko après compression gzip du texte source. Ce ne sont pas des mesures du CSS de production.
- Des scripts de mesure sont chargés au niveau du layout racine. Leur coût réseau et leur exécution doivent être examinés lors d’une trace en production.

Aucun gain en millisecondes n’est annoncé sans mesure. Pour terminer cette partie, connecter Chrome DevTools MCP puis analyser un build de production sur mobile et ordinateur.

## Ordre de correction conseillé

1. Réparer l’image de caisse et les destinations de liens.
2. Actualiser les informations de confidentialité et compléter les informations légales réelles.
3. Corriger la visibilité initiale des contenus animés et les préférences de mouvement.
4. Étendre les tests aux images, ancres et interactions importantes.
5. Retirer les exports et imports inutilisés confirmés.
6. Mesurer les performances en production avant d’engager une optimisation plus large.
