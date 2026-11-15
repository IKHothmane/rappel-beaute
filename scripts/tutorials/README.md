# Vidéo Agenda

Le scénario utilise les composants de l’Agenda et du formulaire de rendez-vous avec des données fictives. Le mode tutoriel bloque les écritures, et les appels réseau sont simulés dans le navigateur. Aucun accès à la base de données n’est nécessaire.

Prérequis : dépendances de développement du projet, Google Chrome et FFmpeg avec libx264.

Depuis PowerShell, avec le chemin de votre FFmpeg :

```powershell
$env:TUTORIAL_FFMPEG_PATH = 'C:/chemin/ffmpeg.exe'
node scripts/tutorials/record-agenda.mjs
```

La sortie par défaut est `.tmp/tutorials/agenda-creer-rendez-vous.mp4` (1440 × 900, vidéo muette avec explications incrustées). Un JPEG et un fichier JSON des chapitres sont créés à côté. Un chemin de sortie personnalisé peut être fourni comme premier argument.

Les sources de la scène restent dans `scripts/tutorials/`. Les fichiers vidéo générés ne sont pas versionnés ni publiés automatiquement.

Outils : [Playwright](https://github.com/microsoft/playwright), [FFmpeg](https://github.com/FFmpeg/FFmpeg).

## Enregistrement d’un compte réel autorisé

`record-agenda-account.mjs` enregistre le site réel et crée **un rendez-vous** dans l’institut attendu. Il nécessite les variables `TUTORIAL_BASE_URL`, `TUTORIAL_EXPECTED_ORGANIZATION_ID`, `TUTORIAL_SESSION_PATH`, `TUTORIAL_PLAN_PATH`, `TUTORIAL_FFMPEG_PATH` et l’autorisation explicite `TUTORIAL_ALLOW_CREATE=1`. Le fichier de session Playwright et le plan de disponibilité doivent rester hors Git ; aucun mot de passe n’est stocké dans les sources.

Le plan décrit le service, la praticienne, la ressource, la date et le créneau libre. Un reçu `*-created.json` est écrit dès la création réussie ; sa présence bloque une nouvelle création lors d’une relance. Le résultat par défaut est `.tmp/tutorials/agenda-compte-test.mp4`.
