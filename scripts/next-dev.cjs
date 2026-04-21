/**
 * Fuerza cwd = raíz del repo antes de levantar Next.
 * Así PostCSS/Tailwind y rutas relativas no dependen de desde dónde se lanzó el proceso.
 */
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
process.chdir(root);

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const child = spawn(
  process.execPath,
  ["--max-old-space-size=8192", nextBin, "dev"],
  {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, NEXT_DISABLE_TURBOPACK: "1" },
    shell: false,
  }
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
