const { Client } = require('pg');

const cs = process.env.DATABASE_URL;
if (!cs) {
  console.error('DATABASE_URL not set in environment (check Render env vars)');
  process.exit(1);
}

console.log('Attempting to connect to database...');
const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });

client
  .connect()
  .then(() => {
    console.log('DB connection successful');
    return client.end();
  })
  .catch((err) => {
    console.error('DB connection failed — error follows:');
    console.error(err);
    // exit non-zero so build fails and logs show the error
    process.exit(1);
  });
