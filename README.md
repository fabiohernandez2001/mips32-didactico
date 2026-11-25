# Datapath Lab · MIPS32

Simulador didáctico web de una ruta de datos MIPS32 monociclo. El diseño inicial aparece conectado; puedes mover bloques, añadir componentes y rehacer conexiones. El simulador calcula las señales usando la topología visible.

## Iniciar en local

Necesitas Node.js y npm instalados.

1. Abre una terminal en la carpeta del proyecto.
2. Instala las dependencias: `npm install`.
3. Inicia la aplicación: `npm run dev`.
4. Abre en el navegador la dirección local que indique Vite.

Para generar una versión de producción: `npm run build`. Para previsualizarla: `npm run preview`.

## Iniciar con Docker

Necesitas Docker Desktop o Docker Engine con Docker Compose.

```bash
docker compose up --build
```

Abre `http://localhost:8080`. Para detener el contenedor, ejecuta:

```bash
docker compose down
```

La imagen usa una etapa de Node.js para compilar la aplicación y otra etapa ligera de Nginx para servir los archivos estáticos. La configuración de Nginx incluye fallback a `index.html` para las rutas de la aplicación.

## Uso rápido

- Selecciona **Un ciclo** para ejecutar una instrucción o **Ejecutar** para avanzar continuamente. Puedes pausar y reiniciar.
- Edita el ensamblador, el PC, los registros o la memoria; pulsa **Aplicar entradas y reiniciar** para cargarlos.
- Escribe los registros iniciales como `$t0 = 7`, uno por línea. Para memoria usa `0x10010000 = 12`.
- Para crear un cable, pulsa una salida y luego una entrada compatible. Selecciona un bloque o cable para ver su explicación y sus señales.
- Puedes retirar una conexión seleccionándola y usando **Retirar conexión seleccionada**. El botón **Restaurar circuito** recupera el datapath MIPS estándar.

## Instrucciones admitidas

`add`, `sub`, `and`, `or`, `slt`, `addi`, `lw`, `sw`, `beq` y `j`.

El programa de ejemplo carga al abrir la aplicación. Usa comentarios con `#` y etiquetas con dos puntos, por ejemplo `fin:`. Los valores numéricos admiten decimal, hexadecimal (`0x...`) y binario (`0b...`).

## Alcance

La primera versión cubre el subconjunto didáctico descrito en [SPECS.md](./SPECS.md), con enteros de 32 bits, ramas y saltos de palabra. No modela segmentación ni excepciones completas.
