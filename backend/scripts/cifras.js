// Cifras de YachAru calculadas sobre la base real (nunca escritas a mano): contenido, audio,
// revisión del léxico, evaluación del audio y uso. Sirven para seguir el avance y para reportarlas.
// Uso: npm run cifras   → escribe docs/cifras.json y docs/cifras.md
// Cada cifra lleva su definición. Lo que todavía no existe (revisión del léxico, evaluación del audio,
// uso en el curso) sale como "pendiente" en lugar de un número inventado.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/config/database.js';
import { getCoverage, summarizeRatings, SAMPLE_SIZE } from '../src/controllers/validationController.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../docs');

// Llama a un controlador de Express sin servidor y devuelve lo que respondería
const call = (handler, req = {}) =>
  new Promise((resolve, reject) => {
    handler({ query: {}, ...req }, { json: resolve, setHeader() {}, send: resolve, status: () => ({ json: reject }) }, reject);
  });

const q = async (sql, params) => (await pool.query(sql, params)).rows;

const main = async () => {
  const coverage = await call(getCoverage);
  const content = await q(`
    SELECT u.idioma, COUNT(DISTINCT u.id)::int AS unidades, COUNT(DISTINCT l.id)::int AS lecciones,
           (SELECT COUNT(*) FROM ejercicios e JOIN lecciones l2 ON l2.id = e.leccion_id JOIN unidades u2 ON u2.id = l2.unidad_id WHERE u2.idioma = u.idioma)::int AS ejercicios
      FROM unidades u LEFT JOIN lecciones l ON l.unidad_id = u.id GROUP BY u.idioma ORDER BY u.idioma`);
  const exerciseTypes = await q(`
    SELECT u.idioma, e.tipo, COUNT(*)::int AS n FROM ejercicios e
      JOIN lecciones l ON l.id = e.leccion_id JOIN unidades u ON u.id = l.unidad_id GROUP BY u.idioma, e.tipo ORDER BY 1, 3 DESC`);
  const voices = await q(`SELECT idioma, fuente, voz, transformada, modelo, COUNT(*)::int AS n FROM audios GROUP BY 1, 2, 3, 4, 5 ORDER BY 1, 2, 3`);
  const evaluation = {};
  for (const idioma of Object.keys(coverage.idiomas)) {
    const rows = await q(
      `SELECT d.codigo AS evaluador, a.id AS audio_id, e.puntaje, m.fenomenos
         FROM evaluaciones_audio e JOIN evaluadores d ON d.id = e.evaluador_id JOIN audios a ON a.id = e.audio_id
         JOIN muestra_evaluacion m ON m.audio_id = a.id AND m.idioma = d.idioma WHERE d.idioma = $1`,
      [idioma]
    );
    const [{ n }] = await q('SELECT COUNT(*)::int AS n FROM muestra_evaluacion WHERE idioma = $1', [idioma]);
    evaluation[idioma] = summarizeRatings(rows, n || SAMPLE_SIZE);
  }
  // Uso real (agregado, sin personas): cuentas de aula, lecciones completadas y eventos con consentimiento
  const [usage] = await q(`
    SELECT (SELECT COUNT(*) FROM aulas)::int AS aulas,
           (SELECT COUNT(*) FROM usuarios WHERE es_cuenta_aula)::int AS estudiantes_aula,
           (SELECT COUNT(*) FROM progreso_usuario WHERE completado)::int AS lecciones_completadas,
           (SELECT COUNT(*) FROM eventos_aprendizaje)::int AS eventos,
           (SELECT COUNT(DISTINCT usuario_id) FROM eventos_aprendizaje)::int AS personas_con_eventos,
           (SELECT COUNT(*) FROM intentos_prueba WHERE terminado_en IS NOT NULL)::int AS pruebas_entregadas`);

  const stats = { generado_en: new Date().toISOString(), cobertura: coverage, contenido: content, tipos_de_ejercicio: exerciseTypes, voces: voices, evaluacion_audio: evaluation, uso: usage };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'cifras.json'), `${JSON.stringify(stats, null, 2)}\n`);

  const pending = (cond, value) => (cond ? value : '**PENDIENTE**');
  const lines = [`# Cifras de YachAru`, '', `Generado: ${stats.generado_en} con \`npm run cifras\` (en backend). No editar a mano.`, ''];
  lines.push('## Definiciones', '');
  for (const [k, v] of Object.entries(coverage.definicion)) lines.push(`- **${k}**: ${v}`);
  lines.push('', '## Contenido y audio', '', '| Lengua | Unidades | Lecciones | Ejercicios | Filas de vocabulario | Entradas únicas | Audio MMS | Grabado | Sin audio | Glotalizadas | Aspiradas | Uvular |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const c of content) {
    const v = coverage.idiomas[c.idioma];
    if (!v) continue;
    lines.push(`| ${c.idioma} | ${c.unidades} | ${c.lecciones} | ${c.ejercicios} | ${v.filas} | ${v.entradas_unicas} | ${v.audio.mms} | ${v.audio.grabado} | ${v.audio.sin_audio} | ${v.fenomenos.glotalizada} | ${v.fenomenos.aspirada} | ${v.fenomenos.uvular} |`);
  }
  lines.push('', '## Revisión del léxico por hablantes', '', '| Lengua | Revisadas | Correctas | Variantes | Corregidas |', '|---|---|---|---|---|');
  for (const [id, v] of Object.entries(coverage.idiomas)) {
    const r = v.revision;
    lines.push(`| ${id} | ${pending(r.revisadas, r.revisadas)} | ${r.correctas} | ${r.variantes} | ${r.corregidas} |`);
  }
  lines.push('', '## Evaluación perceptual del audio (1 a 5)', '', '| Lengua | Evaluadores | Terminaron | Audios | Juicios | Media | α de Krippendorff (ordinal) |', '|---|---|---|---|---|---|---|');
  for (const [id, e] of Object.entries(evaluation)) {
    lines.push(`| ${id} | ${e.evaluadores} | ${e.evaluadores_completos} | ${e.audios_evaluados} | ${e.juicios} | ${pending(e.suficiente, e.media)} | ${pending(e.suficiente, e.alfa_krippendorff_ordinal)} |`);
  }
  lines.push('', '## Uso', '', `- Aulas: ${usage.aulas}; cuentas de estudiante: ${usage.estudiantes_aula}; lecciones completadas: ${usage.lecciones_completadas}.`, `- Eventos de aprendizaje (con consentimiento): ${usage.eventos} de ${usage.personas_con_eventos} personas; pruebas de aula entregadas: ${usage.pruebas_entregadas}.`, '');
  fs.writeFileSync(path.join(outDir, 'cifras.md'), lines.join('\n'));
  console.log('✅ docs/cifras.json y docs/cifras.md');
  await pool.end();
};

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
