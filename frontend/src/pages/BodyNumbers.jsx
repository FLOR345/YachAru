// "Mi cuerpo y los números": aprender las partes del cuerpo con un modelo 3D que se toca,
// y los números con llamitas que se cuentan. Cada pestaña tiene un modo para explorar y dos juegos.
// Verde para quechua y azul para aimara, como en el resto de SimiAru.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as m from 'motion/react-m';
import { AnimatePresence } from 'motion/react';
import { ArrowLeft, Volume2, Heart, Trophy, RotateCcw, Sparkles, Hand, Eye, Hash, Ear, Search, Minus, Plus, Timer, Star, Move } from 'lucide-react';
import { GiVitruvianMan, GiAbacus } from 'react-icons/gi';
import { LANGUAGES, getLanguage, languageStyle } from '../languages';
import { speak } from '../utils/speech';
import { playTap, playCorrect, playWrong } from '../utils/sounds';
import Mascot, { LlamaImage } from '../components/Mascot';
import Decor from '../components/Decor';
import BodyFigure from '../components/BodyFigure';
import { MicButton, SpeakModal } from '../components/SpeakPractice';
import { Confetti, Burst } from '../components/GameFx';
import GradientText from '../components/reactbits/GradientText';
import { AnimatedContent, BlurText, CountUp } from '../ui/lazyBits';
import { partesDe, frasesParte, numeroEn, partesNumero } from '../data/cuerpoNumeros';

const ROUNDS = 10;
const LIVES = 3;
const SECONDS = 9;

const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pickOthers = (list, correct, n, key = (x) => x) => shuffle(list.filter((x) => key(x) !== key(correct))).slice(0, n);

const store = {
  get: (k) => {
    try {
      return Number(localStorage.getItem(k)) || 0;
    } catch {
      return 0;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, String(v));
    } catch {
      // sin almacenamiento
    }
  },
};

// ==================== Piezas comunes ====================
const Chip = ({ active, onClick, Icon, children, theme }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={() => {
      playTap();
      onClick();
    }}
    className={`relative inline-flex items-center gap-2 min-h-11 px-4 rounded-full font-black text-sm transition-colors ${active ? 'text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-stone-400'}`}
  >
    {active && <m.span layoutId="modo-activo" className={`absolute inset-0 rounded-full bg-gradient-to-r ${theme.gradient} shadow-lg`} transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }} />}
    <Icon className="relative w-4 h-4" aria-hidden="true" />
    <span className="relative">{children}</span>
  </button>
);

const ListenButton = ({ text, language, theme, big = false, label = 'Escuchar' }) => (
  <button
    type="button"
    onClick={() => speak(text, { idioma: language.id, lang: language.voz?.respaldo })}
    className={`ficha inline-flex items-center gap-2 ${big ? 'min-h-12 px-5 text-base' : 'min-h-10 px-3 text-sm'} rounded-xl ${theme.solid} border-black/20 text-white font-black`}
  >
    <Volume2 className={big ? 'w-5 h-5' : 'w-4 h-4'} aria-hidden="true" /> {label}
  </button>
);

// Marcador del juego: vidas, puntos, racha y ronda
const HUD = ({ lives, score, combo, round, theme, timeLeft }) => (
  <div className="rounded-3xl bg-white/90 backdrop-blur ring-1 ring-stone-200 p-4 shadow-sm">
    <div className="flex flex-wrap items-center gap-4">
      <span className="flex items-center gap-1" aria-label={`${lives} vidas`}>
        {Array.from({ length: LIVES }, (_, i) => (
          <m.span key={i} animate={i >= lives ? { scale: [1, 1.4, 0.8], opacity: 0.25 } : { scale: 1, opacity: 1 }}>
            <Heart className={`w-6 h-6 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-stone-300'}`} aria-hidden="true" />
          </m.span>
        ))}
      </span>
      <span className="font-black tabular-nums text-xl" aria-live="polite">
        <Trophy className="inline w-5 h-5 mr-1 text-amber-500" aria-hidden="true" />
        {score}
      </span>
      <AnimatePresence>
        {combo > 1 && (
          <m.span key={combo} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="rounded-full bg-amber-400 px-3 py-1 text-sm font-black text-amber-950">
            ¡Racha x{combo}!
          </m.span>
        )}
      </AnimatePresence>
      <span className="ml-auto text-sm font-bold text-stone-500">
        Ronda {Math.min(round + 1, ROUNDS)} de {ROUNDS}
      </span>
    </div>
    <div className="mt-3 flex gap-1" aria-hidden="true">
      {Array.from({ length: ROUNDS }, (_, i) => (
        <span key={i} className={`h-2 flex-1 rounded-full ${i < round ? `bg-gradient-to-r ${theme.gradient}` : 'bg-stone-200'}`} />
      ))}
    </div>
    {timeLeft != null && (
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
        <m.div key={`${round}-${timeLeft > 0}`} className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: SECONDS, ease: 'linear' }} />
      </div>
    )}
  </div>
);

