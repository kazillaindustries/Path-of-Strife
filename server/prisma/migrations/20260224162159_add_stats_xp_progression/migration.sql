/*
  Warnings:

  - You are about to drop the column `abilities` on the `Character` table. All the data in the column will be lost.
  - Added the required column `maxHp` to the `Character` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxMana` to the `Character` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BattleParticipant" ADD COLUMN     "currentStamina" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Character" DROP COLUMN "abilities",
ADD COLUMN     "battlesWon" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxHp" INTEGER NOT NULL,
ADD COLUMN     "maxMana" INTEGER NOT NULL,
ADD COLUMN     "maxStamina" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;
