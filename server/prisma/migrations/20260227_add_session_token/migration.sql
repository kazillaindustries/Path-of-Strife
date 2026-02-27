-- AlterTable
ALTER TABLE "User" ADD COLUMN "sessionToken" TEXT;

-- Create unique constraint on sessionToken for future rows
ALTER TABLE "User" ADD CONSTRAINT "User_sessionToken_key" UNIQUE ("sessionToken");
