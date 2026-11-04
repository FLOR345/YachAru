// Cuentos de Cultura viva: tarjetas con portada (foto con licencia abierta) y lector a pantalla ancha.
// - StoryGrid: el primer cuento va destacado y grande; el resto en tarjetas con su foto.
// - StoryReader: portada a lo ancho con parallax, título palabra por palabra, barra de lectura,
//   párrafos con su traducción al lado que aparecen al bajar, la enseñanza del cuento y "sigue leyendo".
import { useRef, useState } from 'react';
import * as m from 'motion/react-m';
import { useScroll, useTransform, useSpring } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, Clock, Heart, Languages, MapPin, Minus, Plus, Sparkles, ExternalLink } from 'lucide-react';
import { minutosDeLectura } from '../data/cuentos';
import { playTap } from '../utils/sounds';
import Mascot from './Mascot';

const NIVEL = { basico: 'Fácil', intermedio: 'Intermedio', avanzado: 'Avanzado' };
const SIZES = ['text-base', 'text-lg', 'text-xl', 'text-2xl'];

const Credit = ({ c, className = '' }) =>
  c ? (
    <a href={c.pagina} target="_blank" rel="noopener noreferrer" className={`underline-offset-2 hover:underline ${className}`}>
      Foto: {c.autor} · {c.licencia}
    </a>
  ) : null;

// Portada: la foto si existe; si no, un fondo de color con un libro
const Cover = ({ story, theme, className = '', imgClassName = '', eager = false }) =>
  story.portada ? (
    <img src={story.portada} alt={story.portadaAlt || ''} loading={eager ? 'eager' : 'lazy'} decoding="async" className={`h-full w-full object-cover ${imgClassName}`} />
  ) : (
    <span className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${theme.gradient} ${className}`}>
      <span className="brillo-liquido" aria-hidden="true" />
      <BookOpen className="relative w-14 h-14 text-white" aria-hidden="true" />
    </span>
  );

const Meta = ({ story, light = false }) => (
  <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold ${light ? 'text-white/90' : 'text-stone-500'}`}>
    {story.region && (
      <span className="inline-flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {story.region}
      </span>
    )}
    <span className="inline-flex items-center gap-1">
      <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {minutosDeLectura(story)} min
    </span>
    {NIVEL[story.nivel] && <span>{NIVEL[story.nivel]}</span>}
  </span>
);

const firstLine = (s) => String(s.traduccion || s.contenido_original || '').split(/\n/)[0];

