import fs from "fs";
import path from "path";
import { globalContextInfo } from "../config.js";

const __dirname = path.resolve();
const plugins = new Map();

export async function loadPlugins() {
  try {
    const pluginDir = path.join(process.cwd(), "plugins");
    const files = fs.readdirSync(pluginDir).filter((f) => f.endsWith(".js"));
    plugins.clear();

    for (const file of files) {
      try {
        const pluginPath = path.join(pluginDir, file);
        const pluginUrl = `file://${pluginPath}`;
        const module = await import(`${pluginUrl}?update=${Date.now()}`);
        const plugin = module.default;

        // plugin should be a function with attached metadata properties
        if (plugin && plugin.command) {
          // store by filename key (or by command list) — we just keep the function
          plugins.set(file, plugin);
          console.log(`[PLUGIN] Loaded ${file}`);
        } else {
          console.log(`[PLUGIN] Skipped ${file} (no command metadata)`);
        }
      } catch (err) {
        console.error(`[PLUGIN ERROR] Failed to load ${file}: ${err.message}`);
      }
    }

    console.log(`[INFO] Total plugins loaded: ${plugins.size}`);
  } catch (err) {
    console.error("[ERROR] Failed to load plugins:", err);
  }
}

export async function handleMessage(sock, m) {
  try {
    const text =
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      "";
    if (!text) return;

    const prefix = text.startsWith("!") ? "!" : text.startsWith(".") ? "." : "";
    if (!prefix) return;

    const [cmd, ...rest] = text.slice(prefix.length).trim().split(/\s+/);
    const command = cmd.toLowerCase();

    // find plugin that handles this command
    let plugin = null;
    for (const p of plugins.values()) {
      if (Array.isArray(p.command) && p.command.includes(command)) {
        plugin = p;
        break;
      }
      // also support single string
      if (typeof p.command === "string" && p.command === command) {
        plugin = p;
        break;
      }
    }

    if (!plugin) return;

    // Call plugin and pass useful context, including globalContextInfo
    await plugin(m, {
      conn: sock,
      args: rest,
      text: rest.join(" "),
      command,
      prefix,
      globalContextInfo
    });
  } catch (err) {
    console.error("[PLUGIN ERROR]:", err);
  }
}
