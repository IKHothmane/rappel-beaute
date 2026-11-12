# Connexions MCP — 12 novembre 2026

Configuration globale de Codex : `C:/Users/hp/.codex/config.toml`.
Une sauvegarde du fichier précédent a été créée dans le même dossier.
Aucune dépendance du site ni aucun compte externe n'a été modifié.

| Serveur | Vérification effectuée |
| --- | --- |
| Chrome DevTools 1.13.0 | Initialisation MCP, liste des 33 outils, ouverture de `https://rappelbeauty.com/`, trace de performance terminée |
| Playwright MCP 0.0.85 | Initialisation MCP, liste des 25 outils, lancement de Chrome et navigation vers `about:blank` |
| Context7 4.7.0 | Initialisation MCP et liste des 2 outils |
| Documentation OpenAI | Initialisation MCP via HTTPS réussie, réponse HTTP 200 |

Les tests ont utilisé un client MCP local. Les outils des nouveaux serveurs ne sont pas encore exposés à la conversation en cours : redémarrer l'extension Codex pour les charger.
Les navigateurs de vérification ont été arrêtés. Les prochaines connexions relanceront les serveurs automatiquement.

Chrome utilise un profil temporaire isolé et fonctionne sans fenêtre. Les statistiques d'utilisation du serveur et la consultation CrUX sont désactivées. Les versions npm sont fixées. Le délai de démarrage est de 60 secondes et celui des outils de 120 secondes.

## Première trace de vérification

Page publique en ligne : `https://rappelbeauty.com/`, cache HTTP ignoré, aucune limitation réseau ou CPU configurée.

- LCP observé : 752 ms.
- CLS observé : 0,00.
- TTFB observé : 107 ms.

Il s'agit d'une seule mesure de laboratoire sur cet ordinateur. Elle ne mesure pas l'INP des utilisateurs, ne constitue pas un audit mobile complet et ne valide pas les modifications locales non déployées.
Les résultats techniques sont conservés dans `.tmp/mcp-verification.json` et `.tmp/mcp-chrome-trace-result.json` (fichiers locaux ignorés par Git).

Les services nécessitant un compte ou une clé ne sont pas authentifiés automatiquement par cette configuration.

Sources : [configuration Codex](https://developers.openai.com/codex/mcp), [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp), [documentation OpenAI MCP](https://developers.openai.com/learn/docs-mcp).
