/**
 * Dynamic Menu plugin for Silva MD Pro
 * Usage: !menu
 */

import pkg from "../../package.json" assert { type: "json" };

const handler = async (m, { conn, globalContextInfo }) => {
  try {
    const botName = global.botname || pkg.name || "Silva MD Pro";
    const allPlugins = Object.values(global.plugins || {});
    const totalPlugins = allPlugins.length;

    // Categorize commands by tag
    const tags = {};
    for (const plugin of allPlugins) {
      if (!plugin.help || !plugin.tags) continue;
      for (const tag of plugin.tags) {
        if (!tags[tag]) tags[tag] = [];
        tags[tag].push(...plugin.command);
      }
    }

    let menuText = `🎛️ *${botName.toUpperCase()} MENU*\n`;
    menuText += `━━━━━━━━━━━━━━━━━━━\n`;
    menuText += `📦 *Total Plugins:* ${totalPlugins}\n`;
    menuText += `💬 *Commands Loaded:* ${Object.values(tags).flat().length}\n`;
    menuText += `📅 *Date:* ${new Date().toLocaleString()}\n`;
    menuText += `━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const [tag, cmds] of Object.entries(tags)) {
      menuText += `🗂️ *${tag.toUpperCase()}*\n`;
      menuText += cmds.map(c => `• ${c}`).join("\n");
      menuText += `\n━━━━━━━━━━━\n`;
    }

    menuText += `🤖 *Prefix:* !\n`;
    menuText += `👑 *Owner:* ${global.owner?.[0] || "Not Set"}`;

    await conn.sendMessage(m.chat, {
      text: menuText,
      contextInfo: globalContextInfo
    });
  } catch (err) {
    console.error("MENU PLUGIN ERROR:", err);
    await conn.sendMessage(m.chat, {
      text: "❌ Failed to load menu. Check console logs.",
      contextInfo: globalContextInfo
    });
  }
};

handler.help = ["menu"];
handler.tags = ["main"];
handler.command = ["menu", "help"];

export default handler;
