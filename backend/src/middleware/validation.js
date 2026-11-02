// Validación de entradas, sin dependencias externas.
// Cada regla describe un campo del body; si algo no cumple, responde 400 con la lista de errores
// antes de llegar al controlador (y antes de tocar la base de datos).

const RULES = {
  string: (v, r) => typeof v === 'string' && v.trim().length >= (r.min ?? 0) && v.trim().length <= (r.max ?? Infinity),
  email: (v) => typeof v === 'string' && v.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  integer: (v, r) => Number.isInteger(Number(v)) && Number(v) >= (r.min ?? -Infinity) && Number(v) <= (r.max ?? Infinity),
  number: (v, r) => typeof v === 'number' && Number.isFinite(v) && v >= (r.min ?? -Infinity) && v <= (r.max ?? Infinity),
  boolean: (v) => typeof v === 'boolean',
  oneOf: (v, r) => r.values.includes(v),
  array: (v, r) => Array.isArray(v) && v.length <= (r.max ?? Infinity),
  object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
};

const MESSAGES = {
  string: (f, r) => `${f} debe tener entre ${r.min ?? 0} y ${r.max ?? '∞'} caracteres`,
  email: (f) => `${f} no es un correo válido`,
  integer: (f) => `${f} debe ser un número entero válido`,
  number: (f) => `${f} debe ser un número válido`,
  boolean: (f) => `${f} debe ser verdadero o falso`,
  oneOf: (f, r) => `${f} debe ser uno de: ${r.values.join(', ')}`,
  array: (f, r) => `${f} debe ser una lista de hasta ${r.max ?? '∞'} elementos`,
  object: (f) => `${f} debe ser un objeto`,
};

/**
 * validate({ email: { type: 'email' }, edad: { type: 'integer', min: 0, optional: true } })
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const data = req[source] || {};
  const errors = [];
  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      if (!rule.optional) errors.push(`Falta ${field}`);
      continue;
    }
    const check = RULES[rule.type];
    if (!check) throw new Error(`Regla de validación desconocida: ${rule.type}`);
    if (!check(value, rule)) errors.push(MESSAGES[rule.type](field, rule));
  }
  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }
  next();
};

// Esquemas reutilizados por las rutas
export const schemas = {
  register: {
    nombre: { type: 'string', min: 1, max: 80 },
    email: { type: 'email' },
    password: { type: 'string', min: 6, max: 128 },
  },
  login: {
    email: { type: 'email' },
    password: { type: 'string', min: 1, max: 128 },
  },
  saveProgress: {
    leccionId: { type: 'integer', min: 1 },
    porcentajeAciertos: { type: 'number', min: 0, max: 100 },
  },
  events: {
    events: { type: 'array', max: 200 },
  },
  consent: {
    consiente: { type: 'boolean' },
  },
  classroom: {
    nombre: { type: 'string', min: 1, max: 80 },
    idioma: { type: 'string', min: 2, max: 20 },
  },
  joinClassroom: {
    codigo: { type: 'string', min: 6, max: 12 },
    alias: { type: 'string', min: 1, max: 40 },
  },
  byLanguage: {
    idioma: { type: 'string', min: 2, max: 20 },
  },
  evaluationSample: {
    idioma: { type: 'string', min: 2, max: 20 },
    tamano: { type: 'integer', min: 10, max: 100, optional: true },
  },
  evaluators: {
    idioma: { type: 'string', min: 2, max: 20 },
    cantidad: { type: 'integer', min: 1, max: 30, optional: true },
    variedad: { type: 'string', max: 80, optional: true },
  },
  evaluationEnter: {
    codigo: { type: 'string', min: 8, max: 12 },
    consiente: { type: 'boolean', optional: true },
  },
  evaluationAnswer: {
    codigo: { type: 'string', min: 8, max: 12 },
    audioId: { type: 'integer', min: 1 },
    puntaje: { type: 'integer', min: 1, max: 5 },
    comentario: { type: 'string', max: 500, optional: true },
  },
  wordReview: {
    estado: { type: 'oneOf', values: ['correcto', 'variante', 'error'] },
    correccion: { type: 'string', max: 200, optional: true },
    nota: { type: 'string', max: 500, optional: true },
  },
  missingWord: {
    idioma: { type: 'string', min: 2, max: 20 },
    palabra_objetivo: { type: 'string', min: 1, max: 200 },
    palabra_espanol: { type: 'string', min: 1, max: 200 },
    nota: { type: 'string', max: 500, optional: true },
  },
};
