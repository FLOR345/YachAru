// Pruebas de integración contra una base PostgreSQL de prueba (en CI o Docker), nunca la de producción.
// Requieren TEST_DATABASE_URL con el esquema y el contenido cargados (ver .github/workflows/ci.yml).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.TEST_DATABASE_URL;
const skip = !url ? 'sin TEST_DATABASE_URL: se omiten las pruebas con base de datos' : false;
if (url && /neon\.tech|render\.com|supabase/i.test(url)) {
  throw new Error('TEST_DATABASE_URL apunta a una base en la nube: las pruebas solo corren contra una base local o de CI');
}

let request;
let app;
let pool;
const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const user = { nombre: 'Prueba', email: `prueba${unique}@ejemplo.test`, password: 'clave-segura-123' };
let token;
let lessonId;

before(async () => {
  if (skip) return;
  process.env.DATABASE_URL = url;
  process.env.DATABASE_SSL = 'false';
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET ||= 'secreto-de-prueba';
  process.env.SESSION_SECRET ||= 'sesion-de-prueba';
  process.env.ADMIN_EMAILS = `admin${unique}@ejemplo.test`;
  ({ default: request } = await import('supertest'));
  ({ default: app } = await import('../src/app.js'));
  ({ pool } = await import('../src/config/database.js'));
  const { rows } = await pool.query(
    "SELECT l.id FROM lecciones l JOIN unidades u ON u.id = l.unidad_id WHERE u.idioma = 'quechua' ORDER BY u.orden, l.orden LIMIT 1"
  );
  lessonId = rows[0]?.id;
});

after(async () => {
  if (pool) await pool.end();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

test('salud y rutas inexistentes', { skip }, async () => {
  await request(app).get('/health').expect(200);
  const res = await request(app).get('/api/no-existe').expect(404);
  assert.match(res.body.message, /No se encontró la ruta/);
});

test('el contenido está cargado (lecciones, vocabulario)', { skip }, async () => {
  const res = await request(app).get('/api/lessons/units?idioma=quechua').expect(200);
  assert.ok(res.body.units.length > 0);
  assert.ok(lessonId, 'hay al menos una lección de quechua');
});

test('registro, login y perfil (con consentimiento sin responder)', { skip }, async () => {
  await request(app).post('/api/auth/register').send({ ...user, email: 'no-es-correo' }).expect(400);
  await request(app).post('/api/auth/register').send(user).expect((r) => assert.ok([200, 201].includes(r.status), r.text));
  const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password }).expect(200);
  token = login.body.token;
  assert.ok(token);
  const profile = await request(app).get('/api/auth/profile').set(auth()).expect(200);
  assert.equal(profile.body.user.consentimiento_datos, null);
  await request(app).get('/api/auth/profile').expect(401);
});

test('guardar progreso: puntos, racha diaria e insignia de primera lección', { skip }, async () => {
  await request(app).post('/api/progress/save').set(auth()).send({ leccionId: lessonId, porcentajeAciertos: 150 }).expect(400);
  const first = await request(app).post('/api/progress/save').set(auth()).send({ leccionId: lessonId, porcentajeAciertos: 90 }).expect(200);
  assert.equal(first.body.puntos, 90);
  assert.equal(first.body.racha, 1);
  const second = await request(app).post('/api/progress/save').set(auth()).send({ leccionId: lessonId, porcentajeAciertos: 50 }).expect(200);
  assert.equal(second.body.racha, 1, 'la racha no sube dos veces el mismo día');
  const progress = await request(app).get('/api/progress').set(auth()).expect(200);
  const row = progress.body.progress.find((p) => p.leccion_id === lessonId);
  assert.equal(row.porcentaje_aciertos, 90, 'se conserva el mejor resultado');
  assert.equal(row.completado, true);
});

test('eventos: sin consentimiento no se guarda nada; con consentimiento se guardan y se exportan', { skip }, async () => {
  const event = { tipo: 'exercise_answered', idioma: 'quechua', leccion_id: lessonId, resultado: 'variante', respuesta: 'allin punchay', esperado: "allin p'unchay", ocurrido_en: new Date().toISOString() };
  const without = await request(app).post('/api/research/events').set(auth()).send({ events: [event] }).expect(200);
  assert.equal(without.body.guardados, 0);

  await request(app).put('/api/research/consent').set(auth()).send({ consiente: true }).expect(200);
  const saved = await request(app).post('/api/research/events').set(auth()).send({ events: [event, { tipo: 'tipo_inventado' }] }).expect(200);
  assert.equal(saved.body.guardados, 1, 'los tipos desconocidos se descartan');

  const json = await request(app).get('/api/research/export/me?format=json').set(auth()).expect(200);
  assert.equal(json.body.total, 1);
  assert.equal(json.body.eventos[0].resultado, 'variante');
  assert.ok(!('usuario_id' in json.body.eventos[0]), 'la exportación no lleva el id interno');
  assert.equal(json.body.eventos[0].participante.length, 16);

  const csv = await request(app).get('/api/research/export/me?format=csv').set(auth()).expect(200);
  assert.match(csv.headers['content-type'], /text\/csv/);
  assert.match(csv.text, /participante,sesion,tipo/);

  await request(app).get('/api/research/export').set(auth()).expect(403); // solo administradores

  const deleted = await request(app).delete('/api/research/events/me').set(auth()).expect(200);
  assert.equal(deleted.body.borrados, 1);
});

