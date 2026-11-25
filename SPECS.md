# SPECS: Simulador didáctico de ruta de datos MIPS32

## Objetivo

Crear una aplicación web didáctica y funcional que permita editar y simular una ruta de datos MIPS32 monociclo. La aplicación debe abrir mostrando una ruta de datos MIPS32 ya montada y conectada. El usuario puede colocar, mover y conectar componentes desde una barra de herramientas. **La topología y las conexiones editadas son la fuente real del cálculo:** si se cambia o interrumpe un camino, la simulación debe reflejar ese cambio, no ejecutar una implementación MIPS oculta que ignore el diagrama.

La interfaz, las explicaciones y los mensajes visibles deben estar en español. La tecnología web queda a elección de quien implemente el proyecto; no se requiere una cuenta, backend ni servicio externo.

## Decisiones acordadas

- Arquitectura: MIPS32 monociclo.
- Edición: colocar y mover componentes, y conectarlos.
- Semántica: la simulación se evalúa desde los componentes y conexiones presentes en el diagrama.
- Instrucciones iniciales: `add`, `sub`, `and`, `or`, `slt`, `addi`, `lw`, `sw`, `beq`, `j`.
- Entradas editables: programa en ensamblador, PC inicial, registros y memoria de datos.
- Ejecución: avance paso a paso y modo continuo con pausa y reinicio.

## Experiencia y estructura de la interfaz

La vista de trabajo debe organizar con claridad:

1. **Barra de componentes:** permite elegir un componente y colocarlo en el área de diseño.
2. **Área de diseño:** muestra el datapath MIPS32 inicial. Permite mover componentes, crear conexiones entre puertos compatibles y seleccionar componentes o cables.
3. **Panel de información:** explica el componente o cable seleccionado y muestra sus puertos, anchos y valores actuales de entrada y salida.
4. **Formulario de programa y estado inicial:** edita el ensamblador, el PC, el contenido inicial de registros y la memoria de datos.
5. **Controles de simulación:** paso, ejecutar continuamente, pausa y reinicio de la ejecución.
6. **Panel de estado:** muestra el ciclo actual, el PC, la instrucción activa, el resultado de la ejecución y los errores de ensamblado o del circuito.

La distribución debe permitir observar el circuito y su estado durante una ejecución sin que las ventanas de explicación oculten permanentemente la ruta de datos. Las explicaciones deben abrirse de forma contextual al seleccionar un componente o señal.

## Componentes del circuito

El circuito inicial y la barra deben ofrecer los bloques funcionales necesarios para ejecutar el subconjunto acordado. Como mínimo:

- PC y elementos de estado secuencial.
- Memoria de instrucciones.
- Banco de 32 registros, con dos puertos de lectura y uno de escritura.
- Memoria de datos.
- ALU y control de ALU.
- Unidad de control de instrucciones.
- Multiplexores para selección de registro destino, operando de ALU, dato de escritura y siguiente PC.
- Sumadores para `PC + 4` y destino de rama.
- Extensión de signo, desplazamiento a la izquierda y lógica de selección de rama/salto.
- Constantes y bloques lógicos auxiliares necesarios para montar o editar la ruta.

Cada bloque tiene puertos de entrada y salida explícitos. Los puertos indican nombre y ancho de señal. Como regla general, los datos y direcciones son de 32 bits; las señales de control y las condiciones booleanas son de 1 bit. Las señales de instrucción y los campos derivados conservan el ancho que define MIPS32.

El datapath inicial debe incluir conexiones funcionales para las diez instrucciones acordadas. Los cables tienen dirección y ancho. El editor debe impedir conexiones de anchos incompatibles o presentar un error claro antes de simular. Los componentes pueden ser recolocados sin alterar sus conexiones.

La edición debe permitir corregir una topología: seleccionar y retirar un componente o cable, además de conectar componentes. La simulación no debe continuar como si el circuito estuviera completo cuando falte una conexión necesaria, haya más de un controlador para una señal o exista una incompatibilidad. Debe señalar el puerto o bloque que causa el problema.

## Información didáctica

Cada componente disponible debe tener una ventana o panel contextual en español con:

- Nombre y propósito dentro del procesador.
- Explicación sencilla de su funcionamiento.
- Descripción de cada puerto de entrada y salida, con su ancho.
- Instrucciones del subconjunto que pueden usarlo.
- Valor actual de sus señales durante la simulación.

Al seleccionar un cable o puerto, se debe poder consultar el nombre, ancho y valor de la señal en ese punto. La selección de un componente o cable debe mostrar valores tanto de entrada como de salida. La señalización por color debe distinguir los bloques y cables activos durante el ciclo actual; el valor también debe aparecer como texto para que la información no dependa solo del color.

## Ensamblador y estado inicial

