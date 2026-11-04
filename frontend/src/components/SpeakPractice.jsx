// "¡Dilo tú!": escuchas la palabra, la dices al micrófono y ves tu voz junto a la de la app.
// La grabación no sale del dispositivo. El parecido mide ritmo y duración, no cada sonido.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Mic, Square, Volume2, Snail, RotateCcw, Play, MicOff, Star, Loader2, X } from 'lucide-react';
import { speak, resolveAudio } from '../utils/speech';
import { canRecord, startRecording, loadModelEnvelope, similarity, verdict, peaks } from '../utils/voice';
import { playCorrect, playTap } from '../utils/sounds';

const Wave = ({ env, color, label, onPlay, active }) => (
  <button
    type="button"
    onClick={onPlay}
    disabled={!onPlay}
    className="group flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-stone-200 hover:ring-stone-300 disabled:cursor-default"
    aria-label={`Escuchar ${label}`}
  >
    <span className="w-16 shrink-0 text-left text-xs font-black uppercase tracking-wider text-stone-500">{label}</span>
    <span className="flex h-12 flex-1 items-center gap-[3px]" aria-hidden="true">
      {peaks(env ?? [], 40).map((v, i) => (
        // Cada barra ocupa toda la altura y se escala desde el centro
        <m.span
          key={i}
          className="block h-12 flex-1 rounded-full"
          style={{ background: color }}
          initial={{ scaleY: 0.1 }}
          animate={{ scaleY: env ? v : 0.08, opacity: active ? [1, 0.5, 1] : 1 }}
          transition={{ delay: i * 0.012, type: 'spring', bounce: 0.4, ...(active ? { opacity: { duration: 0.6, repeat: Infinity } } : {}) }}
        />
      ))}
    </span>
    {onPlay && <Play className="h-5 w-5 shrink-0 text-stone-500 group-hover:text-stone-800" aria-hidden="true" />}
  </button>
);

const ScoreRing = ({ score, color }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`Parecido: ${score} de 100`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} stroke="#e7e5e4" strokeWidth="8" fill="none" />
        <m.circle cx="40" cy="40" r={r} stroke={color} strokeWidth="8" strokeLinecap="round" fill="none" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-black tabular-nums">{score}</span>
    </div>
  );
};

/**
 * text: lo que se dice (en la lengua); meaning: su significado; url: audio de la palabra.
 * onResult(score | null): al terminar cada intento (null si no hubo voz o no hay con qué comparar).
 */
