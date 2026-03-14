import express from 'express';
import { Bot, InputFile } from 'grammy';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import axios from 'axios';
import fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { config } from './src/config.js';
import { agent } from './src/agent.js';

// --- INICIO ---
console.log("🏁 Arrancando Hermes v2.0 (Superpowers)...");

const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

// --- TTS (GOOGLE CLOUD) ---
async function textToSpeech(text: string): Promise<string> {
  try {
    const serviceAccountB64 = config.FIREBASE_SERVICE_ACCOUNT_JSON!;
    const credentials = JSON.parse(Buffer.from(serviceAccountB64.trim(), 'base64').toString('utf-8'));
    const ttsClient = new TextToSpeechClient({ credentials });
    
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode: 'es-ES', name: 'es-ES-Neural2-B', ssmlGender: 'MALE' },
      audioConfig: { audioEncoding: 'MP3' },
    });
    
    const tempFile = join(tmpdir(), `hermes_tts_${Date.now()}.mp3`);
    fs.writeFileSync(tempFile, response.audioContent as Buffer);
    return tempFile;
  } catch (e: any) {
    console.error("❌ TTS Error:", e.message);
    throw e;
  }
}

// --- HANDLERS ---
bot.use(async (ctx, next) => {
  if (ctx.from && config.TELEGRAM_ALLOWED_USER_IDS.includes(ctx.from.id)) return await next();
  console.warn(`⛔ Acceso denegado: ${ctx.from?.id}`);
});

async function processWithAgent(ctx: any, userInput: string, isVoice: boolean) {
  const userId = ctx.from!.id;
  
  try {
    await ctx.replyWithChatAction("typing");
    
    // El agente maneja todo el bucle de razonamiento y herramientas
    const reply = await agent.handleUserInput(userId, userInput);
    
    const needsVoice = isVoice || reply.toLowerCase().includes("háblame") || reply.toLowerCase().includes("voz");

    if (needsVoice) {
      await ctx.replyWithChatAction("record_voice");
      const audioPath = await textToSpeech(reply);
      await ctx.replyWithVoice(new InputFile(audioPath));
      fs.unlinkSync(audioPath);
    } else {
      await ctx.reply(reply);
    }
  } catch (e: any) {
    console.error("❌ Agent Error:", e.message);
    await ctx.reply("❌ Error en mi cerebro: " + e.message);
  }
}

bot.on("message:text", async (ctx) => {
  console.log(`💬 Texto: "${ctx.message.text}"`);
  await processWithAgent(ctx, ctx.message.text, false);
});

bot.on("message:voice", async (ctx) => {
  console.log(`🎙️ Voz recibida`);
  try {
    await ctx.reply("👂 Escuchando...");
    const file = await ctx.getFile();
    const url = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    
    const tempIn = join(tmpdir(), `hermes_in_${Date.now()}.ogg`);
    fs.writeFileSync(tempIn, response.data);

    // STT con Groq
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', fs.createReadStream(tempIn), { filename: 'audio.ogg', contentType: 'audio/ogg' });
    form.append('model', 'whisper-large-v3');
    form.append('language', 'es');
    form.append('response_format', 'text');

    const sttResponse = await axios.post(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      form,
      { headers: { 'Authorization': `Bearer ${config.GROQ_API_KEY}`, ...form.getHeaders() } }
    );

    fs.unlinkSync(tempIn);
    const userText = sttResponse.data as string;
    console.log(`🎙️ Transcripción: "${userText}"`);

    if (userText.trim()) {
      await processWithAgent(ctx, userText, true);
    } else {
      await ctx.reply("No te he oído bien.");
    }
  } catch (e: any) {
    console.error("❌ Voice Error:", e.message);
    ctx.reply("❌ Error procesando voz.");
  }
});

// --- SERVER ---
const app = express();
app.get("/", (req, res) => res.send("Hermes v2.0 Online ✅"));
app.listen(config.PORT, "0.0.0.0");

bot.catch((err) => console.error("🔥 Bot Error:", err.message));
bot.start();
console.log(`🚀 Hermes listo en puerto ${config.PORT}`);
