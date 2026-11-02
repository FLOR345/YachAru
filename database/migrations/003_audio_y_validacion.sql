-- 003: registro de audios (grabados y MMS) y evidencia de validación del artículo.
-- Solo agrega: no borra ni cambia datos existentes. vocabulario.audio_url sigue siendo la columna que usa la app.

-- Un audio por texto y lengua. "clave" es el texto normalizado (ver tools/tts/audio_key_vectors.json):
-- la misma palabra en varias lecciones comparte audio, y las frases de la interfaz también lo encuentran.
CREATE TABLE IF NOT EXISTS audios (
  id SERIAL PRIMARY KEY,
  idioma VARCHAR(20) NOT NULL,
  clave TEXT NOT NULL,
  texto TEXT NOT NULL,
  url TEXT NOT NULL,
  fuente VARCHAR(12) NOT NULL CHECK (fuente IN ('grabado', 'mms')),
  modelo VARCHAR(80),             -- NULL en las grabaciones
  segundos NUMERIC(6, 2),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idioma, clave)
);

-- Las voces grabadas que ya existen quedan registradas como tales: el proceso MMS nunca las reemplaza.
INSERT INTO audios (idioma, clave, texto, url, fuente)
SELECT DISTINCT ON (u.idioma, LOWER(TRIM(v.palabra_objetivo)))
  u.idioma, LOWER(TRIM(v.palabra_objetivo)), v.palabra_objetivo, v.audio_url, 'grabado'
FROM vocabulario v
JOIN lecciones l ON l.id = v.leccion_id
JOIN unidades u ON u.id = l.unidad_id
WHERE v.audio_url IS NOT NULL AND v.audio_url <> '' AND v.audio_url NOT LIKE '%/simiaru/audio/%'
ORDER BY u.idioma, LOWER(TRIM(v.palabra_objetivo)), v.id
ON CONFLICT (idioma, clave) DO NOTHING;

-- Evaluación perceptual: personas externas al proyecto, identificadas solo por un código.
CREATE TABLE IF NOT EXISTS evaluadores (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(12) NOT NULL UNIQUE,
  idioma VARCHAR(20) NOT NULL,
  variedad VARCHAR(80),
  consentimiento_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS muestra_evaluacion (
  idioma VARCHAR(20) NOT NULL,
  audio_id INTEGER NOT NULL REFERENCES audios(id) ON DELETE CASCADE,
  fenomenos TEXT[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (idioma, audio_id)
);

CREATE TABLE IF NOT EXISTS evaluaciones_audio (
  evaluador_id INTEGER NOT NULL REFERENCES evaluadores(id) ON DELETE CASCADE,
  audio_id INTEGER NOT NULL REFERENCES audios(id) ON DELETE CASCADE,
  puntaje SMALLINT NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  comentario TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (evaluador_id, audio_id)
);

-- Revisión del léxico por hablantes: lo marcado queda registrado con su valor original.
CREATE TABLE IF NOT EXISTS revision_lexico (
  vocabulario_id INTEGER PRIMARY KEY REFERENCES vocabulario(id) ON DELETE CASCADE,
  estado VARCHAR(12) NOT NULL CHECK (estado IN ('correcto', 'variante', 'error')),
  valor_original TEXT NOT NULL,
  correccion TEXT,
  nota TEXT,
  revisor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  revisado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lexico_faltante (
  id SERIAL PRIMARY KEY,
  idioma VARCHAR(20) NOT NULL,
  palabra_objetivo TEXT NOT NULL,
  palabra_espanol TEXT NOT NULL,
  nota TEXT,
  revisor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
