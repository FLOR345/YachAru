// Piezas compartidas por todos los juegos de práctica: barajar, récords del dispositivo,
// la llamita que reacciona, el marco del juego y las pantallas de inicio y de resultado.
import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import Mascot from '../Mascot';
import { Confetti, Stars } from '../GameFx';
import ShinyText from '../reactbits/ShinyText';

export const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const readBest = (key) => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};
export const writeBest = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // sin almacenamiento: el récord dura esta visita
  }
};
export const bestKey = (game, idioma) => `simiaru-record-${game}-${idioma}`;

// ==================== Piezas compartidas ====================
export const primaryBtn = 'ficha min-h-14 px-8 rounded-2xl border-green-800 bg-green-600 hover:bg-green-500 text-white text-lg font-black uppercase tracking-wide inline-flex items-center justify-center gap-2';
export const secondaryBtn = 'ficha min-h-14 px-8 rounded-2xl border-stone-300 bg-white font-bold text-stone-700 hover:bg-stone-50';

// La llamita reacciona: cada reacción tiene un ánimo (cómo se mueve) y una pose (qué hace)
export const useMood = (restPose) => {
  const [state, setState] = useState({ mood: 'idle', pose: restPose, beat: 0 });
  const react = useCallback((mood, pose) => setState((s) => ({ mood, pose: pose ?? s.pose, beat: s.beat + 1 })), []);
  // Tras celebrar o lamentarse, vuelve a su pose de juego
  useEffect(() => {
    if (state.beat === 0) return undefined;
    const t = setTimeout(() => setState((s) => ({ ...s, mood: 'idle', pose: restPose })), 1500);
    return () => clearTimeout(t);
  }, [state.beat, restPose]);
  return [state, react];
};

// Marco de cada juego: la llamita reacciona al lado (en el celular, arriba y pequeña)
export const GameFrame = ({ llama, say, children }) => (
  <div className="grid gap-6 lg:gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] items-start">
    <aside className="hidden lg:flex lg:sticky lg:top-24 flex-col items-center">
      <Mascot mood={llama.mood} pose={llama.pose} beat={llama.beat} sticker bubble="top" size="w-48" eager say={say} />
    </aside>
    <div className="lg:hidden">
      <Mascot mood={llama.mood} pose={llama.pose} beat={llama.beat} size="w-16" eager say={<div className="text-sm">{say}</div>} />
    </div>
    <div className="min-w-0">{children}</div>
  </div>
);

export const ResultScreen = ({ stars, record, title, big, unit, note, language, onAgain, onExit, againLabel = 'Otra vez', children }) => {
  const great = stars >= 3 || record;
  return (
    <div className="max-w-xl mx-auto text-center py-6">
      <div className="relative">
        {great && <Confetti />}
        <Mascot
          mood={great ? 'cheer' : stars >= 2 ? 'happy' : 'idle'}
          pose={record ? 'logro' : great ? 'celebrando' : stars >= 2 ? 'alegre' : 'reintentar'}
          sticker
          bubble="top"
          size="w-44"
          className="mx-auto"
          eager
          say={<p className="font-black text-xl">{title ?? (great ? language.frases?.felicitacion ?? '¡Muy bien!' : stars >= 2 ? '¡Bien hecho!' : language.frases?.animo ?? '¡Ánimo!')}</p>}
        />
      </div>
      <div className="mt-5">
        <Stars count={stars} />
      </div>
      <p className="mt-4 text-6xl font-black tabular-nums anim-pop">{big}</p>
      <p className="text-stone-600 font-semibold">{unit}</p>
      {record && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 font-black text-amber-800 anim-pop">
          <Trophy className="w-5 h-5" aria-hidden="true" /> <ShinyText text="¡Nuevo récord!" color="#92400e" shineColor="#fde68a" speed={2} />
        </p>
      )}
      {note && <p className="mt-2 text-sm font-bold text-amber-700">{note}</p>}
      {children}
      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
        <button type="button" onClick={onAgain} className={primaryBtn}>
          <RotateCcw className="w-5 h-5" aria-hidden="true" /> {againLabel}
        </button>
        <button type="button" onClick={onExit} className={secondaryBtn}>
          Elegir otro juego
        </button>
      </div>
    </div>
  );
};

export const StartScreen = ({ pose, text, best, bestLabel, onStart, onExit }) => (
  <div className="max-w-xl mx-auto text-center py-6">
    <Mascot pose={pose} bubble="top" size="w-44" className="mx-auto" eager say={<p className="font-semibold max-w-sm">{text}</p>} />
    {best > 0 && (
      <p className="mt-4 inline-flex items-center gap-2 font-bold text-amber-700">
        <Trophy className="w-5 h-5" aria-hidden="true" /> {bestLabel}
      </p>
    )}
    <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
      <button type="button" onClick={onStart} className={primaryBtn} autoFocus>
        ¡Jugar!
      </button>
      <button type="button" onClick={onExit} className={secondaryBtn}>
        Elegir otro juego
      </button>
    </div>
  </div>
);
