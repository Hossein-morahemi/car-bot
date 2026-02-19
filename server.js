import fetch from "node-fetch";

const BOT_TOKEN = "8028245113:AAErirbIUd3crpBid1QtATC8LXeii1Ko7Mw";
const CHANNEL_ID = "@gheymat_khodroo";

async function sendToTelegram(messages) {
  const tgApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(tgApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHANNEL_ID, text: messages.join("\n") }),
  });
}

async function handleRequest(env) {
  const messages = [];
  try {
    const cars = [
      { name: "ساینا", price: 929000000 },
      { name: "سورن(XU7P)", price: 1287000000 },
      { name: "شاهین دنده", price: 1523000000 },
    ];

    for (const car of cars) {
      const lastPriceStr = await env.CAR_KV.get(car.name);
      const lastPrice = lastPriceStr ? parseFloat(lastPriceStr) : null;

      let trend = "";
      if (lastPrice !== null) {
        trend = car.price > lastPrice ? "🟢" :
                car.price < lastPrice ? "🔴" : "⚪️";
      }

      await env.CAR_KV.put(car.name, car.price.toString());

      const formattedPrice = new Intl.NumberFormat("en-US").format(car.price);
      messages.push(`${trend} ${car.name}: ${formattedPrice} تومان`);
    }

    if (messages.length > 0) {
      await sendToTelegram(messages);
    }
  } catch (err) {
    console.error("خطا:", err);
    await sendToTelegram(["⚠️ خطا در ارسال پیام"]);
  }
}

export default {
  async fetch(request, env, ctx) {
    await handleRequest(env);
    return new Response("Bot executed");
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleRequest(env));
  }
};
