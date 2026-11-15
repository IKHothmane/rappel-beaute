# Outils SEO installés depuis GitHub

Installation utilisateur vérifiée le 15 novembre 2026. Ces outils servent aux audits et ne créent pas de backlinks.

## Compétences disponibles

| Skill | Dépôt | Révision installée | Usage |
| --- | --- | --- | --- |
| `seo-geo` | https://github.com/rankxai/seo-geo-skills | `cba1bc61c981a8d9dcee6f1d211a8f18c74277c3` | Pages, sitemap, liens internes, robots IA, exports Search Console et logs |
| `internal-linking` | https://github.com/DarynaRodriguez/seo-skills | `bb88220c6611a6b96322f3536f074c1e5295a8ec` | Liens contextuels, pages peu reliées, ancres et propositions de maillage |

Les deux dépôts sont sous licence MIT ; les licences sont conservées. Aucun paquet n’a été ajouté aux dépendances de Rappel Beauty.

Les instructions complètes sont dans `~/.agents/skills/`. Des adaptateurs portant les mêmes noms sont installés dans `~/.codex/skills/`, `~/.cursor/skills/` et `~/.claude/skills/` : ils permettent aux trois outils de sélectionner les compétences pertinentes dans tous les projets locaux après rechargement. Ils ne lancent pas automatiquement un audit ni une tâche en arrière-plan.

Le support Python complet de `internal-linking`, incluant sa documentation, est dans `~/.agents/tooling/daryna-seo-skills/`. Le manifeste des versions se trouve dans `~/.agents/tooling/seo-manifest.json`. Le skill installé documente ce chemin pour fonctionner depuis n’importe quel projet.

## Utilisation sur Windows

```powershell
node "$env:USERPROFILE/.agents/skills/seo-geo/scripts/audit-page.mjs" https://rappelbeauty.com/solutions/institut-beaute/ --user-agent browser --json
python "$env:USERPROFILE/.agents/tooling/daryna-seo-skills/seo.py" page https://rappelbeauty.com/solutions/institut-beaute/ --user-agent 'Mozilla/5.0' --json
```

Ces commandes lisent une page publique. Un user-agent simulé ne prouve pas qu’un robot IA authentique a visité le site. Les règles et affirmations SEO embarquées doivent être confrontées aux documents officiels actuels avant toute recommandation.

## Vérifications réalisées

- Six adaptateurs présents, avec des chemins vers les deux instructions complètes.
- Outil Node : lecture de la page publique en HTTP 200, aucun défaut de niveau erreur ou avertissement dans ce contrôle mécanique.
- Outil Python : lecture en HTTP 200 et diagnostic local hors ligne réussi.
- Le diagnostic Python réseau utilise `example.com` et rencontre une erreur de certificat sur cette machine. Cela n’a pas été contourné ; la vérification TLS reste active et les lectures de Rappel Beauty réussissent.

## Backlinks : relevé actuel

La base OpenSEO/DataForSEO recense **11 backlinks provenant de 9 domaines**, et aucun lien cassé signalé. Le résultat est identique au contrôle précédent de cette session. Tous les liens du dernier échantillon détaillé pointent vers l’accueil ; plusieurs ancres concernent des offres de référencement plutôt que le secteur de la beauté.

Ce relevé n’est pas un inventaire exhaustif du Web. Les scores de spam sont des heuristiques du fournisseur, pas une preuve de pénalité Google. Aucun lien n’a été acheté, publié ou désavoué. Le plan de liens naturels reste dans [liens-externes.md](liens-externes.md).

Les nouveaux scripts ne possèdent pas d’index mondial des backlinks : conserver OpenSEO et Google Search Console comme sources de données externes. Toute publication sur un autre site, prise de contact, dépense ou modification de compte demande une autorisation correspondant à cette action.
