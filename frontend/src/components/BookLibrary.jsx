// Biblioteca andina: libros en quechua y aimara de fuentes oficiales (solo enlaces; no se guardan PDF).
// - Estantes por nivel (inicial, primaria, secundaria, para todos), con las portadas como libros reales.
// - Filtros por lengua, variedad y tipo; buscador; orden; "Mi lista" guardada en el dispositivo.
// - Al tocar un libro, su portada crece hasta una ficha con todos los datos (Motion layoutId).
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import {
  BookOpen,
  BookMarked,
  Feather,
  Music2,
  Library,
  ExternalLink,
  Download,
  Landmark,
  Scale,
  CalendarDays,
  Search,
  X,
  Bookmark,
  BookmarkCheck,
  GraduationCap,
  Sparkles,
  SlidersHorizontal,
  Smile,
  Rabbit,
  ChevronDown,
} from 'lucide-react';
import BIBLIOTECA from '../data/biblioteca';
import { getLanguage } from '../languages';
import { playTap } from '../utils/sounds';
import { CountUp } from '../ui/lazyBits';

const TYPE_STYLE = {
  Poesía: { Icon: Feather, bg: 'from-fuchsia-500 via-pink-500 to-rose-500' },
  Canciones: { Icon: Music2, bg: 'from-violet-500 via-purple-500 to-indigo-600' },
  'Relatos y canciones': { Icon: Music2, bg: 'from-violet-500 via-purple-500 to-indigo-600' },
  Literatura: { Icon: BookMarked, bg: 'from-emerald-500 via-green-600 to-teal-700' },
  Relatos: { Icon: Library, bg: 'from-amber-400 via-orange-500 to-red-500' },
  'Historias y relatos': { Icon: Library, bg: 'from-amber-400 via-orange-500 to-red-500' },
  Cuento: { Icon: BookOpen, bg: 'from-sky-400 via-blue-500 to-indigo-600' },
  Cuentos: { Icon: BookOpen, bg: 'from-cyan-500 via-sky-600 to-blue-700' },
  Retahílas: { Icon: Smile, bg: 'from-lime-400 via-green-500 to-emerald-600' },
  Fábulas: { Icon: Rabbit, bg: 'from-yellow-400 via-amber-500 to-orange-600' },
};
const SHELF_PREVIEW = 10; // libros visibles por estante antes de "Ver todos"
const styleOf = (tipo) => TYPE_STYLE[tipo] ?? { Icon: BookOpen, bg: 'from-stone-500 to-stone-700' };

const SHELVES = [
  ['Inicial', 'Para los más pequeños', 'Cuentos e historias cortas de educación inicial'],
  ['Primaria', 'Para leer en primaria', 'Cuentos, relatos y poesía para niñas y niños'],
  ['Secundaria', 'Para lectores con más soltura', 'Literatura para jóvenes y adultos'],
  ['General', 'Para toda la familia', 'Recopilaciones de relatos, canciones y tradición oral'],
];

const LIST_KEY = 'simiaru-mis-libros';
const readList = () => {
  try {
    return JSON.parse(localStorage.getItem(LIST_KEY) || '[]');
  } catch {
    return [];
  }
};

