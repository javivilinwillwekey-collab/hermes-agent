import { bot } from './bot.js';
import express from 'express';
import { webhookCallback } from 'grammy';

const PORT = process.env.PORT || 3000;
const IS_CLOUD = !!process.env.PORT; // Cloud Run siempre inyecta PORT

async function bootstrap() {
  console.log("Iniciando Hermes Agent...");
  console.log("Servicios de Memoria (Firebase Firestore) habilitados.");
  
  if (IS_CLOUD) {
    console.log(`☁️ Detectado entorno Cloud. Iniciando modo Webhook en puerto ${PORT}...`);
    const app = express();
    app.use(express.json());

    // Endpoint para el webhook de Telegram
    app.use(webhookCallback(bot, "express"));

    // Endpoint de salud para Cloud Run
    app.get("/health", (req, res) => res.send("OK"));

    app.listen(PORT, () => {
      console.log(`✅ Servidor Webhook escuchando en el puerto ${PORT}`);
    });
  } else {
    console.log("🏠 Detectado entorno Local. Iniciando modo Polling...");
    
    // Limpieza en cierre (Ctrl+C)
    const stopBot = () => {
      console.log('Deteniendo bot...');
      bot.stop();
    };
    process.once('SIGINT', stopBot);
    process.once('SIGTERM', stopBot);

    try {
      await bot.start({
        onStart: (botInfo) => {
          console.log(`✅ Bot conectado (Polling) como @${botInfo.username}`);
        }
      });
    } catch (err) {
      console.error("❌ Error crítico en Polling:", err);
    }
  }
}

bootstrap();
