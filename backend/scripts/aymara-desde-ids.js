// Reemplaza el contenido aymara por el vocabulario de IDS (languages/aymara/vocabulario-ids.json, CC BY 4.0).
// El vocabulario aymara anterior venía entero de un diccionario del Ministerio de Educación de Chile cuya
// licencia de redistribución no está confirmada, y de otra variedad: se retira completo.
//  - Antes de tocar nada guarda una copia del contenido aymara actual en un archivo JSON (fuera del repositorio).
//  - Unidades por capítulo de IDS, ordenadas para aprender; lecciones de 9 a 12 palabras con ejercicios generados
//    con sus propias palabras (las mismas reglas de organize-units.js).
//  - Las lecciones aymara anteriores se borran, y con ellas el avance en esas lecciones.
//  - El audio se genera después con el flujo "Audio MMS" en modo completo.
// Uso: node scripts/aymara-desde-ids.js [archivo-de-copia.json]             (vista previa: no cambia nada)
//      node scripts/aymara-desde-ids.js [archivo-de-copia.json] --aplicar
import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { makeExercises } from './organize-units.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--aplicar');
const backupFile = process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(os.tmpdir(), `simiaru-aymara-anterior-${Date.now()}.json`);
const SOURCE = JSON.parse(fs.readFileSync(path.resolve(here, '../../languages/aymara/vocabulario-ids.json'), 'utf8'));
const LESSON_SIZE = 12;