const SpeakPractice = ({ text, meaning, url, language, theme, onResult, compact = false, autoPlay = true }) => {
  const [status, setStatus] = useState(canRecord() ? 'idle' : 'unsupported');
  const [level, setLevel] = useState(0);
  const [mine, setMine] = useState(null); // { url, env }
  const [model, setModel] = useState(undefined); // envolvente, null si no se puede leer
  const [score, setScore] = useState(null);
  const [playing, setPlaying] = useState(null);
  const recording = useRef(null);
  const modelJob = useRef(Promise.resolve(null));
  const idioma = language?.id;
  const voice = { url, idioma, lang: language?.voz?.respaldo };

  // La voz modelo: la misma que suena al tocar el parlante
  useEffect(() => {
    let off = false;
    setModel(undefined);
    modelJob.current = resolveAudio(text, { url, idioma }).then(loadModelEnvelope);
    modelJob.current.then((env) => !off && setModel(env));
    const t = autoPlay ? setTimeout(() => speak(text, voice), 350) : null;
    return () => {
      off = true;
      clearTimeout(t);
      recording.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, url, idioma]);

  useEffect(() => () => mine?.url && URL.revokeObjectURL(mine.url), [mine]);

  // Sin micrófono se puede seguir: decirla en voz alta también cuenta
  useEffect(() => {
    if (status === 'unsupported' || status === 'denied' || status === 'error') onResult?.(null, { unavailable: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const record = async () => {
    if (status === 'recording') return recording.current?.stop();
    playTap();
    setStatus('asking');
    try {
      const rec = await startRecording({ onLevel: setLevel });
      recording.current = rec;
      setStatus('recording');
      const result = await rec.done;
      setStatus('analyzing');
      const reference = await modelJob.current;
      const s = reference ? similarity(reference, result.env) : null;
      setMine(result);
      setScore(s);
      setStatus('done');
      if (s != null && s >= 60) playCorrect();
      onResult?.(s, { voice: Math.max(...result.env) > 0 });
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
  const playModel = () => {
    setPlaying('model');
    speak(text, voice);
    setTimeout(() => setPlaying(null), 1200);
  };

  const v = verdict(mine ? score : undefined);
  const color = theme?.hex ?? '#15803d';

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className={`${compact ? 'text-3xl' : 'text-4xl sm:text-5xl'} font-black leading-tight break-words`} lang={language?.lang}>
            {text}
          </p>
          {meaning && <p className="mt-1 text-lg text-stone-600">{meaning}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => speak(text, voice)} aria-label={`Escuchar ${text}`} className={`ficha flex h-14 w-14 items-center justify-center rounded-2xl border-black/20 text-white ${theme?.solid ?? 'bg-green-700'}`}>
            <Volume2 className="h-7 w-7" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => speak(text, { ...voice, slow: true })} aria-label="Escuchar despacio" className="ficha flex h-14 w-14 items-center justify-center rounded-2xl border-stone-300 bg-white text-stone-700">
            <Snail className="h-7 w-7" aria-hidden="true" />
          </button>
        </div>
      </div>

      {status === 'unsupported' || status === 'denied' || status === 'error' ? (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200" role="alert">
          <MicOff className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-black">
              {status === 'unsupported' ? 'Este navegador no permite grabar.' : status === 'denied' ? 'No tenemos permiso para usar tu micrófono.' : 'No pudimos grabar.'}
            </p>
            <p className="text-sm">
              {status === 'denied' ? 'Actívalo en el candado de la barra de direcciones y vuelve a intentarlo. ' : ''}
              Puedes decir la palabra en voz alta igual: ¡también cuenta!
            </p>
            {status !== 'unsupported' && (
              <button type="button" onClick={() => setStatus('idle')} className="mt-2 min-h-11 font-bold underline underline-offset-4">
                Volver a intentar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {/* Anillos que crecen con tu voz */}
            <AnimatePresence>
              {status === 'recording' &&
                [0, 1].map((i) => (
                  <m.span
                    key={i}
                    className="absolute inset-0 rounded-full"
                    style={{ background: color }}
                    initial={{ opacity: 0.35, scale: 1 }}
                    animate={{ opacity: 0.15 + level * 0.3, scale: 1 + level * (0.5 + i * 0.4) }}
                    exit={{ opacity: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    aria-hidden="true"
                  />
                ))}
            </AnimatePresence>
            <m.button
              type="button"
              onClick={record}
              disabled={status === 'asking' || status === 'analyzing'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              animate={status === 'idle' && !mine ? { y: [0, -4, 0] } : { y: 0 }}
              transition={status === 'idle' && !mine ? { duration: 1.6, repeat: Infinity } : undefined}
              aria-label={status === 'recording' ? 'Detener la grabación' : 'Grabar mi voz'}
              className={`relative flex ${compact ? 'h-20 w-20' : 'h-24 w-24'} items-center justify-center rounded-full text-white shadow-xl ring-4 ring-white ${status === 'recording' ? 'bg-rose-600' : theme?.solid ?? 'bg-green-700'}`}
            >
              {status === 'recording' ? <Square className="h-9 w-9 fill-white" aria-hidden="true" /> : status === 'asking' || status === 'analyzing' ? <Loader2 className="h-10 w-10 animate-spin" aria-hidden="true" /> : <Mic className="h-10 w-10" aria-hidden="true" />}
            </m.button>
          </div>
          <p className="text-center font-bold text-stone-700" aria-live="polite">
            {status === 'recording' ? '¡Te escucho! Di la palabra…' : status === 'asking' ? 'Permite el micrófono…' : status === 'analyzing' ? 'Comparando…' : mine ? 'Toca el micrófono para intentarlo otra vez' : 'Toca el micrófono y dila en voz alta'}
          </p>
        </div>
      )}

      <AnimatePresence>
        {mine && status === 'done' && (
          <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3 rounded-3xl bg-stone-50 p-4 ring-1 ring-stone-200">
            <div className="flex items-center gap-4">
              {score != null && <ScoreRing score={score} color={color} />}
              <div className="min-w-0">
                {score != null && (
                  <p className="flex gap-1" aria-label={`${v.stars} de 3 estrellas`}>
                    {[0, 1, 2].map((i) => (
                      <m.span key={i} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.4 + i * 0.15, type: 'spring', bounce: 0.6 }}>
                        <Star className={`h-7 w-7 ${i < v.stars ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} aria-hidden="true" />
                      </m.span>
                    ))}
                  </p>
                )}
                <p className="mt-1 font-black">{model === null ? 'Escúchate y compara con la voz de la app.' : v.text}</p>
                <p className="text-xs text-stone-500">Compara ritmo y duración; es orientativo. Tu grabación no sale de este dispositivo.</p>
              </div>
            </div>
            {model && <Wave env={model} color="#a8a29e" label="Modelo" onPlay={playModel} active={playing === 'model'} />}
            <Wave env={mine.env} color={color} label="Tú" onPlay={playMine} active={playing === 'mine'} />
            <button type="button" onClick={record} className="inline-flex min-h-11 items-center gap-2 font-bold text-stone-700 hover:text-stone-900">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Grabar otra vez
            </button>
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
    title="Dilo tú: graba tu voz"
    className={`ficha flex h-11 w-11 items-center justify-center rounded-xl border-rose-700 bg-rose-500 text-white hover:bg-rose-400 ${className}`}
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/50 sm:p-6 backdrop-blur-sm" onClick={onClose}>
      <m.div
        role="dialog"
        aria-modal="true"
        aria-label={`Dilo tú: ${props.text}`}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.25, duration: 0.45 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white p-6 sm:p-8 shadow-2xl"
      >
        <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200">
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
        <p className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-rose-600">
          <Mic className="h-5 w-5" aria-hidden="true" /> ¡Dilo tú!
        </p>
        <SpeakPractice {...props} />
      </m.div>
    </div>,
    document.body
  );
};

export default SpeakPractice;
