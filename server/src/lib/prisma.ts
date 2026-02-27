import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

let _prisma: any;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Prisma client will be disabled.");
  const handler: ProxyHandler<any> = {
    get() {
      const err: any = new Error("Database not configured (DATABASE_URL missing)");
      err.code = "NO_DB";
      throw err;
    },
  };
  _prisma = new Proxy({}, handler);
} else {
  const adapter = new PrismaPg({ connectionString });
  _prisma = new PrismaClient({ adapter });
}

export const prisma = _prisma as any;
