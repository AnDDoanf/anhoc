import { spawnSync } from "node:child_process";
import process from "node:process";

const DEFAULT_PORTS = [5000, 5001, 5002];
const RELEASE_TIMEOUT_MS = 10000;
const RELEASE_POLL_MS = 250;
const bestEffort = process.argv.includes("--best-effort");

const requestedPorts = process.argv
  .slice(2)
  .filter((value) => value !== "--best-effort")
  .map((value) => Number.parseInt(value, 10))
  .filter((value) => Number.isInteger(value) && value > 0);

const ports = requestedPorts.length > 0 ? requestedPorts : DEFAULT_PORTS;

const collectPidsOnWindows = (port) => {
  const result = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique`,
    ],
    { encoding: "utf8" }
  );

  if (result.error) {
    throw result.error;
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
};

const collectPidsOnUnix = (port) => {
  const result = spawnSync(
    "lsof",
    ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
    { encoding: "utf8" }
  );

  if (result.error) {
    throw result.error;
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
};

const killPidOnWindows = (pid) => {
  const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    if (/not found/i.test(output)) {
      return;
    }
    throw new Error(output || `Failed to stop PID ${pid}`);
  }
};

const killPidOnUnix = (pid) => {
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ESRCH") {
      return;
    }
    throw error;
  }
};

const collectPids = process.platform === "win32" ? collectPidsOnWindows : collectPidsOnUnix;
const killPid = process.platform === "win32" ? killPidOnWindows : killPidOnUnix;

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const collectPidToPorts = (targetPorts) => {
  const pidToPorts = new Map();

  for (const port of targetPorts) {
    for (const pid of collectPids(port)) {
      const currentPorts = pidToPorts.get(pid) ?? [];
      currentPorts.push(port);
      pidToPorts.set(pid, currentPorts);
    }
  }

  return pidToPorts;
};

const drainPorts = async (targetPorts) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < RELEASE_TIMEOUT_MS) {
    const pidToPorts = collectPidToPorts(targetPorts);

    if (pidToPorts.size === 0) {
      return true;
    }

    for (const [pid, boundPorts] of pidToPorts.entries()) {
      killPid(pid);
      console.log(`Stopped PID ${pid} on port${boundPorts.length > 1 ? "s" : ""} ${boundPorts.join(", ")}`);
    }

    await sleep(RELEASE_POLL_MS);
  }

  const busyPorts = targetPorts.filter((port) => collectPids(port).length > 0);
  if (busyPorts.length > 0) {
    if (bestEffort) {
      console.warn(`Ports still in use after waiting: ${busyPorts.join(", ")}`);
      return false;
    }
    throw new Error(`Ports still in use after waiting: ${busyPorts.join(", ")}`);
  }

  return true;
};

if (collectPidToPorts(ports).size === 0) {
  console.log(`No listening processes found on ports: ${ports.join(", ")}`);
  process.exit(0);
}

const portsCleared = await drainPorts(ports);
if (portsCleared) {
  console.log(`Ports ready: ${ports.join(", ")}`);
}
