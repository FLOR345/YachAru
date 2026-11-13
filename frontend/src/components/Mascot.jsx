// La llamita de YachAru: 16 poses (assets/llama) y animaciones CSS ("llama-*" en index.css).
// La pose dice QUÉ hace (escucha, lee, celebra…); el ánimo (mood) dice CÓMO se mueve.
// Cada pose existe en 280 y 560 px (WebP) y en versión sticker (con borde blanco);
// el navegador baja solo el tamaño que necesita.

const WEBP = import.meta.glob('../assets/llama/*.webp', { eager: true, import: 'default' });
const PNG = import.meta.glob('../assets/llama/*.png', { eager: true, import: 'default' });
const byName = (files) => Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop().replace(/\.\w+$/, ''), url]));
const FILES = byName(WEBP);
const FALLBACK = byName(PNG);

export const POSES = Object.keys(FALLBACK);

const MOOD_CLASS = {
  idle: 'llama-reposo',
  happy: 'llama-salta',
  cheer: 'llama-celebra',
  sad: 'llama-triste',
  think: 'llama-piensa',
  wow: 'llama-sorpresa',
};

// Pose por defecto según el ánimo
const MOOD_POSE = {
  idle: 'alegre',
  happy: 'alegre',
  cheer: 'celebrando',
  sad: 'reintentar',
  think: 'pensando',
  wow: 'sorprendida',
};

/**
 * pose: una de POSES · sticker: con borde blanco · eager: se pide primero (lo que se ve al cargar)
 * sizes: ancho con que se muestra, para que el navegador elija 280 o 560 px
 */
export const LlamaImage = ({ pose = 'alegre', sticker = false, className = '', eager = false, sizes = '(min-width: 1024px) 12rem, 8rem' }) => {
  const name = FALLBACK[pose] ? pose : 'alegre';
  const key = sticker ? `${name}-sticker` : name;
  return (
    <picture className="block w-full h-full">
      <source srcSet={`${FILES[`${key}-sm`]} 280w, ${FILES[key]} 560w`} sizes={sizes} type="image/webp" />
      <img
        key={key}
        src={FALLBACK[name]}
        alt=""
        width="560"
        height="560"
        loading={eager ? 'eager' : 'lazy'}
        fetchpriority={eager ? 'high' : undefined}
        decoding="async"
        draggable="false"
        className={`anim-pose select-none w-full h-full object-contain object-bottom ${sticker ? 'drop-shadow-[0_6px_10px_rgba(28,25,23,0.18)]' : ''} ${className}`}
      />
    </picture>
  );
};

/**
 * mood: idle | happy | cheer | sad | think | wow  (cómo se mueve)
 * pose: una de POSES (qué está haciendo); si falta, se elige según el ánimo
 * beat: cambia este número para repetir la animación del mismo ánimo
 * say: texto (o nodos) del globo de diálogo
 * bubble: 'right' (globo a la derecha) o 'top' (globo arriba)
 */
const Mascot = ({ mood = 'idle', pose, sticker = false, beat = 0, say, size = 'w-24 sm:w-28', bubble = 'right', className = '', eager = false }) => (
  <div className={`flex ${bubble === 'top' ? 'flex-col-reverse items-center' : 'items-end'} gap-3 ${className}`}>
    <div key={`${mood}-${beat}`} className={`${size} aspect-square shrink-0 origin-bottom llama ${MOOD_CLASS[mood] ?? MOOD_CLASS.idle}`} aria-hidden="true">
      <LlamaImage pose={pose ?? MOOD_POSE[mood] ?? 'alegre'} sticker={sticker} eager={eager} />
    </div>
    {say && (
      <div
        className={`globo anim-globo ${bubble === 'top' ? 'globo-abajo origin-bottom' : 'globo-izquierda origin-bottom-left mb-6'} relative min-w-0 rounded-2xl border-2 border-stone-200 bg-white px-4 py-3 text-stone-900 shadow-sm`}
      >
        {say}
      </div>
    )}
  </div>
);

export default Mascot;