test('modo aula: crear, unirse sin correo, volver a entrar con el código y ver el avance', { skip }, async () => {
  const created = await request(app).post('/api/classroom').set(auth()).send({ nombre: 'Quechua I', idioma: 'quechua' }).expect(201);
  const { codigo, id } = created.body.aula;
  assert.match(codigo, /^[A-Z2-9]{6}$/);

  await request(app).post('/api/classroom/join').send({ codigo: 'NOEXIS', alias: 'Ana' }).expect(404);
  const joined = await request(app).post('/api/classroom/join').send({ codigo: codigo.toLowerCase(), alias: 'Ana' }).expect(201);
  assert.match(joined.body.codigoEstudiante, /^[A-Z2-9]{6}-[A-Z2-9]{4}$/);
  assert.equal(joined.body.user.es_cuenta_aula, true);

  const profile = await request(app).get('/api/auth/profile').set({ Authorization: `Bearer ${joined.body.token}` }).expect(200);
  assert.equal(profile.body.user.email, null, 'la cuenta de aula no expone el correo interno');

  await request(app).post('/api/classroom/login').send({ codigoEstudiante: 'AAAAAA-BBBB' }).expect(401);
  await request(app).post('/api/classroom/login').send({ codigoEstudiante: joined.body.codigoEstudiante }).expect(200);

  // La cuenta de estudiante no puede crear aulas
  await request(app).post('/api/classroom').set({ Authorization: `Bearer ${joined.body.token}` }).send({ nombre: 'X', idioma: 'quechua' }).expect(403);

  const progress = await request(app).get(`/api/classroom/${id}/progress`).set(auth()).expect(200);
  assert.deepEqual(progress.body.estudiantes.map((s) => s.alias), ['Ana']);
  await request(app).get(`/api/classroom/${id}/progress`).set({ Authorization: `Bearer ${joined.body.token}` }).expect(404);
});

test('Google con un correo ya registrado: se vincula a esa cuenta (no se crea otra ni falla)', { skip }, async () => {
  const email = `google${unique}@ejemplo.test`;
  await request(app).post('/api/auth/register').send({ nombre: 'Con clave', email, password: 'clave-segura-123' }).expect(201);
  // Mismo correo con otra capitalización: debe avisar, no fallar
  const again = await request(app).post('/api/auth/register').send({ nombre: 'Otra vez', email: email.toUpperCase(), password: 'clave-segura-123' });
  assert.equal(again.status, 409);
  assert.match(again.body.message, /ya tiene una cuenta/);

  const { findOrLinkUser } = await import('../src/config/passport.js');
  const profile = { id: `g-${unique}`, displayName: 'Persona Google', emails: [{ value: email.toUpperCase() }], photos: [] };
  const linked = await findOrLinkUser('google', profile);
  const { rows } = await pool.query('SELECT id, google_id FROM usuarios WHERE LOWER(email) = $1', [email]);
  assert.equal(rows.length, 1);
  assert.equal(linked.id, rows[0].id);
  assert.equal(rows[0].google_id, profile.id);
  // La segunda vez se encuentra por el id de Google
  const again2 = await findOrLinkUser('google', profile);
  assert.equal(again2.id, linked.id);
});

test('audio: las grabaciones quedan registradas como tales y la cobertura las cuenta aparte', { skip }, async () => {
  const before = await pool.query("SELECT id, audio_url FROM vocabulario WHERE audio_url LIKE '%allillanchu%' ORDER BY id");
  assert.ok(before.rows.length > 0, 'las grabaciones están en el contenido');
  await pool.query(
    `INSERT INTO audios (idioma, clave, texto, url, fuente) VALUES ('quechua', 'allillanchu', 'Allillanchu', $1, 'grabado') ON CONFLICT DO NOTHING`,
    [before.rows[0].audio_url]
  );
  const index = await request(app).get('/api/validation/audios/quechua').expect(200);
  assert.deepEqual(index.body.audios.allillanchu, [before.rows[0].audio_url, 'grabado']);
  await request(app).get('/api/validation/audios/klingon').expect(400);

  const coverage = await request(app).get('/api/validation/cobertura').expect(200);
  assert.ok(coverage.body.idiomas.quechua.audio.grabado >= before.rows.length);
  assert.ok(coverage.body.idiomas.quechua.fenomenos.glotalizada > 0);
  assert.ok(coverage.body.definicion.entrada_unica);
});

