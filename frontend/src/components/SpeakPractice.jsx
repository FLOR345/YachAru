// "¡Dilo tú!": escuchas la palabra, la dices al micrófono y el calificador te dice si aprobaste,
// con una nota por sonidos, ritmo, duración y sílabas, y un consejo. La grabación no sale del dispositivo.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Mic, Square, Volume2, Snail, RotateCcw, Play, MicOff, Star, Loader2, X, CheckCircle2, XCircle, Lightbulb, Ear } from 'lucide-react';
import { speak, resolveAudio, loadAudioIndex, audioKey } from '../utils/speech';
import { canRecord, startRecording, loadModel, peaks } from '../utils/voice';
import { grade, stars as starsOf, PASS } from '../utils/grader';
import { playCorrect, playTap, playWrong } from '../utils/sounds';
import Mascot from './Mascot';

const LIVE_BARS = 28;

// Palabras con las que comparar: las dadas (p. ej. las de la lección) o, si no hay, otras del índice
// de audios de la lengua con un largo parecido. Así ningún sonido cualquiera aprueba.
const pickCohort = async (text, given, idioma) => {
  const own = given.filter((c) => c.text !== text);
  if (own.length >= 2) return own.slice(0, 5);
  const index = idioma ? await loadAudioIndex(idioma) : {};
  const key = audioKey(text);
  const keys = Object.keys(index).filter((k) => k !== key && k.split(' ').length <= 3 && Math.abs(k.length - key.length) <= Math.max(3, key.length * 0.5));
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return [...own, ...keys.slice(0, 5 - own.length).map((k) => ({ text: k, url: index[k][0] }))];
};

const Wave = ({ env, color, label, onPlay, active }) => (
  <button
    type="button"
    onClick={onPlay}
    disabled={!onPlay}
    className="group flex w-full items-center gap-3 rounded-2xl bg-white/90 px-3 py-2 ring-1 ring-stone-200 transition hover:ring-stone-300 disabled:cursor-default"
    aria-label={`Escuchar ${label}`}
  >
    <span className="w-14 shrink-0 text-left text-[11px] font-black uppercase tracking-wider text-stone-500">{label}</span>
    <span className="flex h-10 flex-1 items-center gap-[3px]" aria-hidden="true">
      {peaks(env, 44).map((v, i) => (
        // Cada barra ocupa toda la altura y se escala desde el centro
        <m.span
          key={i}
          className="block h-10 flex-1 rounded-full"
          style={{ background: color }}
          initial={{ scaleY: 0.08 }}
          animate={{ scaleY: v, opacity: active ? [1, 0.45, 1] : 1 }}
          transition={{ delay: i * 0.01, type: 'spring', bounce: 0.4, ...(active ? { opacity: { duration: 0.5, repeat: Infinity } } : {}) }}
        />
      ))}
    </span>
    {onPlay && (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 group-hover:bg-stone-200" aria-hidden="true">
        <Play className="h-4 w-4 fill-current" />
      </span>
    )}
  </button>
);

const ScoreRing = ({ score, passed }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = passed ? '#16a34a' : score >= 40 ? '#f59e0b' : '#e11d48';
  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`Nota: ${score} de 100`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} stroke="#e7e5e4" strokeWidth="7" fill="none" />
        <m.circle cx="40" cy="40" r={r} stroke={color} strokeWidth="7" strokeLinecap="round" fill="none" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }} transition={{ duration: 1, ease: 'easeOut' }} />
        {/* marca de la nota mínima para aprobar */}
        <line x1="40" y1="2" x2="40" y2="10" stroke="#57534e" strokeWidth="2" transform={`rotate(${(PASS / 100) * 360} 40 40)`} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black tabular-nums leading-none">{score}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">de 100</span>
      </span>
    </div>
  );
};

const CRITERIA_COLORS = { sonidos: 'from-fuchsia-500 to-rose-500', ritmo: 'from-sky-500 to-indigo-500', duracion: 'from-amber-400 to-orange-500', silabas: 'from-emerald-400 to-teal-600' };

const CriteriaBars = ({ criteria }) => (
  <ul className="grid gap-2 sm:grid-cols-2">
    {criteria.map((c, i) => (
      <li key={c.id} className="rounded-xl bg-white/90 px-3 py-2 ring-1 ring-stone-200">
        <div className="flex items-center justify-between text-sm font-black">
          <span>{c.label}</span>
          <span className="tabular-nums text-stone-600">{c.score}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
          <m.div className={`h-full rounded-full bg-gradient-to-r ${CRITERIA_COLORS[c.id]}`} initial={{ width: 0 }} animate={{ width: `${c.score}%` }} transition={{ delay: 0.3 + i * 0.12, duration: 0.7, ease: 'easeOut' }} />
        </div>
      </li>
    ))}
  </ul>
);

