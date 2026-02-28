#!/usr/bin/env node
const { spawn } = require('child_process');

function ts() { return new Date().toISOString(); }
function sep() { return '\n' + '-'.repeat(60) + '\n'; }
function logHeader(title){
  console.log(sep());
  console.log(`[${ts()}] >>> ${title}`);
}

function run(cmd, args, opts = {}){
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore','pipe','pipe'], shell: true, ...opts });

    p.stdout.on('data', d => process.stdout.write(d));
    p.stderr.on('data', d => process.stderr.write(d));

    p.on('error', err => reject(err));
    p.on('close', code => {
      if(code !== 0) return reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
      resolve();
    });
  });
}

(async function main(){
  try{
    logHeader('Starting build (logged)');

    logHeader('Step 1: Prisma generate (generating client)');
    await run('npx', ['prisma','generate']);

    // previous build command runs here + nicely logged errors
    logHeader('Step 2: TypeScript compile (tsc)');
    await run('npx', ['tsc','--project','tsconfig.json','--outDir','dist']);

    console.log(sep());
    console.log(`[${ts()}] Build completed successfully`);
    console.log(sep());
  }catch(err){
    console.error(sep());
    console.error(`[${ts()}] Build failed:`);
    console.error(err && err.stack ? err.stack : err);
    console.error(sep());
    process.exit(1);
  }
})();
