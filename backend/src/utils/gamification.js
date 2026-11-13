// Gamificación de YachAru: racha diaria, nivel por Ayni Points e insignias.
// Antes vivía mezclada en progressController.js y este archivo estaba vacío.
import { pool } from '../config/database.js';
import { notifyBadgeEarned } from '../controllers/notificationController.js';

// Niveles (mismos nombres que frontend/src/utils/levels.js): puntos mínimos para cada uno
export const LEVEL_THRESHOLDS = [0, 300, 800, 1500, 3000];

export const levelForPoints = (points) => {
  let level = 1;
  LEVEL_THRESHOLDS.forEach((min, i) => {
    if (points >= min) level = i + 1;
  });
  return level;
};

// Días de calendario entre dos fechas (en la zona horaria de Perú, UTC-5)
const dayNumber = (date) => Math.floor((new Date(date).getTime() - 5 * 3600 * 1000) / 86400000);

/**
 * Racha diaria real: sube 1 solo si la última actividad fue ayer, se mantiene si fue hoy
 * y vuelve a 1 si pasó más de un día. (Antes subía con cada lección guardada.)
 */
export const nextStreak = (currentStreak, lastActivity, now = new Date()) => {
  if (!lastActivity) return 1;
  const diff = dayNumber(now) - dayNumber(lastActivity);
  if (diff <= 0) return Math.max(currentStreak || 0, 1);
  if (diff === 1) return (currentStreak || 0) + 1;
  return 1;
};

export const awardBadge = async (userId, badgeCode) => {
  const badge = await pool.query('SELECT id, nombre FROM insignias WHERE codigo = $1', [badgeCode]);
  if (badge.rows.length === 0) return null;
  const inserted = await pool.query(
    `INSERT INTO usuarios_insignias (usuario_id, insignia_id, fecha_obtencion)
     SELECT $1, $2, NOW()
     WHERE NOT EXISTS (SELECT 1 FROM usuarios_insignias WHERE usuario_id = $1 AND insignia_id = $2)
     RETURNING id`,
    [userId, badge.rows[0].id]
  );
  return inserted.rows.length > 0 ? badge.rows[0] : null; // { id, nombre }
};

/**
 * Actualiza puntos, racha y nivel tras guardar una lección, y otorga las insignias que correspondan.
 * Devuelve { puntos, racha, nivel, insignias: [nombres nuevos] }.
 */
export const applyLessonResult = async ({ userId, leccionId, porcentaje, completado }) => {
  const puntosGanados = completado ? Math.floor(porcentaje) : 0;

  const current = await pool.query('SELECT puntos_totales, racha_actual, ultima_actividad FROM usuarios WHERE id = $1', [userId]);
  const user = current.rows[0] || {};
  const racha = nextStreak(user.racha_actual, user.ultima_actividad);
  const puntosTotales = (user.puntos_totales || 0) + puntosGanados;
  const nivel = levelForPoints(puntosTotales);

  await pool.query(
    'UPDATE usuarios SET puntos_totales = $1, racha_actual = $2, nivel_actual = $3, ultima_actividad = NOW() WHERE id = $4',
    [puntosTotales, racha, nivel, userId]
  );

  const ganadas = []; // { id, nombre }
  if (completado) {
    const add = (badge) => badge && ganadas.push(badge);

    const completedCount = await pool.query(
      'SELECT COUNT(*)::int AS total FROM progreso_usuario WHERE usuario_id = $1 AND completado = true',
      [userId]
    );
    if (completedCount.rows[0].total >= 1) add(await awardBadge(userId, 'complete_first_lesson'));
    if (porcentaje === 100) add(await awardBadge(userId, 'perfect_lesson'));
    if (racha >= 7) add(await awardBadge(userId, 'streak_7_days'));

    // Unidad completa
    const unit = await pool.query(
      `SELECT u.id, u.numero FROM lecciones l JOIN unidades u ON l.unidad_id = u.id WHERE l.id = $1`,
      [leccionId]
    );
    if (unit.rows.length > 0) {
      const { id: unidadId, numero } = unit.rows[0];
      const counts = await pool.query(
        `SELECT
           (SELECT COUNT(*) FROM lecciones WHERE unidad_id = $2)::int AS total,
           (SELECT COUNT(*) FROM progreso_usuario pu JOIN lecciones l ON pu.leccion_id = l.id
             WHERE pu.usuario_id = $1 AND l.unidad_id = $2 AND pu.completado = true)::int AS hechas`,
        [userId, unidadId]
      );
      if (counts.rows[0].total > 0 && counts.rows[0].hechas >= counts.rows[0].total) {
        add(await awardBadge(userId, `complete_unit_${numero}`));
      }
    }

    // Todas las unidades
    const all = await pool.query(
      `SELECT (SELECT COUNT(*) FROM unidades)::int AS total,
              (SELECT COUNT(DISTINCT l.unidad_id) FROM progreso_usuario pu JOIN lecciones l ON pu.leccion_id = l.id
                WHERE pu.usuario_id = $1 AND pu.completado = true)::int AS hechas`,
      [userId]
    );
    if (all.rows[0].total > 0 && all.rows[0].hechas >= all.rows[0].total) add(await awardBadge(userId, 'complete_all_units'));
  }

  for (const badge of ganadas) {
    notifyBadgeEarned(userId, badge.id).catch((err) => console.log('Error notificando insignia:', err.message));
  }

  return { puntos: puntosGanados, puntosTotales, racha, nivel, insignias: ganadas.map((b) => b.nombre) };
};
