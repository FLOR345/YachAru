// Calificador de pronunciación de "¡Dilo tú!".
// Compara tu grabación con la voz de la app con la técnica clásica de reconocimiento de palabras aisladas:
// rasgos espectrales por tramo (bandas en escala mel, normalizadas para quitar la diferencia de voz
// y de micrófono) alineados con DTW. No es reconocimiento de voz: no adivina qué dijiste, mide cuánto
// se parece a la palabra modelo. Por eso es orientativo, y así se le dice a quien aprende.
// Funciona igual en el navegador y en Node (las pruebas lo calibran con audios reales de la app).

export const HOP_MS = 20;
const WIN_MS = 32;
const BANDS = 26;
const CEPS = 13; // coeficientes MFCC (sin el 0, que es el volumen)
const F_MIN = 90;
const F_MAX = 5500;
const VOICE = 0.1; // fracción del máximo de energía que cuenta como voz

// Nota mínima para aprobar (0-100)
export const PASS = 50;

const nextPow2 = (n) => 2 ** Math.ceil(Math.log2(n));
const mel = (f) => 2595 * Math.log10(1 + f / 700);
const unmel = (m) => 700 * (10 ** (m / 2595) - 1);

// FFT radix-2 en el lugar
const fft = (re, im) => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
};

/**
 * Analiza un audio: energía por tramo (env, 0..1), bandas espectrales (spec), pico real y saturación.
 * samples: Float32Array mono en -1..1; rate: muestras por segundo.
 */
// Factores de "largo del tracto vocal": la voz de un niño, de una mujer o de un hombre desplaza los formantes.
// Al analizar a quien aprende se prueban varios y se queda el que más se acerca al modelo (VTLN).
export const WARPS = [0.8, 0.88, 0.95, 1, 1.06, 1.13, 1.22];

/**
 * Analiza un audio: energía por tramo (env, 0..1), rasgos MFCC (spec), pico real y saturación.
 * samples: Float32Array mono en -1..1; rate: muestras por segundo.
 * warps: si se da, agrega spec para cada factor de tracto vocal (se usa con la voz de quien aprende).
 */
export const analyze = (samples, rate, warps = null) => {
  const base = analyzeOnce(samples, rate, 1);
  if (warps) base.warps = warps.map((w) => (w === 1 ? base.spec : analyzeOnce(samples, rate, w).spec));
  return base;
};

const analyzeOnce = (samples, rate, warp) => {
  const hop = Math.max(1, Math.round((rate * HOP_MS) / 1000));
  const win = Math.round((rate * WIN_MS) / 1000);
  const size = nextPow2(win);
  const window = Float32Array.from({ length: win }, (_, i) => 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (win - 1)));
  const edges = Array.from({ length: BANDS + 2 }, (_, i) => warp * unmel(mel(F_MIN) + ((mel(F_MAX) - mel(F_MIN)) * i) / (BANDS + 1)));
  const bin = (f) => Math.min(size / 2, Math.max(1, Math.round((f * size) / rate)));
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const rms = [];
  const spec = [];
  let clipped = 0;
  for (const v of samples) if (Math.abs(v) >= 0.985) clipped++;
  for (let start = 0; start + 1 < samples.length; start += hop) {
    re.fill(0);
    im.fill(0);
    let sum = 0;
    let count = 0;
    for (let i = 0; i < win && start + i < samples.length; i++) {
      const v = samples[start + i];
      sum += v * v;
      count++;
      re[i] = v * window[i];
    }
    rms.push(Math.sqrt(sum / Math.max(1, count)));
    fft(re, im);
    const bands = new Float32Array(BANDS);
    for (let b = 0; b < BANDS; b++) {
      // filtro triangular entre edges[b] y edges[b + 2]
      const lo = bin(edges[b]);
      const mid = bin(edges[b + 1]);
      const hi = bin(edges[b + 2]);
      let e = 0;
      for (let k = lo; k <= hi; k++) {
        const w = k <= mid ? (k - lo + 1) / (mid - lo + 1) : (hi - k + 1) / (hi - mid + 1);
        e += w * (re[k] * re[k] + im[k] * im[k]);
      }
      bands[b] = Math.log(e + 1e-10);
    }
    // MFCC: transformada coseno de las bandas logarítmicas
    const ceps = new Float32Array(CEPS - 1);
    for (let c = 1; c < CEPS; c++) {
      let v = 0;
      for (let k = 0; k < BANDS; k++) v += bands[k] * Math.cos((Math.PI * c * (k + 0.5)) / BANDS);
      ceps[c - 1] = v;
    }
    spec.push(ceps);
  }
  const peak = Math.max(...rms, 1e-9);
  return { env: rms.map((v) => v / peak), spec, peak, clipped: clipped / Math.max(1, samples.length), rate };
};

