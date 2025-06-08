//  LINE Bot with NGワード検出 + 応答テンプレート（環境変数対応）
require("dotenv").config();
const fs = require("fs");
const { Client } = require("@line/bot-sdk");
const express = require("express");

//  LINE設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);
const app = express();
app.use(express.json());

//  NGワードの読み込み（Base64から）
let ngWords = [];
try {
  const base64 = process.env.NGWORDS_BASE64;
  const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
  ngWords = JSON.parse(jsonStr);
} catch (e) {
  console.error("❌ NGWORDS_BASE64 読み込み失敗:", e);
  ngWords = [];
}

//  正規化関数（カタカナ→ひらがな、小文字化、記号除去など）
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/[！!？?。、・\s]/g, '')
    .replace(/[ァ-ン]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60))
    .normalize('NFKC');
};

//  最初にマッチしたNG語を返す
const getMatchedWord = (message, ngWords) => {
  const normMessage = normalizeText(message);
  for (const word of ngWords) {
    if (normMessage.includes(normalizeText(word))) {
      return word;
    }
  }
  return null;
};

//  メッセージテンプレートを生成
const buildReplyMessage = (matchedWord) => {
  const template = process.env.RESPONSE_TEMPLATE || "%WORD% は NGワードです。";
  return template.replace("%WORD%", matchedWord).replace(/\\n/g, "\n");
};

//  LINE Webhookエントリポイント
app.post("/webhook", (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

//  イベント処理
async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  const userMessage = event.message.text;
  const hit = getMatchedWord(userMessage, ngWords);

  if (hit) {
    const reply = buildReplyMessage(hit);
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: reply,
    });
  }

  return null;
}

//  サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot is running on port ${PORT}`);
});
