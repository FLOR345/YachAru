// Evidencia del artículo, en línea: índice de audios, cobertura, evaluación perceptual y revisión del léxico.
// Las cifras salen siempre de la base: aquí no hay ningún resultado escrito a mano.
import crypto from 'node:crypto';
import { pool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { PHENOMENA, audioKey, phenomenaOf, krippendorffAlpha } from '../utils/phonology.js';
import { isKnownLanguage, knownLanguages } from '../utils/languages.js';

export const MIN_RATERS = 10; // hablantes por lengua que deben terminar para reportar la media y el acuerdo
export const SAMPLE_SIZE = 20; // palabras por persona: unos 5 minutos
export const COMPLETE_SHARE = 0.8; // cuenta como evaluación terminada quien calificó al menos el 80 % de la muestra
const MAX_EVALUATORS = 80; // por lengua: freno a inscripciones masivas desde el QR
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from(crypto.randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
const hashOrder = (seed, value) => crypto.createHash('sha256').update(`${seed}:${value}`).digest('hex');

const requireLanguage = async (idioma) => {
  if (!(await isKnownLanguage(idioma))) throw new AppError('Idioma no soportado', 400);
};

// ==================== ÍNDICE DE AUDIOS ====================
// La app busca aquí la voz de cualquier texto en la lengua (palabras, frases, números, canciones).
// ?voz=mujer|hombre elige la voz MMS; una grabación de persona va siempre primero.
export const getAudioIndex = async (req, res, next) => {
  try {
    await requireLanguage(req.params.idioma);
    const voice = req.query.voz === 'hombre' ? 'hombre' : 'mujer';
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (clave) clave, url, fuente FROM audios WHERE idioma = $1
       ORDER BY clave, (voz = 'unica') DESC, (voz = $2) DESC`,
      [req.params.idioma, voice]
    );
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ audios: Object.fromEntries(rows.map((r) => [r.clave, [r.url, r.fuente]])) });
  } catch (error) {
    next(error);
  }
};

// ==================== COBERTURA (pública: un revisor la comprueba en un minuto) ====================
export const getCoverage = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.idioma, v.id, v.palabra_objetivo, v.audio_url, a.fuente, a.modelo, r.estado, r.correccion
      FROM vocabulario v
      JOIN lecciones l ON l.id = v.leccion_id
      JOIN unidades u ON u.id = l.unidad_id
      LEFT JOIN audios a ON a.url = v.audio_url AND a.idioma = u.idioma
      LEFT JOIN revision_lexico r ON r.vocabulario_id = v.id
    `);

    const languages = {};
    for (const row of rows) {
      const lang = (languages[row.idioma] ??= {
        filas: 0,
        unicas: new Set(),
        modelos: new Set(),
        audio: { mms: 0, grabado: 0, sin_audio: 0 },
        fenomenos: Object.fromEntries(PHENOMENA.map((p) => [p, new Set()])),
        revision: { revisadas: 0, correctas: 0, variantes: 0, corregidas: 0 },
      });
      const key = audioKey(row.palabra_objetivo);
      lang.filas += 1;
      lang.unicas.add(key);
      if (row.modelo) lang.modelos.add(row.modelo);
      if (!row.audio_url) lang.audio.sin_audio += 1;
      else if (row.fuente === 'mms') lang.audio.mms += 1;
      else lang.audio.grabado += 1; // toda URL que no salió del proceso MMS es una grabación
      phenomenaOf(key).forEach((p) => lang.fenomenos[p].add(key));
      if (row.estado) {
        lang.revision.revisadas += 1;
        if (row.estado === 'correcto') lang.revision.correctas += 1;
        if (row.estado === 'variante') lang.revision.variantes += 1;
        if (row.estado === 'error') lang.revision.corregidas += 1;
      }
    }

    const idiomas = Object.fromEntries(
      Object.entries(languages).map(([id, l]) => [
        id,
        {
          filas: l.filas,
          entradas_unicas: l.unicas.size,
          audio: l.audio,
          cobertura_audio_pct: Number((((l.filas - l.audio.sin_audio) / l.filas) * 100).toFixed(1)),
          modelos: [...l.modelos],
          fenomenos: Object.fromEntries(Object.entries(l.fenomenos).map(([p, set]) => [p, set.size])),
          revision: l.revision,
        },
      ])
    );

    const voices = await pool.query(
      "SELECT idioma, voz, transformada, COUNT(*)::int AS n FROM audios WHERE fuente = 'mms' GROUP BY 1, 2, 3"
    );
    for (const row of voices.rows) {
      if (idiomas[row.idioma]) (idiomas[row.idioma].voces_mms ??= {})[row.voz] = { textos: row.n, transformada: row.transformada };
    }

    res.json({
      generado_en: new Date().toISOString(),
      definicion: {
        fila: 'Una fila de la tabla vocabulario (una palabra puede repetirse en varias lecciones).',
        entrada_unica: 'Texto distinto tras normalizarlo: minúsculas, apóstrofos unificados y sin signos.',
        fenomenos: "Sobre entradas únicas. glotalizada: ch' p' t' k' q'. aspirada: chh ph th kh qh. uvular: cualquier q.",
        grabado: 'Audio grabado e insertado por personas, no generado por el proceso MMS.',
        voces_mms: 'Textos con cada voz. La voz transformada sale de la del modelo con el vocoder WORLD (tono y formantes).',
      },
      idiomas,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== EVALUACIÓN PERCEPTUAL: ADMINISTRACIÓN ====================
// Muestra estratificada y reproducible: reparte los lugares entre los fenómenos y las palabras sin ellos.
export const pickSample = (entries, size, seed = 'simiaru') => {
  const groups = new Map();
  for (const entry of [...entries].sort((a, b) => hashOrder(seed, a.clave).localeCompare(hashOrder(seed, b.clave)))) {
    const group = entry.fenomenos[0] ?? 'ninguno';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(entry);
  }
  const picked = [];
  while (picked.length < size && [...groups.values()].some((g) => g.length > 0)) {
    for (const group of groups.values()) {
      if (picked.length < size && group.length > 0) picked.push(group.shift());
    }
  }
  return picked;
};

// Arma la muestra con la voz que suena en la app (audio MMS enlazado al vocabulario).
const buildSample = async (idioma, size) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT a.id, a.clave FROM audios a
     JOIN vocabulario v ON v.audio_url = a.url
     WHERE a.idioma = $1 AND a.fuente = 'mms'`,
    [idioma]
  );
  const entries = rows.map((r) => ({ ...r, fenomenos: phenomenaOf(r.clave) }));
  const sample = pickSample(entries, size);
  if (sample.length === 0) throw new AppError('Esta lengua todavía no tiene audio para evaluar', 409);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM muestra_evaluacion WHERE idioma = $1', [idioma]);
    for (const entry of sample) {
      await client.query('INSERT INTO muestra_evaluacion (idioma, audio_id, fenomenos) VALUES ($1, $2, $3)', [idioma, entry.id, entry.fenomenos]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return sample.length;
};

const sampleSize = async (idioma) =>
  (await pool.query('SELECT COUNT(*)::int AS n FROM muestra_evaluacion WHERE idioma = $1', [idioma])).rows[0].n;

export const createSample = async (req, res, next) => {
  try {
    const { idioma, tamano = SAMPLE_SIZE } = req.body;
    await requireLanguage(idioma);
    const rated = await pool.query(
      `SELECT 1 FROM evaluaciones_audio e JOIN evaluadores d ON d.id = e.evaluador_id WHERE d.idioma = $1 LIMIT 1`,
      [idioma]
    );
    if (rated.rowCount > 0) throw new AppError('Ya hay evaluaciones de esta lengua: la muestra no se puede cambiar', 409);
    res.status(201).json({ tamano: await buildSample(idioma, Number(tamano)) });
  } catch (error) {
    next(error);
  }
};

export const createEvaluators = async (req, res, next) => {
  try {
    const { idioma, cantidad = 10, variedad } = req.body;
    await requireLanguage(idioma);
    const codigos = [];
    for (let i = 0; i < Number(cantidad); i += 1) {
      const codigo = newCode();
      await pool.query('INSERT INTO evaluadores (codigo, idioma, variedad) VALUES ($1, $2, $3)', [codigo, idioma, variedad || null]);
      codigos.push(codigo);
    }
    res.status(201).json({ codigos });
  } catch (error) {
    next(error);
  }
};

export const listEvaluators = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.codigo, d.variedad, d.consentimiento_en, COUNT(e.audio_id)::int AS respondidas
       FROM evaluadores d LEFT JOIN evaluaciones_audio e ON e.evaluador_id = d.id
       WHERE d.idioma = $1 GROUP BY d.id ORDER BY d.id`,
      [req.query.idioma]
    );
    const sample = await pool.query('SELECT COUNT(*)::int AS n FROM muestra_evaluacion WHERE idioma = $1', [req.query.idioma]);
    res.json({ evaluadores: rows, muestra: sample.rows[0].n });
  } catch (error) {
    next(error);
  }
};

// ==================== EVALUACIÓN PERCEPTUAL: QUIEN EVALÚA (sin cuenta, solo su código) ====================
const findEvaluator = async (codigo) => {
  const { rows } = await pool.query('SELECT * FROM evaluadores WHERE codigo = $1', [String(codigo).trim().toUpperCase()]);
  if (!rows[0]) throw new AppError('Ese código no existe', 404);
  return rows[0];
};

const itemsFor = async (evaluator) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.texto, a.url, e.puntaje
     FROM muestra_evaluacion m
     JOIN audios a ON a.id = m.audio_id
     LEFT JOIN evaluaciones_audio e ON e.audio_id = a.id AND e.evaluador_id = $1
     WHERE m.idioma = $2`,
    [evaluator.id, evaluator.idioma]
  );
  // Cada evaluador recibe su propio orden, siempre el mismo: evita el sesgo por posición
  return rows.sort((a, b) => hashOrder(evaluator.codigo, a.id).localeCompare(hashOrder(evaluator.codigo, b.id)));
};

// Quien evaluó al menos el 80 % de la muestra, por lengua
const completedByLanguage = async () => {
  const { rows } = await pool.query(
    `SELECT d.idioma, COUNT(*)::int AS n FROM (
       SELECT d.id, d.idioma, COUNT(e.audio_id) AS hechas FROM evaluadores d
       JOIN evaluaciones_audio e ON e.evaluador_id = d.id GROUP BY d.id
     ) d
     JOIN (SELECT idioma, COUNT(*) AS total FROM muestra_evaluacion GROUP BY idioma) m ON m.idioma = d.idioma
     WHERE d.hechas >= CEIL(m.total * $1::numeric) GROUP BY d.idioma`,
    [COMPLETE_SHARE]
  );
  return Object.fromEntries(rows.map((r) => [r.idioma, r.n]));
};

// Pública: qué lenguas se pueden evaluar ya (con audio) y cuántas personas terminaron
export const evaluationLanguages = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.idioma, COUNT(DISTINCT a.id)::int AS audios FROM audios a
       JOIN vocabulario v ON v.audio_url = a.url WHERE a.fuente = 'mms' GROUP BY a.idioma`
    );
    const done = await completedByLanguage();
    const languages = [...(await knownLanguages())].map((idioma) => {
      const audios = rows.find((r) => r.idioma === idioma)?.audios ?? 0;
      return { idioma, disponible: audios >= SAMPLE_SIZE, terminaron: done[idioma] ?? 0 };
    });
    res.json({ meta: MIN_RATERS, palabras: SAMPLE_SIZE, lenguas: languages });
  } catch (error) {
    next(error);
  }
};