// Tramos con voz (del primero al último por encima del umbral)
export const voicedRange = (env, threshold = VOICE) => {
  const first = env.findIndex((v) => v >= threshold);
  if (first < 0) return null;
  let last = env.length - 1;
  while (last > first && env[last] < threshold) last--;
  return [first, last + 1];
};

// CMVN: a cada coeficiente se le quita su media y se divide por su desviación (quita voz y micrófono).
// Se agregan las deltas (cómo cambia cada coeficiente), que distinguen mejor las consonantes.
const normalizeSpec = (frames) => {
  const n = frames.length;
  const d = frames[0]?.length ?? 0;
  const mean = new Float32Array(d);
  const sd = new Float32Array(d);
  for (const f of frames) for (let b = 0; b < d; b++) mean[b] += f[b] / n;
  for (const f of frames) for (let b = 0; b < d; b++) sd[b] += (f[b] - mean[b]) ** 2 / n;
  for (let b = 0; b < d; b++) sd[b] = Math.sqrt(sd[b]) || 1;
  const z = frames.map((f) => Float32Array.from(f, (v, b) => (v - mean[b]) / sd[b]));
  return z.map((f, i) => {
    const prev = z[Math.max(0, i - 1)];
    const next = z[Math.min(n - 1, i + 1)];
    const out = new Float32Array(2 * d);
    for (let b = 0; b < d; b++) {
      out[b] = f[b];
      out[d + b] = 0.5 * (next[b] - prev[b]);
    }
    return out;
  });
};

// Distancia DTW media entre dos series, con la función de costo dada.
// band limita cuánto puede estirarse una serie respecto de la otra (fracción de la más larga).
const dtw = (a, b, cost, band = 1) => {
  const n = a.length;
  const m = b.length;
  const w = Math.max(Math.abs(n - m) + 1, Math.ceil(band * Math.max(n, m)));
  let prev = new Float64Array(m + 1).fill(Infinity);
  prev[0] = 0;
  for (let i = 1; i <= n; i++) {
    const row = new Float64Array(m + 1).fill(Infinity);
    const center = Math.round((i * m) / n);
    for (let j = Math.max(1, center - w); j <= Math.min(m, center + w); j++) row[j] = cost(a[i - 1], b[j - 1]) + Math.min(prev[j], row[j - 1], prev[j - 1]);
    prev = row;
  }
  return prev[m] / (n + m);
};

const euclid = (x, y) => {
  let s = 0;
  for (let b = 0; b < x.length; b++) s += (x[b] - y[b]) ** 2;
  return Math.sqrt(s / x.length);
};

// Reduce la serie a n puntos (promedio por tramo)
export const resample = (values, n) => {
  if (values.length === 0) return Array(n).fill(0);
  return Array.from({ length: n }, (_, i) => {
    const a = Math.floor((i * values.length) / n);
    const b = Math.max(a + 1, Math.floor(((i + 1) * values.length) / n));
    let sum = 0;
    for (let j = a; j < b; j++) sum += values[j];
    return sum / (b - a);
  });
};

