import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Allow prisma generate to run even if DATABASE_URL is unset
    url: process.env.DATABASE_URL ?? "",
  },
});
