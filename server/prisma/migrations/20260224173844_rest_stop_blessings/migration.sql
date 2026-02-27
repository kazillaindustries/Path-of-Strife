-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "atRestStop" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blessings" JSONB;
