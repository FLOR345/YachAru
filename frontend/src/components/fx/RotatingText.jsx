// Palabras que se turnan; cada una entra letra por letra. Implementación propia (MIT).
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

const RotatingText = ({ texts = [], rotationInterval = 2200, staggerDuration = 0.03, mainClassName = '' }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (texts.length < 2) return undefined;
    const t = setInterval(() => setIndex((n) => (n + 1) % texts.length), rotationInterval);
    return () => clearInterval(t);
  }, [texts.length, rotationInterval]);
  const word = texts[index] ?? '';
  return (
    <span className={`relative inline-flex overflow-hidden ${mainClassName}`} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <m.span key={word} className="inline-flex" aria-label={word}>
          {[...word].map((ch, k) => (
            <m.span
              key={k}
              aria-hidden="true"
              className="inline-block"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-110%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 380, delay: k * staggerDuration }}
            >
              {ch === ' ' ? ' ' : ch}
            </m.span>
          ))}
        </m.span>
      </AnimatePresence>
    </span>
  );
};

export default RotatingText;
