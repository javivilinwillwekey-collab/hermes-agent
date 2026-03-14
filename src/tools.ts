import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { join } from 'path';

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
      description: "Carga las instrucciones de una 'skill' específica (github, gog, fix, superpowers). Úsala ANTES de realizar cualquier tarea relacionada.",
      parameters: {
        type: "object",
        properties: {
          skill_name: {
            type: "string",
            description: "Nombre de la skill ('github', 'gog', 'mcp', 'superpowers', 'fix')."
          }
        },
        required: ["skill_name"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "execute_command",
      description: "Ejecuta un comando en la consola (CLI). Úsala para gh, gog, git, npm, etc.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "El comando completo a ejecutar."
          }
        },
        required: ["command"]
      }
    }
  }
];

export const toolsImplementations: Record<string, (args: any) => Promise<string> | string> = {
  "get_current_time": () => {
    return new Date().toLocaleString('es-ES');
  },
  
  "use_skill": async (args: { skill_name: string }) => {
    const skillMap: Record<string, string> = {
      'github': 'SKILL.md',
      'gog': 'gog.md',
      'mcp': 'mcp-integr.md',
      'fix': 'fix.md',
      'superpowers': 'superpowers.md'
    };
    
    const filename = skillMap[args.skill_name.toLowerCase()] || `${args.skill_name}.md`;
    const path = join(process.cwd(), filename);
    
    try {
      if (fs.existsSync(path)) {
        return fs.readFileSync(path, 'utf-8');
      }
      return `Error: No se encontró la skill '${args.skill_name}'. Skills: ${Object.keys(skillMap).join(', ')}`;
    } catch (e: any) {
      return `Error al leer la skill: ${e.message}`;
    }
  },

  "execute_command": async (args: { command: string }) => {
    try {
      console.log(`💻 Ejecutando: ${args.command}`);
      const { stdout, stderr } = await execAsync(args.command);
      return stdout || stderr || "Comando ejecutado sin salida.";
    } catch (error: any) {
      return `Error: ${error.stdout || ""}\n${error.stderr || ""}\n${error.message}`;
    }
  }
};
