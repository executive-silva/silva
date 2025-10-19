/**
 * Ping plugin for Silva MD Pro
 * Usage: !ping
 */

const handler = async (m, { conn, globalContextInfo }) => {
  try {
    const start = Date.now();

    // Optional: send a temporary "pinging" message (we use m.chat / m.key.remoteJid)
    const target = m.chat || m.key?.remoteJid;

    await conn.sendMessage(target, {
      text: "🏓 Pinging...",
      contextInfo: globalContextInfo
    });

    const end = Date.now();
    const ping = end - start;

    await conn.sendMessage(target, {
      text: `✅ Pong! *${ping}ms*`,
      contextInfo: globalContextInfo
    });
  } catch (err) {
    console.error("Ping plugin error:", err);
    const target = m.chat || m.key?.remoteJid;
    try {
      await conn.sendMessage(target, {
        text: "❌ Ping failed. Something went wrong.",
        contextInfo: globalContextInfo
      });
    } catch (_) {}
  }
};

handler.help = ["ping"];
handler.tags = ["tools"];
handler.command = ["ping"];

export default handler;
