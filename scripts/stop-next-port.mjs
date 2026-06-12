import { execFileSync } from "node:child_process";

const port = process.argv[2] ?? "3000";

function collectPidsFromNetstat() {
  let output = "";

  try {
    output = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
  } catch {
    return new Set();
  }

  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const normalized = line.trim().replace(/\s+/g, " ");
    if (!normalized.includes(`:${port}`)) {
      continue;
    }

    if (!/\bLISTENING\b|\bESCUCHANDO\b/i.test(normalized)) {
      continue;
    }

    const pid = normalized.split(" ").at(-1);
    if (pid && /^\d+$/.test(pid) && pid !== "0") {
      pids.add(pid);
    }
  }

  return pids;
}

function collectPidsFromPowerShell() {
  try {
    const command = [
      "-NoProfile",
      "-Command",
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess`
    ];
    const output = execFileSync("powershell.exe", command, { encoding: "utf8" });
    return new Set(output.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^\d+$/.test(line)));
  } catch {
    return new Set();
  }
}

const pids = new Set([...collectPidsFromNetstat(), ...collectPidsFromPowerShell()]);

if (pids.size === 0) {
  console.log(`Puerto ${port} libre.`);
  process.exit(0);
}

let hadFailure = false;

for (const pid of pids) {
  try {
    execFileSync("taskkill", ["/PID", pid, "/T", "/F"], { stdio: "ignore" });
    console.log(`Puerto ${port} liberado. Proceso cerrado: ${pid}`);
  } catch {
    hadFailure = true;
    console.warn(
      `No pude cerrar el proceso ${pid} en el puerto ${port}. Cierra Node.js desde el Administrador de tareas y vuelve a correr npm.cmd run dev:fresh.`
    );
  }
}

process.exit(hadFailure ? 1 : 0);
