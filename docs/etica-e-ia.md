# Decisiones sobre IA y ética

Base de la sección *Limitations and ethics* del artículo.

## IA que sí usa la plataforma

**Síntesis de voz neuronal.** Modelos MMS de Meta (`quz` y `ayr`), una sola vez por texto. Sin costo recurrente, sin espera para quien aprende y sin enviar datos de personas a ningún modelo.

## IA descartada

**Un modelo de lenguaje para generar contenido en quechua o aymara.** Produce morfología inventada y mezcla variedades dialectales. Enseñar una lengua inventada por un modelo contribuiría al daño que el proyecto combate. Tampoco se usó para escribir las reglas del normalizador ni el paquete de awajún.

**Reconocimiento de voz para corregir la pronunciación.** La tasa de error en estas lenguas sigue siendo alta y un falso "pronunciaste mal" desmotiva a quien aprende. Por eso "¡Dilo tú!" no usa un reconocedor: compara tu grabación con la voz de la app y con otras palabras (MFCC alineados con DTW) y aprueba solo si se parece más a la palabra pedida. La interfaz presenta la nota como orientativa. Método y calibración en [calificador-de-voz.md](calificador-de-voz.md).

**Reconocimiento de voz como validación principal del audio.** El reconocedor y el sintetizador son ambos de Meta y están entrenados con los mismos datos, así que el resultado saldría favorable por construcción.

## Limitaciones que se declaran

- El audio MMS es sintético, no de hablantes nativos, y la interfaz lo dice.
- Se usa `quz` porque no existe un modelo específico de Puno.
- Los modelos MMS tienen una sola voz. Cuando es de hombre, la voz de mujer de la app es una transformación de ella con el vocoder WORLD, no la voz de otra persona.
- Que el modelo reciba el apóstrofo no prueba que pronuncie bien las glotalizadas.
- Si nadie del equipo habla aymara, para esa lengua el equipo es externo. Debe resolverse con un colaborador o declararse.
- El awajún es una demostración técnica sin revisión de hablantes y no se publica en la plataforma.
- La nota de "¡Dilo tú!" mide el parecido con la palabra modelo, no cada sonido: no dice si una glotalizada o una aspirada se pronunció bien. Está calibrada con voces sintéticas, no con personas.

- Las unidades nuevas no agregan palabras escritas por un modelo:
  - reordenan, por su categoría en la base, vocabulario que ya venía de los diccionarios;
  - en quechua suman las partes del cuerpo del modelo 3D.
  - Los ejercicios de esas lecciones se generan con reglas fijas a partir de sus palabras (`backend/scripts/organize-units.js`).

## Datos y soberanía

- Los eventos de aprendizaje se registran solo con consentimiento, y la persona puede descargarlos y borrarlos.
- La exportación va seudonimizada: nunca lleva nombre, correo ni id interno.
- El modo aula funciona sin correo ni datos personales.
- Las grabaciones del micrófono se procesan en el navegador y se descartan al cerrar: no se suben ni se guardan en ningún servidor. Solo se registra la nota (un número), y únicamente con consentimiento.

## Declaración de uso de herramientas de IA (borrador)

> Durante el desarrollo se usó Claude Code (Anthropic), modelo Claude Opus 5.5, como asistente de programación y documentación. El contenido lingüístico no fue generado por esa herramienta. Los autores revisaron el código y son responsables de la obra.

Antes de enviarlo, completa las demás herramientas y versiones usadas, y comprueba que esa revisión sea cierta: en la sustentación van a preguntar por qué se eligió `quz`, qué mide la métrica de validación y cómo funciona la telemetría.
