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
let db: admin.firestore.Firestore;

try {
  if (!admin.apps.length) {
    let credential;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (serviceAccountJson) {
      console.log("📦 Usando FIREBASE_SERVICE_ACCOUNT_JSON de las variables...");
      try {
        credential = admin.credential.cert(JSON.parse(serviceAccountJson));
      } catch (parseErr) {
        throw new Error("El JSON de FIREBASE_SERVICE_ACCOUNT_JSON no es válido. Revisa que no le sobren comillas.");
      }
    } else {
      console.log("📂 Usando credenciales por defecto/archivo...");
      credential = GOOGLE_CREDENTIALS ? admin.credential.cert(GOOGLE_CREDENTIALS) : admin.credential.applicationDefault();
    }

    admin.initializeApp({ 
      projectId: FIREBASE_PROJECT_ID, 
      credential 
    });
  }
  db = admin.firestore();
  console.log("✅ Firebase y Firestore inicializados correctamente.");
} catch (e: any) {
  console.error("❌ ERROR CRÍTICO AL INICIALIZAR FIREBASE:");
  console.error(e.message);
  process.exit(1); // Forzar reinicio si no hay base de datos
}

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

async function sendResponse(ctx: any, text: string, forceVoice: boolean = false) {
  const userId = ctx.from!.id;
  const isVoiceRequest = forceVoice || text.toLowerCase().includes("háblame") || text.toLowerCase().includes("con voz") || text.toLowerCase().includes("audio");

  if (isVoiceRequest && ELEVENLABS_API_KEY) {
    try {
      await ctx.replyWithChatAction("record_voice");
      const audioPath = await textToSpeech(text);
      await ctx.replyWithVoice(new InputFile(audioPath));
      fs.unlinkSync(audioPath);
    } catch (e: any) {
      console.error("❌ Error ElevenLabs:", e.response?.data?.toString() || e.message);
      await ctx.reply(text);
      await ctx.reply("⚠️ (Nota: No pude generar el audio. Revisa tu clave de ElevenLabs o saldo).");
    }
  } else {
    await ctx.reply(text);
  }
}

bot.on("message:text", async (ctx) => {
  try {
    const text = ctx.message.text;
    console.log(`💬 Texto de ${ctx.from?.id}: "${text}"`);
    await ctx.replyWithChatAction("typing");
    const reply = await handleText(ctx.from!.id, text);
    await sendResponse(ctx, reply, false);
  } catch (e: any) {
    console.error("❌ Error Texto:", e.message);
    ctx.reply("❌ Error procesando mensaje: " + (e.message.includes("401") ? "Clave API inválida" : e.message));
  }
});

bot.on("message:voice", async (ctx) => {
  const userId = ctx.from!.id;
  const voiceId = ctx.message.voice.file_id;
  
  try {
    console.log(`🎙️ Voz recibida de ${userId}`);
    await ctx.reply("👂 Escuchando...");
    
    // 1. Descargar audio (Usando ArrayBuffer para evitar bloqueos de stream)
    const file = await ctx.getFile();
    const url = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    
    const tempIn = join(tmpdir(), `hermes_in_${Date.now()}.ogg`);
    fs.writeFileSync(tempIn, response.data);
    console.log("✅ Audio guardado en:", tempIn);

    // 2. STT (Whisper)
    console.log("📝 Transcribiendo con Whisper...");
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempIn),
      model: "whisper-large-v3",
      language: "es"
    });
    
    fs.unlinkSync(tempIn);
    const userText = transcription.text;
    console.log(`🎙️ Transcripción: "${userText}"`);
    
    if (!userText.trim()) {
      await ctx.reply("No he podido oír nada, ¿puedes repetirlo?");
      return;
    }

    // 3. Generar respuesta
    await ctx.replyWithChatAction("typing");
    const replyText = await handleText(userId, userText);
    
    // 4. Responder con Voz (Siempre responder con voz si mandan un audio)
    await sendResponse(ctx, replyText, true);
    
  } catch (e: any) {
    console.error("❌ Error Crítico en Audio:", e.response?.data?.toString() || e.message);
    let msg = "❌ Ups, he tenido un problema.";
    if (e.message.includes("401")) msg = "❌ Error: Clave API no válida.";
    if (e.message.includes("429")) msg = "❌ Error: Límite de uso excedido.";
    ctx.reply(msg);
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
