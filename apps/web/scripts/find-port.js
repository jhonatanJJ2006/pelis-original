const { spawn } = require("child_process");
const net = require("net");

const basePort = parseInt(process.env.PORT || "3000", 10);
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://neat-rook-914.convex.cloud";

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
      env: { ...process.env, NEXT_PUBLIC_CONVEX_URL: convexUrl },
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