// Entrar desde el QR: la persona acepta en pantalla y recibe su código, sin que nadie se lo reparta
export const joinEvaluation = async (req, res, next) => {
  try {
    const { idioma, consiente, ajeno, variedad } = req.body;
    await requireLanguage(idioma);
    if (consiente !== true) throw new AppError('Para participar hay que aceptar las condiciones', 400);
    if (ajeno !== true) throw new AppError('Si participaste en crear YachAru no puedes evaluar: tu opinión no sería independiente', 403);
    const count = await pool.query('SELECT COUNT(*)::int AS n FROM evaluadores WHERE idioma = $1', [idioma]);
    if (count.rows[0].n >= MAX_EVALUATORS) throw new AppError('Ya tenemos suficientes evaluaciones de esta lengua. ¡Gracias!', 409);
    if ((await sampleSize(idioma)) === 0) await buildSample(idioma, SAMPLE_SIZE);

    const codigo = newCode();
    const { rows } = await pool.query(
      'INSERT INTO evaluadores (codigo, idioma, variedad, consentimiento_en) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [codigo, idioma, variedad?.trim().slice(0, 80) || null]
    );
    res.status(201).json({ codigo, idioma, items: await itemsFor(rows[0]) });
  } catch (error) {
    next(error);
  }
};

