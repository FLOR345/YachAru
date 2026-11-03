# Changelog

## Sin publicar (camino a v1.0.0)

### Agregado

- Voz con los modelos MMS de Meta, generada en línea con el flujo `Audio MMS` contra Neon y Cloudinary.
- Tabla `audios`: un audio por texto y lengua, con su fuente (`grabado` o `mms`) y su modelo.
- Voz de mujer y de hombre, a elegir en la lección y el diccionario. Los modelos MMS tienen una sola voz; la otra se obtiene transformándola con el vocoder WORLD y se declara como transformada.
- Audio más lento (75 % de la velocidad del modelo), con un breve silencio antes y después de cada palabra.
- Voz MMS también en frases, números, ejemplos y textos culturales, mediante un índice por lengua.
- Cobertura pública: `GET /api/validation/cobertura`, con la definición de cada cifra.
- Revisión del léxico por hablantes en línea (`/validacion`), que conserva el valor original.
- Paquete de idioma en un solo archivo, con el awajún como demostración técnica.
- `CITATION.cff`, `.zenodo.json`, `LICENSE-AUDIO.md` y documentación de las decisiones sobre IA.

### Corregido

- Las grabaciones ya no se etiquetan como "Voz MMS".
- El audio ahora queda disponible sin conexión: las respuestas `no-cors` y por rangos no se podían guardar en la caché.
- Las rutas de cultura y el perfil aceptan cualquier lengua instalada, no solo quechua y aymara.
