// Palabra del día: la misma para todos durante el día. Es una tarjeta que se voltea
// (primero la palabra, al tocarla su significado) y suena al voltearla.
import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { speak } from '../utils/speech';
import { playTap } from '../utils/sounds';

// Elige la palabra del día de una lista (igual para todos durante el día)
export const pickWordOfDay = (words) => (words?.length ? words[Math.floor(Date.now() / 86400000) % words.length] : null);

// ==================== PALABRA DEL DÍA ====================
// Una tarjeta que se voltea: primero la palabra, al tocarla su significado
const WordOfDay = ({ word, language, theme, height = 'h-44' }) => {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => setFlipped(false), [word?.id]);
  return (
    <section aria-labelledby="palabra-dia-titulo">
      <h2 id="palabra-dia-titulo" className="mb-2 flex items-center gap-2 font-black">
        <Star className="w-5 h-5 text-amber-500 fill-amber-400" aria-hidden="true" /> Palabra del día
      </h2>
      <div className={`${height} [perspective:1000px]`}>
        <button
          type="button"
          onClick={() => {
            playTap();
            if (!flipped) speak(word.palabra_objetivo, { url: word.audio_url, idioma: language.id, lang: language.voz?.respaldo });
            setFlipped((f) => !f);
          }}
          aria-label={flipped ? `${word.palabra_objetivo} significa ${word.palabra_espanol}` : `Palabra del día: ${word.palabra_objetivo}. Toca para ver qué significa`}
          className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'none' }}
        >
          <span className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-5 flex flex-col items-center justify-center shadow-lg [backface-visibility:hidden]`}>
            <span className="text-3xl font-black text-center break-words" lang={language.lang}>
              {word.palabra_objetivo}
            </span>
            <span className="mt-2 text-sm font-bold opacity-85">Toca para descubrirla</span>
          </span>
          <span className="absolute inset-0 rounded-3xl bg-white border-4 border-amber-300 p-5 flex flex-col items-center justify-center shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="text-3xl font-black text-center">{word.palabra_espanol}</span>
            <span className={`mt-1 font-bold ${theme.text}`} lang={language.lang}>
              {word.palabra_objetivo}
            </span>
            {word.categoria && <span className="mt-2 rounded-full bg-stone-100 px-3 py-0.5 text-xs font-bold capitalize text-stone-600">{word.categoria}</span>}
          </span>
        </button>
      </div>
    </section>
  );
};

export default WordOfDay;
