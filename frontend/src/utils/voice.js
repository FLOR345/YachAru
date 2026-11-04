// Grabar tu voz con el micrófono y compararla con la voz de la app.
// La grabación se queda en este dispositivo: no se sube ni se guarda en ningún servidor.
// La comparación mide el parecido de ritmo y duración (la "forma" del sonido en el tiempo).
// Es orientativa: no reconoce cada sonido ni dice si una glotalizada o una aspirada se dijo bien.

export const FRAME_MS = 20;
const SILENCE = 0.12; // fracción del máximo por debajo de la cual un tramo cuenta como silencio

export const canRecord = () =>
  typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined';

const audioContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  return new Ctx();
};

// Energía (RMS) de cada tramo de FRAME_MS, normalizada a 0..1
export const envelope = (samples, rate, frameMs = FRAME_MS) => {
  const size = Math.max(1, Math.round((rate * frameMs) / 1000));
  const out = [];
  for (let i = 0; i < samples.length; i += size) {
    let sum = 0;
    const end = Math.min(i + size, samples.length);
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    out.push(Math.sqrt(sum / (end - i)));
  }
  const max = Math.max(...out, 1e-9);
  return out.map((v) => v / max);
};

// Quita el silencio del principio y del final
export const trimSilence = (env, threshold = SILENCE) => {
  const first = env.findIndex((v) => v >= threshold);
  if (first < 0) return [];
  let last = env.length - 1;
  while (last > first && env[last] < threshold) last--;
  return env.slice(first, last + 1);
};

// Reduce una serie a n puntos (promedio por tramo)
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

// Distancia DTW media entre dos series (permite que una sílaba dure un poco más o menos)
const dtw = (a, b) => {
  const n = a.length;
  const m = b.length;
  let prev = new Float64Array(m + 1).fill(Infinity);
  prev[0] = 0;
  for (let i = 1; i <= n; i++) {
    const row = new Float64Array(m + 1).fill(Infinity);
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(a[i - 1] - b[j - 1]);
      row[j] = cost + Math.min(prev[j], row[j - 1], prev[j - 1]);
    }
    prev = row;
  }
  return prev[m] / (n + m);
};

/**
 * Parecido de 0 a 100 entre la voz modelo y la grabación (ambas como envolventes de energía).
 * Combina la forma (DTW sobre 40 puntos) y la duración de la parte con voz.
 * Devuelve null si la grabación no tiene voz.
 */
export const similarity = (modelEnv, userEnv) => {
  const a = trimSilence(modelEnv);
  const b = trimSilence(userEnv);
  if (b.length < 3 || a.length < 3) return null;
  const shape = 1 - Math.min(1, dtw(resample(a, 40), resample(b, 40)) / 0.35);
  const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  const timing = Math.min(1, ratio / 0.75);
  return Math.round(100 * (0.7 * shape + 0.3 * timing));
};

// Cuántas estrellas y qué decir según el parecido
export const verdict = (score) => {
  if (score == null) return { stars: 0, text: 'No escuchamos tu voz. Acércate al micrófono y vuelve a intentarlo.' };
  if (score >= 80) return { stars: 3, text: '¡Suena muy parecido!' };
  if (score >= 60) return { stars: 2, text: '¡Bien! Escucha otra vez y fíjate en el ritmo.' };
  if (score >= 40) return { stars: 1, text: 'Vas bien. Prueba a decirlo más despacio, sílaba por sílaba.' };
  return { stars: 0, text: 'Escucha el modelo y repite con el mismo ritmo.' };
};

// Barras para dibujar la onda
export const peaks = (env, bars = 48) => resample(env, bars).map((v) => Math.max(0.04, Math.min(1, v)));

const decode = async (arrayBuffer) => {
  const ctx = audioContext();
  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    return { samples: buffer.getChannelData(0), rate: buffer.sampleRate };
  } finally {
    ctx.close?.();
  }
};

// Envolvente de un audio en línea (la voz modelo). null si no se puede leer.
const modelCache = new Map();
export const loadModelEnvelope = (url) => {
  if (!url) return Promise.resolve(null);
  if (!modelCache.has(url)) {
    const job = fetch(url, { mode: 'cors', credentials: 'omit' })
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(decode)
      .then(({ samples, rate }) => envelope(samples, rate))
      .catch(() => {
        modelCache.delete(url);
        return null;
      });
    modelCache.set(url, job);
  }
  return modelCache.get(url);
};

/**
 * Empieza a grabar. Devuelve { stop, done }:
 *  - onLevel(0..1) recibe el volumen en vivo para animar el botón;
 *  - se detiene solo tras maxMs o tras un silencio de 1,2 s después de haber hablado;
 *  - done resuelve { url, env, ms } (url es local: blob del navegador).
 * Si no hay permiso de micrófono, done se rechaza con error.name = 'NotAllowedError'.
 */
export const startRecording = async ({ maxMs = 5000, onLevel } = {}) => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const ctx = audioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const data = new Float32Array(analyser.fftSize);
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const started = performance.now();
  let spoke = false;
  let quietSince = 0;
  let frame;
  let timer;

  const stop = () => {
    if (recorder.state !== 'inactive') recorder.stop();
  };
  const tick = () => {
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += v * v;
    const level = Math.min(1, Math.sqrt(sum / data.length) * 6);
    onLevel?.(level);
    const now = performance.now();
    if (level > 0.12) {
      spoke = true;
      quietSince = 0;
    } else if (spoke) {
      quietSince ||= now;
      if (now - quietSince > 1200) return stop();
    }
    frame = requestAnimationFrame(tick);
  };

  const done = new Promise((resolve, reject) => {
    recorder.onstop = async () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close?.();
      onLevel?.(0);
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const { samples, rate } = await decode(await blob.arrayBuffer());
        resolve({ url: URL.createObjectURL(blob), env: envelope(samples, rate), ms: performance.now() - started });
      } catch (error) {
        reject(error);
      }
    };
  });
  recorder.start();
  timer = setTimeout(stop, maxMs);
  frame = requestAnimationFrame(tick);
  return { stop, done };
};

// "Ahora no puedo hablar": se respeta durante 15 minutos, como en las apps de idiomas
const MUTE_KEY = 'simiaru-sin-micro-hasta';
export const micPaused = () => {
  try {
    return Number(localStorage.getItem(MUTE_KEY)) > Date.now();
  } catch {
    return false;
  }
};
export const pauseMic = (minutes = 15) => {
  try {
    localStorage.setItem(MUTE_KEY, String(Date.now() + minutes * 60000));
  } catch {
    // sin almacenamiento: dura esta visita
  }
};
