/*
  Warnings:

  - Added the required column `bossMaxHp` to the `Battle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Battle" ADD COLUMN     "bossMaxHp" INTEGER NOT NULL,
ADD COLUMN     "finished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "statusEffects" JSONB,
ADD COLUMN     "turn" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "won" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BattleParticipant" ADD COLUMN     "hasActed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "toggles" JSONB;