// Portada: la imagen oficial; si no hay, una tapa diseñada con el ícono del tipo de libro
const Cover = ({ libro, className = '' }) => {
  const { Icon, bg } = styleOf(libro.tipo);
  if (libro.portada) {
    return (
      <img
        src={libro.portada}
        alt={`Portada de «${libro.titulo}»`}
        loading="lazy"
        decoding="async"
        width="480"
        height="680"
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }
  return (
    <span className={`relative flex w-full h-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${bg} p-3 text-center text-white ${className}`}>
      <span className="brillo-liquido" aria-hidden="true" />
      <Icon className="relative w-10 h-10" aria-hidden="true" />
      <span className="relative text-xs font-black leading-tight line-clamp-3">{libro.titulo}</span>
    </span>
  );
};

// Un libro en el estante: la portada con lomo y sombra; se levanta y gira al pasar el mouse
const ShelfBook = ({ libro, onOpen, saved }) => (
  <li className="group">
    <button type="button" onClick={() => onOpen(libro)} className="block w-full text-left focus-visible:outline-none" aria-label={`${libro.titulo}: ver ficha`}>
      <span className="relative block [perspective:900px]">
        <m.span
          layoutId={`libro-${libro.id}`}
          className="relative block aspect-[3/4] overflow-hidden rounded-r-xl rounded-l-[4px] bg-stone-200 shadow-[4px_8px_18px_rgba(28,25,23,0.28)] ring-1 ring-black/5 transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:[transform:rotateY(-12deg)] group-focus-visible:ring-4 group-focus-visible:ring-amber-400"
        >
          <Cover libro={libro} />
          {/* Lomo del libro */}
          <span className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 via-black/10 to-transparent" aria-hidden="true" />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
          {saved && (
            <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-amber-400 text-white flex items-center justify-center shadow" aria-label="En mi lista">
              <BookmarkCheck className="w-4 h-4" aria-hidden="true" />
            </span>
          )}
        </m.span>
      </span>
      <span className="mt-3 block text-sm font-black leading-tight line-clamp-2" lang={getLanguage(libro.idioma)?.lang}>
        {libro.titulo}
      </span>
      <span className="mt-0.5 block text-xs font-semibold text-stone-500 line-clamp-1">
        {getLanguage(libro.idioma)?.nombre} · {libro.tipo}
      </span>
    </button>
  </li>
);

// Ficha del libro: la portada viaja desde el estante y crece (Motion layoutId)
const BookSheet = ({ libro, onClose, saved, onToggleSave }) => {
  const lang = getLanguage(libro.idioma);
  const { Icon } = styleOf(libro.tipo);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <m.div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" aria-label="Cerrar ficha" onClick={onClose} />
      <m.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ficha-libro-titulo"
        className="vidrio-fuerte relative w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
      >
        <button type="button" onClick={onClose} className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white" aria-label="Cerrar">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="grid sm:grid-cols-[15rem_1fr]">
          {/* Verde si el libro es en quechua, azul si es en aimara */}
          <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${libro.idioma === 'aymara' ? 'from-sky-400 via-blue-600 to-indigo-800' : 'from-emerald-400 via-green-600 to-teal-800'} p-8 sm:rounded-l-[2rem] rounded-t-[2rem] sm:rounded-tr-none`}>
            <span className="brillo-liquido" aria-hidden="true" />
            <m.span className="absolute -top-16 -left-10 h-48 w-48 rounded-full bg-white/25 blur-3xl" animate={{ x: [0, 30, 0], y: [0, 20, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} aria-hidden="true" />
            <m.span className={`absolute -bottom-20 -right-10 h-56 w-56 rounded-full ${libro.idioma === 'aymara' ? 'bg-cyan-300/40' : 'bg-lime-300/40'} blur-3xl`} animate={{ x: [0, -24, 0], y: [0, -18, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} aria-hidden="true" />
            <m.span
              className="absolute bottom-5 left-5 rounded-full bg-white/25 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white ring-1 ring-white/50 backdrop-blur-md"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {lang?.nombre}
            </m.span>
            <m.span animate={{ y: [0, -8, 0], rotate: [0, -1.5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="relative block">
              <m.span layoutId={`libro-${libro.id}`} className="relative block w-40 aspect-[3/4] overflow-hidden rounded-r-xl rounded-l-[4px] shadow-[10px_18px_36px_rgba(0,0,0,0.45)] ring-1 ring-white/30">
                <Cover libro={libro} />
                <span className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 to-transparent" aria-hidden="true" />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent opacity-60" aria-hidden="true" />
              </m.span>
            </m.span>
          </div>
          <div className="p-6 sm:p-8">
            <p className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-widest text-stone-500">
              <Icon className="w-4 h-4" aria-hidden="true" /> {libro.tipo} · {lang?.nombre}
              {libro.variedad && libro.variedad.toLowerCase().replace('aimara', 'aymara') !== lang?.nombre?.toLowerCase().replace('aimara', 'aymara') && ` · ${libro.variedad}`}
            </p>
            <h3 id="ficha-libro-titulo" className="mt-1 text-2xl sm:text-3xl font-black leading-tight" lang={lang?.lang}>
              {libro.titulo}
            </h3>
            {libro.subtitulo && <p className="mt-1 font-semibold text-stone-500">{libro.subtitulo}</p>}
            <p className="mt-4 text-stone-700 leading-relaxed">{libro.descripcion}</p>
            <dl className="mt-5 grid gap-2 text-sm text-stone-600">
              <div className="flex gap-2">
                <dt className="sr-only">Autor</dt>
                <Feather className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" aria-hidden="true" />
                <dd>{libro.autor}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="sr-only">Fuente</dt>
                <Landmark className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" aria-hidden="true" />
                <dd>{libro.fuente}</dd>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-stone-400" aria-hidden="true" /> {libro.anio}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-stone-400" aria-hidden="true" /> {libro.grado || libro.nivel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-stone-400" aria-hidden="true" /> {libro.licencia}
                </span>
              </div>
              {libro.creditoPortada && <p className="text-xs text-stone-500">{libro.creditoPortada}</p>}
            </dl>
            <div className="mt-6 flex flex-col gap-2">
              <a href={libro.ficha} target="_blank" rel="noopener noreferrer" className="ficha inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-2xl border-green-800 bg-green-600 hover:bg-green-500 text-white font-black">
                <ExternalLink className="w-5 h-5" aria-hidden="true" /> {libro.descarga ? 'Ver la ficha en su fuente' : 'Leer en su fuente'}
              </a>
              {libro.descarga && (
                <a href={libro.descarga} target="_blank" rel="noopener noreferrer" className="ficha inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-2xl border-stone-300 bg-white hover:bg-stone-50 font-bold text-stone-800">
                  <Download className="w-5 h-5" aria-hidden="true" /> Leer o descargar el libro {libro.peso && <span className="text-stone-500 font-semibold">({libro.peso})</span>}
                </a>
              )}
              <button
                type="button"
                onClick={() => onToggleSave(libro.id)}
                aria-pressed={saved}
                className={`ficha inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-2xl font-bold ${saved ? 'border-amber-500 bg-amber-400 text-amber-950' : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'}`}
              >
                {saved ? <BookmarkCheck className="w-5 h-5" aria-hidden="true" /> : <Bookmark className="w-5 h-5" aria-hidden="true" />}
                {saved ? 'En mi lista' : 'Guardar en mi lista'}
              </button>
            </div>
          </div>
        </div>
      </m.div>
    </m.div>
  );
};

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={() => {
      playTap();
      onClick();
    }}
    className={`shrink-0 min-h-9 px-3.5 rounded-full text-sm font-bold transition-colors ${active ? 'bg-stone-900 text-white shadow' : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-400'}`}
  >
    {children}
  </button>
);

