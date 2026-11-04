// Calibra el calificador de "¡Dilo tú!" (src/utils/grader.js) con audios reales de la app, en línea.
// Toma las palabras que existen en quechua y en aimara: cada una la dicen dos voces distintas
// (la del modelo quz y la del modelo ayr transformada). Además simula otras voces cambiando tono y formantes.
// Uso: node scripts/calibrar-calificador.mjs [carpeta-de-caché]
// Descarga los audios en WAV desde Cloudinary (la primera vez tarda: Cloudinary los convierte).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyze, grade, WARPS } from '../src/utils/grader.js';

const API = process.env.API_URL || 'https://simiaru.onrender.com';
const dir = process.argv[2] || path.join(os.tmpdir(), 'simiaru-calificador');
fs.mkdirSync(dir, { recursive: true });

const index = async (idioma) => (await (await fetch(`${API}/api/validation/audios/${idioma}?voz=mujer`)).json()).audios;
const [q, a] = await Promise.all([index('quechua'), index('aymara')]);
const shared = Object.keys(q).filter((k) => a[k] && !k.includes(' '));

const download = async (url, file) => {
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) return file;
  const res = await fetch(url.replace(/\.(mp3|ogg)$/, '.wav'));
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
};

const readWav = (file) => {
  const b = fs.readFileSync(file);
  let p = 12;
  let fmt;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { channels: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22), format: b.readUInt16LE(p + 8) };
    if (id === 'data') {
      const bytes = fmt.bits / 8;
      const n = Math.floor(Math.min(size, b.length - p - 8) / bytes / fmt.channels);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const o = p + 8 + i * bytes * fmt.channels;
        out[i] = fmt.format === 3 ? b.readFloatLE(o) : fmt.bits === 16 ? b.readInt16LE(o) / 32768 : b.readInt32LE(o) / 2147483648;
      }
      return { samples: out, rate: fmt.rate };
    }
    p += 8 + size + (size % 2);
  }
  throw new Error(`WAV sin datos: ${file}`);
};

// Re-muestrear a 48 kHz (como un micrófono); factor > 1 sube tono y formantes a la vez
const to48k = (s, rate, factor = 1) => {
  const step = (rate * factor) / 48000;
  return Float32Array.from({ length: Math.floor(s.length / step) }, (_, i) => s[Math.min(s.length - 1, Math.floor(i * step))]);
};
const noisy = (s, level) => s.map((v) => v + (Math.random() * 2 - 1) * level);

const words = [];
const A = {};
for (const w of shared) {
  try {
    const safe = w.replace(/[^a-z]/g, '_');
    const qs = readWav(await download(q[w][0], path.join(dir, `q_${safe}.wav`)));
    const as = readWav(await download(a[w][0], path.join(dir, `a_${safe}.wav`)));
    A[w] = {
      model: analyze(qs.samples, qs.rate),
      'otra voz (aimara)': analyze(noisy(to48k(as.samples, as.rate), 0.01), 48000, WARPS),
      'misma voz': analyze(noisy(to48k(qs.samples, qs.rate), 0.01), 48000, WARPS),
      'tono +15 %': analyze(noisy(to48k(qs.samples, qs.rate, 1.15), 0.01), 48000, WARPS),
      'tono −13 %': analyze(noisy(to48k(qs.samples, qs.rate, 0.87), 0.01), 48000, WARPS),
    };
    words.push(w);
    process.stdout.write('.');
  } catch (error) {
    console.warn(`\n${w}: ${error.message}`);
  }
}
console.log(`\n${words.length} palabras compartidas\n`);

const pick = (list, n, not) => list.filter((x) => !not.includes(x)).sort(() => Math.random() - 0.5).slice(0, n);
const REPS = 10;
console.log('| Voz de quien aprende | Dicha bien: aprueba | Otra palabra de la lista: aprueba | Otra palabra cualquiera: aprueba |');
console.log('|---|---|---|---|');
for (const variant of Object.keys(A[words[0]]).filter((k) => k !== 'model')) {
  let ok = 0;
  let inList = 0;
  let outside = 0;
  let n = 0;
  for (let r = 0; r < REPS; r++) {
    for (const w of words) {
      const cohortWords = pick(words, 5, [w]);
      const cohort = cohortWords.map((o) => ({ text: o, analysis: A[o].model }));
      n++;
      if (grade(A[w].model, A[w][variant], cohort).passed) ok++;
      if (grade(A[w].model, A[cohortWords[0]][variant], cohort).passed) inList++;
      if (grade(A[w].model, A[pick(words, 1, [w, ...cohortWords])[0]][variant], cohort).passed) outside++;
    }
  }
  const pct = (x) => `${Math.round((100 * x) / n)} %`;
  console.log(`| ${variant} | ${pct(ok)} | ${pct(inList)} | ${pct(outside)} |`);
}
