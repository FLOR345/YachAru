// Ordena el contenido en unidades coherentes, sin inventar vocabulario:
//  1. Aymara: las palabras que estaban en lecciones de otro tema (cuerpo dentro de "Padres y abuelos",
//     verbos dentro de "Presentaciones"…) pasan a unidades propias, según su categoría en la base.
//  2. Quechua: las palabras sueltas en una lección de otro tema vuelven a la lección de su tema.
//  3. Los números: del 11 en adelante y las palabras de cantidad o medida (que estaban todas en
//     "Números del 6 al 10") pasan a unidades propias, en ambas lenguas.
//  4. Quechua: una unidad del cuerpo con las partes que ya usa el modelo 3D (frontend/src/data/cuerpoNumeros.js).
//  5. Cada lección nueva recibe ejercicios generados con sus propias palabras.
// No borra lecciones ni cambia sus id: el avance de cada persona se conserva. Se puede repetir sin duplicar.
// Uso: node scripts/organize-units.js            (muestra lo que haría)
//      node scripts/organize-units.js --aplicar  (lo hace, en una transacción)
import 'dotenv/config';
import pg from 'pg';
import { PARTES } from '../../frontend/src/data/cuerpoNumeros.js';

const APPLY = process.argv.includes('--aplicar');
const LESSON_SIZE = 12;

// Unidades nuevas del aymara a partir de categorías que ya están en la base
const AYMARA = [
  { nombre: 'Janchi', descripcion: 'El cuerpo', tema: 'El cuerpo', icono: '🧍', categorias: ['cuerpo'] },
  { nombre: 'Uta', descripcion: 'La casa y la comunidad', tema: 'La casa', icono: '🏠', categorias: ['hogar'] },
  { nombre: 'Isi', descripcion: 'La ropa y los tejidos', tema: 'La ropa', icono: '🧶', categorias: ['ropa'] },
  { nombre: 'Pacha', descripcion: 'El tiempo y los lugares', tema: 'El tiempo', icono: '🗓️', categorias: ['tiempo', 'ubicacion'] },
  { nombre: 'Pachamama', descripcion: 'La naturaleza', tema: 'La naturaleza', icono: '⛰️', categorias: ['naturaleza'] },
  { nombre: 'Luräwinaka', descripcion: 'Acciones de todos los días', tema: 'Acciones', icono: '🏃', categorias: ['verbos'] },
  { nombre: 'Kunjamasa', descripcion: 'Cómo son las cosas', tema: 'Cómo es', icono: '✨', categorias: ['caracteristicas'] },
  { nombre: 'Sarawi', descripcion: 'Cultura y música andina', tema: 'Cultura y música', icono: '🎶', categorias: ['cultura', 'musica'] },
];

// Quechua: cada categoría vuelve a la lección de su tema (por título)
const QUECHUA_HOME = {
  saludos: 'Saludos del dia', saludo: 'Saludos del dia', respuesta: 'Saludos del dia',
  presentaciones: 'Presentaciones personales', presentacion: 'Presentaciones personales', pregunta: 'Presentaciones personales', cortesia: 'Presentaciones personales',
  despedidas: 'Despedidas', despedida: 'Despedidas',
  familia: 'Hermanos e hijos',
  numeros: 'Numeros del 6 al 10',
  colores: 'Colores de la naturaleza',
  animales: 'Animales domesticos',
  comida: 'Frutas y verduras',
};
// Lecciones cuyo tema ya acepta esa categoría (no se mueve nada de aquí)
const QUECHUA_TOPIC = {
  'Saludos del dia': ['saludos', 'saludo', 'respuesta'],
  'Presentaciones personales': ['presentaciones', 'presentacion', 'pregunta', 'cortesia'],
  Despedidas: ['despedidas', 'despedida'],
  'Padres y abuelos': ['familia'],
  'Hermanos e hijos': ['familia'],
  'Numeros del 1 al 5': ['numeros'],
  'Numeros del 6 al 10': ['numeros'],
  'Colores primarios': ['colores'],
  'Colores de la naturaleza': ['colores'],
  'Animales domesticos': ['animales'],
  'Animales silvestres': ['animales'],
  'Tuberculos y granos': ['comida'],
  'Frutas y verduras': ['comida'],
};

// Números del 1 al 10 (se quedan en sus lecciones); lo demás de la categoría "numeros" se reparte
const SMALL = /^(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)$/i;
const BIG = /^(once|doce|trece|catorce|quince|dieci|veint|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|mil|diez mil|cien mil|millón)/i;