/**
 * text: lo que se dice (en la lengua); meaning: su significado; url: audio de la palabra.
 * cohort: otras palabras [{ text, url }] con las que se compara (así no aprueba cualquier sonido).
 * onResult(result): tras cada intento; result es la salida de grade() o { score: null, unavailable: true }.
 * tries / maxTries: para mostrar "Intento 2 de 3" (en las lecciones).
 */
const SpeakPractice = ({ text, meaning, url, language, theme, onResult, cohort = [], compact = false, autoPlay = true, tries, maxTries }) => {
  const [status, setStatus] = useState(canRecord() ? 'idle' : 'unsupported');
  const [levels, setLevels] = useState(() => Array(LIVE_BARS).fill(0));
  const [mine, setMine] = useState(null); // { url, analysis }
  const [model, setModel] = useState(undefined); // análisis; null si no se puede leer
  const [result, setResult] = useState(null);
  const [playing, setPlaying] = useState(null);
  const recording = useRef(null);
  const jobs = useRef({ model: Promise.resolve(null), cohort: Promise.resolve([]) });
  const idioma = language?.id;
  const voice = { url, idioma, lang: language?.voz?.respaldo };
  const color = theme?.hex ?? '#15803d';
  const cohortKey = cohort.map((c) => c.text).join('|');

  // La voz modelo (la misma que suena al tocar el parlante) y las de comparación
  useEffect(() => {
    let off = false;
    setModel(undefined);
    setResult(null);
    setMine(null);
    jobs.current.model = resolveAudio(text, { url, idioma }).then(loadModel);
    jobs.current.model.then((a) => !off && setModel(a));
    jobs.current.cohort = pickCohort(text, cohort, idioma).then((list) =>
      Promise.all(
        list.map((c) =>
          resolveAudio(c.text, { url: c.url, idioma })
            .then(loadModel)
            .then((analysis) => ({ text: c.text, analysis }))
        )
      )
    );
    const t = autoPlay ? setTimeout(() => speak(text, voice), 350) : null;
    return () => {
      off = true;
      clearTimeout(t);
      recording.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, url, idioma, cohortKey]);

  useEffect(() => () => mine?.url && URL.revokeObjectURL(mine.url), [mine]);

  // Sin micrófono se puede seguir: decirla en voz alta también cuenta
  useEffect(() => {
    if (status === 'unsupported' || status === 'denied' || status === 'error') onResult?.({ score: null, unavailable: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const record = async () => {
    if (status === 'recording') return recording.current?.stop();
    playTap();
    setStatus('asking');
    try {
      const rec = await startRecording({ onLevel: (v) => setLevels((l) => [...l.slice(1), v]) });
      recording.current = rec;
      setStatus('recording');
      const take = await rec.done;
      setStatus('analyzing');
      const [reference, others] = await Promise.all([jobs.current.model, jobs.current.cohort]);
      const r = reference ? grade(reference, take.analysis, others) : { score: null, passed: false, issue: 'modelo', tip: 'Escúchate y compara con la voz de la app.' };
      setMine(take);
      setResult(r);
      setLevels(Array(LIVE_BARS).fill(0));
      setStatus('done');
      if (r.passed) playCorrect();
      else if (r.score != null) playWrong();
      onResult?.(r);
    } catch (error) {
      setStatus(error?.name === 'NotAllowedError' || error?.name === 'SecurityError' ? 'denied' : 'error');
    }
  };

  const playMine = () => {
    if (!mine) return;
    const a = new Audio(mine.url);
    setPlaying('mine');
    a.onended = () => setPlaying(null);
    a.play().catch(() => setPlaying(null));
  };
  const playModel = (slow = false) => {
    setPlaying('model');
    speak(text, { ...voice, slow });
    setTimeout(() => setPlaying(null), slow ? 1800 : 1200);
  };

  const unavailable = status === 'unsupported' || status === 'denied' || status === 'error';
  const graded = status === 'done' && result;
  const verdict = graded && result.score != null ? (result.passed ? 'ok' : result.score >= 40 ? 'casi' : 'no') : null;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      {/* La palabra */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme?.gradient ?? 'from-green-600 to-green-800'} p-5 sm:p-6 text-white shadow-lg`}>
        <span className="brillo-liquido" aria-hidden="true" />
        <span className="tejido-andino absolute inset-x-0 bottom-0 h-1.5" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className={`${compact ? 'text-3xl' : 'text-4xl sm:text-5xl'} font-black leading-tight break-words drop-shadow`} lang={language?.lang}>
              {[...text].map((ch, i) => (
                <m.span key={`${text}-${i}`} className="inline-block" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, type: 'spring', bounce: 0.5 }}>
                  {ch === ' ' ? ' ' : ch}
                </m.span>
              ))}
            </p>
            {meaning && <p className="mt-1 text-lg font-semibold text-white/85">{meaning}</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => playModel()} aria-label={`Escuchar ${text}`} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-stone-900 shadow-md transition hover:scale-105 active:scale-95">
              <Volume2 className={`h-7 w-7 ${playing === 'model' ? 'anim-latido' : ''}`} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => playModel(true)} aria-label="Escuchar despacio" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white ring-1 ring-white/40 backdrop-blur transition hover:bg-white/30 active:scale-95">
              <Snail className="h-7 w-7" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {unavailable ? (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200" role="alert">
          <MicOff className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-black">{status === 'unsupported' ? 'Este navegador no permite grabar.' : status === 'denied' ? 'No tenemos permiso para usar tu micrófono.' : 'No pudimos grabar.'}</p>
            <p className="text-sm">
              {status === 'denied' ? 'Actívalo en el candado de la barra de direcciones y vuelve a intentarlo. ' : ''}
              Puedes decir la palabra en voz alta igual, pero sin micrófono no hay nota.
            </p>
            {status !== 'unsupported' && (
              <button type="button" onClick={() => setStatus('idle')} className="mt-2 min-h-11 font-bold underline underline-offset-4">
                Volver a intentar
              </button>
            )}
          </div>
        </div>
      ) : (
        !graded && (
          // El micrófono, con las barras de tu voz en vivo
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="relative flex items-center justify-center">
              <AnimatePresence>
                {status === 'recording' &&
                  [0, 1, 2].map((i) => (
                    <m.span
                      key={i}
                      className="absolute h-full w-full rounded-full"
                      style={{ background: '#e11d48' }}
                      initial={{ opacity: 0.3, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.9 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.53, ease: 'easeOut' }}
                      aria-hidden="true"
                    />
                  ))}
              </AnimatePresence>
              {status === 'idle' && <span className="absolute h-full w-full animate-ping rounded-full opacity-20" style={{ background: color }} aria-hidden="true" />}
              <m.button
                type="button"
                onClick={record}
                disabled={status === 'asking' || status === 'analyzing'}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.9 }}
                animate={{ scale: status === 'recording' ? 1 + levels[LIVE_BARS - 1] * 0.25 : 1 }}
                aria-label={status === 'recording' ? 'Detener la grabación' : 'Grabar mi voz'}
                className={`relative flex ${compact ? 'h-24 w-24' : 'h-28 w-28'} items-center justify-center rounded-full text-white shadow-2xl ring-8 ring-white ${status === 'recording' ? 'bg-gradient-to-br from-rose-500 to-red-700' : 'bg-gradient-to-br from-rose-500 to-fuchsia-700'}`}
              >
                {status === 'recording' ? (
                  <Square className="h-10 w-10 fill-white" aria-hidden="true" />
                ) : status === 'asking' || status === 'analyzing' ? (
                  <Loader2 className="h-11 w-11 animate-spin" aria-hidden="true" />
                ) : (
                  <Mic className="h-12 w-12" aria-hidden="true" />
                )}
              </m.button>
            </div>
            <div className="flex h-12 items-center gap-1" aria-hidden="true">
              {levels.map((v, i) => (
                <span key={i} className="w-1.5 rounded-full bg-gradient-to-t from-rose-500 to-fuchsia-500 transition-[height] duration-75" style={{ height: `${Math.max(6, v * 48)}px`, opacity: status === 'recording' ? 1 : 0.25 }} />
              ))}
            </div>
            <p className="text-center text-lg font-black text-stone-800" aria-live="polite">
              {status === 'recording' ? '¡Te escucho! Di la palabra…' : status === 'asking' ? 'Permite el micrófono…' : status === 'analyzing' ? 'Calificando tu voz…' : 'Toca el micrófono y dila en voz alta'}
            </p>
            {maxTries && tries != null && (
              <p className="text-sm font-bold text-stone-500">
                Intento {Math.min(tries + 1, maxTries)} de {maxTries} · aprueba con {PASS} o más
              </p>
            )}
          </div>
        )
      )}

      {/* Resultado del calificador */}
      <AnimatePresence>
        {graded && (
          <m.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
            className={`space-y-4 rounded-3xl p-4 sm:p-5 ring-2 ${verdict === 'ok' ? 'bg-green-50 ring-green-300' : verdict === 'casi' ? 'bg-amber-50 ring-amber-300' : verdict === 'no' ? 'bg-rose-50 ring-rose-300' : 'bg-stone-50 ring-stone-200'}`}
            role="status"
          >
            {result.score != null ? (
              <div className="flex flex-wrap items-center gap-4">
                <ScoreRing score={result.score} passed={result.passed} />
                <div className="min-w-0 flex-1">
                  <p className={`flex items-center gap-2 text-2xl font-black ${verdict === 'ok' ? 'text-green-800' : verdict === 'casi' ? 'text-amber-800' : 'text-rose-800'}`}>
                    {verdict === 'ok' ? <CheckCircle2 className="h-7 w-7" aria-hidden="true" /> : <XCircle className="h-7 w-7" aria-hidden="true" />}
                    {verdict === 'ok' ? '¡Aprobado!' : verdict === 'casi' ? '¡Casi! Otra vez' : 'Inténtalo otra vez'}
                  </p>
                  <p className="mt-1 flex gap-1" aria-label={`${starsOf(result.score)} de 3 estrellas`}>
                    {[0, 1, 2].map((i) => (
                      <m.span key={i} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.5 + i * 0.15, type: 'spring', bounce: 0.6 }}>
                        <Star className={`h-7 w-7 ${i < starsOf(result.score) ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} aria-hidden="true" />
                      </m.span>
                    ))}
                  </p>
                </div>
                {!compact && (
                  <div className="hidden sm:block">
                    <Mascot mood={verdict === 'ok' ? 'cheer' : verdict === 'casi' ? 'happy' : 'sad'} pose={verdict === 'ok' ? 'celebrando' : verdict === 'casi' ? 'pensando' : 'reintentar'} size="w-20" eager />
                  </div>
                )}
              </div>
            ) : (
              <p className="flex items-center gap-2 font-black text-stone-800">
                <Ear className="h-6 w-6" aria-hidden="true" /> {result.issue === 'silencio' ? 'No escuchamos tu voz.' : 'Escúchate y compara.'}
              </p>
            )}
            <p className="flex items-start gap-2 rounded-2xl bg-white/90 p-3 font-semibold text-stone-800 ring-1 ring-stone-200">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" /> {result.tip}
            </p>
            {result.criteria && <CriteriaBars criteria={result.criteria} />}
            {model && <Wave env={model.env} color="#a8a29e" label="Modelo" onPlay={() => playModel()} active={playing === 'model'} />}
            {mine && <Wave env={mine.analysis.env} color={color} label="Tú" onPlay={playMine} active={playing === 'mine'} />}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {(!maxTries || tries == null || tries < maxTries) && (
                <button type="button" onClick={record} className="ficha inline-flex min-h-12 items-center gap-2 rounded-2xl border-rose-700 bg-rose-500 px-5 font-black text-white hover:bg-rose-400">
                  <RotateCcw className="h-5 w-5" aria-hidden="true" /> Grabar otra vez
                </button>
              )}
              <p className="text-xs text-stone-500 max-w-xs">Calificación automática y orientativa: compara tu voz con la de la app. Tu grabación no sale de este dispositivo.</p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Botón de micrófono pequeño para poner junto a cualquier palabra
export const MicButton = ({ onClick, label, className = '' }) => (
  <button
    type="button"
    onClick={() => {
      playTap();
      onClick();
    }}
    aria-label={label}
    title="Dilo tú: graba tu voz y recibe una nota"
    className={`ficha flex h-11 w-11 items-center justify-center rounded-xl border-fuchsia-800 bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white hover:brightness-110 ${className}`}
  >
    <Mic className="h-5 w-5" aria-hidden="true" />
  </button>
);

// Ventana "¡Dilo tú!" para cualquier palabra de la app
export const SpeakModal = ({ onClose, ...props }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/60 sm:p-6 backdrop-blur-sm" onClick={onClose}>
      <m.div
        role="dialog"
        aria-modal="true"
        aria-label={`Dilo tú: ${props.text}`}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.25, duration: 0.45 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white p-5 sm:p-7 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-rose-600">
            <Mic className="h-5 w-5" aria-hidden="true" /> ¡Dilo tú!
          </p>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200">
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <SpeakPractice {...props} />
      </m.div>
    </div>,
    document.body
  );
};

export default SpeakPractice;
