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
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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

    // Ask Groq AI
    const groqResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a friendly hotel concierge bot for X Hotel. 
          Detect the language of the user's message and always reply in that same language.
          Supported languages: English, Indonesian, Chinese, Japanese, Korean.
          
          If the message is about booking, reservations, rooms, availability, or prices:
          Reply with a warm greeting and direct them to book at: ${HOTEL_WEBSITE}
          
          For ANY other inquiry:
          Reply with a warm greeting and direct them to email: ${HOTEL_EMAIL}
          
          Always be polite, warm and professional. Keep replies short and clear.
          Never make up information about the hotel.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 200
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const reply = groqResponse.data.choices[0].message.content;

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
