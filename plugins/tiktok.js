import axios from "axios";
import fs from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { globalContextInfo } from "../lib/silvaConnect.js";

const streamPipeline = promisify(pipeline);

const handler = async (m, { conn, args }) => {
  const chatId = m.chat || m.key?.remoteJid || m.key?.participant;

  try {
    if (!chatId) {
      console.error("❌ Invalid chatId. Message source not found.");
      return;
    }

    // Validate TikTok URL
    const url = args[0]?.match(/(https?:\/\/[^\s]+)/)?.[0];
    if (!url || !/tiktok\.com|vt\.tiktok\.com/.test(url)) {
      return conn.sendMessage(
        chatId,
        {
          text:
            "❌ *Invalid TikTok URL!*\n\nExample:\n`.tiktok https://vt.tiktok.com/ZSje1Vkup/`",
          contextInfo: globalContextInfo,
        },
        { quoted: m }
      );
    }

    // Notify user
    const loadingMsg = await conn.sendMessage(chatId, {
      text: "⏳ Fetching TikTok content...\nPlease wait a few seconds ⚡",
      contextInfo: globalContextInfo,
    });

    // List of working API sources
    const apis = [
      {
        name: "Tiklydown",
        url: `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`,
        parser: (d) =>
          d?.videoUrl
            ? {
                videoUrl: d.videoUrl.replace(/watermark=1/, "watermark=0"),
                author: d.author,
                stats: d.stats,
              }
            : null,
      },
      {
        name: "TikWM",
        url: `https://tikwm.com/api/?url=${encodeURIComponent(url)}`,
        parser: (d) =>
          d?.data?.play
            ? {
                videoUrl: d.data.play,
                author: d.data.author,
                stats: {
                  digg_count: d.data.digg_count,
                  comment_count: d.data.comment_count,
                },
              }
            : null,
      },
    ];

    let result = null;

    // Try each API
    for (const api of apis) {
      try {
        console.log(`[SilvaMD TikTok] Trying ${api.name}...`);
        const res = await axios.get(api.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36",
            Accept: "application/json",
          },
          timeout: 25000,
        });
        result = api.parser(res.data);
        if (result) {
          console.log(`[SilvaMD TikTok] Success with ${api.name}`);
          break;
        }
      } catch (err) {
        console.warn(`[SilvaMD TikTok] ${api.name} failed:`, err.message);
      }
    }

    if (!result) throw new Error("All download sources failed.");

    // Download video temporarily
    const tempFile = path.join(os.tmpdir(), `tiktok_${Date.now()}.mp4`);
    const videoRes = await axios({
      method: "get",
      url: result.videoUrl,
      responseType: "stream",
      timeout: 30000,
    });
    await streamPipeline(videoRes.data, fs.createWriteStream(tempFile));

    // Prepare caption
    const caption = `
🎬 *TikTok Video Downloaded!*

👤 *Author:* ${result.author?.nickname || "Unknown"}
❤️ *Likes:* ${result.stats?.digg_count || "N/A"}
💬 *Comments:* ${result.stats?.comment_count || "N/A"}
🔗 *Source:* ${url}

_⚡ Downloaded via Silva MD Pro_
    `.trim();

    // Delete loading message before sending video
    if (loadingMsg?.key) {
      await conn.sendMessage(chatId, { delete: loadingMsg.key });
    }

    // Send the video file
    await conn.sendMessage(
      chatId,
      {
        video: fs.readFileSync(tempFile),
        caption,
        contextInfo: {
          ...globalContextInfo,
          externalAdReply: {
            title: "TikTok Downloader",
            body: "Enjoy your video 🎵",
            thumbnailUrl: "https://files.catbox.moe/5uli5p.jpeg",
            sourceUrl: url,
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      },
      { quoted: m }
    );

    // Cleanup
    fs.unlinkSync(tempFile);
  } catch (error) {
    console.error("❌ TikTok Plugin Error:", error.message);

    await conn.sendMessage(
      chatId,
      {
        text:
          `⚠️ *Download Failed!*\nReason: ${error.message}\n\n` +
          `Possible causes:\n• Invalid or private video\n• Network timeout\n• API temporarily down`,
        contextInfo: globalContextInfo,
      },
      { quoted: m }
    );
  }
};

handler.help = ["tiktok", "tt", "ttdl"];
handler.tags = ["downloader"];
handler.command = ["tiktok", "tt", "ttdl", "tiktokdl"];

export default handler;
