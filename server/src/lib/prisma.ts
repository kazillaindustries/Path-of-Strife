import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL is not set. Set it in environment or server/.env before starting the app.");
}

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
