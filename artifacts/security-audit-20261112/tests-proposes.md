# Suite de non-régression proposée — validation requise

Ce document prépare l'ajout d'un fichier `tests/security/tenant-bola-regression.test.ts` et de fixtures locales. **Aucun fichier de test ni code applicatif n'est modifié par ce document.** La validation demandée porte uniquement sur l'ajout des tests/fixtures ; les correctifs applicatifs seront à valider séparément.

## Garde-fous

- URL explicite `DATABASE_TEST_URL`, hôte strictement loopback, base dédiée, jamais d'option autorisant une base distante.
- Deux instituts A/B créés par le test avec préfixe aléatoire, deux utilisateurs OWNER, abonnement de test, clientes, services, employés, ressources, fournisseur, maintenance et promotion.
- Deux modes indépendants : rôle propriétaire sans RLS effective pour vérifier les filtres métier, puis rôle applicatif limité avec RLS=all pour vérifier la défense SQL.
- Aucun appel réseau sortant : Meta, email, push, Google et Wallet bloqués ou simulés.
- Nettoyage limité aux IDs de ces fixtures ; aucune dépendance à un institute client réel ou à Railway.

## Assertions prévues

| Test | Résultat exigé après correction | État actuel observé |
|---|---|---|
| Lire cliente B avec session A | 404/null, aucune donnée B | protégé |
| Rechercher B depuis A | liste vide | protégé |
| Modifier et archiver cliente B | aucune modification en base B | protégé |
| Créer un objet avec organizationId client B | propriétaire A imposé, ou rejet explicite | propriétaire A imposé pour la dépense |
| PATCH employé B, serviceIds vide | 404 ET liens B inchangés | liens B supprimés sans RLS |
| PATCH ressource B, serviceIds vide | 404 ET liens B inchangés | liens B supprimés sans RLS |
| PATCH employé/ressource B avec service A | aucun nouveau lien, y compris avec RLS=all | lien A/B créé avec RLS |
| PATCH vide maintenance B | 404, aucun motif/dates B | 200 avec contenu B |
| Carte cadeau A avec cliente B | rejet sans création ni nom/téléphone B | création et divulgation |
| Dépense A avec fournisseur B | rejet sans création ni nom B | création et divulgation |
| Forfait A avec cliente/service B | rejet transactionnel | noms B renvoyés |
| Campagne A avec promotion B | rejet, y compris mise à jour | nom/code B renvoyés à la création |
| Confirmation publique avec id inconnu | aucun changement de rendez-vous/facture/fidélité | clôture B et facture générée |
| Webhook Meta sans secret ou signature | refus, aucune écriture | accepté sans secret |
| Webhook compte B, téléphone présent dans A et B | seul B reçoit le rattachement | A choisi dans la preuve |
| SQL RLS avec enfant A et extrémité B | rejet par politique ou contrainte | relation acceptée |
| Export clientes A CSV/XLSX/PDF | aucun marqueur B dans les données extraites | CSV contrôlé ; PDF/XLSX négatifs à ajouter |
| 100 lectures A↔B simultanées | zéro donnée étrangère | zéro fuite sur clientes |
| Nouvelle connexion/même connexion A/B | contexte réinitialisé, aucun bypass résiduel | tests existants passent |
| Session institut sur administration | 403 et aucun effet | protégé sur le parcours testé |

## Forme des tests sensibles

La vérification d'une modification doit inspecter la base **après** l'appel, même si le handler renvoie 404 :

```ts
const before = await linksForStaff(staffB.id);
const response = await patchAs(ownerA, `/api/staff/${staffB.id}`, { serviceIds: [] });
expect(response.status).toBe(404);
expect(await linksForStaff(staffB.id)).toEqual(before);
```

Une création interdite doit aussi prouver l'absence d'écriture persistée :

```ts
const before = await countOwned("GiftCard", orgA.id);
const response = await postAs(ownerA, "/api/gift-cards", {
  amount: 100,
  buyerCustomerId: customerB.id,
});
expect([400, 403, 404]).toContain(response.status);
expect(await countOwned("GiftCard", orgA.id)).toBe(before);
expect(JSON.stringify(await response.json())).not.toContain(customerB.phone);
```

Pour la confirmation publique : enregistrer l'état des rendez-vous B et le nombre de factures avant le rendu/appel, utiliser un ID inexistant, puis exiger que l'état, les factures et les crédits de fidélité soient inchangés. Faire ce test aussi avec `rappel_app` et RLS=all.

Ces nouveaux tests doivent échouer sur les comportements vulnérables actuels. Il ne faut ni les ignorer ni inverser les assertions pour obtenir une suite verte ; ils deviendront verts seulement après validation et application des corrections.
