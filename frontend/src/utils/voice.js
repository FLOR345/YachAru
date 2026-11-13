// Grabar tu voz con el micrófono y calificarla contra la voz de la app (ver utils/grader.js).
// La grabación se queda en este dispositivo: no se sube ni se guarda en ningún servidor.
import { analyze, WARPS } from './grader';

export const canRecord = () =>
  typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined';

const audioContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  return new Ctx();
};

// Reduce una serie a n barras para dibujar la onda (nunca vacías)
export const peaks = (env, bars = 48) => {
  if (!env?.length) return Array(bars).fill(0.04);
  return Array.from({ length: bars }, (_, i) => {
    const a = Math.floor((i * env.length) / bars);
    const b = Math.max(a + 1, Math.floor(((i + 1) * env.length) / bars));
    let max = 0;
    for (let j = a; j < b && j < env.length; j++) max = Math.max(max, env[j]);
    return Math.max(0.04, Math.min(1, max));
  });
};

const decode = async (arrayBuffer) => {
  const ctx = audioContext();
  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    return { samples: buffer.getChannelData(0), rate: buffer.sampleRate };
  } finally {
    ctx.close?.();
  }
};

// Análisis de una voz modelo en línea (la de la app). null si no se puede leer.
const modelCache = new Map();
export const loadModel = (url) => {
  if (!url) return Promise.resolve(null);
  if (!modelCache.has(url)) {
    const job = fetch(url, { mode: 'cors', credentials: 'omit' })
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(decode)
      .then(({ samples, rate }) => analyze(samples, rate))
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
 *  - onLevel(0..1) recibe el volumen en vivo para animar el micrófono;
 *  - se detiene solo tras maxMs o tras un silencio de 1,2 s después de haber hablado;
 *  - done resuelve { url, analysis, ms } (url es local: un blob del navegador).
 * Si no hay permiso de micrófono, done se rechaza con error.name = 'NotAllowedError'.
 */
export const startRecording = async ({ maxMs = 5000, onLevel } = {}) => {
  // Sin supresión de ruido agresiva: recorta consonantes como las glotalizadas
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
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
        resolve({ url: URL.createObjectURL(blob), blob, analysis: analyze(samples, rate, WARPS), ms: performance.now() - started });
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

// "Ahora no puedo hablar": se respeta durante 15 minutos
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
