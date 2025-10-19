import fs from "fs";
import path from "path";
import chalk from "chalk";

const __dirname = path.resolve();

// Simple colored log helper
function log(type, msg) {
  const colors = {
    INFO: chalk.cyan,
    SUCCESS: chalk.green,
    ERROR: chalk.red,
  };
  console.log((colors[type] || ((x) => x))(`[${type}]`), msg);
}

/**
 * Downloads Silva session from Mega.nz using SESSION_ID
 * Expected format: SESSION_ID=Silva~<mega_code>
 */
export async function setupSilvaSession() {
  const sessionPath = path.join(__dirname, "sessions", "creds.json");

  if (fs.existsSync(sessionPath)) {
    log("INFO", "✅ Existing Silva session found, skipping download.");
    return sessionPath;
  }

  if (!process.env.SESSION_ID || !process.env.SESSION_ID.startsWith("Silva~")) {
    throw new Error("Missing or invalid SESSION_ID. It must start with 'Silva~'");
  }

  const megaCode = process.env.SESSION_ID.replace("Silva~", "");
  log("INFO", "⬇ Downloading Silva session from Mega.nz...");

  try {
    const { File } = await import("megajs");

    const file = File.fromURL(`https://mega.nz/file/${megaCode}`);
    await file.loadAttributes();

    const buffer = await file.downloadBuffer();
    fs.mkdirSync(path.join(__dirname, "sessions"), { recursive: true });
    fs.writeFileSync(sessionPath, buffer);

    log("SUCCESS", "✅ Silva session downloaded and saved.");
    return sessionPath;
  } catch (error) {
    log("ERROR", `❌ Failed to download Silva session: ${error.message}`);
    throw error;
  }
}