export const enterEvaluation = async (req, res, next) => {
  try {
    const evaluator = await findEvaluator(req.body.codigo);
    if (!evaluator.consentimiento_en) {
      if (req.body.consiente !== true) return res.json({ necesitaConsentimiento: true, idioma: evaluator.idioma });
      await pool.query('UPDATE evaluadores SET consentimiento_en = NOW() WHERE id = $1', [evaluator.id]);
    }
    res.json({ idioma: evaluator.idioma, items: await itemsFor(evaluator) });
  } catch (error) {
    next(error);
  }
};

export const answerEvaluation = async (req, res, next) => {
  try {
    const { codigo, audioId, puntaje, comentario } = req.body;
    const evaluator = await findEvaluator(codigo);
    if (!evaluator.consentimiento_en) throw new AppError('Falta el consentimiento', 403);
    const inSample = await pool.query('SELECT 1 FROM muestra_evaluacion WHERE idioma = $1 AND audio_id = $2', [evaluator.idioma, audioId]);
    if (inSample.rowCount === 0) throw new AppError('Ese audio no es parte de la evaluación', 400);
    await pool.query(
      `INSERT INTO evaluaciones_audio (evaluador_id, audio_id, puntaje, comentario) VALUES ($1, $2, $3, $4)
       ON CONFLICT (evaluador_id, audio_id) DO UPDATE SET puntaje = EXCLUDED.puntaje, comentario = EXCLUDED.comentario, creado_en = NOW()`,
      [evaluator.id, audioId, puntaje, comentario?.trim().slice(0, 500) || null]
    );
    res.json({ guardado: true });
  } catch (error) {
    next(error);
  }
};

