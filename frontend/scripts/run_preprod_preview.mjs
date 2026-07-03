import { spawn } from 'node:child_process';

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      SENDADOCS_API_PROXY_TARGET: 'http://localhost:3302',
    },
  }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('No se pudo iniciar vite preview preprod:', error.message);
  process.exit(1);
});
