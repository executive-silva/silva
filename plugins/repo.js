// plugins/repo.js
import axios from "axios";
import moment from "moment";
import { globalContextInfo } from "../lib/silvaConnect.js";

const handler = async (m, { conn }) => {
  try {
    // Always resolve correct chat ID
    const chatId = m.chat || m.key?.remoteJid || m.key?.participant;
    if (!chatId) {
      console.error("❌ Invalid chatId. Message source not found.");
      return;
    }

    const repoOwner = "SilvaTechB";
    const repoName = "silva-md-bot";
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}`;

    // Send loading message safely
    const loadingMsg = await conn.sendMessage(chatId, {
      text: "🔄 Fetching repository details...",
      contextInfo: globalContextInfo,
    });

    // Fetch repo info
    const { data } = await axios.get(apiUrl);
    const {
      stargazers_count,
      forks_count,
      updated_at,
      html_url,
      description,
      language,
      open_issues,
      license,
      size,
    } = data;

    const lastUpdated = moment(updated_at).fromNow();

    const asciiArt = `
███████╗██╗██╗     ██╗   ██╗ █████╗ 
██╔════╝██║██║     ██║   ██║██╔══██╗
███████╗██║██║     ██║   ██║███████║
╚════██║██║██║     ██║   ██║██╔══██║
███████║██║███████╗╚██████╔╝██║  ██║
╚══════╝╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝
`;

    const repoInfo = `
*✨ SILVA MD BOT REPOSITORY*

${asciiArt}

📦 *Repository:* [${repoName}](${html_url})
📝 *Description:* ${description || "No description provided"}

🌟 *Stars:* ${stargazers_count}
🍴 *Forks:* ${forks_count}
💻 *Language:* ${language || "Unknown"}
📦 *Size:* ${(size / 1024).toFixed(1)} MB
📜 *License:* ${license?.name || "None"}
⚠️ *Open Issues:* ${open_issues}
🕒 *Last Updated:* ${lastUpdated}

⚡ *Powered by Silva Tech Inc*
`;

    // Delete loading message
    if (loadingMsg?.key) {
      await conn.sendMessage(chatId, { delete: loadingMsg.key });
    }

    // Send repository info card
    await conn.sendMessage(
      chatId,
      {
        image: { url: "https://files.catbox.moe/5uli5p.jpeg" },
        caption: repoInfo,
        contextInfo: {
          ...globalContextInfo,
          externalAdReply: {
            title: "GitHub Repository",
            body: "Explore the codebase!",
            thumbnailUrl: "https://files.catbox.moe/5uli5p.jpeg",
            sourceUrl: html_url,
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      },
      { quoted: m }
    );
  } catch (error) {
    console.error("❌ Repo Plugin Error:", error);
    const chatId = m.chat || m.key?.remoteJid || m.key?.participant;
    await conn.sendMessage(
      chatId,
      {
        text: "❌ Failed to fetch repo details. Please try again later.",
        contextInfo: globalContextInfo,
      },
      { quoted: m }
    );
  }
};

handler.help = ["repo", "repository", "github"];
handler.tags = ["info"];
handler.command = ["repo", "repository", "github"];

export default handler;
