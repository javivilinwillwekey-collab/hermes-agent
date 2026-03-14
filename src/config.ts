import dotenv from 'dotenv';
dotenv.config();

export const config = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_ALLOWED_USER_IDS: process.env.TELEGRAM_ALLOWED_USER_IDS 
    ? process.env.TELEGRAM_ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim(), 10)) 
    : [],
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openrouter/free',
  DB_PATH: process.env.DB_PATH || './memory.db',
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  FIREBASE_PROJECT_ID: "hermes-agent-fb0ad",
};

if (!config.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN === 'SUSTITUYE POR EL TUYO') {
  console.warn("⚠️ ERROR: Falta TELEGRAM_BOT_TOKEN en .env");
}
if (!config.GROQ_API_KEY || config.GROQ_API_KEY === 'SUSTITUYE POR EL TUYO') {
  console.warn("⚠️ ERROR: Falta GROQ_API_KEY en .env");
}