const BookLibrary = ({ idioma }) => {
  const [lang, setLang] = useState(idioma);
  const [variedad, setVariedad] = useState('todas');
  const [tipo, setTipo] = useState('todos');
  const [onlySaved, setOnlySaved] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('estantes'); // estantes | recientes | az
  const [open, setOpen] = useState(null);
  const [saved, setSaved] = useState(readList);
  const [expanded, setExpanded] = useState({}); // estantes abiertos por completo
  useEffect(() => setLang(idioma), [idioma]);

  const toggleSave = (id) => {
    playTap();
    setSaved((list) => {
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      try {
        localStorage.setItem(LIST_KEY, JSON.stringify(next));
      } catch {
        // sin almacenamiento
      }
      return next;
    });
  };

  const byLang = BIBLIOTECA.filter((b) => lang === 'todos' || b.idioma === lang);
  const variedades = [...new Set(byLang.map((b) => b.variedad))].sort();
  const tipos = [...new Set(byLang.map((b) => b.tipo))].sort();

  const books = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = byLang.filter(
      (b) =>
        (variedad === 'todas' || b.variedad === variedad) &&
        (tipo === 'todos' || b.tipo === tipo) &&
        (!onlySaved || saved.includes(b.id)) &&
        (!q || [b.titulo, b.subtitulo, b.autor, b.tipo, b.descripcion, b.variedad].some((f) => f?.toLowerCase().includes(q)))
    );
    if (sort === 'recientes') return [...list].sort((a, b) => b.anio - a.anio || a.titulo.localeCompare(b.titulo));
    if (sort === 'az') return [...list].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, variedad, tipo, onlySaved, saved, query, sort]);

  const totals = {
    todos: BIBLIOTECA.length,
    quechua: BIBLIOTECA.filter((b) => b.idioma === 'quechua').length,
    aymara: BIBLIOTECA.filter((b) => b.idioma === 'aymara').length,
  };
  // Abanico: el libro más reciente de cada tipo, para que se vea la variedad de la biblioteca
  const featured = Object.values(
    BIBLIOTECA.filter((b) => b.portada && (lang === 'todos' || b.idioma === lang))
      .sort((a, b) => b.anio - a.anio)
      .reduce((acc, b) => (acc[b.tipo] ? acc : { ...acc, [b.tipo]: b }), {})
  ).slice(0, 8);

  const grid = (list) => (
    <ul className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
      {list.map((libro) => (
        <ShelfBook key={libro.id} libro={libro} onOpen={(l) => (playTap(), setOpen(l))} saved={saved.includes(libro.id)} />
      ))}
    </ul>
  );

  return (
    <section className="mt-16" aria-labelledby="biblioteca-titulo">
      {/* Portada de la biblioteca: título, cifras y las portadas más recientes en abanico */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-900 via-purple-800 to-fuchsia-700 p-6 sm:p-10 text-white">
        <span className="brillo-liquido" aria-hidden="true" />
        <span className="pointer-events-none absolute -left-20 -bottom-24 w-72 h-72 rounded-full bg-amber-500/20 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute right-10 -top-20 w-72 h-72 rounded-full bg-fuchsia-500/20 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-300">
              <Sparkles className="w-4 h-4" aria-hidden="true" /> Biblioteca andina
            </p>
            <h2 id="biblioteca-titulo" className="mt-2 text-3xl sm:text-4xl font-black leading-tight">
              Libros para seguir leyendo
            </h2>
            <p className="mt-2 max-w-xl text-stone-300">
              Cuentos, relatos, poesía y canciones en quechua y aimara, publicados con acceso abierto por el Ministerio de Educación del Perú, la PUCP y Bloom Library. Los lees o descargas en su sitio: SimiAru te lleva hasta ellos.
            </p>
            <dl className="mt-6 flex flex-wrap gap-6">
              {[
                ['Libros', totals.todos],
                ['En quechua', totals.quechua],
                ['En aimara', totals.aymara],
              ].map(([label, n]) => (
                <div key={label}>
                  <dd className="text-4xl font-black tabular-nums text-amber-300">
                    <CountUp to={n} duration={1.2} />
                  </dd>
                  <dt className="text-sm font-semibold text-stone-400">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
          {/* Abanico de portadas */}
          <div className="relative hidden lg:block w-[22rem] h-60" aria-hidden="true">
            {featured.slice(0, 5).map((libro, i) => (
              <m.span
                key={libro.id}
                className="absolute top-4 w-32 aspect-[3/4] overflow-hidden rounded-r-lg rounded-l-[3px] shadow-[6px_12px_24px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                style={{ left: `${i * 3.6}rem`, zIndex: i === 2 ? 5 : 5 - Math.abs(2 - i) }}
                initial={{ opacity: 0, y: 40, rotate: 0 }}
                whileInView={{ opacity: 1, y: Math.abs(2 - i) * 10, rotate: (i - 2) * 7 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', bounce: 0.35, duration: 0.8, delay: i * 0.08 }}
              >
                <Cover libro={libro} />
              </m.span>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="sticky top-[4.5rem] z-20 -mx-1 mt-6 rounded-3xl border border-white bg-white/85 backdrop-blur p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lengua">
            {[
              ['todos', `Todas (${totals.todos})`],
              ['quechua', `Quechua (${totals.quechua})`],
              ['aymara', `Aimara (${totals.aymara})`],
            ].map(([id, label]) => (
              <Chip
                key={id}
                active={lang === id}
                onClick={() => {
                  setLang(id);
                  setVariedad('todas');
                  setTipo('todos');
                }}
              >
                {label}
              </Chip>
            ))}
            <Chip active={onlySaved} onClick={() => setOnlySaved((v) => !v)}>
              <span className="inline-flex items-center gap-1">
                <Bookmark className="w-4 h-4" aria-hidden="true" /> Mi lista ({saved.length})
              </span>
            </Chip>
          </div>
          <label className="relative md:ml-auto md:w-72">
            <span className="sr-only">Buscar en la biblioteca</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar libro, autor o tema"
              className="w-full min-h-10 pl-9 pr-3 rounded-full border-2 border-stone-200 bg-white text-sm focus:outline-none focus:border-stone-500"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-stone-400" aria-hidden="true" />
          <select value={variedad} onChange={(e) => setVariedad(e.target.value)} aria-label="Variedad" className="min-h-9 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold">
            <option value="todas">Todas las variedades</option>
            {variedades.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de libro" className="min-h-9 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold">
            <option value="todos">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar" className="min-h-9 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold">
            <option value="estantes">Por estantes (nivel)</option>
            <option value="recientes">Más recientes</option>
            <option value="az">De la A a la Z</option>
          </select>
          <span className="ml-auto text-sm font-bold text-stone-500" aria-live="polite">
            {books.length} {books.length === 1 ? 'libro' : 'libros'}
          </span>
        </div>
      </div>

      {/* Estantes */}
      <div className="mt-8 space-y-12">
        {books.length === 0 ? (
          <p className="rounded-3xl bg-white border border-stone-200 p-8 text-center text-stone-600">{onlySaved ? 'Aún no guardaste libros en tu lista: abre uno y toca «Guardar en mi lista».' : 'No encontramos libros con esos filtros.'}</p>
        ) : sort === 'estantes' ? (
          SHELVES.map(([nivel, title, sub]) => {
            const list = books.filter((b) => b.nivel === nivel);
            if (!list.length) return null;
            return (
              <section key={nivel} aria-labelledby={`estante-${nivel}`}>
                <div className="mb-5 flex items-end justify-between gap-3">
                  <div>
                    <h3 id={`estante-${nivel}`} className="text-xl sm:text-2xl font-black">
                      {title}
                    </h3>
                    <p className="text-sm text-stone-600">{sub}</p>
                  </div>
                  <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-black text-white">{list.length}</span>
                </div>
                {grid(expanded[nivel] ? list : list.slice(0, SHELF_PREVIEW))}
                {list.length > SHELF_PREVIEW && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        setExpanded((e) => ({ ...e, [nivel]: !e[nivel] }));
                      }}
                      aria-expanded={!!expanded[nivel]}
                      className="ficha inline-flex items-center gap-2 min-h-11 px-5 rounded-full border-stone-300 bg-white hover:bg-stone-50 font-bold text-stone-800"
                    >
                      {expanded[nivel] ? 'Ver menos' : `Ver los ${list.length} libros`}
                      <ChevronDown className={`w-4 h-4 transition-transform ${expanded[nivel] ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                  </div>
                )}
                {/* La repisa de madera bajo cada estante */}
                <div className="mt-6 h-3 rounded-full bg-gradient-to-b from-amber-700 to-amber-900 shadow-[0_8px_14px_-6px_rgba(120,53,15,0.6)]" aria-hidden="true" />
              </section>
            );
          })
        ) : (
          grid(books)
        )}
      </div>

      <p className="mt-6 text-xs text-stone-500">
        Datos y portadas tomados de la ficha de cada libro en su fuente: Repositorio del Ministerio de Educación del Perú, Archivo Digital de Lenguas Peruanas (PUCP) y Bloom Library, que los publican con acceso abierto bajo las licencias indicadas. Las portadas se muestran sin modificar, solo reducidas de tamaño.
      </p>

      <AnimatePresence>{open && <BookSheet key={open.id} libro={open} onClose={() => setOpen(null)} saved={saved.includes(open.id)} onToggleSave={toggleSave} />}</AnimatePresence>
    </section>
  );
};

export default BookLibrary;
