import { exec } from 'child_process';
import { promisify } from 'util';
import { skillManager } from './skillManager.js';

const execAsync = promisify(exec);

export const toolsDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "get_current_time",
      description: "Devuelve la fecha y hora actual.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "use_skill",
      description: "Carga las instrucciones detalladas de una habilidad (github, gog, mcp, fix, superpowers). Úsala ante CUALQUIER duda técnica.",
      parameters: {
        type: "object",
        properties: {
          skill_name: { type: "string", description: "Identificador de la skill." }
        },
        required: ["skill_name"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_skills",
      description: "Busca habilidades relevantes según una consulta o palabra clave.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Término de búsqueda." }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "execute_command",
      description: "Ejecuta un comando CLI (gh, gog, git, npm, etc.). Soporta ejecución paralela.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Comando completo a ejecutar." }
        },
        required: ["command"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "self_reflection",
      description: "Permite al agente revisar críticamente su propio plan o razonamiento antes de emitir una respuesta final.",
      parameters: {
        type: "object",
        properties: {
          thoughts: { type: "string", description: "Análisis interno de los pasos seguidos y validación del resultado." }
        },
        required: ["thoughts"]
      }
    }
  }
];

export const toolsImplementations: Record<string, (args: any) => Promise<string> | string> = {
  "get_current_time": () => new Date().toLocaleString('es-ES'),
  
  "use_skill": async (args: { skill_name: string }) => {
    const skill = skillManager.getSkill(args.skill_name);
    if (skill) return `--- SKILL: ${skill.name} ---\n${skill.content}`;
    return `Error: Skill '${args.skill_name}' no encontrada. Disponibles: ${skillManager.getAllSkillIds().join(', ')}`;
  },

  "search_skills": async (args: { query: string }) => {
    const relevant = skillManager.findRelevantSkills(args.query);
    if (relevant.length === 0) return "No encontré skills específicas para esa consulta.";
    return `Skills posiblemente relevantes: ${relevant.join(', ')}. Usa 'use_skill' para cargar una.`;
  },

  "execute_command": async (args: { command: string }) => {
    try {
      console.log(`💻 [CLI] ${args.command}`);
      const { stdout, stderr } = await execAsync(args.command);
      return stdout || stderr || "Ejecutado con éxito (sin salida).";
    } catch (error: any) {
      return `Error CLI: ${error.stdout || ""}\n${error.stderr || ""}\n${error.message}`;
    }
  },

  "self_reflection": (args: { thoughts: string }) => {
    console.log(`🧠 [Self-Reflection]: ${args.thoughts}`);
    return "Reflexión registrada. Procede con la respuesta final si el plan es coherente.";
  }
};
