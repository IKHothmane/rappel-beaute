# Risque R4 : références entre instituts

RLS masque les lignes d'un autre institut, mais **ne contrôle pas les clés étrangères** : PostgreSQL vérifie les références avec les droits du propriétaire de la table, sans appliquer RLS. Une écriture d'un institut A peut donc rattacher une de ses lignes à une ligne de l'institut B, si l'identifiant de B est connu.

Cas reproduits sur une base jetable avec le rôle `rappel_app` (RLS active, contexte = institut A) :

| Écriture | Résultat |
|---|---|
| `Appointment.customerId` → cliente de B | acceptée |
| `Appointment.staffId` → employée de B | acceptée |
| `ServiceStaff` service A ↔ employée B | acceptée |
| `ServiceResource` service A ↔ ressource B | acceptée |
| `InventoryMovement.productId` → produit de B | acceptée (6 lignes) |

Conséquence : une ligne de A devient liée à une donnée de B (suppression de B bloquée par la clé, oracle d'existence d'un identifiant de B, jointures qui renvoient des noms de B).

## Ce qui est déjà corrigé dans le code

- `assertAppointmentReferences` (`src/lib/db/appointments.ts`) vérifie cliente, service, employée et ressource avant `createAppointmentRow` et `updateAppointmentRow`. Les routes répondent 400.
- Les tables de jonction `ServiceStaff`, `ServiceResource`, `ServiceProduct`, `ProductSupplier` et `InventoryMovement` filtraient déjà par institut dans le code applicatif (vérifié par lecture). Cette garde applicative ne protège pas contre un oubli futur ni contre un accès SQL direct : la migration ci-dessous est la protection de fond.

## Fichiers

| Fichier | Rôle |
|---|---|
| `detect-cross-org.sql` | Lecture seule. Compte les références croisées existantes (85 clés directes, 12 clés secondaires de tables enfants). |
| `proposed-migration.sql` | Contraintes composites. **Pas dans `prisma/migrations`** : `prisma migrate deploy` s'exécute à chaque déploiement Railway. |
| `rollback-migration.sql` | Recrée les 85 clés simples d'origine, retire les clés composites et les index. |

Les trois fichiers ont été exécutés sur des copies jetables de la base de test. Détection : 0 sur une base saine, 1 par violation injectée. Migration : 85 contraintes validées, une référence croisée est refusée même avec le rôle propriétaire. Retour arrière : retour à 203 clés étrangères, identique à l'état initial. Sur des données incompatibles, la migration s'arrête à `VALIDATE` et les anciennes clés restent en place.

## Procédure

1. **Copie de la production.** Restaurer une sauvegarde récente dans une base jetable. Ne jamais lancer ces scripts d'abord sur la production.
2. **Détection.** `psql -f detect-cross-org.sql` avec le rôle propriétaire. Attendu : 0 partout.
3. **Si une ligne est non nulle**, la traiter sans supprimer de donnée (ci-dessous), puis recommencer l'étape 2.
4. **Migration sur la copie**, mesurer la durée, puis rejouer le retour arrière.
5. **Production**, hors heures de pointe, après sauvegarde : partie A (index `CONCURRENTLY`, hors transaction), partie B (verrou court, `lock_timeout` à 5 s), partie C (`VALIDATE`, n'empêche pas les écritures), puis retrait des anciennes clés.
6. Mettre à jour `prisma/schema.prisma` dans le même changement (`@@unique([id, organizationId])` et relations composites), sinon le prochain `prisma migrate dev` verra un écart et proposera de supprimer les contraintes.

Prérequis : PostgreSQL 15 ou plus (`ON DELETE SET NULL (colonne)`). Vérifier la version de l'instance Railway avant l'étape 5.

## Traiter les données incompatibles, sans suppression

Avant toute correction : sauvegarde, puis table de journal.

```sql
CREATE TABLE IF NOT EXISTS r4_remediation_log (
  at timestamptz DEFAULT now(), table_name text, row_id text, column_name text,
  old_value text, new_value text, action text
);
```

Pour chaque ligne listée par la requête de détail (`id`, institut de la ligne, institut de la référence), choisir selon le cas, dans une transaction, en journalisant l'ancienne valeur :

- **La référence appartient à l'autre institut par erreur** (cas le plus probable : identifiant saisi ou copié d'un autre compte). Si la colonne est nullable, la passer à `NULL`. Le rendez-vous reste lisible, sans lien erroné.
- **La colonne est obligatoire** (ex. `Appointment.customerId`, `Appointment.staffId`). Créer dans l'institut de la ligne une copie de la ligne référencée (cliente, employée) avec un nouvel identifiant, puis repointer. Les deux instituts gardent leurs données, aucune n'est supprimée.
- **Ligne d'une table enfant** (`ServiceStaff`, `ServiceResource`…). Archiver la ligne dans une table `*_r4_archive` (copie complète) puis la retirer de la table active. C'est la seule opération qui retire une ligne, et elle est réversible depuis l'archive.
- **Doute sur l'origine** : ne rien modifier, signaler à l'institut concerné.

Ne jamais corriger en production avant d'avoir rejoué la procédure sur la copie.

## Limite restante : tables enfants sans `organizationId`

35 clés portent sur des tables enfants qui n'ont pas de colonne `organizationId` (`ServiceStaff`, `ServiceResource`, `ServiceProduct`, `ServiceCommission`, `ProductSupplier`, `PurchaseItem`, `InvoiceItem`, `PackageItem`, `CampaignRecipient`, `ReviewStaffRating`…). La migration proposée ne les couvre pas. Deux options pour une seconde étape :

1. Ajouter `organizationId` à ces tables (copie depuis le parent, `NOT NULL`), puis clés composites sur les deux côtés. Solution complète, changement de schéma plus large, simplifie aussi les politiques RLS.
2. Déclencheur `BEFORE INSERT OR UPDATE` qui compare l'institut des deux parents. Plus léger, mais logique cachée dans la base.

Le script de détection couvre déjà 12 de ces paires. D'ici là, la protection repose sur le code applicatif, vérifié pour les écritures actuelles.
