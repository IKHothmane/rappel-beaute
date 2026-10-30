-- Un avis déposé depuis la carte fidélité peut exister sans rendez-vous.

ALTER TABLE "Review" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "reviewRequestId" DROP NOT NULL;
