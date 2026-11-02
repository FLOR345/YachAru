// Pruebas unitarias: no necesitan base de datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { nextStreak, levelForPoints } from '../src/utils/gamification.js';
import { validate, schemas } from '../src/middleware/validation.js';
import { toCsv, pseudonym, EXPORT_COLUMNS } from '../src/controllers/researchController.js';
import { phenomenaOf, audioKey, krippendorffAlpha } from '../src/utils/phonology.js';
import { pickSample, summarizeRatings } from '../src/controllers/validationController.js';

test('racha: el mismo día no sube, el día siguiente suma 1, más de un día la reinicia', () => {
  const day = (iso) => new Date(iso);
  assert.equal(nextStreak(4, day('2026-10-20T15:00:00Z'), day('2026-10-20T20:00:00Z')), 4);
  assert.equal(nextStreak(4, day('2026-10-20T15:00:00Z'), day('2026-10-21T15:00:00Z')), 5);
  assert.equal(nextStreak(4, day('2026-10-20T15:00:00Z'), day('2026-10-23T15:00:00Z')), 1);
  assert.equal(nextStreak(0, null), 1);
});

test('racha: usa la hora de Perú (UTC-5) para decidir el día', () => {
  // 23:00 del 20 en Lima (04:00 UTC del 21) y 08:00 del 21 en Lima: días seguidos, no el mismo día
  assert.equal(nextStreak(2, new Date('2026-10-21T04:00:00Z'), new Date('2026-10-21T13:00:00Z')), 3);
});

test('nivel según Ayni Points', () => {
  assert.equal(levelForPoints(0), 1);
  assert.equal(levelForPoints(299), 1);
  assert.equal(levelForPoints(300), 2);
  assert.equal(levelForPoints(1500), 4);
  assert.equal(levelForPoints(99999), 5);
});

const run = (schema, body) => {
  let status = 200;
  let payload = null;
  let nextCalled = false;
  const res = { status: (s) => ((status = s), res), json: (p) => ((payload = p), res) };
  validate(schema)({ body }, res, () => (nextCalled = true));
  return { status, payload, nextCalled };
};

test('validación: acepta datos correctos y rechaza los inválidos con 400', () => {
  assert.equal(run(schemas.login, { email: 'a@b.pe', password: 'x' }).nextCalled, true);
  const bad = run(schemas.login, { email: 'no-es-correo' });
  assert.equal(bad.status, 400);
  assert.deepEqual(bad.payload.errors, ['email no es un correo válido', 'Falta password']);
  assert.equal(run(schemas.saveProgress, { leccionId: 3, porcentajeAciertos: 140 }).status, 400);
  assert.equal(run(schemas.consent, { consiente: 'si' }).status, 400);
});

test('CSV: encabezado fijo y comillas escapadas', () => {
  const csv = toCsv([{ participante: 'p1', tipo: 'exercise_answered', respuesta: "allin p'unchay, \"mamay\"" }]);
  const [header, row] = csv.split('\n');
  assert.equal(header, EXPORT_COLUMNS.join(','));
  assert.match(row, /"allin p'unchay, ""mamay"""/);
});

test('seudónimo: estable, de 16 caracteres y distinto por persona', () => {
  process.env.RESEARCH_SALT = 'sal-de-prueba';
  assert.equal(pseudonym(7), pseudonym(7));
  assert.equal(pseudonym(7).length, 16);
  assert.notEqual(pseudonym(7), pseudonym(8));
});

test('fenómenos: criterio escrito para glotalizadas, aspiradas y uvulares', () => {
  assert.deepEqual(phenomenaOf("q'illu"), ['glotalizada', 'uvular']);
  assert.deepEqual(phenomenaOf('khipu'), ['aspirada']);
  assert.deepEqual(phenomenaOf('Ch’uytu'), ['glotalizada']);
  assert.deepEqual(phenomenaOf('sinqa'), ['uvular']);
  assert.deepEqual(phenomenaOf('maki'), []);
});

test('la clave del audio coincide con la del proceso en Python', () => {
  const vectors = JSON.parse(fs.readFileSync(new URL('../../tools/tts/audio_key_vectors.json', import.meta.url), 'utf8'));
  for (const [text, key] of vectors) assert.equal(audioKey(text), key);
});

test('alfa de Krippendorff: reproduce el ejemplo publicado por Krippendorff (2011)', () => {
  const A = [1, 2, 3, 3, 2, 1, 4, 1, 2, null, null, null];
  const B = [1, 2, 3, 3, 2, 2, 4, 1, 2, 5, null, 3];
  const C = [null, 3, 3, 3, 2, 3, 4, 2, 2, 5, 1, null];
  const D = [1, 2, 3, 3, 2, 4, 4, 1, 2, 5, 1, null];
  const units = A.map((_, i) => ({ A: A[i], B: B[i], C: C[i], D: D[i] }));
  assert.equal(krippendorffAlpha(units, 'interval').toFixed(3), '0.849');
  assert.equal(krippendorffAlpha(units, 'ordinal').toFixed(3), '0.815');
  assert.equal(krippendorffAlpha([{ A: 3, B: 3 }]), null, 'sin variación no se puede calcular');
});

test('muestra de evaluación: reproducible y reparte los fenómenos', () => {
  const entries = Array.from({ length: 40 }, (_, i) => ({ id: i, clave: `w${i}`, fenomenos: i < 10 ? ['glotalizada'] : i < 20 ? ['aspirada'] : [] }));
  const one = pickSample(entries, 12);
  assert.deepEqual(one, pickSample([...entries].reverse(), 12));
  assert.equal(one.filter((e) => e.fenomenos[0] === 'glotalizada').length, 4);
  assert.equal(one.filter((e) => e.fenomenos[0] === 'aspirada').length, 4);
});

test('resultados: con menos de 8 evaluadores se avisa que no alcanza para reportar', () => {
  const summary = summarizeRatings([
    { evaluador: 'A', audio_id: 1, puntaje: 5, fenomenos: ['glotalizada'] },
    { evaluador: 'B', audio_id: 1, puntaje: 3, fenomenos: ['glotalizada'] },
  ]);
  assert.equal(summary.suficiente, false);
  assert.equal(summary.media, 4);
  assert.equal(summary.por_fenomeno.glotalizada.juicios, 2);
});
