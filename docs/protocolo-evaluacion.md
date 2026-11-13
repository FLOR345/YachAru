# Protocolo de la evaluación del audio

Mide si la voz sintética de YachAru se entiende, palabra por palabra, según hablantes nativos. Es la medición principal de la validación: sin ella solo se puede reportar cuánto audio hay, no qué tan bien suena.

## En resumen

- **Quiénes:** 10 hablantes nativos por lengua que no hayan construido YachAru.
- **Qué hacen:** escanean el QR, eligen su lengua, aceptan en pantalla y califican **20 palabras** del 1 al 5. Toma **unos 5 minutos**.
- **Qué se necesita:** un celular con internet y, de preferencia, audífonos.

## Quiénes evalúan

- **10 personas por lengua que terminen.** Se cuenta como terminada la evaluación de quien calificó al menos 16 de las 20 palabras. La plataforma no da la media ni el acuerdo con menos de 10.
- **Hablantes nativos:** quechua de Puno o Cusco-Collao para el quechua, y aymara del altiplano para el aymara.
- **Que no hayan construido YachAru**, porque tienen conflicto de interés. La pantalla pide confirmarlo antes de empezar.
- Cada persona puede anotar de dónde es su variedad (por ejemplo, "Puno, Huancané"). Nunca se pide su nombre.

## Cómo compartirla

- **Afiche con QR:** `frontend/public/afiche-evaluacion.png`, que también se descarga desde `/validacion` con el botón «Afiche con QR». Sirve para WhatsApp o para imprimir.
- **Enlace:** `https://simiaru-3j6b.vercel.app/evaluacion`.
- La primera persona que entra prepara sola la muestra de 20 palabras de su lengua. La muestra se reparte entre palabras con glotalizadas, aspiradas, uvulares y sin ninguno de esos sonidos, y no cambia después.
- Una lengua aparece como «Muy pronto» mientras no tenga audio. Por ejemplo, el aymara, hasta que se corra `Audio MMS` en modo `completo`.

## Antes de compartir el QR

1. **Arreglar las palabras cortas** con el flujo `Audio MMS` (modos `comparar` y `rehacer-cortas`). Se evalúa la voz final, la que escucha quien aprende.
2. Si la facultad lo pide, conseguir la **revisión ética** (ver `plantillas-correos.md`).

## Lo que ve cada persona

1. Elige su lengua.
2. Lee tres puntos:
   - es una voz de computadora;
   - no se piden datos personales;
   - es voluntario y los resultados se publican en conjunto.
3. Marca «Acepto participar» y «No participé en crear YachAru».
4. Cada palabra suena sola. Si quiere, la escucha otra vez. Elige:
   - 1: no se entiende;
   - 2: casi no se entiende;
   - 3: se entiende con esfuerzo;
   - 4: se entiende bien;
   - 5: se entiende perfectamente.

   Puede volver a la anterior y dejar un comentario opcional, por ejemplo "la k' suena como k".
5. Al final ve su código. Si se corta, el mismo celular la retoma donde quedó. En otro celular, entra con «Ya empecé y tengo un código».

Cada persona escucha las palabras en su propio orden, para evitar el sesgo por posición.

## Después

- En `/validacion` se ven:
  - cuántas personas terminaron (de 10);
  - la media;
  - el acuerdo (α de Krippendorff, ordinal);
  - la media por fenómeno.

  También se descargan los datos en CSV.
- En `backend`, `npm run cifras` deja todas las cifras en `docs/cifras.md`, con su definición. Esas son las que se reportan; no se copian a mano.
- Los comentarios dicen qué sonidos falla el modelo. Resúmanlos por fenómeno.

## Si la evaluación es presencial

Se puede usar el mismo QR. Si la facultad pide consentimiento firmado, usen esta hoja y guárdenla aparte, sin unirla al código de la persona.

> **Evaluación de la voz de YachAru**
>
> YachAru es una plataforma abierta para aprender quechua y aymara, hecha por quechuahablantes de Puno. Usa una voz generada por computadora. Le pedimos escuchar 20 palabras y decir, del 1 al 5, qué tan bien se entienden.
>
> - Toma unos 5 minutos. Es voluntario: puede dejarlo en cualquier momento, sin dar razones.
> - No grabamos su voz. No pedimos su nombre, correo ni teléfono en la plataforma: solo un código.
> - Los resultados se publicarán en conjunto, nunca con su nombre.
> - Si construyó o programó YachAru, por favor no participe.
>
> Contacto del equipo: ______________________
>
> Acepto participar.  Firma: ____________________  Fecha: ___________
