# Changelog

## Sin publicar (camino a v1.0.0)

### Agregado

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

- La sección aparte "Cuerpo y números" se retira del menú; `/cuerpo-numeros` lleva a sus juegos dentro de Juegos.

### Corregido

- Las grabaciones ya no se etiquetan como "Voz MMS".
- El audio ahora queda disponible sin conexión: las respuestas `no-cors` y por rangos no se podían guardar en la caché.
- Las rutas de cultura y el perfil aceptan cualquier lengua instalada, no solo quechua y aymara.