// ==================== EVALUACIÓN PERCEPTUAL: RESULTADOS ====================
export const summarizeRatings = (ratings, size = SAMPLE_SIZE) => {
  const mean = (values) => (values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null);
  const units = new Map();
  const byPhenomenon = {};
  for (const r of ratings) {
    if (!units.has(r.audio_id)) units.set(r.audio_id, {});
    units.get(r.audio_id)[r.evaluador] = r.puntaje;
    for (const phenomenon of r.fenomenos.length ? r.fenomenos : ['ninguno']) {
      (byPhenomenon[phenomenon] ??= []).push(r.puntaje);
    }
  }
  const perRater = new Map();
  for (const r of ratings) perRater.set(r.evaluador, (perRater.get(r.evaluador) ?? 0) + 1);
  const raters = perRater.size;
  const completed = [...perRater.values()].filter((n) => n >= Math.ceil(size * COMPLETE_SHARE)).length;
  const alpha = krippendorffAlpha([...units.values()]);
  return {
    evaluadores: raters,
    evaluadores_completos: completed,
    audios_evaluados: units.size,
    juicios: ratings.length,
    media: mean(ratings.map((r) => r.puntaje)),
    alfa_krippendorff_ordinal: alpha === null ? null : Number(alpha.toFixed(3)),
    por_fenomeno: Object.fromEntries(Object.entries(byPhenomenon).map(([p, v]) => [p, { juicios: v.length, media: mean(v) }])),
    suficiente: completed >= MIN_RATERS,
    aviso: completed >= MIN_RATERS ? null : `Van ${completed} de ${MIN_RATERS} personas que terminaron la evaluación.`,
  };
};

export const getResults = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.codigo AS evaluador, a.id AS audio_id, a.texto, e.puntaje, e.comentario, m.fenomenos
       FROM evaluaciones_audio e
       JOIN evaluadores d ON d.id = e.evaluador_id
       JOIN audios a ON a.id = e.audio_id
       JOIN muestra_evaluacion m ON m.audio_id = a.id AND m.idioma = d.idioma
       WHERE d.idioma = $1 ORDER BY a.id, d.id`,
      [req.query.idioma]
    );
    if (req.query.format === 'csv') {
      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = rows.map((r) => [r.evaluador, r.audio_id, r.texto, r.puntaje, r.fenomenos.join('+'), r.comentario].map(escape).join(','));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="yacharu-evaluacion-${req.query.idioma}.csv"`);
      return res.send(`﻿evaluador,audio_id,texto,puntaje,fenomenos,comentario\n${lines.join('\n')}`);
    }
    res.json(summarizeRatings(rows, (await sampleSize(req.query.idioma)) || SAMPLE_SIZE));
  } catch (error) {
    next(error);
  }
};

