-- Esquema real de YachAru, generado desde la base con: npm run db:schema
-- Generado: 2026-10-29T16:11:56.684Z
-- No editar a mano: los cambios van en database/migrations/00N_*.sql

CREATE TABLE IF NOT EXISTS contenido_cultural (
  "id" SERIAL,
  "tipo" VARCHAR(50) NOT NULL,
  "idioma" VARCHAR(20) NOT NULL,
  "titulo" VARCHAR(200),
  "contenido_original" TEXT NOT NULL,
  "traduccion" TEXT,
  "audio_url" VARCHAR(255),
  "imagen_url" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now(),
  "explicacion" TEXT,
  "autor" VARCHAR(255),
  "region" VARCHAR(100),
  "dificultad" VARCHAR(20) DEFAULT 'intermedio'::character varying,
  "tags" TEXT[],
  CONSTRAINT contenido_cultural_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ejercicios (
  "id" SERIAL,
  "leccion_id" INTEGER,
  "tipo" VARCHAR(50) NOT NULL,
  "pregunta" TEXT NOT NULL,
  "respuesta_correcta" TEXT NOT NULL,
  "opciones" JSONB,
  "audio_url" VARCHAR(255),
  CONSTRAINT ejercicios_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS favoritos_cultura (
  "id" SERIAL,
  "usuario_id" INTEGER NOT NULL,
  "contenido_id" INTEGER NOT NULL,
  "fecha_agregado" TIMESTAMP DEFAULT now(),
  CONSTRAINT favoritos_cultura_pkey PRIMARY KEY (id),
  CONSTRAINT favoritos_cultura_usuario_id_contenido_id_key UNIQUE (usuario_id, contenido_id)
);

CREATE TABLE IF NOT EXISTS insignias (
  "id" SERIAL,
  "nombre" VARCHAR(100) NOT NULL,
  "descripcion" TEXT,
  "icono_url" VARCHAR(255),
  "condicion" VARCHAR(100),
  "codigo" VARCHAR(50),
  CONSTRAINT insignias_pkey PRIMARY KEY (id),
  CONSTRAINT insignias_codigo_key UNIQUE (codigo)
);

CREATE TABLE IF NOT EXISTS lecciones (
  "id" SERIAL,
  "unidad_id" INTEGER,
  "numero" INTEGER NOT NULL,
  "titulo" VARCHAR(100) NOT NULL,
  "contenido_teorico" TEXT,
  "orden" INTEGER NOT NULL,
  CONSTRAINT lecciones_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS progreso_usuario (
  "id" SERIAL,
  "usuario_id" INTEGER,
  "leccion_id" INTEGER,
  "completado" BOOLEAN DEFAULT false,
  "porcentaje_aciertos" INTEGER,
  "fecha_completado" TIMESTAMP DEFAULT now(),
  CONSTRAINT progreso_usuario_pkey PRIMARY KEY (id),
  CONSTRAINT progreso_usuario_usuario_id_leccion_id_key UNIQUE (usuario_id, leccion_id)
);

CREATE TABLE IF NOT EXISTS unidades (
  "id" SERIAL,
  "numero" INTEGER NOT NULL,
  "nombre" VARCHAR(100) NOT NULL,
  "descripcion" TEXT,
  "idioma" VARCHAR(20) NOT NULL,
  "orden" INTEGER NOT NULL,
  "icono_url" VARCHAR(255),
  CONSTRAINT unidades_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS usuarios (
  "id" SERIAL,
  "nombre" VARCHAR(100) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "password_hash" VARCHAR(255),
  "idioma_objetivo" VARCHAR(20) DEFAULT 'quechua'::character varying,
  "puntos_totales" INTEGER DEFAULT 0,
  "nivel_actual" INTEGER DEFAULT 1,
  "racha_actual" INTEGER DEFAULT 0,
  "fecha_registro" TIMESTAMP DEFAULT now(),
  "ultima_actividad" TIMESTAMP DEFAULT now(),
  "google_id" VARCHAR(255),
  "facebook_id" VARCHAR(255),
  "avatar" VARCHAR(500),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_email_key UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS usuarios_insignias (
  "id" SERIAL,
  "usuario_id" INTEGER,
  "insignia_id" INTEGER,
  "fecha_obtencion" TIMESTAMP DEFAULT now(),
  CONSTRAINT usuarios_insignias_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_insignias_usuario_id_insignia_id_key UNIQUE (usuario_id, insignia_id)
);

CREATE TABLE IF NOT EXISTS vocabulario (
  "id" SERIAL,
  "leccion_id" INTEGER,
  "palabra_espanol" VARCHAR(100) NOT NULL,
  "palabra_objetivo" VARCHAR(100) NOT NULL,
  "audio_url" VARCHAR(255),
  "categoria" VARCHAR(50),
  "ejemplo_uso" TEXT,
  CONSTRAINT vocabulario_pkey PRIMARY KEY (id)
);

-- Llaves foráneas (al final, cuando todas las tablas existen)
ALTER TABLE ejercicios ADD CONSTRAINT ejercicios_leccion_id_fkey FOREIGN KEY (leccion_id) REFERENCES lecciones(id) ON DELETE CASCADE;
ALTER TABLE favoritos_cultura ADD CONSTRAINT favoritos_cultura_contenido_id_fkey FOREIGN KEY (contenido_id) REFERENCES contenido_cultural(id) ON DELETE CASCADE;
ALTER TABLE favoritos_cultura ADD CONSTRAINT favoritos_cultura_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE lecciones ADD CONSTRAINT lecciones_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE CASCADE;
ALTER TABLE progreso_usuario ADD CONSTRAINT progreso_usuario_leccion_id_fkey FOREIGN KEY (leccion_id) REFERENCES lecciones(id) ON DELETE CASCADE;
ALTER TABLE progreso_usuario ADD CONSTRAINT progreso_usuario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE usuarios_insignias ADD CONSTRAINT usuarios_insignias_insignia_id_fkey FOREIGN KEY (insignia_id) REFERENCES insignias(id) ON DELETE CASCADE;
ALTER TABLE usuarios_insignias ADD CONSTRAINT usuarios_insignias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE vocabulario ADD CONSTRAINT vocabulario_leccion_id_fkey FOREIGN KEY (leccion_id) REFERENCES lecciones(id) ON DELETE CASCADE;

-- Índices
CREATE INDEX IF NOT EXISTS idx_cultura_idioma ON public.contenido_cultural USING btree (idioma);
CREATE INDEX IF NOT EXISTS idx_cultura_tipo ON public.contenido_cultural USING btree (tipo);
CREATE INDEX IF NOT EXISTS idx_ejercicios_leccion ON public.ejercicios USING btree (leccion_id);
CREATE INDEX IF NOT EXISTS idx_vocabulario_leccion ON public.vocabulario USING btree (leccion_id);
