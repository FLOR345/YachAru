// Efectos visuales (components/fx) que van debajo de la primera pantalla: se descargan aparte.
// Mientras llegan se muestra el contenido normal (el número final, la tarjeta, la foto),
// así nunca hay un hueco ni un salto.
import { lazy, Suspense } from 'react';

const CountUpLazy = lazy(() => import('../components/fx/CountUp'));
const SpotlightCardLazy = lazy(() => import('../components/fx/SpotlightCard'));
const TiltedCardLazy = lazy(() => import('../components/fx/TiltedCard'));
const BlurTextLazy = lazy(() => import('../components/fx/BlurText'));

// Blur Text: las palabras pasan de borrosas a nítidas una tras otra al aparecer en pantalla.
// Mientras se descarga se ve el párrafo normal, con las mismas clases.
export const BlurText = ({ text, className = '', ...props }) => (
  <Suspense fallback={<p className={className}>{text}</p>}>
    <BlurTextLazy text={text} className={`justify-center ${className}`} {...props} />
  </Suspense>
);

const formatNumber = (value, separator) =>
  separator ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, separator) : String(value);

export const CountUp = (props) => (
  <Suspense fallback={<span>{`${props.prefix ?? ''}${formatNumber(props.to, props.separator)}${props.suffix ?? ''}`}</span>}>
    <CountUpLazy {...props} />
  </Suspense>
);

// Mismo aspecto que la tarjeta final, sin el foco de luz
export const SpotlightCard = ({ children, className = '', ...props }) => (
  <Suspense fallback={<div className={`relative isolate overflow-hidden rounded-3xl bg-white ${className}`}>{children}</div>}>
    <SpotlightCardLazy className={className} {...props}>
      {children}
    </SpotlightCardLazy>
  </Suspense>
);

export const TiltedCard = (props) => (
  <Suspense
    fallback={
      <img
        src={props.imageSrc}
        alt={props.altText}
        loading="lazy"
        className="w-full object-cover"
        style={{ height: props.imageHeight, borderRadius: props.radius }}
      />
    }
  >
    <TiltedCardLazy {...props} />
  </Suspense>
);

// GSAP (Animated Content) y Rotating Text también se descargan aparte: la portada carga primero
const AnimatedContentLazy = lazy(() => import('../components/fx/AnimatedContent'));
const MagnetLazy = lazy(() => import('../components/fx/Magnet'));
const RotatingTextLazy = lazy(() => import('../components/fx/RotatingText'));

export const AnimatedContent = ({ children, ...props }) => (
  <Suspense fallback={<div>{children}</div>}>
    <AnimatedContentLazy {...props}>{children}</AnimatedContentLazy>
  </Suspense>
);

export const RotatingText = (props) => (
  <Suspense fallback={<span className={`flex ${props.mainClassName ?? ''}`}>{props.texts?.[0]}</span>}>
    <RotatingTextLazy {...props} />
  </Suspense>
);

// Magnet: el elemento se acerca un poco al mouse. Mientras se descarga se ve igual, sin movimiento
export const Magnet = ({ children, ...props }) => (
  <Suspense fallback={<div className={props.wrapperClassName}>{children}</div>}>
    <MagnetLazy {...props}>{children}</MagnetLazy>
  </Suspense>
);
