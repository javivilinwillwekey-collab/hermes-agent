import { llm } from './llm.js';
import { memory } from './memory.js';
import { toolsDefinitions, toolsImplementations } from './tools.js';
import { SPECIALISTS, SpecialistMode } from './specialists.js';

// Sistema central de orquestación
const BASE_SYSTEM_PROMPT = `Eres Hermes v3.0, un asistente personal de IA con capacidades autónomas.
Tu misión es resolver tareas complejas mediante el uso inteligente de herramientas y especialistas.

FLUJO DE TRABAJO OBLIGATORIO:
1. **Identificación**: Determina si necesitas un especialista (CodeExpert o WorkManager).
2. **Planificación**: En tu primera respuesta a una tarea compleja, escribe siempre un "PLAN DE ACCIÓN" detallando los pasos que vas a seguir.
3. **Ejecución**: Usa las herramientas ('use_skill', 'execute_command', etc.) siguiendo el plan.
4. **Revisión**: Antes de dar por finalizada la tarea, verifica que has cumplido el objetivo original.

REGLAS DE SKILLS (SUPERPODERES):
- Si hay un 1% de duda, carga la skill con 'use_skill'.
- No adivines comandos; usa las skills para validarlos.
- Anuncia: "Usando [skill] para [propósito]".

Responde siempre en español profesional.`;

export const agent = {
  async handleUserInput(userId: number, userInput: string, onUpdate?: (text: string) => Promise<void>): Promise<string> {
    await memory.addMessage(userId, 'user', userInput);
    
    let iterations = 0;
    const MAX_ITERATIONS = 10;
    let lastContent = "";

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      const history = await memory.getHistory(userId);
      
      // Determinar el modo según el contenido del usuario o el contexto
      let currentMode: SpecialistMode = 'HermesPrime';
      const lastUserMsg = history.filter(m => m.role === 'user').pop()?.content.toLowerCase() || "";
      
      if (lastUserMsg.includes('github') || lastUserMsg.includes('codigo') || lastUserMsg.includes('repo')) {
        currentMode = 'CodeExpert';
      } else if (lastUserMsg.includes('gmail') || lastUserMsg.includes('correo') || lastUserMsg.includes('calendario') || lastUserMsg.includes('drive')) {
        currentMode = 'WorkManager';
      }

      const modePrompt = SPECIALISTS[currentMode];
      const messagesForLlm = [
        { role: 'system', content: `${BASE_SYSTEM_PROMPT}\n\nMODO ACTUAL:\n${modePrompt}` },
        ...history.map(msg => {
          const m: any = { role: msg.role, content: msg.content };
          if (msg.role === 'assistant' && msg.tool_calls) m.tool_calls = msg.tool_calls;
          if (msg.role === 'tool') m.tool_call_id = msg.tool_call_id;
          return m;
        })
      ];

      const response = await llm.generateResponse(messagesForLlm, toolsDefinitions);
      const message = response.choices[0].message;

      await memory.addMessage(userId, 'assistant', message.content || "", message.tool_calls);

      if (message.content) {
        lastContent = message.content;
        if (onUpdate) await onUpdate(lastContent);
      }

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return lastContent || "He completado la tarea.";
      }

      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function.name;
        const fnArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
        
        let resultStr = "";
        try {
          console.log(`🛠️ Agente ejecutando: ${fnName}`, fnArgs);
          resultStr = await Promise.resolve(toolsImplementations[fnName] ? toolsImplementations[fnName](fnArgs) : `Herramienta ${fnName} no encontrada.`);
        } catch (err: any) {
          resultStr = `Error execution ${fnName}: ${err.message}`;
        }

        await memory.addMessage(userId, 'tool', resultStr, undefined, toolCall.id);
      }
    }
    return lastContent + "\n\n⚠️ (Límite de razonamiento alcanzado).";
  }
};
