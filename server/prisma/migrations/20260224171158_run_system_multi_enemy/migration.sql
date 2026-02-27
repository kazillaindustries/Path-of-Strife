/*
  Warnings:

  - You are about to drop the column `bossHp` on the `Battle` table. All the data in the column will be lost.
  - You are about to drop the column `bossMaxHp` on the `Battle` table. All the data in the column will be lost.
  - You are about to drop the column `bossName` on the `Battle` table. All the data in the column will be lost.
  - Added the required column `enemies` to the `Battle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Battle" DROP COLUMN "bossHp",
DROP COLUMN "bossMaxHp",
DROP COLUMN "bossName",
ADD COLUMN     "enemies" JSONB NOT NULL,
ADD COLUMN     "runId" TEXT;

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "path" JSONB NOT NULL,
    "currentArea" INTEGER NOT NULL DEFAULT 0,
    "currentBattle" INTEGER NOT NULL DEFAULT 0,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
