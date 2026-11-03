-- 005: dos voces MMS por texto (hombre y mujer). Las grabaciones quedan como voz "unica".
-- Los modelos MMS tienen una sola voz; la otra se obtiene transformándola (ver tools/tts/generate_audio.py).
ALTER TABLE audios ADD COLUMN IF NOT EXISTS voz VARCHAR(10) NOT NULL DEFAULT 'unica'
  CHECK (voz IN ('unica', 'hombre', 'mujer'));
ALTER TABLE audios ADD COLUMN IF NOT EXISTS transformada BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE audios DROP CONSTRAINT IF EXISTS audios_idioma_clave_key;
CREATE UNIQUE INDEX IF NOT EXISTS audios_idioma_clave_voz ON audios (idioma, clave, voz);
