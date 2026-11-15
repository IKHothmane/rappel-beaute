# Outils et agents de développement Rappel Beauty

Configuration du projet préparée le 14 novembre 2026 pour Codex, Cursor et Claude Code. Elle ne change ni les modèles choisis dans les applications, ni leurs permissions globales, ni les paramètres du service Railway.

## Ce qui est installé

### Dix rôles, disponibles dans les trois clients

| Rôle | Mission | Écrit dans le projet |
| --- | --- | --- |
| architect | Comprendre le parcours et cadrer une modification transversale | Non |
| frontend | React, formulaires, responsive et accessibilité | Oui |
| backend | API, validation, logique métier et transactions | Oui |
| database | PostgreSQL, Prisma, index et isolation des instituts | Oui, dans le périmètre autorisé |
| qa | Reproduction, Vitest et vérification navigateur | Oui |
| security | Revue des sessions, autorisations et données sensibles | Non |
| reviewer | Relecture indépendante du diff | Non |
| performance | Mesure de RAM, rendu, chargement et requêtes | Oui |
| devops | Diagnostic Railway et GitHub Actions | Oui, dans le périmètre autorisé |
| docs | Documentation officielle, procédures et tutoriels | Oui |

Les noms natifs sont `rb_frontend`, `rb_backend`, etc. dans Codex et `rb-frontend`, `rb-backend`, etc. dans Cursor et Claude Code. Aucun modèle n'est imposé. Codex est limité à quatre sous-agents simultanés dans cette configuration ; dix rôles ne signifient pas dix agents lancés pour chaque demande.

Pour les trois rôles de revue, Codex reçoit une consigne explicite de ne rien modifier et conserve les permissions de sa session parente. Cursor applique son option native `readonly`, et Claude Code reçoit uniquement les outils Read/Glob/Grep. Aucune configuration de rôle Codex n'est présentée comme une nouvelle frontière de sécurité.

Définitions communes : `.agents/roles.json`. Fichiers natifs : `.codex/agents/*.toml`, `.cursor/agents/*.md`, `.claude/agents/*.md`. Les instructions communes sont dans `AGENTS.md`, importées par `CLAUDE.md` et par la règle Cursor du projet.

### Quatorze compétences provenant de dépôts officiels

