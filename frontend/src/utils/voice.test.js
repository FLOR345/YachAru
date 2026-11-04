import { describe, it, expect } from 'vitest';
import { analyze, grade, countSyllables, voicedRange, stars, PASS, WARPS } from './grader';
import { peaks } from './voice';
import { parteDePalabra } from '../data/cuerpoNumeros';
import { tilesOf } from '../components/games/WordGames';

// "Palabras" sintéticas: sílabas como vocales (tono con dos formantes) separadas por un silencio breve.
// Vocales aproximadas por sus formantes F1/F2 (Hz).
const VOWELS = { a: [750, 1250], i: [300, 2300], u: [320, 800], e: [500, 1900], o: [480, 900] };
const RATE = 16000;
const synth = (sylls, { f0 = 200, formant = 1, speed = 1, amp = 0.5, noise = 0.002 } = {}) => {
  const out = [];
  const push = (n, fn) => {
    for (let i = 0; i < n; i++) out.push(fn(i));
  };
  push(RATE * 0.15, () => 0);
  for (const v of sylls) {
    const [f1, f2] = VOWELS[v].map((f) => f * formant);
    const n = Math.round((RATE * 0.18) / speed);
    push(n, (i) => {
      const t = i / RATE;
      const env = Math.sin((Math.PI * i) / n);
      let s = 0;
      // armónicos de f0 ponderados por su cercanía a los formantes
      for (let h = 1; h * f0 < 5000; h++) {
        const f = h * f0;
        const w = Math.exp(-(((f - f1) / 120) ** 2)) + 0.7 * Math.exp(-(((f - f2) / 160) ** 2)) + 0.02;
        s += w * Math.sin(2 * Math.PI * f * t);
      }
      return amp * env * s * 0.4;
    });
    push(Math.round((RATE * 0.05) / speed), () => 0);
  }
  push(RATE * 0.15, () => 0);
  return Float32Array.from(out, (v) => Math.max(-1, Math.min(1, v + (Math.random() * 2 - 1) * noise)));
};

const model = (sylls) => analyze(synth(sylls), RATE);
const learner = (sylls, opts) => analyze(synth(sylls, opts), RATE, WARPS);

describe('calificador de "¡Dilo tú!"', () => {
  const target = ['a', 'i', 'u'];
  const others = [
    ['u', 'a', 'i'],
    ['e', 'o', 'e'],
    ['i', 'i', 'a'],
    ['o', 'u', 'o'],
  ];
  const cohort = others.map((w) => ({ text: w.join(''), analysis: model(w) }));

  it('aprueba la palabra pedida dicha con otra voz (otro tono y otros formantes)', () => {
    for (const opts of [{}, { f0: 120, formant: 0.88 }, { f0: 260, formant: 1.12 }, { amp: 0.15 }]) {
      const r = grade(model(target), learner(target, opts), cohort);
      expect(r.passed).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(PASS);
      expect(r.criteria.map((c) => c.id)).toEqual(['sonidos', 'ritmo', 'duracion', 'silabas']);
    }
  });

  it('no aprueba otra palabra, aunque tenga el mismo ritmo, y dice con cuál se confundió', () => {
    for (const said of others) {
      const r = grade(model(target), learner(said), cohort);
      expect(r.passed).toBe(false);
      expect(r.score).toBeLessThan(PASS);
    }
    const r = grade(model(target), learner(others[0]), cohort);
    expect(r.confusedWith).toBe('uai');
  });

  it('sin voz no hay nota', () => {
    const quiet = analyze(new Float32Array(RATE).map(() => (Math.random() * 2 - 1) * 0.001), RATE, WARPS);
    const r = grade(model(target), quiet, cohort);
    expect(r.score).toBeNull();
    expect(r.issue).toBe('silencio');
    expect(stars(null)).toBe(0);
  });

  it('avisa si se dijo demasiado rápido o si la voz se saturó', () => {
    expect(grade(model(target), learner(target, { speed: 2.2 }), cohort).tip).toMatch(/rápido/);
    expect(grade(model(target), learner(target, { amp: 4 }), cohort).tip).toMatch(/saturó/);
  });

  it('cuenta sílabas y encuentra el tramo con voz', () => {
    const a = model(['a', 'i', 'u']);
    const range = voicedRange(a.env);
    expect(countSyllables(a.env.slice(...range))).toBe(3);
    expect(countSyllables(model(['a']).env)).toBe(1);
    expect(voicedRange([0, 0, 0])).toBeNull();
  });

  it('las estrellas siguen a la nota', () => {
    expect(stars(95)).toBe(3);
    expect(stars(PASS)).toBe(2);
    expect(stars(45)).toBe(1);
    expect(stars(10)).toBe(0);
  });

  it('las barras de la onda nunca quedan vacías', () => {
    const bars = peaks([0, 0, 1, 0.5], 4);
    expect(bars).toHaveLength(4);
    expect(Math.min(...bars)).toBeGreaterThan(0);
  });
});

describe('el cuerpo en las lecciones y el diccionario', () => {
  it('reconoce partes por el significado, con artículos, sinónimos y varios sentidos', () => {
    expect(parteDePalabra('Uma', 'Cabeza', 'quechua')?.id).toBe('cabeza');
    expect(parteDePalabra('Jinchu', 'Oreja, oído', 'aymara')?.id).toBe('oreja');
    expect(parteDePalabra('x', 'el pelo', 'quechua')?.id).toBe('cabello');
    expect(parteDePalabra('x', 'Estómago', 'quechua')?.id).toBe('barriga');
    expect(parteDePalabra('x', 'Corazón', 'aymara')?.id).toBe('corazon');
  });

  it('reconoce partes por la palabra en la lengua, con cualquier apóstrofo', () => {
    expect(parteDePalabra('P’iqi', 'algo', 'aymara')?.id).toBe('cabeza');
    expect(parteDePalabra("Ruk'ana", '', 'quechua')?.id).toBe('dedo');
  });

  it('no inventa partes ni las busca en lenguas sin modelo del cuerpo', () => {
    expect(parteDePalabra('Wasi', 'Casa', 'quechua')).toBeNull();
    expect(parteDePalabra('x', 'Espalda', 'awajun')).toBeNull();
    // "pecho" solo está en quechua
    expect(parteDePalabra('x', 'Pecho', 'aymara')).toBeNull();
  });
});

describe('arma la palabra', () => {
  it('el apóstrofo va pegado a su consonante y los espacios no son fichas', () => {
    expect(tilesOf("Ch'aki")).toEqual(['c', "h'", 'a', 'k', 'i']);
    expect(tilesOf('p’unchay')).toEqual(["p'", 'u', 'n', 'c', 'h', 'a', 'y']);
    expect(tilesOf('Allin p')).toEqual(['a', 'l', 'l', 'i', 'n', 'p']);
  });
});
