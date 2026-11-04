# Protocolo de la evaluación del audio

Mide si la voz sintética de SimiAru se entiende, palabra por palabra, según hablantes nativos. Es la medición principal de la validación: sin ella solo se puede reportar cuánto audio hay, no qué tan bien suena.

## Quiénes evalúan

- **8 a 10 personas por lengua.** Con menos no se puede calcular el acuerdo entre evaluadores. La plataforma no da resultados con menos de 8.
- **Hablantes nativos** de la lengua: quechua de Puno o Cusco-Collao para el quechua, y aymara del altiplano para el aymara.
- **Que no hayan construido SimiAru.** El equipo creador no evalúa, porque tiene conflicto de interés. La pantalla de evaluación también lo advierte.
- Se anota la variedad de cada persona (por ejemplo, "Puno, Huancané"), pero nunca su nombre.

## Antes del día de la evaluación

1. Si la facultad lo pide, conseguir la **revisión ética** (ver `plantillas-correos.md`).
2. **Arreglar las palabras cortas** con el flujo `Audio MMS` (modos `comparar` y `rehacer-cortas`). Se evalúa la voz final, la que escucha quien aprende.
3. Entrar a `/validacion` con una cuenta de administrador (su correo debe estar en `ADMIN_EMAILS` en Render) y, en cada lengua:
   - **Preparar muestra de 50.** La muestra se reparte entre palabras con glotalizadas, aspiradas, uvulares y sin ninguno de esos sonidos. Después de la primera evaluación ya no cambia.
   - **Crear 10 códigos.** Cada evaluador recibe uno. El código es su única identificación.
4. Imprimir la hoja de consentimiento (abajo), una por persona.

## El día de la evaluación (unos 15 minutos por persona)

1. Leer con la persona la hoja de consentimiento. Si acepta, firma la copia en papel, que guarda el equipo, separada de los códigos.
2. La persona abre `https://simiaru-3j6b.vercel.app/evaluacion` en su celular, con audífonos de preferencia, y escribe su código.
3. Escucha cada palabra y le pone un puntaje de 1 a 5:
   - 1: no se entiende;
   - 3: se entiende con esfuerzo;
   - 5: se entiende perfectamente, como la diría una persona.

   Puede dejar un comentario, por ejemplo "la k' suena como k".
4. Puede pausar y volver luego con el mismo código. Cada persona escucha las palabras en su propio orden.

Si alguien no termina, sus puntajes igual cuentan. Para el informe se usan las personas que calificaron al menos 40 de las 50 palabras.

## Después

- En `/validacion` se ven los resultados: evaluadores, media, acuerdo (α de Krippendorff, ordinal) y la media por fenómeno (glotalizadas, aspiradas, uvulares, ninguno). También se descargan en CSV.
- En `backend`, `npm run cifras` deja todas las cifras en `docs/cifras.md`, con su definición. Esas son las que se reportan; no se copian a mano.
- Los comentarios de los evaluadores dicen qué sonidos falla el modelo. Resúmanlos por fenómeno.

## Hoja de consentimiento (para imprimir)

> **Evaluación de la voz de SimiAru**
>
> SimiAru es una plataforma abierta para aprender quechua y aymara, hecha por quechuahablantes de Puno. Usa una voz generada por computadora. Le pedimos escuchar unas 50 palabras y decir, del 1 al 5, qué tan bien se entienden.
>
> - Toma unos 15 minutos. Es voluntario: puede dejarlo en cualquier momento, sin dar razones.
> - No grabamos su voz. No pedimos su nombre, correo ni teléfono en la plataforma: solo un código.
> - Guardamos sus puntajes y comentarios con ese código. Los resultados se publicarán en conjunto, nunca con su nombre.
> - Esta hoja firmada se guarda aparte y no se une a sus respuestas.
> - Si construyó o programó SimiAru, por favor no participe.
>
> Contacto del equipo: ______________________
>
> Acepto participar.  Firma: ____________________  Fecha: ___________  Variedad que hablo: ______________________
