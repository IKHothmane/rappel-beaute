# Assistant public — contrat verrouillé

Ce document fixe le comportement avant le widget, l’orchestrateur et les workers. BullMQ n’est pas un moteur de traitement ici.

## Session

`widgetSession` identifie le widget, l’institut résolu côté serveur, le navigateur et la conversation. Elle ne porte pas de `customerId`.

Le parcours public n’utilise pas d’OTP, ni de session cliente, ni de code de vérification. Le visiteur donne son nom et son téléphone. Le serveur rattache ou crée la cliente dans l’institut de la session, au moment de la confirmation. Le modèle ne reçoit jamais un `customerId` à choisir.

Retrouver, déplacer ou annuler un rendez-vous déjà pris demande la référence remise à la confirmation et le téléphone de la réservation. Les deux doivent correspondre au même rendez-vous, dans l’institut de la session. Il n’y a pas de compte et pas d’OTP. Un téléphone seul ne liste pas les rendez-vous.

## Visiteur

Il peut consulter les services, les produits publics et les promotions, chercher des disponibilités, puis demander un nouveau rendez-vous.

## Confirmation

La proposition enregistre une `AssistantAction` en `PENDING_CONFIRMATION`. Elle ne crée pas le rendez-vous. Le bouton Confirmer rappelle le serveur, qui revérifie la session widget, l’institut, l’expiration, le créneau et la clé d’idempotence, puis crée la cliente et le rendez-vous dans la même transaction.

La clé d’idempotence est unique par institut. Un second clic renvoie le même résultat. Deux confirmations du même créneau : une seule écriture passe, l’autre reçoit le conflit d’agenda.

## Autorité

`organizationId`, `customerId`, les permissions et le statut vérifié sont construits par le serveur. `publicId` (`pub_…`) dit seulement quel widget est affiché. `Origin` n’authentifie personne : il est comparé à la liste des domaines du widget, puis une session courte est créée. La CSP `frame-ancestors` devra reprendre ces domaines, par institut.

Les textes du catalogue sont des données, pas des instructions. Un tool refusé par le contrat ne s’exécute pas, même si le modèle l’appelle.

## Ce qui n’est pas encore fait

Pas de fusion avec l’assistant déjà présent dans le tableau de bord (`AIConversation`). L’assistant institut actuel reste en place. Le parcours public de réservation n’envoie pas d’OTP. Les workers BullMQ ne sont pas branchés sur l’assistant.

## Orchestrateur

L’orchestrateur transforme une phrase du visiteur en appel d’outil. Il ne fixe ni l’institut, ni la cliente, ni le créneau. Le contrat distingue trois effets.

Les lectures sont `GET_SERVICES`, `GET_PRODUCTS`, `GET_PROMOTIONS`, `GET_AVAILABILITY` et `FIND_APPOINTMENT`. Les propositions sont `PROPOSE_APPOINTMENT`, `PROPOSE_RESCHEDULE` et `PROPOSE_CANCEL`. Les mutations sont `CONFIRM_APPOINTMENT`, `CONFIRM_RESCHEDULE` et `CONFIRM_CANCEL`.

Chaque outil a des paramètres fermés. `organizationId`, `customerId`, `staffId`, `appointmentId` et le prix ne font pas partie de ces paramètres : un appel qui les contient est refusé. `FIND_APPOINTMENT` exige la référence et le téléphone ensemble. Un téléphone seul ne lance pas la recherche.

Le modèle peut demander une lecture ou une proposition. Il ne peut pas appeler une confirmation. Le serveur n’ouvre `CONFIRM_*` que si le visiteur répond explicitement, et seulement pour l’action en attente de sa session. Un « oui » isolé confirme. Une nouvelle demande ne confirme pas. Le flux reste synchrone : BullMQ n’entre pas dans cette conversation.

Les files BullMQ `emails`, `notifications`, `reminders` et `reports` restent de la surveillance. Elles ne partent pas de l’assistant.

La rétention des conversations est un champ vide (`conversationRetentionDays`). Aucune durée légale n’est affirmée. La loi 09-08 / CNDP devra être vérifiée sur le traitement réellement mis en production : données collectées, finalité, durée, sous-traitants, droits des personnes, suppression des conversations.

## Langues et quotas

Le widget prévoit le français, l’arabe, la darija et l’anglais, avec LTR et RTL. La langue n’est pas imposée seulement par un sélecteur.

Chaque institut a un quota mensuel, par défaut 2 000 messages, alerte à 80 %, blocage à 100 %, dépassement désactivé.
