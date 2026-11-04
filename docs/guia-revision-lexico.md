# Guía para revisar el léxico

La revisión la hacen ustedes, como hablantes de quechua de Puno, en `https://simiaru-3j6b.vercel.app/validacion` (cuenta de administrador). Cada decisión queda guardada junto con el valor original, así que nada se pierde.

## Qué marcar en cada palabra

| Botón | Cuándo usarlo |
|---|---|
| **Correcto** | La palabra y su significado son correctos en la variedad de Puno (Cusco-Collao). |
| **Variante** | Es correcta, pero en otra variedad o con otra ortografía (por ejemplo, la boliviana *uj, kinsa* frente a *huk, kimsa*). No se cambia: se registra como variante. En la nota, escriban de dónde es. |
| **Error** | La palabra o el significado están mal. Escriban la forma correcta. La app la reemplaza y borra el audio sintético viejo; esa palabra se vuelve a generar con la próxima corrida de `Audio MMS` en modo `completo`. |

Si falta una palabra importante, agréguenla abajo, en **Anotar una palabra que falta**.

## Criterios del equipo

Anoten aquí lo que decidan, para que todos revisen igual y para poder explicarlo después:

- **Ortografía de referencia:** [por ejemplo, el alfabeto oficial de 3 vocales; *q* para la uvular; apóstrofo para las glotalizadas].
- **Qué cuenta como variante y qué como error:** [por ejemplo, *e/o* por *i/u* cerca de *q* es variante; un significado equivocado es error].
- **Préstamos del castellano:** [se aceptan o no].

## Cómo organizarse

- Usen el filtro **Solo pendientes** y repártanse las lecciones o las letras para no revisar dos veces lo mismo.
- Revisen también las unidades nuevas de quechua (*Yupaykuna*, *Tupuykuna*, *Ukhu*), que se armaron reordenando palabras ya existentes.
- El avance se ve en la parte de arriba de `/validacion` y en `docs/cifras.md` (`npm run cifras` en `backend`).

## El aymara

Ustedes no hablan aymara, así que esa revisión la tiene que hacer un colaborador aymarahablante, con estos mismos criterios. Si no se consigue, no se marca nada en aymara y se declara como limitación.
