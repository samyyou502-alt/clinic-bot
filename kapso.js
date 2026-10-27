// بوت واتساب لعيادة الأسنان عن طريق Kapso — بيشتغل على Vercel
const crypto = require("crypto");

// ====== عدّل البيانات دي ======
const CLINIC = {
  doctor: "د. [اسم الدكتور]",
  address: "[عنوان العيادة]",
  hours: "السبت إلى الخميس، من 4 م إلى 10 م. الجمعة إجازة.",
};
// ==============================

const API = "https://api.kapso.ai/meta/whatsapp/v24.0";

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[؟?!.,،:]/g, " ");

const MENU =
  "أهلاً بيك في مركز " + CLINIC.doctor + " لطب الأسنان.\n" +
  "اسألني عن: المواعيد، العنوان، الخدمات، الأسعار.\n" +
  "ولو عايز تحجز اكتب: احجز";

const BOOKING_TEMPLATE =
  "تمام، ابعت بيانات الحجز في رسالة واحدة بالشكل ده:\n\n" +
  "الاسم: \nالخدمة: \nاليوم: \nالساعة: ";

const FAQ = [
  { k: ["سعر", "اسعار", "تكلفه", "بكام", "كام", "فلوس", "تمن", "كشف"],
    a: "سعر الكشف وأي علاج بيتحدد بعد فحص الحالة. هيرد عليك حد من فريق العيادة بالأسعار الحالية." },
  { k: ["ميعاد", "مواعيد", "بتفتحوا", "امتي", "ساعات", "شغالين", "مفتوح", "اجازه", "الجمعه"],
    a: "مواعيدنا: " + CLINIC.hours },
  { k: ["فين", "عنوان", "مكان", "لوكيشن", "توصل"],
    a: "عنوان العيادة: " + CLINIC.address },
  { k: ["تبييض", "تبيض", "اصفرار", "تفتيح"],
    a: "التبييض بيتم في العيادة بعد فحص الأسنان واللثة للتأكد إنه مناسب لحالتك. اكتب: احجز" },
  { k: ["زرع", "زراعه", "تعويض"],
    a: "زراعة الأسنان بتعوض السن المفقود. بنبدأ بكشف وأشعة لتحديد خطة العلاج. اكتب: احجز" },
  { k: ["تقويم", "تقويمات", "اعوجاج", "تزاحم"],
    a: "نوع التقويم (معدني أو شفاف) بيتحدد بعد الكشف. اكتب: احجز" },
  { k: ["حشو", "عصب", "تسوس", "سوسه", "تنظيف", "جير"],
    a: "التسوس بيتعالج بالحشو، ولو وصل للعصب بنعمل علاج عصب لإنقاذ السن. كل ما كشفت بدري كان العلاج أبسط." },
  { k: ["خلع", "ضرس", "عقل"],
    a: "الخلع بنلجأ له لما السن ما ينفعش يتعالج. الدكتور بيفحص الأول وأحيانًا بنحتاج أشعة." },
  { k: ["طفل", "اطفال", "ابني", "بنتي", "صغير"],
    a: "بنكشف على الأطفال ونعالجهم بهدوء. يفضل تجيبه لأول كشف بدري عشان يتعود على العيادة." },
  { k: ["وجع", "الم", "ورم", "نزيف", "طوارئ", "مستعجل", "عاجل", "بيوجعني"],
    a: "لو عندك وجع أو ورم اكتب: احجز، واكتب في الخدمة (حالة مستعجلة). ولو الورم كبير ومعاه حرارة أو صعوبة في البلع أو التنفس، روح أقرب طوارئ فورًا." },
  { k: ["دفع", "تقسيط", "كارت", "فيزا", "تامين", "كاش"],
    a: "طرق الدفع والتأمين هيأكدها لك حد من فريق العيادة هنا." },
  { k: ["خدمات", "بتعملوا", "بتعمل"],
    a: "خدماتنا: الكشف والتنظيف، الحشو وعلاج العصب، التبييض، التقويم، الزراعة، وأسنان الأطفال." },
];

function pickReply(text) {
  const n = norm(text);
  if (!n.trim()) return MENU;
  // رسالة حجز مكتملة
  if (n.includes("الاسم") && (n.includes("اليوم") || n.includes("الساعه"))) return "BOOKED";
  // نية حجز
  if (["احجز", "حجز", "احجزلي"].some((w) => n.includes(w))) return BOOKING_TEMPLATE;
  let best = null, score = 0;
  for (const e of FAQ) {
    let s = 0;
    for (const w of e.k) if (n.includes(norm(w))) s += norm(w).length > 3 ? 2 : 1;
    if (s > score) { score = s; best = e; }
  }
  if (best) return best.a;
  if (["سلام", "اهلا", "مرحبا", "صباح", "مساء", "هاي", "ازيك"].some((w) => n.includes(w))) return MENU;
  return "وصلتنا رسالتك، وهيرد عليك حد من فريق العيادة في أقرب وقت.\n\n" + MENU;
}

async function send(to, body) {
  const r = await fetch(`${API}/${process.env.KAPSO_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "X-API-Key": process.env.KAPSO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });
  if (!r.ok) console.error("send failed", r.status, await r.text());
}

function verify(req) {
  if (process.env.SKIP_SIGNATURE_CHECK === "1") return true; // للتجربة بس
  const secret = process.env.KAPSO_WEBHOOK_SECRET;
  const sig = req.headers["x-webhook-signature"];
  if (!secret || !sig) return false;
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch { return false; }
}

async function handle(item) {
  const m = item.message || item;
  if (m.direction === "outbound") return;
  const text = (m.text && m.text.body) || m.content || "";
  const from = m.from || m.phone_number || (item.conversation && item.conversation.phone_number);
  if (!from) return;

  const reply = pickReply(text);
  if (reply === "BOOKED") {
    await send(from, "استلمنا طلب الحجز:\n\n" + text + "\n\nهنراجع المواعيد ونأكد لك هنا في أقرب وقت. الحجز بيتأكد لما نرد عليك.");
    console.log("NEW BOOKING from", from, "|", text);
    if (process.env.NOTIFY_NUMBER) {
      await send(process.env.NOTIFY_NUMBER, "حجز جديد من " + from + ":\n" + text);
    }
    return;
  }
  await send(from, reply);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("bot is running");
  if (!verify(req)) return res.status(401).send("bad signature");
  if (req.headers["x-webhook-event"] !== "whatsapp.message.received") return res.status(200).send("ignored");

  const body = req.body || {};
  const items = body.batch && Array.isArray(body.data) ? body.data : [body];
  for (const it of items) {
    try { await handle(it); } catch (e) { console.error(e); }
  }
  res.status(200).send("ok");
};
