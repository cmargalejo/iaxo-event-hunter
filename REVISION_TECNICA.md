# Revisión técnica de IAXO Event Hunter

Base: commit `6de19e3`, con los errores de `morphCount` y `posCount` ya corregidos.

## Hallazgos y limpieza

| Área                 | Hallazgo                                                                                                                                                                            | Cambio                                                                                                                                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOM                  | No se encontraron más referencias activas a IDs inexistentes en la base corregida. La pantalla de energía y sus elementos seguían presentes, pero eran inaccesibles desde el juego. | Eliminada esa pantalla; las 32 dependencias fijas del DOM se resuelven y validan al iniciar. La base tenía 38 IDs únicos en sus seis pantallas; la explicación del spot añade tres, para un total actual de 41.                                                                           |
| Funciones obsoletas  | `confirmPosition()` no tenía llamadas; era la única entrada a `showEnergy()`.                                                                                                       | Eliminadas ambas funciones y la gráfica duplicada de la pantalla antigua. Se conserva la gráfica de energía de los resultados.                                                                                                                                                            |
| Estado innecesario   | `answers` solo se escribía. El `positionScore` global no se utilizaba para leer la puntuación. El número de eventos compatibles con rayos X se calculaba varias veces.              | Eliminadas esas variables; estado de partida reunido en `game` y análisis de resultados calculado en un único lugar.                                                                                                                                                                      |
| CSS heredado         | Estilos sin elementos o rutas activas: `.secondary`, `.footer`, `.positionCount`, `.funnelRow`, `.algoScore`, `.algoMetric`, `.dot.reject`, además de `--bg` y `--card`.            | Eliminados. También se retiró una regla móvil de `.stats` que siempre quedaba anulada por el estilo inline. Se mantiene la distribución efectiva de tres columnas.                                                                                                                        |
| Eventos              | Manejadores inline y funciones globales; la protección frente a respuestas repetidas dependía exclusivamente de deshabilitar los botones.                                           | Manejadores con `addEventListener`, código encapsulado y bloqueo explícito mientras se muestra la respuesta.                                                                                                                                                                              |
| Reinicio             | El reinicio solo cambiaba de pantalla; el estado se restablecía de forma dispersa al avanzar.                                                                                       | Reinicio explícito de la partida y cancelación del temporizador pendiente.                                                                                                                                                                                                                |
| Histograma           | El grupo visual «6+» se usaba también para calcular probabilidades de siete o más candidatos.                                                                                       | La probabilidad se cuenta antes de agrupar, usando el umbral real. Se conserva el histograma con siete barras.                                                                                                                                                                            |
| Nombres              | El campo `signal` significaba «parece un rayo X», sin distinguir su origen físico.                                                                                                  | Renombrado a `isXray`. También se aclararon nombres de puntos, dibujo y generación aleatoria.                                                                                                                                                                                             |
| Accesibilidad        | Los puntos seleccionables del detector solo respondían al ratón.                                                                                                                    | Activación con Enter o Espacio, estado `aria-pressed`, indicador de foco y anuncios del feedback. El aspecto con ratón permanece igual.                                                                                                                                                   |
| Mantenimiento        | HTML, CSS y JavaScript muy comprimidos, con estilos y funciones obsoletos mezclados.                                                                                                | Formato legible, constantes para tamaños de la partida y tiempos, comprobaciones estáticas y pruebas de navegador reproducibles.                                                                                                                                                          |
| Explicación del spot | El juego pedía seleccionar el punto de enfoque sin explicar la óptica ni el fondo.                                                                                                  | Añadida una explicación breve y un esquema accesible antes del entrenamiento: la óptica refleja y concentra la mayor parte de la señal solar en una zona pequeña del detector; reducir el área de búsqueda reduce el fondo esperado, aunque puede haber eventos de fondo dentro del spot. |

## Comportamiento conservado

- Seis ejemplos de entrenamiento y doce eventos por partida.
- Textos, colores, tipografías, tamaños, logotipo integrado y disposición visual.
- Las mismas distribuciones aleatorias, huellas de eventos y representación del espectro.
- El embudo y la gráfica muestran el **análisis correcto de referencia**. Las respuestas del jugador determinan sus puntuaciones; no cambian los candidatos del análisis de referencia. Este comportamiento ya existía y se conserva.
- La simulación de fondo sigue siendo un modelo didáctico de 5000 partidas con media 0,8, no una predicción experimental de IAXO. Esta revisión es de software, no una validación del modelo físico.
- La aplicación sigue siendo un único `index.html` autónomo, sin compilación ni dependencias de ejecución. Las dependencias de Node son exclusivamente para las comprobaciones de desarrollo.
- La explicación de la óptica se basa en el [diseño conceptual de IAXO](https://arxiv.org/abs/1401.3233), que describe fotones de señal focalizados en un spot pequeño sobre detectores de rayos X de bajo fondo.
- La pantalla introductoria amplía deliberadamente su contenido para explicar el spot. Las demás pantallas conservan sus textos, ilustraciones, feedback y puntuaciones de la base.

## Validación

- Análisis estático: sintaxis, variables inexistentes o sin uso, duplicados, referencias al DOM, pantallas, manejadores y formato.
- Comparación con la base usando eventos reproducibles: las pantallas de inicio, entrenamiento, clasificación, posición y resultados fueron idénticas píxel a píxel a 1365 y 390 píxeles de anchura. La pantalla de ejemplos mantiene sus cuatro ilustraciones y añade la explicación del spot. Coincidieron también los textos, gráficas, feedback y puntuaciones de las pantallas existentes.
- Pruebas de navegador: respuestas correctas e incorrectas, activación repetida durante el feedback, selección y deselección, teclado, resultados, dos partidas consecutivas y una partida sin candidatos.
- Prueba específica del histograma: seis candidatos simulados no cuentan para un umbral de siete; siete sí cuentan, aunque ambos se representen en «6+».
- Los 70 selectores CSS restantes encuentran elementos durante las pruebas, incluidos los estados dinámicos. Sin errores JavaScript ni fallos de carga en los recorridos probados.

## Ejecutar las comprobaciones

Con Node.js compatible con las dependencias fijadas en `package-lock.json`:

```sh
npm ci
npx playwright install chromium
npm run check
npm test
```

Para probar la versión publicada y comprobar que sirve el mismo HTML local:

```sh
GAME_URL=https://cmargalejo.github.io/iaxo-event-hunter/ npm test
```

Para aplicar el formato del proyecto:

```sh
npm run format
```
