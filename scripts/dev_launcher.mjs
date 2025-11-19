#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

const isWindows = process.platform === 'win32';
const pythonExecutable = path.join(
  BACKEND_DIR,
  '.venv',
  isWindows ? 'Scripts' : 'bin',
  isWindows ? 'python.exe' : 'python'
);

const hostMessage = process.env.DEV_LAUNCHER_HOST_MESSAGE ??
  'Access the app on this machine at http://localhost:5173';
const apiBaseUrl = process.env.DEV_LAUNCHER_API_BASE_URL;

function npmCommand() {
  return isWindows ? 'npm.cmd' : 'npm';
}

function forwardOutput(label, child) {
  child.stdout?.on('data', (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`);
  });
  child.stderr?.on('data', (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`);
  });
}

function ensureBackendPython() {
  if (!existsSync(pythonExecutable)) {
    console.error('Could not find backend virtualenv python at', pythonExecutable);
    console.error('Run ./start_project.sh again to recreate the environment.');
    process.exit(1);
  }
}

function spawnBackend() {
  const args = ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'];
  const proc = spawn(pythonExecutable, args, {
    cwd: BACKEND_DIR,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });
  forwardOutput('backend', proc);
  return proc;
}

function spawnFrontend() {
  const args = ['run', 'dev', '--', '--host', '0.0.0.0', '--port', '5173'];
  const env = { ...process.env };
  if (apiBaseUrl) {
    env.VITE_API_BASE_URL = apiBaseUrl;
  }
  const proc = spawn(npmCommand(), args, {
    cwd: ROOT_DIR,
    stdio: ['inherit', 'pipe', 'pipe'],
    env,
  });
  forwardOutput('frontend', proc);
  return proc;
}

function main() {
  ensureBackendPython();
  console.log('Starting FastAPI backend...');
  const backendProc = spawnBackend();
  console.log('Starting Vite dev server...');
  const frontendProc = spawnFrontend();

  console.log(`\n${hostMessage}`);
  console.log('Press Ctrl+C to stop both servers.');

  const processes = [
    { label: 'backend', proc: backendProc },
    { label: 'frontend', proc: frontendProc },
  ];

  let shuttingDown = false;

  function shutdown(reason) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\nStopping development servers (${reason})...`);
    processes.forEach(({ proc }) => {
      if (!proc.killed) {
        proc.kill('SIGINT');
      }
    });
    setTimeout(() => {
      processes.forEach(({ proc }) => {
        if (!proc.killed) {
          proc.kill('SIGTERM');
        }
      });
    }, 4000);
  }

  process.on('SIGINT', () => shutdown('Ctrl+C'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  processes.forEach(({ label, proc }) => {
    proc.on('exit', (code, signal) => {
      if (!shuttingDown) {
        const reason = signal ? `${signal}` : `exit code ${code}`;
        console.error(`\n${label} stopped unexpectedly (${reason}).`);
        shutdown(`${label} stopped`);
      }
    });
  });

  Promise.all(processes.map(({ proc }) => new Promise((resolve) => proc.on('close', resolve))))
    .then(() => {
      console.log('Both servers have stopped.');
      process.exit(0);
    });
}

main();
