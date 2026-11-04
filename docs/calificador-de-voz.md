# Calificador de "¡Dilo tú!"

Quien aprende escucha una palabra, la dice al micrófono y recibe una nota de 0 a 100. Aprueba con 60 o más. La grabación se analiza en el navegador y no se sube a ningún servidor.

## Cómo califica

El código está en `frontend/src/utils/grader.js`. Usa la técnica clásica de reconocimiento de palabras aisladas por plantilla; no es un reconocedor de voz.

1. **Rasgos.** Cada 20 ms se calculan 12 coeficientes MFCC (26 bandas mel entre 90 y 5500 Hz) y sus deltas. A cada coeficiente se le quita su media y se divide por su desviación (CMVN), lo que reduce las diferencias de micrófono y de voz.
2. **Largo del tracto vocal.** La voz de quien aprende se analiza con 7 factores de deformación de frecuencia (0,8 a 1,22), y se queda el que más se acerca. Así una voz de hombre, de mujer o de niño se compara con la voz de la app en igualdad (VTLN).
3. **Alineación.** La grabación y la palabra modelo se alinean con DTW, limitado a una banda del 25 %.
4. **Palabras de comparación.** La grabación también se compara con hasta 5 palabras más: las de la misma lección o del juego, o, si no hay, otras del índice de audios de la lengua con un largo parecido. **Aprueba en sonidos solo si la palabra pedida queda más cerca que todas, con un margen del 4 %.** Si no hay palabras de comparación, se usa una distancia absoluta.
5. **Nota.** La nota combina sonidos (55 %), ritmo de la energía (15 %), duración (15 %) y número de sílabas (15 %). Si no aprueba en sonidos, la nota queda por debajo de 60 aunque el ritmo sea bueno.
6. **Consejo.** Avisa por orden: voz saturada o muy baja; "sonó más parecido a «…»"; luego el criterio más bajo (muy rápido o muy lento, una sílaba de más o de menos, ritmo, sonidos).

En una lección, el ejercicio "Dilo en voz alta" da 3 intentos. Si no aprueba, cuenta como error y la palabra pasa a "Tus palabras difíciles". Sin micrófono se puede seguir sin nota.

## Calibración

Se reproduce con `node frontend/scripts/calibrar-calificador.mjs`, que descarga los audios de la app en línea. Usa las 50 palabras que existen en quechua y en aimara: la voz modelo es la de `quz`, y como quien aprende se usan la voz de `ayr` y la de `quz` con el tono y los formantes desplazados. Cada caso se repite 10 veces con 5 palabras de comparación al azar.

| Voz de quien aprende | Dicha bien: aprueba | Otra palabra de la lista: aprueba | Otra palabra cualquiera: aprueba |
|---|---|---|---|
| otra voz (aimara) | 44 % | 3 % | 8 % |
| misma voz | 100 % | 0 % | 8 % |
| tono +15 % | 100 % | 0 % | 7 % |
| tono −13 % | 100 % | 0 % | 7 % |

## Límites

- Es una calificación orientativa y así se presenta. No identifica qué sonido falló: no puede decir que una glotalizada se dijo como simple.
- La fila "otra voz (aimara)" es el peor caso: dos modelos distintos y dos lenguas con pronunciación propia. Ahí el calificador tiende a ser estricto, no permisivo.
- La calibración usa voces sintéticas. Falta medirla con grabaciones de personas que aprenden y de hablantes nativos, para ajustar el umbral.