// Pantalla final del juego
const EndScreen = ({ score, best, onReplay, onExplore, theme, won }) => {
  const stars = score >= 900 ? 3 : score >= 500 ? 2 : score > 0 ? 1 : 0;
  return (
    <m.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', bounce: 0.35 }} className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${theme.gradient} p-8 text-center text-white shadow-2xl`}>
      {won && <Confetti />}
      <span className="brillo-liquido" aria-hidden="true" />
      <div className="relative">
        <Mascot pose={stars >= 2 ? 'celebrando' : 'carino'} sticker size="w-32" className="justify-center" />
        <p className="mt-2 text-sm font-black uppercase tracking-widest text-white/80">{stars >= 2 ? '¡Excelente!' : stars ? '¡Bien hecho!' : '¡Inténtalo otra vez!'}</p>
        <p className="text-6xl font-black tabular-nums">
          <CountUp to={score} duration={1.2} />
        </p>
        <div className="mt-2 flex justify-center gap-1" aria-label={`${stars} estrellas`}>
          {[0, 1, 2].map((i) => (
            <m.span key={i} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 + i * 0.15, type: 'spring', bounce: 0.6 }}>
              <Star className={`w-10 h-10 ${i < stars ? 'fill-amber-300 text-amber-300' : 'text-white/40'}`} aria-hidden="true" />
            </m.span>
          ))}
        </div>
        <p className="mt-2 font-semibold text-white/85">Tu récord: {best}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onReplay} className="ficha inline-flex items-center gap-2 min-h-12 px-6 rounded-2xl bg-white text-stone-900 font-black">
            <RotateCcw className="w-5 h-5" aria-hidden="true" /> Jugar otra vez
          </button>
          <button type="button" onClick={onExplore} className="ficha inline-flex items-center gap-2 min-h-12 px-6 rounded-2xl bg-white/15 ring-1 ring-white/40 font-black">
            <Search className="w-5 h-5" aria-hidden="true" /> Volver a explorar
          </button>
        </div>
      </div>
    </m.div>
  );
};

// Lógica común de los juegos: rondas, vidas, puntos con racha, tiempo y récord
const useGame = (bestKey, makeRound, ready = true) => {
  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [current, setCurrent] = useState(() => makeRound(0));
  const [flash, setFlash] = useState(null);
  const [over, setOver] = useState(false);
  const [best, setBest] = useState(() => store.get(bestKey));
  const lock = useRef(false);
  const timer = useRef(null);

  const finish = (finalScore) => {
    setOver(true);
    if (finalScore > best) {
      store.set(bestKey, finalScore);
      setBest(finalScore);
    }
  };

  const next = (nextRound, nextLives, nextScore) => {
    if (nextLives <= 0 || nextRound >= ROUNDS) return finish(nextScore);
    setRound(nextRound);
    setCurrent(makeRound(nextRound));
    setFlash(null);
    lock.current = false;
    return undefined;
  };

  const answer = (ok, id) => {
    if (lock.current || over || !ready) return;
    lock.current = true;
    clearTimeout(timer.current);
    setFlash({ id, ok });
    if (ok) {
      playCorrect();
      const c = combo + 1;
      const gained = 100 + (c - 1) * 20;
      setCombo(c);
      setScore((s) => s + gained);
      setTimeout(() => next(round + 1, lives, score + gained), 900);
    } else {
      playWrong();
      setCombo(0);
      setLives((l) => l - 1);
      setTimeout(() => next(round + 1, lives - 1, score), 1300);
    }
  };

  // Si se acaba el tiempo, cuenta como fallo
  useEffect(() => {
    if (over || !ready) return undefined;
    timer.current = setTimeout(() => answer(false, null), SECONDS * 1000);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, over, ready]);

  const restart = () => {
    lock.current = false;
    setRound(0);
    setLives(LIVES);
    setScore(0);
    setCombo(0);
    setFlash(null);
    setOver(false);
    setCurrent(makeRound(0));
  };

  return { round, lives, score, combo, current, flash, over, best, answer, restart };
};

