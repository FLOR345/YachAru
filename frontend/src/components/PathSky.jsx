// El cielo del camino de aprendizaje: nubes en tres capas con profundidad (se mueven a distinta
// velocidad al bajar), mariposas, luciérnagas y destellos que titilan (GSAP). Todo es adorno:
// no recibe toques y respeta "reducir movimiento".
import { useEffect, useRef } from 'react';
import { useReducedMotion, useScroll, useTransform } from 'motion/react';
import * as m from 'motion/react-m';
import gsap from 'gsap';

const Cloud = ({ className = '', opacity = 0.95 }) => (
  <svg viewBox="0 0 160 70" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="nube-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e0f2fe" />
      </linearGradient>
    </defs>
    <path d="M26 60 Q4 60 8 44 Q12 30 30 32 Q34 12 58 14 Q72 0 92 12 Q118 6 124 30 Q150 28 152 46 Q154 62 132 60Z" fill="url(#nube-g)" opacity={opacity} />
  </svg>
);

// Nubes por capa: [arriba %, ancho, duración del cruce, retraso, opacidad, desenfoque]
const LAYERS = [
  { speed: 40, clouds: [[4, 'w-28', 70, 0, 0.7, 'blur-[1.5px]'], [40, 'w-24', 80, -35, 0.65, 'blur-[1.5px]'], [74, 'w-32', 75, -55, 0.65, 'blur-[1.5px]']] },
  { speed: 90, clouds: [[16, 'w-44', 52, -10, 0.95, ''], [52, 'w-40', 58, -30, 0.92, ''], [86, 'w-36', 64, -44, 0.9, '']] },
  { speed: 160, clouds: [[30, 'w-56 sm:w-64', 40, -18, 1, ''], [66, 'w-48 sm:w-56', 46, -4, 1, '']] },
];

const PathSky = ({ butterflies = 6 }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const far = useTransform(scrollYProgress, [0, 1], [LAYERS[0].speed, -LAYERS[0].speed]);
  const mid = useTransform(scrollYProgress, [0, 1], [LAYERS[1].speed, -LAYERS[1].speed]);
  const near = useTransform(scrollYProgress, [0, 1], [LAYERS[2].speed, -LAYERS[2].speed]);
  const layerY = [far, mid, near];

  // Destellos que titilan a su propio ritmo (GSAP)
  useEffect(() => {
    if (reduce || !ref.current) return undefined;
    const stars = ref.current.querySelectorAll('[data-destello]');
    const tweens = [...stars].map((el, i) =>
      gsap.fromTo(
        el,
        { scale: 0.2, opacity: 0, rotate: 0 },
        { scale: 1, opacity: 1, rotate: 90, duration: 0.9 + (i % 4) * 0.25, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: (i * 0.37) % 2.4, repeatDelay: 0.6 + (i % 3) * 0.5 }
      )
    );
    return () => tweens.forEach((t) => t.kill());
  }, [reduce]);

  return (
    <div ref={ref} className="cielo-difuminado pointer-events-none absolute -inset-x-6 inset-y-0 overflow-hidden" aria-hidden="true">
      {LAYERS.map((layer, li) => (
        <m.div key={li} className="absolute inset-0" style={reduce ? undefined : { y: layerY[li] }}>
          {layer.clouds.map(([top, w, dur, delay, op, blur], k) => (
            <span key={k} className={`nube absolute ${blur}`} style={{ top: `${top}%`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
              <Cloud className={`${w} drop-shadow-[0_10px_18px_rgba(56,189,248,0.35)]`} opacity={op} />
            </span>
          ))}
        </m.div>
      ))}

      {/* Mariposas */}
      {Array.from({ length: butterflies }, (_, k) => (
        <span key={k} className="mariposa absolute z-20" style={{ left: `${(k * 37) % 88 + 4}%`, top: `${(k * 53) % 80 + 8}%`, animationDelay: `${-k * 1.3}s`, animationDuration: `${8 + (k % 4) * 1.5}s` }}>
          <svg viewBox="0 0 24 20" className={k % 3 === 0 ? 'h-6 w-7' : 'h-5 w-6'}>
            <g className="mariposa-alas" style={{ transformOrigin: '12px 10px', animationDelay: `${-k * 0.07}s` }}>
              {(() => {
                const color = ['#f472b6', '#facc15', '#a78bfa', '#38bdf8', '#fb923c', '#34d399'][k % 6];
                return (
                  <>
                    <path d="M12 10 C7 0 0 2 2 9 C3 13 8 13 12 10Z" fill={color} />
                    <path d="M12 10 C17 0 24 2 22 9 C21 13 16 13 12 10Z" fill={color} />
                    <path d="M12 10 C8 14 4 19 8 19 C11 19 12 14 12 10Z" fill={color} opacity="0.8" />
                    <path d="M12 10 C16 14 20 19 16 19 C13 19 12 14 12 10Z" fill={color} opacity="0.8" />
                    <circle cx="6" cy="7" r="1.4" fill="#fff" opacity="0.8" />
                    <circle cx="18" cy="7" r="1.4" fill="#fff" opacity="0.8" />
                  </>
                );
              })()}
            </g>
            <rect x="11.3" y="6" width="1.4" height="9" rx="0.7" fill="#44403c" />
          </svg>
        </span>
      ))}

      {/* Luciérnagas que suben */}
      {Array.from({ length: 10 }, (_, k) => (
        <span key={k} className="luciernaga absolute h-1.5 w-1.5 rounded-full bg-yellow-200" style={{ left: `${(k * 29) % 96 + 2}%`, top: `${(k * 41) % 70 + 25}%`, animationDelay: `${-k * 0.9}s`, animationDuration: `${6 + (k % 5)}s` }} />
      ))}

      {/* Destellos */}
      {Array.from({ length: 14 }, (_, k) => (
        <span key={k} data-destello className="absolute opacity-0" style={{ left: `${(k * 31) % 94 + 3}%`, top: `${(k * 47) % 92 + 4}%` }}>
          <svg viewBox="0 0 24 24" className={k % 3 === 0 ? 'h-5 w-5' : 'h-3 w-3'}>
            <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={k % 2 ? '#fde68a' : '#ffffff'} />
          </svg>
        </span>
      ))}
    </div>
  );
};

export default PathSky;