El formulario acepta un programa MIPS en texto, con una instrucción por línea, comentarios y etiquetas para ramas y saltos. Debe admitir la sintaxis habitual de las diez instrucciones acordadas:

```asm
add  rd, rs, rt
sub  rd, rs, rt
and  rd, rs, rt
or   rd, rs, rt
slt  rd, rs, rt
addi rt, rs, inmediato
lw   rt, desplazamiento(base)
sw   rt, desplazamiento(base)
beq  rs, rt, etiqueta
j    etiqueta
```

Debe aceptarse la numeración de registros `$0`–`$31` y sus nombres MIPS habituales. Los errores de sintaxis, instrucciones no admitidas, etiquetas sin resolver y operandos fuera de rango deben identificar la línea y explicar el problema en español.

El formulario permite establecer el PC inicial y valores iniciales de registros y direcciones de memoria de datos. Para una carga nueva, usar como valores iniciales el inicio del programa para el PC y cero para registros y memoria que el usuario no haya especificado. El registro `$zero` siempre vale cero y no admite escritura. Los valores se interpretan como palabras de 32 bits; la interfaz debe indicar el formato numérico usado y permitir revisar los valores actuales.

La memoria de datos usa direcciones MIPS de byte; `lw` y `sw` acceden a palabras de 32 bits alineadas a 4 bytes. Una dirección desalineada debe producir un error de ejecución comprensible, no una escritura silenciosa en otra posición.

## Semántica de ejecución

- Cada paso ejecuta una instrucción completa en un ciclo monociclo.
- Durante el ciclo, la unidad de control decodifica la instrucción y el circuito propaga señales por las conexiones activas.
- Al cerrar el ciclo, los elementos secuenciales actualizan su estado: como mínimo PC, banco de registros y memoria de datos cuando corresponda.
- En modo continuo, los ciclos avanzan hasta que el usuario pause, reinicie o el programa termine por quedar el PC fuera del programa cargado. Los errores del circuito o de ejecución pausan el avance y se muestran junto a su ubicación.
- El reinicio de ejecución devuelve el PC, registros y memoria a los valores iniciales actuales del formulario y pone el contador de ciclos a cero; no cambia el ensamblador ni el diseño del circuito.
- El paso y el modo continuo usan exactamente el mismo evaluador del circuito.

Las operaciones deben respetar el ancho de 32 bits. `slt` hace comparación con signo. `addi` extiende con signo su inmediato. `lw` y `sw` calculan la dirección sumando el desplazamiento con signo al registro base. `beq` compara ambos registros y, si son iguales, calcula el destino relativo a `PC + 4` usando el desplazamiento extendido con signo desplazado dos bits. `j` construye el destino usando los 26 bits de dirección de la instrucción y los cuatro bits altos de `PC + 4`, con los dos bits bajos en cero.

## Visualización por ciclo

En cada paso deben actualizarse en sincronía con la ejecución:

- Los bloques y cables que reciben o transportan señales.
- Los valores legibles de entradas y salidas de los componentes seleccionados.
- El PC actual y siguiente, la instrucción activa y el número de ciclo.
- Los registros escritos y las lecturas/escrituras de memoria producidas por ese ciclo.
- La señal de control que toma cada multiplexor y la ruta elegida, cuando corresponda.

La visualización debe corresponder a los valores calculados por la topología actual. Si una conexión editada cambia el resultado, los valores mostrados y el estado arquitectónico posterior deben reflejarlo.

## Criterios de aceptación

1. Al abrir la aplicación aparece un datapath MIPS32 monociclo conectado y listo para simular.
2. Se pueden añadir bloques desde la barra, moverlos, conectarlos y retirar bloques o cables.
3. Una modificación de conexiones afecta al resultado simulado; no se ignora en favor de una ruta interna fija.
4. Una conexión inválida o un circuito incompleto impide la simulación y explica cómo localizar el problema.
5. Cada componente puede consultarse en español y expone explicación, puertos, anchos y valores de señal.
6. Los datos de entrada permiten definir el programa, PC inicial, registros y memoria de datos.
7. Las diez instrucciones listadas se ensamblan y ejecutan de acuerdo con la semántica especificada.
8. El usuario puede avanzar un ciclo, ejecutar continuamente, pausar y reiniciar desde el estado inicial del formulario.
9. La interfaz muestra la ruta activa y los resultados de cada ciclo, incluidos cambios en registros y memoria.
10. El proyecto incluye instrucciones claras en español para instalar o iniciar la aplicación en un entorno de desarrollo local.

## Alcance de la primera versión

Implementar el simulador web monociclo y el subconjunto de instrucciones de este documento. No implementar segmentación, coprocesador, excepciones completas, interrupciones ni instrucciones fuera de la lista acordada.