// ==================== CUERPO ====================
export const BodyExplore = ({ idioma, language, theme }) => {
  const parts = useMemo(() => partesDe(idioma), [idioma]);
  const [active, setActive] = useState('nariz');
  const [vista, setVista] = useState('frente');
  const [seen, setSeen] = useState(() => new Set(['nariz']));
  const [saying, setSaying] = useState(false);
  const part = parts.find((p) => p.id === active) || parts[0];
  const fr = frasesParte(part, idioma);
  const select = (p) => {
    playTap();
    setActive(p.id);
    setVista(p.vista);
    setSeen((s) => new Set(s).add(p.id));
    speak(p[idioma], { idioma: language.id, lang: language.voz?.respaldo });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,29rem)_minmax(0,1fr)] items-start">
      <div className="relative rounded-[2rem] bg-gradient-to-b from-white to-stone-50 ring-1 ring-stone-200 p-6 shadow-sm">
        <BodyFigure parts={parts} vista={vista} onFlip={setVista} active={active} onPick={select} label={(p) => p[idioma]} color={theme.hex} />
      </div>

      <div className="space-y-5">
        <AnimatePresence mode="wait">
          <m.div
            key={`${part.id}-${idioma}`}
            initial={{ opacity: 0, x: 24, rotateX: -8 }}
            animate={{ opacity: 1, x: 0, rotateX: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
            className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${theme.gradient} p-7 text-white shadow-xl`}
          >
            <span className="brillo-liquido" aria-hidden="true" />
            <m.span className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/20 blur-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} aria-hidden="true" />
            <span className="tejido-andino absolute inset-x-0 bottom-0 h-2" aria-hidden="true" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-widest text-white/80">
                {language.nombre} · {part.vista === 'frente' ? 'de frente' : 'de espalda'}
              </p>
              <p className="mt-1 text-5xl sm:text-7xl font-black leading-none drop-shadow-[0_6px_20px_rgba(0,0,0,0.25)]" lang={language.lang}>
                {String(part[idioma])
                  .split('')
                  .map((ch, i) => (
                    <m.span key={i} className="inline-block" initial={{ opacity: 0, y: 30, rotate: -10 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: i * 0.04, type: 'spring', bounce: 0.5 }}>
                      {ch === ' ' ? ' ' : ch}
                    </m.span>
                  ))}
              </p>
              <p className="mt-2 text-xl font-semibold text-white/90">
                {part.art} {part.es}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[fr.es, fr.toca].map((f) => (
                  <button key={f.original} type="button" onClick={() => speak(f.original, { idioma: language.id, lang: language.voz?.respaldo })} className="rounded-2xl bg-white/15 p-4 text-left ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-white/25">
                    <span className="flex items-center gap-2 font-black" lang={language.lang}>
                      <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" /> {f.original}
                    </span>
                    <span className="mt-1 block text-sm text-white/85 italic">{f.traduccion}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5">
                <button type="button" onClick={() => speak(part[idioma], { idioma: language.id, lang: language.voz?.respaldo })} className="ficha inline-flex items-center gap-2 min-h-12 px-5 rounded-xl bg-white text-stone-900 font-black">
                  <Volume2 className="w-5 h-5" aria-hidden="true" /> Escuchar «{part[idioma]}»
                </button>
                <MicButton label={`Decir ${part[idioma]} al micrófono`} onClick={() => setSaying(true)} className="ml-2 inline-flex align-middle h-12 w-12" />
                {saying && <SpeakModal text={part[idioma]} meaning={`${part.art} ${part.es}`} language={language} theme={theme} onClose={() => setSaying(false)} />}
              </div>
            </div>
          </m.div>
        </AnimatePresence>

        <div className="rounded-3xl bg-white ring-1 ring-stone-200 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black">Partes del cuerpo</p>
            <p className="text-sm font-bold text-stone-500">
              Exploraste {seen.size} de {parts.length}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
            <m.div className={`h-full rounded-full bg-gradient-to-r ${theme.gradient}`} animate={{ width: `${(seen.size / parts.length) * 100}%` }} />
          </div>
          {seen.size === parts.length && (
            <m.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl bg-amber-50 px-4 py-2 font-bold text-amber-900">
              ¡Conoces todas las partes! Ahora prueba los juegos.
            </m.p>
          )}
          {['frente', 'espalda'].map((v) => (
            <div key={v} className="mt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-stone-500">{v === 'frente' ? 'De frente' : 'De espalda'}</p>
              <div className="flex flex-wrap gap-2">
                {parts
                  .filter((p) => p.vista === v)
                  .map((p) => (
                    <m.button
                      key={p.id}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => select(p)}
                      aria-pressed={p.id === active}
                      className={`min-h-10 rounded-full px-3 text-sm font-bold transition-colors ${p.id === active ? `${theme.solid} text-white shadow-md` : seen.has(p.id) ? `${theme.soft} ${theme.text}` : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
                    >
                      <span lang={language.lang}>{p[idioma]}</span> <span className="opacity-70">· {p.es}</span>
                    </m.button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Juego 1: "La llama dice" — la instrucción en la lengua; se toca la parte (a veces hay que darle la vuelta)
export const LlamaSays = ({ idioma, language, theme, onExplore }) => {
  const parts = useMemo(() => partesDe(idioma), [idioma]);
  const order = useMemo(() => shuffle(parts), [parts]);
  const [vista, setVista] = useState('frente');
  const [modelReady, setModelReady] = useState(false);
  const g = useGame(`simiaru-llama-dice-${idioma}`, (r) => order[r % order.length], modelReady);
  const target = g.current;
  const fr = frasesParte(target, idioma);
  useEffect(() => {
    if (!g.over && modelReady) speak(fr.toca.original, { idioma: language.id, lang: language.voz?.respaldo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.round, g.over, modelReady]);
  // Si falla, el cuerpo gira solo para mostrar dónde estaba
  useEffect(() => {
    if (g.flash && !g.flash.ok) setVista(target.vista);
  }, [g.flash, target.vista]);

  if (g.over) return <EndScreen score={g.score} best={g.best} onReplay={g.restart} onExplore={onExplore} theme={theme} won={g.lives > 0} />;
  const otherSide = target.vista !== vista && !g.flash;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] items-start">
      <div className="relative order-2 lg:order-1 rounded-[2rem] bg-white ring-1 ring-stone-200 p-3 sm:p-6 shadow-sm">
        <BodyFigure
          onReady={setModelReady}
          parts={parts}
          vista={vista}
          onFlip={setVista}
          hint={otherSide}
          flash={g.flash}
          onPick={(p) => g.answer(p.id === target.id, p.id)}
          color={theme.hex}
          active={g.flash ? target.id : undefined}
          label={g.flash ? (p) => p[idioma] : undefined}
        />
        {g.flash?.ok && <Burst trigger={g.round + 1} count={14} distance={70} />}
      </div>
      <div className="order-1 lg:order-2 space-y-4 sm:space-y-5">
        <HUD {...g} theme={theme} timeLeft={modelReady ? SECONDS : null} />
        <AnimatePresence mode="wait">
          <m.div key={g.round} initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="relative overflow-hidden rounded-[2rem] bg-white ring-1 ring-stone-200 p-7 shadow-xl">
            <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${theme.gradient}`} aria-hidden="true" />
            <div className="flex items-start gap-4">
              <m.div animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}>
                <Mascot pose="hablando" sticker size="w-24 shrink-0" />
              </m.div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-stone-500">La llama dice…</p>
                <p className={`mt-1 text-3xl sm:text-4xl font-black leading-tight ${theme.text}`} lang={language.lang}>
                  {fr.toca.original}
                </p>
                <AnimatePresence>
                  {g.flash && (
                    <m.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`mt-2 font-bold ${g.flash.ok ? 'text-green-700' : 'text-rose-700'}`}>
                      {g.flash.ok ? '¡Muy bien! ' : 'Era aquí: '}
                      {fr.toca.traduccion}
                    </m.p>
                  )}
                </AnimatePresence>
                {otherSide && (
                  <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="mt-2 text-sm font-bold text-amber-700">
                    Pista: esta parte se ve mejor de {target.vista === 'espalda' ? 'espalda' : 'frente'}.
                  </m.p>
                )}
                <div className="mt-4">
                  <ListenButton text={fr.toca.original} language={language} theme={theme} label="Escuchar otra vez" />
                </div>
              </div>
            </div>
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Juego 2: "¿Qué parte es?" — el cuerpo gira, una parte se ilumina y se elige su nombre
export const WhichPart = ({ idioma, language, theme, onExplore }) => {
  const parts = useMemo(() => partesDe(idioma), [idioma]);
  const order = useMemo(() => shuffle(parts), [parts]);
  const [modelReady, setModelReady] = useState(false);
  const g = useGame(`simiaru-que-parte-${idioma}`, (r) => {
    const t = order[r % order.length];
    return { t, options: shuffle([t, ...pickOthers(parts, t, 3, (p) => p[idioma])]) };
  }, modelReady);
  const { t, options } = g.current;

  if (g.over) return <EndScreen score={g.score} best={g.best} onReplay={g.restart} onExplore={onExplore} theme={theme} won={g.lives > 0} />;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] items-start">
      <div className="relative order-2 lg:order-1 rounded-[2rem] bg-white ring-1 ring-stone-200 p-3 sm:p-6 shadow-sm">
        <BodyFigure onReady={setModelReady} parts={parts.filter((p) => p.id === t.id)} vista={t.vista} active={t.id} color={theme.hex} flash={g.flash} label={g.flash ? (p) => p[idioma] : undefined} />
        {g.flash?.ok && <Burst trigger={g.round + 1} count={14} distance={70} />}
      </div>
      <div className="order-1 lg:order-2 space-y-4 sm:space-y-5">
        <HUD {...g} theme={theme} timeLeft={modelReady ? SECONDS : null} />
        <div className="rounded-[2rem] bg-white ring-1 ring-stone-200 p-6 shadow-xl">
          <p className="text-xs font-black uppercase tracking-widest text-stone-500">¿Cómo se llama la parte que brilla?</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {options.map((o, i) => {
              const state = g.flash && (o.id === t.id ? 'ok' : g.flash.id === o.id ? 'bad' : null);
              return (
                <m.button
                  key={`${g.round}-${o.id}`}
                  type="button"
                  initial={{ opacity: 0, y: 14, rotateX: -40 }}
                  animate={state === 'bad' ? { x: [0, -10, 10, -6, 6, 0], opacity: 1, y: 0, rotateX: 0 } : { opacity: 1, y: 0, rotateX: 0, scale: state === 'ok' ? 1.05 : 1 }}
                  transition={{ delay: g.flash ? 0 : i * 0.07 }}
                  whileHover={!g.flash ? { y: -3 } : undefined}
                  onClick={() => {
                    speak(o[idioma], { idioma: language.id, lang: language.voz?.respaldo });
                    g.answer(o.id === t.id, o.id);
                  }}
                  disabled={!!g.flash}
                  className={`ficha min-h-16 rounded-2xl px-4 text-left text-2xl font-black ${state === 'ok' ? 'border-green-700 bg-green-500 text-white' : state === 'bad' ? 'border-rose-700 bg-rose-500 text-white' : 'border-stone-200 bg-white hover:bg-stone-50'}`}
                  lang={language.lang}
                >
                  {o[idioma]}
                  {g.flash && o.id === t.id && <span className="block text-sm font-bold opacity-90">{o.es}</span>}
                </m.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Juego 3: "Pega las palabras" — se arrastra cada palabra hasta su lugar en el cuerpo (de frente y luego de espalda)
export const DragLabels = ({ idioma, language, theme, onExplore }) => {
  const parts = useMemo(() => partesDe(idioma), [idioma]);
  const makeRound = () => {
    const front = shuffle(parts.filter((p) => p.vista === 'frente')).slice(0, 7);
    const back = parts.filter((p) => p.vista === 'espalda');
    return { front, back };
  };
  const [set, setSet] = useState(makeRound);
  const [vista, setVista] = useState('frente');
  const [placed, setPlaced] = useState({});
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState(null);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);
  const faceRef = useRef(null);
  const bestKey = `simiaru-pega-palabras-${idioma}`;
  const [best, setBest] = useState(() => store.get(bestKey));

  const pending = (vista === 'frente' ? set.front : set.back).filter((p) => !placed[p.id]);
  const total = set.front.length + set.back.length;
  const count = Object.keys(placed).length;

  useEffect(() => {
    if (done) return;
    if (vista === 'frente' && set.front.every((p) => placed[p.id])) {
      const t = setTimeout(() => setVista('espalda'), 700);
      return () => clearTimeout(t);
    }
    if (count === total) {
      const score = Math.max(0, 1000 - mistakes * 100);
      if (score > best) {
        store.set(bestKey, score);
        setBest(score);
      }
      const t = setTimeout(() => setDone(true), 900);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);

  // Al soltar: si cae cerca del punto correcto, se pega
  const drop = (p, info) => {
    const point = faceRef.current?.getPartScreenPosition(p.id);
    if (!point) return false;
    const px = info.point.x - window.scrollX;
    const py = info.point.y - window.scrollY;
    const ok = Math.hypot(px - point.x, py - point.y) < point.tolerance;
    if (ok) {
      playCorrect();
      speak(p[idioma], { idioma: language.id, lang: language.voz?.respaldo });
      setPlaced((s) => ({ ...s, [p.id]: p[idioma] }));
      setBurst((b) => b + 1);
    } else {
      playWrong();
      setMistakes((x) => x + 1);
      setWrong(p.id);
      setTimeout(() => setWrong(null), 600);
    }
    return ok;
  };

  const restart = () => {
    setSet(makeRound());
    setVista('frente');
    setPlaced({});
    setMistakes(0);
    setDone(false);
  };

  if (done) return <EndScreen score={Math.max(0, 1000 - mistakes * 100)} best={best} onReplay={restart} onExplore={onExplore} theme={theme} won />;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] items-start">
      <div className="relative order-2 lg:order-1 rounded-[2rem] bg-white ring-1 ring-stone-200 p-3 sm:p-6 shadow-sm">
        <BodyFigure ref={faceRef} parts={parts.filter((p) => [...set.front, ...set.back].some((x) => x.id === p.id))} vista={vista} placed={placed} color={theme.hex} showDots spotlight={false} onPick={() => {}} />
        <Burst trigger={burst} count={16} distance={80} />
      </div>
      <div className="order-1 lg:order-2 space-y-4 sm:space-y-5">
        <div className="rounded-3xl bg-white/90 backdrop-blur ring-1 ring-stone-200 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-black text-xl tabular-nums">
              {count} / {total}
            </span>
            <span className="text-sm font-bold text-stone-500">Errores: {mistakes}</span>
            <span className="ml-auto rounded-full bg-stone-100 px-3 py-1 text-sm font-black text-stone-700">{vista === 'frente' ? 'De frente' : 'De espalda'}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
            <m.div className={`h-full rounded-full bg-gradient-to-r ${theme.gradient}`} animate={{ width: `${(count / total) * 100}%` }} />
          </div>
        </div>
        <div className="rounded-[2rem] bg-white ring-1 ring-stone-200 p-6 shadow-xl">
          <p className="text-xs font-black uppercase tracking-widest text-stone-500">Arrastra cada palabra hasta su punto en el cuerpo</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <AnimatePresence>
              {pending.map((p, i) => (
                <m.div
                  key={`${vista}-${p.id}`}
                  layout
                  drag
                  dragSnapToOrigin
                  dragElastic={0.9}
                  whileDrag={{ scale: 1.15, rotate: -4, zIndex: 60, boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}
                  onDragEnd={(e, info) => drop(p, info)}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={wrong === p.id ? { x: [0, -10, 10, -6, 6, 0], opacity: 1, scale: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', bounce: 0.4 }}
                  className={`relative cursor-grab touch-none select-none rounded-2xl px-4 py-3 text-xl font-black text-white shadow-lg active:cursor-grabbing bg-gradient-to-br ${wrong === p.id ? 'from-rose-500 to-rose-700' : theme.gradient}`}
                  lang={language.lang}
                >
                  {p[idioma]}
                  <span className="block text-xs font-bold text-white/80">{p.es}</span>
                </m.div>
              ))}
            </AnimatePresence>
          </div>
          {pending.length === 0 && vista === 'frente' && <p className="mt-2 font-bold text-green-700">¡Listo de frente! Ahora el cuerpo se da la vuelta…</p>}
        </div>
        <p className="text-sm text-stone-500">Con el mouse o con el dedo: suelta la palabra encima del punto que le corresponde.</p>
      </div>
    </div>
  );
};

// ==================== NÚMEROS ====================
const Llamitas = ({ n, max = 20, size = 'w-10' }) => {
  const shown = Math.min(n, max);
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {Array.from({ length: shown }, (_, i) => (
        <m.span key={`${n}-${i}`} initial={{ scale: 0, y: -20, rotate: -20 }} animate={{ scale: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', bounce: 0.6, delay: i * 0.035 }} className={`${size} aspect-square`}>
          <LlamaImage pose={i % 5 === 4 ? 'celebrando' : 'alegre'} sticker sizes="3rem" />
        </m.span>
      ))}
    </div>
  );
};

export const NumbersExplore = ({ idioma, language, theme }) => {
  const [n, setN] = useState(7);
  const word = numeroEn(n, idioma);
  const parts = partesNumero(n, idioma);
  const tens = Math.floor(n / 10);
  const units = n % 10;
  const set = (v) => {
    const x = Math.max(1, Math.min(100, v));
    setN(x);
    speak(numeroEn(x, idioma), { idioma: language.id, lang: language.voz?.respaldo });
  };

  return (
    <div className="space-y-6">
      <div className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${theme.gradient} p-6 sm:p-10 text-white shadow-xl`}>
        <span className="brillo-liquido" aria-hidden="true" />
        <span className="tejido-andino absolute inset-x-0 bottom-0 h-2" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] items-center">
          <m.p key={n} initial={{ scale: 0.6, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', bounce: 0.5 }} className="text-[7rem] sm:text-[9rem] font-black leading-none tabular-nums drop-shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
            {n}
          </m.p>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-white/80">Se dice en {language.nombre.toLowerCase()}</p>
            <p className="mt-1 text-4xl sm:text-5xl font-black leading-tight" lang={language.lang}>
              {parts.map((p, i) => (
                <m.span key={`${n}-${i}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className={`mr-3 inline-block rounded-xl px-2 ${p.tipo === 'unidad' && parts.length > 1 ? 'bg-amber-300 text-amber-950' : ''}`}>
                  {p.texto}
                </m.span>
              ))}
            </p>
            {parts.length > 1 && (
              <p className="mt-2 text-sm font-semibold text-white/85">
                {tens * 10} + {units}: primero las decenas y luego las unidades
                {idioma === 'quechua' ? ' (con -yuq o -niyuq, «que tiene»)' : ' (con -ni o -ini, «que tiene»)'}.
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => set(n - 1)} aria-label="Uno menos" className="w-12 h-12 rounded-2xl bg-white/20 ring-1 ring-white/40 flex items-center justify-center hover:bg-white/30">
                <Minus className="w-6 h-6" aria-hidden="true" />
              </button>
              <input type="range" min="1" max="100" value={n} onChange={(e) => setN(Number(e.target.value))} onPointerUp={() => speak(word, { idioma: language.id, lang: language.voz?.respaldo })} aria-label="Elige un número del 1 al 100" className="h-3 flex-1 min-w-[10rem] cursor-pointer accent-amber-300" />
              <button type="button" onClick={() => set(n + 1)} aria-label="Uno más" className="w-12 h-12 rounded-2xl bg-white/20 ring-1 ring-white/40 flex items-center justify-center hover:bg-white/30">
                <Plus className="w-6 h-6" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => speak(word, { idioma: language.id, lang: language.voz?.respaldo })} className="ficha inline-flex items-center gap-2 min-h-12 px-5 rounded-xl bg-white text-stone-900 font-black">
                <Volume2 className="w-5 h-5" aria-hidden="true" /> Escuchar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cuántas llamas son: hasta 20 se ven todas; desde 21, en grupos de diez */}
      <div className="rounded-[2rem] bg-white ring-1 ring-stone-200 p-6">
        <p className="mb-4 text-center font-black text-stone-600">{n <= 20 ? `${n} ${n === 1 ? 'llamita' : 'llamitas'}` : `${tens} ${tens === 1 ? 'grupo' : 'grupos'} de diez y ${units} ${units === 1 ? 'llamita' : 'llamitas'}`}</p>
        {n <= 20 ? (
          <Llamitas n={n} />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {Array.from({ length: tens }, (_, i) => (
              <m.span key={`${n}-t${i}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05, type: 'spring', bounce: 0.5 }} className={`relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.gradient} text-white shadow-md`}>
                <span className="w-11 aspect-square">
                  <LlamaImage pose="alegre" sticker sizes="3rem" />
                </span>
                <span className="absolute -bottom-2 -right-2 rounded-full bg-amber-400 px-1.5 text-xs font-black text-amber-950">×10</span>
              </m.span>
            ))}
            {units > 0 && <Llamitas n={units} size="w-9" />}
          </div>
        )}
      </div>

      {/* Del 1 al 10 y las decenas */}
      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 21, 30, 50, 100].map((x) => (
          <m.button key={x} type="button" whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }} onClick={() => set(x)} aria-pressed={x === n} className={`rounded-2xl p-3 text-left ring-1 transition-colors ${x === n ? `bg-gradient-to-br ${theme.gradient} text-white ring-transparent shadow-lg` : 'bg-white ring-stone-200 hover:ring-stone-400'}`}>
            <span className="block text-3xl font-black tabular-nums">{x}</span>
            <span className={`block text-sm font-bold leading-tight ${x === n ? 'text-white/90' : theme.text}`} lang={language.lang}>
              {numeroEn(x, idioma)}
            </span>
          </m.button>
        ))}
      </div>
    </div>
  );
};

