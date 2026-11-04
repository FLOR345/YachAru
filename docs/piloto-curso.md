# Uso en un curso (piloto)

Es usar SimiAru en un curso real con adultos en Puno y contar qué pasó. No es un experimento: no hay encuestas, ni pre-test y post-test, ni grupo de control (eso es otro estudio, con comité de ética). Basta con datos de uso.

## Preparación (docente)

1. Crear una cuenta normal en la app e ir a **Perfil → Modo aula** (`/docente`).
2. **Crear un aula** con el nombre del curso y la lengua.
3. **Proyectar el código** en clase o **compartir el enlace**. El enlace ya trae el código; cada estudiante solo escribe un alias.
4. Contar en clase que los datos de aprendizaje se registran solo si cada persona acepta, y que se pueden descargar y borrar desde el perfil.

## Durante el curso

- Asignar lecciones del camino y, cada una o dos semanas, una **prueba**:
  - **sesión breve**: las sesiones vistas esa semana;
  - **prueba de unidad**: al cerrar una unidad.
- Pedir que **estudien primero** en la pestaña "Estudiar" de cada prueba.
- En "Avance y pruebas" se ve quién avanza, quién no entra hace días y la mejor nota de cada alias.

## Qué anotar (sin datos personales)

- Fechas de inicio y fin, número de estudiantes y número de clases en que se usó.
- Al final, ejecutar `npm run cifras` (en `backend`): la sección **Uso** de `docs/cifras.md` da aulas, cuentas, lecciones completadas, eventos y pruebas entregadas.
- Problemas técnicos que aparecieron (por ejemplo, conexión o celulares que no reproducían el audio) y cómo se resolvieron.

## Qué no hacer

- No pedir nombres completos ni correos a quienes usan el modo aula.
- No reportar notas de personas individuales. Solo totales.
- No agregar funciones nuevas durante el piloto: solo corregir errores.
