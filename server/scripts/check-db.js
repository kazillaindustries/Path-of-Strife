const { Client } = require("pg");

const cs = process.env.DATABASE_URL;
if (!cs) {
  console.error("DATABASE_URL not set in environment (check Render env vars)");
  process.exit(1);
}

console.log("Attempting to connect to database (using configured host resolution)...");

async function run() {
  try {
    // Use the full connection string and let the system resolver handle A/AAAA
    const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
    console.log("Connecting using connection string host:", new URL(cs).hostname);
    await client.connect();
    console.log("DB connection successful");
    await client.end();
  } catch (err) {
    console.error("DB connection failed — error follows:");
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