// ==================== REVISIÓN DEL LÉXICO POR HABLANTES ====================
export const listLexicon = async (req, res, next) => {
  try {
    const { idioma, pendientes, q } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const filters = ['u.idioma = $1'];
    const params = [idioma];
    if (pendientes === 'true') filters.push('r.vocabulario_id IS NULL');
    if (q) {
      params.push(`%${q}%`);
      filters.push(`(v.palabra_objetivo ILIKE $${params.length} OR v.palabra_espanol ILIKE $${params.length})`);
    }
    const from = `FROM vocabulario v
      JOIN lecciones l ON l.id = v.leccion_id
      JOIN unidades u ON u.id = l.unidad_id
      LEFT JOIN revision_lexico r ON r.vocabulario_id = v.id
      WHERE ${filters.join(' AND ')}`;
    const total = await pool.query(`SELECT COUNT(*)::int AS n ${from}`, params);
    const { rows } = await pool.query(
      `SELECT v.id, v.palabra_objetivo, v.palabra_espanol, v.ejemplo_uso, v.audio_url, l.titulo AS leccion, r.estado, r.correccion, r.nota, r.valor_original
       ${from} ORDER BY v.palabra_objetivo, v.id LIMIT 30 OFFSET $${params.length + 1}`,
      [...params, (page - 1) * 30]
    );
    res.json({ total: total.rows[0].n, page, palabras: rows });
  } catch (error) {
    next(error);
  }
};

export const reviewWord = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { estado, correccion, nota } = req.body;
    const fix = correccion?.trim();
    if (estado === 'error' && !fix) throw new AppError('Escribe la forma correcta', 400);

    await client.query('BEGIN');
    const word = await client.query(
      `SELECT v.palabra_objetivo, v.audio_url, r.valor_original
       FROM vocabulario v LEFT JOIN revision_lexico r ON r.vocabulario_id = v.id
       WHERE v.id = $1 FOR UPDATE OF v`,
      [req.params.id]
    );
    if (!word.rows[0]) throw new AppError('Palabra no encontrada', 404);
    const { palabra_objetivo: current, audio_url: audio, valor_original: original } = word.rows[0];

    await client.query(
      `INSERT INTO revision_lexico (vocabulario_id, estado, valor_original, correccion, nota, revisor_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (vocabulario_id) DO UPDATE
       SET estado = EXCLUDED.estado, correccion = EXCLUDED.correccion, nota = EXCLUDED.nota,
           revisor_id = EXCLUDED.revisor_id, revisado_en = NOW()`,
      [req.params.id, estado, original ?? current, fix || null, nota?.trim() || null, req.user.id]
    );
    if (estado === 'error' && fix !== current) {
      // El audio MMS de la forma anterior ya no sirve (se regenera en la próxima corrida); una grabación se conserva
      const staleMms = audio?.includes('/simiaru/audio/');
      await client.query('UPDATE vocabulario SET palabra_objetivo = $1, audio_url = CASE WHEN $2 THEN NULL ELSE audio_url END WHERE id = $3', [fix, Boolean(staleMms), req.params.id]);
    }
    await client.query('COMMIT');
    res.json({ guardado: true });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const addMissingWord = async (req, res, next) => {
  try {
    const { idioma, palabra_objetivo: target, palabra_espanol: spanish, nota } = req.body;
    await requireLanguage(idioma);
    await pool.query(
      'INSERT INTO lexico_faltante (idioma, palabra_objetivo, palabra_espanol, nota, revisor_id) VALUES ($1, $2, $3, $4, $5)',
      [idioma, target.trim(), spanish.trim(), nota?.trim() || null, req.user.id]
    );
    res.status(201).json({ guardado: true });
  } catch (error) {
    next(error);
  }
};