// ==================== Tarjetas ====================
export const StoryGrid = ({ stories, language, theme, favorites, onOpen }) => {
  const open = (s) => {
    playTap();
    onOpen(s);
  };
  const [first, ...rest] = stories;
  return (
    <div className="space-y-6">
      {/* Cuento destacado */}
      {first && (
        <m.button
          type="button"
          onClick={() => open(first)}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.25, duration: 0.7 }}
          className="group relative block w-full overflow-hidden rounded-[2rem] text-left shadow-xl shadow-stone-900/10 min-h-[22rem] sm:min-h-[26rem] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
        >
          <span className="absolute inset-0">
            <Cover story={first} theme={theme} eager imgClassName="transition-transform duration-[1.4s] ease-out group-hover:scale-105" />
          </span>
          <span className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent" aria-hidden="true" />
          <span className="tejido-andino absolute inset-x-0 bottom-0 h-2" aria-hidden="true" />
          <span className="relative flex h-full min-h-[22rem] sm:min-h-[26rem] flex-col justify-end p-6 sm:p-10 text-white">
            <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-950">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Cuento destacado
            </span>
            <span className="block max-w-2xl text-3xl sm:text-5xl font-black leading-[1.05]" lang={language.lang}>
              {first.titulo}
            </span>
            <span className="mt-3 max-w-xl text-white/85 line-clamp-2">{firstLine(first)}</span>
            <span className="mt-4 flex flex-wrap items-center gap-4">
              <Meta story={first} light />
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-stone-900 transition-transform group-hover:translate-x-1">
                Leer cuento <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </span>
          </span>
          {favorites.includes(first.id) && <Heart className="absolute top-5 right-5 w-6 h-6 fill-white text-white drop-shadow" aria-label="En favoritos" />}
        </m.button>
      )}

      {/* El resto de cuentos */}
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {rest.map((story, i) => (
          <m.li
            key={story.id}
            id={`cultura-${story.id}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', bounce: 0.25, duration: 0.6, delay: (i % 3) * 0.07 }}
          >
            <button
              type="button"
              onClick={() => open(story)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white text-left shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-stone-900/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
            >
              <span className="relative block aspect-[4/3] overflow-hidden">
                <Cover story={story} theme={theme} imgClassName="transition-transform duration-700 ease-out group-hover:scale-110" />
                <span className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" aria-hidden="true" />
                <span className="absolute bottom-3 left-4 right-4">
                  <Meta story={story} light />
                </span>
                {story.fuente && (
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-stone-800 backdrop-blur">Nuevo</span>
                )}
                {favorites.includes(story.id) && <Heart className="absolute top-3 right-3 w-5 h-5 fill-white text-white drop-shadow" aria-label="En favoritos" />}
              </span>
              <span className="flex flex-1 flex-col p-5">
                <span className="block text-xl font-black leading-tight" lang={language.lang}>
                  {story.titulo || 'Sin título'}
                </span>
                <span className="mt-2 text-sm text-stone-600 line-clamp-3">{firstLine(story)}</span>
                <span className={`mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-black ${theme.text}`}>
                  Leer cuento <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </span>
            </button>
          </m.li>
        ))}
      </ul>
    </div>
  );
};

// ==================== Lector ====================
const Title = ({ text, lang, headingRef }) => (
  <h2 id="cuento-titulo" ref={headingRef} tabIndex={-1} lang={lang} className="text-4xl sm:text-6xl font-black leading-[1.02] focus:outline-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
    {String(text).split(' ').map((w, i) => (
      <m.span
        key={i}
        className="inline-block mr-[0.25em]"
        initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        {w}
      </m.span>
    ))}
  </h2>
);

export const StoryReader = ({ story, stories, language, theme, fav, onBack, onOpen, headingRef }) => {
  const [size, setSize] = useState(1);
  const [showTranslation, setShowTranslation] = useState(true);
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const imgY = useTransform(heroProgress, [0, 1], ['0%', '18%']);
  const textY = useTransform(heroProgress, [0, 1], ['0%', '40%']);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });

  const paragraphs = (story.contenido_original || '').split(/\n\s*\n|\n/).filter((p) => p.trim());
  const translations = (story.traduccion || '').split(/\n\s*\n|\n/).filter((p) => p.trim());
  const aligned = paragraphs.length === translations.length;
  const idx = stories.findIndex((s) => s.id === story.id);
  const next = stories.length > 1 ? stories[(idx + 1) % stories.length] : null;
  const prev = stories.length > 2 ? stories[(idx - 1 + stories.length) % stories.length] : null;

  return (
    <article aria-labelledby="cuento-titulo" className="relative">
      {/* Barra de lectura */}
      <m.span className={`fixed left-0 right-0 top-0 z-[60] h-1.5 origin-left bg-gradient-to-r ${theme.gradient}`} style={{ scaleX: progress }} aria-hidden="true" />

      {/* Portada */}
      <header ref={heroRef} className="relative overflow-hidden rounded-[2rem] bg-stone-900 text-white shadow-2xl shadow-stone-900/20 min-h-[60vh] sm:min-h-[68vh] flex">
        <m.div className="absolute inset-0" style={{ y: imgY }} initial={{ scale: 1.18, opacity: 0 }} animate={{ scale: 1.06, opacity: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}>
          <Cover story={story} theme={theme} eager />
        </m.div>
        <span className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/45 to-stone-950/10" aria-hidden="true" />
        <span className="absolute inset-0 bg-gradient-to-r from-stone-950/50 to-transparent" aria-hidden="true" />
        <span className="tejido-andino absolute inset-x-0 bottom-0 h-2.5" aria-hidden="true" />

        <button
          type="button"
          onClick={onBack}
          className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 min-h-11 px-4 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30 font-bold hover:bg-white/25"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" /> Volver a los cuentos
        </button>
        <span className="absolute right-5 top-5 z-10">
          <FavoriteBubble {...fav} />
        </span>

        <m.div style={{ y: textY }} className="relative mt-auto w-full p-6 pb-10 sm:p-12 sm:pb-14">
          <m.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-widest backdrop-blur">
            <BookOpen className="w-4 h-4" aria-hidden="true" /> Cuento en {language.nombre.toLowerCase()}
          </m.p>
          <Title text={story.titulo} lang={language.lang} headingRef={headingRef} />
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Meta story={story} light />
            {story.portadaAlt && <span className="text-xs text-white/70">{story.portadaAlt}</span>}
          </m.div>
        </m.div>
      </header>

      {/* Herramientas */}
      <div className="sticky top-[4.5rem] z-20 mx-auto -mt-7 flex w-[min(100%,46rem)] flex-wrap items-center gap-2 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-lg shadow-stone-900/10 backdrop-blur">
        <span className="text-sm font-bold text-stone-600 mr-1">Letra</span>
        <button type="button" onClick={() => setSize((s) => Math.max(0, s - 1))} disabled={size === 0} aria-label="Letra más pequeña" className="ficha w-10 h-10 rounded-xl border-stone-300 bg-white flex items-center justify-center disabled:opacity-40">
          <Minus className="w-4 h-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))} disabled={size === SIZES.length - 1} aria-label="Letra más grande" className="ficha w-10 h-10 rounded-xl border-stone-300 bg-white flex items-center justify-center disabled:opacity-40">
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-pressed={showTranslation}
          onClick={() => setShowTranslation((v) => !v)}
          className={`ficha ml-auto inline-flex items-center gap-2 min-h-10 px-4 rounded-xl font-bold ${showTranslation ? `${theme.border} ${theme.soft} ${theme.text}` : 'border-stone-300 bg-white text-stone-700'}`}
        >
          <Languages className="w-4 h-4" aria-hidden="true" /> <span className="sm:hidden">Traducción</span>
          <span className="hidden sm:inline">{showTranslation ? 'Ocultar traducción' : 'Ver traducción'}</span>
        </button>
      </div>

      {/* Texto */}
      <div className="mx-auto mt-10 max-w-5xl">
        {aligned ? (
          <ol className="space-y-6">
            {paragraphs.map((p, i) => (
              <m.li
                key={i}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className={`grid gap-3 rounded-3xl bg-white/80 p-5 sm:p-7 ring-1 ring-stone-200/70 backdrop-blur ${showTranslation ? 'lg:grid-cols-2 lg:gap-10' : ''}`}
              >
                <p className={`${SIZES[size]} leading-relaxed font-semibold text-stone-900 ${i === 0 ? 'first-letter:float-left first-letter:mr-3 first-letter:text-[3.6em] first-letter:font-black first-letter:leading-[0.8] first-letter:text-amber-600' : ''}`} lang={language.lang}>
                  {p}
                </p>
                {showTranslation && (
                  <p className={`${SIZES[size]} leading-relaxed text-stone-600 italic lg:border-l-2 lg:border-amber-300 lg:pl-8`}>{translations[i]}</p>
                )}
              </m.li>
            ))}
          </ol>
        ) : (
          <div className={`grid gap-8 rounded-3xl bg-white/80 p-6 sm:p-8 ring-1 ring-stone-200/70 ${showTranslation ? 'lg:grid-cols-2' : ''}`}>
            <p className={`${SIZES[size]} leading-relaxed font-semibold whitespace-pre-line`} lang={language.lang}>
              {story.contenido_original}
            </p>
            {showTranslation && story.traduccion && <p className={`${SIZES[size]} leading-relaxed text-stone-600 italic whitespace-pre-line`}>{story.traduccion}</p>}
          </div>
        )}

        {/* Lo que nos enseña */}
        {story.explicacion && (
          <m.aside
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.7 }}
            className="relative mt-10 flex flex-col sm:flex-row items-center gap-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 p-6 sm:p-8 ring-1 ring-amber-200"
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/40 blur-2xl" aria-hidden="true" />
            <Mascot pose="leyendo" sticker size="w-28 shrink-0" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-widest text-amber-800">Lo que nos enseña</p>
              <p className="mt-1 text-lg leading-relaxed text-stone-800">{story.explicacion}</p>
            </div>
          </m.aside>
        )}

        <p className="mt-6 text-xs text-stone-500">
          {story.fuente ? `${story.fuente}. ` : ''}
          <Credit c={story.creditoPortada} className="inline-flex items-center gap-1" />
          {story.creditoPortada && <ExternalLink className="ml-1 inline w-3 h-3" aria-hidden="true" />}
        </p>

        {/* Sigue leyendo */}
        {next && (
          <nav aria-label="Más cuentos" className="mt-10 grid gap-4 sm:grid-cols-2">
            {[prev && ['Anterior', prev, ArrowLeft], ['Siguiente cuento', next, ArrowRight]].filter(Boolean).map(([label, s, Icon]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  playTap();
                  onOpen(s);
                }}
                className={`group relative flex min-h-36 overflow-hidden rounded-3xl text-left text-white shadow-lg ${!prev ? 'sm:col-span-2' : ''} ${label === 'Anterior' ? '' : 'sm:order-last'}`}
              >
                <span className="absolute inset-0">
                  <Cover story={s} theme={theme} imgClassName="transition-transform duration-700 group-hover:scale-110" />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-stone-950/85 to-stone-950/30" aria-hidden="true" />
                <span className="relative mt-auto p-5">
                  <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-amber-300">
                    {label === 'Anterior' && <Icon className="w-4 h-4" aria-hidden="true" />}
                    {label}
                    {label !== 'Anterior' && <Icon className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
                  </span>
                  <span className="block text-2xl font-black leading-tight" lang={language.lang}>
                    {s.titulo}
                  </span>
                </span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </article>
  );
};

// Corazón sobre la foto (mismo comportamiento que el botón de favoritos)
const FavoriteBubble = ({ isFavorite, onToggle, name }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={isFavorite}
    aria-label={isFavorite ? `Quitar «${name}» de favoritos` : `Guardar «${name}» en favoritos`}
    className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center hover:bg-white/25"
  >
    <m.span key={String(isFavorite)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6 }}>
      <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white'}`} aria-hidden="true" />
    </m.span>
  </button>
);
