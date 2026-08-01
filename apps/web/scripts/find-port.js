const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const rootDir = path.join(__dirname, '../../..');
loadEnvFile(path.join(rootDir, '.env'));
loadEnvFile(path.join(rootDir, 'packages/convex/.env.local'));

const basePort = parseInt(process.env.PORT || '3000', 10);
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexSiteUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
  process.env.CONVEX_SITE_URL ||
  (convexUrl ? convexUrl.replace('.convex.cloud', '.convex.site') : '');

if (!convexUrl || !convexSiteUrl) {
  console.error('Missing NEXT_PUBLIC_CONVEX_URL / NEXT_PUBLIC_CONVEX_SITE_URL in .env');
  process.exit(1);
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.on('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

async function findFreePort(startPort) {
  let port = startPort;
  const maxPort = startPort + 100;
  while (port < maxPort) {
    if (await isPortFree(port)) return port;
    port++;
  }
  throw new Error(`No free ports found between ${startPort} and ${maxPort}`);
}

async function start() {
  const port = await findFreePort(basePort);
  console.log(`Starting dev server on port ${port}`);
  console.log(`Convex URL: ${convexUrl}`);

  const dev = spawn('npx', ['next', 'dev', '-p', String(port), '-H', '0.0.0.0'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NEXT_PUBLIC_CONVEX_URL: convexUrl,
      NEXT_PUBLIC_CONVEX_SITE_URL: convexSiteUrl,
      CONVEX_SITE_URL: convexSiteUrl,
      SITE_URL: process.env.SITE_URL || `http://localhost:${port}`,
    },
  });

  dev.on('close', (code) => {
    process.exit(code);
  });
}

start().catch((err) => {
  console.error('Failed to start dev server:', err.message);
  process.exit(1);
});
