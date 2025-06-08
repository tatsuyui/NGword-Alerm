require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// NGワード読み込み（本物 or example）
let ngWords = [];
try {
  ngWords = JSON.parse(fs.readFileSync('NGWord.json', 'utf-8'));
} catch {
  ngWords = JSON.parse(fs.readFileSync('NGWord.example.json', 'utf-8'));
}

// LINE設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
const client = new line.Client(config);

// webhook受信
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) => res.json(result));
});

// メッセージ処理
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return Promise.resolve(null);

  const msg = event.message.text;
  if (ngWords.some(word => msg.includes(word))) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ダメです'
    });
  }
  return Promise.resolve(null);
}

app.listen(port, () => console.log(`Listening on port ${port}`));
