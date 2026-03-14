import dotenv from 'dotenv';
dotenv.config();

export const config = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
  TELEGRAM_ALLOWED_USER_IDS: (process.env.TELEGRAM_ALLOWED_USER_IDS || '')
    .split(',')
    .map(id => parseInt(id.trim(), 10)),
  GROQ_API_KEY: process.env.GROQ_API_KEY!,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "llama-3-70b-instruct",
  FIREBASE_PROJECT_ID: 'hermes-agent-fb0ad',
  FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  PORT: process.env.PORT || 7860,
};
