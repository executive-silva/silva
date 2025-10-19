import axios from "axios";
import ytSearch from "yt-search";
import { globalContextInfo } from "../lib/silvaConnect.js";

const handler = async (m, { conn, args }) => {
  try {
    const text = args.join(" ");
    const chatId =
      m.key?.remoteJid ||
      m.chat ||
      (m.message?.extendedTextMessage?.contextInfo?.participant ?? m.participant);

    if (!text) {
      return conn.sendMessage(chatId, {
        text: "❌ What song do you want to download?\n\nExample: *.play lonely*",
        contextInfo: globalContextInfo,
      });
    }

    await conn.sendMessage(chatId, {
      text: "🔄 *Silva MD Bot fetching your audio... Please wait...*",
      contextInfo: globalContextInfo,
    });

    // Search YouTube
    const search = await ytSearch(text);
    if (!search.videos.length) {
      return conn.sendMessage(chatId, {
        text: "❌ No results found. Please refine your search.",
        contextInfo: globalContextInfo,
      });
    }

    const video = search.videos[0];
    const link = video.url;

    const apis = [
      `https://apis.davidcyriltech.my.id/download/ytmp3?url=${link}`,
      `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${link}`,
      `https://api.akuari.my.id/downloader/youtubeaudio?link=${link}`,
    ];

    let audioUrl = null;
    let songData = null;

    // Try the APIs in sequence
    for (const api of apis) {
      try {
        const { data } = await axios.get(api);
        if (data.status === 200 || data.success || data.result) {
          audioUrl =
            data.result?.downloadUrl ||
            data.url ||
            data.result?.url ||
            data.result?.audio;
          songData = {
            title: data.result?.title || video.title,
            artist: data.result?.author || video.author?.name || "Unknown Artist",
            thumbnail: data.result?.image || video.thumbnail,
            videoUrl: link,
          };
          break;
        }
      } catch (err) {
        console.error(`API Error (${api}):`, err.message);
        continue;
      }
    }

    if (!audioUrl || !songData) {
      return conn.sendMessage(chatId, {
        text: "⚠️ All download servers failed or returned no result. Try again later.",
        contextInfo: globalContextInfo,
      });
    }

    // Send metadata and thumbnail
    await conn.sendMessage(chatId, {
      image: { url: songData.thumbnail },
      caption: `🎶 *${songData.title}*\n🎤 ${songData.artist}\n\n🎧 Your audio is on the way!\n\n*Powered by Silva MD Pro*`,
      contextInfo: globalContextInfo,
    });

    await conn.sendMessage(chatId, {
      text: "📤 *Sending your audio...*",
      contextInfo: globalContextInfo,
    });

    // Send playable audio
    await conn.sendMessage(chatId, {
      audio: { url: audioUrl },
      mimetype: "audio/mpeg",
      fileName: `${songData.title.replace(/[^a-zA-Z0-9 ]/g, "")}.mp3`,
      contextInfo: globalContextInfo,
    });

    // Optional document version
    await conn.sendMessage(chatId, {
      document: { url: audioUrl },
      mimetype: "audio/mpeg",
      fileName: `${songData.title.replace(/[^a-zA-Z0-9 ]/g, "")}.mp3`,
      contextInfo: globalContextInfo,
    });

    await conn.sendMessage(chatId, {
      text: "✅ *Silva MD Pro successfully sent your requested song!* 🎶",
      contextInfo: globalContextInfo,
    });
  } catch (error) {
    console.error("Music plugin error:", error);
    const chatId =
      m.key?.remoteJid ||
      m.chat ||
      (m.message?.extendedTextMessage?.contextInfo?.participant ?? m.participant);
    await conn.sendMessage(chatId, {
      text: `❌ *Download failed!*\n${error.message}`,
      contextInfo: globalContextInfo,
    });
  }
};

handler.help = ["play <song name>"];
handler.tags = ["music", "media"];
handler.command = ["play", "music"];
handler.private = false;

export default handler;
