// Datos de aprendizaje a nivel de evento, con consentimiento y exportación en CSV y JSON.
// Convierte a YachAru en un instrumento de investigación reutilizable (contribución 3 del artículo).
import crypto from 'node:crypto';
import { pool } from '../config/database.js';

export const EVENT_TYPES = [
  'lesson_started',
  'exercise_answered',
  'exercise_skipped',
  'lesson_completed',
  'audio_played',
  'word_marked',
];
const RESULTS = ['correcto', 'variante', 'incorrecto'];

// Columnas exportadas, en este orden. Nunca incluyen nombre, correo ni el id interno.
export const EXPORT_COLUMNS = [
  'participante',
  'sesion',
  'tipo',
  'idioma',
  'leccion_id',
  'ejercicio_id',
  'vocabulario_id',
  'tipo_ejercicio',
  'resultado',
  'respuesta',
  'esperado',
  'intento',
  'duracion_ms',
  'ocurrido_en',
];

// Seudónimo estable por persona: HMAC-SHA256 del id con una sal del servidor (no reversible sin la sal)
export const pseudonym = (userId) =>
  crypto
    .createHmac('sha256', process.env.RESEARCH_SALT || process.env.JWT_SECRET)
    .update(String(userId))
    .digest('hex')
    .slice(0, 16);

const clip = (value, max) => (value == null ? null : String(value).slice(0, max));
const intOrNull = (value) => (Number.isInteger(Number(value)) && value !== null && value !== '' ? Number(value) : null);

export const toCsv = (rows) => {
  const escape = (v) => {
    if (v == null) return '';
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [EXPORT_COLUMNS.join(','), ...rows.map((r) => EXPORT_COLUMNS.map((c) => escape(r[c])).join(','))].join('\n');
};

const sendExport = (res, rows, format, filename) => {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(`﻿${toCsv(rows)}`); // BOM: Excel abre bien las tildes y la ñ
  }
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
  return res.json({
    formato: 'simiaru-eventos-v1',
    generado_en: new Date().toISOString(),
    columnas: EXPORT_COLUMNS,
    total: rows.length,
    eventos: rows,
  });
};

// ==================== CONSENTIMIENTO ====================
export const getConsent = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT consentimiento_datos, consentimiento_fecha FROM usuarios WHERE id = $1', [req.user.id]);
    res.json({ consiente: rows[0]?.consentimiento_datos ?? null, fecha: rows[0]?.consentimiento_fecha ?? null });
  } catch (error) {
    next(error);
  }
};

export const setConsent = async (req, res, next) => {
  try {
    const { consiente } = req.body;
    await pool.query('UPDATE usuarios SET consentimiento_datos = $1, consentimiento_fecha = NOW() WHERE id = $2', [consiente, req.user.id]);
    res.json({ consiente, message: consiente ? 'Gracias: tus datos de aprendizaje ayudarán a investigar' : 'Ya no se registran tus datos de aprendizaje' });
  } catch (error) {
    next(error);
  }
};

// ==================== RECEPCIÓN DE EVENTOS ====================
// Llegan en lotes desde el navegador (también los guardados sin conexión). Sin consentimiento no se guarda nada.
export const recordEvents = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT consentimiento_datos FROM usuarios WHERE id = $1', [req.user.id]);
    if (rows[0]?.consentimiento_datos !== true) {
      return res.json({ guardados: 0, motivo: 'sin_consentimiento' });
    }

    const participante = pseudonym(req.user.id);
    const now = Date.now();
    const valid = req.body.events
      .filter((e) => e && EVENT_TYPES.includes(e.tipo))
      .map((e) => {
        const when = new Date(e.ocurrido_en);
        // Fechas imposibles (futuras o de hace más de 30 días) se reemplazan por la de llegada
        const ocurrido = Number.isNaN(when.getTime()) || when.getTime() > now + 60000 || when.getTime() < now - 30 * 86400000 ? new Date(now) : when;
        return [
          req.user.id,
          participante,
          clip(e.sesion, 40),
          e.tipo,
          ['quechua', 'aymara'].includes(e.idioma) ? e.idioma : clip(e.idioma, 20),
          intOrNull(e.leccion_id),
          intOrNull(e.ejercicio_id),
          intOrNull(e.vocabulario_id),
          clip(e.tipo_ejercicio, 40),
          RESULTS.includes(e.resultado) ? e.resultado : null,
          clip(e.respuesta, 300),
          clip(e.esperado, 300),
          intOrNull(e.intento),
          intOrNull(e.duracion_ms),
          JSON.stringify(e.metadatos && typeof e.metadatos === 'object' ? e.metadatos : {}).slice(0, 2000),
          ocurrido,
        ];
      });

    if (valid.length === 0) return res.json({ guardados: 0 });

    const params = [];
    const values = valid.map((row, i) => {
      params.push(...row);
      const base = i * row.length;
      return `(${row.map((_, j) => `$${base + j + 1}`).join(', ')})`;
    });
    await pool.query(
      `INSERT INTO eventos_aprendizaje
        (usuario_id, participante, sesion, tipo, idioma, leccion_id, ejercicio_id, vocabulario_id, tipo_ejercicio,
         resultado, respuesta, esperado, intento, duracion_ms, metadatos, ocurrido_en)
       VALUES ${values.join(', ')}`,
      params
    );
    res.json({ guardados: valid.length });
  } catch (error) {
    next(error);
  }
};

// ==================== EXPORTACIÓN ====================
const selectEvents = `SELECT ${EXPORT_COLUMNS.join(', ')} FROM eventos_aprendizaje`;

// Cada persona descarga sus propios eventos
export const exportMine = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${selectEvents} WHERE usuario_id = $1 ORDER BY ocurrido_en`, [req.user.id]);
    sendExport(res, rows, req.query.format === 'csv' ? 'csv' : 'json', 'yacharu-mis-eventos');
  } catch (error) {
    next(error);
  }
};

// Soberanía de datos: la persona puede borrar todo lo registrado sobre ella
export const deleteMine = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM eventos_aprendizaje WHERE usuario_id = $1', [req.user.id]);
    res.json({ borrados: rowCount });
  } catch (error) {
    next(error);
  }
};

// Investigación: todos los eventos con consentimiento vigente, seudonimizados (solo administradores)
export const exportAll = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `${selectEvents} e WHERE EXISTS (SELECT 1 FROM usuarios u WHERE u.id = e.usuario_id AND u.consentimiento_datos = true)
       ORDER BY ocurrido_en`
    );
    sendExport(res, rows, req.query.format === 'csv' ? 'csv' : 'json', 'simiaru-eventos');
  } catch (error) {
    next(error);
  }
};
