#!/usr/bin/env node
/**
 * Nexus — Backend Startup Validator
 * Validates Python deps and starts uvicorn server with clear error messages.
 */

const { execSync, spawn } = require("child_process");
const path = require("path");

const BACKEND_PORT = process.env.BACKEND_PORT || 8000;
const ROOT = path.resolve(__dirname, "..");

function checkPython() {
  try {
    const ver = execSync("python --version", { encoding: "utf-8" }).trim();
    console.log(`[nexus/backend] ✓ ${ver}`);
    return "python";
  } catch {
    try {
      const ver = execSync("python3 --version", { encoding: "utf-8" }).trim();
      console.log(`[nexus/backend] ✓ ${ver}`);
      return "python3";
    } catch {
      console.error("[nexus/backend] ✗ Python not found. Please install Python 3.9+");
      process.exit(1);
    }
  }
}

function checkDeps(pythonCmd) {
  const required = [
    { name: "fastapi", importName: "fastapi" },
    { name: "uvicorn[standard]", importName: "uvicorn" },
    { name: "sqlalchemy", importName: "sqlalchemy" },
    { name: "passlib", importName: "passlib" },
    { name: "pyjwt", importName: "jwt" },
    { name: "python-socketio", importName: "socketio" },
    { name: "httpx", importName: "httpx" },
    { name: "python-multipart", importName: "multipart" }
  ];
  const missing = [];
  for (const pkg of required) {
    try {
      execSync(`${pythonCmd} -c "import ${pkg.importName}"`, { stdio: "pipe" });
    } catch {
      missing.push(pkg.name);
    }
  }
  if (missing.length > 0) {
    console.warn(`[nexus/backend] ⚠ Missing packages: ${missing.join(", ")}`);
    console.log("[nexus/backend] Installing missing dependencies...");
    try {
      execSync(`${pythonCmd} -m pip install ${missing.join(" ")} --quiet`, {
        cwd: ROOT,
        stdio: "inherit",
      });
      console.log("[nexus/backend] ✓ Dependencies installed.");
    } catch (err) {
      console.error("[nexus/backend] ✗ Failed to install deps. Run: pip install -r backend/requirements.txt");
      process.exit(1);
    }
  } else {
    console.log("[nexus/backend] ✓ All Python dependencies satisfied.");
  }
}

function startBackend(pythonCmd) {
  console.log(`[nexus/backend] Starting FastAPI server on http://127.0.0.1:${BACKEND_PORT}...`);
  
  const proc = spawn(
    pythonCmd,
    ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", String(BACKEND_PORT), "--reload", "--reload-dir", "backend"],
    {
      cwd: ROOT,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: "inherit",
    }
  );

  proc.on("error", (err) => {
    console.error("[nexus/backend] ✗ Failed to start uvicorn:", err.message);
    console.error("[nexus/backend] Try running manually: python -m uvicorn main:app --reload");
    process.exit(1);
  });

  proc.on("close", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[nexus/backend] Backend exited with code ${code}`);
    }
  });

  // Forward signals
  process.on("SIGINT", () => proc.kill("SIGINT"));
  process.on("SIGTERM", () => proc.kill("SIGTERM"));
}

const python = checkPython();
checkDeps(python);
startBackend(python);
