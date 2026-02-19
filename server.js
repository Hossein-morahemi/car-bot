const express = require("express");
const axios = require("axios");
const cron = require("node-cron");

const app = express();

// ======================
// Telegram Bot Settings
// ======================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// ======================
// خودروها و قیمت کارخانه‌ای به تومان
// ======================
const cars = [
  { brand: "سایپا", type: "داخلی", model: "ساینا", price: 929_000_000 },
  { brand: "سایپا", type: "داخلی", model: "ساینا دوگانه", price: 993_000_000 },
  { brand: "ایران خودرو", type: "داخلی", model: "سهند", price: 1_068_000_000 },
  { brand: "ایران خودرو", type: "داخلی", model: "سهند اتو", price: 1_295_000_000 },
  { brand: "هایما", type: "چینی", model: "S5", price: 2_780_000_000 },
  { brand: "هایما", type: "چینی", model: "S7", price: 3_145_000_000 },
  { brand: "جک", type: "چینی", model: "J7", price: 3_380_000_000 },
  { brand: "تویوتا", type: "وارداتی", model: "لندکروز", price: 42_700_000_000 },
  { brand: "بنز", type: "وارداتی", model: "A200", price: 10_250_000_000 },
  // ... همه خودروها رو میتونی اضافه کنی
];

// ======================
// ذخیره قیمت قبلی برای محاسبه افزایش/کاهش
// استفاده از یک شی ساده، میتونی با KV Cloud هم جایگزین کنی
// ======================
let lastPrices = {};

// ======================
// ساخت پیام مرتب و حرفه‌ای
// ======================
function buildMessage(carsList) {
  let message = "📊 لیست قیمت خودروها (کارخانه‌ای)\n\n";

  const categories = ["داخلی","چینی","وارداتی"];
  categories.forEach(cat => {
    const catCars = carsList.filter(c => c.type === cat);
    if(catCars.length){
      message += `🏷️ ${cat}:\n`;
      catCars.forEach(c => {
        let trend = "⚪️"; // ⚪️ بدون تغییر
        if(lastPrices[c.model] !== undefined){
          trend = c.price > lastPrices[c.model] ? "🟢" : c.price < lastPrices[c.model] ? "🔴" : "⚪️";
        }
        message += `🚗 ${c.model} : ${c.price.toLocaleString()} تومان ${trend}\n`;
        lastPrices[c.model] = c.price;
      });
      message += "\n";
    }
  });

  return message;
}

// ======================
// ارسال به تلگرام
// ======================
async function sendPrices() {
  try {
    const message = buildMessage(cars);
    console.log("پیام ساخته شد:\n", message);

    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      { chat_id: CHANNEL_ID, text: message }
    );

    console.log("✅ پیام با موفقیت ارسال شد!");
  } catch (err) {
    console.log("❌ خطا در ارسال پیام:", err.message);
  }
}

// ======================
// کرون برای ارسال خودکار هر 5 دقیقه
// ======================
cron.schedule("*/2 * * * *", () => sendPrices());

// ======================
// سرور Express برای بررسی وضعیت
// ======================
app.get("/", (req,res)=>res.send("🚀 ربات خودرو در حال اجرا است!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Server started on port ${PORT}`));
