// Modo aula: cuentas de estudiante por código, sin correo ni datos personales.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';
import { generateToken } from '../utils/jwt.js';
import { EXPORT_COLUMNS, toCsv } from './researchController.js';
import { isKnownLanguage } from '../utils/languages.js';

// Sin letras ni números que se confundan al dictarlos (0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randomCode = (length) => Array.from(crypto.randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join('');
const normalizeCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Correo interno, en un dominio reservado que no existe (.invalid): la columna lo exige, pero no es un dato personal
const internalEmail = (handle) => `est-${handle.toLowerCase()}@aula.simiaru.invalid`;

const publicUser = (row) => ({
  id: row.id,
  nombre: row.nombre,
  idioma_objetivo: row.idioma_objetivo,
  puntos_totales: row.puntos_totales,
  nivel_actual: row.nivel_actual,
  racha_actual: row.racha_actual,
  es_cuenta_aula: true,
  aula_id: row.aula_id,
  consentimiento_datos: row.consentimiento_datos,
});

const ownClassroom = async (classroomId, teacherId) => {
  const { rows } = await pool.query('SELECT * FROM aulas WHERE id = $1 AND docente_id = $2', [classroomId, teacherId]);
  return rows[0] || null;
};

// ==================== DOCENTE ====================
export const createClassroom = async (req, res, next) => {
  try {
    const me = await pool.query('SELECT es_cuenta_aula FROM usuarios WHERE id = $1', [req.user.id]);
    if (me.rows[0]?.es_cuenta_aula) return res.status(403).json({ message: 'Las cuentas de estudiante no pueden crear aulas' });
    if (!(await isKnownLanguage(req.body.idioma))) return res.status(400).json({ message: 'Ese idioma no tiene contenido cargado' });

    let codigo;
    for (let i = 0; i < 5; i += 1) {
      codigo = randomCode(6);
      const taken = await pool.query('SELECT 1 FROM aulas WHERE codigo = $1', [codigo]);
      if (taken.rows.length === 0) break;
    }
    const { rows } = await pool.query(
      'INSERT INTO aulas (nombre, codigo, idioma, docente_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.body.nombre.trim(), codigo, req.body.idioma, req.user.id]
    );
    res.status(201).json({ aula: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const myClassrooms = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, (SELECT COUNT(*) FROM usuarios u WHERE u.aula_id = a.id)::int AS estudiantes
       FROM aulas a WHERE a.docente_id = $1 ORDER BY a.creada_en DESC`,
      [req.user.id]
    );
    res.json({ aulas: rows });
  } catch (error) {
    next(error);
  }
};

// Avance por estudiante (solo alias: el docente nunca ve correo ni nombre real)
export const classroomProgress = async (req, res, next) => {
  try {
    const aula = await ownClassroom(req.params.id, req.user.id);
    if (!aula) return res.status(404).json({ message: 'Aula no encontrada' });
    const { rows } = await pool.query(
      `SELECT u.nombre AS alias, u.puntos_totales, u.racha_actual, u.ultima_actividad, u.consentimiento_datos,
              (SELECT COUNT(*) FROM progreso_usuario p WHERE p.usuario_id = u.id AND p.completado)::int AS lecciones_completadas
       FROM usuarios u WHERE u.aula_id = $1 ORDER BY u.puntos_totales DESC NULLS LAST, u.nombre`,
      [aula.id]
    );
    res.json({ aula, estudiantes: rows });
  } catch (error) {
    next(error);
  }
};

// Eventos del aula, seudonimizados y solo de quienes dieron su consentimiento
export const exportClassroom = async (req, res, next) => {
  try {
    const aula = await ownClassroom(req.params.id, req.user.id);
    if (!aula) return res.status(404).json({ message: 'Aula no encontrada' });
    const { rows } = await pool.query(
      `SELECT ${EXPORT_COLUMNS.map((c) => `e.${c}`).join(', ')}
       FROM eventos_aprendizaje e JOIN usuarios u ON u.id = e.usuario_id
       WHERE u.aula_id = $1 AND u.consentimiento_datos = true ORDER BY e.ocurrido_en`,
      [aula.id]
    );
    const name = `simiaru-aula-${aula.codigo}`;
    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
      return res.send(`﻿${toCsv(rows)}`);
    }
    res.setHeader('Content-Disposition', `attachment; filename="${name}.json"`);
    res.json({ formato: 'simiaru-eventos-v1', aula: aula.nombre, total: rows.length, columnas: EXPORT_COLUMNS, eventos: rows });
  } catch (error) {
    next(error);
  }
};

// ==================== ESTUDIANTE ====================
// Entrar con el código del aula y un alias: se crea una cuenta sin datos personales
export const joinClassroom = async (req, res, next) => {
  try {
    const codigo = normalizeCode(req.body.codigo);
    const alias = req.body.alias.trim().replace(/\s+/g, ' ');
    const aulaRes = await pool.query('SELECT * FROM aulas WHERE codigo = $1 AND activa = true', [codigo]);
    const aula = aulaRes.rows[0];
    if (!aula) return res.status(404).json({ message: 'No encontramos un aula con ese código' });

    // Código personal para volver a entrar desde otro dispositivo: XXXXXX-XXXX
    const handle = randomCode(6);
    const secret = randomCode(4);
    const codigoEstudiante = `${handle}-${secret}`;
    const hash = await bcrypt.hash(codigoEstudiante, 10);

    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, idioma_objetivo, es_cuenta_aula, aula_id)
       VALUES ($1, $2, $3, $4, true, $5) RETURNING *`,
      [alias, internalEmail(handle), hash, aula.idioma, aula.id]
    );
    res.status(201).json({
      token: generateToken(rows[0].id),
      user: publicUser(rows[0]),
      codigoEstudiante,
      aula: { nombre: aula.nombre, idioma: aula.idioma },
    });
  } catch (error) {
    next(error);
  }
};

export const studentLogin = async (req, res, next) => {
  try {
    const raw = String(req.body.codigoEstudiante || '').toUpperCase().trim();
    const match = raw.replace(/\s/g, '').match(/^([A-Z0-9]{6})-?([A-Z0-9]{4})$/);
    if (!match) return res.status(400).json({ message: 'El código debe tener la forma XXXXXX-XXXX' });
    const codigo = `${match[1]}-${match[2]}`;
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND es_cuenta_aula = true', [internalEmail(match[1])]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(codigo, user.password_hash || ''))) {
      return res.status(401).json({ message: 'Código de estudiante incorrecto' });
    }
    res.json({ token: generateToken(user.id), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

// "Mi aula": lo que ve el estudiante de su clase. Solo alias y avance (nunca datos personales);
// la clase completa se resume en cifras y un podio de los 3 primeros por Ayni Points.
export const myClassroomAsStudent = async (req, res, next) => {
  try {
    const me = (await pool.query('SELECT id, nombre, aula_id, puntos_totales, racha_actual FROM usuarios WHERE id = $1', [req.user.id])).rows[0];
    if (!me?.aula_id) return res.status(404).json({ message: 'Esta cuenta no pertenece a un aula' });
    const aula = (
      await pool.query('SELECT a.nombre, a.idioma, a.codigo, d.nombre AS docente FROM aulas a JOIN usuarios d ON d.id = a.docente_id WHERE a.id = $1', [me.aula_id])
    ).rows[0];
    if (!aula) return res.status(404).json({ message: 'El aula ya no existe' });
    const { rows } = await pool.query(
      `SELECT u.id, u.nombre AS alias, COALESCE(u.puntos_totales, 0)::int AS puntos, COALESCE(u.racha_actual, 0)::int AS racha, u.ultima_actividad,
              (SELECT COUNT(*) FROM progreso_usuario p WHERE p.usuario_id = u.id AND p.completado)::int AS lecciones
         FROM usuarios u WHERE u.aula_id = $1 ORDER BY u.puntos_totales DESC NULLS LAST, u.id`,
      [me.aula_id]
    );
    const mine = rows.find((r) => r.id === me.id);
    const week = Date.now() - 7 * 86400000;
    res.json({
      aula: { nombre: aula.nombre, idioma: aula.idioma, codigo: aula.codigo, docente: aula.docente },
      yo: { alias: mine.alias, puntos: mine.puntos, racha: mine.racha, lecciones: mine.lecciones, puesto: rows.findIndex((r) => r.id === me.id) + 1 },
      clase: {
        estudiantes: rows.length,
        lecciones: rows.reduce((a, r) => a + r.lecciones, 0),
        activos_semana: rows.filter((r) => r.ultima_actividad && new Date(r.ultima_actividad).getTime() >= week).length,
      },
      podio: rows.slice(0, 3).filter((r) => r.puntos > 0).map((r) => ({ alias: r.alias, puntos: r.puntos, soy_yo: r.id === me.id })),
    });
  } catch (error) {
    next(error);
  }
};
