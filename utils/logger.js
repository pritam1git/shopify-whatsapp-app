// utils/logger.js
import fs from "fs";
import path from "path";

const logFile = path.join(process.cwd(), "logs.txt");

export function appendLog(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

// optional helpers
export function info(msg) {
  appendLog(`INFO: ${msg}`);
}
export function error(msg) {
  appendLog(`ERROR: ${msg}`);
}
export function warn(msg) {
  appendLog(`WARN: ${msg}`);
}
