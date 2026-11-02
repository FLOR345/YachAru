# Estado del envío a SoftwareX

Compara la propuesta del 28/10/2026 con lo que hay en el repositorio. "Hecho" significa que está en el código y lo cubre una prueba o se puede comprobar en línea.

## Componentes

| Componente | Estado | Dónde comprobarlo |
| --- | --- | --- |
| Audio MMS | Proceso hecho. **Falta correr `Audio MMS` en modo completo** | `tools/tts/`, `/api/validation/cobertura` |
| Voces grabadas | Conservadas y etiquetadas | `tools/tts/test_generate_audio.py` |
| Datos de aprendizaje | Hecho | Perfil → Mis datos, `database/samples/` |
| Paquetes de idioma | Hecho | `docs/paquete-de-idioma.md`, CI |
| Tercera lengua | Demostración técnica hecha (awajún) | `languages/awajun/` |
| Modo aula | Hecho | `/aula`, `/docente` |
| PWA sin conexión | Hecho, incluido el audio | `frontend/public/sw.js` |
| Normalizador dialectal | Hecho | `frontend/src/utils/normalizer.js` |
| Código muerto | Hecho | `backend/src/app.js` |
| Reproducibilidad | Hecho | `docker compose up --build`, CI |
| Landing honesta | Hecho | `/` |
| Revisión del léxico en línea | Herramienta hecha. **Falta la revisión** | `/validacion` |

## Lo que solo pueden hacer personas

La evidencia del artículo no se puede programar ni inventar.

1. **Revisar el léxico quechua** en `/validacion`. La frase del artículo saldrá de la cobertura: "se corrigieron N entradas".
2. **Licencia del diccionario aymara** del Ministerio de Educación de Chile. Es el único punto que puede obligar a replantear el proyecto: si no permite redistribuir, hay que cambiar de fuente.
3. **Curso universitario** con adultos en Puno.
4. **Revisión ética** de la facultad y **colaborador aymarahablante**.
5. **Costo de publicación** con Elsevier y **cuartil SJR** en Scimago.
6. **Revisar los derechos del contenido de terceros**: fotos, portadas y los componentes de React Bits, que usan MIT + Commons Clause y no una licencia de código abierto pura.
7. **Cuentas de Zenodo y Elsevier.** Para el DOI: enlazar el repositorio en Zenodo y crear la versión `v1.0.0` después de terminar la generación del audio.

## Antes de crear la versión v1.0.0

- `Audio MMS` en modo completo terminado, y cobertura revisada.
- Autores completos en `CITATION.cff` y `.zenodo.json`.
- README sin afirmaciones que no se puedan comprobar.
- Fuera de `CHANGELOG.md`, la sección "Sin publicar".
