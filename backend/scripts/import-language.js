// Importa un paquete de idioma: carga su contenido en la base y registra la lengua en el frontend.
// Uso:  npm run import-language -- ../languages/<id>            (valida e importa)
//       npm run import-language -- ../languages/<id> --dry-run  (solo valida, no toca nada)
//       npm run import-language -- ../languages/<id> --replace  (reemplaza el contenido de esa lengua)
//
// Un paquete es una carpeta con:
//   paquete.json   → datos de la lengua (nombre, variedad, voz, colores, reglas del normalizador)
//   contenido.json → unidades, lecciones, vocabulario y ejercicios
// o un solo paquete.json que lleva todo, con el contenido en su campo "contenido".
// Ver docs/paquete-de-idioma.md y la plantilla en languages/plantilla.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const replace = args.includes('--replace');

const fail = (msg) => {
  console.error(`❌ ${msg}`);
  process.exit(1);
};

if (!dir) fail('Indica la carpeta del paquete. Ejemplo: npm run import-language -- ../languages/guarani');
const folder = path.resolve(process.cwd(), dir);
const read = (name) => {
  const file = path.join(folder, name);
  if (!fs.existsSync(file)) fail(`Falta ${name} en ${folder}`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${name} no es un JSON válido: ${error.message}`);
  }
};

const pack = read('paquete.json');
const content = pack.contenido ?? read('contenido.json');

// ==================== VALIDACIÓN ====================
const errors = [];
const TYPES = ['multiple_choice', 'listen_write', 'translate', 'true_false', 'fill_blanks', 'matching', 'word_order', 'drag_words'];
if (!/^[a-z_]{2,20}$/.test(pack.id || '')) errors.push('paquete.id debe tener 2 a 20 letras minúsculas (sin tildes ni espacios)');
for (const field of ['nombre', 'variedad', 'region', 'iso639_3', 'color']) if (!pack[field]) errors.push(`paquete.${field} es obligatorio`);
if (pack.normalizador?.reglas) {
  pack.normalizador.reglas.forEach((r, i) => {
    try {
      new RegExp(r.patron, 'g');
    } catch {
      errors.push(`normalizador.reglas[${i}].patron no es una expresión regular válida`);
    }
  });
}
if (!Array.isArray(content.unidades) || content.unidades.length === 0) errors.push('contenido.unidades debe tener al menos una unidad');

// La plantilla trae marcadores COMPLETAR: nunca se importa contenido sin revisar
const raw = JSON.stringify(content) + JSON.stringify(pack);
if (raw.includes('COMPLETAR')) errors.push('El paquete todavía tiene textos "COMPLETAR" de la plantilla');
if (!content.fuente?.licencia || !content.fuente?.referencia) errors.push('contenido.fuente.licencia y contenido.fuente.referencia son obligatorias (de dónde sale el contenido)');

let counts = { unidades: 0, lecciones: 0, vocabulario: 0, ejercicios: 0 };
(content.unidades || []).forEach((u, ui) => {
  counts.unidades += 1;
  if (!u.nombre) errors.push(`unidades[${ui}].nombre es obligatorio`);
  (u.lecciones || []).forEach((l, li) => {
    counts.lecciones += 1;
    if (!l.titulo) errors.push(`unidades[${ui}].lecciones[${li}].titulo es obligatorio`);
    (l.vocabulario || []).forEach((v, vi) => {
      counts.vocabulario += 1;
      if (!v.palabra_objetivo || !v.palabra_espanol) errors.push(`… lecciones[${li}].vocabulario[${vi}] necesita palabra_objetivo y palabra_espanol`);
    });
    (l.ejercicios || []).forEach((e, ei) => {
      counts.ejercicios += 1;
      if (!TYPES.includes(e.tipo)) errors.push(`… lecciones[${li}].ejercicios[${ei}].tipo "${e.tipo}" no existe (${TYPES.join(', ')})`);
      if (!e.pregunta || e.respuesta_correcta === undefined) errors.push(`… lecciones[${li}].ejercicios[${ei}] necesita pregunta y respuesta_correcta`);
    });
  });
});

if (errors.length > 0) {
  console.error(`❌ El paquete "${pack.id}" tiene ${errors.length} problema(s):`);
  errors.slice(0, 30).forEach((e) => console.error(`   - ${e}`));
  process.exit(1);
}
console.log(`✅ Paquete "${pack.nombre}" (${pack.id}) válido: ${counts.unidades} unidades, ${counts.lecciones} lecciones, ${counts.vocabulario} palabras, ${counts.ejercicios} ejercicios`);
if (dryRun) process.exit(0);

// ==================== IMPORTACIÓN (todo o nada) ====================
if (!process.env.DATABASE_URL) fail('Falta DATABASE_URL');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : true });
const client = await pool.connect();
const asJson = (v) => (v === undefined || v === null ? null : typeof v === 'string' ? v : JSON.stringify(v));
try {
  await client.query('BEGIN');
  const existing = await client.query('SELECT COUNT(*)::int AS n FROM unidades WHERE idioma = $1', [pack.id]);
  if (existing.rows[0].n > 0) {
    if (!replace) throw new Error(`Ya hay ${existing.rows[0].n} unidades de "${pack.id}". Usa --replace para reemplazarlas.`);
    await client.query('DELETE FROM unidades WHERE idioma = $1', [pack.id]); // lecciones, vocabulario y ejercicios se borran en cascada
  }
  for (const [ui, u] of content.unidades.entries()) {
    const unit = await client.query(
      'INSERT INTO unidades (numero, nombre, descripcion, idioma, orden) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [ui + 1, u.nombre, u.descripcion || null, pack.id, ui + 1]
    );
    for (const [li, l] of (u.lecciones || []).entries()) {
      const lesson = await client.query(
        'INSERT INTO lecciones (unidad_id, numero, titulo, contenido_teorico, orden) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [unit.rows[0].id, li + 1, l.titulo, l.contenido_teorico || null, li + 1]
      );
      for (const v of l.vocabulario || []) {
        await client.query(
          'INSERT INTO vocabulario (leccion_id, palabra_espanol, palabra_objetivo, categoria, ejemplo_uso, audio_url) VALUES ($1, $2, $3, $4, $5, $6)',
          [lesson.rows[0].id, v.palabra_espanol, v.palabra_objetivo, v.categoria || null, v.ejemplo_uso || null, v.audio_url || null]
        );
      }
      for (const e of l.ejercicios || []) {
        await client.query(
          'INSERT INTO ejercicios (leccion_id, tipo, pregunta, respuesta_correcta, opciones) VALUES ($1, $2, $3, $4, $5)',
          [lesson.rows[0].id, e.tipo, e.pregunta, asJson(e.respuesta_correcta), asJson(e.opciones)]
        );
      }
    }
  }
  await client.query('COMMIT');
  console.log('✅ Contenido cargado en la base');
} catch (error) {
  await client.query('ROLLBACK');
  fail(`No se importó nada: ${error.message}`);
} finally {
  client.release();
  await pool.end();
}

// Registrar la lengua en el frontend (un archivo .json en src/languages)
const target = path.resolve(here, '../../frontend/src/languages', `${pack.id}.json`);
const { contenido: _contenido, ...registered } = pack;
fs.writeFileSync(target, `${JSON.stringify(registered, null, 2)}\n`);
console.log(`✅ Lengua registrada en ${path.relative(process.cwd(), target)} (vuelve a compilar el frontend)`);
