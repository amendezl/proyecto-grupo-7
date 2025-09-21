#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const rawArgs = process.argv.slice(2);
const hookMode = rawArgs.includes('--hook') || process.env.HOOK === 'true';
let tableArg = null;
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--table' && rawArgs[i + 1]) {
    tableArg = rawArgs[i + 1];
    i++;
  }
}

function run(cmd, args, opts = {}) {
  const full = `${cmd} ${args.join(' ')}`;
  console.log(`> ${full}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${res.status}`);
}

(async function main(){
  try {
    const repoRoot = path.resolve(__dirname, '..');
    const frontendDir = path.join(repoRoot, 'frontend');
    const proyectoDir = path.join(repoRoot, 'proyecto');

  console.log(`\n==> Running in LIVE mode${hookMode ? ' (HOOK MODE)' : ''}`);

    // 1. Install frontend deps
    console.log('\n==> Installing frontend dependencies');
    run('npm', ['ci'], { cwd: frontendDir });

    // 2. Build frontend (Next.js)
    console.log('\n==> Building frontend (next build)');
    run('npm', ['run', 'build'], { cwd: frontendDir });

    // 3. Export static site (if export script exists)
    console.log('\n==> Exporting static frontend (next export)');
    run('npm', ['run', 'export'], { cwd: frontendDir });

    // 4. Upload frontend using serverless-finch (optional)
    console.log('\n==> Deploying frontend static assets with serverless-finch');
    // Ensure proyecto has node deps
    run('npm', ['ci'], { cwd: proyectoDir });
    // run serverless-finch deploy from proyecto root
    run('npx', ['serverless', 'client', 'deploy'], { cwd: proyectoDir });

    // 5. Deploy backend with Serverless (skip if wrapper was invoked from hook)
    if (hookMode) {
      console.log('\n==> Hook mode: skipping `serverless deploy` to avoid recursion');
      // If tableArg provided, run the seeder in CI mode against that table
      if (tableArg) {
        console.log(`\n==> Hook mode: running seeder for table ${tableArg}`);
        run('npm', ['run', 'seed:ci', '--', '--table', tableArg], { cwd: proyectoDir });
      }
    } else {
      console.log('\n==> Deploying backend (serverless deploy)');
      run('npx', ['serverless', 'deploy'], { cwd: proyectoDir });
    }

    console.log('\nAll done. Frontend + Backend deployed.');
  } catch (err) {
    console.error('Error during deploy:', err);
    process.exit(1);
  }
})();
