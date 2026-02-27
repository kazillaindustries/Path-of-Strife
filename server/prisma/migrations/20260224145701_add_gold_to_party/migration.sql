/*
  Warnings:

  - You are about to drop the column `gold` on the `Character` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Character" DROP COLUMN "gold";

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "gold" INTEGER NOT NULL DEFAULT 0;
