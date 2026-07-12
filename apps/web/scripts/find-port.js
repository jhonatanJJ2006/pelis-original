const { spawn } = require("child_process");
const net = require("net");
const fs = require("fs");
const path = require("path");

function loadRootEnv() {
  const envPath = path.join(__dirname, "../../.env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadRootEnv();

const basePort = parseInt(process.env.PORT || "3000", 10);
const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://neat-rook-914.convex.cloud";
const convexSiteUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
  convexUrl.replace(".convex.cloud", ".convex.site");

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.on("listening", () => {
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

  const dev = spawn(
    "npx",
    ["next", "dev", "-p", String(port)],
    {
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        NEXT_PUBLIC_CONVEX_URL: convexUrl,
        NEXT_PUBLIC_CONVEX_SITE_URL: convexSiteUrl,
      },
    }
  );

  dev.on("close", (code) => {
    process.exit(code);
  });
}

start().catch((err) => {
  console.error("Failed to start dev server:", err.message);
  process.exit(1);
});
