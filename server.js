import fetch from "node-fetch";

// دریافت توکن و کانال از Environment Variables
const BOT_TOKEN = "8028245113:AAErirbIUd3crpBid1QtATC8LXeii1Ko7Mw";
const CHANNEL_ID = "@gheymat_khodroo";

// تابع ارسال پیام به تلگرام
async function sendToTelegram(messages) {
  const tgApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: CHANNEL_ID,
    text: messages.join("\n"),
  };
  await fetch(tgApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// تابع اصلی: دریافت قیمت‌ها و ارسال پیام
async function handleRequest(env) {
  const messages = [];
  try {
    // فرض: متن آخرین پیام کانال saipanewpage
    const channelUrl = "https://t.me/saipanewpage";
    const response = await fetch(channelUrl);
    const text = await response.text();

    // جدا کردن خطوط حاوی قیمت
    const lines = text.split("\n").filter(l => l.includes("⬅️"));

    for (const line of lines) {
      const [name, pricePart] = line.split("⬅️");
      if (!name || !pricePart) continue;

      // استخراج اولین عدد (تومان)
      const match = pricePart.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
      if (!match) continue;

      const currentPrice = parseFloat(match[1]);

      // گرفتن آخرین قیمت از KV
      const lastPriceStr = await env.CAR_KV.get(name.trim());
      const lastPrice = lastPriceStr ? parseFloat(lastPriceStr) : null;

      // تعیین روند
      let trend = "";
      if (lastPrice !== null) {
        trend = currentPrice > lastPrice ? "🟢" :
                currentPrice < lastPrice ? "🔴" : "⚪️";
      }

      // ذخیره قیمت جدید در KV
      await env.CAR_KV.put(name.trim(), currentPrice.toString());

      // اضافه کردن به پیام
      const formattedPrice = new Intl.NumberFormat("en-US").format(currentPrice);
      messages.push(`${trend} ${name.trim()}: ${formattedPrice} تومان`);
    }

    // ارسال پیام اگر چیزی وجود داشته باشه
    if (messages.length > 0) {
      await sendToTelegram(messages);
    }
  } catch (err) {
    console.error("خطا در دریافت یا ارسال قیمت‌ها:", err);
    await sendToTelegram(["⚠️ خطا در دریافت قیمت خودروها"]);
  }
}

// Handler برای Railway (HTTP + Scheduled)
export default {
  async fetch(request, env, ctx) {
    await handleRequest(env);
    return new Response("Bot executed");
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleRequest(env));
  }
};
