import { llm } from './llm.js';
import { memory, MessageRow } from './memory.js';
import { toolsDefinitions, toolsImplementations } from './tools.js';
import { SPECIALISTS, SpecialistMode } from './specialists.js';

const BASE_SYSTEM_PROMPT = `Eres Hermes v4.0 (Expert Evolution), un asistente autónomo de nivel superior.
Tu arquitectura permite ejecución paralela de herramientas y razonamiento experto multi-paso.

FLUJO EXPERTO:
1. **Selección de Modo**: Adopta el perfil especialista más adecuado.
2. **Razonamiento Paralelo**: Si una tarea requiere múltiples acciones independientes, ejecútalas todas a la vez.
3. **Poda de Contexto**: Te enfocas en la información relevante, resumiendo si es necesario.
4. **Auto-Reflexión**: Antes de finalizar, revisa críticamente si el resultado es óptimo.

REGLAS DE SKILLS:
- Verifica tus habilidades ('use_skill') ante cualquier duda técnica.
- Ejecuta los comandos exactos proporcionados por las skills.

Responde siempre con precisión técnica y tono profesional en español.`;

export const agent = {
  async handleUserInput(userId: number, userInput: string, onUpdate?: (text: string) => Promise<void>): Promise<string> {
    await memory.addMessage(userId, 'user', userInput);
    
    let iterations = 0;
    const MAX_ITERATIONS = 12; // Un poco más de margen para v4.0
    let lastContent = "";

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      // Obtener historial y podar si es necesario (mantener los últimos 15 mensajes para foco)
      const fullHistory = await memory.getHistory(userId);
      const history = fullHistory.slice(-15);
      
      // Selección dinámica de especialista
      let currentMode: SpecialistMode = 'HermesPrime';
      const lastUserMsg = history.filter(m => m.role === 'user').slice(-1)[0]?.content.toLowerCase() || "";
      
      if (lastUserMsg.includes('github') || lastUserMsg.includes('repo') || lastUserMsg.includes('código')) {
        currentMode = 'CodeExpert';
      } else if (lastUserMsg.includes('gmail') || lastUserMsg.includes('correo') || lastUserMsg.includes('agenda') || lastUserMsg.includes('drive')) {
        currentMode = 'WorkManager';
      }

      const messagesForLlm = [
        { role: 'system', content: `${BASE_SYSTEM_PROMPT}\n\nPERFIL ACTIVO: ${currentMode}\n${SPECIALISTS[currentMode]}` },
        ...history.map(msg => ({
          role: msg.role,
          content: msg.content,
          ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
          ...(msg.tool_call_id ? { tool_call_id: msg.tool_call_id } : {})
        }))
      ];

      const response = await llm.generateResponse(messagesForLlm, toolsDefinitions);
      const message = response.choices[0].message;

      await memory.addMessage(userId, 'assistant', message.content || "", message.tool_calls);

      if (message.content) {
        lastContent = message.content;
        if (onUpdate) await onUpdate(lastContent);
      }

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return lastContent || "Tarea finalizada con éxito.";
      }

      // --- EJECUCIÓN PARALELA (v4.0) ---
      const toolResults = await Promise.all(message.tool_calls.map(async (toolCall) => {
        const fnName = toolCall.function.name;
        const fnArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
        
        let resultStr = "";
        try {
          console.log(`🚀 v4.0 Parallel Exec: ${fnName}`);
          const implementation = toolsImplementations[fnName];
          resultStr = implementation ? await Promise.resolve(implementation(fnArgs)) : `Error: Tool ${fnName} no encontrada.`;
        } catch (err: any) {
          resultStr = `Error en ${fnName}: ${err.message}`;
        }
        
        return { toolCallId: toolCall.id, result: resultStr };
      }));

      // Guardar todos los resultados en memoria
      for (const res of toolResults) {
        await memory.addMessage(userId, 'tool', res.result, undefined, res.toolCallId);
      }
    }
    return lastContent + "\n\n⚠️ (Máximo de razonamiento experto alcanzado).";
  }
};
