# Coordinación multiagente del simulador MIPS32

## Cerebro y flujo de trabajo

Cerebro es el único orquestador. Convierte cada petición en tareas pequeñas con identificador, objetivo verificable, archivos permitidos, agente responsable y dependencias. Antes de asignar una tarea, revisa el estado actual del repositorio y el trabajo pendiente.

- Cada archivo editable tiene un solo agente escritor activo. Los revisores pueden leerlo, pero no editarlo.
- Las tareas dependientes se ejecutan en orden; Cerebro comunica el resultado necesario al siguiente agente y comprueba su entrega.
- Diseño puede trabajar en paralelo con motor cuando las rutas no se solapan. QA comienza la validación funcional después de que motor entregue; si detecta fallos, Cerebro crea una tarea correctiva nueva y la vuelve a pasar a QA.
- LOGGER registra las solicitudes y los resúmenes de comunicación que Cerebro le transmite. Es el único rol que publica cambios en `fabiohernandez2001/mips32-didactico`, y lo hace cuando Cerebro confirma la integración y QA da el visto bueno. Solo modifica configuración Docker si cambian dependencias o el modo de ejecución.
- No ejecutar Docker salvo que la petición lo solicite. QA sí ejecuta las verificaciones locales que Cerebro acuerde para cada entrega.
- Cerebro revisa los cambios y el registro antes de declarar terminada una petición.

## Roles y áreas de escritura

| Rol | Puede editar | Responsabilidad |
| --- | --- | --- |
| DESIGNER | `src/styles.css` | Diseño adaptable e interactivo, tamaños, contornos, contraste, estados activos y presentación visual de señales. Informa a Cerebro si la corrección necesita JSX. |
| ENGINE | `src/simulator.js` | Ensamblador, validación del grafo, evaluación de señales y semántica de ejecución MIPS32. |
| QA | `src/simulator.test.js` y nuevos archivos de prueba acordados | Pruebas unitarias e integradas, incluyendo un caso de instrucción codificada en binario, cambios de estado y errores del circuito. No corrige código de producto. |
| LOGGER | `agent-activity.log`; archivos Docker solo con tarea específica autorizada por Cerebro | Registro append-only de actividad y comunicación recibida de Cerebro; publicación en GitHub de cambios integrados y aprobados por QA; revisión de necesidades de Docker. |
| Cerebro | `AGENTS.md` y documentación de coordinación | Descomposición, dependencias, asignación sin solapamientos, revisión de entregas y decisión de cierre. No comparte secretos ni delega decisiones externas. |

## Herramientas por rol

- DESIGNER: lectura y edición local de CSS; inspección visual de la interfaz si Cerebro la habilita.
- ENGINE: lectura y edición local del motor y comandos locales de análisis.
- QA: lectura del proyecto, edición de archivos de prueba y ejecución de las pruebas locales solicitadas.
- LOGGER: edición del registro, GitHub para leer/publicar únicamente los archivos confirmados, y edición puntual de Docker cuando Cerebro lo indique.
- Cerebro: herramientas necesarias para coordinar, revisar y resolver dependencias.

La plataforma de agentes de Codex no ofrece aislamiento técnico de herramientas por subagente. Por eso esta matriz limita el uso mediante asignaciones explícitas y revisión de los archivos tocados; no equivale a un sandbox de permisos. Ningún rol debe usar herramientas externas fuera del encargo, y no se entregan credenciales a los agentes.

## Ciclo de revisión

1. Cerebro identifica el fallo y asigna una tarea atómica.
2. El agente informa archivos tocados, hallazgos y comprobación realizada.
3. Cerebro comprueba que el alcance no se haya ampliado y resuelve dependencias.
4. QA ejecuta las pruebas correspondientes y entrega resultados reproducibles.
5. Si hay fallos, Cerebro vuelve a asignar solo los archivos afectados; QA repite la comprobación.
6. Tras la aprobación de Cerebro y QA, LOGGER publica los archivos confirmados en GitHub y anota el resultado en `agent-activity.log`.

## Reglas del proyecto

- La especificación funcional está en `SPECS.md`; una decisión nueva debe registrarse allí antes de cambiar el comportamiento.
- Mantener en español los textos visibles de la aplicación y los mensajes para el usuario.
- No anunciar una prueba como satisfactoria si no se ejecutó y observó su resultado.
