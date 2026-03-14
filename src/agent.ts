import { llm } from './llm.js';
import { memory, Role } from './memory.js';
import { toolsDefinitions, toolsImplementations } from './tools.js';

const SYSTEM_PROMPT = `Eres Hermes, un asistente personal de IA que se ejecuta localmente.
Responde de forma clara, directa y segura. No eres un modelo de lenguaje de la web, eres un agente privado.
Si te piden acciones que requieran herramientas (como la hora actual), usa las tools disponibles.`;

export const agent = {
  async handleUserInput(userId: number, userInput: string): Promise<string> {
    // 1. Guardar el mensaje del usuario (AHORA ASYNC)
    await memory.addMessage(userId, 'user', userInput);
    
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      // 2. Recargar el historial actualizado (AHORA ASYNC)
      const history = await memory.getHistory(userId);
      const messagesForLlm = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(msg => {
          const m: any = { 
            role: msg.role as any, 
            content: msg.content 
          };
          // Importante: Groq es estricto con los campos extra. 
          // Solo enviamos tool_calls si es assistant y tool_call_id si es tool.
          if (msg.role === 'assistant' && msg.tool_calls) {
            m.tool_calls = msg.tool_calls;
          }
          if (msg.role === 'tool') {
            m.tool_call_id = msg.tool_call_id;
          }
          return m;
        })
      ];

      // 3. Llamada al LLM
      const response = await llm.generateResponse(messagesForLlm, toolsDefinitions);
      const message = response.choices[0].message;

      // 4. Guardar asistente en memoria (AHORA ASYNC)
      await memory.addMessage(
        userId, 
        'assistant', 
        message.content || "", 
        message.tool_calls
      );

      // 5. Si no hay llamadas a herramientas, devolvemos la respuesta
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return message.content || "Sin respuesta del modelo.";
      }

      // 6. Si hay herramientas que resolver
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function') {
          const fnName = toolCall.function.name;
          const fnArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
          
          let resultStr = "";
          if (toolsImplementations[fnName]) {
            try {
              console.log(`Ejecutando herramienta: ${fnName} con args`, fnArgs);
              resultStr = await Promise.resolve(toolsImplementations[fnName](fnArgs));
            } catch (err: any) {
              resultStr = `Error al ejecutar la herramienta: ${err.message}`;
            }
          } else {
            resultStr = `Herramienta desconocida: ${fnName}`;
          }

          // Añadir el resultado de la tool a la memoria (AHORA ASYNC)
          await memory.addMessage(userId, 'tool', resultStr, undefined, toolCall.id);
        }
      }
    }
    return "Límite de iteraciones alcanzado del agente. Por favor, reformula tu petición.";
  }
};
