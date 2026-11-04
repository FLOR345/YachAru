// Acompañamiento de huayno (compás de 2/4) sintetizado con Web Audio, sin archivos que descargar:
//  - bombo y bajo en el primer pulso; wankara (tambor) con el golpe largo-corto-corto del huayno;
//  - charango con cuerdas pulsadas (síntesis Karplus-Strong) rasgueando una ronda de acordes;
//  - quena con una melodía pentatónica, vibrato y soplo;
//  - reverberación suave y un compresor; la música baja sola cuando entra la voz (duck).
// start() devuelve el reloj para sincronizar la letra y un analizador para el ecualizador.

// Ronda La menor – Do – Sol – La menor (notas del charango, una octava arriba)
const CHORDS = [
  { bass: 110, notes: [440, 523.25, 659.25] },
  { bass: 130.81, notes: [523.25, 659.25, 783.99] },
  { bass: 98, notes: [392, 493.88, 587.33] },
  { bass: 110, notes: [440, 523.25, 659.25] },
];
// Melodía de la quena: 16 pulsos (8 compases), dos notas por pulso; 0 = silencio
const A4 = 440;
const pent = (step) => A4 * 2 ** ([0, 3, 5, 7, 10, 12, 15, 17][step] / 12) * 2; // pentatónica de La, octava 5
const MELODY = [
  [4, 0], [5, 4], [3, 2], [0, 0], [2, 3], [4, 3], [2, 1], [0, 0],
  [5, 6], [7, 6], [5, 4], [5, 0], [4, 3], [2, 1], [0, 0], [0, 0],
];

export const INSTRUMENTS = [
  { id: 'charango', label: 'Charango' },
  { id: 'quena', label: 'Quena' },
  { id: 'wankara', label: 'Wankara' },
  { id: 'bombo', label: 'Bombo y bajo' },
];

const pluckCache = new Map();
// Cuerda pulsada: ruido que se filtra en un lazo de retardo (Karplus-Strong)
const pluckBuffer = (ctx, freq, seconds = 1.2) => {
  const key = `${ctx.sampleRate}:${freq}`;
  if (pluckCache.has(key)) return pluckCache.get(key);
  const rate = ctx.sampleRate;
  const n = Math.floor(rate * seconds);
  const period = Math.max(2, Math.round(rate / freq));
  const buffer = ctx.createBuffer(1, n, rate);
  const out = buffer.getChannelData(0);
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const next = (idx + 1) % period;
    const v = 0.4985 * (ring[idx] + ring[next]);
    out[i] = ring[idx];
    ring[idx] = v;
    idx = next;
  }
  pluckCache.set(key, buffer);
  return buffer;
};

const impulse = (ctx, seconds = 1.8) => {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
  }
  return buffer;
};

const noiseBuffer = (ctx) => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

/**
 * Empieza la música. bpm: pulsos por minuto. mute: { charango, quena, wankara, bombo } apagados.
 * Devuelve { position(), beat, duck(seconds), setMute(id, off), analyser, stop() }.
 */
