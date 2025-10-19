/**
 * Uptime plugin for Silva MD Pro
 * Usage: !uptime
 */

const handler = async (m, { conn, globalContextInfo }) => {
  try {
    const uptime = process.uptime();
    const hrs = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);
    const secs = Math.floor(uptime % 60);

    const msg = `⏰ *Bot Uptime:* ${hrs}h ${mins}m ${secs}s`;

    await conn.sendMessage(m.chat, {
      text: msg,
      contextInfo: globalContextInfo
    });
  } catch (err) {
    console.error("UPTIME PLUGIN ERROR:", err);
    await conn.sendMessage(m.chat, {
      text: "❌ Could not fetch uptime.",
      contextInfo: globalContextInfo
    });
  }
};

handler.help = ["uptime"];
handler.tags = ["info"];
handler.command = ["uptime"];

export default handler;
