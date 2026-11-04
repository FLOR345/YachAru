// "Cantar con ritmo": karaoke de una canción con acompañamiento de huayno sintetizado (utils/rhythm.js).
// Cuenta "1, 2" y cada verso entra a tiempo; las palabras se encienden con una pelotita que salta.
// Con voz: la app dice el verso (y la música baja un poco). Sin voz: cantas tú.
// Cada instrumento se puede apagar o encender mientras suena. La voz de la app recita, no canta.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Play, Square, Turtle, Rabbit, Music2, Mic2, MicOff } from 'lucide-react';
import { GiDrum, GiFlute, GiGuitar, GiDrumKit } from 'react-icons/gi';
import { startRhythm, beatsForLine, INSTRUMENTS } from '../utils/rhythm';
import { resolveAudio, speak } from '../utils/speech';

const COUNT_IN = 4; // pulsos de entrada: "1, 2, 1, 2"
const ICONS = { charango: GiGuitar, quena: GiFlute, wankara: GiDrum, bombo: GiDrumKit };
const BARS = 18;

const SingAlong = ({ lines, translations, language, onClose }) => {
  const [running, setRunning] = useState(false);
  const [slow, setSlow] = useState(false);
  const [withVoice, setWithVoice] = useState(true);
  const [mute, setMute] = useState({});
  const [pos, setPos] = useState(-1);
  const [levels, setLevels] = useState(() => Array(BARS).fill(0));
  const engine = useRef(null);
  const frame = useRef(null);
  const audios = useRef([]);
  const spoken = useRef(new Set());
  const voiceRef = useRef(withVoice);
  voiceRef.current = withVoice;
  const bpm = slow ? 76 : 96;

  const timeline = useMemo(() => {
    let at = COUNT_IN;
    return lines.map((text) => {
      const beats = beatsForLine(text);
      const item = { text, start: at, beats, words: text.split(/\s+/).filter(Boolean) };
      at += beats;
      return item;
    });
  }, [lines]);
  const end = timeline.length ? timeline[timeline.length - 1].start + timeline[timeline.length - 1].beats : 0;

  useEffect(() => {
    let off = false;
    Promise.all(lines.map((l) => resolveAudio(l, { idioma: language.id }))).then((urls) => {
      if (off) return;
      audios.current = urls.map((url) => {
        if (!url) return null;
        const a = new Audio();
        a.preload = 'auto';
        a.src = url;
        return a;
      });
    });
    return () => {
      off = true;
    };
  }, [lines, language.id]);

  const stop = () => {
    cancelAnimationFrame(frame.current);
    engine.current?.stop();
    engine.current = null;
    audios.current.forEach((a) => a && a.pause());
    setRunning(false);
    setPos(-1);
    setLevels(Array(BARS).fill(0));
  };
  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => {
    setMute((prev) => {
      const nextValue = !prev[id];
      engine.current?.setMute(id, nextValue);
      return { ...prev, [id]: nextValue };
    });
  };

  const start = () => {
    stop();
    spoken.current = new Set();
    const e = startRhythm({ bpm, mute });
    engine.current = e;
    setRunning(true);
    const data = new Uint8Array(e.analyser.frequencyBinCount);
    const tick = () => {
      const p = e.position();
      setPos(p);
      e.analyser.getByteFrequencyData(data);
      setLevels(Array.from({ length: BARS }, (_, i) => data[Math.min(data.length - 1, i + 1)] / 255));
      timeline.forEach((line, i) => {
        if (p >= line.start - 0.02 && !spoken.current.has(i)) {
          spoken.current.add(i);
          if (!voiceRef.current) return;
          const seconds = line.beats * e.beat * 0.92;
          e.duck(seconds);
          const a = audios.current[i];
          if (a && a.duration) {
            a.playbackRate = Math.max(0.75, Math.min(1.35, a.duration / seconds));
            a.preservesPitch = true;
            a.currentTime = 0;
            a.play().catch(() => {});
          } else {
            speak(line.text, { idioma: language.id, lang: language.voz?.respaldo });
          }
        }
      });
      if (p >= end + 2) {
        stop();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  const current = timeline.findIndex((l) => pos >= l.start && pos < l.start + l.beats);
  const counting = running && pos >= 0 && pos < COUNT_IN;
  const beatInBar = Math.floor(Math.max(0, pos)) % 2;
  const pulse = pos >= 0 ? 1 - (pos % 1) : 0;

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] p-5 sm:p-7 text-white shadow-2xl">
      {/* Fondo: degradado vivo que late con el pulso y vidrio encima */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-fuchsia-700 via-rose-600 to-amber-500" aria-hidden="true" />
      <m.div
        className="absolute -left-20 -top-24 -z-10 h-72 w-72 rounded-full bg-amber-300/50 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <m.div
        className="absolute -bottom-24 -right-16 -z-10 h-72 w-72 rounded-full bg-violet-500/60 blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 -z-10 bg-white" style={{ opacity: running ? pulse * 0.07 : 0 }} aria-hidden="true" />
      <span className="brillo-liquido" aria-hidden="true" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white/90">
          <GiDrum className="h-5 w-5" aria-hidden="true" /> Cantar con ritmo · huayno · {bpm} bpm
        </p>
        <div className="flex items-center gap-2" aria-hidden="true">
          {[0, 1].map((b) => (
            <span key={b} className={`h-4 w-4 rounded-full transition-colors ${running && beatInBar === b ? 'bg-white' : 'bg-white/30'}`} style={{ transform: `scale(${running && beatInBar === b ? 1 + pulse * 0.6 : 1})` }} />
          ))}
        </div>
      </div>

      {/* Ecualizador en vivo */}
      <div className="relative mt-4 flex h-12 items-end gap-1" aria-hidden="true">
        {levels.map((v, i) => (
          <span key={i} className="flex-1 rounded-t-full bg-gradient-to-t from-white/40 to-yellow-100" style={{ height: `${Math.max(6, v * 100)}%`, transition: 'height 70ms linear' }} />
        ))}
      </div>

      <div className="relative mt-4 min-h-[9.5rem] rounded-3xl bg-white/10 p-4 ring-1 ring-white/30 backdrop-blur-md" aria-live="polite">
        <AnimatePresence mode="wait">
          {counting ? (
            <m.p key={`c-${Math.floor(pos)}`} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="py-4 text-center text-7xl font-black drop-shadow">
              {(Math.floor(pos) % 2) + 1}
            </m.p>
          ) : current >= 0 ? (
            <m.div key={current} initial={{ y: 24, opacity: 0, filter: 'blur(6px)' }} animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }} exit={{ y: -24, opacity: 0 }}>
              <p className="flex flex-wrap gap-x-3 gap-y-2 pt-4 text-3xl sm:text-4xl font-black leading-tight" lang={language.lang}>
                {timeline[current].words.map((w, k) => {
                  const line = timeline[current];
                  const share = (line.beats * 0.92) / line.words.length;
                  const wStart = line.start + k * share;
                  const lit = pos >= wStart;
                  const now = lit && pos < wStart + share;
                  return (
                    <span key={k} className="relative inline-block">
                      {now && <m.span className="absolute -top-5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-yellow-200 shadow-[0_0_12px_#fde68a]" animate={{ y: [0, -12, 0] }} transition={{ duration: (share * 60) / bpm, repeat: Infinity }} aria-hidden="true" />}
                      <m.span className={`inline-block transition-colors duration-150 ${lit ? 'text-yellow-200 drop-shadow-[0_0_10px_rgba(253,224,71,0.6)]' : 'text-white/55'}`} animate={now ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                        {w}
                      </m.span>
                    </span>
                  );
                })}
              </p>
              {translations?.[current] && <p className="mt-2 text-lg italic text-white/85">{translations[current]}</p>}
              {timeline[current + 1] && (
                <p className="mt-3 text-sm font-bold text-white/60" lang={language.lang}>
                  Sigue: {timeline[current + 1].text}
                </p>
              )}
            </m.div>
          ) : (
            <m.div key="espera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 py-4 text-center">
              <Music2 className="h-10 w-10 text-white/80" aria-hidden="true" />
              <p className="text-lg font-bold">Pulsa «Empezar», escucha el «1, 2» y canta cada verso cuando se encienda.</p>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/25" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-yellow-200 to-white" style={{ width: `${running ? Math.min(100, (Math.max(0, pos) / end) * 100) : 0}%` }} />
      </div>

      {/* Instrumentos: se encienden y se apagan en vivo */}
      <div className="relative mt-4 flex flex-wrap gap-2" role="group" aria-label="Instrumentos">
        {INSTRUMENTS.map(({ id, label }) => {
          const Icon = ICONS[id];
          const on = !mute[id];
          return (
            <m.button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(id)}
              whileTap={{ scale: 0.92 }}
              animate={on && running ? { y: [0, -3, 0] } : { y: 0 }}
              transition={on && running ? { duration: 60 / bpm, repeat: Infinity, delay: INSTRUMENTS.findIndex((x) => x.id === id) * 0.08 } : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-black ring-1 backdrop-blur transition-colors ${on ? 'bg-white/90 text-stone-900 ring-white' : 'bg-white/10 text-white/70 ring-white/30 line-through'}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" /> {label}
            </m.button>
          );
        })}
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={running ? stop : start} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-5 font-black text-stone-900 shadow-lg transition hover:scale-105 active:scale-95">
          {running ? <Square className="h-5 w-5 fill-current" aria-hidden="true" /> : <Play className="h-5 w-5 fill-current" aria-hidden="true" />}
          {running ? 'Detener' : 'Empezar'}
        </button>
        <button type="button" onClick={() => setSlow((v) => !v)} disabled={running} aria-pressed={slow} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white/20 px-4 font-bold ring-1 ring-white/40 backdrop-blur disabled:opacity-50">
          {slow ? <Turtle className="h-5 w-5" aria-hidden="true" /> : <Rabbit className="h-5 w-5" aria-hidden="true" />} {slow ? 'Despacio' : 'Normal'}
        </button>
        <button type="button" onClick={() => setWithVoice((v) => !v)} aria-pressed={withVoice} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white/20 px-4 font-bold ring-1 ring-white/40 backdrop-blur">
          {withVoice ? <Mic2 className="h-5 w-5" aria-hidden="true" /> : <MicOff className="h-5 w-5" aria-hidden="true" />} {withVoice ? 'Con voz' : 'Sin voz: cantas tú'}
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="ml-auto min-h-12 px-3 font-bold text-white/90 underline underline-offset-4">
            Volver a la letra
          </button>
        )}
      </div>
      <p className="relative mt-3 text-xs text-white/80">El acompañamiento es sintetizado (charango, quena, wankara y bombo); la voz de la app recita cada verso, no lo canta.</p>
    </div>
  );
};

export default SingAlong;
