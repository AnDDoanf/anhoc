import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";

const runCommand = (command, args) =>
  spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

const getListeningPidCount = (port) => {
  if (isWindows) {
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique`,
      ],
      { encoding: "utf8" }
    );

    return result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean).length;
  }

  const result = spawnSync(
    "lsof",
    ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
    { encoding: "utf8" }
  );

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
};

const closePortsResult = runCommand(process.execPath, [
  "./scripts/close-ports.mjs",
  "5000",
  "5001",
  "--best-effort",
]);

if (closePortsResult.status !== 0) {
  process.exit(closePortsResult.status ?? 1);
}

const commands = [
  "npm run dev --prefix frontend",
  "npm run dev --prefix backend",
];
const names = ["frontend", "backend"];
const colors = ["cyan", "green"];

if (getListeningPidCount(5002) === 0) {
  commands.push("cd chatbot && .\\.venv\\Scripts\\python.exe -m uvicorn main:app --port 5002 --reload");
  names.push("chatbot");
  colors.push("yellow");
} else {
  console.log("Port 5002 is already in use. Skipping chatbot startup and keeping the existing listener.");
}

const escapeForShell = (value) => `"${value.replace(/"/g, '\\"')}"`;
const concurrentlyCommand = [
  "npx concurrently",
  "--kill-others",
  `--names ${escapeForShell(names.join(","))}`,
  `-c ${escapeForShell(colors.join(","))}`,
  ...commands.map(escapeForShell),
].join(" ");

const child = spawn(concurrentlyCommand, {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
