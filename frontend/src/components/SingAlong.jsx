// "Cantar con ritmo": karaoke de una canción con acompañamiento de huayno sintetizado.
// Cuenta "1, 2", y cada verso entra a tiempo: la voz de la app lo dice ajustada a sus compases
// y las palabras se encienden una a una con una pelotita que salta. La voz recita, no canta.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Play, Square, Turtle, Rabbit, Music2 } from 'lucide-react';
import { GiDrum as Drum } from 'react-icons/gi';
import { startRhythm, beatsForLine } from '../utils/rhythm';
import { resolveAudio, speak } from '../utils/speech';

const COUNT_IN = 4; // pulsos de entrada: "1, 2, 1, 2"

const SingAlong = ({ lines, translations, language, theme, onClose }) => {
  const [running, setRunning] = useState(false);
  const [slow, setSlow] = useState(false);
  const [pos, setPos] = useState(-1); // pulso actual con decimales
  const engine = useRef(null);
  const frame = useRef(null);
  const audios = useRef([]);
  const spoken = useRef(new Set());

  // Línea de tiempo: en qué pulso empieza y termina cada verso
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

  // Los audios de cada verso se piden antes de empezar
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
  };
  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    stop();
    spoken.current = new Set();
    const bpm = slow ? 76 : 96;
    const e = startRhythm({ bpm });
    engine.current = e;
    setRunning(true);
    const tick = () => {
      const p = e.position();
      setPos(p);
      // Cada verso suena justo en su primer pulso, estirado o apretado para caber en sus compases
      timeline.forEach((line, i) => {
        if (p >= line.start - 0.02 && !spoken.current.has(i)) {
          spoken.current.add(i);
          const a = audios.current[i];
          const seconds = line.beats * e.beat * 0.92;
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
      if (p >= end + 1) {
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
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-700 via-rose-600 to-amber-500 p-5 sm:p-7 text-white shadow-xl">
      <span className="brillo-liquido" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white/90">
          <Drum className="h-5 w-5" aria-hidden="true" /> Cantar con ritmo · huayno
        </p>
        <div className="flex items-center gap-2">
          {/* Dos pulsos por compás: laten al ritmo */}
          {[0, 1].map((b) => (
            <span
              key={b}
              className={`h-4 w-4 rounded-full ${running && beatInBar === b ? 'bg-white' : 'bg-white/30'}`}
              style={{ transform: `scale(${running && beatInBar === b ? 1 + pulse * 0.6 : 1})` }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <div className="relative mt-5 min-h-[9rem]" aria-live="polite">
        <AnimatePresence mode="wait">
          {counting ? (
            <m.p key={`c-${Math.floor(pos)}`} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-7xl font-black drop-shadow">
              {(Math.floor(pos) % 2) + 1}
            </m.p>
          ) : current >= 0 ? (
            <m.div key={current} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -24, opacity: 0 }}>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-3xl sm:text-4xl font-black leading-tight" lang={language.lang}>
                {timeline[current].words.map((w, k) => {
                  const line = timeline[current];
                  const share = (line.beats * 0.92) / line.words.length;
                  const wStart = line.start + k * share;
                  const lit = pos >= wStart;
                  const now = lit && pos < wStart + share;
                  return (
                    <span key={k} className="relative inline-block">
                      {now && (
                        <m.span className="absolute -top-5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-yellow-200 shadow" animate={{ y: [0, -10, 0] }} transition={{ duration: share * (60 / (slow ? 76 : 96)), repeat: Infinity }} aria-hidden="true" />
                      )}
                      <span className={`transition-colors duration-150 ${lit ? 'text-yellow-200' : 'text-white/60'}`}>{w}</span>
                    </span>
                  );
                })}
              </p>
              {translations?.[current] && <p className="mt-2 text-lg italic text-white/85">{translations[current]}</p>}
              {timeline[current + 1] && (
                <p className="mt-4 text-sm font-bold text-white/60" lang={language.lang}>
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

      {/* Avance de la canción */}
      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/25" aria-hidden="true">
        <div className="h-full rounded-full bg-yellow-200" style={{ width: `${running ? Math.min(100, (Math.max(0, pos) / end) * 100) : 0}%` }} />
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={running ? stop : start} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-5 font-black text-stone-900 shadow-lg transition hover:scale-105 active:scale-95">
          {running ? <Square className="h-5 w-5 fill-current" aria-hidden="true" /> : <Play className="h-5 w-5 fill-current" aria-hidden="true" />}
          {running ? 'Detener' : 'Empezar'}
        </button>
        <button
          type="button"
          onClick={() => setSlow((v) => !v)}
          disabled={running}
          aria-pressed={slow}
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white/20 px-4 font-bold ring-1 ring-white/40 backdrop-blur disabled:opacity-50"
        >
          {slow ? <Turtle className="h-5 w-5" aria-hidden="true" /> : <Rabbit className="h-5 w-5" aria-hidden="true" />} {slow ? 'Despacio' : 'Normal'}
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="ml-auto min-h-12 px-3 font-bold text-white/90 underline underline-offset-4">
            Volver a la letra
          </button>
        )}
      </div>
      <p className="relative mt-3 text-xs text-white/80">El ritmo es un acompañamiento sintetizado; la voz de la app recita cada verso, no lo canta.</p>
    </div>
  );
};

export default SingAlong;
