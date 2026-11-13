import SingAlong from '../components/SingAlong';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '../utils/notify';
import { Volume2, Heart, Search, ArrowLeft, AlertCircle, RefreshCw, BookOpen, Lightbulb, Quote, Music, Dices, Eye, Check, PartyPopper, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { LANGUAGES, getLanguage, languageStyle } from '../languages';
import { playTap, playCorrect, playWrong } from '../utils/sounds';
import { speak } from '../utils/speech';
import Mascot from '../components/Mascot';
import BookLibrary from '../components/BookLibrary';
import { StoryGrid, StoryReader } from '../components/Stories';
import { conCuentosExtra } from '../data/cuentos';
import { riddlePhoto, proverbIcon } from '../data/cultura';
import { conExtras } from '../data/culturaExtra';
import { Confetti } from '../components/GameFx';
import * as m from 'motion/react-m';
import Decor from '../components/Decor';
import GradientText from '../components/fx/GradientText';
import { AnimatedContent, BlurText } from '../ui/lazyBits';

const TYPES = [
  { value: 'adivinanza', label: 'Adivinanzas', singular: 'adivinanza', pose: 'pensando', Icon: Lightbulb, color: 'from-amber-400 to-orange-600', hint: '¿Adivinas qué es? Escribe tu respuesta y descúbrela.' },
  { value: 'proverbio', label: 'Proverbios', singular: 'proverbio', pose: 'leyendo', Icon: Quote, color: 'from-purple-500 to-indigo-700', hint: 'Lee el proverbio, piensa qué enseña y luego descubre su significado.' },
  { value: 'cancion', label: 'Canciones', singular: 'canción', pose: 'hablando', Icon: Music, color: 'from-pink-500 to-rose-700', hint: 'Cada verso con su traducción al lado. ¡Anímate a cantarla!' },
  { value: 'cuento', label: 'Cuentos', singular: 'cuento', pose: 'leyendo', Icon: BookOpen, color: 'from-green-500 to-teal-700', hint: 'Elige un cuento y léelo con la traducción a tu lado.' },
];

const FAVORITES_KEY = 'cultureFavorites';

const readFavorites = () => {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
};

// Compara sin tildes, mayúsculas ni signos
const simplify = (t) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zñ' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// En las adivinanzas la respuesta va en el título ("El ojo") y al inicio de la explicación ("Respuesta: Ñawi (El ojo)")
const riddleAnswers = (item) => {
  const answers = new Set();
  const title = simplify(item.titulo).replace(/^(el|la|los|las|un|una) /, '');
  if (title) answers.add(title);
  const m = /respuesta:\s*([^.]+)/i.exec(item.explicacion || '');
  if (m) {
    m[1]
      .split(/[()/,]/)
      .map((p) => simplify(p).replace(/^(el|la|los|las|un|una) /, ''))
      .filter(Boolean)
      .forEach((p) => answers.add(p));
  }
  return [...answers];
};

const FavoriteButton = ({ isFavorite, onToggle, name }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={isFavorite}
    aria-label={`${isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}: ${name}`}
    className={`ficha w-11 h-11 flex items-center justify-center rounded-xl shrink-0 ${isFavorite ? 'border-rose-600 bg-rose-500 text-white' : 'border-stone-300 bg-white text-stone-500 hover:text-rose-600'}`}
  >
    <Heart key={isFavorite ? 'si' : 'no'} className={`w-5 h-5 ${isFavorite ? 'fill-white anim-latido' : ''}`} aria-hidden="true" />
  </button>
);

const ListenButton = ({ text, language, label = 'Escuchar' }) => (
  <button
    type="button"
    onClick={() => speak(text, { idioma: language.id, lang: language.voz?.respaldo })}
    className="inline-flex items-center gap-2 min-h-10 px-3 rounded-xl bg-white/80 border border-stone-200 text-sm font-bold text-stone-700 hover:bg-white toque"
  >
    <Volume2 className="w-4 h-4" aria-hidden="true" /> {label}
  </button>
);

// ==================== Adivinanza ====================
const RiddleCard = ({ item, index, language, theme, fav, onAnswered }) => {
  const [guess, setGuess] = useState('');
  const [state, setState] = useState('idle'); // idle | right | wrong | shown
  const answers = useMemo(() => riddleAnswers(item), [item]);

  const check = (e) => {
    e.preventDefault();
    const g = simplify(guess).replace(/^(el|la|los|las|un|una) /, '');
    if (!g) return;
    const ok = answers.some((a) => a === g || (g.length >= 3 && (a.includes(g) || g.includes(a))));
    if (ok) {
      playCorrect();
      setState('right');
      onAnswered?.(true);
    } else {
      playWrong();
      setState('wrong');
      onAnswered?.(false);
    }
  };
  const revealed = state === 'right' || state === 'shown';
  const photo = useMemo(() => riddlePhoto(item), [item]);

  return (
    <li id={`cultura-${item.id}`} className="tarjeta-viva anim-entra bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden" style={{ '--i': Math.min(index, 8) }}>
      <div className={`bg-gradient-to-br ${theme.gradient} text-white p-5 sm:p-6`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="font-black uppercase tracking-widest text-sm opacity-85">Adivinanza {index + 1}</p>
          <FavoriteButton {...fav} />
        </div>
        <p className="text-xl sm:text-2xl font-bold leading-snug" lang={language.lang}>
          {item.contenido_original}
        </p>
        {item.traduccion && <p className="mt-2 text-white/85 italic">{item.traduccion}</p>}
        <div className="mt-3">
          <ListenButton text={item.contenido_original} language={language} />
        </div>
      </div>
      <div className="p-5 sm:p-6">
        {revealed ? (
          <div className={`relative overflow-hidden rounded-2xl ${state === 'right' ? 'bg-green-50 ring-2 ring-green-500' : 'bg-amber-50 ring-2 ring-amber-400'}`}>
            {/* La respuesta se descubre con su foto, que se abre desde el centro */}
            {photo && (
              <m.figure
                className="relative m-0 aspect-[16/9] overflow-hidden"
                initial={{ clipPath: 'circle(0% at 50% 50%)' }}
                animate={{ clipPath: 'circle(75% at 50% 50%)' }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                <m.img src={photo.src} alt={photo.alt} style={{ objectPosition: photo.posicion }} className="h-full w-full object-cover" initial={{ scale: 1.25 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
                <span className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" aria-hidden="true" />
                <m.figcaption
                  className="absolute bottom-3 left-4 right-4 text-white"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <span className="block text-xs font-black uppercase tracking-widest text-white/80">{state === 'right' ? '¡Adivinaste!' : 'La respuesta es'}</span>
                  <span className="block text-3xl font-black drop-shadow">{item.titulo}</span>
                </m.figcaption>
                {photo.credito && (
                  <a href={photo.credito.pagina} target="_blank" rel="noopener noreferrer" className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur hover:bg-black/60">
                    Foto: {photo.credito.autor} · {photo.credito.licencia}
                  </a>
                )}
                {state === 'right' && <Confetti />}
              </m.figure>
            )}
            <div className="p-4">
              {!photo && (
                <p className={`font-black text-lg mb-1 inline-flex items-center gap-2 ${state === 'right' ? 'text-green-800' : 'text-amber-900'}`}>
                  {state === 'right' && <PartyPopper className="w-5 h-5" aria-hidden="true" />}
                  {state === 'right' ? '¡Adivinaste!' : 'La respuesta es…'} {item.titulo}
                </p>
              )}
              {item.explicacion && <p className="text-stone-800">{item.explicacion}</p>}
            </div>
          </div>
        ) : (
          <form onSubmit={check} className="space-y-3">
            <label htmlFor={`adivina-${item.id}`} className="font-bold block">
              ¿Qué es?
            </label>
            <div className="flex gap-2">
              <input
                id={`adivina-${item.id}`}
                value={guess}
                onChange={(e) => {
                  setGuess(e.target.value);
                  if (state === 'wrong') setState('idle');
                }}
                autoComplete="off"
                placeholder="Tu respuesta"
                aria-label="Tu respuesta, en español o en la lengua"
                className={`flex-1 min-w-0 min-h-12 px-4 rounded-xl border-2 bg-stone-50 font-semibold focus:outline-none focus:bg-white ${state === 'wrong' ? 'border-red-400 anim-sacude' : 'border-stone-300 focus:border-stone-500'}`}
              />
              <button type="submit" className="ficha min-h-12 px-5 rounded-xl border-green-800 bg-green-600 text-white font-black hover:bg-green-500">
                <Check className="w-5 h-5" aria-hidden="true" />
                <span className="sr-only">Comprobar</span>
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-red-700 min-h-5" aria-live="polite">
                {state === 'wrong' ? 'Casi… ¡inténtalo otra vez!' : ''}
              </p>
              <button type="button" onClick={() => setState('shown')} className="inline-flex items-center gap-1 text-sm font-bold text-stone-600 hover:text-stone-900 min-h-10">
                <Eye className="w-4 h-4" aria-hidden="true" /> Ver respuesta
              </button>
            </div>
          </form>
        )}
      </div>
    </li>
  );
};

// ==================== Proverbio ====================
const ProverbCard = ({ item, index, language, theme, fav }) => {
  const [open, setOpen] = useState(false);
  const Icon = proverbIcon(item);
  return (
    <m.li
      id={`cultura-${item.id}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ type: 'spring', bounce: 0.3, duration: 0.6, delay: Math.min(index, 6) * 0.05 }}
      className="group relative overflow-hidden bg-white rounded-3xl border border-stone-200 shadow-sm p-5 sm:p-6 hover:shadow-xl hover:shadow-stone-900/10 transition-shadow"
    >
      <span className={`pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-gradient-to-br ${theme.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`} aria-hidden="true" />
      <Quote className={`pointer-events-none absolute right-6 top-20 w-24 h-24 ${theme.text} opacity-[0.07]`} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        {/* Ícono de lo que habla el proverbio */}
        <m.span
          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
          transition={{ duration: 0.5 }}
          className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-lg ring-4 ring-white`}
          aria-hidden="true"
        >
          <span className="brillo-liquido" aria-hidden="true" />
          <Icon className="relative w-9 h-9 text-white drop-shadow" />
        </m.span>
        <FavoriteButton {...fav} />
      </div>
      <p className="relative mt-4 text-2xl font-black leading-snug" lang={language.lang}>
        {item.contenido_original}
      </p>
      {item.titulo && <p className="relative mt-1 text-sm font-bold text-stone-500">{item.titulo}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <ListenButton text={item.contenido_original} language={language} />
      </div>
      {/* Traducción completa, siempre a la vista */}
      {item.traduccion && (
        <p className={`relative mt-4 rounded-2xl ${theme.soft} border-l-4 ${theme.border} px-4 py-3 text-lg italic text-stone-800`}>“{item.traduccion}”</p>
      )}
      {item.explicacion &&
        (open ? (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mt-3 rounded-2xl bg-amber-50 border-l-4 border-amber-500 p-4"
          >
            <p className="text-xs font-black uppercase tracking-wider text-amber-900 mb-1">Lo que enseña</p>
            <p className="text-stone-800">{item.explicacion}</p>
          </m.div>
        ) : (
          <button
            type="button"
            onClick={() => {
              playTap();
              setOpen(true);
            }}
            className={`ficha relative mt-3 w-full min-h-12 rounded-xl ${theme.border} bg-white ${theme.text} font-black hover:bg-stone-50`}
          >
            ¿Qué nos enseña? Descúbrelo
          </button>
        ))}
    </m.li>
  );
};

// ==================== Canción ====================
const SongCard = ({ item, index, language, theme, fav }) => {
  const original = (item.contenido_original || '').split('\n').filter((l) => l.trim());
  const translated = (item.traduccion || '').split('\n').filter((l) => l.trim());
  const sameLength = original.length > 1 && original.length === translated.length;
  const [line, setLine] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [karaoke, setKaraoke] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  // Canta la canción entera: cada verso se escucha y se resalta, como un karaoke
  const playAll = () => {
    clearTimeout(timer.current);
    if (playing) {
      setPlaying(false);
      setLine(-1);
      return;
    }
    setPlaying(true);
    const step = (i) => {
      if (i >= original.length) {
        setPlaying(false);
        setLine(-1);
        return;
      }
      setLine(i);
      speak(original[i], { idioma: language.id, lang: language.voz?.respaldo });
      timer.current = setTimeout(() => step(i + 1), 1200 + original[i].length * 85);
    };
    step(0);
  };
  return (
    <li id={`cultura-${item.id}`} className="anim-entra bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden" style={{ '--i': Math.min(index, 8) }}>
      <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <m.span
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-lg ring-4 ring-white`}
            animate={playing ? { rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }}
            transition={playing ? { duration: 0.9, repeat: Infinity } : { duration: 0.2 }}
            aria-hidden="true"
          >
            <Music className="w-7 h-7 text-white" />
          </m.span>
          <div>
            <h3 className="text-xl font-black">{item.titulo || 'Canción'}</h3>
            {item.region && (
              <p className="text-sm text-stone-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {item.region}
              </p>
            )}
          </div>
        </div>
        <FavoriteButton {...fav} />
      </div>
      <div className="p-5 sm:p-6">
        {karaoke ? (
          <SingAlong lines={original} translations={sameLength ? translated : null} language={language} theme={theme} onClose={() => setKaraoke(false)} />
        ) : sameLength ? (
          <ol className="space-y-1">
            {original.map((l, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    setLine(i);
                    speak(l, { idioma: language.id, lang: language.voz?.respaldo });
                  }}
                  className={`w-full grid sm:grid-cols-2 gap-1 sm:gap-6 rounded-xl px-3 py-2 text-left toque ${line === i ? `${theme.soft} ring-2 ${theme.ring}` : 'hover:bg-stone-50'}`}
                >
                  <span className="font-bold text-lg" lang={language.lang}>
                    {l}
                  </span>
                  <span className="text-stone-600 italic">{translated[i]}</span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            <p className="text-lg font-semibold whitespace-pre-line leading-relaxed" lang={language.lang}>
              {item.contenido_original}
            </p>
            <p className="text-stone-700 italic whitespace-pre-line leading-relaxed">{item.traduccion}</p>
          </div>
        )}
        {sameLength && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={playAll}
              aria-pressed={playing}
              className={`ficha inline-flex items-center gap-2 min-h-11 px-4 rounded-xl font-black text-white ${theme.solid} border-black/20`}
            >
              <Volume2 className={`w-5 h-5 ${playing ? 'anim-latido' : ''}`} aria-hidden="true" /> {playing ? 'Detener' : 'Escuchar toda la canción'}
            </button>
            <button
              type="button"
              onClick={() => {
                clearTimeout(timer.current);
                setPlaying(false);
                setLine(-1);
                setKaraoke(true);
              }}
              className="ficha inline-flex items-center gap-2 min-h-11 px-4 rounded-xl font-black text-white border-fuchsia-900 bg-gradient-to-r from-fuchsia-600 to-rose-500"
            >
              <Music className="w-5 h-5" aria-hidden="true" /> Cantar con ritmo
            </button>
            <p className="text-sm text-stone-500">O toca un verso para escucharlo solo.</p>
          </div>
        )}
        {item.explicacion && (
          <div className="mt-4 rounded-2xl bg-amber-50 border-l-4 border-amber-500 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-amber-900 mb-1">Significado cultural</p>
            <p className="text-stone-800">{item.explicacion}</p>
          </div>
        )}
      </div>
    </li>
  );
};

const CultureModule = ({ user }) => {
  const [content, setContent] = useState([]);
  const [selectedType, setSelectedType] = useState('adivinanza');
  const [selectedLanguage, setSelectedLanguage] = useState(user?.idioma_objetivo && getLanguage(user.idioma_objetivo) ? user.idioma_objetivo : 'quechua');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState(readFavorites);
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [mood, setMood] = useState({ mood: 'idle', beat: 0 });
  // Tras celebrar o lamentarse, la llamita vuelve a su pose de la sección
  useEffect(() => {
    if (mood.mood === 'idle') return undefined;
    const t = setTimeout(() => setMood((m0) => ({ ...m0, mood: 'idle' })), 1800);
    return () => clearTimeout(t);
  }, [mood]);
  const [solved, setSolved] = useState(0);
  const storyHeadingRef = useRef(null);
  const highlightRef = useRef(null);

  const language = getLanguage(selectedLanguage) ?? LANGUAGES[0];
  const theme = languageStyle(selectedLanguage);
  const type = TYPES.find((t) => t.value === selectedType);

  useEffect(() => {
    loadContent();
    setSelectedStory(null);
    setSolved(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedLanguage]);

  // Al abrir un cuento: se sube al inicio y el foco va a su título
  useEffect(() => {
    if (!selectedStory) return;
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    storyHeadingRef.current?.focus({ preventScroll: true });
  }, [selectedStory]);

  const loadContent = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await api.getCulturalContent(selectedType, selectedLanguage);
      const list = response?.data?.content || [];
      // A los cuentos del servidor se suman los de YachAru, cada uno con su portada
      setContent(selectedType === 'cuento' ? conCuentosExtra(list, selectedLanguage) : conExtras(selectedType, list, selectedLanguage));
    } catch (error) {
      console.error('Error loading cultural content:', error);
      // Sin servidor, los cuentos de YachAru se pueden leer igual
      if (selectedType === 'cuento') setContent(conCuentosExtra([], selectedLanguage));
      else if (conExtras(selectedType, [], selectedLanguage).length) setContent(conExtras(selectedType, [], selectedLanguage));
      else {
        setContent([]);
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Los favoritos se guardan en este dispositivo (sirve también en modo invitado)
  const setFavorite = (itemId, favorite) => {
    setFavorites((prev) => {
      const next = favorite ? (prev.includes(itemId) ? prev : [...prev, itemId]) : prev.filter((id) => id !== itemId);
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // almacenamiento bloqueado: los favoritos duran solo esta visita
      }
      return next;
    });
  };

  // Confirmación con "Deshacer": un toque accidental se corrige sin buscar el texto otra vez
  const toggleFavorite = (itemId) => {
    const wasFavorite = favorites.includes(itemId);
    setFavorite(itemId, !wasFavorite);
    toast(wasFavorite ? 'Quitado de favoritos' : 'Guardado en favoritos', {
      id: `favorito-${itemId}`,
      action: { label: 'Deshacer', onClick: () => setFavorite(itemId, wasFavorite) },
    });
  };

  const search = searchTerm.trim().toLowerCase();
  const filteredContent = content.filter((item) => {
    if (showFavorites && !favorites.includes(item.id)) return false;
    if (!search) return true;
    return [item.titulo, item.contenido_original, item.traduccion].some((field) => field?.toLowerCase().includes(search));
  });

  const resetFilters = () => {
    setSearchTerm('');
    setShowFavorites(false);
  };

  const fav = (item) => ({
    isFavorite: favorites.includes(item.id),
    onToggle: () => toggleFavorite(item.id),
    name: item.titulo || type.singular,
  });

  // Sorpréndeme: abre un cuento al azar o lleva a una tarjeta al azar
  const surprise = () => {
    if (filteredContent.length === 0) return;
    playTap();
    const pick = filteredContent[Math.floor(Math.random() * filteredContent.length)];
    if (selectedType === 'cuento') {
      setSelectedStory(pick);
      return;
    }
    const el = document.getElementById(`cultura-${pick.id}`);
    el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    highlightRef.current?.classList.remove('ring-4', 'ring-amber-400');
    el?.classList.add('ring-4', 'ring-amber-400');
    highlightRef.current = el;
  };

  const onRiddle = (ok) => {
    setMood((m0) => ({ mood: ok ? 'cheer' : 'sad', beat: m0.beat + 1 }));
    if (ok) setSolved((n) => n + 1);
  };

  const renderResults = () => {
    if (loading) {
      return (
        <ul className="grid gap-5 md:grid-cols-2" aria-label="Cargando contenido cultural">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="h-56 rounded-3xl bg-white/70 border border-white animate-pulse motion-reduce:animate-none" />
          ))}
        </ul>
      );
    }

    if (loadError) {
      return (
        <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center" role="alert">
          <AlertCircle className="w-10 h-10 text-red-700 mx-auto mb-3" aria-hidden="true" />
          <p className="text-lg font-semibold mb-1">No pudimos cargar el contenido cultural</p>
          <p className="text-stone-600 mb-5">Revisa tu conexión. Si es tu primera visita del día, el servidor puede tardar hasta un minuto.</p>
          <button type="button" onClick={loadContent} className={`inline-flex items-center gap-2 px-6 min-h-11 ${theme.solid} ${theme.hover} text-white font-bold rounded-lg toque`}>
            <RefreshCw className="w-5 h-5" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      );
    }

    if (content.length === 0) {
      return (
        <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center">
          <Mascot pose="descansando" size="w-32" className="justify-center mb-3" />
          <h2 className="text-xl font-bold mb-2">
            Todavía no hay {type.label.toLowerCase()} en {language.nombre.toLowerCase()}
          </h2>
          <p className="text-stone-600">Prueba con otro tipo de contenido o con la otra lengua.</p>
        </div>
      );
    }

    if (filteredContent.length === 0) {
      return (
        <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center">
          <Search className="w-10 h-10 text-stone-400 mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-xl font-bold mb-2">{showFavorites ? 'Aún no guardaste favoritos aquí' : `Sin resultados para “${searchTerm.trim()}”`}</h2>
          <button type="button" onClick={resetFilters} className="mt-3 px-6 min-h-11 border-2 border-stone-300 font-bold rounded-xl hover:bg-stone-50 toque">
            Ver todo el contenido
          </button>
        </div>
      );
    }

    if (selectedType === 'cuento') {
      return <StoryGrid stories={filteredContent} language={language} theme={theme} favorites={favorites} onOpen={setSelectedStory} />;
    }

    const Card = selectedType === 'adivinanza' ? RiddleCard : selectedType === 'proverbio' ? ProverbCard : SongCard;
    return (
      <ul className={`grid gap-5 ${selectedType === 'cancion' ? '' : 'md:grid-cols-2'}`}>
        {filteredContent.map((item, i) => (
          <Card key={item.id} item={item} index={i} language={language} theme={theme} fav={fav(item)} onAnswered={onRiddle} />
        ))}
      </ul>
    );
  };

  return (
    <div className="fondo-burbujas min-h-screen text-stone-900">
      <span className="burbuja burbuja-verde" aria-hidden="true" />
      <span className="burbuja burbuja-morada" aria-hidden="true" />
      {/* ==================== ENCABEZADO ==================== */}
      <header className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-stone-200">
        <div className="container mx-auto max-w-7xl py-3 flex items-center gap-3">
          <Link to="/dashboard" aria-label="Volver al panel" className="w-11 h-11 flex items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100 toque">
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
          </Link>
          <div className="mr-auto min-w-0">
            <h1 className="text-xl sm:text-2xl font-black">
              <GradientText colors={['#15803d', '#0ea5e9', '#7c3aed', '#db2777', '#15803d']} animationSpeed={7}>Cultura viva</GradientText>
            </h1>
            <p className="text-sm text-stone-600 truncate">Adivinanzas, proverbios, canciones y cuentos andinos</p>
          </div>
          <div className="flex rounded-full bg-stone-100 p-1" role="group" aria-label="Idioma">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={l.id === selectedLanguage}
                onClick={() => {
                  setSelectedLanguage(l.id);
                  resetFilters();
                }}
                className={`min-h-9 px-3 sm:px-4 rounded-full text-sm font-bold toque ${l.id === selectedLanguage ? `${languageStyle(l.id).solid} text-white` : 'text-stone-600 hover:text-stone-900'}`}
              >
                {l.nombre}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl py-8 relative isolate">
        <Decor palette="frio" />
        {selectedType === 'cuento' && selectedStory ? (
          <StoryReader
            story={selectedStory}
            stories={filteredContent.length ? filteredContent : content}
            language={language}
            theme={theme}
            fav={fav(selectedStory)}
            onBack={() => setSelectedStory(null)}
            onOpen={setSelectedStory}
            headingRef={storyHeadingRef}
          />
        ) : (
        <div className="grid gap-8 lg:grid-cols-[19rem_minmax(0,1fr)] items-start">
          {/* ==================== COLUMNA LATERAL ==================== */}
          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="hidden lg:block">
              <Mascot
                mood={mood.mood}
                pose={mood.mood === 'idle' ? type.pose : undefined}
                sticker
                beat={mood.beat}
                bubble="top"
                size="w-44"
                eager
                say={
                  <p className="font-semibold">
                    {type.hint}
                    {selectedType === 'adivinanza' && solved > 0 && <strong className="block mt-1">¡Llevas {solved} adivinadas!</strong>}
                  </p>
                }
              />
            </div>

            <nav aria-label="Tipo de contenido" className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {TYPES.map((t) => {
                const selected = selectedType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      playTap();
                      setSelectedType(t.value);
                      resetFilters();
                    }}
                    className={`ficha flex items-center gap-3 rounded-2xl px-3 min-h-14 text-left font-black ${selected ? 'border-stone-800 bg-stone-900 text-white' : 'border-stone-200 bg-white hover:bg-stone-50'}`}
                  >
                    <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center shrink-0`} aria-hidden="true">
                      <t.Icon className="w-5 h-5 text-white" />
                    </span>
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ==================== CONTENIDO ==================== */}
          <div className="min-w-0">
            {(
              <section className="mb-6 flex flex-col sm:flex-row gap-3" aria-label="Filtros">
                <div className="relative flex-1">
                  <label htmlFor="buscar-cultura" className="sr-only">
                    Buscar en {type.label.toLowerCase()}
                  </label>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 w-5 h-5" aria-hidden="true" />
                  <input
                    id="buscar-cultura"
                    type="search"
                    autoComplete="off"
                    placeholder={`Buscar en ${type.label.toLowerCase()}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full min-h-12 pl-12 pr-4 rounded-2xl border-2 border-stone-200 bg-white focus:outline-none focus:border-stone-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFavorites(!showFavorites)}
                  aria-pressed={showFavorites}
                  className={`ficha px-4 min-h-12 rounded-2xl font-bold whitespace-nowrap flex items-center justify-center gap-2 ${
                    showFavorites ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${showFavorites ? 'fill-rose-600 text-rose-600' : ''}`} aria-hidden="true" />
                  Favoritos ({favorites.length})
                </button>
                <button type="button" onClick={surprise} className="ficha px-4 min-h-12 rounded-2xl border-amber-400 bg-amber-50 text-amber-900 font-black whitespace-nowrap flex items-center justify-center gap-2 hover:bg-amber-100">
                  <Dices className="w-5 h-5" aria-hidden="true" /> Sorpréndeme
                </button>
              </section>
            )}
            {!loading && !loadError && content.length > 0 && !selectedStory && (
              <p className="text-sm font-semibold text-stone-600 mb-4" aria-live="polite">
                {filteredContent.length} de {content.length} {type.label.toLowerCase()}
              </p>
            )}

            {/* Encabezado de la sección: entra con GSAP (Animated Content) y el título con Blur Text */}
            {selectedType !== 'cuento' && !loading && !loadError && content.length > 0 && (
              <AnimatedContent key={`${selectedType}-${selectedLanguage}`} distance={40} duration={0.7} ease="back.out(1.4)" scale={0.96} blur={4} threshold={0.05}>
                <div className={`relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br ${theme.gradient} p-6 sm:p-8 text-white shadow-xl shadow-stone-900/10`}>
                  <span className="brillo-liquido" aria-hidden="true" />
                  <m.span className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/25 blur-3xl" animate={{ x: [0, -30, 0], y: [0, 20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} aria-hidden="true" />
                  <span className="tejido-andino absolute inset-x-0 bottom-0 h-2" aria-hidden="true" />
                  <div className="relative flex items-center gap-5">
                    <m.span
                      className="hidden sm:flex w-20 h-20 shrink-0 items-center justify-center rounded-3xl bg-white/20 ring-2 ring-white/40 backdrop-blur"
                      animate={{ rotate: [0, -6, 6, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      aria-hidden="true"
                    >
                      <type.Icon className="w-10 h-10" />
                    </m.span>
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-widest text-white/80">Cultura viva · {language.nombre}</p>
                      <BlurText key={`${selectedType}-${selectedLanguage}`} text={`${type.label} en ${language.nombre.toLowerCase()}`} className="!justify-start text-3xl sm:text-4xl font-black leading-tight" delay={70} stepDuration={0.3} />
                      <p className="mt-1 text-white/90 font-semibold">
                        {content.length} {type.label.toLowerCase()}
                        {selectedType === 'adivinanza' && ` · ${solved} adivinadas`}
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedContent>
            )}

            {renderResults()}
          </div>
        </div>
        )}
      </main>

      {/* Biblioteca andina: a todo lo ancho de la pantalla, debajo de los cuentos */}
      {selectedType === 'cuento' && !selectedStory && (
        <section className="relative mx-auto w-full max-w-[74rem] px-4 sm:px-6 pb-20">
          <BookLibrary idioma={selectedLanguage} />
        </section>
      )}
    </div>
  );
};

export default CultureModule;
