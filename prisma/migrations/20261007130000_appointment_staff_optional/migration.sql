-- Un rendez-vous institut peut être créé sans employée.
ALTER TABLE "Appointment" ALTER COLUMN "staffId" DROP NOT NULL;
