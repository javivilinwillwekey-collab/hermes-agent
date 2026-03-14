import express from 'express';
import OpenAI from 'openai';
import admin from 'firebase-admin';
import { Bot, InputFile } from 'grammy';
import axios from 'axios';
import fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// --- INICIO ---
console.log("🏁 Arrancando Hermes...");
console.log("🚀 Cargando configuraciones...");

// --- CONFIGURACIÓN ---
const PORT = process.env.PORT || 7860;
console.log(`📍 Puerto detectado: ${PORT}`);

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ALLOWED_IDS = (process.env.TELEGRAM_ALLOWED_USER_IDS || '').split(',').map(id => parseInt(id.trim(), 10));
const JOHNNY_VOICE_ID = "II2zvu784M1JmLdcOa7B";
const FIREBASE_PROJECT_ID = 'hermes-agent-fb0ad';
const GOOGLE_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

console.log("🤖 Inicializando Bot y Groq...");
// --- INICIALIZACIÓN ---
const bot = new Bot(TELEGRAM_TOKEN);
const groq = new OpenAI({ apiKey: GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

console.log("🔥 Inicializando Firebase...");
if (!admin.apps.length) {
  try {
    let credential;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      credential = admin.credential.cert(JSON.parse(serviceAccountJson));
    } else {
      credential = GOOGLE_CREDENTIALS ? admin.credential.cert(GOOGLE_CREDENTIALS) : admin.credential.applicationDefault();
    }
    admin.initializeApp({ projectId: FIREBASE_PROJECT_ID, credential });
    console.log("✅ Firebase inicializado.");
  } catch (e: any) { console.error("❌ Firebase Error:", e.message); }
}
const db = admin.firestore();

// --- LÓGICA DE MEMORIA ---
async function saveMessage(userId: number, role: string, content: string) {
  try {
    await db.collection('conversations').doc(String(userId)).collection('messages').add({
      role, content, timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { console.error("❌ Error guardando mensaje:", e.message); }
}

async function getHistory(userId: number) {
  try {
    const snap = await db.collection('conversations').doc(String(userId)).collection('messages')
      .orderBy('timestamp', 'desc').limit(20).get();
    const msgs: any[] = [];
    snap.forEach(d => msgs.push(d.data()));
    return msgs.reverse();
  } catch (e) { return []; }
}

// --- PROCESAMIENTO IA ---
async function handleText(userId: number, text: string): Promise<string> {
  const history = await getHistory(userId);
  const messages = [
    { role: 'system', content: "Eres Hermes, un asistente IA amigable. Responde de forma concisa en español e intenta mantener un tono natural." },
    ...history.map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: text }
  ];

  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: messages as any,
  });

  const reply = res.choices[0].message.content || "";
  await saveMessage(userId, 'user', text);
  await saveMessage(userId, 'assistant', reply);
  return reply;
}

// --- TTS (ELEVENLABS) ---
async function textToSpeech(text: string): Promise<string> {
  if (!ELEVENLABS_API_KEY) throw new Error("Falta ELEVENLABS_API_KEY");
  console.log("🔊 Generando voz con ElevenLabs...");
  const response = await axios({
    method: 'post',
    url: `https://api.elevenlabs.io/v1/text-to-speech/${JOHNNY_VOICE_ID}`,
    data: { text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    responseType: 'arraybuffer'
  });

  const tempFile = join(tmpdir(), `hermes_tts_${Date.now()}.mp3`);
  fs.writeFileSync(tempFile, response.data);
  return tempFile;
}

// --- BOT HANDLERS ---
bot.use(async (ctx, next) => {
  if (ctx.from && ALLOWED_IDS.includes(ctx.from.id)) return await next();
  console.warn(`⛔ Acceso denegado: ${ctx.from?.id}`);
});

bot.on("message:text", async (ctx) => {
  try {
    console.log(`💬 Texto de ${ctx.from?.id}: "${ctx.message.text}"`);
    await ctx.replyWithChatAction("typing");
    const reply = await handleText(ctx.from!.id, ctx.message.text);
    await ctx.reply(reply);
  } catch (e: any) {
    console.error("❌ Error Texto:", e.message);
    ctx.reply("❌ Error procesando mensaje.");
  }
});

bot.on("message:voice", async (ctx) => {
  const userId = ctx.from!.id;
  const voiceId = ctx.message.voice.file_id;
  
  try {
    console.log(`🎙️ Voz recibida (ID: ${voiceId}) de ${userId}`);
    await ctx.reply("👂 Escuchando...");
    
    // 1. Descargar audio
    const file = await ctx.getFile();
    const url = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;
    const tempIn = join(tmpdir(), `hermes_in_${Date.now()}.ogg`);
    
    const writer = fs.createWriteStream(tempIn);
    const response = await axios.get(url, { responseType: 'stream' });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log("✅ Audio descargado localmente.");

    // 2. STT (Whisper)
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempIn),
      model: "whisper-large-v3",
      language: "es"
    });
    
    fs.unlinkSync(tempIn); // Limpiar
    
    const userText = transcription.text;
    console.log(`🎙️ Transcripción: "${userText}"`);
    
    if (!userText.trim()) {
      await ctx.reply("No he podido entender el audio, ¿puedes repetirlo?");
      return;
    }

    // 3. Generar respuesta
    await ctx.replyWithChatAction("typing");
    const replyText = await handleText(userId, userText);
    
    // 4. TTS (ElevenLabs)
    if (ELEVENLABS_API_KEY && replyText) {
      await ctx.replyWithChatAction("record_voice");
      const audioPath = await textToSpeech(replyText);
      await ctx.replyWithVoice(new InputFile(audioPath));
      fs.unlinkSync(audioPath); // Limpiar temp
    } else {
      await ctx.reply(replyText);
    }
    
  } catch (e: any) {
    console.error("❌ Error Audio:", e.message);
    ctx.reply("❌ Ups, he tenido un problema escuchando ese audio.");
  }
});

// --- SERVER & START ---
const app = express();
app.get("/", (req, res) => res.send("Hermes Multimedia Online ✅"));
app.listen(PORT, "0.0.0.0");

console.log("🚀 Despegando Hermes en Railway (Polling)...");

// Manejo de errores globales del bot
bot.catch((err) => {
  console.error("🔥 Error Global del Bot:", err.message);
});

bot.start();
