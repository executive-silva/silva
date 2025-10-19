import pkg from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import pino from "pino";
import chalk from "chalk";
import { loadPlugins, handleMessage } from "./handler.js";
import { setupSilvaSession } from "./lib/silvasession.js"; // ✅ new import

const {
  makeWASocket,
  useMultiFileAuthState,
  downloadContentFromMessage,
  fetchLatestBaileysVersion
} = pkg;

const __dirname = path.resolve();

// ✅ Global context info for forwarded bot messages
export const globalContextInfo = {
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: "120363200367779016@newsletter",
    newsletterName: "◢◤ Silva Tech Nexus ◢◤",
    serverMessageId: 144
  }
};

// ✅ Status Saver toggle
const STATUS_SAVER_ENABLED = process.env.Status_Saver === "true";

// ✅ Simple logger
function logMessage(type, msg) {
  const colors = {
    INFO: chalk.cyan,
    ERROR: chalk.red,
    SUCCESS: chalk.green,
    EVENT: chalk.yellow,
    DEBUG: chalk.gray
  };
  const fn = colors[type] || ((t) => t);
  console.log(fn(`[${type}]`), msg);
}

// ✅ Contact name resolver
function getContactName(sock, jid) {
  const contact = sock?.contacts?.[jid] || {};
  return (
    contact.notify ||
    contact.name ||
    contact.pushname ||
    jid?.split("@")[0] ||
    "Unknown"
  );
}

export async function silvaConnect() {
  try {
    // ✅ Try to setup Mega.nz session first
    await setupSilvaSession();
  } catch (err) {
    logMessage("ERROR", `Session setup failed: ${err.message}`);
    logMessage("INFO", "Falling back to QR authentication...");
  }

  const { state, saveCreds } = await useMultiFileAuthState("./sessions");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
    version,
    browser: ["Silva MD Pro", "Chrome", "4.0.0"]
  });

  // ---------- Cache system for anti-delete ----------
  const messageCache = new Map();
  const MAX_CACHE = 5000;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === "open") {
      logMessage("SUCCESS", "🟢 Connected to WhatsApp successfully!");

      logMessage(
        "INFO",
        STATUS_SAVER_ENABLED
          ? "🔄 Auto Status Saver: ENABLED"
          : "⏸️ Auto Status Saver: DISABLED"
      );

      try {
        const jid = sock.user.id.includes(":")
          ? `${sock.user.id.split(":")[0]}@s.whatsapp.net`
          : sock.user.id;

        await sock.sendMessage(jid, {
          text: `✅ *Silva MD Pro Connected!*\n\nAutomation, anti-delete & plugin system active.\nStatus Saver: ${STATUS_SAVER_ENABLED ? "ENABLED" : "DISABLED"}`,
          contextInfo: globalContextInfo
        });
      } catch (e) {
        logMessage("ERROR", `Welcome message failed: ${e.message}`);
      }

      // ✅ Auto-follow newsletters
      const newsletters = [
        "120363276154401733@newsletter",
        "120363200367779016@newsletter",
        "120363199904258143@newsletter"
      ];
      for (const nid of newsletters) {
        try {
          if (typeof sock.newsletterFollow === "function") {
            await sock.newsletterFollow(nid);
            logMessage("SUCCESS", `✅ Followed newsletter ${nid}`);
          } else {
            logMessage("DEBUG", `newsletterFollow() not available`);
          }
        } catch (err) {
          logMessage("ERROR", `Newsletter follow failed: ${err.message}`);
        }
      }
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === 401) {
        logMessage("ERROR", "🔴 Session invalid. Please update SESSION_ID.");
        try {
          fs.rmSync(path.join(__dirname, "sessions"), { recursive: true, force: true });
          logMessage("INFO", "🗑️ Cleared invalid session.");
        } catch (e) {
          logMessage("ERROR", `Failed to clear session: ${e.message}`);
        }
      }
      logMessage("ERROR", "🔴 Disconnected. Reconnecting in 5s...");
      setTimeout(() => silvaConnect(), 5000);
    }

    if (qr && !sock.authState.creds.registered) {
      logMessage("INFO", "📱 QR Code generated — scan to authenticate");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // ✅ Load plugins dynamically
  await loadPlugins();

  // ---------- Message handling ----------
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      if (!Array.isArray(messages) || messages.length === 0) return;

      for (const msg of messages) {
        if (!msg?.key) continue;

        // Cache all messages (for anti-delete)
        if (msg.message) {
          const cacheKey = `${msg.key.remoteJid}-${msg.key.id}`;
          messageCache.set(cacheKey, msg);
          if (messageCache.size > MAX_CACHE) {
            const firstKey = messageCache.keys().next().value;
            messageCache.delete(firstKey);
          }
        }

        // ✅ Handle status updates
        if (msg.key.remoteJid === "status@broadcast") {
          if (STATUS_SAVER_ENABLED) {
            const jid = msg.key.participant || msg.participant;
            const name = getContactName(sock, jid);
            logMessage("INFO", `👀 Status viewed from ${name}`);

            const inner =
              msg.message?.viewOnceMessageV2?.message ||
              msg.message?.viewOnceMessage?.message ||
              msg.message ||
              {};
            const msgType = Object.keys(inner)[0] || "";

            if (["imageMessage", "videoMessage", "audioMessage"].includes(msgType)) {
              const caption = `💾 *Saved Status From:* ${name}`;
              await saveMedia(inner, msgType, caption);
            }
          }
          continue;
        }

        // ✅ Dispatch message to handler system
        if (msg.message) await handleMessage(sock, msg);
      }
    } catch (err) {
      logMessage("ERROR", `messages.upsert crashed: ${err.message}`);
    }
  });

  // ---------- Anti-delete protection ----------
  sock.ev.on("messages.update", async (updates) => {
    for (const { key, update } of updates) {
      if (update?.message === null && !key.fromMe) {
        const cacheKey = `${key.remoteJid}-${key.id}`;
        const originalMsg = messageCache.get(cacheKey);
        if (!originalMsg) continue;

        const sender = key.participant || key.remoteJid;
        const msg = originalMsg.message;
        const type = Object.keys(msg)[0];

        await sock.sendMessage(sock.user.id, {
          text: `🚨 *Anti-Delete Triggered!*\n👤 *Sender:* ${sender}\n📎 *Recovered message below ↓*`,
          contextInfo: globalContextInfo
        });

        if (msg[type]?.caption || msg[type]?.text) {
          const text = msg[type].caption || msg[type].text;
          await sock.sendMessage(sock.user.id, { text });
        } else if (
          ["imageMessage", "videoMessage", "audioMessage", "stickerMessage"].includes(type)
        ) {
          const stream = await downloadContentFromMessage(
            msg[type],
            type.replace("Message", "")
          );
          let buffer = Buffer.from([]);
          for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
          await sock.sendMessage(sock.user.id, {
            [type.replace("Message", "")]: buffer,
            caption: msg[type]?.caption || ""
          });
        }
      }
    }
  });

  async function saveMedia(messageObj, msgType, caption) {
    const stream = await downloadContentFromMessage(
      messageObj[msgType],
      msgType.replace("Message", "")
    );
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const dir = path.join(__dirname, "status_saver");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const extMap = { imageMessage: "jpg", videoMessage: "mp4", audioMessage: "ogg" };
    const ext = extMap[msgType] || "bin";
    const file = path.join(dir, `${Date.now()}.${ext}`);
    fs.writeFileSync(file, buffer);
    logMessage("SUCCESS", `💾 Saved status -> ${file}`);
  }

  return sock;
}
