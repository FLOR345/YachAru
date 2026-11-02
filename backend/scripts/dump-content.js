// Exporta el CONTENIDO de la base (no datos de personas) a database/seed/contenido.sql.
// Con schema.sql + migraciones + este archivo, una instalación nueva (Docker, CI) reproduce la plataforma real.
// Uso: npm run db:content
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../database/seed/contenido.sql');
// Solo tablas de contenido. Nunca: usuarios, progreso, insignias ganadas, favoritos ni eventos.
const TABLES = ['unidades', 'lecciones', 'vocabulario', 'ejercicios', 'insignias', 'contenido_cultural', 'audios'];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : true });

// Tipos de PostgreSQL que importan aquí: json (114) y jsonb (3802) se escriben como texto JSON
const JSON_TYPES = new Set([114, 3802]);
const literal = (value, typeId) => {
  if (value !== null && value !== undefined && JSON_TYPES.has(typeId)) return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Array.isArray(value)) return `ARRAY[${value.map(literal).join(', ')}]::text[]`;
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
};

let sql = `-- Contenido de SimiAru (sin datos de personas), generado con: npm run db:content
-- Generado: ${new Date().toISOString()}
-- Aviso: parte del vocabulario aymara proviene de diccionarios del Ministerio de Educación de Chile;
-- su licencia de redistribución está pendiente de confirmar (ver README).

BEGIN;
`;
for (const table of TABLES) {
  const { rows, fields } = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
  const cols = fields.map((f) => `"${f.name}"`).join(', ');
  sql += `\n-- ${table}: ${rows.length} filas\n`;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    sql += `INSERT INTO ${table} (${cols}) VALUES\n${chunk.map((r) => `(${fields.map((f) => literal(r[f.name], f.dataTypeID)).join(', ')})`).join(',\n')}\nON CONFLICT DO NOTHING;\n`;
  }
  sql += `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1));\n`;
  console.log(`  ${table}: ${rows.length}`);
}
sql += '\nCOMMIT;\n';

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, sql);
console.log(`✅ ${path.relative(process.cwd(), out)} (${(sql.length / 1024).toFixed(0)} KB)`);
await pool.end();
