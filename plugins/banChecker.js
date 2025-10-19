import { globalContextInfo } from "../lib/silvaConnect.js";

const handler = async (m, { conn, text, command, prefix }) => {
  try {
    const chatId =
      m.key?.remoteJid ||
      m.chat ||
      (m.message?.extendedTextMessage?.contextInfo?.participant ??
        m.participant ??
        ""); // fallback for broadcast or group
    if (!chatId || !chatId.endsWith("@s.whatsapp.net") && !chatId.endsWith("@g.us")) {
      console.error("Invalid chatId:", chatId);
      return;
    }

    if (!text)
      return conn.sendMessage(chatId, {
        text: `❌ Please provide a phone number!\n\nExample:\n${prefix + command} 91xxxxxxxxxx`,
        contextInfo: globalContextInfo,
      });

    const phoneNumber = text.replace(/[^0-9]/g, "");
    if (phoneNumber.length < 10)
      return conn.sendMessage(chatId, {
        text: `❌ Invalid phone number!\n\nExample:\n${prefix + command} 91xxxxxxxxxx`,
        contextInfo: globalContextInfo,
      });

    await conn.sendMessage(chatId, {
      text: `🔍 Checking ban status for: +${phoneNumber}...\n⏳ Please wait...`,
      contextInfo: globalContextInfo,
    });

    // Perform the ban check
    const result = await conn.xeonBanChecker(phoneNumber);
    const resultData = typeof result === "string" ? JSON.parse(result) : result;

    let msgOut = `📱 *BAN STATUS CHECK*\n\n📞 *Number:* +${resultData.number}\n\n`;

    if (resultData.isBanned) {
      msgOut += `🚫 *STATUS:* BANNED*\n\n⚠️ *Details:*\n`;
      msgOut += `• Violation: ${resultData.data?.violation_type || "Unknown"}\n`;
      msgOut += `• Can Appeal: ${
        resultData.data?.in_app_ban_appeal ? "Yes" : "No"
      }\n`;
      if (resultData.data?.appeal_token) {
        msgOut += `• Appeal Token: \`${resultData.data.appeal_token}\`\n`;
      }
      msgOut += `\n💡 *Tip:* Use official WhatsApp to appeal the ban.`;
    } else if (resultData.isNeedOfficialWa) {
      msgOut += `🔒 *STATUS:* RESTRICTED*\n\n⚠️ *Reason:* Must use Official WhatsApp.\n`;
      msgOut += `💡 *Tip:* Switch to the official WhatsApp app.`;
    } else {
      msgOut += `✅ *STATUS:* CLEAN*\n\n🎉 Number is *NOT BANNED*.\n`;
      msgOut += `✅ Safe to use with any WhatsApp.`;
    }

    await conn.sendMessage(chatId, {
      text: msgOut,
      contextInfo: globalContextInfo,
    });
  } catch (error) {
    console.error("Ban check error:", error);
    const chatId =
      m.key?.remoteJid ||
      m.chat ||
      (m.message?.extendedTextMessage?.contextInfo?.participant ??
        m.participant ??
        "");
    if (chatId)
      await conn.sendMessage(chatId, {
        text: `❌ Error checking ban status!\nPlease try again later or contact support.`,
        contextInfo: globalContextInfo,
      });
  }
};

handler.help = ["checkban"];
handler.tags = ["tools", "utility"];
handler.command = ["checkban"];

export default handler;
