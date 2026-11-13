// Genera database/schema.sql a partir de la base real (solo lectura).
// Así la instalación nueva (Docker, CI) reproduce exactamente las tablas que usa la aplicación.
// Uso: npm run db:schema
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../database/schema.sql');
// Tablas antiguas sin uso en el código: no se reproducen
const SKIP = new Set(['users', 'usuario_insignias', 'cultura', 'migraciones']);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : true });

const tables = (
  await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`)
).rows
  .map((r) => r.table_name)
  .filter((t) => !SKIP.has(t));

const typeOf = (c) => {
  if (c.data_type === 'character varying') return c.character_maximum_length ? `VARCHAR(${c.character_maximum_length})` : 'VARCHAR';
  if (c.data_type === 'timestamp without time zone') return 'TIMESTAMP';
  if (c.data_type === 'timestamp with time zone') return 'TIMESTAMPTZ';
  if (c.data_type === 'USER-DEFINED') return c.udt_name;
  // Arreglos: udt_name es '_text', '_int4'… → TEXT[], INT4[]
  if (c.data_type === 'ARRAY') return `${c.udt_name.replace(/^_/, '').toUpperCase()}[]`;
  return c.data_type.toUpperCase();
};

const blocks = [];
const foreignKeys = [];
for (const table of tables) {
  const cols = (
    await pool.query(
      `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default, udt_name
       FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [table]
    )
  ).rows;
  const constraints = (
    await pool.query(
      `SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS def
       FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
       WHERE rel.relname = $1 AND con.connamespace = 'public'::regnamespace ORDER BY con.contype, con.conname`,
      [table]
    )
  ).rows;

  const lines = cols.map((c) => {
    const serial = c.column_default?.startsWith('nextval(');
    let type = typeOf(c);
    if (serial) type = c.data_type === 'bigint' ? 'BIGSERIAL' : 'SERIAL';
    const def = !serial && c.column_default ? ` DEFAULT ${c.column_default}` : '';
    const nn = c.is_nullable === 'NO' && !serial ? ' NOT NULL' : '';
    return `  ${JSON.stringify(c.column_name)} ${type}${nn}${def}`;
  });
  for (const con of constraints) {
    if (con.contype === 'f') foreignKeys.push(`ALTER TABLE ${table} ADD CONSTRAINT ${con.conname} ${con.def};`);
    else if (con.contype === 'p' || con.contype === 'u' || con.contype === 'c') lines.push(`  CONSTRAINT ${con.conname} ${con.def}`);
  }
  blocks.push(`CREATE TABLE IF NOT EXISTS ${table} (\n${lines.join(',\n')}\n);`);
}

const indexes = (
  await pool.query(
    `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname NOT IN (
       SELECT conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace) ORDER BY indexname`
  )
).rows
  .map((r) => r.indexdef.replace(/^CREATE (UNIQUE )?INDEX /, 'CREATE $1INDEX IF NOT EXISTS '))
  .filter((d) => !Array.from(SKIP).some((t) => d.includes(` ON public.${t} `)));

const sql = `-- Esquema real de YachAru, generado desde la base con: npm run db:schema
-- Generado: ${new Date().toISOString()}
-- No editar a mano: los cambios van en database/migrations/00N_*.sql

${blocks.join('\n\n')}

-- Llaves foráneas (al final, cuando todas las tablas existen)
${foreignKeys.join('\n')}

-- Índices
${indexes.map((i) => `${i};`).join('\n')}
`;

fs.writeFileSync(out, sql);
console.log(`✅ ${path.relative(process.cwd(), out)}: ${tables.length} tablas`);
await pool.end();