// Sílabas aproximadas: picos de energía separados por un valle claro
export const countSyllables = (env) => {
  const smooth = env.map((_, i) => (env[i - 1] ?? env[i]) * 0.25 + env[i] * 0.5 + (env[i + 1] ?? env[i]) * 0.25);
  let count = 0;
  let rising = true;
  let low = 1;
  let high = 0;
  for (const v of smooth) {
    if (rising) {
      high = Math.max(high, v);
      if (high > 0.3 && v < high - 0.15) {
        count++;
        rising = false;
        low = v;
      }
    } else {
      low = Math.min(low, v);
      if (v > low + 0.15) {
        rising = true;
        high = v;
      }
    }
  }
  if (rising && high > 0.3) count++;
  return count;
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const linear = (x, bad, good) => clamp01((x - bad) / (good - bad));

// Umbrales calibrados con audios reales de la app (ver docs/calificador-de-voz.md).
// Distancia absoluta: misma palabra con otra voz ≈ 0,2; palabras distintas ≈ 0,55.
const ABS_GOOD = 0.35;
const ABS_BAD = 0.62;
const ABS_PASS = 0.5;
// Con palabras de comparación: la pedida debe quedar más cerca que todas, por este margen relativo.
export const MARGIN = 0;

// Distancia de sonidos entre el modelo y la grabación (se prueba cada factor de tracto vocal)
export const soundDistance = (model, user) => {
  const mr = voicedRange(model.env);
  const ur = voicedRange(user.env);
  if (!mr || !ur) return Infinity;
  const mSpec = normalizeSpec(model.spec.slice(...mr));
  const uSpecs = (user.warps ?? [user.spec]).map((spec) => normalizeSpec(spec.slice(...ur)));
  return Math.min(...uSpecs.map((uSpec) => dtw(mSpec, uSpec, euclid, 0.25)));
};

const silent = { score: null, passed: false, issue: 'silencio', tip: 'No escuchamos tu voz. Revisa el micrófono y habla más cerca.' };

/**
 * Califica la grabación (user) contra la voz modelo (model), ambas salidas de analyze().
 * cohort: modelos de otras palabras ([{ text, analysis }]). Si hay al menos dos, la palabra pedida
 * tiene que parecerse más a tu grabación que cualquiera de ellas: así no aprueba cualquier sonido.
 * Devuelve { score 0-100, passed, criteria: [{ id, label, score }], tip, confusedWith } o, sin voz,
 * { score: null, passed: false, issue, tip }.
 */
export const grade = (model, user, cohort = []) => {
  if (!user || user.peak < 0.004) return silent;
  const mr = voicedRange(model?.env ?? []);
  const ur = voicedRange(user.env);
  if (!ur || ur[1] - ur[0] < 4) return silent;
  if (!mr) return { score: null, passed: false, issue: 'modelo', tip: 'No pudimos leer la voz de la app para comparar.' };

  const mEnv = model.env.slice(...mr);
  const uEnv = user.env.slice(...ur);

  // 1. Sonidos
  const soundDist = soundDistance(model, user);
  const others = cohort.filter((c) => c?.analysis).map((c) => ({ text: c.text, d: soundDistance(c.analysis, user) }));
  let sounds;
  let soundsPass;
  let margin = null;
  let confusedWith = null;
  if (others.length >= 2) {
    const nearest = others.reduce((x, y) => (y.d < x.d ? y : x));
    margin = (nearest.d - soundDist) / nearest.d;
    sounds = linear(margin, -0.12, 0.06);
    soundsPass = margin >= MARGIN;
    if (margin < 0) confusedWith = nearest.text;
  } else {
    sounds = linear(soundDist, ABS_BAD, ABS_GOOD);
    soundsPass = soundDist <= ABS_PASS;
  }
  // 2. Ritmo: forma de la energía en el tiempo
  const rhythmDist = dtw(resample(mEnv, 40), resample(uEnv, 40), (x, y) => Math.abs(x - y));
  const rhythm = linear(rhythmDist, 0.36, 0.09);
  // 3. Duración
  const ratio = uEnv.length / mEnv.length;
  const duration = linear(Math.min(ratio, 1 / ratio), 0.3, 0.7);
  // 4. Sílabas (aproximadas por los picos de energía)
  const ms = countSyllables(mEnv);
  const us = countSyllables(uEnv);
  const syllables = clamp01(1 - Math.abs(ms - us) / Math.max(2, ms));

  const criteria = [
    { id: 'sonidos', label: 'Sonidos', score: Math.round(sounds * 100) },
    { id: 'ritmo', label: 'Ritmo', score: Math.round(rhythm * 100) },
    { id: 'duracion', label: 'Duración', score: Math.round(duration * 100) },
    { id: 'silabas', label: 'Sílabas', score: Math.round(syllables * 100) },
  ];
  let score = Math.round(100 * (0.55 * sounds + 0.15 * rhythm + 0.15 * duration + 0.15 * syllables));
  // Si los sonidos no alcanzan, la nota no puede aprobar aunque el ritmo sea bueno;
  // si la palabra se reconoce (queda más cerca que las demás), aprueba aunque el ritmo sea distinto
  if (!soundsPass) score = Math.min(score, PASS - 1);
  else score = Math.max(score, PASS + 10);
  const passed = soundsPass && score >= PASS;

  // Consejo: el volumen primero; luego la confusión y el criterio más bajo
  let tip;
  const worst = [...criteria].sort((x, y) => x.score - y.score)[0];
  if (user.clipped > 0.01) tip = 'Tu voz se saturó: aléjate un poco del micrófono o habla más suave.';
  else if (user.peak < 0.03) tip = 'Te escuchamos muy bajo: habla un poco más fuerte o más cerca.';
  else if (confusedWith) tip = `Sonó más parecido a «${confusedWith}». Escucha despacio y fíjate en cada sonido.`;
  else if (passed && worst.score >= 70) tip = '¡Suena muy parecido! Sigue así.';
  else if (worst.id === 'duracion') tip = ratio < 1 ? 'Lo dijiste muy rápido: dilo más despacio, como el modelo.' : 'Lo dijiste muy lento: intenta decirlo de corrido.';
  else if (worst.id === 'silabas') tip = us < ms ? `Parece que te faltó una sílaba: el modelo tiene ${ms}.` : `Parece que dijiste sílabas de más: el modelo tiene ${ms}.`;
  else if (worst.id === 'ritmo') tip = 'Fíjate dónde sube y baja la voz del modelo y repite con ese ritmo.';
  else tip = 'Escucha despacio (la tortuga) y fíjate en cada sonido, sobre todo en las glotalizadas y aspiradas.';

  return { score, passed, criteria, tip, confusedWith, syllables: { model: ms, user: us }, raw: { soundDist, margin, rhythmDist, ratio } };
};

export const stars = (score) => (score == null ? 0 : score >= 78 ? 3 : score >= PASS ? 2 : score >= 30 ? 1 : 0);