export const startRhythm = ({ bpm = 92, volume = 0.7, mute = {} } = {}) => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const off = { ...mute };

  // Cadena: instrumentos → (seco + reverberación) → música (duck) → compresor → salida
  const music = ctx.createGain();
  music.gain.value = 1;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  const master = ctx.createGain();
  master.gain.value = volume;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 64;
  music.connect(comp).connect(master).connect(analyser).connect(ctx.destination);
  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  reverb.connect(wet).connect(music);
  const bus = ctx.createGain();
  bus.connect(music);
  bus.connect(reverb);
  const noise = noiseBuffer(ctx);

  const play = (buffer, t, gain, rate = 1) => {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(bus);
    src.start(t);
  };
  const kick = (t) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.2);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g).connect(music);
    osc.start(t);
    osc.stop(t + 0.36);
  };
  const bass = (freq, t, len) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    osc.connect(g).connect(music);
    osc.start(t);
    osc.stop(t + len + 0.02);
  };
  const drum = (t, accent) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = accent ? 650 : 1100;
    f.Q.value = 1.2;
    const body = ctx.createOscillator();
    body.frequency.setValueAtTime(accent ? 180 : 230, t);
    body.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(accent ? 0.42 : 0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (accent ? 0.18 : 0.09));
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(accent ? 0.25 : 0.1, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    src.connect(f).connect(g).connect(bus);
    body.connect(bg).connect(bus);
    src.start(t);
    src.stop(t + 0.2);
    body.start(t);
    body.stop(t + 0.12);
  };
  const strum = (notes, t, gain, down = true) => {
    const order = down ? notes : [...notes].reverse();
    order.forEach((f, i) => play(pluckBuffer(ctx, f), t + i * 0.014, gain));
  };
  // Quena: seno con vibrato y un soplo de ruido al empezar
  const quena = (freq, t, len) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.5;
    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(0, t);
    vibGain.gain.linearRampToValueAtTime(freq * 0.012, t + len * 0.6);
    vib.connect(vibGain).connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.04);
    g.gain.setValueAtTime(0.12, t + len * 0.8);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    const breath = ctx.createBufferSource();
    breath.buffer = noise;
    const bf = ctx.createBiquadFilter();
    bf.type = 'highpass';
    bf.frequency.value = 3000;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.05, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g).connect(bus);
    breath.connect(bf).connect(bg).connect(bus);
    [osc, vib].forEach((o) => {
      o.start(t);
      o.stop(t + len + 0.05);
    });
    breath.start(t);
    breath.stop(t + 0.1);
  };

  const beat = 60 / bpm;
  const startAt = ctx.currentTime + 0.2;
  let next = 0;
  const schedule = () => {
    while (startAt + next * beat < ctx.currentTime + 0.25) {
      const t = startAt + next * beat;
      const inBar = next % 2;
      const chord = CHORDS[Math.floor(next / 4) % CHORDS.length];
      if (!off.bombo) {
        if (inBar === 0) {
          kick(t);
          bass(chord.bass, t, beat * 0.9);
        } else bass(chord.bass * 1.5, t, beat * 0.6);
      }
      if (!off.wankara) {
        drum(t, true);
        drum(t + beat / 2, false);
        drum(t + (beat * 3) / 4, false);
      }
      if (!off.charango) {
        strum(chord.notes, t, inBar === 0 ? 0.32 : 0.22, true);
        strum(chord.notes, t + beat / 2, 0.16, false);
        strum(chord.notes, t + (beat * 3) / 4, 0.14, true);
      }
      if (!off.quena) {
        const [a, b] = MELODY[next % MELODY.length];
        if (a) quena(pent(a), t, b ? beat / 2 : beat * 0.95);
        if (b) quena(pent(b), t + beat / 2, beat * 0.48);
      }
      next++;
    }
  };
  const timer = setInterval(schedule, 25);
  schedule();
  return {
    ctx,
    beat,
    analyser,
    position: () => (ctx.currentTime - startAt) / beat,
    // Baja la música mientras suena la voz
    duck: (seconds) => {
      const now = ctx.currentTime;
      music.gain.cancelScheduledValues(now);
      music.gain.setTargetAtTime(0.38, now, 0.05);
      music.gain.setTargetAtTime(1, now + seconds, 0.25);
    },
    setMute: (id, value) => {
      off[id] = value;
    },
    stop: () => {
      clearInterval(timer);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      setTimeout(() => ctx.close?.(), 400);
    },
  };
};

// Sílabas aproximadas de un verso (grupos de vocales): decide cuántos pulsos dura
export const syllables = (text) => (String(text).toLowerCase().match(/[aeiouáéíóúäïü]+/g) || []).length;
export const beatsForLine = (text) => {
  const n = syllables(text);
  return n <= 8 ? 4 : n <= 14 ? 6 : 8;
};
