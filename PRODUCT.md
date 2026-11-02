# Product

<!-- impeccable:product-schema 1 -->

> Fuente: código del repositorio y la propuesta "Propuesta de artículo SimiAru en SoftwareX" (28/10/2026).
> El autor pidió no hacer entrevista. Lo marcado **(inferido)** sale de esa propuesta o del código y está pendiente de confirmar.

## Platform

web

## Users

- **Aprendices principales:** jóvenes y adultos hispanohablantes del sur del Perú, sobre todo de Puno, que quieren aprender o recuperar el quechua o el aymara. El primer uso real previsto es un curso universitario con adultos en Puno (noviembre y diciembre de 2026). **(inferido de la propuesta)**
- **Docentes:** usan la plataforma con un grupo o curso y necesitan ver el avance de sus estudiantes. **(inferido)**
- **Investigadores:** reutilizan la plataforma y sus datos de aprendizaje anonimizados para estudiar la adquisición y revitalización de lenguas originarias, o la adaptan a otra lengua. **(inferido)**

## Product Purpose

SimiAru enseña vocabulario y cultura del quechua y del aymara con lecciones cortas, ejercicios, un diccionario y textos culturales, usando gamificación (rachas, puntos e insignias).

Existe porque estas lenguas pierden hablantes jóvenes y las herramientas digitales disponibles son cerradas: no se pueden inspeccionar, modificar ni usar para investigar.

El éxito tiene dos medidas: que un aprendiz vuelva cada día y avance de lección, y que otro docente o investigador pueda instalar SimiAru, agregar una lengua y exportar datos sin escribir código.

## Positioning

Es la plataforma **abierta y auditable** (código MIT) para quechua y aymara. **(inferido)** Su objetivo es:
- pronunciar con voz entrenada en esas lenguas, en lugar del sintetizador de español;
- exportar datos de aprendizaje;
- crecer a nuevas lenguas mediante paquetes de configuración.

Ninguna alternativa conocida (Duolingo, la app del Minedu, Yachay Quechua) reúne esas cuatro cosas.

## Operating Context

- **Uso principal:** sesiones cortas en el navegador, a menudo en el celular y en zonas con conexión irregular **(inferido)**. Se puede probar sin cuenta: el modo invitado abre la Unidad 1.
- **Recorrido actual:**
  - inicio → registro o inicio de sesión (correo, Google o Facebook);
  - panel → unidades → lección (vocabulario y ejercicios);
  - además: diccionario con búsqueda, módulo cultural con favoritos, y perfil con progreso e insignias.
- **Rutas:** `/`, `/login`, `/register`, `/dashboard`, `/lesson/:lessonId`, `/dictionary`, `/culture`, `/profile`, `/aula`, `/docente`, `/practica`, `/cuerpo-numeros`, `/evaluacion`, `/validacion`.
- **Se evalúa también como artículo científico** (SoftwareX): un revisor clonará el repositorio, lo levantará y comprobará en minutos lo que afirma el título.
- **Despliegue:** frontend en Vercel, backend en Render (plan gratuito, se duerme tras 15 minutos sin uso), base PostgreSQL en Neon.

## Capabilities and Constraints

- **Stack:** React 18 + Vite + Tailwind + React Router (frontend); Node/Express + Passport + JWT (backend); PostgreSQL (Neon); Cloudinary (archivos) y Brevo (correo).
- **Contenido (base real, octubre 2026):**
  - 2 lenguas, 12 unidades y 26 lecciones (13 por lengua);
  - 1.503 entradas de vocabulario (996 de aymara y 507 de quechua);
  - 285 ejercicios, 69 contenidos culturales y 7 insignias.
- **Variedades:** quechua Cusco-Collao (la de Puno) y aymara central.
- **Interfaz en español** (`lang="es"`). Las palabras originarias contienen glotalizadas (`p'`, `t'`, `k'`, `q'`) y aspiradas (`ph`, `kh`…), que cambian el significado: su escritura y su pronunciación no se pueden simplificar.
- **Audio:** audio pregenerado con los modelos MMS de Meta (`quz` y `ayr`), con licencia **CC BY-NC 4.0**, separada de la licencia MIT del código. Se genera en línea con el flujo `Audio MMS`, contra Neon y Cloudinary. Las voces grabadas se conservan y se etiquetan como tales. La voz del navegador en español queda solo como respaldo de lo que aún no tiene audio.
- **Datos, aula, PWA y corrector:** exportación de eventos con consentimiento, modo aula por código, PWA sin conexión y normalizador dialectal.
- **Validación en línea:** `/validacion` (léxico y resultados) y `/evaluacion` (hablantes, con código).
- **Paquetes de idioma:** un archivo de configuración y un comando. El awajún es una demostración técnica sin revisión de hablantes y no se publica en la plataforma.
- **Decisión firme:** no usar un modelo de lenguaje para generar contenido en quechua o aymara, porque inventa morfología y mezcla variedades.
- **Pendiente de confirmar:**
  - la licencia del diccionario fuente del Ministerio de Educación de Chile;
  - si se suma un colaborador aymarahablante;
  - si un hablante de awajún revisa la demostración.

## Brand Commitments

- **Nombre:** SimiAru. *Simi* significa "lengua/palabra" en quechua y *aru* lo mismo en aymara, así que el nombre representa las dos lenguas por igual.
- **Logo:** existe en `frontend/src/assets/logo.jpg`. La página de inicio usa una llama como mascota.
- **Tono:** cercano, en español, sin exagerar.
- **Honestidad como compromiso:** el audio se llama **sintetizado**, nunca "de hablantes nativos", y solo se publican cifras reales.

## Evidence on Hand

- **Hay:** el contenido real de la base, el logo y los audios grabados en Cloudinary (7 filas, 5 palabras distintas).
- **No hay, y no se debe inventar:**
  - testimonios de usuarios (los que había eran ficticios y se quitaron);
  - calificaciones;
  - cifras de usuarios activos (hay unos 9 usuarios registrados);
  - audios de hablantes nativos;
  - alianzas institucionales;
  - resultados de evaluación.
- **Evidencia futura:**
  - la validación perceptual del audio con 8 a 10 hablantes nativos;
  - el piloto en el curso universitario;
  - la revisión completa del léxico quechua por un hablante nativo.

## Product Principles

1. **La lengua manda sobre la interfaz.** Glotalizadas, aspiradas y variantes dialectales se muestran y se pronuncian con exactitud. Ningún atajo técnico ni visual las simplifica.
2. **Honestidad verificable.** Toda afirmación (cifras, audio, funciones) tiene que poder comprobarse en minutos, por un usuario o por un revisor.
3. **Abierta y reutilizable.** Cada función se piensa para que otro docente, investigador o comunidad la adapte a su lengua.
4. **Hecha desde la comunidad lingüística.** El proyecto nace de hablantes de Puno **(inferido de la propuesta)**: se respeta la soberanía sobre los datos y las decisiones lingüísticas.
5. **Liviana y accesible.** Debe funcionar en celulares modestos y con conexión irregular.

## Accessibility & Inclusion

- No hay un estándar formal definido.
- Hoy el código casi no tiene atributos de accesibilidad (`aria-*`) ni soporte para movimiento reducido. Es una deuda conocida.
- Como mínimo **(inferido)**:
  - legibilidad en celular;
  - contraste suficiente;
  - que los caracteres especiales del quechua y el aymara (como `'` y `ñ`) se rendericen y se puedan escribir sin problema;
  - no depender solo del audio para aprender una palabra.