| Dépôt | Compétences installées |
| --- | --- |
| [openai/skills](https://github.com/openai/skills) | Playwright, bonnes pratiques de sécurité, modèle de menaces, correction CI GitHub, commentaires de PR, Sentry |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | Performance React/Next.js, revue des interfaces |
| [railwayapp/railway-skills](https://github.com/railwayapp/railway-skills) | Exploitation Railway |
| [prisma/skills](https://github.com/prisma/skills) | Prisma CLI, API Prisma Client, Prisma Postgres |
| [getsentry/sentry-for-ai](https://github.com/getsentry/sentry-for-ai) | SDK Sentry pour Next.js, correction des erreurs Sentry (compétences du dossier `skills-legacy`) |

Les révisions Git exactes sont dans `.agents/tooling.json`. Les sources sont conservées sous `.agents/skills/`, avec leurs ressources et les licences fournies. Claude Code les découvre par les adaptateurs `.claude/skills/`. Codex et Cursor découvrent les compétences partagées dans `.agents/skills/`.

Le projet reste en Next.js 14 et React 18. Une recommandation prévue pour une version ultérieure doit être vérifiée avant application.

## Connexions MCP

| Outil | Source | Vérification de cette installation |
| --- | --- | --- |
| Context7 | [upstash/context7](https://github.com/upstash/context7) | Initialisation et liste de 2 outils réussies |
| Playwright | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Initialisation et liste de 25 outils réussies |
| Chrome DevTools | [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) | Initialisation et liste de 33 outils réussies |
| Railway | [railwayapp/cli](https://github.com/railwayapp/cli) | Initialisation et liste de 78 outils réussies |
| Documentation OpenAI | [Serveur officiel](https://developers.openai.com/learn/docs-mcp) | Initialisation et liste de 5 outils réussies |
| GitHub | [github/github-mcp-server](https://github.com/github/github-mcp-server) | Initialisation authentifiée et liste de 46 outils réussies ; CLI `gh` également authentifiée |
| Sentry | [Serveur officiel](https://docs.sentry.io/product/sentry-mcp/) | Configuration présente ; authentification OAuth encore nécessaire, réponse HTTP 401 sans session |

Ces chiffres indiquent une réponse au protocole MCP, pas l'exécution de toutes les fonctions ni une nouvelle autorisation d'écrire sur un service. Les validations ont uniquement initialisé les serveurs et listé leurs outils.

Les versions npm sont fixées dans `.agents/tooling.json`. `scripts/dev/mcp-server.mjs` lance les outils depuis leurs versions vérifiées, sans utiliser `@latest`. Playwright et Chrome fonctionnent sans fenêtre ; Chrome utilise un profil isolé et la télémétrie ainsi que CrUX sont désactivés. Le lanceur ne transmet pas les variables applicatives de base de données ou les secrets métier aux serveurs navigateur/documentation.

Configurations natives : `.codex/config.toml`, `.cursor/mcp.json`, `.mcp.json` pour Claude Code. Les autres serveurs déjà présents dans `.mcp.json` sont conservés. Les configurations globales personnelles ne sont pas modifiées.

## Activation dans les éditeurs

1. Rouvrir une session Codex et recharger Cursor/Claude Code pour charger les nouveaux rôles et compétences.
2. Dans Claude Code, accepter les serveurs du projet lorsqu'il affiche sa validation MCP. La commande de contrôle les reconnaît actuellement mais affiche « Pending approval » avant cette validation native. Aucun contournement de ce mécanisme n'a été ajouté.
3. Connecter Sentry si ce service est utilisé : dans le client MCP, ou avec `codex mcp login sentry` côté Codex. Un compte et un accès Sentry restent nécessaires.
4. Le serveur GitHub utilise la variable `GITHUB_PERSONAL_ACCESS_TOKEN` du client ; sa valeur n'est pas stockée dans les fichiers du projet. Si elle n'est pas disponible dans un autre éditeur, configurer son authentification GitHub dans cet éditeur. La CLI GitHub peut aussi utiliser sa connexion existante.

Claude Code 2.1.325 est installé dans l'extension Cursor. Son exécutable n'est pas dans le PATH du terminal sur ce poste, ce qui n'empêche pas l'extension de charger le projet. Codex 0.167.0-alpha.4.1 a chargé la configuration et son diagnostic a relevé sept serveurs MCP, zéro échec de diagnostic et des permissions toujours restreintes.

Les chemins des lanceurs dans les configurations sont absolus pour ce poste. Après déplacement du dossier ou clonage sur un autre ordinateur, exécuter la commande de reconfiguration ci-dessous depuis la nouvelle racine. Les sources et versions de référence restent dans le dépôt.

## Commandes de contrôle et de régénération

```powershell
python scripts/dev/check-agent-setup.py
node scripts/dev/check-mcp-readiness.mjs context7 playwright chrome-devtools railway openaiDeveloperDocs github sentry
```

Après modification des rôles ou déplacement du projet :

```powershell
python scripts/dev/sync-agent-setup.py
python scripts/dev/configure-agent-tools.py
python scripts/dev/check-agent-setup.py
```

Le générateur MCP ne met pas à jour les versions automatiquement. Il conserve les connexions non gérées dans les fichiers JSON et sauvegarde les anciennes versions de ces fichiers sous `.tmp/agent-setup-backups/`. `.codex/config.toml` est un fichier généré : placer les réglages personnels dans la configuration utilisateur ou adapter le générateur avant de le personnaliser.

## Exemples de demandes

- « Fais analyser ce bug d'Agenda par l'architecte, corrige avec frontend/backend, puis fais vérifier le parcours par QA et relire le diff par reviewer. »
- « Demande à database de préparer une migration et ses vérifications d'isolation, sans l'appliquer sur Railway. »
- « Demande à performance d'expliquer la hausse de RSS avec des mesures comparables avant de changer le code. »
- « Fais vérifier le formulaire sur ordinateur et mobile par frontend et QA, puis fais auditer les autorisations par security. »

Le pilote principal distribue des tâches indépendantes avec un propriétaire par fichier. Les agents chargés de la revue restent en lecture seule ; une petite modification ne déclenche pas une équipe entière. Une configuration d'agents ne remplace ni les tests, ni l'authentification aux services, ni une autorisation de déployer.

## Dépôts de référence supplémentaires

Ces projets servent de sources techniques ; ils ne sont pas clonés ni ajoutés aux dépendances de l'application : [Next.js](https://github.com/vercel/next.js), [React](https://github.com/facebook/react), [Prisma](https://github.com/prisma/prisma), [node-postgres](https://github.com/brianc/node-postgres), [Vitest](https://github.com/vitest-dev/vitest), [Playwright](https://github.com/microsoft/playwright), [Driver.js](https://github.com/nilbuild/driver.js), [FFmpeg](https://github.com/FFmpeg/FFmpeg), [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss), [Sentry JavaScript](https://github.com/getsentry/sentry-javascript), [node-redis](https://github.com/redis/node-redis), [web-push](https://github.com/web-push-libs/web-push), [passkit-generator](https://github.com/alexandercerutti/passkit-generator), [sharp](https://github.com/lovell/sharp), [Motion](https://github.com/motiondivision/motion), [Recharts](https://github.com/recharts/recharts).

Documentation des formats natifs : [Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents), [Cursor](https://cursor.com/docs/subagents), [Claude Code](https://code.claude.com/docs/en/sub-agents).
