import OpenAI from "openai";
import { config } from "./config.js";

const groqClient = new OpenAI({
  apiKey: config.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

const openRouterClient = new OpenAI({
  apiKey: config.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

export const llm = {
  async generateResponse(messages: any[], tools?: any[]) {
    try {
      console.log("LLM: Enviando petición a Groq...");
      return await groqClient.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        tools: tools?.length ? tools : undefined,
        tool_choice: tools?.length ? "auto" : undefined,
      });
    } catch (error: any) {
      console.error(`LLM: Fallo en Groq: ${error.message}. Intentando con OpenRouter...`);
      return await openRouterClient.chat.completions.create({
        model: config.OPENROUTER_MODEL,
        messages,
        tools: tools?.length ? tools : undefined,
        tool_choice: tools?.length ? "auto" : undefined,
      });
    }
  }
};
