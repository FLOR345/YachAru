# Audio con modelos MMS

Genera la pronunciación con modelos de síntesis de voz **entrenados en la lengua** (Meta MMS), en lugar del sintetizador de español del navegador, que no distingue las consonantes glotalizadas ni aspiradas.

| Lengua | Modelo | Variedad |
| --- | --- | --- |
| Quechua | `facebook/mms-tts-quz` | Cusco-Collao (el grupo dialectal de Puno) |
| Aymara | `facebook/mms-tts-ayr` | Aymara central |

Otra lengua usa el modelo que declare su paquete en `voz.modelo`.

**Velocidad.** Para quien aprende, el modelo habla rápido. Se genera al 75 % de su velocidad (`--velocidad 0.75`) y con un cuarto de segundo de silencio antes y después.

**Voz de mujer.** Cada modelo MMS tiene **una sola voz** (`num_speakers: 1`). El proceso mide su tono medio: si es voz de hombre, la transforma en voz de mujer con el vocoder WORLD (`pyworld`), subiendo el tono ×1,7 y desplazando los formantes ×1,17. La transformación queda marcada en la tabla `audios` (`transformada = true`). Si el modelo ya tiene voz de mujer, se usa tal cual. Las grabaciones de personas no se tocan.

**Comprobado en los vocabularios publicados de los modelos:** `quz` y `ayr` incluyen el apóstrofo, y `ayr` también `ä ï ü`. Las glotalizadas y las vocales largas llegan al modelo como símbolos propios y no se descartan. Esto no prueba que suenen bien.

**Licencia del audio:** CC BY-NC 4.0, la de los modelos MMS (el código de SimiAru es MIT). Ver `LICENSE-AUDIO.md`.

## Todo corre en línea

El flujo [`Audio MMS`](../../.github/workflows/audio-mms.yml) corre en GitHub Actions, contra la base de Neon y Cloudinary. Solo necesita cuatro secretos en el repositorio (*Settings → Secrets and variables → Actions*), con los mismos valores que ya tiene Render:

`DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### 1. Lote de prueba

*Actions → Audio MMS → Run workflow*, con modo `prueba`. Genera 30 palabras por lengua, sin escribir en la base, y las deja como artefacto de la corrida para escucharlas. Anota cuáles suenan mal y por qué fenómeno.

### 2. Generación completa

Con modo `completo`, el flujo:

1. aplica las migraciones pendientes;
2. registra las voces grabadas en la tabla `audios`;
3. genera cada texto que aún no tiene audio (vocabulario, ejemplos, dictados, textos culturales y frases de la interfaz);
4. sube cada audio a Cloudinary (`simiaru/audio/<idioma>/`) y lo guarda en `audios`;
5. llena `vocabulario.audio_url` solo en las filas vacías;
6. actualiza `database/seed/contenido.sql`, para que una instalación nueva reproduzca la plataforma con su audio.

Cada audio se guarda al terminarlo: si la corrida se corta, se repite y continúa donde quedó.

## Las voces grabadas no se tocan

Toda URL fuera de `simiaru/audio/` se considera una grabación. Una grabación se registra como `fuente = 'grabado'`, nunca se regenera, y la misma palabra en otras lecciones la reutiliza en lugar de usar voz sintética. Si un administrador sube una grabación para una palabra que ya tenía voz MMS, la próxima corrida deja la grabación como audio oficial de ese texto. Las pruebas de `test_generate_audio.py` cubren estas reglas.

## Cómo se decide qué voz suena

1. El audio de la palabra (`vocabulario.audio_url`).
2. El índice de la lengua (`GET /api/validation/audios/:idioma`), para frases, números y canciones.
3. La voz del navegador, solo si no hay audio. La interfaz lo indica.

La clave de cada texto se calcula igual en Python, en el backend y en el frontend: `audio_key_vectors.json` son los casos que las tres pruebas comparten.

## Cobertura

`GET https://simiaru.onrender.com/api/validation/cobertura` devuelve, por lengua, filas, entradas únicas, audio MMS, audio grabado, filas sin audio y palabras con cada fenómeno, junto con la definición de cada cifra. Esos son los números que se reportan en el artículo.

## Palabras cortas

El modelo a veces pronuncia mal las palabras de una o dos sílabas (por ejemplo, "ama"). Para corregirlas sin tocar el resto:

1. **Comparar.** En Actions → Audio MMS, elige el modo `comparar`. Genera cada palabra de la lista en cuatro estilos y deja los WAV en el artefacto `audio-comparar`. No escribe nada en la base.
   - A: el actual.
   - B: estable, con menos ruido de síntesis.
   - C: estable y más lento.
   - D: estable y más ágil.
2. **Rehacer.** Elige el modo `rehacer-cortas`, con el estilo que suene mejor y un largo máximo en letras (5 por defecto). Vuelve a generar todas las palabras MMS de ese largo, las reemplaza en Cloudinary y actualiza `audios` y `vocabulario`. Las grabaciones de personas no se tocan.
