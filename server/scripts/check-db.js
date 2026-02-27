const { Client } = require("pg");
const dns = require("dns").promises;

const cs = process.env.DATABASE_URL;
if (!cs) {
  console.error("DATABASE_URL not set in environment (check Render env vars)");
  process.exit(1);
}

console.log("Attempting to connect to database (forcing IPv4 lookup)...");

async function run() {
  try {
    // parse the connection string with the WHATWG URL parser
    const u = new URL(cs);
    const host = u.hostname;
    const port = u.port ? Number(u.port) : 5432;
    const user = decodeURIComponent(u.username || "");
    const password = decodeURIComponent(u.password || "");
    const database = (u.pathname || "").replace(/^\//, "") || undefined;

    // Prefer IPv4 by resolving an A record explicitly
    const addresses = await dns.lookup(host, { family: 4, all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`No IPv4 addresses found for host ${host}`);
    }
    const ipv4 = addresses[0].address;

    const client = new Client({
      host: ipv4,
      port,
      user,
      password,
      database,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("DB connection successful (IPv4)");
    await client.end();
  } catch (err) {
    console.error("DB connection failed — error follows:");
    console.error(err);
    process.exit(1);
  }
}

run();
