// Pronunciación. Orden de preferencia:
//   1. la voz de la palabra (grabada por una persona o MMS);
//   2. el índice de audios de la lengua (frases, números y canciones de la interfaz);
//   3. la voz del navegador, solo como respaldo: no distingue glotalizadas ni aspiradas.
// "slow" baja la velocidad para distinguir mejor cada sonido.
import { API_URL } from '../config.js';

// El mismo nombre que AUDIO_CACHE en public/sw.js
const AUDIO_CACHE = 'simiaru-audio-v1';

// Misma normalización que tools/tts/generate_audio.py (casos compartidos en tools/tts/audio_key_vectors.json)
export const audioKey = (text) =>
  String(text ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘´`ʼ]/g, "'")
    .replace(/\(.*?\)/g, ' ')
    .replace(/[.,;:!?¡¿"“”«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// mms = generada por el proceso de Meta; grabado = cualquier otra URL (voz real insertada a mano)
export const audioSource = (url) => {
  if (!url) return 'navegador';
  return url.includes('/simiaru/audio/') ? 'mms' : 'grabado';
};

export const AUDIO_LABELS = { mms: 'Voz sintética MMS', grabado: 'Voz grabada', navegador: 'Voz del navegador' };

// Voz sintética elegida (mujer u hombre). Una grabación de persona suena siempre igual.
const VOICE_KEY = 'simiaru-voz';
export const VOICE_EVENT = 'simiaru-voz';
export const getVoice = () => {
  try {
    return localStorage.getItem(VOICE_KEY) === 'hombre' ? 'hombre' : 'mujer';
  } catch {
    return 'mujer';
  }
};
export const setVoice = (voice) => {
  try {
    localStorage.setItem(VOICE_KEY, voice);
  } catch {
    // sin almacenamiento: la elección dura solo esta visita
  }
  window.dispatchEvent(new Event(VOICE_EVENT));
};

const indexes = new Map();
export const loadAudioIndex = (idioma, voice = getVoice()) => {
  const id = `${idioma}:${voice}`;
  if (!indexes.has(id)) {
    const request = fetch(`${API_URL}/api/validation/audios/${idioma}?voz=${voice}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => data.audios)
      .catch(() => {
        indexes.delete(id); // se reintenta en la próxima palabra
        return {};
      });
    indexes.set(id, request);
  }
  return indexes.get(id);
};

// Safari antiguo no abre ogg; Cloudinary entrega el mismo audio en mp3 cambiando la extensión
const playableUrl = (url, audio) =>
  /res\.cloudinary\.com.*\.ogg$/.test(url) && !audio.canPlayType('audio/ogg') ? url.replace(/\.ogg$/, '.mp3') : url;

export const speak = async (text, { url, idioma, lang, slow = false } = {}) => {
  const browserVoice = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || 'es-PE';
    utterance.rate = slow ? 0.5 : 0.8;
    window.speechSynthesis.speak(utterance);
  };
  // Una grabación va directa; si no, la voz elegida del índice, y si no está, el audio de la palabra
  const recorded = audioSource(url) === 'grabado';
  const indexed = !recorded && idioma ? (await loadAudioIndex(idioma))[audioKey(text)]?.[0] : null;
  const source = recorded ? url : indexed || url;
  if (!source) return browserVoice();
  const audio = new Audio();
  audio.src = playableUrl(source, audio);
  audio.playbackRate = slow ? 0.7 : 1;
  audio.play().catch(browserVoice);
};

// Guarda los audios de una lección para que suenen sin conexión
export const keepAudioOffline = async (urls) => {
  if (!('caches' in window) || !navigator.onLine || navigator.connection?.saveData) return;
  const cache = await caches.open(AUDIO_CACHE);
  for (const url of new Set(urls.filter(Boolean))) {
    if (!(await cache.match(url))) await cache.add(new Request(url, { mode: 'cors', credentials: 'omit' })).catch(() => {});
  }
};
