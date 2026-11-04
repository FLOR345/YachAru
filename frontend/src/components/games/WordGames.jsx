// Juegos nuevos con las palabras de las lecciones: hablar al micrófono, armar la palabra letra por letra,
// atrapar la palabra que cae y decidir rápido si una pareja es correcta. Todos se juegan tocando.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import * as m from 'motion/react-m';
import { Volume2, Heart, Check, X, Lightbulb, Delete, Timer, Flame } from 'lucide-react';
import { speak } from '../../utils/speech';
import { playTap, playMatch, playWrong, playCorrect, playComplete } from '../../utils/sounds';
import { Burst, FloatText, Countdown } from '../GameFx';
import SpeakPractice from '../SpeakPractice';
import { BodyChip, BodyPeek } from '../BodyMoments';
import { parteDePalabra } from '../../data/cuerpoNumeros';
import { shuffle, readBest, writeBest, bestKey, primaryBtn, useMood, GameFrame, ResultScreen } from './kit';

const voiceOf = (word, language, slow = false) => ({ url: word.audio, idioma: language.id, lang: language.voz?.respaldo, slow });

// Guarda el récord al terminar y avisa si es nuevo
const useRecord = (game, idioma, value, over, higherIsBetter = true) => {
  const key = bestKey(game, idioma);
  const [best, setBest] = useState(() => readBest(key));
  const [record, setRecord] = useState(false);
  useEffect(() => {
    if (!over) return;
    playComplete();
    if (value > 0 && (best === 0 || (higherIsBetter ? value > best : value < best))) {
      writeBest(key, value);
      setBest(value);
      setRecord(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);
  return { best, record, reset: () => setRecord(false) };
};

const Lives = ({ lives, max = 3 }) => (
  <p className="flex items-center gap-1" aria-label={`${lives} vidas`}>
    {Array.from({ length: max }, (_, i) => (
      <Heart key={`${i}-${i < lives}`} className={`w-7 h-7 ${i < lives ? 'text-red-500 fill-red-500' : 'text-stone-300 fill-stone-200 anim-corazon-roto'}`} aria-hidden="true" />
    ))}
  </p>
);

const Dots = ({ total, results, index, theme }) => (
  <ol className="flex flex-wrap gap-1.5" aria-label={`Ronda ${index + 1} de ${total}`}>
    {Array.from({ length: total }, (_, i) => (
      <li key={i} className={`h-3 rounded-full transition-all duration-300 ${i < results.length ? (results[i] ? 'w-3 bg-green-500' : 'w-3 bg-red-400') : i === index ? `w-7 bg-gradient-to-r ${theme.gradient}` : 'w-3 bg-stone-200'}`} />
    ))}
  </ol>
);

// ==================== ¡Dilo tú! (micrófono) ====================
const SPEAK_ROUNDS = 5;

export const SpeakGame = ({ words, language, theme, idioma, onExit }) => {
  const pickWords = () => shuffle(words.filter((w) => w.target.split(/\s+/).length <= 3)).slice(0, SPEAK_ROUNDS);
  const [list, setList] = useState(pickWords);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState([]);
  const [current, setCurrent] = useState(undefined); // parecido del último intento de esta ronda
  const [peek, setPeek] = useState(null);
  const [llama, react] = useMood('hablando');
  const over = index >= list.length;
  const valid = scores.filter((s) => s != null);
  const average = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  const rec = useRecord('hablar', idioma, average, over);
  const word = list[index];
  const part = word ? parteDePalabra(word.target, word.spanish, idioma) : null;

  const next = () => {
    setScores((s) => [...s, current ?? null]);
    setCurrent(undefined);
    setIndex((i) => i + 1);
  };
  const restart = () => {
    setList(pickWords());
    setIndex(0);
    setScores([]);
    setCurrent(undefined);
    rec.reset();
  };

  if (over) {
    return (
      <ResultScreen
        stars={average >= 80 ? 3 : average >= 60 ? 2 : average >= 40 ? 1 : 0}
        record={rec.record}
        big={valid.length ? `${average}` : '¡Bien!'}
        unit={valid.length ? 'de parecido medio con la voz de la app (ritmo y duración)' : 'Dijiste todas las palabras en voz alta'}
        note={!rec.record && rec.best ? `Récord: ${rec.best}` : null}
        language={language}
        onAgain={restart}
        onExit={onExit}
      />
    );
  }

  return (
    <GameFrame llama={llama} say={<p className="font-semibold">Escucha, toca el micrófono y dila con el mismo ritmo. ¡Tu voz no sale de tu equipo!</p>}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Dots total={list.length} results={scores.map((s) => s == null || s >= 50)} index={index} theme={theme} />
          {part && <BodyChip onClick={() => setPeek(part)} />}
        </div>
        <AnimatePresence mode="wait">
          <m.div key={index} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="rounded-[2rem] bg-white p-6 sm:p-8 ring-1 ring-stone-200 shadow-xl">
            <SpeakPractice
              text={word.target}
              meaning={word.spanish}
              url={word.audio}
              language={language}
              theme={theme}
              onResult={(s) => {
                setCurrent(s);
                if (s != null) react(s >= 60 ? 'cheer' : 'happy', s >= 60 ? 'celebrando' : 'alegre');
              }}
            />
          </m.div>
        </AnimatePresence>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={next} disabled={current === undefined} className={`${primaryBtn} disabled:opacity-40 disabled:cursor-not-allowed`}>
            {index + 1 >= list.length ? 'Ver resultado' : 'Siguiente'}
          </button>
        </div>
        {current === undefined && (
          <p className="mt-2 text-right text-sm text-stone-500">
            ¿Sin micrófono?{' '}
            <button type="button" className="font-bold underline underline-offset-4 min-h-11" onClick={() => setCurrent(null)}>
              La dije en voz alta
            </button>
          </p>
        )}
      </div>
      {peek && <BodyPeek part={peek} word={word.target} url={word.audio} idioma={idioma} language={language} theme={theme} onClose={() => setPeek(null)} />}
    </GameFrame>
  );
};

// ==================== Arma la palabra ====================
// Fichas con las letras de la palabra (el apóstrofo va pegado a su consonante: p', t', ch'…)
export const tilesOf = (word) => {
  const out = [];
  for (const ch of word.toLowerCase().replace(/[’‘´`ʼ]/g, "'")) {
    if (ch === ' ') continue;
    if (ch === "'" && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
};
const SPELL_ROUNDS = 8;

export const SpellGame = ({ words, language, theme, idioma, onExit }) => {
  const makeRounds = () =>
    shuffle(words.filter((w) => tilesOf(w.target).length >= 3 && tilesOf(w.target).length <= 12))
      .slice(0, SPELL_ROUNDS)
      .map((w) => {
        const letters = tilesOf(w.target);
        const pool = [...new Set(words.flatMap((o) => tilesOf(o.target)))].filter((t) => !letters.includes(t));
        const decoys = shuffle(pool).slice(0, Math.min(3, Math.max(2, 14 - letters.length)));
        return { word: w, letters, tiles: shuffle([...letters, ...decoys].map((t, i) => ({ t, i }))) };
      });
  const [rounds, setRounds] = useState(makeRounds);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState([]); // índices de fichas en orden
  const [result, setResult] = useState(null); // 'ok' | 'bad'
  const [results, setResults] = useState([]);
  const [hints, setHints] = useState(0);
  const [llama, react] = useMood('pensando');
  const round = rounds[index];
  const over = index >= rounds.length;
  const score = results.filter(Boolean).length;
  const rec = useRecord('armar', idioma, score, over);
  const spaces = useMemo(() => {
    // dónde van los espacios entre palabras (para dibujar huecos)
    if (!round) return new Set();
    const gaps = new Set();
    let n = 0;
    for (const part of round.word.target.split(/\s+/)) {
      n += tilesOf(part).length;
      gaps.add(n);
    }
    return gaps;
  }, [round]);

  useEffect(() => {
    if (!round) return undefined;
    const t = setTimeout(() => speak(round.word.target, voiceOf(round.word, language)), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, rounds]);

  const check = (list) => {
    const ok = list.map((i) => round.tiles[i].t).join('') === round.letters.join('');
    setResult(ok ? 'ok' : 'bad');
    setResults((r) => [...r, ok]);
    if (ok) {
      playCorrect();
      react('cheer', 'celebrando');
      speak(round.word.target, voiceOf(round.word, language));
    } else {
      playWrong();
      react('sad', 'reintentar');
    }
  };
  const put = (i) => {
    if (result || placed.includes(i)) return;
    playTap();
    const list = [...placed, i];
    setPlaced(list);
    if (list.length === round.letters.length) check(list);
  };
  const back = () => !result && setPlaced((p) => p.slice(0, -1));
  // Pista: coloca la siguiente letra correcta
  const hint = () => {
    if (result) return;
    const good = [];
    for (let k = 0; k < placed.length; k++) {
      if (round.tiles[placed[k]].t !== round.letters[k]) break;
      good.push(placed[k]);
    }
    const want = round.letters[good.length];
    const tile = round.tiles.findIndex((x, i) => x.t === want && !good.includes(i));
    if (tile < 0) return;
    setHints((h) => h + 1);
    const list = [...good, tile];
    setPlaced(list);
    if (list.length === round.letters.length) check(list);
  };
  const next = () => {
    setPlaced([]);
    setResult(null);
    setIndex((i) => i + 1);
  };
  const restart = () => {
    setRounds(makeRounds());
    setIndex(0);
    setPlaced([]);
    setResult(null);
    setResults([]);
    setHints(0);
    rec.reset();
  };

  useEffect(() => {
    if (over) return undefined;
    const onKey = (e) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        back();
      } else if (e.key === 'Enter' && result) {
        e.preventDefault();
        next();
      } else if (e.key.length === 1 && !result) {
        const i = round.tiles.findIndex((x, k) => x.t.startsWith(e.key.toLowerCase()) && !placed.includes(k));
        if (i >= 0) put(i);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (over) {
    return (
      <ResultScreen
        stars={score >= rounds.length - 1 ? 3 : score >= rounds.length / 2 ? 2 : score > 0 ? 1 : 0}
        record={rec.record}
        big={`${score}/${rounds.length}`}
        unit={`palabras armadas${hints ? ` · ${hints} ${hints === 1 ? 'pista' : 'pistas'}` : ''}`}
        note={!rec.record && rec.best ? `Récord: ${rec.best}` : null}
        language={language}
        onAgain={restart}
        onExit={onExit}
      />
    );
  }

  return (
    <GameFrame llama={llama} say={<p className="font-semibold">Escucha y arma la palabra tocando las letras en orden.</p>}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Dots total={rounds.length} results={results} index={index} theme={theme} />
        </div>
        <div className="mb-6 flex items-center gap-4">
          <button type="button" onClick={() => speak(round.word.target, voiceOf(round.word, language))} aria-label="Escuchar la palabra" className={`ficha flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-black/20 text-white shadow-lg ${theme.solid}`}>
            <Volume2 className="h-10 w-10" aria-hidden="true" />
          </button>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-stone-500">Significa</p>
            <p className="text-3xl font-black">{round.word.spanish}</p>
          </div>
        </div>

        {/* Casillas */}
        <m.div key={`slots-${index}`} animate={result === 'bad' ? { x: [0, -12, 12, -8, 8, 0] } : {}} className="relative mb-8 flex flex-wrap gap-2" lang={language.lang}>
          {round.letters.map((letter, k) => {
            const tile = placed[k] != null ? round.tiles[placed[k]].t : '';
            return (
              <span key={k} className={`flex items-center ${spaces.has(k) && k > 0 ? 'ml-5' : ''}`}>
                <m.span
                  initial={false}
                  animate={tile ? { scale: [0.6, 1.1, 1], y: 0 } : { scale: 1 }}
                  className={`flex h-14 min-w-12 items-center justify-center rounded-2xl border-b-4 px-2 text-2xl font-black ${
                    result === 'ok' ? 'border-green-700 bg-green-500 text-white' : result === 'bad' ? (tile === letter ? 'border-green-600 bg-green-50 text-green-800' : 'border-red-600 bg-red-50 text-red-800') : tile ? `${theme.border} ${theme.soft} ${theme.text}` : 'border-stone-300 bg-stone-100'
                  }`}
                >
                  {tile}
                </m.span>
              </span>
            );
          })}
          {result === 'ok' && <Burst trigger={index + 1} count={16} distance={80} />}
        </m.div>

        {result ? (
          <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 ${result === 'ok' ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-xl font-black ${result === 'ok' ? 'text-green-800' : 'text-red-800'}`}>
              {result === 'ok' ? '¡Perfecto!' : 'Se escribe:'} <span lang={language.lang}>{round.word.target}</span>
            </p>
            <button type="button" onClick={next} className={primaryBtn} autoFocus>
              {index + 1 >= rounds.length ? 'Ver resultado' : 'Siguiente'}
            </button>
          </m.div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-3" lang={language.lang}>
              {round.tiles.map(({ t }, i) => {
                const used = placed.includes(i);
                return (
                  <m.button
                    key={`${index}-${i}`}
                    type="button"
                    disabled={used}
                    onClick={() => put(i)}
                    initial={{ opacity: 0, y: 30, rotate: (i % 3) * 6 - 6 }}
                    animate={{ opacity: used ? 0.25 : 1, y: 0, rotate: 0, scale: used ? 0.9 : 1 }}
                    transition={{ delay: i * 0.03, type: 'spring', bounce: 0.5 }}
                    whileHover={!used ? { y: -4 } : undefined}
                    whileTap={{ scale: 0.88 }}
                    className="ficha flex h-16 min-w-14 items-center justify-center rounded-2xl border-stone-300 bg-white px-3 text-3xl font-black text-stone-800 shadow-sm disabled:cursor-default"
                  >
                    {t}
                  </m.button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={back} disabled={!placed.length} className="ficha inline-flex min-h-12 items-center gap-2 rounded-2xl border-stone-300 bg-white px-5 font-bold text-stone-700 disabled:opacity-40">
                <Delete className="h-5 w-5" aria-hidden="true" /> Borrar
              </button>
              <button type="button" onClick={hint} className="ficha inline-flex min-h-12 items-center gap-2 rounded-2xl border-amber-500 bg-amber-100 px-5 font-bold text-amber-900">
                <Lightbulb className="h-5 w-5" aria-hidden="true" /> Pista
              </button>
            </div>
          </>
        )}
      </div>
    </GameFrame>
  );
};

// ==================== Lluvia de palabras ====================
// Arriba, el significado; caen tres palabras: toca la correcta antes de que llegue al suelo.
const RAIN_LIVES = 3;
const LANES = 3;

export const RainGame = ({ words, language, theme, idioma, onExit }) => {
  const [status, setStatus] = useState('countdown');
  const [wave, setWave] = useState(0);
  const [lives, setLives] = useState(RAIN_LIVES);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hit, setHit] = useState(null); // { id, ok }
  const [llama, react] = useMood('buscando');
  const resolved = useRef(false);
  const over = status === 'playing' && lives <= 0;
  const rec = useRecord('lluvia', idioma, score, over);
  const seconds = Math.max(3.2, 7 - wave * 0.25);

  const drop = useMemo(() => {
    const target = words[Math.floor(Math.random() * words.length)];
    const others = shuffle(words.filter((w) => w.id !== target.id)).slice(0, LANES - 1);
    return { target, items: shuffle([target, ...others]).map((w, lane) => ({ w, lane, delay: Math.random() * 0.6 })) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wave, words]);

  useEffect(() => {
    resolved.current = false;
    setHit(null);
  }, [wave]);

  const nextWave = (delay) => setTimeout(() => setWave((w) => w + 1), delay);
  const tap = (item) => {
    if (resolved.current || over) return;
    const ok = item.w.id === drop.target.id;
    setHit({ id: item.w.id, ok });
    speak(item.w.target, voiceOf(item.w, language));
    if (ok) {
      resolved.current = true;
      playMatch();
      react('cheer', 'celebrando');
      setCombo((c) => c + 1);
      setScore((s) => s + 1 + Math.floor(combo / 3));
      nextWave(650);
    } else {
      playWrong();
      react('sad', 'reintentar');
      setCombo(0);
      setLives((l) => l - 1);
    }
  };
  const landed = (item) => {
    if (item.w.id !== drop.target.id || resolved.current) return;
    resolved.current = true;
    playWrong();
    react('sad', 'reintentar');
    setHit({ id: item.w.id, ok: false, landed: true });
    setCombo(0);
    setLives((l) => l - 1);
    nextWave(900);
  };
  const restart = () => {
    setWave(0);
    setLives(RAIN_LIVES);
    setScore(0);
    setCombo(0);
    rec.reset();
    setStatus('countdown');
  };

  if (status === 'countdown') return <Countdown onDone={() => setStatus('playing')} />;
  if (over) {
    return (
      <ResultScreen
        stars={score >= 20 ? 3 : score >= 10 ? 2 : score >= 3 ? 1 : 0}
        record={rec.record}
        big={score}
        unit="puntos atrapando palabras"
        note={!rec.record && rec.best ? `Récord: ${rec.best}` : null}
        language={language}
        onAgain={restart}
        onExit={onExit}
      />
    );
  }

  return (
    <GameFrame llama={llama} say={<p className="font-semibold">¡Atrapa la palabra que significa lo de arriba antes de que toque el suelo!</p>}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-2xl font-black tabular-nums">
            {score} <span className="text-base font-bold text-stone-500">puntos</span>
          </p>
          {combo >= 2 && (
            <p className="flex items-center gap-1 font-black text-orange-600">
              <Flame className="h-5 w-5 fill-orange-500" aria-hidden="true" /> ×{combo}
            </p>
          )}
          <Lives lives={lives} max={RAIN_LIVES} />
        </div>
        <div className={`relative h-[28rem] overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky-100 via-white to-amber-50 ring-1 ring-stone-200 shadow-inner`}>
          {/* El significado que se busca */}
          <AnimatePresence mode="wait">
            <m.div key={wave} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 top-0 z-10 flex justify-center p-3">
              <span className={`rounded-full bg-gradient-to-r ${theme.gradient} px-6 py-2 text-xl font-black text-white shadow-lg`}>{drop.target.spanish}</span>
            </m.div>
          </AnimatePresence>
          {/* Montañas al fondo y el suelo */}
          <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 60 L0 35 L40 15 L80 38 L130 8 L180 40 L230 18 L300 42 L300 60 Z" fill="#d6d3d1" opacity="0.6" />
            <rect x="0" y="52" width="300" height="8" fill="#a8a29e" />
          </svg>
          {drop.items.map((item) => {
            const state = hit?.id === item.w.id ? (hit.ok ? 'ok' : 'bad') : null;
            // Cada palabra cae por su carril (un tercio del ancho)
            return (
              <div key={`${wave}-${item.w.id}`} className="absolute inset-y-0 flex justify-center px-1" style={{ left: `${(item.lane / LANES) * 100}%`, width: `${100 / LANES}%` }}>
                <m.button
                  type="button"
                  onClick={() => tap(item)}
                  initial={{ y: 56, opacity: 0 }}
                  animate={state === 'ok' ? { scale: 1.3, opacity: 0 } : state === 'bad' && !hit.landed ? { x: [0, -10, 10, 0], opacity: 0.35 } : { y: 360, opacity: 1 }}
                  transition={state ? { duration: 0.4 } : { y: { duration: seconds, ease: 'linear', delay: item.delay }, opacity: { duration: 0.3, delay: item.delay } }}
                  onAnimationComplete={() => !state && landed(item)}
                  disabled={state === 'bad' || resolved.current}
                  className={`ficha h-fit max-w-full break-words rounded-2xl px-3 sm:px-4 py-3 text-lg sm:text-xl font-black shadow-lg ${state === 'ok' ? 'border-green-700 bg-green-500 text-white' : state === 'bad' ? 'border-red-600 bg-red-100 text-red-800' : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}`}
                  lang={language.lang}
                >
                  {item.w.target}
                </m.button>
              </div>
            );
          })}
          {hit?.ok && (
            <div className="absolute left-1/2 top-1/2">
              <Burst trigger={wave + 1} count={16} distance={90} />
              <FloatText trigger={wave + 1}>+{1 + Math.floor(Math.max(0, combo - 1) / 3)}</FloatText>
            </div>
          )}
          {hit?.landed && (
            <p className="absolute inset-x-0 bottom-28 text-center font-black text-red-700">
              Era <span lang={language.lang}>{drop.target.target}</span>
            </p>
          )}
        </div>
        <p className="mt-3 text-center text-sm text-stone-500">Cada vez caen más rápido. Cada 3 aciertos seguidos, ¡puntos extra!</p>
      </div>
    </GameFrame>
  );
};

// ==================== ¿Sí o no? ====================
// Una palabra y un significado: ¿van juntos? Toca, usa las flechas o arrastra la tarjeta.
const QUICK_SECONDS = 45;

export const QuickGame = ({ words, language, theme, idioma, onExit }) => {
  const makeCard = () => {
    const w = words[Math.floor(Math.random() * words.length)];
    const right = Math.random() < 0.5;
    const shown = right ? w : shuffle(words.filter((o) => o.id !== w.id))[0];
    return { w, meaning: shown.spanish, right, key: Math.random() };
  };
  const [status, setStatus] = useState('countdown');
  const [card, setCard] = useState(makeCard);
  const [left, setLeft] = useState(QUICK_SECONDS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState(null);
  const [llama, react] = useMood('sorprendida');
  const over = status === 'playing' && left <= 0;
  const rec = useRecord('sino', idioma, score, over);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const yesOpacity = useTransform(x, [20, 120], [0, 1]);
  const noOpacity = useTransform(x, [-120, -20], [1, 0]);

  useEffect(() => {
    if (status !== 'playing' || over) return undefined;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [status, over]);

  const decide = (yes) => {
    if (over || flash) return;
    const ok = yes === card.right;
    setFlash({ ok, key: card.key });
    if (ok) {
      playCorrect();
      setScore((s) => s + 1 + (streak >= 4 ? 1 : 0));
      setStreak((s) => s + 1);
      react('happy', 'celebrando');
    } else {
      playWrong();
      setStreak(0);
      react('sad', 'reintentar');
    }
    setTimeout(
      () => {
        x.set(0);
        setFlash(null);
        setCard(makeCard());
      },
      ok ? 350 : 1100
    );
  };

  useEffect(() => {
    if (status !== 'playing' || over) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 's') decide(true);
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'n') decide(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const restart = () => {
    setCard(makeCard());
    setLeft(QUICK_SECONDS);
    setScore(0);
    setStreak(0);
    rec.reset();
    setStatus('countdown');
  };

  if (status === 'countdown') return <Countdown onDone={() => setStatus('playing')} />;
  if (over) {
    return (
      <ResultScreen
        stars={score >= 25 ? 3 : score >= 15 ? 2 : score >= 5 ? 1 : 0}
        record={rec.record}
        big={score}
        unit={`puntos en ${QUICK_SECONDS} segundos`}
        note={!rec.record && rec.best ? `Récord: ${rec.best}` : null}
        language={language}
        onAgain={restart}
        onExit={onExit}
      />
    );
  }

  return (
    <GameFrame llama={llama} say={<p className="font-semibold">¿La palabra y el significado van juntos? ¡Decide rápido!</p>}>
      <div className="max-w-xl mx-auto">
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-2xl font-black tabular-nums">
            {score} <span className="text-base font-bold text-stone-500">puntos</span>
          </p>
          {streak >= 3 && (
            <p className="flex items-center gap-1 font-black text-orange-600">
              <Flame className="h-5 w-5 fill-orange-500" aria-hidden="true" /> {streak}
            </p>
          )}
          <p className={`flex items-center gap-1 text-2xl font-black tabular-nums ${left <= 10 ? 'text-red-600 anim-latido' : ''}`}>
            <Timer className="h-6 w-6" aria-hidden="true" /> {left}
          </p>
        </div>
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-stone-200">
          <m.div className={`h-full bg-gradient-to-r ${theme.gradient}`} animate={{ width: `${(left / QUICK_SECONDS) * 100}%` }} transition={{ ease: 'linear', duration: 1 }} />
        </div>
        <div className="relative h-80">
          <AnimatePresence>
            <m.div
              key={card.key}
              drag={flash ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.9}
              onDragEnd={(_, info) => {
                if (info.offset.x > 110) decide(true);
                else if (info.offset.x < -110) decide(false);
              }}
              style={{ x, rotate }}
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={flash ? (flash.ok ? { scale: 1.05, opacity: 1 } : { x: [0, -14, 14, -8, 8, 0] }) : { scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className={`absolute inset-0 flex cursor-grab flex-col items-center justify-center rounded-[2rem] p-6 text-center shadow-2xl ring-4 active:cursor-grabbing ${flash ? (flash.ok ? 'bg-green-50 ring-green-500' : 'bg-red-50 ring-red-500') : 'bg-white ring-white'}`}
            >
              <m.span style={{ opacity: yesOpacity }} className="absolute right-6 top-6 rotate-12 rounded-xl border-4 border-green-600 px-3 py-1 text-2xl font-black text-green-700">
                SÍ
              </m.span>
              <m.span style={{ opacity: noOpacity }} className="absolute left-6 top-6 -rotate-12 rounded-xl border-4 border-red-600 px-3 py-1 text-2xl font-black text-red-700">
                NO
              </m.span>
              <button type="button" onClick={() => speak(card.w.target, voiceOf(card.w, language))} className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full text-white ${theme.solid}`} aria-label="Escuchar">
                <Volume2 className="h-6 w-6" aria-hidden="true" />
              </button>
              <p className={`text-4xl sm:text-5xl font-black ${theme.text}`} lang={language.lang}>
                {card.w.target}
              </p>
              <p className="my-3 text-sm font-black uppercase tracking-widest text-stone-400">significa</p>
              <p className="text-3xl font-black text-stone-800">{card.meaning}</p>
              {flash && !flash.ok && (
                <p className="mt-4 font-bold text-red-700">
                  {card.right ? '¡Sí iban juntos!' : `No: significa «${card.w.spanish}»`}
                </p>
              )}
            </m.div>
          </AnimatePresence>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <button type="button" onClick={() => decide(false)} className="ficha flex min-h-16 items-center justify-center gap-2 rounded-2xl border-red-700 bg-red-500 text-2xl font-black text-white hover:bg-red-400">
            <X className="h-7 w-7" aria-hidden="true" /> No
          </button>
          <button type="button" onClick={() => decide(true)} className="ficha flex min-h-16 items-center justify-center gap-2 rounded-2xl border-green-800 bg-green-600 text-2xl font-black text-white hover:bg-green-500">
            <Check className="h-7 w-7" aria-hidden="true" /> Sí
          </button>
        </div>
        <p className="mt-3 text-center text-sm text-stone-500">Arrastra la tarjeta a la derecha (sí) o a la izquierda (no), o usa las flechas.</p>
      </div>
    </GameFrame>
  );
};
