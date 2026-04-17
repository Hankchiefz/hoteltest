require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const HOTEL_WEBSITE = process.env.HOTEL_WEBSITE;
const HOTEL_EMAIL = process.env.HOTEL_EMAIL;

// Booking keywords
const BOOKING_KEYWORDS = [
  'book','booking','reserve','reservation','room','pesan','reservasi','kamar',
  '预订','订房','予約','예약'
];

// Responses
const RESPONSES = {
  en: {
    booking: `Hello! Thank you for your interest in booking at X Hotel. Please make your reservation on our website: ${process.env.HOTEL_WEBSITE}`,
    other: `Hello! Thank you for contacting X Hotel. For further assistance, please email us at ${process.env.HOTEL_EMAIL}`
  },
  id: {
    booking: `Halo! Terima kasih atas minat Anda memesan di X Hotel. Silakan reservasi melalui website kami: ${process.env.HOTEL_WEBSITE}`,
    other: `Halo! Terima kasih telah menghubungi X Hotel. Untuk bantuan lebih lanjut, silakan email kami di ${process.env.HOTEL_EMAIL}`
  },
  zh: {
    booking: `您好！感谢您对X Hotel的预订兴趣。请通过我们的网站预订：${process.env.HOTEL_WEBSITE}`,
    other: `您好！感谢您联系X Hotel。如需帮助请发邮件至：${process.env.HOTEL_EMAIL}`
  },
  ja: {
    booking: `こんにちは！X Hotelへのご予約ありがとうございます。こちらからご予約ください：${process.env.HOTEL_WEBSITE}`,
    other: `こんにちは！X Hotelにお問い合わせいただきありがとうございます。メールでご連絡ください：${process.env.HOTEL_EMAIL}`
  },
  ko: {
    booking: `안녕하세요! X Hotel 예약 문의 감사합니다. 웹사이트에서 예약해 주세요: ${process.env.HOTEL_WEBSITE}`,
    other: `안녕하세요! X Hotel에 문의해 주셔서 감사합니다. 이메일로 연락해 주세요: ${process.env.HOTEL_EMAIL}`
  }
};

function detectLang(text) {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  if (/\b(halo|selamat|terima kasih|apa|saya|dan|di|untuk)\b/i.test(text)) return 'id';
  return 'en';
}

function isBooking(text) {
  const lower = text.toLowerCase();
  return BOOKING_KEYWORDS.some(kw => lower.includes(kw) || text.includes(kw));
}

// Webhook verification
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    return res.send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

// Receive messages
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg || msg.type !== 'text') return;
    const text = msg.text.body;
    const from = msg.from;
    const lang = detectLang(text);
    const type = isBooking(text) ? 'booking' : 'other';
    const reply = RESPONSES[lang][type];
    await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp',
      to: from,
      type: 'text',
      text: { body: reply }
    }, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
    });
  } catch (err) {
    console.error(err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
