const { spawn } = require("child_process");
const port = process.env.PORT || 3000;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://majestic-fennec-420.convex.cloud";

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