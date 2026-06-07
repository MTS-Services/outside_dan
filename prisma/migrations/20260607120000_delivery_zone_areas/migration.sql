-- Allow multiple delivery areas per postcode (e.g. 8770 St. Michael + 8770 Liesingtal)
UPDATE "DeliveryZone" SET "label" = '' WHERE "label" IS NULL;
ALTER TABLE "DeliveryZone" ALTER COLUMN "label" SET NOT NULL;
ALTER TABLE "DeliveryZone" ALTER COLUMN "label" SET DEFAULT '';

DROP INDEX "DeliveryZone_postalCode_key";

CREATE UNIQUE INDEX "DeliveryZone_postalCode_label_key" ON "DeliveryZone"("postalCode", "label");
