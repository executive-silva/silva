/**
 * 🌍 IP Tracker Plugin for Silva MD Pro
 * Usage: !trackip <ip>
 * Description: Tracks and displays detailed information about an IP address.
 */

import axios from "axios";
import { globalContextInfo } from "../lib/silvaConnect.js";

const handler = async (m, { conn, args }) => {
  const chatId =
    m.key?.remoteJid ||
    m.chat ||
    (m.message?.extendedTextMessage?.contextInfo?.participant ?? m.participant);

  try {
    const ip = args[0];

    if (!ip) {
      return conn.sendMessage(chatId, {
        text: "❌ Please provide an IP address.\n\nExample: *.trackip 8.8.8.8*",
        contextInfo: globalContextInfo,
      });
    }

    if (ip === "0.0.0.0") {
      return conn.sendMessage(chatId, {
        text: "🚫 That IP address is invalid for tracking.",
        contextInfo: globalContextInfo,
      });
    }

    await conn.sendMessage(chatId, {
      text: "🔍 *Silva MD Pro is tracking the IP... Please wait...*",
      contextInfo: globalContextInfo,
    });

    // Two API sources for redundancy
    const apiKey = "8fd0a436e74f44a7a3f94edcdd71c696";
    const geoUrl = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}`;
    const whoUrl = `https://ipwho.is/${ip}`;

    const [geoResponse, whoResponse] = await Promise.all([
      axios.get(geoUrl),
      axios.get(whoUrl),
    ]);

    const geo = geoResponse.data;
    const who = whoResponse.data;

    if (!geo || !geo.ip) {
      throw new Error("Invalid response from geolocation API.");
    }

    const country = geo.country_name || who.country || "Unknown";
    const city = geo.city || who.city || "N/A";
    const isp = geo.isp || who.connection?.isp || "Unknown";
    const organization = geo.organization || who.connection?.org || "N/A";
    const latitude = geo.latitude || who.latitude || "N/A";
    const longitude = geo.longitude || who.longitude || "N/A";
    const flag = geo.country_flag || "🏳️";

    const mapUrl = `https://www.google.com/maps/place/${latitude},${longitude}`;

    // Send formatted report
    const report = `
🌐 *SILVA MD PRO - IP Tracker*
───────────────────────────────
📍 *IP Address:* ${ip}
🏳️ *Country:* ${country} ${flag}
🏙️ *City:* ${city}
🏢 *Organization:* ${organization}
🌐 *ISP:* ${isp}
📌 *Latitude:* ${latitude}
📌 *Longitude:* ${longitude}

🗺️ *Google Maps:* ${mapUrl}
───────────────────────────────
⚙️ *Powered by SilvaTech Nexus APIs*
    `;

    await conn.sendMessage(chatId, {
      text: report.trim(),
      contextInfo: globalContextInfo,
    });
  } catch (error) {
    console.error("TrackIP plugin error:", error);
    await conn.sendMessage(
      m.key?.remoteJid ||
        m.chat ||
        (m.message?.extendedTextMessage?.contextInfo?.participant ??
          m.participant),
      {
        text: `❌ *IP Tracking failed!*\n\nError: ${error.message}`,
        contextInfo: globalContextInfo,
      }
    );
  }
};

handler.help = ["trackip <ip>"];
handler.tags = ["tools", "network"];
handler.command = ["trackip", "iplookup", "ipinfo"];
handler.private = false;

export default handler;
