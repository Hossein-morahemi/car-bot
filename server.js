const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cron = require("node-cron");

const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// لیست کامل خودروهای محبوب
const cars = [
  "ساینا","کوئیک","شاهین","دنا","تارا","پژو 207",
  "رانا","سورن","هایما S7","هایما S5",
  "جک J4","جک J7","آریزو 5","آریزو 6",
  "تیگو 7","تیگو 8","مزدا 3","کیا سراتو",
  "النترا","تویوتا کرولا","کمری","بنز A200"
];

// حذف قیمت‌های پرت
function removeOutliers(arr) {
  if (!arr.length) return arr;
  const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
  return arr.filter(p => p > avg*0.7 && p < avg*1.3);
}

// گرفتن قیمت از دیوار
async function getPriceFromDivar(carName) {
  try {
    const url = `https://divar.ir/s/tehran?q=${encodeURIComponent(carName)}`;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    const $ = cheerio.load(data);
    const prices = [];

    $(".kt-post-card__description").each((i, el) => {
      const text = $(el).text();
      const match = text.match(/\d{3,}/g);
      if (match) {
        const price = parseInt(match[0].replace(/,/g,""));
        if (!isNaN(price) && price>10000000) prices.push(price);
      }
    });

    const filtered = removeOutliers(prices);
    if (!filtered.length) return null;
    const avg = filtered.reduce((a,b)=>a+b,0)/filtered.length;
    return Math.round(avg);
  } catch (err) {
    console.log("خطا در دیوار:", carName, err.message);
    return null;
  }
}

// گرفتن قیمت از باما
async function getPriceFromBama(carName) {
  try {
    const url = `https://bama.ir/car?search=${encodeURIComponent(carName)}`;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);
    const prices = [];

    $(".bama-list-item-price").each((i, el) => {
      const text = $(el).text().replace(/\s|٬/g,"");
      const price = parseInt(text);
      if (!isNaN(price) && price>10000000) prices.push(price);
    });

    const filtered = removeOutliers(prices);
    if (!filtered.length) return null;
    const avg = filtered.reduce((a,b)=>a+b,0)/filtered.length;
    return Math.round(avg);
  } catch (err) {
    console.log("خطا در باما:", carName, err.message);
    return null;
  }
}

// گرفتن بهترین قیمت از چند منبع
async function getBestPrice(carName) {
  const divar = await getPriceFromDivar(carName);
  if (divar) return divar;
  const bama = await getPriceFromBama(carName);
  if (bama) return bama;
  return null;
}

// ارسال به تلگرام
async function sendAllPrices() {
  try {
    let message = "📊 لیست کامل قیمت بازار خودرو\n\n";

    for (const car of cars) {
      const price = await getBestPrice(car);
      if (price) {
        message += `🚗 ${car} : ${price.toLocaleString()} تومان\n`;
      }
    }

    if (message.trim() === "📊 لیست کامل قیمت بازار خودرو") return;

    console.log("پیام ساخته شد:\n", message);

    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      { chat_id: CHANNEL_ID, text: message }
    );

    console.log("ارسال شد ✅");
  } catch (err) {
    console.log("خطای ارسال:", err.message);
  }
}

// هر 5 دقیقه اجرا میشه
cron.schedule("*/5 * * * *", () => sendAllPrices());

app.get("/", (req,res)=>res.send("Bot Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server started"));
