// Acompañamiento rítmico al estilo huayno (compás de 2/4), sintetizado con Web Audio: bombo, wankara
// (tambor andino) con el golpe largo-corto-corto, y rasgueo de charango sobre una ronda de acordes menores.
// Sin archivos que descargar. start() devuelve un control con el reloj para sincronizar la letra.

const CHORDS = [
  [220, 261.63, 329.63], // La menor
  [261.63, 329.63, 392], // Do mayor
  [196, 246.94, 293.66], // Sol mayor
  [220, 261.63, 329.63], // La menor
];

const noiseBuffer = (ctx) => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

const kick = (ctx, out, t) => {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(130, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.32);
};

const drum = (ctx, out, noise, t, accent) => {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = accent ? 900 : 1400;
  filter.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(accent ? 0.5 : 0.28, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + (accent ? 0.16 : 0.08));
  src.connect(filter).connect(g).connect(out);
  src.start(t);
  src.stop(t + 0.2);
};

// Cuerda pulsada (sonido de charango): diente de sierra filtrado que se apaga rápido
const pluck = (ctx, out, freq, t, gain = 0.07) => {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = freq * 2; // el charango suena una octava arriba
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, t);
  filter.frequency.exponentialRampToValueAtTime(700, t + 0.25);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.45);
  osc.connect(filter).connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.5);
};

const strum = (ctx, out, chord, t, gain) => chord.forEach((f, i) => pluck(ctx, out, f, t + i * 0.012, gain));

/**
 * Empieza el ritmo. bpm: pulsos por minuto (la negra). onBeat(n) se llama en cada pulso (aprox.).
 * Devuelve { startAt, beat, stop, ctx }: startAt es el tiempo (ctx.currentTime) del pulso 0.
 */
export const startRhythm = ({ bpm = 92, volume = 0.6, onBeat } = {}) => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const out = ctx.createGain();
  out.gain.value = volume;
  out.connect(ctx.destination);
  const noise = noiseBuffer(ctx);
  const beat = 60 / bpm;
  const startAt = ctx.currentTime + 0.15;
  let next = 0; // próximo pulso a programar
  let lastSeen = -1;

  const schedule = () => {
    while (startAt + next * beat < ctx.currentTime + 0.2) {
      const t = startAt + next * beat;
      const inBar = next % 2; // 2/4
      const chord = CHORDS[Math.floor(next / 4) % CHORDS.length];
      if (inBar === 0) kick(ctx, out, t);
      // Huayno: corchea + dos semicorcheas en cada pulso
      drum(ctx, out, noise, t, true);
      drum(ctx, out, noise, t + beat / 2, false);
      drum(ctx, out, noise, t + (beat * 3) / 4, false);
      strum(ctx, out, chord, t, inBar === 0 ? 0.08 : 0.05);
      strum(ctx, out, chord, t + beat / 2, 0.04);
      strum(ctx, out, chord, t + (beat * 3) / 4, 0.035);
      next++;
    }
    const current = Math.floor((ctx.currentTime - startAt) / beat);
    if (current !== lastSeen && current >= 0) {
      lastSeen = current;
      onBeat?.(current);
    }
  };
  const timer = setInterval(schedule, 25);
  schedule();
  return {
    ctx,
    startAt,
    beat,
    // Pulso actual con decimales (para animar)
    position: () => (ctx.currentTime - startAt) / beat,
    stop: () => {
      clearInterval(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => ctx.close?.(), 300);
    },
  };
};

// Sílabas aproximadas de un verso (grupos de vocales): decide cuántos pulsos dura
export const syllables = (text) => (String(text).toLowerCase().match(/[aeiouáéíóúäïü]+/g) || []).length;
export const beatsForLine = (text) => {
  const n = syllables(text);
  return n <= 8 ? 4 : n <= 14 ? 6 : 8;
};
