import { describe, it, expect } from 'vitest';
import { envelope, trimSilence, resample, similarity, verdict, peaks } from './voice';
import { parteDePalabra } from '../data/cuerpoNumeros';
import { tilesOf } from '../components/games/WordGames';

// Una "palabra" sintética: tramos de tono con la amplitud dada, separados por silencio
const RATE = 8000;
const word = (syllables, { gap = 0.05, pad = 0.2 } = {}) => {
  const parts = [new Float32Array(RATE * pad)];
  for (const [seconds, amp] of syllables) {
    const n = Math.round(RATE * seconds);
    parts.push(Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * 220 * i) / RATE)));
    parts.push(new Float32Array(Math.round(RATE * gap)));
  }
  parts.push(new Float32Array(RATE * pad));
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

describe('comparar tu voz con la de la app', () => {
  it('la envolvente va de 0 a 1 y el silencio se recorta', () => {
    const env = envelope(word([[0.2, 0.8]]), RATE);
    expect(Math.max(...env)).toBeCloseTo(1, 5);
    expect(Math.min(...env)).toBe(0);
    const trimmed = trimSilence(env);
    expect(trimmed.length).toBeLessThan(env.length);
    expect(trimmed[0]).toBeGreaterThan(0.1);
    expect(trimSilence([0, 0, 0])).toEqual([]);
  });

  it('resample conserva el promedio por tramos', () => {
    expect(resample([1, 1, 0, 0], 2)).toEqual([1, 0]);
    expect(resample([], 3)).toEqual([0, 0, 0]);
  });

  it('la misma palabra dicha más fuerte se parece mucho; otro ritmo, menos', () => {
    const model = envelope(word([[0.15, 0.9], [0.3, 0.6], [0.1, 0.8]]), RATE);
    const same = envelope(word([[0.15, 0.4], [0.3, 0.27], [0.1, 0.36]]), RATE); // más bajo de volumen
    const slower = envelope(word([[0.3, 0.9], [0.6, 0.6], [0.2, 0.8]]), RATE);
    const other = envelope(word([[0.6, 0.9]]), RATE);
    const a = similarity(model, same);
    const b = similarity(model, slower);
    const c = similarity(model, other);
    expect(a).toBeGreaterThanOrEqual(90);
    expect(b).toBeLessThan(a);
    expect(c).toBeLessThan(a);
  });

  it('sin voz en la grabación no hay puntuación', () => {
    const model = envelope(word([[0.2, 0.8]]), RATE);
    expect(similarity(model, new Array(50).fill(0))).toBeNull();
    expect(verdict(null).stars).toBe(0);
  });

  it('las estrellas siguen al parecido', () => {
    expect(verdict(95).stars).toBe(3);
    expect(verdict(65).stars).toBe(2);
    expect(verdict(45).stars).toBe(1);
    expect(verdict(10).stars).toBe(0);
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
