import type { BlogContent, BlogSection } from "../types";

const source = (id: string, label: string) => ({
  href: `https://support.google.com/business/answer/${id}?hl=fr`,
  label: `Google — ${label}`,
});
export const LOCAL_SOURCES = {
  ranking: source("7091", "facteurs du classement local"),
  identity: source("3038177", "représentation de votre établissement"),
  category: source("7249669", "catégorie d’activité"),
  validation: source("7107242", "validation de l’établissement"),
  video: source("14271705", "validation par vidéo"),
  photos: source("6103862", "photos et vidéos"),
  reviews: source("3474122", "demandes d’avis"),
  responses: source("4596773", "signalement d’avis inappropriés"),
  booking: source("6218037", "liens d’action et de réservation"),
  bookingRules: source("13769188", "conditions des liens d’action"),
  providers: source("7475773", "réservation avec un fournisseur"),
  performance: source("9918094", "mesure des performances"),
};
function guide(
  slug: string,
  title: string,
  answer: string,
  sections: BlogSection[],
  faqs: BlogContent["faqs"],
  sources: BlogContent["sources"],
): BlogContent {
  return {
    slug,
    title,
    answer,
    description: `${answer.slice(0, 152).replace(/\s+\S*$/, "")}…`,
    category: "seo-local",
    sections,
    faqs,
    sources,
    links: [
      {
        href: "/reservation-en-ligne/",
        label: "Préparer le parcours de réservation de votre institut",
      },
      { href: "/creation-site-web/", label: "Créer une page web adaptée à votre établissement" },
    ],
  };
}

