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

    console.log('\n==> Installing frontend dependencies');
    run('npm', ['ci'], { cwd: frontendDir });

    console.log('\n==> Building frontend (next build)');
    run('npm', ['run', 'build'], { cwd: frontendDir });

    console.log('\n==> Exporting static frontend (next export)');
    run('npm', ['run', 'export'], { cwd: frontendDir });

    console.log('\n==> Deploying frontend static assets with serverless-finch');

    run('npm', ['ci'], { cwd: proyectoDir });

    run('npx', ['serverless', 'client', 'deploy'], { cwd: proyectoDir });

    if (hookMode) {
      console.log('\n==> Hook mode: skipping `serverless deploy` to avoid recursion');

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
