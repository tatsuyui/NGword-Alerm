// index.js
require("dotenv").config();
const { Client, middleware } = require("@line/bot-sdk");
const express = require("express");

// LINE bot設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);
const app = express();
app.use(express.json());

// NGワード（Base64で保持）
const ngWords = JSON.parse(Buffer.from(process.env.NGWORDS_BASE64, 'base64').toString('utf-8'));

// 最終警告時刻のマップ
const lastWarnings = new Map();

// 返信テンプレート（環境変数）
const responseTemplate = process.env.RESPONSE_TEMPLATE;
const repeatTemplate = process.env.REPEAT_TEMPLATE;

// 応答生成関数
const buildReplyMessage = (userId, matchedWord) => {
  const now = Date.now();
  const lastTime = lastWarnings.get(userId);

  if (lastTime && now - lastTime < 60000) {
    return repeatTemplate;
  }

  lastWarnings.set(userId, now);
  return responseTemplate.replace("%WORD%", matchedWord);
};

// NGワードマッチング
const matchNGWord = (text) => {
  const normalized = text.replace(/[！!？?]/g, "").toLowerCase();
  return ngWords.find(word => normalized.includes(word.replace(/[！!？?]/g, "").toLowerCase()));
};

// Webhook処理
app.post("/webhook", middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// イベント処理
const handleEvent = async (event) => {
  if (event.type !== "message" || event.message.type !== "text") return null;
  const text = event.message.text;
  const match = matchNGWord(text);
  if (!match) return null;

  const replyText = buildReplyMessage(event.source.userId, match);
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: replyText,
  });
};

// サーバ起動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
