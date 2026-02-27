import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Simple Prisma client export. Expect `DATABASE_URL` in environment.
export const prisma = new PrismaClient();