test('evaluación perceptual: código, consentimiento, puntaje y resultados', { skip }, async () => {
  const fake = await pool.query(
    "INSERT INTO audios (idioma, clave, texto, url, fuente, modelo) VALUES ('quechua', $1, 'prueba', 'https://ejemplo.test/a.mp3', 'mms', 'facebook/mms-tts-quz') RETURNING id",
    [`prueba-${unique}`]
  );
  const audioId = fake.rows[0].id;
  await pool.query("INSERT INTO muestra_evaluacion (idioma, audio_id) VALUES ('quechua', $1)", [audioId]);
  const adminAccount = { nombre: 'Admin', email: `admin${unique}@ejemplo.test`, password: 'clave-segura-123' };
  await request(app).post('/api/auth/register').send(adminAccount).expect(201);
  const { body: { token: adminToken } } = await request(app).post('/api/auth/login').send({ email: adminAccount.email, password: adminAccount.password }).expect(200);
  const asAdmin = { Authorization: `Bearer ${adminToken}` };

  await request(app).post('/api/validation/evaluadores').set(auth()).send({ idioma: 'quechua', cantidad: 1 }).expect(403);
  const created = await request(app).post('/api/validation/evaluadores').set(asAdmin).send({ idioma: 'quechua', cantidad: 2 }).expect(201);
  const [codigo, otro] = created.body.codigos;

  await request(app).post('/api/validation/evaluacion/entrar').send({ codigo: 'NOEXISTE' }).expect(404);
  const first = await request(app).post('/api/validation/evaluacion/entrar').send({ codigo }).expect(200);
  assert.equal(first.body.necesitaConsentimiento, true);
  await request(app).post('/api/validation/evaluacion/responder').send({ codigo, audioId, puntaje: 4 }).expect(403);
  const inside = await request(app).post('/api/validation/evaluacion/entrar').send({ codigo, consiente: true }).expect(200);
  assert.ok(inside.body.items.some((i) => i.id === audioId));
  await request(app).post('/api/validation/evaluacion/responder').send({ codigo, audioId, puntaje: 9 }).expect(400);
  await request(app).post('/api/validation/evaluacion/responder').send({ codigo, audioId, puntaje: 4 }).expect(200);
  await request(app).post('/api/validation/evaluacion/entrar').send({ codigo: otro, consiente: true }).expect(200);
  await request(app).post('/api/validation/evaluacion/responder').send({ codigo: otro, audioId, puntaje: 2 }).expect(200);

  const results = await request(app).get('/api/validation/resultados?idioma=quechua').set(asAdmin).expect(200);
  assert.equal(results.body.juicios, 2);
  assert.equal(results.body.suficiente, false);
  const csv = await request(app).get('/api/validation/resultados?idioma=quechua&format=csv').set(asAdmin).expect(200);
  assert.match(csv.text, /evaluador,audio_id,texto,puntaje/);

  await pool.query('DELETE FROM audios WHERE id = $1', [audioId]);
  await pool.query('DELETE FROM evaluadores WHERE codigo = ANY($1)', [[codigo, otro]]);
});

test('revisión del léxico: registra el valor original y una corrección conserva la grabación', { skip }, async () => {
  const adminAccount = { email: `admin${unique}@ejemplo.test`, password: 'clave-segura-123' };
  const { body: { token: adminToken } } = await request(app).post('/api/auth/login').send(adminAccount).expect(200);
  const asAdmin = { Authorization: `Bearer ${adminToken}` };
  const { rows: [word] } = await pool.query("SELECT id, palabra_objetivo, audio_url FROM vocabulario WHERE audio_url LIKE '%allillanchu%' LIMIT 1");

  await request(app).put(`/api/validation/lexico/${word.id}`).set(asAdmin).send({ estado: 'error' }).expect(400);
  await request(app).put(`/api/validation/lexico/${word.id}`).set(asAdmin).send({ estado: 'error', correccion: 'Allillanchu?' }).expect(200);
  const after = await pool.query('SELECT palabra_objetivo, audio_url FROM vocabulario WHERE id = $1', [word.id]);
  assert.equal(after.rows[0].palabra_objetivo, 'Allillanchu?');
  assert.equal(after.rows[0].audio_url, word.audio_url, 'la grabación no se borra');
  const review = await pool.query('SELECT valor_original FROM revision_lexico WHERE vocabulario_id = $1', [word.id]);
  assert.equal(review.rows[0].valor_original, word.palabra_objetivo);

  await pool.query('UPDATE vocabulario SET palabra_objetivo = $1 WHERE id = $2', [word.palabra_objetivo, word.id]);
  await pool.query('DELETE FROM revision_lexico WHERE vocabulario_id = $1', [word.id]);
});
