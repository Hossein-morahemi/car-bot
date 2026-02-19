const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cron = require("node-cron");

const app = express();

const BOT_TOKEN = "8028245113:AAErirbIUd3crpBid1QtATC8LXeii1Ko7Mw";
const CHANNEL_ID = "@gheymat_khodroo";


async function scrapeAndSend() {
  try {
    const { data } = await axios.get("https://t.me/s/saipanewpage");

    const $ = cheerio.load(data);
    const messages = $(".tgme_widget_message_text");

    const lastMessage = messages.last().html();
    if (!lastMessage) return;

    const text = lastMessage
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, "");

    const lines = text.split("\n").filter(l => l.includes("⬅️"));

    let finalMessage = "📊 لیست قیمت خودرو\n\n";

    lines.forEach(line => {
      finalMessage += "🚗 " + line.trim() + "\n";
    });

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHANNEL_ID,
      text: finalMessage
    });

    console.log("ارسال شد ✅");
  } catch (err) {
    console.log("خطا:", err.message);
  }
}

// هر 10 دقیقه اجرا میشه
cron.schedule("*/5 * * * *", () => {
  scrapeAndSend();
});

app.get("/", (req, res) => {
  res.send("Bot is running...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started...");
});
