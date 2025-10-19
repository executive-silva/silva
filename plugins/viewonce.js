/**
 * View Once Revealer Plugin for Silva MD Pro
 * Usage: !viewonce (reply to a view-once image or video)
 */

import fs from "fs";
import path from "path";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";

const handler = async (m, { conn, globalContextInfo }) => {
  try {
    const target = m.chat || m.key?.remoteJid;
    const ownerNumber = conn.user?.id || "self@s.whatsapp.net";

    if (!m.quoted) {
      return await conn.sendMessage(target, {
        text: "🕵️ Reply to a *view-once* image or video with `!viewonce`",
        contextInfo: globalContextInfo
      });
    }

    // Get the quoted message object
    const quoted = await m.getQuotedObj ? await m.getQuotedObj() : m.quoted;

    // Support both viewOnceMessageV2 and viewOnceMessageV2Extension
    const viewOnceMsg =
      quoted?.message?.viewOnceMessageV2 ||
      quoted?.message?.viewOnceMessageV2Extension ||
      quoted?.message?.viewOnceMessage;

    if (!viewOnceMsg) {
      return await conn.sendMessage(target, {
        text: "⚠️ The replied message is not a *view-once* message.",
        contextInfo: globalContextInfo
      });
    }

    // Get the inner message (actual image/video message)
    const innerMessage = viewOnceMsg?.message || {};
    const messageType = Object.keys(innerMessage)[0];

    if (!messageType) {
      return await conn.sendMessage(target, {
        text: "❌ Could not identify media type in the view-once message.",
        contextInfo: globalContextInfo
      });
    }

    const mediaMessage = innerMessage[messageType];
    const stream = await downloadContentFromMessage(mediaMessage, messageType.replace("Message", ""));
    let buffer = Buffer.from([]);

    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    if (!buffer.length) {
      return await conn.sendMessage(target, {
        text: "⚠️ Failed to download view-once media.",
        contextInfo: globalContextInfo
      });
    }

    // Save temporarily
    const ext = messageType.includes("video") ? ".mp4" : ".jpg";
    const filePath = path.join("./temp", `revealed_${Date.now()}${ext}`);
    fs.writeFileSync(filePath, buffer);

    // Send revealed media to connected number
    await conn.sendMessage(ownerNumber, {
      [messageType]: { url: filePath },
      caption: `🔓 *View Once Revealed!*\n\n📍 From: ${m.sender}\n💬 Chat: ${m.chat}`,
      contextInfo: globalContextInfo
    });

    // Respond "Seen" in original chat
    await conn.sendMessage(target, {
      text: "✅ Seen",
      contextInfo: globalContextInfo
    });

    // Cleanup
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 8000);
  } catch (err) {
    console.error("ViewOnce Plugin Error:", err);
    const target = m.chat || m.key?.remoteJid;
    try {
      await conn.sendMessage(target, {
        text: "❌ Error revealing view-once message.",
        contextInfo: globalContextInfo
      });
    } catch (_) {}
  }
};

handler.help = ["viewonce"];
handler.tags = ["media"];
handler.command = ["viewonce"];

export default handler;
