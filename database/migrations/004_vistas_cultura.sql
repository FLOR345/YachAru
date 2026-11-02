-- 004: contador de vistas de los textos culturales. El código ya lo usaba, pero la columna no existía.
ALTER TABLE contenido_cultural ADD COLUMN IF NOT EXISTS vistas INTEGER NOT NULL DEFAULT 0;