const firstSense = (es) => String(es).split(/[,;/(]/)[0].trim();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const chunk = (list, size) => {
  // Partes parejas: 25 palabras con tope 12 → 9, 8 y 8 (no 12, 12 y 1)
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
  return out.filter((x) => x.length);
};
// Barajado con semilla: mismos ejercicios cada vez que se corre
const seeded = (seed) => () => {
  // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const shuffle = (list, rnd) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Ejercicios con las palabras de la lección (sentido único en castellano para no tener dos respuestas correctas)
export const makeExercises = (lessonId, words, idioma) => {
  const rnd = seeded(lessonId * 7919);
  const lang = idioma === 'aymara' ? 'aimara' : idioma;
  const seen = new Set();
  const pool = shuffle(words, rnd).filter((w) => {
    const k = firstSense(w.es).toLowerCase();
    if (!k || seen.has(k) || seen.has(w.obj.toLowerCase())) return false;
    seen.add(k);
    seen.add(w.obj.toLowerCase());
    return true;
  });
  if (pool.length < 4) return [];
  const others = (w, key, n = 3) => shuffle(pool.filter((o) => o !== w), rnd).slice(0, n).map(key);
  const out = [];
  pool.slice(0, 3).forEach((w) => {
    const options = shuffle([w.obj, ...others(w, (o) => o.obj)], rnd);
    out.push({ tipo: 'multiple_choice', pregunta: `¿Cómo se dice "${firstSense(w.es)}" en ${lang}?`, respuesta: w.obj, opciones: options });
  });
  pool.slice(3, 5).forEach((w) => {
    const options = shuffle([firstSense(w.es), ...others(w, (o) => firstSense(o.es))], rnd);
    out.push({ tipo: 'multiple_choice', pregunta: `¿Qué significa "${w.obj}"?`, respuesta: firstSense(w.es), opciones: options });
  });
  const pairs = pool.slice(0, 4);
  out.push({
    tipo: 'matching',
    pregunta: 'Une cada palabra con su significado',
    respuesta: Object.fromEntries(pairs.map((w) => [w.obj, firstSense(w.es)])),
    opciones: { columna_izquierda: pairs.map((w) => w.obj), columna_derecha: pairs.map((w) => firstSense(w.es)) },
  });
  const listen = pool.find((w) => w.audio && !w.obj.includes(' ')) ?? pool[0];
  out.push({ tipo: 'listen_write', pregunta: 'Escucha y escribe la palabra', respuesta: listen.obj, audio: listen.audio ?? null });
  const tf = pool[pool.length - 1];
  const truth = rnd() < 0.5;
  const shown = truth ? firstSense(tf.es) : firstSense(pool[0] === tf ? pool[1].es : pool[0].es);
  out.push({ tipo: 'true_false', pregunta: `"${tf.obj}" significa "${shown}"`, respuesta: truth ? 'true' : 'false' });
  const tr = pool.find((w) => !/[,;/(]/.test(w.es) && w.es.length <= 24 && !out.some((e) => e.tipo === 'multiple_choice' && e.respuesta === w.obj));
  if (tr) out.push({ tipo: 'translate', pregunta: tr.obj, respuesta: cap(tr.es.trim()) });
  return out;
};

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } });
  const db = await pool.connect();
  const log = [];
  try {
    await db.query('BEGIN');
    const q = async (sql, params) => (await db.query(sql, params)).rows;
    // Los contadores de id deben ir por delante de los datos (en Neon quedaron atrás tras cargar el contenido)
    for (const table of ['unidades', 'lecciones', 'vocabulario', 'ejercicios']) {
      await q(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${table}), 1))`);
    }

    const lessonsOf = async (idioma) =>
      q(`SELECT l.id, l.titulo, l.unidad_id FROM lecciones l JOIN unidades u ON u.id = l.unidad_id WHERE u.idioma = $1`, [idioma]);
    const audioOf = async (idioma, text) =>
      (await q(`SELECT url FROM audios WHERE idioma = $1 AND clave = lower($2) ORDER BY (voz = 'unica') DESC LIMIT 1`, [idioma, text]))[0]?.url ?? null;

    // Crea la unidad (si no existe) con sus lecciones; words: [{ id?, obj, es, audio, categoria }]
    const createUnit = async (idioma, spec, words) => {
      if ((await q('SELECT 1 FROM unidades WHERE idioma = $1 AND nombre = $2', [idioma, spec.nombre])).length) {
        log.push(`= ${idioma}: la unidad ${spec.nombre} ya existe`);
        return;
      }
      if (words.length === 0) return;
      const orden = (await q('SELECT COALESCE(MAX(orden), 0) + 1 AS n FROM unidades WHERE idioma = $1', [idioma]))[0].n;
      const [unit] = await q(
        'INSERT INTO unidades (numero, nombre, descripcion, idioma, orden, icono_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [orden, spec.nombre, spec.descripcion, idioma, orden, spec.icono]
      );
      const parts = chunk(words, LESSON_SIZE);
      for (const [i, part] of parts.entries()) {
        const titulo = parts.length > 1 ? `${spec.tema} ${i + 1}` : spec.tema;
        const teoria = `${spec.descripcion}: ${part.slice(0, 8).map((w) => `${w.obj} (${firstSense(w.es).toLowerCase()})`).join(', ')}${part.length > 8 ? '…' : '.'}`;
        const [lesson] = await q('INSERT INTO lecciones (unidad_id, numero, titulo, contenido_teorico, orden) VALUES ($1, $2, $3, $4, $5) RETURNING id', [unit.id, i + 1, titulo, teoria, i + 1]);
        for (const w of part) {
          if (w.id) await q('UPDATE vocabulario SET leccion_id = $1 WHERE id = $2', [lesson.id, w.id]);
          else
            await q('INSERT INTO vocabulario (leccion_id, palabra_espanol, palabra_objetivo, audio_url, categoria) VALUES ($1, $2, $3, $4, $5)', [
              lesson.id, w.es, w.obj, w.audio ?? (await audioOf(idioma, w.obj)), w.categoria,
            ]);
        }
        const exercises = makeExercises(lesson.id, part, idioma);
        for (const e of exercises) {
          await q('INSERT INTO ejercicios (leccion_id, tipo, pregunta, respuesta_correcta, opciones, audio_url) VALUES ($1, $2, $3, $4, $5, $6)', [
            lesson.id, e.tipo, e.pregunta, typeof e.respuesta === 'string' ? e.respuesta : JSON.stringify(e.respuesta), e.opciones ? JSON.stringify(e.opciones) : null, e.audio ?? null,
          ]);
        }
        log.push(`+ ${idioma} · ${spec.nombre} · ${titulo}: ${part.length} palabras, ${exercises.length} ejercicios`);
      }
    };

    // 1. Aymara: categorías fuera de lugar → unidades propias
    for (const spec of AYMARA) {
      const words = await q(
        `SELECT v.id, v.palabra_objetivo AS obj, v.palabra_espanol AS es, v.audio_url AS audio, v.categoria
           FROM vocabulario v JOIN lecciones l ON l.id = v.leccion_id JOIN unidades u ON u.id = l.unidad_id
          WHERE u.idioma = 'aymara' AND v.categoria = ANY($1) AND u.nombre <> $2
          ORDER BY array_position($1::text[], v.categoria::text), v.id`,
        [spec.categorias, spec.nombre]
      );
      await createUnit('aymara', spec, words);
    }

    // 2. Quechua: palabras sueltas vuelven a la lección de su tema
    const qLessons = await lessonsOf('quechua');
    const byTitle = Object.fromEntries(qLessons.map((l) => [l.titulo, l.id]));
    const stray = await q(
      `SELECT v.id, v.categoria, l.titulo FROM vocabulario v JOIN lecciones l ON l.id = v.leccion_id JOIN unidades u ON u.id = l.unidad_id WHERE u.idioma = 'quechua'`
    );
    let moved = 0;
    for (const w of stray) {
      const accepts = QUECHUA_TOPIC[w.titulo];
      const home = byTitle[QUECHUA_HOME[w.categoria]];
      if (!accepts || accepts.includes(w.categoria) || !home) continue;
      await q('UPDATE vocabulario SET leccion_id = $1 WHERE id = $2', [home, w.id]);
      moved++;
    }
    log.push(`~ quechua: ${moved} palabras volvieron a la lección de su tema`);

    // 3. Números grandes y cantidades, fuera de "Números del 6 al 10"
    for (const idioma of ['quechua', 'aymara']) {
      const rows = await q(
        `SELECT v.id, v.palabra_objetivo AS obj, v.palabra_espanol AS es, v.audio_url AS audio, v.categoria, u.nombre AS unidad
           FROM vocabulario v JOIN lecciones l ON l.id = v.leccion_id JOIN unidades u ON u.id = l.unidad_id
          WHERE u.idioma = $1 AND v.categoria = 'numeros' ORDER BY v.id`,
        [idioma]
      );
      const free = rows.filter((w) => !['Waranqa', 'Yupaykuna', 'Jakhunaka', 'Tupuykuna', 'Tupunaka'].includes(w.unidad));
      const big = free.filter((w) => BIG.test(firstSense(w.es)));
      const amounts = free.filter((w) => !BIG.test(firstSense(w.es)) && !SMALL.test(firstSense(w.es)));
      await createUnit(idioma, { nombre: idioma === 'quechua' ? 'Yupaykuna' : 'Jakhunaka', descripcion: 'Números del 11 en adelante', tema: 'Números grandes', icono: '💯' }, big);
      await createUnit(idioma, { nombre: idioma === 'quechua' ? 'Tupuykuna' : 'Tupunaka', descripcion: 'Cantidades, medidas y formas', tema: 'Cantidades', icono: '📏' }, amounts);
    }

    // 4. Quechua: el cuerpo, con las partes del modelo 3D
    const body = PARTES.filter((p) => p.quechua).map((p) => ({ obj: cap(p.quechua), es: cap(p.es), categoria: 'cuerpo' }));
    await createUnit('quechua', { nombre: 'Ukhu', descripcion: 'El cuerpo', tema: 'El cuerpo', icono: '🧍' }, body);

    console.log(log.join('\n'));
    if (APPLY) {
      await db.query('COMMIT');
      console.log('\nAplicado.');
    } else {
      await db.query('ROLLBACK');
      console.log('\nSolo vista previa: nada cambió. Para aplicarlo: --aplicar');
    }
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
    await pool.end();
  }
};

if (process.argv[1]?.endsWith('organize-units.js')) main();
