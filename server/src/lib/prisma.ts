import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Prisma client will be disabled.");
  // Export a proxy that throws a descriptive error when any property is accessed.
  const handler: ProxyHandler<any> = {
    get() {
      const err: any = new Error("Database not configured (DATABASE_URL missing)");
      err.code = "NO_DB";
      throw err;
    },
  };
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - export a proxy in place of PrismaClient when DB is missing
  export const prisma = new Proxy({}, handler);
} else {
  const adapter = new PrismaPg({ connectionString });
  export const prisma = new PrismaClient({ adapter });
}
