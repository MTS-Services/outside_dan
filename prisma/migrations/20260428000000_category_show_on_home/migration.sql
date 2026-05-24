-- AlterTable
ALTER TABLE "Category" ADD COLUMN "showOnHome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "homeImageUrl" TEXT;
