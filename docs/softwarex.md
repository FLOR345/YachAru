# Estado hacia el artículo de software (SoftwareX)

Compara la propuesta del 28/10/2026 con el repositorio. "Hecho" significa que está en el código y lo cubre una prueba o se puede comprobar en línea. Las cifras salen de `docs/cifras.md` (`npm run cifras` en `backend`).

## Alcance congelado

Desde el 4/11/2026 no se agregan funciones nuevas: solo correcciones de errores, evidencia y documentación. Cada función nueva es una más que un revisor puede encontrar incompleta.

## Software

| Componente | Estado | Dónde comprobarlo |
| --- | --- | --- |
| Audio MMS en todo el vocabulario | Hecho (100 % de cobertura) | `/api/validation/cobertura`, `docs/cifras.md` |
| Grabaciones de personas | Conservadas y etiquetadas | `tools/tts/test_generate_audio.py` |
| Datos de aprendizaje (consentimiento, exportación) | Hecho | Perfil → Mis datos, `database/samples/` |
| Paquetes de idioma y tercera lengua | Hecho (awajún, demostración) | `languages/`, CI |
| Modo aula y pruebas | Hecho | `/docente`, `/aula`, `/mi-aula` |
| PWA sin conexión | Hecho, incluido el audio | `frontend/public/sw.js` |
| Normalizador dialectal | Hecho | `frontend/src/utils/normalizer.js` |
| Reproducibilidad (Docker de un comando, CI) | Hecho; CI comprueba que Docker carga todas las migraciones | `docker compose up --build`, `.github/workflows/ci.yml` |
| Guía para revisores | Hecho | `REVIEWERS.md` |
| Licencias limpias | Hecho: los efectos visuales de terceros (MIT + Commons Clause) se reemplazaron por código propio MIT | `frontend/src/components/fx/` |
| Cifras reproducibles | Hecho | `backend/scripts/cifras.js` |
| Vocabulario aymara con licencia abierta | Hecho: el diccionario de Chile (sin licencia confirmada) se reemplazó por IDS, CC BY 4.0 | `languages/aymara/`, `backend/scripts/aymara-desde-ids.js` |
| Herramientas de revisión y evaluación | Hechas: la evaluación se abre con un QR, sin repartir códigos, y dura unos 5 minutos | `/validacion`, `/evaluacion`, `frontend/public/afiche-evaluacion.png` |
| Nombre del proyecto | YachAru (antes SimiAru); las direcciones web conservan el nombre anterior | `PRODUCT.md` |

## Lo que solo puede hacer el equipo

Por orden de urgencia:

1. **Cambiar las claves de Neon y Cloudinary**, que se compartieron en un chat. Luego actualizarlas en Render y en los secretos de GitHub.
2. **Audio del aymara nuevo.** `Audio MMS` en modo `completo` con idiomas `aymara`: las 795 palabras de IDS aún no tienen audio.
3. **Palabras cortas** ("ama", "uma"…): `Audio MMS` en modo `comparar`, elegir el estilo y luego `rehacer-cortas`. Va antes de la evaluación.
4. **Revisión del léxico quechua** por el equipo: `guia-revision-lexico.md`.
5. **Revisión del aymara** por el colaborador aymarahablante en `/validacion` (agregar su correo a `ADMIN_EMAILS` en Render), sobre todo la *j* y la *x* (`languages/aymara/README.md`). Su nombre y ORCID van en `CITATION.cff`.
   - **Textos redactados con ayuda de IA** (ejemplos de oraciones, adivinanzas, refranes, canciones y cuentos). Los de aymara ya no se muestran (`EXTRAS_REVISADOS` en `culturaExtra.js`): se activan cuando el colaborador los revise. Los de quechua los revisa el equipo con `guia-revision-lexico.md`; el que no se pueda revisar, se retira.
6. **Revisión ética** en la facultad (correo en `plantillas-correos.md`).
7. **Evaluación del audio**: compartir el afiche con QR (`frontend/public/afiche-evaluacion.png`) hasta que 10 hablantes por lengua la terminen. Son 20 palabras, unos 5 minutos. Ver `protocolo-evaluacion.md`.
8. **Piloto en el curso** de Puno: `piloto-curso.md`.
9. **Costo de publicación** (correo a Elsevier) y **cuartil SJR** en Scimago.
10. **Autores** completos en `CITATION.cff` y `.zenodo.json`. Además: cuenta de Zenodo y versión `v1.0.0` con DOI, al final.

## Decisiones para el texto del artículo (cuando se escriba)

- El calificador de "¡Dilo tú!" se presenta como **orientativo y experimental**, o se deja fuera. No es reconocimiento de voz (`calificador-de-voz.md`), pero está calibrado solo con voces sintéticas.
- La voz aymara es una **transformación** de la voz del modelo (WORLD). La evaluación mide la voz que suena en la app.
- Las unidades nuevas **reordenan vocabulario existente**, sin palabras escritas por un modelo. Sus ejercicios se generan con reglas fijas.
- El aymara viene de una fuente citable y abierta (Layme Pairumani en IDS, CC BY 4.0), pasado al alfabeto oficial con reglas fijas y probadas (`languages/aymara/test_generar.py`).
- **Declarar el uso de herramientas de IA** en el desarrollo: la herramienta, la versión y para qué se usó.

## Antes de la versión v1.0.0

- Todo lo de la lista anterior hecho, y `npm run cifras` sin **PENDIENTE**.
- En `CHANGELOG.md`, pasar "Sin publicar" a `v1.0.0` con fecha.
