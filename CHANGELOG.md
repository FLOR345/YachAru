# Changelog

## Sin publicar (camino a v1.0.0)

### Agregado

- Más unidades sin inventar vocabulario (`backend/scripts/organize-units.js`):
  - Aymara pasa de 6 a 16 unidades y quechua de 6 a 9.
  - Las palabras que estaban en lecciones de otro tema pasan a unidades propias según su categoría en la base: el cuerpo, la casa, la ropa, el tiempo, la naturaleza, acciones, cómo es, cultura y música, números grandes y cantidades.
  - El quechua suma el cuerpo, con las partes del modelo 3D.
  - Lecciones de 9 a 12 palabras, cada una con 9 ejercicios generados con sus propias palabras.
  - El avance de cada persona se conserva.
- Camino de aprendizaje sobre islas ilustradas:
  - las lecciones y estaciones van sobre las piedras, con el trofeo al final y varias islas encadenadas si la unidad es larga;
  - islas que flotan, nubes, cóndor, mariposas y rayos en el trofeo completado;
  - cabecera de cada unidad con la cordillera en verde oscuro;
  - el contador cuenta todos los pasos visibles;
  - botón flotante «Continuar».
- «Cantar con ritmo» en las canciones:
  - acompañamiento de huayno sintetizado (bombo, wankara y charango);
  - cuenta de entrada y karaoke palabra por palabra, a velocidad normal o lenta.
- Voz con los modelos MMS de Meta, generada en línea con el flujo `Audio MMS` contra Neon y Cloudinary.
- Tabla `audios`: un audio por texto y lengua, con su fuente (`grabado` o `mms`) y su modelo.
- Voz de mujer. Los modelos MMS tienen una sola voz; cuando es de hombre, se transforma con el vocoder WORLD y se declara como transformada.
- Audio más lento (75 % de la velocidad del modelo), con un breve silencio antes y después de cada palabra.
- Voz MMS también en frases, números, ejemplos y textos culturales, mediante un índice por lengua.
- Cobertura pública: `GET /api/validation/cobertura`, con la definición de cada cifra.
- Revisión del léxico por hablantes en línea (`/validacion`), que conserva el valor original.
- Paquete de idioma en un solo archivo, con el awajún como demostración técnica.
- `CITATION.cff`, `.zenodo.json`, `LICENSE-AUDIO.md` y documentación de las decisiones sobre IA.
- "¡Dilo tú!": grabar tu voz con el micrófono y recibir una nota de un calificador (sonidos, ritmo, duración y sílabas, con un consejo). Aprueba con 60 o más y solo si tu grabación se parece más a la palabra pedida que a otras; en las lecciones hay 3 intentos y, si no aprueba, cuenta como error. Método y calibración en `docs/calificador-de-voz.md`. Aparece en cada lección (con "Ahora no puedo hablar"), en cada palabra de las lecciones y del diccionario, al explorar el cuerpo y como juego. La grabación no sale del dispositivo.
- El cuerpo en todo el programa: las palabras que son partes del cuerpo se pueden ver en el modelo 3D desde la lección, el diccionario y los juegos, y las lecciones con esas palabras incluyen el ejercicio "Toca en el cuerpo".
- Juegos nuevos: "Lluvia de palabras", "Arma la palabra", "¿Sí o no?" y "¡Dilo tú!". Los juegos del cuerpo y de los números pasan a la página de Juegos, agrupados.

### Cambiado

- Estilo de vidrio líquido en las tarjetas de color, en lugar de las rayas diagonales.
- Juegos en este orden: tus palabras, hablar, números y cuerpo. Números y cuerpo tienen una tarjeta cada uno.
- El camino de aprendizaje tiene estaciones: "¡Dilo tú!" a mitad de cada unidad, cuerpo y números junto a sus lecciones, y un juego de repaso antes del trofeo.
- Modo aula para docentes rediseñado:
  - los 3 pasos y la lengua a elegir con botones;
  - vista previa del aula;
  - código para proyectar en clase y botón de compartir;
  - resumen con cifras, podio, barras por estudiante, búsqueda y orden.

- Cuerpo y números quedan en una sola tarjeta de Juegos. Adentro se elige tema y actividad, cada una con su "cómo se juega", y en el celular la consigna va sobre el modelo 3D.
- Flujo de audio con los modos `comparar` y `rehacer-cortas`, para elegir de oído un estilo de síntesis para las palabras cortas y regenerarlas.

- La sección aparte "Cuerpo y números" se retira del menú; `/cuerpo-numeros` lleva a sus juegos dentro de Juegos.

### Corregido

- Ya no aparece un destello morado al cambiar de pantalla (el fondo base era morado).
- Los adornos de fondo cubren toda la ventana: ya no se ven cortes a los costados ni una pantalla partida en el celular.

- Las grabaciones ya no se etiquetan como "Voz MMS".
- El audio ahora queda disponible sin conexión: las respuestas `no-cors` y por rangos no se podían guardar en la caché.
- Las rutas de cultura y el perfil aceptan cualquier lengua instalada, no solo quechua y aymara.