// Juego 3: "Cuenta las llamas" — aparecen llamitas y se elige el número en la lengua
export const CountLlamas = ({ idioma, language, theme, onExplore }) => {
  const g = useGame(`simiaru-cuenta-llamas-${idioma}`, (r) => {
    const max = r < 3 ? 5 : r < 6 ? 10 : 15;
    const n = 1 + Math.floor(Math.random() * max);
    const others = shuffle(Array.from({ length: 15 }, (_, i) => i + 1).filter((x) => x !== n && Math.abs(x - n) <= 4)).slice(0, 3);
    return { n, options: shuffle([n, ...others]) };
  });
  const { n, options } = g.current;
  if (g.over) return <EndScreen score={g.score} best={g.best} onReplay={g.restart} onExplore={onExplore} theme={theme} won={g.lives > 0} />;
  return (
    <div className="space-y-5">
      <HUD {...g} theme={theme} timeLeft={SECONDS} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] items-start">
        <div className="rounded-[2rem] bg-gradient-to-b from-sky-100 via-white to-green-50 ring-1 ring-stone-200 p-6 min-h-[18rem] flex flex-col justify-center">
          <p className="mb-4 text-center text-xs font-black uppercase tracking-widest text-stone-500">¿Cuántas llamitas hay?</p>
          <Llamitas key={g.round} n={n} size="w-14" />
        </div>
        <div className="grid gap-3">
          {options.map((o, i) => {
            const state = g.flash && (o === n ? 'ok' : g.flash.id === o ? 'bad' : null);
            return (
              <m.button
                key={`${g.round}-${o}`}
                type="button"
                initial={{ opacity: 0, x: 20 }}
                animate={state === 'bad' ? { x: [0, -10, 10, -6, 6, 0], opacity: 1 } : { opacity: 1, x: 0, scale: state === 'ok' ? 1.04 : 1 }}
                transition={{ delay: g.flash ? 0 : i * 0.06 }}
                onClick={() => {
                  speak(numeroEn(o, idioma), { idioma: language.id, lang: language.voz?.respaldo });
                  g.answer(o === n, o);
                }}
                disabled={!!g.flash}
                className={`ficha min-h-16 rounded-2xl px-5 text-left text-2xl font-black ${state === 'ok' ? 'border-green-700 bg-green-500 text-white' : state === 'bad' ? 'border-rose-700 bg-rose-500 text-white' : 'border-stone-200 bg-white hover:bg-stone-50'}`}
                lang={language.lang}
              >
                {numeroEn(o, idioma)}
                {g.flash && o === n && <span className="ml-2 text-base font-bold opacity-90">({o})</span>}
              </m.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Juego 4: "Escucha y toca" — se oye y se lee el número en la lengua; se toca la cifra
export const ListenTap = ({ idioma, language, theme, onExplore }) => {
  const g = useGame(`simiaru-escucha-numero-${idioma}`, (r) => {
    const max = r < 4 ? 10 : r < 7 ? 20 : 50;
    const n = 1 + Math.floor(Math.random() * max);
    const pool = new Set([n]);
    while (pool.size < 9) pool.add(1 + Math.floor(Math.random() * max));
    return { n, keys: shuffle([...pool]) };
  });
  const { n, keys } = g.current;
  useEffect(() => {
    if (!g.over) speak(numeroEn(n, idioma), { idioma: language.id, lang: language.voz?.respaldo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.round, g.over]);
  if (g.over) return <EndScreen score={g.score} best={g.best} onReplay={g.restart} onExplore={onExplore} theme={theme} won={g.lives > 0} />;
  return (
    <div className="space-y-5">
      <HUD {...g} theme={theme} timeLeft={SECONDS} />
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <m.div key={g.round} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${theme.gradient} p-8 text-white shadow-xl`}>
          <span className="brillo-liquido" aria-hidden="true" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-widest text-white/80">Escucha y toca la cifra</p>
            <p className="mt-2 text-4xl sm:text-5xl font-black leading-tight" lang={language.lang}>
              {numeroEn(n, idioma)}
            </p>
            <div className="mt-5">
              <button type="button" onClick={() => speak(numeroEn(n, idioma), { idioma: language.id, lang: language.voz?.respaldo })} className="ficha inline-flex items-center gap-2 min-h-12 px-5 rounded-xl bg-white text-stone-900 font-black">
                <Volume2 className="w-5 h-5" aria-hidden="true" /> Escuchar otra vez
              </button>
            </div>
          </div>
        </m.div>
        <div className="grid grid-cols-3 gap-3">
          {keys.map((k, i) => {
            const state = g.flash && (k === n ? 'ok' : g.flash.id === k ? 'bad' : null);
            return (
              <m.button
                key={`${g.round}-${k}`}
                type="button"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={state === 'bad' ? { x: [0, -8, 8, -5, 5, 0], opacity: 1, scale: 1 } : { opacity: 1, scale: state === 'ok' ? 1.12 : 1 }}
                transition={{ delay: g.flash ? 0 : i * 0.04, type: 'spring', bounce: 0.5 }}
                onClick={() => g.answer(k === n, k)}
                disabled={!!g.flash}
                className={`ficha aspect-square rounded-2xl text-4xl font-black tabular-nums ${state === 'ok' ? 'border-green-700 bg-green-500 text-white' : state === 'bad' ? 'border-rose-700 bg-rose-500 text-white' : 'border-stone-200 bg-white hover:bg-stone-50'}`}
              >
                {k}
              </m.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==================== Todo en una tarjeta ====================
// Cuerpo y números viven en una sola tarjeta de Juegos. Adentro: elegir tema, elegir actividad
// (cada una dice en una línea cómo se juega) y jugar. Pensado primero para el celular.
const TABS = [
  { id: 'cuerpo', label: 'Mi cuerpo', Icon: GiVitruvianMan },
  { id: 'numeros', label: 'Los números', Icon: GiAbacus },
];
const MODES = {
  cuerpo: [
    { id: 'explorar', label: 'Explorar', Icon: Eye, kind: 'Aprende', how: 'Gira el cuerpo y toca cada punto para oír su nombre.', color: 'from-emerald-500 to-green-700' },
    { id: 'llama-dice', label: 'La llama dice', Icon: Hand, kind: 'Juego', how: 'Escucha «Toca tu…» y toca esa parte en el cuerpo.', color: 'from-amber-400 to-orange-600' },
    { id: 'que-parte', label: '¿Qué parte es?', Icon: Sparkles, kind: 'Juego', how: 'Una parte brilla: elige cómo se llama.', color: 'from-sky-500 to-blue-700' },
    { id: 'pega', label: 'Pega las palabras', Icon: Move, kind: 'Juego', how: 'Arrastra cada palabra hasta su lugar del cuerpo.', color: 'from-fuchsia-500 to-purple-700' },
  ],
  numeros: [
    { id: 'explorar', label: 'Explorar', Icon: Hash, kind: 'Aprende', how: 'Mueve la barra, cuenta llamitas y escucha cada número.', color: 'from-yellow-400 to-amber-600' },
    { id: 'cuenta', label: 'Cuenta las llamas', Icon: Timer, kind: 'Juego', how: '¿Cuántas llamitas hay? Elige el número antes de que se acabe el tiempo.', color: 'from-orange-400 to-red-600' },
    { id: 'escucha', label: 'Escucha y toca', Icon: Ear, kind: 'Juego', how: 'Oye un número y toca el que escuchaste.', color: 'from-teal-400 to-emerald-700' },
  ],
};
const VIEWS = {
  cuerpo: { explorar: BodyExplore, 'llama-dice': LlamaSays, 'que-parte': WhichPart, pega: DragLabels },
  numeros: { explorar: NumbersExplore, cuenta: CountLlamas, escucha: ListenTap },
};

// tema: 'cuerpo' o 'numeros' (cada uno es su propia tarjeta en Juegos)
export const BodyNumbersHub = ({ tema, idioma, language, theme }) => {
  const [params, setParams] = useSearchParams();
  const tab = tema === 'numeros' ? 'numeros' : 'cuerpo';
  const mode = MODES[tab].some((md) => md.id === params.get('modo')) ? params.get('modo') : 'explorar';
  const update = (patch) => setParams((p) => ({ ...Object.fromEntries(p), ...patch }), { replace: true });
  const stage = useRef(null);
  const current = MODES[tab].find((md) => md.id === mode);
  const View = VIEWS[tab][mode];
  const choose = (id) => {
    playTap();
    update({ modo: id });
    // En el celular, la actividad queda debajo: se baja hasta ella
    requestAnimationFrame(() => stage.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="space-y-5">
      {/* Actividad: tarjetas grandes con qué se hace en cada una */}
      <div className={`grid grid-cols-2 gap-3 ${MODES[tab].length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`} role="group" aria-label="Actividad">
        {MODES[tab].map((md, i) => {
          const active = md.id === mode;
          return (
            <m.button
              key={`${tab}-${md.id}`}
              type="button"
              aria-pressed={active}
              onClick={() => choose(md.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              className={`relative overflow-hidden rounded-3xl p-3 sm:p-4 text-left transition-shadow ${active ? 'bg-white shadow-xl ring-4 ring-offset-2 ' + theme.ring : 'bg-white/90 shadow-sm ring-1 ring-stone-200 hover:shadow-md'}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${md.color} text-white shadow-md`} aria-hidden="true">
                  <md.Icon className="h-6 w-6" />
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider ${md.kind === 'Aprende' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{md.kind}</span>
              </span>
              <span className="mt-2 block text-base sm:text-lg font-black leading-tight">{md.label}</span>
              <span className="mt-0.5 hidden sm:block text-sm text-stone-600">{md.how}</span>
              {active && <m.span layoutId="actividad-activa" className={`absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r ${theme.gradient}`} />}
            </m.button>
          );
        })}
      </div>

      {/* Cómo se juega (también en el celular) y la actividad */}
      <div ref={stage} className="scroll-mt-24">
        <AnimatePresence mode="wait">
          <m.p key={`${tab}-${mode}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 font-bold text-amber-950 ring-1 ring-amber-200">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${current.color} text-white`} aria-hidden="true">
              <current.Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xs font-black uppercase tracking-widest text-amber-700">Cómo se juega</span>
              {current.how}
            </span>
          </m.p>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <m.section key={`${tab}-${mode}-${idioma}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
            <View idioma={idioma} language={language} theme={theme} onExplore={() => choose('explorar')} />
          </m.section>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BodyNumbersHub;
