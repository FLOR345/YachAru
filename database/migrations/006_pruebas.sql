-- 006: pruebas del modo aula. El docente elige:
--   unidad: todas las lecciones de una unidad (la evaluación de siempre del programa);
--   breve:  algunas sesiones de una unidad o una miscelánea de varias.
-- Cada intento guarda las preguntas que tocaron (con su respuesta) y lo que respondió el estudiante.
CREATE TABLE IF NOT EXISTS pruebas (
  id SERIAL PRIMARY KEY,
  aula_id INTEGER NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  titulo VARCHAR(100) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('unidad', 'breve')),
  leccion_ids INTEGER[] NOT NULL,
  preguntas INTEGER NOT NULL DEFAULT 10 CHECK (preguntas BETWEEN 3 AND 40),
  abierta BOOLEAN NOT NULL DEFAULT true,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pruebas_aula ON pruebas (aula_id);

CREATE TABLE IF NOT EXISTS intentos_prueba (
  id SERIAL PRIMARY KEY,
  prueba_id INTEGER NOT NULL REFERENCES pruebas(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  preguntas JSONB NOT NULL,
  respuestas JSONB,
  aciertos INTEGER,
  total INTEGER NOT NULL,
  iniciado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terminado_en TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_intentos_prueba ON intentos_prueba (prueba_id, usuario_id);
