const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cron = require("node-cron");

const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// لیست کامل خودروها
const cars = [
  "ساینا","کوئیک","شاهین","دنا","تارا","پژو 207",
  "رانا","سورن","هایما S7","هایما S5",
  "جک J4","جک J7","آریزو 5","آریزو 6",
  "تیگو 7","تیگو 8","مزدا 3","کیا سراتو",
  "النترا","تویوتا کرولا","کمری","بنز A200"
];

function removeOutliers(arr) {
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.filter(p => p > avg * 0.7 && p < avg * 1.3);
}

async function getPrice(carName) {
  try {
    const url = `https://divar.ir/s/tehran?q=${encodeURIComponent(carName)}`;
    
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);
    const prices = [];

    $(".kt-post-card__description").each((i, el) => {
      const text = $(el).text();
      const match = text.match(/\d{3,}/g);
      if (match) {
        const price = parseInt(match[0].replace(/,/g, ""));
        if (!isNaN(price) && price > 100000000) {
          prices.push(price);
        }
      }
    });

    if (prices.length < 3) return null;

    const filtered = removeOutliers(prices);
    const avg =
      filtered.reduce((a, b) => a + b, 0) / filtered.length;

    return Math.round(avg);

  } catch (err) {
    console.log("خطا در گرفتن قیمت:", carName);
    return null;
  }
}

async function sendAllPrices() {
  try {
    let message = "📊 لیست کامل قیمت بازار خودرو\n\n";

    for (const car of cars) {
      const price = await getPrice(car);
      if (price) {
        message += `🚗 ${car} : ${price.toLocaleString()} تومان\n`;
      }
    }

    if (message.length < 50) return;

    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHANNEL_ID,
        text: message
      }
    );

    console.log("ارسال کامل شد ✅");

  } catch (err) {
    console.log("خطای ارسال:", err.message);
  }
}

// هر 5 دقیقه
cron.schedule("*/5 * * * *", () => {
  sendAllPrices();
});

app.get("/", (req, res) => {
  res.send("Bot Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started"));
