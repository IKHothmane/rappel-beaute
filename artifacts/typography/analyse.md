# Analyse des dimensions de la vitrine

Mesures locales sur le code du 12 novembre 2026, fenêtres de 1440 × 900 et 390 × 900. Aucun style modifié.

## Résultats

La majorité des H1 mesure 47,36 px sur ordinateur et 32 px sur mobile. Exceptions : caisse 47,36/40 px, professionnel 40/40 px, connexion 47,36/34 px, blog 44/30 px.

Les titres de section courants mesurent environ 33,28 px sur ordinateur et 28 px sur mobile. Les titres de cartes courants sont de 18 à 22 px, avec des variantes compactes à 16 px. Les paragraphes principaux sont généralement à 16 px ; les introductions à 16,56 px sur ordinateur et 15 px sur mobile.

Le système partagé prévoit un conteneur maximal de 1200 px, des cartes avec 20 à 24 px de padding et des boutons de 44 px minimum avec un texte de 15 px. Ces valeurs sont de bonnes bases, mais les pages ajoutent des exceptions.

## Priorités

1. Harmoniser les H1 mobiles autour de 32 à 34 px. Caisse et professionnel restent à 40 px ; blog descend à 30 px.
2. Passer les informations utiles en 13 px à 14 px minimum : aide WhatsApp du formulaire professionnel, aide de connexion, catégories et actions de FAQ, sommaire de confidentialité. Conserver 16 px pour les paragraphes de lecture.
3. Agrandir les zones tactiles du menu mobile et des commandes de la démonstration de caisse : 40 px mesurés, cible de confort de 44 à 48 px. Les liens du sommaire de confidentialité font environ 41 px de haut sur ordinateur. Les champs de connexion sont confortables : minimum CSS de 52 px ; formulaire professionnel : minimum de 44 px.
4. Réserver les textes minuscules aux illustrations. La consigne « Appuyez sur PRINT » mesure environ 7 px ; elle devrait sortir de la maquette et devenir une légende lisible de 13 à 14 px. Les miniatures de réservation contiennent également du texte très réduit ; ce n'est pas du contenu de lecture.
5. Réduire l'emprise du bandeau de consentement mobile : il mesure visuellement environ 255 px de haut à 390 px de large et masque une partie du formulaire. Ses caractères de 14 px et ses boutons de 44 px sont correctement dimensionnés.
6. Examiner le rythme de l'accueil en défilement réel : le hero possède une piste de défilement de 100svh + 22 à 34rem. Une capture pleine page contient de grands espaces dus à cette animation ; ne pas les confondre avec des marges ordinaires.

## Limites

Les 42 navigations ont été effectuées, mais /creation-site-web/ redirigeait vers l'accueil lors de ce relevé : ses mesures correspondent donc à l'accueil. Cette page reste à auditer séparément quand elle est accessible.

Aucun débordement horizontal détecté aux deux largeurs mesurées. Cela ne constitue pas un contrôle de tous les écrans intermédiaires ou du zoom 200 %.

Le téléchargement des polices Google a été bloqué dans cet environnement ; le serveur a utilisé des polices de remplacement. Les tailles CSS sont mesurées, mais les coupures de lignes et largeurs visuelles devront être revérifiées avec les polices finales.

Les données détaillées sont dans measurements.json. Les captures sont dans ce même dossier. Les petites tailles provenant d'illustrations, les cases à cocher et les titres masqués pour lecteurs d'écran doivent être distingués du contenu principal lors de l'interprétation des données.
