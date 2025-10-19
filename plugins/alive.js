/**
 * Alive plugin for Silva MD Pro
 * Usage: !alive
 */

const handler = async (m, { conn, globalContextInfo }) => {
  try {
    const uptime = process.uptime();
    const hrs = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);
    const secs = Math.floor(uptime % 60);

    const aliveMsg = `🧠 *Silva MD Pro is Alive!*

💡 *Status:* Online and operational
🕐 *Uptime:* ${hrs}h ${mins}m ${secs}s
📅 *Date:* ${new Date().toLocaleString()}
👑 *Bot Owner:* ${global.owner?.[0] || "Unknown"}
`;

    await conn.sendMessage(m.chat, {
      text: aliveMsg,
      contextInfo: globalContextInfo
    });
  } catch (err) {
    console.error("ALIVE PLUGIN ERROR:", err);
    await conn.sendMessage(m.chat, {
      text: "❌ Failed to check alive status.",
      contextInfo: globalContextInfo
    });
  }
};

handler.help = ["alive"];
handler.tags = ["info"];
handler.command = ["alive"];

export default handler;
