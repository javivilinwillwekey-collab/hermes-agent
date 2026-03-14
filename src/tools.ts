export const toolsDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "get_current_time",
      description: "Devuelve la fecha y hora actual del sistema local donde se ejecuta el agente. Utiliza esta herramienta si el usuario te pregunta por la hora, fecha o momento actual.",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "Opcional. Zona horaria a utilizar (ej. 'Europe/Madrid')."
          }
        },
        required: []
      }
    }
  }
];

export const toolsImplementations: Record<string, (args: any) => Promise<string> | string> = {
  "get_current_time": (args: any) => {
    const date = new Date();
    if (args && args.timezone) {
      try {
        return date.toLocaleString('es-ES', { timeZone: args.timezone });
      } catch (e) {
        return `Error con la zona horaria. Hora local UTC: ${date.toISOString()}`;
      }
    }
    return date.toLocaleString();
  }
};
