// Pruebas del modo aula.
// Dos tipos que elige el docente:
//  - unidad: todas las lecciones de una unidad (como la evaluación de siempre);
//  - breve:  algunas sesiones de una unidad o una miscelánea de varias unidades.
// El estudiante puede estudiar primero exactamente las palabras que pueden salir.
// Las preguntas se arman con el vocabulario de esas lecciones y la clave se queda en el servidor:
// al empezar se envían sin respuesta y se califican al entregar.
import { pool } from '../config/database.js';

const TYPES = ['unidad', 'breve'];
const firstSense = (es) => String(es || '').split(/[,;/(]/)[0].trim();
const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const teacherClassroom = async (id, teacherId) =>
  (await pool.query('SELECT * FROM aulas WHERE id = $1 AND docente_id = $2', [id, teacherId])).rows[0] || null;

const studentClassroomId = async (userId) => (await pool.query('SELECT aula_id FROM usuarios WHERE id = $1', [userId])).rows[0]?.aula_id ?? null;

// Palabras de las lecciones, sin repetir la misma palabra ni el mismo significado
const wordsOf = async (lessonIds) => {
  const { rows } = await pool.query(
    `SELECT v.id, v.palabra_objetivo AS obj, v.palabra_espanol AS es, v.audio_url AS audio, l.id AS leccion_id, l.titulo AS leccion
       FROM vocabulario v JOIN lecciones l ON l.id = v.leccion_id
      WHERE l.id = ANY($1) ORDER BY l.orden, v.id`,
    [lessonIds]
  );
  const seen = new Set();
  return rows.filter((w) => {
    const a = w.obj.trim().toLowerCase();
    const b = firstSense(w.es).toLowerCase();
    if (!a || !b || seen.has(a) || seen.has(`es:${b}`)) return false;
    seen.add(a);
    seen.add(`es:${b}`);
    return true;
  });
};

/**
 * Arma las preguntas: qué significa, cómo se dice, escucha y elige, verdadero o falso.
 * Devuelve [{ tipo, enunciado, palabra?, audio?, opciones, respuesta }].
 */
export const buildQuestions = (words, count) => {
  if (words.length < 4) return [];
  const chosen = shuffle(words).slice(0, Math.min(count, words.length));
  const kinds = ['significado', 'traduccion', 'escucha', 'vf'];
  return chosen.map((w, i) => {
    const others = shuffle(words.filter((o) => o !== w));
    let kind = kinds[i % kinds.length];
    if (kind === 'escucha' && !w.audio) kind = 'significado';
    if (kind === 'significado') {
      const answer = firstSense(w.es);
      return { tipo: kind, enunciado: `¿Qué significa «${w.obj}»?`, palabra: w.obj, opciones: shuffle([answer, ...others.slice(0, 3).map((o) => firstSense(o.es))]), respuesta: answer };
    }
    if (kind === 'traduccion') {
      return { tipo: kind, enunciado: `¿Cómo se dice «${firstSense(w.es)}»?`, opciones: shuffle([w.obj, ...others.slice(0, 3).map((o) => o.obj)]), respuesta: w.obj };
    }
    if (kind === 'escucha') {
      return { tipo: kind, enunciado: 'Escucha y elige la palabra que oyes', audio: w.audio, opciones: shuffle([w.obj, ...others.slice(0, 3).map((o) => o.obj)]), respuesta: w.obj };
    }
    const truth = Math.random() < 0.5;
    const shown = truth ? firstSense(w.es) : firstSense(others[0].es);
    return { tipo: 'vf', enunciado: `«${w.obj}» significa «${shown}»`, palabra: w.obj, opciones: ['Verdadero', 'Falso'], respuesta: truth ? 'Verdadero' : 'Falso' };
  });
};

const publicQuestion = ({ respuesta, ...q }) => q;

// ==================== DOCENTE ====================
export const createTest = async (req, res, next) => {
  try {
    const aula = await teacherClassroom(req.params.id, req.user.id);
    if (!aula) return res.status(404).json({ message: 'Aula no encontrada' });
    const tipo = req.body.tipo;
    const ids = [...new Set((req.body.leccion_ids || []).map(Number).filter(Number.isInteger))];
    if (!TYPES.includes(tipo)) return res.status(400).json({ message: 'El tipo debe ser «unidad» o «breve»' });
    if (ids.length === 0) return res.status(400).json({ message: 'Elige al menos una sesión' });
    // Solo lecciones de la lengua del aula
    const valid = await pool.query(
      'SELECT l.id FROM lecciones l JOIN unidades u ON u.id = l.unidad_id WHERE l.id = ANY($1) AND u.idioma = $2',
      [ids, aula.idioma]
    );
    if (valid.rows.length !== ids.length) return res.status(400).json({ message: 'Hay sesiones que no son de la lengua del aula' });
    if ((await wordsOf(ids)).length < 4) return res.status(400).json({ message: 'Esas sesiones tienen muy pocas palabras para una prueba' });
    const preguntas = Math.max(3, Math.min(40, Number(req.body.preguntas) || (tipo === 'unidad' ? 15 : 8)));
    const titulo = String(req.body.titulo || '').trim().slice(0, 100) || (tipo === 'unidad' ? 'Prueba de unidad' : 'Sesión breve');
    const { rows } = await pool.query(
      'INSERT INTO pruebas (aula_id, titulo, tipo, leccion_ids, preguntas) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [aula.id, titulo, tipo, ids, preguntas]
    );
    res.status(201).json({ prueba: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const listTests = async (req, res, next) => {
  try {
    const aula = await teacherClassroom(req.params.id, req.user.id);
    if (!aula) return res.status(404).json({ message: 'Aula no encontrada' });
    const { rows } = await pool.query(
      `SELECT p.*,
              (SELECT COUNT(DISTINCT i.usuario_id) FROM intentos_prueba i WHERE i.prueba_id = p.id AND i.terminado_en IS NOT NULL)::int AS estudiantes,
              (SELECT ROUND(AVG(best))::int FROM (
                 SELECT MAX(100 * i.aciertos / NULLIF(i.total, 0)) AS best FROM intentos_prueba i
                  WHERE i.prueba_id = p.id AND i.terminado_en IS NOT NULL GROUP BY i.usuario_id) b) AS promedio
         FROM pruebas p WHERE p.aula_id = $1 ORDER BY p.creada_en DESC`,
      [aula.id]
    );
    res.json({ pruebas: rows });
  } catch (error) {
    next(error);
  }
};

export const testResults = async (req, res, next) => {
  try {
    const aula = await teacherClassroom(req.params.id, req.user.id);
    if (!aula) return res.status(404).json({ message: 'Aula no encontrada' });
    const test = (await pool.query('SELECT * FROM pruebas WHERE id = $1 AND aula_id = $2', [req.params.testId, aula.id])).rows[0];
    if (!test) return res.status(404).json({ message: 'Prueba no encontrada' });
    const { rows } = await pool.query(
      `SELECT u.nombre AS alias,
              MAX(100 * i.aciertos / NULLIF(i.total, 0))::int AS mejor,
              COUNT(i.id) FILTER (WHERE i.terminado_en IS NOT NULL)::int AS intentos,
              MAX(i.terminado_en) AS ultima
         FROM usuarios u LEFT JOIN intentos_prueba i ON i.usuario_id = u.id AND i.prueba_id = $1
        WHERE u.aula_id = $2 GROUP BY u.id ORDER BY mejor DESC NULLS LAST, u.nombre`,
      [test.id, aula.id]
    );
    res.json({ prueba: test, estudiantes: rows });
  } catch (error) {
    next(error);
  }
};

export const updateTest = async (req, res, next) => {
  try {
    const aula = await teacherClassroom(req.params.id, req.user.id);
    if (!aula) return res.status(404).json({ message: 'Aula no encontrada' });
    const { rows } = await pool.query('UPDATE pruebas SET abierta = $1 WHERE id = $2 AND aula_id = $3 RETURNING *', [!!req.body.abierta, req.params.testId, aula.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Prueba no encontrada' });
    res.json({ prueba: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const deleteTest = async (req, res, next) => {
  try {
    const aula = await teacherClassroom(req.params.id, req.user.id);
    if (!aula) return res.status(404).json({ message: 'Aula no encontrada' });
    await pool.query('DELETE FROM pruebas WHERE id = $1 AND aula_id = $2', [req.params.testId, aula.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

// ==================== ESTUDIANTE ====================
const studentTest = async (req) => {
  const aulaId = await studentClassroomId(req.user.id);
  if (!aulaId) return null;
  return (await pool.query('SELECT * FROM pruebas WHERE id = $1 AND aula_id = $2', [req.params.testId, aulaId])).rows[0] || null;
};

export const myTests = async (req, res, next) => {
  try {
    const aulaId = await studentClassroomId(req.user.id);
    if (!aulaId) return res.status(404).json({ message: 'Esta cuenta no pertenece a un aula' });
    const { rows } = await pool.query(
      `SELECT p.id, p.titulo, p.tipo, p.preguntas, p.abierta, p.creada_en, cardinality(p.leccion_ids) AS sesiones,
              (SELECT MAX(100 * i.aciertos / NULLIF(i.total, 0))::int FROM intentos_prueba i WHERE i.prueba_id = p.id AND i.usuario_id = $2 AND i.terminado_en IS NOT NULL) AS mejor,
              (SELECT COUNT(*) FROM intentos_prueba i WHERE i.prueba_id = p.id AND i.usuario_id = $2 AND i.terminado_en IS NOT NULL)::int AS intentos
         FROM pruebas p WHERE p.aula_id = $1 ORDER BY p.abierta DESC, p.creada_en DESC`,
      [aulaId, req.user.id]
    );
    res.json({ pruebas: rows });
  } catch (error) {
    next(error);
  }
};

// Lo que puede salir: las sesiones y sus palabras, para estudiar antes
export const studyTest = async (req, res, next) => {
  try {
    const test = await studentTest(req);
    if (!test) return res.status(404).json({ message: 'Prueba no encontrada' });
    const words = await wordsOf(test.leccion_ids);
    const lessons = [];
    for (const w of words) {
      let l = lessons.find((x) => x.id === w.leccion_id);
      if (!l) lessons.push((l = { id: w.leccion_id, titulo: w.leccion, palabras: [] }));
      l.palabras.push({ id: w.id, palabra: w.obj, significado: w.es, audio: w.audio });
    }
    res.json({ prueba: { id: test.id, titulo: test.titulo, tipo: test.tipo, preguntas: test.preguntas, abierta: test.abierta }, sesiones: lessons });
  } catch (error) {
    next(error);
  }
};

export const startTest = async (req, res, next) => {
  try {
    const test = await studentTest(req);
    if (!test) return res.status(404).json({ message: 'Prueba no encontrada' });
    if (!test.abierta) return res.status(409).json({ message: 'Tu docente cerró esta prueba' });
    const questions = buildQuestions(await wordsOf(test.leccion_ids), test.preguntas);
    if (questions.length === 0) return res.status(409).json({ message: 'Esta prueba no tiene suficientes palabras' });
    const { rows } = await pool.query('INSERT INTO intentos_prueba (prueba_id, usuario_id, preguntas, total) VALUES ($1, $2, $3, $4) RETURNING id', [
      test.id, req.user.id, JSON.stringify(questions), questions.length,
    ]);
    res.status(201).json({ intento: rows[0].id, titulo: test.titulo, preguntas: questions.map(publicQuestion) });
  } catch (error) {
    next(error);
  }
};

export const submitTest = async (req, res, next) => {
  try {
    const test = await studentTest(req);
    if (!test) return res.status(404).json({ message: 'Prueba no encontrada' });
    const attempt = (await pool.query('SELECT * FROM intentos_prueba WHERE id = $1 AND prueba_id = $2 AND usuario_id = $3', [req.params.attemptId, test.id, req.user.id])).rows[0];
    if (!attempt) return res.status(404).json({ message: 'Intento no encontrado' });
    if (attempt.terminado_en) return res.status(409).json({ message: 'Este intento ya se entregó' });
    const answers = Array.isArray(req.body.respuestas) ? req.body.respuestas.map((a) => (a == null ? null : String(a).slice(0, 200))) : [];
    const review = attempt.preguntas.map((q, i) => ({ enunciado: q.enunciado, respuesta: q.respuesta, dada: answers[i] ?? null, correcta: answers[i] === q.respuesta }));
    const aciertos = review.filter((r) => r.correcta).length;
    await pool.query('UPDATE intentos_prueba SET respuestas = $1, aciertos = $2, terminado_en = NOW() WHERE id = $3', [JSON.stringify(answers), aciertos, attempt.id]);
    res.json({ aciertos, total: attempt.total, porcentaje: Math.round((100 * aciertos) / attempt.total), revision: review });
  } catch (error) {
    next(error);
  }
};
