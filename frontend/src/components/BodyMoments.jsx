// El cuerpo dentro de todo el programa: cuando una palabra de una lección, del diccionario o de un juego
// es una parte del cuerpo, se puede ver en el modelo 3D, oír una frase con ella y decirla al micrófono.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import * as m from 'motion/react-m';
import { X, Volume2, Hand, Mic } from 'lucide-react';
import { GiVitruvianMan } from 'react-icons/gi';
import BodyFigure from './BodyFigure';
import SpeakPractice from './SpeakPractice';
import Mascot from './Mascot';
import { Burst } from './GameFx';
import { partesDe, frasesParte } from '../data/cuerpoNumeros';
import { speak } from '../utils/speech';
import { playTap } from '../utils/sounds';

// Botón pequeño que aparece junto a una palabra del cuerpo
export const BodyChip = ({ onClick, className = '' }) => (
  <button
    type="button"
    onClick={() => {
      playTap();
      onClick();
    }}
    className={`ficha inline-flex min-h-11 items-center gap-1.5 rounded-xl border-amber-400 bg-amber-50 px-3 text-sm font-black text-amber-900 hover:bg-amber-100 ${className}`}
  >
    <GiVitruvianMan className="h-5 w-5" aria-hidden="true" /> Ver en el cuerpo
  </button>
);

// Ventana con el cuerpo en 3D señalando la parte, sus frases y el micrófono
export const BodyPeek = ({ part, word, url, idioma, language, theme, onClose }) => {
  const [tab, setTab] = useState('ver');
  const [vista, setVista] = useState(part.vista);
  const text = word || part[idioma];
  const fr = frasesParte(part, idioma);
  const voice = { idioma, lang: language?.voz?.respaldo };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/50 p-0 sm:p-6 backdrop-blur-sm" onClick={onClose}>
      <m.div
        role="dialog"
        aria-modal="true"
        aria-label={`${text} en el cuerpo`}
        initial={{ y: 60, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.25, duration: 0.45 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white p-5 sm:p-7 shadow-2xl"
      >
        <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200">
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] items-start">
          <div className="rounded-3xl bg-stone-50 p-4 ring-1 ring-stone-200">
            <BodyFigure parts={[part]} vista={vista} onFlip={setVista} active={part.id} label={() => text} color={theme?.hex} />
          </div>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-stone-500">{language?.nombre} · parte del cuerpo</p>
              <p className={`text-5xl font-black leading-none ${theme?.text ?? ''}`} lang={language?.lang}>
                {text}
              </p>
              <p className="mt-1 text-xl text-stone-600">
                {part.art} {part.es}
              </p>
            </div>
            <div className="flex rounded-2xl bg-stone-100 p-1 w-fit" role="tablist">
              {[
                ['ver', 'Frases', Volume2],
                ['decir', 'Dilo tú', Mic],
              ].map(([id, label, Icon]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-black ${tab === id ? 'bg-white shadow text-stone-900' : 'text-stone-600'}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
            {tab === 'ver' ? (
              <div className="grid gap-3">
                {[fr.es, fr.toca].map((f) => (
                  <button key={f.original} type="button" onClick={() => speak(f.original, voice)} className="ficha rounded-2xl border-stone-200 bg-white p-4 text-left hover:bg-stone-50">
                    <span className="flex items-center gap-2 text-xl font-black" lang={language?.lang}>
                      <Volume2 className="h-5 w-5 shrink-0" aria-hidden="true" /> {f.original}
                    </span>
                    <span className="mt-1 block text-stone-600 italic">{f.traduccion}</span>
                  </button>
                ))}
                <p className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
                  <Hand className="h-5 w-5 shrink-0" aria-hidden="true" /> Señala tu {part.art === 'la' ? 'propia' : 'propio'} {part.es} mientras lo dices. ¡Así se recuerda mejor!
                </p>
              </div>
            ) : (
              <SpeakPractice text={text} meaning={`${part.art} ${part.es}`} url={url} language={language} theme={theme} compact />
            )}
          </div>
        </div>
      </m.div>
    </div>,
    document.body
  );
};

// Ejercicio de lección: oír la palabra y tocarla en el cuerpo 3D
export const BodyTapExercise = ({ part, word, idioma, language, theme, answered, onAnswer, onSkip }) => {
  const parts = useMemo(() => partesDe(idioma), [idioma]);
  const [vista, setVista] = useState('frente');
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(null);
  const text = word || part[idioma];
  const voice = { idioma, lang: language?.voz?.respaldo };

  useEffect(() => {
    if (ready) speak(text, voice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, text]);

  const pick = (p) => {
    if (answered || flash) return;
    const ok = p.id === part.id;
    setFlash({ id: p.id, ok });
    if (!ok) setVista(part.vista);
    onAnswer(ok, text, { respuesta: p[idioma] || p.es });
  };

  return (
    <div>
      <p className={`mb-3 text-sm font-black uppercase tracking-wider ${theme?.text ?? ''}`}>Toca en el cuerpo</p>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] items-start">
        <div className="space-y-4">
          <Mascot
            pose="hablando"
            size="w-20 sm:w-28"
            eager
            say={
              <div>
                <p className="font-semibold">¿Dónde está…?</p>
                <p className="text-3xl font-black" lang={language?.lang}>
                  {text}
                </p>
              </div>
            }
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => speak(text, voice)} className={`ficha inline-flex min-h-12 items-center gap-2 rounded-2xl border-black/20 px-5 font-black text-white ${theme?.solid ?? 'bg-green-700'}`}>
              <Volume2 className="h-5 w-5" aria-hidden="true" /> Escuchar
            </button>
            {onSkip && !answered && (
              <button type="button" onClick={onSkip} className="ficha min-h-12 rounded-2xl border-stone-300 bg-white px-5 font-bold text-stone-600">
                Saltar
              </button>
            )}
          </div>
          {part.vista === 'espalda' && vista === 'frente' && !flash && <p className="text-sm font-bold text-amber-700">Pista: gira el cuerpo, quizá esté detrás.</p>}
        </div>
        <div className="relative rounded-3xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <BodyFigure onReady={setReady} parts={parts} vista={vista} onFlip={setVista} flash={flash} onPick={pick} active={flash ? part.id : undefined} label={flash ? (p) => p[idioma] : undefined} color={theme?.hex} />
          {flash?.ok && <Burst trigger={1} count={14} distance={70} />}
        </div>
      </div>
    </div>
  );
};
