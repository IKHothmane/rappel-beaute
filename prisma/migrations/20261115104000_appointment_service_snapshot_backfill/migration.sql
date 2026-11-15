-- Rattrapage de Appointment.serviceNameSnapshot : le nom du soin conservé sur le rendez-vous
-- reste lisible après suppression ou renommage du soin. Seules les lignes encore vides dont le
-- soin existe, dans le même institut, sont renseignées. "updatedAt" n'est pas modifié : ce n'est
-- pas une modification métier (synchronisation Google Agenda, tri par dernière modification).
--
-- Sûreté du déploiement : idempotente (ne touche que serviceNameSnapshot IS NULL), ne supprime
-- rien, verrous de ligne seulement, pas de verrou de table. Un rendez-vous dont le soin a déjà
-- été supprimé (serviceId NULL) reste sans instantané : l'information n'existe plus en base,
-- elle ne peut être retrouvée que depuis une sauvegarde.
--
-- Retour arrière : aucun nécessaire. Pour annuler malgré tout, il faut une sauvegarde antérieure,
-- car les valeurs rattrapées ne se distinguent pas des valeurs écrites par l'application.
-- Restauration : rejouable sans risque après un restore.

UPDATE "Appointment" a
SET "serviceNameSnapshot" = s.name
FROM "Service" s
WHERE a."serviceNameSnapshot" IS NULL
  AND a."serviceId" = s.id
  AND a."organizationId" = s."organizationId";
