import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendRoot = resolve(process.env.DEEPX_BACKEND_ROOT || join(projectRoot, "..", "DeepX"));
const executable = process.platform === "win32" ? "deepx-daemon.exe" : "deepx-daemon";

if (!existsSync(join(backendRoot, "Cargo.toml"))) {
  throw new Error(
    `DeepX backend was not found at ${backendRoot}. Set DEEPX_BACKEND_ROOT to the backend repository.`,
  );
}

const cargo = process.platform === "win32" ? "cargo.exe" : "cargo";
const build = spawnSync(cargo, ["build", "--release", "-p", "deepx-daemon"], {
  cwd: backendRoot,
  stdio: "inherit",
  shell: false,
});

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const source = join(backendRoot, "target", "release", executable);
const destination = join(projectRoot, "build", "sidecar", executable);
if (!existsSync(source)) throw new Error(`Cargo completed without producing ${source}`);

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log(`Staged ${source} -> ${destination}`);