/** Conseils de méthode, sources consultées le 13/11/2026 ; aucun audit d’une fiche réelle. */
export const LOCAL_SEO_CONTENT: BlogContent[] = [
  guide(
    "optimiser-fiche-google-business-profile-institut-beaute",
    "Comment optimiser la fiche Google Business Profile de votre institut au Maroc ?",
    "Commencez par une fiche exacte, sous votre contrôle, puis améliorez le parcours vers le contact ou la réservation. Pour un institut marocain, l’adresse réellement visitable, les horaires et la clarté des prestations comptent davantage qu’une accumulation de mots-clés.",
    [
      {
        title: "Faire l’état des lieux avant de modifier la fiche",
        paragraphs: [
          "Recherchez le nom de l’institut avec sa ville, puis vérifiez que la fiche trouvée correspond à la bonne adresse. Notez son lien, les comptes qui y ont accès et les informations actuellement visibles. Une capture datée sert de référence ; elle ne constitue pas une preuve de position stable dans Google Maps.",
          "Comparez ensuite la fiche avec votre enseigne, votre site et les consignes de l’accueil. Relevez les contradictions concrètes : ancienne adresse, téléphone qui ne répond plus, fermeture non indiquée ou lien menant à un autre établissement. Corrigez d’abord ce qui empêche une cliente de vous joindre ou de vous trouver.",
        ],
      },
      {
        title: "Une méthode de travail en quatre étapes",
        paragraphs: [],
        steps: [
          "Confirmez la propriété et les accès de l’établissement avant de confier des modifications à un prestataire.",
          "Contrôlez le nom réel, l’emplacement, la catégorie proposée dans l’interface et les horaires applicables à cette adresse.",
          "Présentez les services et ajoutez des photos fidèles, puis testez le site et le lien de réservation sur téléphone.",
          "Consignez les modifications et vérifiez leur affichage public avant de passer à la prochaine amélioration.",
        ],
      },
      {
        title: "Exemple fictif à Casablanca : résoudre les obstacles à la visite",
        paragraphs: [
          "Un institut fictif de quartier reçoit des appels de clientes qui ne trouvent pas l’entrée. Avant de réécrire sa description, la responsable vérifie le repère cartographique, précise l’accès sur son site et choisit une photo récente de la façade. Elle ne crée pas une seconde adresse pour apparaître dans un quartier voisin.",
          "L’équipe constate aussi que le site ouvre sur une page générale avec plusieurs activités. Elle prépare une page propre à cette adresse, où l’on retrouve les soins, les horaires et une réservation compatible avec son agenda. L’amélioration recherchée est un parcours plus clair ; aucune hausse de classement n’est déduite de cet exemple.",
        ],
      },
      {
        title: "Ce que vous maîtrisez et ce que vous ne maîtrisez pas",
        paragraphs: [
          "Google indique que les résultats locaux dépendent notamment de la pertinence, de la distance et de la notoriété. Vous pouvez rendre votre présentation plus fidèle et plus utile ; vous ne pouvez pas décider de la position géographique de chaque personne qui recherche un soin, ni acheter une meilleure place dans les résultats naturels.",
          "Évitez donc les engagements du type première position partout au Maroc. Demandez plutôt à votre prestataire une liste de corrections documentées, un suivi des actions utiles et une méthode de comparaison. Une variation sur un téléphone ne suffit pas pour établir une progression durable dans toute une ville.",
        ],
      },
      {
        title: "Suivre les demandes utiles après les corrections",
        paragraphs: [
          "Choisissez une période de référence et quelques indicateurs : appels, clics vers le site et demandes effectivement reçues, selon les informations disponibles. Notez les campagnes et changements d’horaires qui peuvent modifier la demande. Une hausse des interactions n’est pas automatiquement une hausse des rendez-vous réalisés.",
          "Lors d’un bilan, reliez chaque problème à une action : corriger une erreur d’accès, clarifier une prestation ou raccourcir le chemin de réservation. Conservez les responsabilités de mise à jour dans l’équipe pour que la fiche ne redevienne pas incohérente à la prochaine fermeture exceptionnelle.",
        ],
      },
    ],
    [
      {
        question: "Faut-il écrire toutes les villes dans le nom de la fiche ?",
        answer:
          "Non. Le nom doit représenter l’établissement réel. Décrivez vos services et votre implantation dans les espaces adaptés, sans transformer le nom en liste de villes ou de prestations.",
      },
      {
        question: "Rappel Beauty optimise-t-il automatiquement ma fiche Google ?",
        answer:
          "Ce guide ne promet pas une modification automatique de votre fiche. Rappel Beauty peut faire partie de votre parcours de gestion et de réservation ; les accès, options Google et intégrations disponibles doivent être vérifiés séparément.",
      },
    ],
    [LOCAL_SOURCES.identity, LOCAL_SOURCES.ranking],
  ),

  guide(
    "creer-valider-fiche-google-institut-maroc",
    "Comment créer ou revendiquer puis valider la fiche Google d’un institut ?",
    "Vérifiez d’abord si votre institut possède déjà une fiche. Revendiquez l’établissement existant lorsque c’est le bon, puis suivez la méthode de validation proposée par Google. La création d’un doublon ne résout pas un problème d’accès.",
    [
      {
        title: "Préparer une identité cohérente et un compte maîtrisé",
        paragraphs: [
          "Rassemblez le nom utilisé sur place, l’adresse exacte, le contact professionnel et le site de l’établissement. Vérifiez ces éléments avec la personne responsable de l’accueil. Si l’institut vient d’ouvrir ou de déménager, distinguez ce qui est déjà accessible au public de ce qui reste en préparation.",
          "Choisissez un compte dont l’entreprise pourra conserver le contrôle. Gardez une trace interne des personnes autorisées et du contact de récupération. Le départ d’un prestataire ou d’une salariée ne devrait pas vous obliger à recréer la fiche pour reprendre votre présence locale.",
        ],
      },
      {
        title: "Procéder sans créer de doublon",
        paragraphs: [],
        steps: [
          "Recherchez le nom, les anciennes variantes et l’adresse avant d’ajouter un établissement.",
          "Vérifiez que la fiche correspond bien à votre activité et à votre emplacement avant de demander l’accès.",
          "Suivez la validation affichée dans votre compte ; ne supposez pas qu’une méthode précise sera toujours disponible.",
          "Contrôlez les informations publiques après validation et consignez les accès accordés à l’équipe.",
        ],
      },
      {
        title: "Si une vidéo est demandée",
        paragraphs: [
          "Préparez le parcours de démonstration avant de commencer. La documentation Google décrit les preuves de localisation, d’existence et de gestion à montrer selon le type d’activité. Suivez les consignes visibles dans votre compte et l’aide officielle, sans utiliser une vidéo publicitaire comme remplacement de cette vérification.",
          "Pour un institut fictif à Rabat, la responsable prépare un moment où l’enseigne et l’accès peuvent être montrés sans filmer de cliente. Elle évite de cadrer un agenda nominatif, un document d’identité ou un écran financier. Il s’agit d’une organisation proposée, pas d’une garantie d’acceptation du dossier.",
        ],
      },
      {
        title: "Traiter un refus ou un accès déjà détenu",
        paragraphs: [
          "Si une autre personne gère déjà la bonne fiche, commencez par identifier le propriétaire et la procédure de demande d’accès. Une fiche supplémentaire peut fragmenter les informations et compliquer le suivi. Gardez les échanges et les références utiles à une éventuelle demande d’assistance.",
          "En cas de nouvelle demande de validation, comparez précisément les éléments refusés ou incomplets avec les indications reçues. Ne changez pas simultanément le nom, l’adresse et plusieurs autres informations dans l’espoir de contourner le problème : documentez ce qui doit être corrigé et pourquoi.",
        ],
      },
      {
        title: "Organiser la fiche après sa validation",
        paragraphs: [
          "La validation ne termine pas le travail de préparation. Vérifiez les horaires, les liens et les personnes chargées des réponses. Créez une petite fiche interne qui indique qui peut modifier les informations et qui valide un changement important comme un déménagement ou un changement de nom.",
          "Planifiez un contrôle à la prochaine évolution de l’activité plutôt qu’une surveillance anxieuse de chaque recherche. L’objectif immédiat est une présence locale exacte, utilisable par les clientes et durablement maîtrisée par l’établissement, sans délai ni résultat de visibilité promis à l’avance.",
        ],
      },
    ],
    [
      {
        question: "Puis-je choisir librement la validation par téléphone ?",
        answer:
          "Non. Utilisez les méthodes proposées pour votre établissement dans votre compte Google. Les options et demandes complémentaires peuvent varier ; ne payez pas un tiers pour un code ou une validation prétendument garantie.",
      },
      {
        question: "Une activité uniquement en ligne peut-elle créer une fiche d’institut local ?",
        answer:
          "Vérifiez les conditions d’éligibilité officielles. Ce guide vise un institut qui reçoit réellement des clientes ; une présence virtuelle ne doit pas être présentée comme un établissement visitable.",
      },
    ],
    [LOCAL_SOURCES.validation, LOCAL_SOURCES.video],
  ),

  guide(
    "categorie-services-fiche-google-institut",
    "Quelle catégorie et quels services choisir sur la fiche Google de votre institut ?",
    "Choisissez dans l’interface Google la catégorie qui décrit le mieux l’activité principale réelle de l’établissement. Présentez ensuite les prestations de manière compréhensible, sans sélectionner des catégories uniquement pour couvrir davantage de recherches.",
    [
      {
        title: "Partir de ce que l’institut fait réellement",
        paragraphs: [
          "Relisez votre carte de prestations et identifiez l’activité autour de laquelle votre établissement est organisé. Une seule prestation occasionnelle ne décrit pas nécessairement tout l’institut. Faites cette analyse avec l’équipe pour éviter un choix guidé uniquement par le vocabulaire d’un prestataire de référencement.",
          "Google propose une liste de catégories ; leur libellé et les options accessibles doivent être vérifiés dans votre compte. Ne construisez pas votre plan autour d’une catégorie vue sur une capture ancienne ou sur une fiche d’un autre pays, et ne la remplacez pas par une expression libre inventée.",
        ],
      },
      {
        title: "Préparer le choix et contrôler les résultats",
        paragraphs: [],
        steps: [
          "Listez les activités réellement proposées à cette adresse, avec leur importance dans votre organisation.",
          "Recherchez les catégories disponibles et sélectionnez celle qui correspond le mieux à l’activité principale.",
          "Ajoutez des activités secondaires pertinentes seulement lorsqu’elles décrivent des services réellement assurés.",
          "Vérifiez que les descriptions et prestations du site restent cohérentes avec la fiche après modification.",
        ],
      },
      {
        title: "Exemple fictif : institut polyvalent ou spécialiste de l’onglerie",
        paragraphs: [
          "Deux établissements fictifs de Marrakech proposent tous deux une manucure. Le premier exerce surtout des soins variés en cabine ; le second organise son offre autour de l’onglerie. Une prestation commune ne suffit pas pour imposer la même catégorie principale aux deux établissements.",
          "Chaque responsable examine les catégories effectivement proposées dans l’interface et retient celle qui correspond à sa réalité. Elle conserve une description claire des services sur son propre site, avec durée, prix ou conditions. Ce travail aide la compréhension du parcours ; il ne mesure pas une position dans Google Maps.",
        ],
      },
      {
        title: "Rédiger des services utiles à la décision",
        paragraphs: [
          "Une personne qui découvre votre institut doit comprendre la différence entre deux prestations proches. Indiquez ce qui est inclus et évitez les intitulés qui supposent une connaissance interne du catalogue. Vérifiez les champs de services accessibles à votre catégorie au lieu de promettre le même affichage à tous les établissements.",
          "Faites correspondre les noms des prestations dans la fiche, le site et la réservation. Si les prix dépendent d’un diagnostic ou d’options, expliquez ce qui reste à confirmer. Une incohérence entre un prix d’appel et le parcours final peut provoquer des demandes inutiles ou une déception à l’arrivée.",
        ],
      },
      {
        title: "Contrôler les changements sans surinterpréter une variation",
        paragraphs: [
          "Notez le choix effectué et la raison de la modification pour pouvoir le réexaminer si l’offre évolue. N’alternez pas les catégories chaque semaine en fonction d’un seul résultat de recherche : vous risquez de perdre la cohérence de présentation sans apprendre ce qui aide réellement vos clientes.",
          "Après une mise à jour, vérifiez d’abord les informations et les questions reçues. Si des personnes demandent régulièrement un service que vous ne réalisez pas, cherchez l’origine de l’ambiguïté dans votre présentation. Un vocabulaire plus précis peut être utile même sans changement mesurable du volume de recherches.",
        ],
      },
    ],
    [
      {
        question: "Faut-il reprendre toutes les catégories d’un concurrent ?",
        answer:
          "Non. Une fiche concurrente n’établit ni vos activités ni leur éligibilité. Utilisez la liste proposée par Google et vos prestations réelles pour décider, puis contrôlez votre propre présentation.",
      },
      {
        question: "Puis-je créer une catégorie avec le nom de mon soin signature ?",
        answer:
          "Google indique que l’on ne crée pas sa propre catégorie. Utilisez un espace de service ou une page de prestation adapté pour décrire votre soin, selon les options disponibles.",
      },
    ],
    [LOCAL_SOURCES.category],
  ),

  guide(
    "adresse-horaires-google-maps-institut",
    "Comment fiabiliser l’adresse et les horaires de votre institut sur Google Maps ?",
    "Une bonne fiche locale doit permettre d’arriver à la bonne entrée au bon moment. Contrôlez l’emplacement, les coordonnées et les horaires, puis préparez la procédure de mise à jour pour les fermetures exceptionnelles.",
    [
      {
        title: "Comparer l’information publiée à la visite réelle",
        paragraphs: [
          "Consultez votre fiche comme une nouvelle cliente, sans utiliser les raccourcis de votre compte de gestion. Relevez l’adresse affichée, le numéro qui s’ouvre lors d’un appel et l’itinéraire proposé. Vérifiez aussi les informations reprises dans votre site et vos messages de confirmation.",
          "Demandez à une personne qui ne connaît pas les lieux de décrire l’accès à partir de ces informations. Une entrée dans une galerie, un étage ou une porte différente de la façade principale peut nécessiter des explications sur la page de contact, sans déformer l’adresse réelle de l’établissement.",
        ],
      },
      {
        title: "Installer une routine de contrôle",
        paragraphs: [],
        steps: [
          "Vérifiez le repère cartographique et l’accès depuis un téléphone en déplacement.",
          "Comparez les jours et heures annoncés avec l’accueil réellement assuré sur place.",
          "Préparez les horaires exceptionnels et corrigez les autres supports concernés avant une fermeture.",
          "Attribuez une personne responsable et contrôlez l’affichage public après chaque changement.",
        ],
      },
      {
        title: "Cas pratique fictif à Tanger",
        paragraphs: [
          "Un institut fictif est situé au premier étage d’un immeuble dont l’entrée se trouve sur une rue latérale. La responsable vérifie que le repère correspond à l’accès réel et ajoute sur son site une indication de porte et une photo autorisée. Elle ne publie pas une adresse voisine plus connue pour attirer davantage de recherches.",
          "Pour une fermeture ponctuelle, elle met à jour la fiche et les créneaux disponibles dans son agenda. L’accueil vérifie aussi les rendez-vous déjà pris. Modifier un horaire public n’annule pas automatiquement une réservation : il faut traiter séparément les clientes concernées et confirmer leur nouveau créneau.",
        ],
      },
      {
        title: "Distinguer heures d’ouverture et réservation",
        paragraphs: [
          "Des horaires publics décrivent la disponibilité de l’établissement, tandis qu’un agenda expose des capacités pour des prestations précises. Une cabine libre n’implique pas que toutes les professionnelles soient présentes. Votre parcours doit éviter qu’une personne interprète une heure d’ouverture comme la promesse d’un soin sans réservation.",
          "Si l’accueil est uniquement sur rendez-vous, préparez une formulation fidèle et vérifiez les options de représentation applicables à votre situation. N’indiquez pas ouvert en permanence pour compenser l’absence d’un créneau ; cette information serait peu utile à une personne qui souhaite réellement se déplacer.",
        ],
      },
      {
        title: "Mesurer la diminution des difficultés d’accès",
        paragraphs: [
          "Pendant quelques semaines, notez de manière anonyme les appels concernant l’entrée, les horaires ou le stationnement. Vous cherchez à savoir quelles informations manquent, pas à conserver l’identité de toutes les personnes qui se perdent. Une courte liste de motifs suffit à améliorer la page de contact.",
          "Si ces demandes diminuent après correction, présentez cela comme une observation sur votre accueil. Ne le transformez pas en preuve que Google a amélioré votre classement. La fiabilité des informations et la visibilité dans une zone de recherche sont deux questions à examiner séparément.",
        ],
      },
    ],
    [
      {
        question: "Dois-je créer une fiche pour chaque quartier où résident mes clientes ?",
        answer:
          "Non. Décrivez les établissements et situations réellement éligibles. Le lieu de résidence de votre clientèle ne crée pas une nouvelle adresse d’institut à déclarer sur Google Maps.",
      },
      {
        question: "Qui met à jour les fermetures exceptionnelles ?",
        answer:
          "Désignez une personne et un remplacement. Incluez aussi le site, les messages et l’agenda dans la procédure pour éviter des informations contradictoires.",
      },
    ],
    [LOCAL_SOURCES.identity],
  ),

  guide(
    "photos-fiche-google-institut-beaute",
    "Quelles photos publier sur la fiche Google d’un institut de beauté ?",
    "Choisissez des photos fidèles qui aident à reconnaître l’entrée, comprendre les espaces et préparer la visite. Une sélection cohérente et autorisée est plus utile qu’un grand nombre d’images génériques sans rapport avec votre institut.",
    [
      {
        title: "Préparer un parcours visuel pour une nouvelle cliente",
        paragraphs: [
          "Commencez par les questions pratiques : à quoi ressemble l’entrée, où se trouve l’accueil et quel environnement attend la cliente ? Préparez une courte liste de vues réellement utiles. Une photographie d’espace donne une information différente d’une composition de produits ou d’un portrait d’équipe.",
          "Faites la séance lorsque les locaux sont prêts et que vous pouvez contrôler le cadre. Retirez les feuilles de rendez-vous, écrans nominatifs et objets qui révèlent des informations personnelles. L’autorisation du photographe et celle des personnes reconnaissables doivent être examinées avant toute publication.",
        ],
      },
      {
        title: "Construire une petite sélection contrôlée",
        paragraphs: [],
        steps: [
          "Photographiez l’entrée et les espaces représentatifs dans une lumière fidèle à la visite.",
          "Contrôlez les droits, les personnes visibles et les informations présentes à l’arrière-plan.",
          "Vérifiez les exigences actuelles de format et de qualité dans l’aide Google avant le dépôt.",
          "Consultez l’affichage public et prévoyez une mise à jour après un changement des lieux.",
        ],
      },
      {
        title: "Exemple fictif à Agadir : montrer l’accès plutôt qu’un décor idéal",
        paragraphs: [
          "Un institut fictif dispose d’une entrée discrète près d’un commerce connu. L’équipe choisit une vue de rue reconnaissable, puis une image de l’accueil et d’une cabine préparée. Elle complète sur le site les indications d’accès qui seraient difficiles à comprendre dans une photo seule.",
          "La responsable écarte un rendu de décoration conçu pour un futur aménagement : il ne décrit pas les locaux actuels. Si une illustration est utilisée sur un autre support, sa nature doit rester explicite. Les clientes doivent pouvoir retrouver sur place l’environnement qu’on leur a présenté.",
        ],
      },
      {
        title: "Garder la réalité visible",
        paragraphs: [
          "La documentation Google demande des images représentatives et décrit les contraintes techniques à vérifier au moment de publier. Évitez les filtres lourds et les recadrages qui cachent une information essentielle, comme l’emplacement de l’entrée. Un visuel très attractif n’est pas forcément celui qui réduit le plus les hésitations.",
          "Ne publiez pas systématiquement des clientes pendant un soin pour donner une impression d’activité. Vous pouvez documenter les lieux et les équipements sans exposer les personnes. Pour un avant-après ou une image de soin, faites vérifier les autorisations et la manière dont les résultats sont présentés.",
        ],
      },
      {
        title: "Évaluer l’utilité de la sélection",
        paragraphs: [
          "Demandez à quelques personnes qui découvrent l’institut quelles questions restent ouvertes après consultation. Vous pouvez constater qu’une photo de façade manque ou que les images montrent surtout une seule cabine. Ces retours concrets guident les prochaines prises de vue sans dépendre d’une promesse de classement.",
          "Conservez les originaux, la provenance et la date de prise de vue dans un dossier organisé. Lors d’un réaménagement, remplacez les images devenues trompeuses sur les supports que vous maîtrisez. Le nombre de photos n’est pas une mesure suffisante de leur exactitude ou de leur utilité.",
        ],
      },
    ],
    [
      {
        question: "Peut-on utiliser des photos de banque d’images pour représenter l’institut ?",
        answer:
          "Elles ne doivent pas faire croire qu’elles montrent vos locaux ou une expérience réellement photographiée chez vous. Pour la fiche locale, privilégiez des vues fidèles de l’établissement et vérifiez les règles de Google.",
      },
      {
        question: "La photo de couverture sera-t-elle toujours celle affichée ?",
        answer:
          "Ne construisez pas votre communication autour d’un affichage garanti. Vérifiez les options proposées par Google et l’apparence publique ; l’institut ne maîtrise pas tous les choix de présentation.",
      },
    ],
    [LOCAL_SOURCES.photos],
  ),
  guide(
    "lien-qr-code-avis-google-institut",
    "Comment utiliser un lien ou un QR code pour demander des avis Google ?",
    "Créez une demande simple à partir du lien d’avis de la bonne fiche, puis testez-la sur téléphone. La cliente doit pouvoir partager librement une expérience réelle ; ni la note ni la rédaction ne doivent être imposées.",
    [
      {
        title: "Définir la demande et son moment",
        paragraphs: [
          "Une invitation après une visite terminée est plus cohérente qu’une demande avant le soin. Choisissez un moment qui ne gêne pas la cliente et une formulation compréhensible. Le dispositif doit rester une possibilité de retour, pas une étape obligatoire au comptoir ou une condition d’accès à un avantage.",
          "L’équipe doit savoir quelle fiche reçoit l’avis, surtout lorsque plusieurs adresses existent. Un QR code ancien peut pointer vers une mauvaise adresse ou un intermédiaire devenu inutile. Vérifiez le lien cible avant d’imprimer une série de supports ou de l’ajouter aux messages de fin de visite.",
        ],
      },
      {
        title: "Mettre en place le support en quatre contrôles",
        paragraphs: [],
        steps: [
          "Récupérez le lien ou le QR code proposé pour demander un avis sur votre établissement.",
          "Ouvrez-le sur plusieurs téléphones et vérifiez le nom ainsi que l’adresse de la fiche.",
          "Rédigez une invitation neutre et ajoutez une solution de contact pour les questions sur la visite.",
          "Contrôlez le support après un changement de fiche ou d’adresse et expliquez la démarche à l’équipe.",
        ],
      },
      {
        title: "Une formulation utilisable dans un institut marocain",
        paragraphs: [
          "Exemple de texte à adapter, sans promesse de résultat : merci de votre visite chez [nom réel de l’institut]. Si vous le souhaitez, vous pouvez partager votre expérience sur notre fiche Google avec ce lien. Pour toute question sur votre visite, notre équipe reste joignable au [contact professionnel].",
          "Dans un établissement fictif de Casablanca, l’invitation peut être expliquée oralement dans la langue comprise par la cliente. L’accueil n’a pas à se connecter à son compte ni à choisir une note à sa place. Le support écrit conserve le nom réel de l’institut et laisse la personne décider si elle souhaite contribuer.",
        ],
      },
      {
        title: "Séparer fidélité commerciale et collecte d’avis",
        paragraphs: [
          "Google interdit les contributions obtenues en échange d’avantages et la manipulation des avis. Ne conditionnez donc pas une remise, un cadeau ou un passage de fidélité à la publication d’un avis. Le programme de fidélité de l’institut doit pouvoir fonctionner indépendamment du fait de laisser ou non un commentaire.",
          "Évitez aussi un parcours qui ne conduit vers Google que les personnes ayant répondu qu’elles étaient satisfaites. Vous pouvez recueillir des retours privés pour améliorer le service, mais la demande d’avis ne doit pas devenir un mécanisme de sélection des seules opinions positives.",
        ],
      },
      {
        title: "Contrôler la qualité du processus",
        paragraphs: [
          "Suivez la disponibilité du support et les difficultés rencontrées : code illisible, mauvais nom de fiche ou message incompris. Vous n’avez pas besoin de conserver une liste nominative des personnes qui ont laissé un avis pour vérifier que le parcours fonctionne. Limitez le suivi à ce qui est utile à l’organisation.",
          "Lorsqu’une cliente signale une difficulté de service, traitez-la séparément avec les faits nécessaires. N’exigez pas la suppression d’un commentaire comme préalable à une réponse. Le but est d’améliorer l’expérience et de recueillir des avis authentiques, pas de fabriquer une note cible.",
        ],
      },
    ],
    [
      {
        question:
          "Peut-on offrir une réduction pour n’importe quel avis, même sans demander cinq étoiles ?",
        answer:
          "Non. La politique Google vise les avantages offerts en échange de contributions, pas uniquement les demandes de cinq étoiles. Gardez vos récompenses de fidélité séparées de la collecte d’avis.",
      },
      {
        question: "Faut-il prendre le téléphone de la cliente pour écrire son avis ?",
        answer:
          "Non. Expliquez le parcours si elle le demande, puis laissez-la se connecter et rédiger librement. Ne préparez pas un texte qu’elle serait invitée à publier comme sa propre expérience.",
      },
    ],
    [
      LOCAL_SOURCES.reviews,
      {
        href: "https://support.google.com/contributionpolicy/answer/7400114?hl=fr",
        label: "Google — contributions et engagement artificiel",
      },
    ],
  ),

  guide(
    "repondre-avis-negatif-google-institut",
    "Comment répondre à un avis Google négatif sur votre institut ?",
    "Lisez les faits, préparez une réponse calme et proposez un échange privé lorsque le dossier doit être vérifié. Une réponse publique ne doit ni révéler des informations clientes ni transformer un désaccord en conflit visible.",
    [
      {
        title: "Classer la situation avant de répondre",
        paragraphs: [
          "Distinguez une critique sur l’accueil, un problème d’horaire, une incompréhension de tarif et une situation portant sur la prestation. Vérifiez ce qui peut être confirmé sans chercher à identifier publiquement la personne. La réponse doit rester proportionnée à ce que vous savez réellement, y compris si vous ne retrouvez pas immédiatement la visite.",
          "Préparez un responsable de réponse et un contact utile pour la suite. Lorsque plusieurs membres de l’équipe interviennent, une procédure évite des versions contradictoires. Les cas sensibles doivent être examinés par la personne compétente ; un texte automatique n’est pas une analyse du dossier ni un conseil professionnel personnalisé.",
        ],
      },
      {
        title: "Construire une réponse en quatre temps",
        paragraphs: [],
        steps: [
          "Remerciez la personne d’avoir signalé une difficulté sans approuver des faits encore non vérifiés.",
          "Reconnaissez l’importance du sujet évoqué et restez factuel sur ce qui peut être expliqué publiquement.",
          "Proposez un canal privé avec un interlocuteur et un suivi réalistes.",
          "Après traitement, examinez la procédure interne qui pourrait éviter la répétition du problème.",
        ],
      },
      {
        title: "Exemple de réponse et traitement interne",
        paragraphs: [
          "Exemple fictif pour un avis concernant une attente : merci pour votre retour. Nous sommes attentifs à la ponctualité de l’accueil et souhaitons comprendre ce qui s’est passé. Vous pouvez contacter notre responsable au [contact professionnel] afin que nous vérifiions votre demande et puissions vous répondre précisément.",
          "À l’intérieur de l’institut, le responsable consulte les informations nécessaires et vérifie la chronologie. Si plusieurs avis mentionnent le même retard, il peut revoir les transitions entre deux soins. Cette amélioration opérationnelle n’exige pas de publier l’horaire exact ni le détail de la prestation de la personne concernée.",
        ],
      },
      {
        title: "Quand envisager un signalement à Google",
        paragraphs: [
          "Un désaccord ou une note faible ne suffisent pas à justifier la suppression d’un avis. Google prévoit un signalement pour les contenus qui enfreignent ses règles. Examinez le motif disponible et les éléments pertinents avant d’utiliser ce parcours, sans promettre à l’équipe qu’un commentaire sera retiré.",
          "Conservez une trace limitée du problème et de la demande effectuée. Évitez les campagnes de signalements coordonnées ou les réponses accusant publiquement un concurrent sans preuve. Lorsqu’un avis constitue une menace ou concerne une situation juridique particulière, demandez un avis compétent plutôt que d’improviser une réplique publique.",
        ],
      },
      {
        title: "Préserver la confiance des prochaines lectrices",
        paragraphs: [
          "Une réponse est aussi lue par des personnes qui découvrent l’établissement. Elles doivent pouvoir constater une attitude professionnelle sans accéder au dossier d’une autre cliente. Relisez le texte en vous demandant s’il resterait acceptable affiché à l’entrée de l’institut.",
          "Ne mesurez pas la qualité du traitement au seul retrait éventuel de l’avis. Suivez la prise en charge et les améliorations décidées. L’absence de nouvelle réponse publique ne prouve ni la résolution ni l’absence du problème ; utilisez les informations obtenues dans le canal privé pour le suivi utile.",
        ],
      },
    ],
    [
      {
        question: "Peut-on publier le rendez-vous pour prouver qu’une cliente a tort ?",
        answer:
          "Non. Une réponse publique doit préserver la confidentialité. Expliquez votre volonté de vérifier la situation et poursuivez l’échange dans un canal adapté, sans dévoiler le dossier ou des coordonnées.",
      },
      {
        question: "Faut-il offrir un geste commercial contre la suppression de l’avis ?",
        answer:
          "Ne conditionnez pas une résolution ou un avantage à la suppression d’un avis. Examinez la demande sur ses faits et respectez séparément les règles de contribution de Google.",
      },
    ],
    [LOCAL_SOURCES.responses],
  ),

  guide(
    "ajouter-lien-reservation-fiche-google-institut",
    "Comment ajouter un lien de réservation à la fiche Google de votre institut ?",
    "Préparez une page de réservation propre à votre établissement et vérifiez les options proposées dans sa fiche Google. Un lien vers cette page et une intégration native avec un fournisseur de réservation sont deux parcours distincts, dont la disponibilité doit être confirmée.",
    [
      {
        title: "Choisir une page d’arrivée qui accomplit l’action annoncée",
        paragraphs: [
          "Avant d’ouvrir les réglages Google, testez la page cible depuis un téléphone sans votre session d’administration. La personne doit reconnaître l’institut, choisir une prestation et comprendre comment sa demande sera confirmée. Une page de présentation générale peut être utile au site, mais elle ne remplace pas forcément un parcours de réservation.",
          "Pour plusieurs adresses, sélectionnez la page du bon établissement. Contrôlez le nom, l’adresse et les horaires qui s’y affichent. Un lien qui oblige à choisir à nouveau une ville ou mène vers une autre succursale crée un risque d’erreur au moment où la cliente pense avoir déjà choisi son lieu de visite.",
        ],
      },
      {
        title: "Tester avant et après l’ajout du lien",
        paragraphs: [],
        steps: [
          "Vérifiez que la fiche est sous votre contrôle et que le type de lien est disponible pour votre établissement.",
          "Préparez une URL directe dédiée à la réservation et vérifiez sa conformité aux règles Google.",
          "Ajoutez le lien dans le parcours de gestion proposé et choisissez le lien préféré si l’option s’applique.",
          "Consultez l’affichage public puis réalisez un test maîtrisé de réservation, de correction et de confirmation.",
        ],
      },
      {
        title: "Lien externe et Réserver avec Google : ce qu’il faut vérifier",
        paragraphs: [
          "Un lien externe conduit vers votre outil ou votre site. Le dispositif de réservation avec un fournisseur compatible Google peut présenter un parcours différent. La documentation officielle précise que les fournisseurs disponibles et certaines fonctions dépendent du pays et de l’éligibilité : ne promettez pas une option sur la seule base d’une capture étrangère.",
          "Pour Rappel Beauty, faites confirmer le lien public utilisable et le fonctionnement actuel de la réservation. Ce guide n’affirme pas l’existence d’un partenariat ou d’une intégration native Réserver avec Google. Il explique comment préparer un parcours externe et quelles questions poser avant d’annoncer une connexion plus poussée.",
        ],
      },
      {
        title: "Exemple fictif à Fès : du clic au rendez-vous",
        paragraphs: [
          "Un institut fictif de Fès rend certaines prestations réservables directement et propose un contact préalable pour les soins nécessitant un conseil. La page de destination distingue ces deux cas. Une personne ne doit pas recevoir une confirmation automatique pour un soin dont la durée et les conditions restent à définir.",
          "L’équipe teste un rendez-vous de démonstration sur un créneau réservé au contrôle, puis le retire proprement. Elle vérifie aussi ce qui se passe si la cabine devient indisponible. Le test doit prouver que le parcours aboutit dans l’agenda officiel ; il ne démontre pas une progression du référencement.",
        ],
      },
      {
        title: "Éviter les erreurs de destination et d’attribution",
        paragraphs: [
          "Les règles Google exigent que le lien d’action permette l’action prévue et décrivent les destinations non acceptées. Évitez un raccourcisseur ou une page de messages utilisée comme substitut à une réservation. Conservez un lien stable et vérifiez-le après un changement de domaine ou de prestataire.",
          "Pour comprendre les demandes reçues, vous pouvez distinguer le lien de la fiche dans votre mesure de trafic, en respectant les choix des visiteurs. Ne supposez pas que toutes les réservations externes seront comptées dans les performances Google comme les réservations d’un fournisseur intégré. Contrôlez les sources de chaque indicateur.",
        ],
      },
    ],
    [
      {
        question: "Un bouton WhatsApp équivaut-il à un lien de réservation Google ?",
        answer:
          "Non. Un échange par message et une réservation sont des actions différentes. Vérifiez les règles du type de lien choisi et proposez une page qui réalise réellement l’action annoncée.",
      },
      {
        question: "Le bouton de réservation est-il garanti pour tous les instituts marocains ?",
        answer:
          "Non. Vérifiez les options actuelles de la fiche, du pays et du fournisseur. Ne présentez pas un lien externe comme la preuve d’une intégration native avec Google.",
      },
    ],
    [LOCAL_SOURCES.booking, LOCAL_SOURCES.bookingRules, LOCAL_SOURCES.providers],
  ),

  guide(
    "mesurer-performance-fiche-google-institut",
    "Comment mesurer les résultats de votre fiche Google Business Profile ?",
    "Séparez la visibilité, les interactions et les rendez-vous réellement réalisés. Les performances de la fiche renseignent certaines actions sur Google ; elles ne constituent pas, à elles seules, un relevé complet des ventes ou de l’origine de chaque cliente.",
    [
      {
        title: "Définir les trois niveaux de suivi",
        paragraphs: [
          "La visibilité décrit l’exposition de la fiche. Les interactions décrivent les actions proposées et mesurées, par exemple un clic vers le site selon les données disponibles. Les rendez-vous réalisés viennent de votre organisation et de votre agenda. Ces niveaux peuvent évoluer différemment et ne doivent pas être additionnés comme des clientes distinctes.",
          "Consultez la définition des indicateurs affichés dans votre compte, puis choisissez ceux qui répondent à votre question. Un clic sur un bouton d’appel n’établit pas forcément qu’un échange a abouti ; une réservation prise ne prouve pas encore qu’une prestation a été réalisée et encaissée.",
        ],
      },
      {
        title: "Préparer un suivi mensuel cohérent",
        paragraphs: [],
        steps: [
          "Choisissez une période de référence et enregistrez les définitions des indicateurs effectivement disponibles.",
          "Notez les changements de fiche, campagnes, fermetures et variations importantes de capacité.",
          "Comparez les interactions avec les demandes reçues et les rendez-vous réalisés, sans fusion automatique de données personnelles.",
          "Décidez d’une action ciblée et vérifiez son effet sur une période comparable.",
        ],
      },
      {
        title: "Exemple chiffré fictif : interpréter un écart",
        paragraphs: [
          "Un institut fictif observe 80 clics vers son site pendant un mois et déclare 12 nouvelles clientes qui disent l’avoir découvert sur Google. On ne peut pas conclure que le taux de réservation est de 15 % : les deux ensembles ne représentent pas nécessairement les mêmes personnes ni les mêmes visites.",
          "Une cliente peut cliquer plusieurs fois, téléphoner puis réserver une semaine plus tard ; une autre peut découvrir l’adresse sur Maps et venir directement. Gardez ces limites visibles dans le bilan. Une question d’accueil facultative et une analyse agrégée peuvent aider, mais elles ne produisent pas une attribution parfaite.",
        ],
      },
      {
        title: "Diagnostiquer le parcours sans multiplier les objectifs",
        paragraphs: [
          "Si l’exposition progresse mais que les demandes restent stables, examinez les informations visibles et la page d’arrivée. Si les demandes augmentent sans rendez-vous réalisés, vérifiez les disponibilités, la rapidité de réponse et la clarté des prestations. Le problème n’est pas forcément la fiche elle-même.",
          "Choisissez une correction que l’équipe peut mettre en œuvre et comprendre. Par exemple, réduire les étapes avant la réservation ou corriger un contact obsolète. Notez la date pour pouvoir relire l’évolution sans présenter toute variation comme un résultat certain du changement effectué.",
        ],
      },
      {
        title: "Conserver un bilan exploitable et limité",
        paragraphs: [
          "Un tableau mensuel peut contenir période, indicateur, valeur, source et commentaire. Évitez d’y copier les noms et numéros des clientes si l’objectif est seulement de comprendre un volume global. Réservez les dossiers individuels au traitement des visites et demandes qui le nécessitent.",
          "Pour un rapport de prestataire, demandez les définitions, les périodes et les actions réalisées. Une capture de graphique sans contexte ne prouve ni un revenu supplémentaire ni un rang constant sur Google Maps. Le bilan doit permettre de décider ce qui sera amélioré le mois suivant.",
        ],
      },
    ],
    [
      {
        question: "Les statistiques sont-elles visibles pour toutes les fiches ?",
        answer:
          "Google réserve les performances aux fiches validées et aux comptes disposant de l’accès correspondant. Consultez l’aide pour comprendre les indicateurs présents dans votre situation.",
      },
      {
        question: "Peut-on calculer précisément le chiffre d’affaires provenant de Google ?",
        answer:
          "Seulement avec une méthode et des données adaptées, dont les limites sont explicites. Les clics ou vues de la fiche ne suffisent pas à attribuer automatiquement des encaissements.",
      },
    ],
    [LOCAL_SOURCES.performance],
  ),

  guide(
    "recherches-locales-google-maps-institut-maroc",
    "Comment travailler les recherches locales autour de votre institut au Maroc ?",
    "Partez des services réellement proposés et des quartiers depuis lesquels les clientes peuvent raisonnablement venir. Étudiez les résultats comme des observations localisées, puis améliorez les pages et informations utiles à ces parcours sans créer d’adresses fictives.",
    [
      {
        title: "Construire une courte liste de besoins locaux",
        paragraphs: [
          "Demandez à l’accueil quels soins les nouvelles clientes citent et quelles questions elles posent sur l’accès. Transformez ces besoins en quelques recherches plausibles, par exemple une prestation avec une ville ou un quartier. Ces propositions restent des hypothèses tant qu’aucune donnée de recherche n’a été recueillie.",
          "Un institut fictif de Casablanca peut explorer des formulations autour d’un soin et de son quartier réel. Cela ne justifie pas d’ajouter toutes les villes marocaines dans sa fiche ou de publier plusieurs pages identiques. L’intention est de comprendre un parcours de visite concret, pas de couvrir artificiellement toutes les combinaisons de mots.",
        ],
      },
      {
        title: "Observer avec une méthode reproductible",
        paragraphs: [],
        steps: [
          "Choisissez quelques recherches liées à des services réels et notez le point géographique d’observation.",
          "Consignez la date, l’appareil et le contexte de recherche, sans traiter la navigation privée comme une neutralité parfaite.",
          "Relevez les informations qui rendent les résultats utiles : localisation, offre, horaires et possibilité de réserver.",
          "Transformez les lacunes constatées sur vos propres supports en améliorations précises et vérifiables.",
        ],
      },
      {
        title: "Comprendre les différences entre quartiers",
        paragraphs: [
          "Google indique que la distance fait partie des facteurs de classement local. Un résultat observé devant l’institut peut donc différer d’un résultat observé à plusieurs kilomètres. Une seule recherche ne suffit pas pour annoncer une position dans toute une ville ni une progression générale de visibilité.",
          "Si vous commandez une mesure géolocalisée à un prestataire, demandez les points étudiés, les requêtes et les limites du relevé. Les résultats absents ou les erreurs de collecte doivent être distingués. Ce guide ne contient aucune grille de positions mesurée pour un institut réel et ne revendique pas de volume local vérifié.",
        ],
      },
      {
        title: "Relier les recherches aux bonnes pages du site",
        paragraphs: [
          "Une page de prestation doit expliquer le soin, sa durée et la façon de réserver. Une page d’accès doit aider à trouver l’entrée et comprendre les horaires. Les deux peuvent répondre à un parcours local sans répéter les mêmes mots de quartier dans chaque titre et chaque paragraphe.",
          "Pour deux établissements réellement distincts, préparez des informations propres à chaque adresse. Pour un seul institut, ne fabriquez pas dix pages dont seul le nom de ville change. Vous pouvez mentionner les trajets ou repères utiles lorsque ces informations sont exactes et apportent une aide concrète aux personnes qui envisagent de venir.",
        ],
      },
      {
        title: "Faire un bilan qui débouche sur une décision",
        paragraphs: [
          "Classez les améliorations selon les obstacles à la visite : fiche incorrecte, page incomplète, réservation difficile ou manque de disponibilités. Le bon ordre peut être de corriger l’adresse avant d’écrire un nouvel article. Une croissance d’audience sans possibilité d’accueil n’est pas toujours le meilleur objectif de l’établissement.",
          "Après quelques semaines, comparez les demandes utiles et les questions reçues. Conservez la distinction entre hypothèses de mots-clés, observations de résultats et visites effectivement réalisées. Cette discipline permet de préparer un plan local pour 2027 sans annoncer des classements futurs ni présenter une simulation comme un résultat client.",
        ],
      },
    ],
    [
      {
        question: "Une position vue sur mon téléphone est-elle celle de toutes les clientes ?",
        answer:
          "Non. Le contexte et la localisation influencent les résultats. Décrivez précisément les conditions du relevé et évitez de généraliser une observation à toute une ville.",
      },
      {
        question: "Faut-il payer pour une grille de positions avant de corriger sa fiche ?",
        answer:
          "Pas systématiquement. Commencez par les informations inexactes et les liens cassés. Une mesure géolocalisée répond ensuite à une question précise, avec un périmètre, un coût et des limites clairement définis.",
      },
    ],
    [LOCAL_SOURCES.ranking],
  ),
];
