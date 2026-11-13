import type { BlogContent, BlogSection } from "../types";
import { BLOG_IMAGES } from "../images";

const dashboard = {
  ...BLOG_IMAGES[0],
  alt: "Capture du tableau de bord Rappel Beauty : activité et analyse financière",
  caption:
    "Capture d’interface déjà utilisée sur le site Rappel Beauty. Les montants visibles illustrent l’écran et ne démontrent pas un résultat commercial.",
};
const cash = {
  ...BLOG_IMAGES[1],
  alt: "Capture de la caisse Rappel Beauty sur ordinateur",
  caption:
    "Écran de caisse présenté sur le site Rappel Beauty ; vérifier les parcours disponibles dans votre démonstration et votre contrat.",
};
const productSources = [
  {
    href: "https://www.fresha.com/pricing",
    label: "Fresha — présentation officielle des offres et frais, consultée le 13 novembre 2026",
  },
  {
    href: "https://info.planity.com/tarifs",
    label: "Planity — formules officielles, consultées le 13 novembre 2026",
  },
  { href: "https://rappelbeauty.com/tarifs/", label: "Rappel Beauty — offre publique en vigueur" },
];
const scenarios: BlogSection = {
  title: "Quatre scénarios à tester avec les mêmes données fictives",
  paragraphs: [
    "Préparez une courte grille avant chaque démonstration et faites réaliser les opérations par la personne qui accueillera les clientes. Une présentation commerciale prouve ce que l’éditeur montre ; un essai guidé par votre équipe permet de voir si les étapes sont comprises dans vos conditions de travail.",
  ],
  steps: [
    "Réservez deux soins qui partagent une cabine et vérifiez comment l’outil traite le chevauchement, puis déplacez le premier rendez-vous.",
    "Retrouvez une cliente fictive, ajoutez une préférence utile et vérifiez ce qu’un autre rôle peut consulter sans accéder à tout le dossier.",
    "Encaissez un soin et un produit, appliquez une correction autorisée et vérifiez les totaux ainsi que la trace de l’opération.",
    "Préparez le prochain contact, contrôlez le mode d’envoi des rappels et demandez un export utilisable avant d’envisager la migration.",
  ],
};
type Expansion = Pick<BlogContent, "sections" | "faqs" | "sources">;
export const PRIORITY_CONTENT: Partial<Record<string, Expansion>> = {
  "meilleur-logiciel-institut-beaute-2027": {
    sections: [
      {
        title: "Ce que signifie « meilleur » pour préparer 2027",
        paragraphs: [
          "Il n’existe pas ici de palmarès indépendant qui désignerait un logiciel gagnant pour tous les instituts. Ce guide est publié par Rappel Beauty, qui commercialise sa propre solution. Il présente une méthode de décision et une comparaison documentaire limitée ; il ne résulte pas d’un essai complet et indépendant de chaque produit cité.",
          "Nous sommes en novembre 2026 : les éléments vérifiés décrivent les pages consultées à cette date et le fonctionnement présenté dans le projet Rappel Beauty. Les prix, contrats et possibilités en 2027 restent à confirmer au moment de votre choix. Aucun retour futur, gain de chiffre d’affaires ou pourcentage de réduction des absences n’est annoncé comme acquis.",
          "Commencez par définir votre établissement : nombre de praticiennes, cabines partagées, services vendus et difficulté principale. Une personne seule qui cherche un agenda ne prend pas la même décision qu’un institut ayant des ventes de produits, plusieurs rôles et une clôture de caisse quotidienne. Le nombre de fonctions n’est utile qu’en regard de ces contraintes.",
        ],
      },
      {
        title: "Comparaison documentaire de trois solutions à examiner",
        paragraphs: [
          "Le tableau résume uniquement des informations accessibles sur les pages officielles citées en fin d’article, consultées le 13 novembre 2026. Les rubriques absentes de cette synthèse ne signifient pas qu’une fonction n’existe pas. Pour Fresha et Planity, la possibilité de contractualiser et d’utiliser chaque service au Maroc doit être confirmée directement ; elle n’est pas déduite de la langue du site.",
          "La comparaison n’attribue pas de note et ne reproduit pas les chiffres de performance promotionnels des éditeurs. Elle sert à préparer les questions de devis et de démonstration. Les noms commerciaux identifient les solutions comparées ; ils ne constituent ni un partenariat ni une recommandation universelle.",
        ],
        table: {
          caption:
            "Périmètre annoncé par les éditeurs ; vérification documentaire du 13 novembre 2026, à reconfirmer avant signature.",
          columns: [
            "Solution",
            "Éléments constatés",
            "Coût à vérifier",
            "Point décisif pour un institut au Maroc",
          ],
          rows: [
            [
              "Rappel Beauty",
              "Agenda, clientes, caisse, stock, fidélité et réservation présentés sur le site ; WhatsApp assisté avec envoi humain.",
              "Consulter la page Tarifs et obtenir confirmation des conditions applicables à votre établissement.",
              "Tester le parcours complet, les limites, les exports et les services complémentaires demandés.",
            ],
            [
              "Fresha",
              "La page tarifaire présente des formules selon l’organisation et des rubriques de frais et services additionnels.",
              "Vérifier la devise, le nombre de membres réservables, les frais et les conditions du marché concerné.",
              "Confirmer les services disponibles au Maroc et le coût total dans votre configuration.",
            ],
            [
              "Planity",
              "La page distingue Agenda, Agenda + Caisse et Agenda + Caisse + TPE ; caisse et stock sont présentés dans les offres concernées.",
              "Demander le tarif de la formule et des services nécessaires, sans convertir un devis étranger en offre locale.",
              "Confirmer l’éligibilité au Maroc, le matériel, le contrat et les parcours réellement disponibles.",
            ],
          ],
        },
      },
      {
        title: "Adapter le choix au quotidien d’un institut marocain",
        paragraphs: [
          "Cas fictif : un institut de Casablanca emploie trois praticiennes, dispose de deux cabines et utilise un appareil partagé. Sa première difficulté est un chevauchement de ressources ; une démonstration doit donc commencer par ce conflit. Montrer seulement un calendrier vide ou une réservation simple ne prouve pas que la journée réelle sera réalisable.",
          "L’accueil reçoit des demandes par téléphone et WhatsApp, puis confirme les réservations dans un agenda unique. Demandez qui envoie réellement les messages. Dans le fonctionnement actuellement présenté par Rappel Beauty, le rappel est préparé, ouvert dans WhatsApp, vérifié puis envoyé par une personne ; il ne faut pas le comparer à un service d’envoi autonome en supposant que les deux sont équivalents.",
          "Un second exemple fictif, à Rabat, privilégie les ventes de produits et la clôture de caisse. Il doit tester les mouvements de stock, les remises et les corrections de règlement. Ces exemples ne sont pas des témoignages clients et ne fournissent aucun résultat mesuré : ils montrent comment choisir un scénario adapté au problème à résoudre.",
        ],
      },
      scenarios,
      {
        title: "Lire les indicateurs sans confondre interface et preuve de résultat",
        paragraphs: [
          "Une capture permet de comprendre la disposition des informations, pas de vérifier la qualité d’une comptabilité ni un résultat commercial. Pendant la démonstration, demandez la définition de chaque indicateur, sa période et la prise en compte des opérations annulées ou corrigées. Un chiffre affiché peut être exact selon une convention qui ne répond pas encore à votre question.",
          "Utilisez le même exemple dans les trois solutions lorsque vous comparez un total. Demandez ce qui est inclus, ce qui est estimé et les données qu’il faut saisir pour obtenir le suivi souhaité. Le tableau de bord doit aider à décider ; il ne doit pas masquer les données manquantes derrière une présentation agréable.",
        ],
        image: dashboard,
      },
      {
        title: "Comparer le coût total et la charge de travail",
        paragraphs: [
          "Calculez un coût sur douze mois avec votre nombre de personnes et d’établissements. Séparez abonnement, mise en route, matériel, messages, paiement, accompagnement et sortie éventuelle. Demandez les postes qui varient avec l’usage et ceux qui dépendent d’un service externe ; un prix public ne couvre pas automatiquement tous les besoins particuliers.",
          "Pour l’offre Rappel Beauty, la page Tarifs constitue la référence publique et le contrat doit confirmer les services complémentaires. Pour les autres solutions, demandez une proposition adaptée au Maroc plutôt que d’utiliser un tarif affiché dans une autre devise. Ne comparez pas des montants avec et sans taxes sans indiquer votre convention.",
          "Ajoutez la charge de travail restante. Un rappel assisté demande une action humaine, une caisse demande un contrôle quotidien et une migration nécessite une vérification des données. Le temps économisé peut être estimé par un essai, mais il ne devient pas automatiquement du chiffre d’affaires ni un bénéfice net.",
        ],
      },
      {
        title: "Vérifier les accès, l’accompagnement et la sortie",
        paragraphs: [
          "Demandez ce que voit chaque rôle et testez un compte d’accueil distinct d’un compte de direction. Vérifiez les modalités de retrait d’accès lorsqu’une personne quitte l’équipe. Posez aussi les questions de langue de support, horaires et canal de contact ; ne supposez pas qu’une langue de l’interface implique un accompagnement contractuel dans toutes les langues de votre clientèle.",
          "Avant d’importer des informations réelles, demandez les formats repris et les possibilités d’export. Une liste de contacts n’est pas un historique complet de fidélité, de prestations et de paiements. Faites préciser les champs disponibles et les limites plutôt que d’attendre la fin de l’abonnement pour découvrir ce qui peut être récupéré.",
          "Pour les obligations juridiques, comptables et de protection des données propres à votre établissement, faites examiner les documents par des personnes compétentes. Une caisse ou un hébergement ne constituent pas à eux seuls une attestation de conformité globale au Maroc. Une mention de certification étrangère doit aussi être comprise dans son périmètre réel.",
        ],
      },
      {
        title: "Conclure avec une décision documentée",
        paragraphs: [
          "Attribuez à chaque scénario un résultat : réalisé de façon autonome, réalisé avec aide ou non confirmé. Ajoutez les limites acceptées, le coût et les questions encore ouvertes. Cette grille produit une décision explicable à l’équipe, sans transformer une préférence personnelle ou une page commerciale en classement objectif de marché.",
          "Choisissez ensuite un déploiement limité, une personne référente et une date de bilan. Faites confirmer les points bloquants avant de signer. Pour préparer 2027, la bonne décision est celle dont vous comprenez le fonctionnement, les limites et le coût, avec des engagements vérifiés au moment du contrat.",
        ],
      },
    ],
    faqs: [
      {
        question: "Quel est le meilleur logiciel pour un institut de beauté au Maroc en 2027 ?",
        answer:
          "Ce guide ne désigne pas de vainqueur universel. Sélectionnez quelques solutions adaptées à votre organisation, testez les mêmes scénarios et confirmez leurs conditions au Maroc. Rappel Beauty est l’éditeur de ce guide et l’une des solutions présentées.",
      },
      {
        question: "Les prix des concurrents affichés en ligne s’appliquent-ils au Maroc ?",
        answer:
          "Pas nécessairement. La devise, les options, le marché et les conditions peuvent varier. Demandez un devis applicable à votre établissement et comparez le coût annuel complet, sans conversion présentée comme une offre contractuelle.",
      },
      {
        question: "Rappel Beauty envoie-t-il automatiquement les rappels WhatsApp ?",
        answer:
          "Dans le fonctionnement actuellement présenté sur le site, non : le message est préparé puis relu et envoyé par une personne depuis WhatsApp. Vérifiez ce parcours en démonstration et ne le confondez pas avec un envoi autonome.",
      },
      {
        question: "Ces trois logiciels ont-ils été testés intégralement par un tiers indépendant ?",
        answer:
          "Non. La comparaison repose sur les pages officielles citées et sur les informations du projet Rappel Beauty. Elle identifie les points à vérifier ; elle ne remplace pas un essai personnel ni une analyse contractuelle indépendante.",
      },
    ],
    sources: productSources,
  },
  "logiciel-gestion-institut-beaute-maroc": {
    sections: [
      {
        title: "Décrire le fonctionnement de votre institut avant de choisir un outil",
        paragraphs: [
          "Commencez par une journée ordinaire et une journée difficile. Qui reçoit les demandes ? Qui prépare les cabines ? Comment une prestation terminée devient-elle un encaissement et une information de suivi ? Le logiciel doit soutenir ces passages plutôt que reproduire séparément les mêmes informations dans plusieurs écrans.",
          "Un institut marocain peut recevoir les réservations par téléphone, messages ou sur place. Le canal d’entrée ne doit pas créer un agenda concurrent. Définissez où la réservation devient officielle, qui peut la déplacer et comment l’équipe sait qu’un changement a été confirmé à la cliente.",
          "Préparez aussi la liste des ressources : praticiennes, cabines, appareils et temps de remise en état. La capacité réelle n’est pas seulement le nombre de personnes présentes. Une prestation peut demander une cabine pendant une durée différente du temps mobilisé par une praticienne ; faites vérifier le niveau de détail que votre outil sait gérer.",
        ],
      },
      scenarios,
      {
        title: "Exemple fictif : trois canaux d’entrée, un seul planning",
        paragraphs: [
          "Un institut fictif de Marrakech reçoit une demande de soin sur WhatsApp pendant qu’une autre cliente réserve en ligne. L’accueil doit vérifier les mêmes disponibilités et enregistrer le rendez-vous dans la même source. Si l’une des réservations reste dans une conversation sans être saisie, le risque ne vient pas seulement de l’outil mais du processus.",
          "L’équipe définit donc un responsable de prise en charge et distingue une proposition d’horaire d’une confirmation définitive. Elle teste ensuite le déplacement du soin et l’actualisation des informations envoyées. Le résultat attendu est une organisation plus fiable ; cet exemple n’annonce ni taux d’absence ni gain financier mesuré.",
        ],
      },
      {
        title: "Comprendre ce que montre une capture de caisse",
        paragraphs: [
          "Lorsqu’on vous montre un écran de caisse, demandez le parcours complet : choix des lignes, mode de règlement, remise éventuelle, correction et clôture. Vérifiez qui peut faire chaque action et ce qui reste visible après une erreur. Une capture seule ne permet pas d’évaluer ce contrôle.",
          "Si vous vendez des produits et réalisez des soins, distinguez la vente, la consommation en cabine et les mouvements de stock. Faites valider les conventions de suivi et les documents utiles par votre comptable. N’assimilez pas un indicateur opérationnel à un résultat comptable définitif.",
        ],
        image: cash,
      },
      {
        title: "Choisir les informations à reprendre",
        paragraphs: [
          "Une migration réussie ne consiste pas à importer tout ce qui existe. Identifiez les rendez-vous futurs, les coordonnées utiles et les droits ou soldes à conserver. Faites confirmer les formats possibles et vérifiez un échantillon varié avant une reprise complète, notamment les noms accentués, les numéros incomplets et les dossiers en doublon.",
          "Ne transférez pas vos données dans plusieurs essais pour faciliter la comparaison. Les scénarios fictifs suffisent à évaluer la plupart des fonctions. Pour une migration réelle, définissez les accès, le canal de transfert et la conservation des copies temporaires avec les personnes autorisées.",
        ],
      },
      {
        title: "Organiser une mise en place progressive",
        paragraphs: [
          "Commencez par un périmètre que l’équipe peut répéter et contrôler. L’agenda et les fiches clientes peuvent être préparés avant une répétition de caisse, selon votre situation. Fixez une date à partir de laquelle chaque opération possède une seule source de référence et évitez le double suivi durable.",
          "Réservez un temps de retour après les premières journées. Notez les blocages par tâche, pas seulement par écran. Une difficulté de permission, une durée mal définie et une information de produit manquante ne se corrigent pas de la même façon ; le suivi doit conduire à une action claire.",
        ],
      },
      {
        title: "Ce qu’il faut faire confirmer pour le Maroc",
        paragraphs: [
          "Vérifiez la devise utilisée, les coordonnées, les horaires d’accompagnement, les modalités de paiement et les documents contractuels. Posez vos questions de disponibilité locale aux éditeurs concernés et faites examiner les obligations comptables ou juridiques de votre établissement séparément de la démonstration commerciale.",
          "Dans Rappel Beauty, les fonctions publiques présentées couvrent notamment agenda, clientes, caisse, stock, fidélité et réservation. Les rappels WhatsApp décrits sur le site sont assistés avec envoi humain. Faites confirmer vos besoins particuliers et vos intégrations avant de décider, au lieu de supposer qu’une fonction portant le même nom réalise exactement votre parcours.",
        ],
      },
    ],
    faqs: [
      {
        question: "Faut-il installer tous les modules dès le premier jour ?",
        answer:
          "Non. Préparez les parcours essentiels, vérifiez les données et formez l’équipe. Un déploiement progressif peut être préférable si chaque opération conserve une source officielle et si les étapes de transition sont suivies.",
      },
      {
        question: "Le logiciel remplace-t-il le comptable de l’institut ?",
        answer:
          "Non. Il peut fournir des opérations et des exports de gestion. Les obligations, méthodes et documents comptables doivent être vérifiés avec une personne compétente pour votre situation.",
      },
      {
        question: "Peut-on gérer tout l’institut depuis un téléphone ?",
        answer:
          "Testez les tâches sur votre appareil réel. Consulter un agenda et réaliser une clôture détaillée n’exigent pas le même confort ; vérifiez aussi la connexion et les périphériques avant d’abandonner un poste de travail.",
      },
    ],
    sources: [
      {
        href: "https://rappelbeauty.com/fonctionnalites/",
        label: "Rappel Beauty — périmètre public des fonctionnalités",
      },
      {
        href: "https://rappelbeauty.com/whatsapp/",
        label: "Rappel Beauty — fonctionnement du WhatsApp assisté",
      },
    ],
  },
  "prix-logiciel-institut-beaute-maroc": {
    sections: [
      {
        title: "Comparer un budget complet, pas seulement une mensualité",
        paragraphs: [
          "Un prix public répond à une configuration et à un périmètre. Avant de comparer deux logiciels, décrivez votre nombre de personnes, d’adresses et de canaux de réservation. Demandez les frais fixes et variables, ainsi que les services externes dont vous aurez besoin pour réaliser vos parcours.",
          "Séparez les dépenses de démarrage, les dépenses récurrentes et les dépenses liées à l’usage. Une reprise de données, un matériel ou un accompagnement complémentaire ne se répartissent pas de la même manière qu’un abonnement. Faites préciser les taxes et évitez de rapprocher des montants qui utilisent des conventions différentes.",
        ],
      },
      {
        title: "L’offre publique Rappel Beauty et son périmètre",
        paragraphs: [
          "Consultez la page Tarifs de Rappel Beauty pour connaître la formule, la période de facturation et l’essai proposés au moment de votre décision. Demandez confirmation des conditions applicables à votre établissement plutôt que de reprendre un montant cité dans une ancienne présentation ou une capture partagée.",
          "Un abonnement de gestion ne constitue pas nécessairement le prix d’une création de site sur mesure, d’un matériel de paiement ou de tout service complémentaire imaginable. Demandez une proposition distincte lorsque votre besoin dépasse le périmètre public. La possibilité d’utiliser un canal de communication ne signifie pas non plus qu’un volume illimité d’envois autonomes est inclus.",
        ],
      },
      {
        title: "Une grille de devis à remplir pour chaque solution",
        paragraphs: [],
        steps: [
          "Décrivez la même organisation et les mêmes besoins à chaque éditeur pour obtenir des propositions comparables.",
          "Listez abonnement, utilisateurs, établissements, matériel, messages, paiements, installation et accompagnement.",
          "Calculez un scénario d’usage courant puis un scénario de volume plus élevé en indiquant toutes les hypothèses.",
          "Relisez les conditions de renouvellement, de sortie et de récupération des données avant la signature.",
        ],
        table: {
          caption:
            "Modèle de comparaison : les cellules à confirmer ne sont pas des frais annoncés pour Rappel Beauty.",
          columns: ["Poste", "Question à poser", "Base de calcul"],
          rows: [
            [
              "Abonnement",
              "Quel périmètre et quelles limites ?",
              "Mensuel et total sur douze mois",
            ],
            [
              "Équipe et adresses",
              "Un coût dépend-il du nombre de personnes ou de sites ?",
              "Configuration réellement utilisée",
            ],
            [
              "Messages et paiement",
              "Quels services, prestataires et frais variables ?",
              "Volumes et transactions prévus",
            ],
            [
              "Démarrage et sortie",
              "Quelles prestations et quels exports ?",
              "Coûts ponctuels et conditions écrites",
            ],
          ],
        },
      },
      {
        title: "Exemple marocain fictif : construire deux scénarios",
        paragraphs: [
          "Un institut fictif de Rabat envisage un abonnement à 500 DH par mois et estime des frais variables hypothétiques à 100 DH par mois. Le scénario simplifié représente 7 200 DH sur douze mois, avant tout frais ponctuel. Ce sont des hypothèses de calcul, pas une offre commerciale ni une indication de prix pour les autres éditeurs.",
          "La responsable prépare un second scénario avec davantage de visites et vérifie quels postes augmenteraient réellement. Si certains frais dépendent des personnes réservables et d’autres des transactions, une simple multiplication du total par le volume serait incorrecte. Le devis doit fournir les règles nécessaires pour calculer chaque poste.",
        ],
      },
      {
        title: "Pourquoi ne pas convertir un tarif étranger en devis marocain",
        paragraphs: [
          "La page Fresha consultée présente une tarification liée à l’organisation de l’équipe et des rubriques de frais. La page Planity distingue plusieurs formules et invite à échanger avec un conseiller. Ces présentations aident à préparer les questions ; elles ne prouvent pas un prix contractuel applicable à un institut marocain.",
          "Vérifiez le pays, la devise, les services accessibles et le contrat proposé. Une conversion monétaire ne résout pas les différences de taxes, de périmètre et d’éligibilité. Les sources citées permettent de retrouver les informations de départ sans prétendre que les offres de 2027 sont déjà fixées.",
        ],
      },
      {
        title: "Relier le coût à une valeur observée",
        paragraphs: [
          "Pendant un essai, mesurez quelques tâches répétées : prise de rendez-vous, recherche d’une fiche, correction et préparation d’une clôture. Notez le temps et les erreurs réellement constatés. Un gain estimé peut aider à comparer, mais il ne doit pas être présenté comme une somme de bénéfices automatiquement encaissée.",
          "Le choix peut aussi viser une meilleure fiabilité et un suivi plus clair. Décrivez ces objectifs explicitement au lieu d’inventer un retour sur investissement chiffré. Faites examiner les engagements financiers importants et les questions de traitement comptable avec les professionnels qui accompagnent votre établissement.",
        ],
      },
    ],
    faqs: [
      {
        question: "Où retrouver le prix à jour de Rappel Beauty ?",
        answer:
          "La page Tarifs et la proposition remise à votre établissement sont les références à consulter. Ce guide ne fige pas de montant ni de durée d’essai ; vérifiez les conditions à la date de votre décision et les éventuels services complémentaires.",
      },
      {
        question: "Une formule annuelle est-elle forcément préférable ?",
        answer:
          "Comparez le total, le calendrier de paiement et les conditions de sortie. Une économie affichée ne remplace pas l’analyse de votre trésorerie ni de vos besoins sur la période.",
      },
      {
        question: "Les comparatifs incluent-ils les prix futurs de 2027 ?",
        answer:
          "Non. Les sources ont été consultées en novembre 2026. Demandez un devis actualisé au moment de votre choix et ne traitez pas une projection comme un engagement de l’éditeur.",
      },
    ],
    sources: productSources,
  },
  "choisir-logiciel-institut-beaute": {
    sections: [
      {
        title: "Écrire un cahier de besoins qui permet réellement de décider",
        paragraphs: [
          "Demandez à l’accueil, aux praticiennes et à la direction de citer les opérations qui leur font perdre du temps ou provoquent des erreurs. Reformulez chaque problème en action observable : déplacer un soin sans conflit, retrouver une information utile ou corriger un règlement avec une trace claire.",
          "Classez les besoins en indispensable maintenant, utile dans la prochaine étape et facultatif. Une longue liste de fonctions sans priorité peut conduire à payer pour des modules inutilisés. Définissez aussi vos contraintes de budget, de matériel et de formation afin que l’essai porte sur une organisation possible.",
        ],
      },
      scenarios,
      {
        title: "Comparer des propositions documentées",
        paragraphs: [
          "Demandez à chaque éditeur de préciser ce qui a été démontré, ce qui dépend d’une option et ce qui reste à confirmer. Rappelez votre configuration d’équipe et de ressources. Une solution peut répondre à la plupart des besoins tout en ayant une limite qui concerne précisément votre activité principale.",
          "Conservez les réponses écrites pour les points déterminants : accès par rôle, reprise de données, corrections financières et canaux de communication. Dans Rappel Beauty, le parcours WhatsApp actuellement décrit demande un envoi humain. Vérifiez de la même manière les automatismes annoncés par chaque solution plutôt que de comparer seulement leur intitulé commercial.",
        ],
      },
      {
        title: "Grille d’évaluation simple, sans faux classement de marché",
        paragraphs: [
          "Vous pouvez attribuer à chaque scénario un état : confirmé pendant l’essai, confirmé sous condition ou non confirmé. Ajoutez une colonne de commentaire et la personne qui a testé. Cette grille décrit votre essai ; elle ne devient pas un classement indépendant de tous les logiciels disponibles.",
          "Exemple fictif à Fès : deux outils permettent de réserver un soin simple, mais seul l’un a été testé sur la machine partagée de l’établissement. La bonne prochaine étape est de vérifier ce scénario dans le second outil, pas de conclure qu’il ne sait pas le gérer parce qu’aucune démonstration n’a été faite.",
        ],
        table: {
          caption: "Exemple de grille à remplir pendant votre propre essai.",
          columns: ["Scénario", "Résultat attendu", "Preuve à conserver"],
          rows: [
            [
              "Conflit de cabine",
              "Un planning réellement réalisable",
              "Compte rendu du test et limites",
            ],
            [
              "Correction de règlement",
              "Une correction autorisée et traçable",
              "Étapes et rôle utilisé",
            ],
            [
              "Reprise de données",
              "Des champs exacts et exploitables",
              "Échantillon fictif et format",
            ],
            [
              "Fin d’abonnement",
              "Des modalités de sortie comprises",
              "Conditions et exemple d’export",
            ],
          ],
        },
      },
      {
        title: "Faire participer la personne qui utilisera l’outil",
        paragraphs: [
          "Une démonstration réalisée entièrement par un commercial peut donner une impression de facilité que l’équipe ne retrouve pas ensuite. Faites exécuter les tâches ordinaires par une personne de l’accueil, avec une courte explication initiale puis une tentative autonome. Notez les hésitations pour préparer la formation.",
          "Ne testez pas uniquement le chemin sans erreur. Une réservation incomplète, un changement de durée et un mauvais mode de paiement sont des situations ordinaires. La façon de les corriger compte autant que la vitesse de première saisie, surtout lors d’une journée chargée.",
        ],
      },
      {
        title: "Vérifier les données et les conditions avant la migration",
        paragraphs: [
          "Utilisez des personnes et opérations fictives pour comparer les fonctions. Pour une reprise réelle, faites confirmer les formats, le périmètre et les contrôles à effectuer. Une importation de dix contacts simples ne démontre pas la reprise des rendez-vous futurs, des soldes et des historiques particuliers.",
          "Examinez également les rôles, les exports et les modalités de retrait des accès. Faites vérifier les documents contractuels et les obligations de votre établissement par les personnes compétentes. Le choix d’un logiciel ne rend pas automatiquement conforme toute l’organisation de l’institut.",
        ],
      },
      {
        title: "Décider puis vérifier la mise en place",
        paragraphs: [
          "La décision doit récapituler les besoins couverts, les limites acceptées, les coûts et les points encore ouverts. Évitez de commencer la migration tant qu’un point indispensable reste seulement supposé. Une confirmation claire vaut mieux qu’un engagement vague de disponibilité future.",
          "Prévoyez enfin une personne référente, un calendrier de bascule et un bilan après les premières semaines. Le bon outil doit rester utilisable dans la durée ; la préparation de l’équipe, la qualité des données et le suivi des écarts font partie du choix autant que l’interface.",
        ],
      },
    ],
    faqs: [
      {
        question: "Combien de logiciels faut-il essayer ?",
        answer:
          "Sélectionnez un petit nombre de solutions correspondant à vos contraintes, puis testez les mêmes scénarios. Une comparaison approfondie de quelques propositions est plus utile qu’un grand tableau rempli d’hypothèses.",
      },
      {
        question: "Faut-il choisir celui qui possède le plus de fonctions ?",
        answer:
          "Non. Vérifiez les tâches indispensables, la facilité de correction et le coût complet. Une fonction rarement utilisée n’a pas la même valeur qu’un parcours fiable tous les jours.",
      },
      {
        question: "Que faire lorsqu’une fonction n’a pas été démontrée ?",
        answer:
          "Classez-la comme non confirmée et demandez un test ou une réponse écrite. L’absence de démonstration ne prouve ni sa présence ni son absence dans le produit.",
      },
    ],
    sources: [
      {
        href: "https://rappelbeauty.com/fonctionnalites/",
        label: "Rappel Beauty — fonctions à examiner pendant la démonstration",
      },
      {
        href: "https://rappelbeauty.com/tarifs/",
        label: "Rappel Beauty — offre publique et conditions à confirmer",
      },
    ],
  },
};
