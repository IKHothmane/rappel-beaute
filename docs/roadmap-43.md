# Étape 43 — Assistant IA Rappel Beauty

Document de découpage. L’IA est une **couche intelligente** branchée sur les services métier — **jamais** d’accès SQL direct depuis le LLM.

> Note : la roadmap 41 prévoit l’IA après 41.33. La fondation 43.1–43.4 peut être posée en parallèle ; le polish produit reste après clôture 41.

## Architecture

```
AI → Tool → Permission → organizationId (session) → Business Service → PostgreSQL
```

## Sous-étapes

| # | Statut | Contenu |
|---|---|---|
| 43.1 | ✅ | Architecture + schéma `AIConversation` / `AIMessage` / `AIUsagePeriod` |
| 43.2 | ✅ | Provider abstrait (`mock` + OpenAI-compatible) + fallback |
| 43.3 | ✅ | Context layer (`AIRequestContext`, strip `organizationId`) |
| 43.4 | ✅ | Tools sécurisés + RBAC (finance STAFF refusée) |
| 43.5 | ✅ | Assistant `/ai/` — historique, nouveau chat, sources, quota, reveal streaming |
| 43.6 | ✅ | Bloc Dashboard « Analyse IA » (KPI Analytics uniquement) |
| 43.7 | ✅ | Génération messages Marketing / WhatsApp (draft → wa.me → WhatsAppTask, attribution `ai_marketing`) |
| 43.8 | 🔜 | Assistant métier (questions CA / relances / agenda via tools) |
| 43.9 | 🔜 | Recommandations actionables |
| 43.10 | 🔜 plus tard | IA avancée / prévision (après données réelles) |
| 43.11–43.12 | 🔜 | Domaines restantes |
| 43.13 | 🔜 | Recommandations actionables (suite) |
| 43.14 | ✅ socle | Usage / quotas plan (`STARTER` 0, `INSTITUT` 100, `PREMIUM` 500) |
| 43.15 | ✅ socle | Audit `AI_CHAT` / `AI_GENERATE_MESSAGE` |
| 43.16 | ✅ partiel | Tests fondation |
| 43.17 | 🔜 | Polish UI |

## APIs livrées (fondation)

- `POST /api/ai/chat`
- `GET /api/ai/conversations`
- `GET|DELETE /api/ai/conversations/[id]`
- `POST /api/ai/generate-message`
- `POST /api/ai/whatsapp-draft` — crée `WhatsAppTask` PENDING après validation humaine (jamais d'envoi auto)
- `POST /api/ai/analyze-dashboard`
- `POST /api/ai/recommendations`
- `GET /api/ai/usage`

## UI

- `/ai/` — Assistant (conversations, sources tools, quota, analyse des données…)
- `/whatsapp/` — onglet **Générer IA** (types, ton, FR / Darija / Arabe, 3 versions, aperçu, wa.me)
- Fiche cliente — **Message IA**
- Dashboard `/` — bloc **Analyse IA** (chiffres = Analytics, interprétation structurée)
- Analytics → Marketing — funnel **IA** (`ai_marketing` : généré → envoyé → réservation → COMPLETED)

## Règles 43.5–43.6

```
PostgreSQL → Analytics / KPI → AI Context → (LLM ou narratif factuel) → Explication
```

KPI jamais inventés par le modèle. Mock = narratif déterministe depuis `getRevenue` / tools.

## Env provider (optionnel)

```
AI_API_KEY=…
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_PROVIDER=mock   # forcer mock
```

Sans clé → `MockAIProvider` (réponses à partir des tools uniquement).

## Règles

1. `organizationId` uniquement session.
2. Pas de chiffres inventés — tools → services → PG.
3. Actions sensibles = confirmation humaine (drafts seulement en V1).
4. Pas de bot WhatsApp autonome.
5. Pas d’étape 42 Mobile ; IA = 43 après / en parallèle contrôlée de 41.
