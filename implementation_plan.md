# Plan de Especialización: Hermes v3.0

Este plan introduce una arquitectura de "Especialistas" para Hermes, permitiéndole ser más experto en áreas específicas sin perder su versatilidad general, y simplifica el proceso de despliegue.

## User Review Required

> [!IMPORTANT]
> **Sobre las actualizaciones en GitHub**: Actualmente, mis cambios se quedan en el "laboratorio" de mi workspace. Para que lleguen a Railway, **debes hacer un `git push`**. He incluido en este plan un script de "Autodespliegue" (`deploy.sh`) para que puedas hacerlo con un solo comando.

## Cambios Propuestos

### 1. Sistema de Especialistas
- **Modos de Agente**: Implementaremos 3 modos principales:
    - **`CodeExpert`**: Especializado en `github`, `fix` y arquitectura de software.
    - **`WorkManager`**: Especializado en `gog` (Google Gmail, Calendar, Drive).
    - **`HermesPrime`**: El asistente general con "Superpowers" para todo lo demás.
- **Cambio de Contexto**: El agente podrá cambiar su propio sistema de prompts si detecta que la tarea es muy específica.

### 2. Flujo de Razonamiento "Plan-first"
- Obligaremos al agente a escribir un **Plan Interno** en la primera iteración de cada mensaje complejo antes de llamar a cualquier herramienta.

### 3. Automatización del Despliegue
- Crear un script `deploy.sh` en la raíz del proyecto para automatizar la copia de archivos y el commit a GitHub.

## Componentes a Modificar

#### [NEW] [specialists.ts](file:///home/javier-montoro/.gemini/antigravity/brain/03fa5ddc-9cbe-4cb9-92c8-0010a32dc0a8/src/specialists.ts)
- Definiciones de prompts especializados.

#### [MODIFY] [agent.ts](file:///home/javier-montoro/.gemini/antigravity/brain/03fa5ddc-9cbe-4cb9-92c8-0010a32dc0a8/src/agent.ts)
- Integrar la selección de especialista y el paso de planificación.

#### [NEW] [deploy.sh](file:///home/javier-montoro/.gemini/antigravity/brain/03fa5ddc-9cbe-4cb9-92c8-0010a32dc0a8/deploy.sh)
- Script para sincronizar el espacio de trabajo con el repositorio de Hermes y subir los cambios.

## Verificación Plan

### Automatizada
- Verificar que el script `deploy.sh` funciona correctamente y copia todos los archivos de `src/`.

### Manual
- Preguntar a Hermes: "Actúa como un experto en código y analiza mi repositorio".
- Verificar que el agente responde: "Cambiando a modo CodeExpert... Usando skill github para..."
