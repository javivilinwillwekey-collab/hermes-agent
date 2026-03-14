# Plan de Evolución: Hermes v4.0 "Expert Evolution"

Este plan detalla la transición de Hermes hacia una arquitectura de nivel experto, enfocada en la excelencia técnica, la velocidad de ejecución y la coherencia del sistema de habilidades.

## Proposed Changes

### 1. Arquitectura "Skill-First"
- **`SkillManager`**: Crearemos un gestor dedicado para las habilidades. En lugar de leer archivos `.md` ad-hoc, el `SkillManager` cargará, indexará y proporcionará el contexto más relevante de forma eficiente.
- **Directorio `src/skills/`**: Organizaremos los archivos de instrucciones dentro de una estructura de código coherente.

### 2. Ejecución Paralela de Herramientas
- **Optimización del Loop**: Modificaremos el bucle de razonamiento en `agent.ts` para que, si el LLM solicita múltiples herramientas, estas se ejecuten simultáneamente usando `Promise.all`. Esto reducirá drásticamente el tiempo de respuesta en tareas complejas.

### 3. Excelencia Técnica y Rendimiento
- **Gestión de Contexto (Context Pruning)**: Implementaremos una lógica para resumir el historial antiguo de la conversación cuando el número de tokens sea elevado, manteniendo siempre el foco en la tarea actual.
- **Tipado Estricto**: Refactorizaremos los módulos para usar interfaces de TypeScript más robustas, evitando el uso de `any` y mejorando la mantenibilidad.

### 4. Herramientas de "Meta-Cognición"
- **`self_reflection`**: Una nueva herramienta que permite al agente "revisar" su propio plan o resultado antes de entregarlo al usuario, elevando la calidad de las respuestas.

## Componentes a Modificar

#### [NEW] [skillManager.ts](file:///home/javier-montoro/.gemini/antigravity/brain/03fa5ddc-9cbe-4cb9-92c8-0010a32dc0a8/src/skillManager.ts)
- Clase central para la gestión de skills y búsqueda de contexto.

#### [MODIFY] [agent.ts](file:///home/javier-montoro/.gemini/antigravity/brain/03fa5ddc-9cbe-4cb9-92c8-0010a32dc0a8/src/agent.ts)
- Actualización para soportar ejecución paralela y poda de contexto.

#### [MODIFY] [tools.ts](file:///home/javier-montoro/.gemini/antigravity/brain/03fa5ddc-9cbe-4cb9-92c8-0010a32dc0a8/src/tools.ts)
- Integración con el `SkillManager` y adición de `self_reflection`.

## Plan de Verificación

### Automatizada
- Pruebas de velocidad: Comparar el tiempo de ejecución de 3 herramientas secuenciales vs paralelas.
- Validación de tipos: `npm run build` para asegurar coherencia.

### Manual
- Pedir a Hermes una tarea que requiera 3 acciones (ej: "Busca un correo de X, resume su contenido en un Doc y avísame por Telegram").
- Verificar que las acciones de búsqueda y lectura se ejecutan en paralelo.
