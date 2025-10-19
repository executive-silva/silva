import { silvaConnect } from "./lib/silvaConnect.js";

// Start Silva MD Pro bot
async function startBot() {
  try {
    console.log("🚀 Starting Silva MD Pro...");
    await silvaConnect();
  } catch (error) {
    console.error("❌ Startup Error:", error);
    console.log("🔁 Retrying in 5 seconds...");
    setTimeout(startBot, 5000);
  }
}

startBot();
