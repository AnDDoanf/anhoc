import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const testFiles = [
  'backend/test/middleware.test.ts',
  'backend/test/auth.test.ts',
  'backend/test/lessons.test.ts',
  'backend/test/practice.test.ts',
  'backend/test/gamification.test.ts',
  'backend/test/economy.test.ts',
  'backend/test/supervisor.test.ts',
  'backend/test/stripe.test.ts',
  'backend/test/achievements.test.ts'
];

const tsxCli = path.join(rootDir, 'backend', 'node_modules', 'tsx', 'dist', 'cli.mjs');

const child = spawn('node', [tsxCli, '--test', ...testFiles], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test'
  }
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
