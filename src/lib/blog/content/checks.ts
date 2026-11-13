/** Vérifications propres aux sujets ; compléments de la méthode, pas des promesses produit. */
export const ARTICLE_CHECKS: Record<string, string> = {
  "message-rendez-vous-annule-institut":
    "Préparez également un suivi des clientes qui n’ont pas répondu. À l’approche du rendez-vous initial, vérifiez les contacts encore ouverts afin qu’une personne ne se déplace pas sur la base d’une confirmation devenue obsolète.",
  "mesurer-efficacite-rappels-whatsapp":
    "Conservez la date de changement du réglage et le nombre de rendez-vous éligibles. Sans ce repère, une comparaison peut mélanger des visites rappelées et non rappelées, ce qui rend l’interprétation du résultat beaucoup moins fiable.",
  "points-ou-passages-fidelite":
    "Avant de lancer la règle, simulez aussi un remboursement et une visite comprenant uniquement un produit. Ces cas révèlent les exceptions que les exemples de soins ordinaires ne montrent pas et facilitent l’explication à l’accueil.",
  "reactiver-clientes-institut":
    "Réservez une petite capacité de réponse avant l’envoi : les clientes peuvent demander des horaires ou signaler une difficulté. Une campagne réussie doit pouvoir être suivie par l’équipe et ne pas laisser les réponses sans traitement.",
  "fiche-cliente-institut-contenu":
    "Relisez périodiquement un échantillon de fiches avec une personne autorisée. Cherchez les champs inutilisés, les notes ambiguës et les coordonnées dépassées, puis améliorez les consignes de saisie plutôt que d’ajouter de nouveaux champs par défaut.",
  "parrainage-institut-beaute":
    "Vérifiez comment une même nouvelle cliente est attribuée si plusieurs personnes la recommandent. Une règle connue avant le lancement évite de décider au cas par cas et protège la relation avec les deux clientes concernées.",
  "gestion-stock-institut-beaute":
    "Commencez par une famille de produits pour vérifier votre méthode de mouvements et de comptage. Une fois les unités et les responsabilités comprises, étendez le suivi au reste du catalogue sans changer simultanément toutes les habitudes.",
  "inventaire-stock-institut":
    "Préparez une feuille ou une vue de comptage qui identifie clairement la référence et le format. Un nom commercial seul peut cacher plusieurs contenances et produire un écart alors que les produits ont été correctement comptés.",
  "consommation-produits-cabine":
    "Réévaluez la référence lorsque le fabricant change le conditionnement ou que le protocole évolue. Une ancienne estimation peut continuer à alimenter les coûts alors qu’elle ne correspond plus à la quantité réellement utilisée par soin.",
  "stock-revente-stock-cabine":
    "Expliquez la règle à toute personne susceptible de prélever un produit, y compris lors d’un remplacement. Le meilleur paramétrage ne détectera pas toujours un transfert physique que personne n’a signalé ou enregistré au moment du prélèvement.",
  "commande-fournisseur-institut":
    "Conservez le nom de la personne ayant validé la commande et le délai annoncé. Ces informations facilitent le suivi lorsqu’un fournisseur propose une référence de remplacement ou livre seulement une partie des quantités prévues au départ.",
  "reception-livraison-produits-institut":
    "Prévoyez un emplacement temporaire pour les produits encore en contrôle. Ils ne doivent pas être utilisés ou vendus avant décision, sinon un litige peut devenir difficile à établir et le stock disponible être surestimé.",
  "reduire-pertes-produits-institut":
    "Comparez les pertes en quantité et en valeur. Une référence peu coûteuse très souvent perdue et un appareil ou produit coûteux touché une seule fois demandent des actions différentes, même si leur coût total se ressemble.",
  "gestion-caisse-salon-beaute":
    "Faites répéter le parcours d’une vente mixte avec produit et prestation. Vérifiez aussi le traitement d’un règlement partagé si votre organisation l’utilise, pour éviter que l’accueil découvre cette difficulté pendant une période d’affluence.",
  "ecart-caisse-institut":
    "Contrôlez la période exacte du terminal de paiement : son relevé peut s’arrêter à une heure différente de votre journée opérationnelle. Un décalage de périmètre peut expliquer un écart apparent sans qu’aucune opération ne soit manquante.",
  "suivi-depenses-institut":
    "Désignez une personne qui relance les justificatifs manquants et une date de revue. Un tableau rempli une fois par trimestre risque de laisser des catégories approximatives et des paiements difficiles à rapprocher avec leur objet réel.",
  "acomptes-rendez-vous-institut":
    "Vérifiez aussi le cas d’une réservation modifiée vers une prestation moins chère. L’équipe doit connaître la procédure de régularisation et éviter d’inventer une utilisation du solde au moment du départ de la cliente.",
  "tableau-bord-mensuel-institut":
    "Conservez une courte note expliquant les changements de définition. Si vous modifiez le calcul du taux d’occupation ou la prise en compte des remboursements, signalez-le afin de ne pas interpréter une rupture technique comme une évolution de l’activité.",
  "planning-personnel-institut-beaute":
    "Préparez une vue lisible des changements récents et vérifiez leur réception. Un planning correct dans le logiciel reste inefficace si la personne concernée n’a pas été informée d’une modification ou d’une nouvelle responsabilité au moment utile.",
  "integrer-nouvelle-praticienne":
    "Prévoyez les situations où la nouvelle personne doit s’arrêter et demander une validation. Savoir reconnaître la limite de son autorisation fait partie de l’autonomie et évite des corrections improvisées sur les paiements ou les dossiers.",
  "gerer-absence-praticienne":
    "Gardez une liste des clientes encore sans solution, avec la prochaine action attendue. Cette vue temporaire permet de suivre la réorganisation sans perdre une demande parmi les messages et doit être limitée aux informations nécessaires.",
  "repartir-rendez-vous-equipe":
    "Réexaminez la répartition lorsque les horaires ou les compétences changent. Une règle équitable à l’ouverture peut devenir inadaptée après l’arrivée d’une personne à temps partiel ou l’ajout d’une prestation demandant un équipement particulier.",
  "transmission-accueil-praticiennes":
    "Décidez comment signaler qu’une information a bien été prise en compte. Une alerte envoyée n’est pas toujours une alerte lue ; les changements proches de l’heure du rendez-vous demandent une vérification plus directe.",
  "checklist-ouverture-institut":
    "Ajoutez une case d’exception avec l’action décidée et le responsable. Une cabine indisponible ou une livraison manquante ne doit pas empêcher tout usage de la liste, mais doit conduire à une décision visible avant l’accueil.",
  "checklist-fermeture-institut":
    "Séparez les contrôles quotidiens des contrôles hebdomadaires pour éviter une liste inutilement longue. Révisez les points après un incident ou un changement d’équipement, et retirez ceux qui ne correspondent plus à l’organisation réelle.",
  "former-equipe-logiciel-institut":
    "Prévoyez une personne référente par plage d’ouverture, notamment pendant les premières semaines. L’équipe doit savoir comment obtenir une réponse lorsque la responsable habituelle est absente, sans créer des méthodes parallèles ou des comptes partagés.",
  "commissions-equipe-institut":
    "Vérifiez un petit échantillon manuellement avant de valider le relevé complet. Choisissez des ventes ordinaires et des cas particuliers : prestation partagée, réduction ou remboursement. Cette vérification teste le calcul autant que les paramètres retenus.",
  "reunion-equipe-institut":
    "Envoyez un compte rendu court centré sur les décisions et les échéances. Évitez de recopier les échanges personnels : le document doit aider à agir et à vérifier les progrès, sans devenir une archive de commentaires sur les personnes.",
  "positionnement-institut-beaute":
    "Relisez votre présentation avec une personne qui ne connaît pas l’établissement. Si elle ne peut pas expliquer les services, le lieu et la prochaine étape, simplifiez la formulation avant de multiplier les supports de communication.",
  "offre-lancement-institut":
    "Vérifiez la façon dont l’offre apparaît dans l’agenda et à la caisse. La personne qui accueille doit retrouver les conditions sans rechercher une ancienne publication, surtout si plusieurs offres différentes circulent au même moment.",
  "partenariats-locaux-institut":
    "Précisez qui répond aux demandes et qui met à jour les supports. Un ancien document avec un tarif expiré peut continuer à être distribué chez le partenaire longtemps après la fin de votre action commune.",
  "saisonnalite-institut-beaute":
    "Séparez les besoins réversibles et les engagements durables. Adapter une commande ou une plage d’ouverture n’a pas les mêmes conséquences qu’acheter un équipement sur la base d’un pic de fréquentation encore peu documenté.",
  "mesurer-origine-nouvelles-clientes":
    "Gardez la même liste de sources pendant la période étudiée. Si les catégories changent chaque semaine, vous risquez d’observer une variation de saisie plutôt qu’une évolution de l’efficacité réelle de vos canaux d’acquisition.",
  "plan-developpement-institut-2027":
    "Associez chaque objectif à une condition de révision. Si les coûts augmentent ou si une ressource devient indisponible, le plan doit pouvoir changer sans cacher l’écart entre l’hypothèse de départ et la situation constatée.",
  "proteger-donnees-clientes-institut":
    "Commencez par supprimer les copies devenues inutiles selon vos règles de conservation. Réduire la dispersion des fichiers rend souvent les demandes de correction et le contrôle des accès plus simples, sans nécessiter de nouvel outil complexe.",
  "acces-equipe-donnees-clientes":
    "Conservez une liste des personnes autorisées et des rôles attribués. Lors d’une revue, vérifiez les permissions réelles dans le logiciel plutôt que de vous fier seulement au titre du poste ou à une ancienne fiche d’intégration.",
  "export-donnees-logiciel-institut":
    "Avant un envoi, ouvrez le fichier comme le destinataire le recevra et vérifiez les onglets masqués ou colonnes supplémentaires. Une vue filtrée à l’écran ne garantit pas que les autres informations ont été retirées de l’export.",
  "demande-suppression-donnees-cliente":
    "Gardez une trace limitée de la demande, de la décision et des actions réalisées. Cette trace sert au suivi ; elle ne doit pas devenir une nouvelle copie complète des données que vous venez de supprimer.",
  "cookies-site-institut":
    "Réexaminez les réglages après l’ajout d’un nouveau service, par exemple une carte ou une vidéo intégrée. Une configuration correcte au lancement peut changer lorsque de nouveaux scripts sont ajoutés dans le site ou ses outils de gestion.",
  "compte-equipe-depart-institut":
    "Préparez cette procédure dès l’arrivée de la personne en recensant les accès accordés. Il sera beaucoup plus difficile de retrouver les services utilisés si aucun inventaire n’existe au moment où l’accès doit être retiré rapidement.",
  "panne-internet-institut-plan-secours":
    "Attribuez le rapprochement à une personne et vérifiez les doublons au retour du service. Une réservation notée pendant la panne peut aussi avoir été enregistrée par un autre canal lorsque la connexion a été partiellement rétablie.",
};
