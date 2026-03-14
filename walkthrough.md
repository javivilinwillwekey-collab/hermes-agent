# Walkthrough: Hermes v3.0 — Los Especialistas 🎭

¡Bienvenido a la versión más avanzada de Hermes! Ahora tu asistente no solo es autónomo, sino que tiene perfiles especializados para tareas críticas.

## 🌟 Novedades en la v3.0

### 1. Modos Especialistas
Hermes ahora puede "cambiar de personalidad" mentalmente para darte respuestas más profundas:
- **`HermesPrime`**: El orquestador inteligente para tareas generales.
- **`CodeExpert`**: Se activa cuando hablas de código o GitHub. Es más técnico y metódico.
- **`WorkManager`**: Se activa cuando gestionas correos o calendario. Enfocado en productividad.

### 2. Bucle de Planificación (Plan-first)
Ahora, antes de ejecutar cualquier herramienta compleja, Hermes escribirá un **PLAN DE ACCIÓN**. Esto hace que sus pasos sean mucho más lógicos y fáciles de seguir para ti.

### 3. Actualización Semi-Autónoma (`deploy.sh`) 🚀
He creado un script para que no tengas que copiar archivos uno por uno nunca más. 

## 📂 Cómo Actualizar a la v3.0

Para aplicar todos estos cambios, ejecuta este bloque de comandos en tu terminal. Esto copiará todo lo nuevo a tu carpeta de Hermes y lo subirá a GitHub automáticamente:

```bash
# 1. Ve a la carpeta del laboratorio
cd /home/javier-montoro/.gemini/antigravity/brain/03fa5ddc-9cbe-4cb9-92c8-0010a32dc0a8

# 2. Dale permisos al script y ejecútalo
chmod +x deploy.sh
./deploy.sh
```

**¿Qué hace el script?**
1.  Sincroniza todos los archivos (`index.ts`, `src/*.ts`, `Dockerfile`, etc.).
2.  Crea la estructura de carpetas necesaria.
3.  Hace el `git add`, `commit` y `push` por ti.

---

## 🎯 Prueba las nuevas capacidades

Una vez que Railway termine de compilar (mira el dashboard de Railway para confirmar), prueba esto en Telegram:

- **Prueba de Planificación:** *"Hermes, necesito que analices mi repositorio de GitHub y me digas qué PRs están abiertas"*
    - Verás que primero redacta un Plan y luego usa la skill de GitHub.
- **Prueba de Especialista:** *"Revisa mis últimos correos y dime si tengo algo urgente hoy"*
    - Hermes entrará en modo `WorkManager` para ayudarte.

---
**Nota:** Recuerda que para que `gh` y `gog` funcionen, debes haberlos configurado previamente (como indicamos en v2.0). Si necesitas ayuda con el login de esas herramientas, ¡házmelo saber! 🤖🦾
