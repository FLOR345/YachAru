// Ejercicios que se generan para las lecciones nuevas (scripts/organize-units.js): sin base de datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeExercises } from '../scripts/organize-units.js';

const words = [
  ["P'iqi", 'Cabeza'], ['Nayra', 'Ojo'], ['Jinchu', 'Oreja, oído'], ['Nasa', 'Nariz'], ['Laka', 'Boca'],
  ['Laxra', 'Lengua'], ["Laka ch'akha", 'Diente'], ["K'achu", 'Diente'], ["K'ama", 'Muela'],
].map(([obj, es]) => ({ obj, es, audio: 'https://ejemplo/a.mp3' }));

test('cada lección nueva recibe ejercicios de varios tipos con sus propias palabras', () => {
  const ex = makeExercises(42, words, 'aymara');
  assert.ok(ex.length >= 8);
  assert.deepEqual([...new Set(ex.map((e) => e.tipo))].sort(), ['listen_write', 'matching', 'multiple_choice', 'translate', 'true_false']);
  const own = new Set(words.map((w) => w.obj));
  for (const e of ex.filter((x) => x.tipo === 'multiple_choice')) {
    assert.equal(e.opciones.length, 4);
    assert.ok(e.opciones.includes(e.respuesta));
    assert.equal(new Set(e.opciones).size, 4, 'sin opciones repetidas');
  }
  const match = ex.find((e) => e.tipo === 'matching');
  assert.ok(Object.keys(match.respuesta).every((k) => own.has(k)));
});

test('no hay dos respuestas correctas: los sinónimos ("Diente") entran una sola vez', () => {
  const ex = makeExercises(7, words, 'aymara');
  const asks = ex.filter((e) => e.tipo === 'multiple_choice' && e.pregunta.startsWith('¿Qué significa'));
  for (const e of asks) assert.equal(e.opciones.filter((o) => o === 'Diente').length <= 1, true);
});

test('es reproducible y no genera nada con menos de 4 palabras', () => {
  assert.deepEqual(makeExercises(5, words, 'quechua'), makeExercises(5, words, 'quechua'));
  assert.deepEqual(makeExercises(5, words.slice(0, 3), 'quechua'), []);
});
