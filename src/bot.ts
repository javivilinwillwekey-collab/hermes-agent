import { Bot, Context } from "grammy";
import { config } from "./config.js";
import { agent } from "./agent.js";
import { memory } from "./memory.js";

if (!config.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN === 'SUSTITUYE POR EL TUYO') {
  console.error("No se puede iniciar el bot de Telegram sin un token válido.");
  process.exit(1);
}

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

// Middleware de seguridad
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) {
    return;
  }
  if (!config.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
    console.warn(`Intento de acceso denegado del usuario: ${userId}`);
    return;
  }
  await next();
});

// Comandos básicos
bot.command("start", async (ctx) => {
  await ctx.reply("¡Hola! Soy Hermes, tu agente IA local. Estoy listo para ayudarte.");
});

bot.command("clear", async (ctx) => {
  if (ctx.from?.id) {
    memory.clearHistory(ctx.from.id);
    await ctx.reply("Historial de conversación borrado.");
  }
});

// Listener de mensajes
bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  
  await ctx.api.sendChatAction(ctx.chat.id, "typing");
  
  try {
    const response = await agent.handleUserInput(userId, text);
    await ctx.reply(response);
  } catch (error: any) {
    console.error("Error al procesar el mensaje:", error);
    await ctx.reply("Lo siento, ha ocurrido un error al procesar tu mensaje: " + error.message);
  }
});