// Capítulos de IDS → unidades, en orden para aprender (19 a 22 van juntos: son pocos)
export const UNITS = [
  { capitulos: [4], nombre: 'El cuerpo', descripcion: 'Partes del cuerpo y lo que hacemos con él', icono: '🧍', tema: 'El cuerpo' },
  { capitulos: [2], nombre: 'La familia', descripcion: 'Familia y parentesco', icono: '👨‍👩‍👧‍👦', tema: 'La familia' },
  { capitulos: [3], nombre: 'Los animales', descripcion: 'Animales domésticos y silvestres', icono: '🦙', tema: 'Los animales' },
  { capitulos: [5], nombre: 'Comida y bebida', descripcion: 'Alimentos, cocina y bebidas', icono: '🌽', tema: 'Comida' },
  { capitulos: [7], nombre: 'La casa', descripcion: 'La casa y sus partes', icono: '🏠', tema: 'La casa' },
  { capitulos: [6], nombre: 'Ropa y tejidos', descripcion: 'Vestimenta, tejidos y adornos', icono: '🧶', tema: 'Ropa y tejidos' },
  { capitulos: [1], nombre: 'La naturaleza', descripcion: 'Tierra, agua, cielo y fuego', icono: '⛰️', tema: 'La naturaleza' },
  { capitulos: [13], nombre: 'Números y cantidades', descripcion: 'Contar y medir', icono: '🔢', tema: 'Números' },
  { capitulos: [14], nombre: 'El tiempo', descripcion: 'Días, estaciones y momentos', icono: '🗓️', tema: 'El tiempo' },
  { capitulos: [12], nombre: 'Lugares y posiciones', descripcion: 'Dónde están las cosas', icono: '🧭', tema: 'Lugares' },
  { capitulos: [15], nombre: 'Los sentidos', descripcion: 'Ver, oír, tocar; colores y formas', icono: '👀', tema: 'Los sentidos' },
  { capitulos: [10], nombre: 'Moverse', descripcion: 'Ir, venir, caminar y viajar', icono: '🏃', tema: 'Moverse' },
  { capitulos: [9], nombre: 'Trabajos y herramientas', descripcion: 'Acciones del trabajo y sus herramientas', icono: '🛠️', tema: 'Trabajos' },
  { capitulos: [8], nombre: 'La chacra', descripcion: 'Agricultura y plantas', icono: '🌱', tema: 'La chacra' },
  { capitulos: [11], nombre: 'Tener y compartir', descripcion: 'Posesión, compra y venta', icono: '🤝', tema: 'Tener y compartir' },
  { capitulos: [16], nombre: 'Sentimientos', descripcion: 'Emociones y valores', icono: '💛', tema: 'Sentimientos' },
  { capitulos: [17], nombre: 'Pensar', descripcion: 'La mente y el saber', icono: '🧠', tema: 'Pensar' },
  { capitulos: [18], nombre: 'Hablar', descripcion: 'Decir, preguntar y contar', icono: '💬', tema: 'Hablar' },
  { capitulos: [19, 20, 21, 22], nombre: 'La comunidad', descripcion: 'Sociedad, normas y creencias', icono: '🏘️', tema: 'La comunidad' },
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const chunk = (list, size) => {
  const parts = Math.max(1, Math.ceil(list.length / size));
  const base = Math.floor(list.length / parts);
  const extra = list.length % parts;
  const out = [];
  let at = 0;
  for (let i = 0; i < parts; i++) {
    const n = base + (i < extra ? 1 : 0);
    out.push(list.slice(at, at + n));
    at += n;
  }
  return out;
};

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } });
  const db = await pool.connect();
  const q = async (sql, params) => (await db.query(sql, params)).rows;
  try {
    // 1. Copia de seguridad de todo lo aymara actual
    const units = await q(`SELECT * FROM unidades WHERE idioma = 'aymara' ORDER BY orden`);
    const ids = units.map((u) => u.id);
    const backup = {
      creado_en: new Date().toISOString(),
      unidades: units,
      lecciones: await q('SELECT * FROM lecciones WHERE unidad_id = ANY($1)', [ids]),
      vocabulario: await q('SELECT v.* FROM vocabulario v JOIN lecciones l ON l.id = v.leccion_id WHERE l.unidad_id = ANY($1)', [ids]),
      ejercicios: await q('SELECT e.* FROM ejercicios e JOIN lecciones l ON l.id = e.leccion_id WHERE l.unidad_id = ANY($1)', [ids]),
      progreso: await q('SELECT p.leccion_id, COUNT(*)::int AS personas FROM progreso_usuario p JOIN lecciones l ON l.id = p.leccion_id WHERE l.unidad_id = ANY($1) GROUP BY 1', [ids]),
    };
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 1));
    console.log(`Copia del aymara actual: ${backupFile}`);
    console.log(`Se retiran: ${units.length} unidades, ${backup.lecciones.length} lecciones, ${backup.vocabulario.length} palabras, ${backup.ejercicios.length} ejercicios; avance afectado: ${backup.progreso.reduce((a, p) => a + p.personas, 0)} lecciones completadas`);

    await db.query('BEGIN');
    for (const table of ['unidades', 'lecciones', 'vocabulario', 'ejercicios']) {
      await q(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${table}), 1))`);
    }
    // 2. Retirar lo anterior (lecciones, vocabulario, ejercicios y avance caen en cascada)
    await q(`DELETE FROM unidades WHERE idioma = 'aymara'`);

    // 3. Unidades nuevas desde IDS
    let words = 0;
    let lessons = 0;
    let exercises = 0;
    for (const [i, spec] of UNITS.entries()) {
      const entries = SOURCE.entradas.filter((e) => spec.capitulos.includes(e.capitulo));
      if (!entries.length) continue;
      const [unit] = await q('INSERT INTO unidades (numero, nombre, descripcion, idioma, orden, icono_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [
        i + 1, spec.nombre, spec.descripcion, 'aymara', i + 1, spec.icono,
      ]);
      const parts = chunk(entries, LESSON_SIZE);
      for (const [k, part] of parts.entries()) {
        const titulo = parts.length > 1 ? `${spec.tema} ${k + 1}` : spec.tema;
        const teoria = `${spec.descripcion}: ${part.slice(0, 8).map((w) => `${cap(w.aymara)} (${w.espanol.split(/[,/]/)[0].trim()})`).join(', ')}${part.length > 8 ? '…' : '.'} Vocabulario de Félix Layme Pairumani en el Intercontinental Dictionary Series (CC BY 4.0).`;
        const [lesson] = await q('INSERT INTO lecciones (unidad_id, numero, titulo, contenido_teorico, orden) VALUES ($1, $2, $3, $4, $5) RETURNING id', [unit.id, k + 1, titulo, teoria, k + 1]);
        const rows = part.map((w) => ({ obj: cap(w.aymara), es: cap(w.espanol), audio: null }));
        for (const w of rows) {
          await q('INSERT INTO vocabulario (leccion_id, palabra_espanol, palabra_objetivo, audio_url, categoria) VALUES ($1, $2, $3, NULL, $4)', [lesson.id, w.es, w.obj, spec.tema.toLowerCase()]);
        }
        for (const e of makeExercises(lesson.id, rows, 'aymara')) {
          await q('INSERT INTO ejercicios (leccion_id, tipo, pregunta, respuesta_correcta, opciones, audio_url) VALUES ($1, $2, $3, $4, $5, NULL)', [
            lesson.id, e.tipo, e.pregunta, typeof e.respuesta === 'string' ? e.respuesta : JSON.stringify(e.respuesta), e.opciones ? JSON.stringify(e.opciones) : null,
          ]);
          exercises++;
        }
        words += rows.length;
        lessons++;
      }
      console.log(`+ ${spec.nombre}: ${entries.length} palabras en ${parts.length} lecciones`);
    }
    console.log(`\nNuevo aymara: ${UNITS.length} unidades, ${lessons} lecciones, ${words} palabras, ${exercises} ejercicios`);
    if (APPLY) {
      await db.query('COMMIT');
      console.log('Aplicado. Falta el audio: Actions → Audio MMS → modo completo, idiomas "aymara".');
    } else {
      await db.query('ROLLBACK');
      console.log('Solo vista previa: nada cambió. Para aplicarlo: --aplicar');
    }
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    db.release();
    await pool.end();
  }
};

if (process.argv[1]?.endsWith('aymara-desde-ids.js')) main();
