# Changelog

## Sin publicar (camino a v1.0.0)

### Agregado

- Pruebas del modo aula (`database/migrations/006_pruebas.sql`), de dos tipos:
  - **prueba de unidad**: una unidad completa;
  - **sesión breve**: sesiones elegidas de una unidad, o una miscelánea de varias.

  El docente las crea, las abre, las cierra y ve la mejor nota de cada alias. El estudiante las ve en «Mi aula», puede **estudiar primero** las palabras que pueden salir (con audio y micrófono) y luego darla. La clave de respuestas se queda en el servidor.
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

- **Aymara con fuente abierta.** El vocabulario aymara anterior (996 filas) venía entero de un diccionario del Ministerio de Educación de Chile, sin licencia de redistribución confirmada y de otra variedad. Se reemplazó por la lista de aymara central de Félix Layme Pairumani en el *Intercontinental Dictionary Series* (CC BY 4.0), con traducciones de Concepticon:
  - `languages/aymara/generar_desde_ids.py` la pasa al alfabeto oficial con reglas fijas (con pruebas en CI) y deja fuera préstamos y 9 conceptos;
  - `backend/scripts/aymara-desde-ids.js` arma 19 unidades (una por capítulo), 77 lecciones, 795 palabras y 693 ejercicios, con copia previa del contenido anterior;
  - se retiraron los 961 ejemplos de oraciones aymara, que no tenían fuente.
- Los efectos visuales de React Bits (licencia MIT + Commons Clause, que prohíbe redistribuirlos) se reemplazaron por implementaciones propias en `frontend/src/components/fx/`, con la licencia MIT del proyecto.
- `npm run cifras` (en `backend`) escribe `docs/cifras.md` y `docs/cifras.json` con todas las cifras sobre la base real y su definición. Lo que falta aparece como pendiente.
- Guías para el equipo: `docs/protocolo-evaluacion.md`, `docs/guia-revision-lexico.md`, `docs/piloto-curso.md` y `docs/plantillas-correos.md`. Además, `REVIEWERS.md` (en inglés) para comprobar el proyecto en cinco minutos.

- Calificador de voz más amable: aprueba con 50 y basta con que la palabra pedida sea la más parecida. Si se reconoce, saca al menos dos estrellas.
- Colores más vivos: el vidrio líquido deja pasar menos el fondo, y el verde y el azul de las lenguas son más saturados.

- Los niveles del camino quedan centrados sobre cada piedra y con su tamaño. Sin aves en el camino.
- Vidrio líquido en la ficha de cada libro, en la portada de la biblioteca y en la búsqueda del diccionario.

- Tarjetas de color en vidrio líquido teñido (translúcido, con desenfoque y borde de luz), con un reflejo que se desliza.
- Camino: nubes en tres capas con profundidad, más mariposas, luciérnagas y destellos (GSAP); el letrero del trofeo va debajo del trofeo; botón Continuar con una luz que recorre su borde.
- Cantar con ritmo:
  - charango con cuerdas pulsadas, quena con melodía, bajo, reverberación y compresor;
  - la música baja cuando entra la voz;
  - ecualizador en vivo, botones por instrumento y modo sin voz para cantar.

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

- Docker no cargaba la migración 006 (pruebas del aula). La CI ahora comprueba que `docker-compose.yml` monte todas las migraciones.

- Modo aula:
  - el enlace que comparte el docente trae el código del aula (`/aula?codigo=…`), así que el estudiante solo escribe su alias;
  - al unirse entra a «Mi aula» (`/mi-aula`, `GET /api/classroom/student/me`) y no al panel general. Ahí ve su aula y su docente, su puesto, el avance de la clase, un podio por alias y su código personal.

- Ya no aparece un destello morado al cambiar de pantalla (el fondo base era morado).
- Los adornos de fondo cubren toda la ventana: ya no se ven cortes a los costados ni una pantalla partida en el celular.

- Las grabaciones ya no se etiquetan como "Voz MMS".
- El audio ahora queda disponible sin conexión: las respuestas `no-cors` y por rangos no se podían guardar en la caché.
- Las rutas de cultura y el perfil aceptan cualquier lengua instalada, no solo quechua y aymara.
