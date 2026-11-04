// El cielo del camino de aprendizaje: nubes en tres capas con profundidad (se mueven a distinta
// velocidad al bajar), un picaflor (q'inti) que vuela, se detiene a libar y sigue, una bandada de
// golondrinas a lo lejos, mariposas, luciérnagas y destellos que titilan (GSAP). Todo es adorno:
// no recibe toques y respeta "reducir movimiento".
import { useEffect, useRef } from 'react';
import { useReducedMotion, useScroll, useTransform } from 'motion/react';
import * as m from 'motion/react-m';
import gsap from 'gsap';

// Picaflor ilustrado: cuerpo verde tornasol, garganta roja, pico largo y alas que aletean muy rápido
export const Hummingbird = ({ className = '' }) => (
  <svg viewBox="0 0 120 80" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="pf-cuerpo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="55%" stopColor="#059669" />
        <stop offset="100%" stopColor="#0e7490" />
      </linearGradient>
      <linearGradient id="pf-ala" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ecfeff" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.55" />
      </linearGradient>
      <radialGradient id="pf-garganta" cx="0.4" cy="0.4" r="0.7">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="100%" stopColor="#be123c" />
      </radialGradient>
    </defs>
    {/* cola */}
    <path d="M30 46 L6 40 L10 50 L4 58 L30 52Z" fill="#0f766e" />
    {/* cuerpo */}
    <ellipse cx="48" cy="46" rx="22" ry="12" fill="url(#pf-cuerpo)" />
    {/* cabeza y garganta */}
    <circle cx="70" cy="38" r="10" fill="url(#pf-cuerpo)" />
    <path d="M64 44 Q70 52 78 44 Q72 48 64 44Z" fill="url(#pf-garganta)" />
    <ellipse cx="66" cy="47" rx="7" ry="4" fill="url(#pf-garganta)" />
    {/* pico */}
    <path d="M79 37 L116 33 L79 40Z" fill="#292524" />
    {/* ojo con brillo */}
    <circle cx="73" cy="35" r="2.4" fill="#1c1917" />
    <circle cx="73.8" cy="34.2" r="0.8" fill="#fff" />
    {/* alas (aletean) */}
    <g className="pf-alas" style={{ transformOrigin: '50px 40px' }}>
      <path d="M50 40 Q30 4 62 2 Q64 22 56 40Z" fill="url(#pf-ala)" stroke="#a5f3fc" strokeWidth="1" />
      <path d="M46 40 Q20 10 40 6 Q50 22 50 40Z" fill="url(#pf-ala)" opacity="0.7" />
    </g>
  </svg>
);

const Swallow = ({ className = '', delay = 0 }) => (
  <svg viewBox="0 0 40 16" className={className} aria-hidden="true">
    <path className="golondrina-alas" style={{ animationDelay: `${delay}s`, transformOrigin: '20px 9px' }} d="M2 4 Q12 2 20 10 Q28 2 38 4 Q28 6 20 13 Q12 6 2 4Z" fill="#334155" />
  </svg>
);

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

      {/* Golondrinas a lo lejos */}
      <div className="bandada absolute" style={{ top: '9%' }}>
        {[0, 1, 2, 3, 4].map((k) => (
          <span key={k} className="absolute" style={{ left: `${[0, 22, 40, 14, 34][k]}px`, top: `${[0, 10, 4, 20, 18][k]}px` }}>
            <Swallow className="w-5" delay={k * 0.13} />
          </span>
        ))}
      </div>

      {/* El picaflor: cruza, se detiene a libar y sigue */}
      {!reduce && (
        <m.div
          className="absolute z-30 w-20 sm:w-28"
          initial={{ left: '-12%', top: '30%', scaleX: 1 }}
          animate={{
            left: ['-12%', '18%', '22%', '62%', '66%', '108%', '108%', '70%', '66%', '24%', '20%', '-12%'],
            top: ['30%', '42%', '40%', '22%', '24%', '36%', '58%', '62%', '60%', '72%', '70%', '30%'],
            scaleX: [1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, 1],
            rotate: [0, -6, 4, -4, 3, 0, 0, 5, -3, 4, -2, 0],
          }}
          transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1, 0.17, 0.3, 0.37, 0.48, 0.5, 0.62, 0.69, 0.82, 0.89, 1] }}
        >
          <m.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}>
            <Hummingbird className="w-full drop-shadow-[0_6px_8px_rgba(15,118,110,0.35)]" />
          </m.div>
        </m.div>
      )}

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
