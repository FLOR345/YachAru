import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Volume2,
  BookOpen,
  ArrowLeft,
  Tag,
  X,
  AlertCircle,
  RefreshCw,
  Users,
  PawPrint,
  Utensils,
  Palette,
  Hash,
  Hand,
  Smile,
  HelpCircle,
  MessageCircle,
  Heart,
  Shuffle,
  History,
  Sparkles,
  Star,
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config.js';
import { LANGUAGES, getLanguage, languageStyle } from '../languages';
import { speak, audioSource, AUDIO_LABELS } from '../utils/speech';
import { playTap } from '../utils/sounds';
import Mascot from '../components/Mascot';
import WordOfDay from '../components/WordOfDay';
import Decor from '../components/Decor';
import GradientText from '../components/fx/GradientText';
import * as m from 'motion/react-m';
import { wordIcon, categoryIcon, colorOf, numberOf } from '../ui/wordIcons';
import { MicButton, SpeakModal } from '../components/SpeakPractice';
import { BodyChip, BodyPeek } from '../components/BodyMoments';
import { parteDePalabra } from '../data/cuerpoNumeros';
// Los ejemplos de todas las palabras (unas 1500) se descargan aparte, cuando ya se ve la página
let EJEMPLOS = {};
const loadExamples = () => import('../data/ejemplos.json').then((mod) => (EJEMPLOS = mod.default));

// Apóstrofos del teclado del celular (’ ´) se buscan como el apóstrofo simple de la base
const cleanQuery = (text) => text.replace(/[’‘´`ʼ]/g, "'").trim();

// Ícono de cada categoría (las que no están usan una etiqueta)
const CATEGORY_ICONS = {
  animales: PawPrint,
  numeros: Hash,
  comida: Utensils,
  familia: Users,
  colores: Palette,
  presentaciones: Smile,
  despedidas: Hand,
  saludos: Hand,
  pregunta: HelpCircle,
  respuesta: MessageCircle,
  cortesia: Heart,
};

// En la base hay categorías en singular y plural ("saludo" y "saludos"): se muestran juntas
const groupCategories = (list) => {
  const groups = new Map();
  list.forEach(({ categoria, count }) => {
    const plural = categoria.endsWith('s') ? categoria : `${categoria}s`;
    const key = list.some((c) => c.categoria === plural) ? plural : categoria;
    const g = groups.get(key) || { key, members: [], count: 0 };
    g.members.push(categoria);
    g.count += Number(count) || 0;
    groups.set(key, g);
  });
  return [...groups.values()].sort((a, b) => b.count - a.count);
};

const storage = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // sin almacenamiento: dura esta visita
    }
  },
};

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Resalta lo buscado dentro de la palabra
const Highlight = ({ text, query }) => {
  const q = cleanQuery(query || '').toLowerCase();
  if (!text || q.length < 2) return text;
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-amber-200/80 px-0.5 text-inherit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
};

const Dictionary = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [rawCategories, setRawCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null); // grupo
  const [selectedLanguage, setSelectedLanguage] = useState(() => storage.get('simiaru-diccionario-idioma', 'quechua'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState({ totalWords: 0 });
  const [allWords, setAllWords] = useState([]);
  const [discover, setDiscover] = useState([]);
  const [tab, setTab] = useState('buscar'); // buscar | favoritas
  const [favorites, setFavorites] = useState(() => storage.get('simiaru-favoritas', {}));
  const [recent, setRecent] = useState(() => storage.get('simiaru-busquedas', []));
  const requestId = useRef(0); // ignora respuestas que llegan tarde de búsquedas anteriores
  const [, setExamplesReady] = useState(false);
  useEffect(() => {
    loadExamples()
      .then(() => setExamplesReady(true))
      .catch(() => {});
  }, []);

  const language = getLanguage(selectedLanguage) ?? LANGUAGES[0];
  const theme = languageStyle(selectedLanguage);
  const categories = useMemo(() => groupCategories(rawCategories), [rawCategories]);
  const favList = favorites[selectedLanguage] || [];

  // Con cuenta o en modo invitado se vuelve al panel; si no, a la portada
  let backTo = '/';
  try {
    if (localStorage.getItem('token') || localStorage.getItem('isGuest') === 'true') backTo = '/dashboard';
  } catch {
    // almacenamiento bloqueado: se queda la portada
  }

  useEffect(() => {
    const idioma = encodeURIComponent(selectedLanguage);
    storage.set('simiaru-diccionario-idioma', selectedLanguage);
    axios.get(`${API_URL}/api/dictionary/stats?idioma=${idioma}`).then(({ data }) => setStats(data)).catch(() => {});
    axios.get(`${API_URL}/api/dictionary/categories?idioma=${idioma}`).then(({ data }) => setRawCategories(data.categories || [])).catch(() => setRawCategories([]));
    axios
      .get(`${API_URL}/api/dictionary/all?idioma=${idioma}`)
      .then(({ data }) => {
        const words = uniqueWords(data.words || []);
        setAllWords(words);
        setDiscover(shuffle(words).slice(0, 8));
      })
      .catch(() => setAllWords([]));
  }, [selectedLanguage]);

  // Palabra del día: la misma durante todo el día para todos
  const wordOfDay = useMemo(() => {
    if (allWords.length === 0) return null;
    const day = Math.floor(Date.now() / 86400000);
    return allWords[day % allWords.length];
  }, [allWords]);

  const runRequest = async (urls) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    try {
      const responses = await Promise.all(urls.map((u) => axios.get(u)));
      if (id === requestId.current) setResults(uniqueWords(responses.flatMap((r) => r.data.words || [])));
    } catch (err) {
      console.error('Error en el diccionario:', err);
      if (id === requestId.current) {
        setResults([]);
        setError(true);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const search = () => {
    const q = cleanQuery(searchTerm);
    runRequest([`${API_URL}/api/dictionary/search?query=${encodeURIComponent(q)}&idioma=${encodeURIComponent(selectedLanguage)}`]);
  };

  useEffect(() => {
    if (cleanQuery(searchTerm).length >= 2) {
      const debounce = setTimeout(search, 300);
      return () => clearTimeout(debounce);
    }
    if (!selectedCategory) {
      requestId.current++;
      setResults([]);
      setError(false);
      setLoading(false);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedLanguage]);

  // Las búsquedas que encuentran algo se recuerdan (las últimas 6)
  useEffect(() => {
    const q = cleanQuery(searchTerm);
    if (q.length < 2 || results.length === 0 || loading) return undefined;
    const t = setTimeout(() => {
      setRecent((list) => {
        const next = [q, ...list.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6);
        storage.set('simiaru-busquedas', next);
        return next;
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [searchTerm, results, loading]);

  const loadCategory = (group) =>
    runRequest(group.members.map((c) => `${API_URL}/api/dictionary/category?categoria=${encodeURIComponent(c)}&idioma=${encodeURIComponent(selectedLanguage)}`));

  const clearSearch = () => {
    requestId.current++;
    setSearchTerm('');
    setSelectedCategory(null);
    setResults([]);
    setError(false);
    setLoading(false);
  };

  // Pulsar una categoría la abre; pulsarla de nuevo quita el filtro
  const openCategory = (group) => {
    playTap();
    setTab('buscar');
    if (selectedCategory?.key === group.key) {
      clearSearch();
      return;
    }
    setSelectedCategory(group);
    setSearchTerm('');
    loadCategory(group);
  };

  const retry = () => (selectedCategory ? loadCategory(selectedCategory) : search());

  const toggleFavorite = useCallback(
    (word) => {
      setFavorites((all) => {
        const list = all[selectedLanguage] || [];
        const exists = list.some((w) => w.id === word.id);
        const nextList = exists
          ? list.filter((w) => w.id !== word.id)
          : [
              {
                id: word.id,
                palabra_objetivo: word.palabra_objetivo,
                palabra_espanol: word.palabra_espanol,
                categoria: word.categoria,
                ejemplo_uso: word.ejemplo_uso,
                audio_url: word.audio_url,
                leccion_nombre: word.leccion_nombre,
              },
              ...list,
            ];
        const next = { ...all, [selectedLanguage]: nextList };
        storage.set('simiaru-favoritas', next);
        return next;
      });
    },
    [selectedLanguage]
  );
  const isFavorite = (word) => favList.some((w) => w.id === word.id);

  const hasQuery = cleanQuery(searchTerm).length >= 2;
  const showingResults = tab === 'buscar' && (hasQuery || selectedCategory);

  return (
    <div className="fondo-burbujas min-h-screen text-stone-900">
      <span className="burbuja burbuja-verde" aria-hidden="true" />
      <span className="burbuja burbuja-azul" aria-hidden="true" />
      {/* ==================== ENCABEZADO ==================== */}
      <header className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-stone-200">
        <div className="container mx-auto max-w-7xl py-3 flex items-center gap-3">
          <Link
            to={backTo}
            aria-label={backTo === '/' ? 'Volver a la portada' : 'Volver al panel'}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100 toque"
          >
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
          </Link>
          <div className="mr-auto min-w-0">
            <h1 className="text-xl sm:text-2xl font-black">
              <GradientText colors={['#15803d', '#0ea5e9', '#7c3aed', '#db2777', '#15803d']} animationSpeed={7}>Diccionario</GradientText>
            </h1>
            <p className="text-sm text-stone-600 truncate">
              {stats.totalWords || 0} palabras · {categories.length} categorías
            </p>
          </div>
          <div className="flex rounded-full bg-stone-100 p-1" role="group" aria-label="Idioma">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={l.id === selectedLanguage}
                onClick={() => {
                  setSelectedLanguage(l.id);
                  clearSearch();
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
        <div className="grid gap-8 lg:grid-cols-[21rem_minmax(0,1fr)] items-start">
          {/* ==================== COLUMNA LATERAL ==================== */}
          <aside className="space-y-5 lg:sticky lg:top-24 order-2 lg:order-1">
            <div className="hidden lg:block">
              <Mascot
                pose="buscando"
                sticker
                bubble="top"
                size="w-40"
                eager
                say={
                  <p className="font-semibold">
                    Busca en <strong>{language.nombre.toLowerCase()}</strong> o en español. ¡Guarda tus favoritas con el corazón!
                  </p>
                }
              />
            </div>

            {wordOfDay && <WordOfDay word={wordOfDay} language={language} theme={theme} />}

            {categories.length > 0 && (
              <section className="rounded-3xl bg-white/85 backdrop-blur border border-white shadow-sm p-5" aria-labelledby="categorias-titulo">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 id="categorias-titulo" className="font-black">
                    Categorías
                  </h2>
                  {selectedCategory && (
                    <button type="button" onClick={clearSearch} className="inline-flex items-center gap-1 px-3 min-h-9 text-sm text-stone-700 hover:bg-stone-100 rounded-lg font-semibold toque">
                      <X className="w-4 h-4" aria-hidden="true" /> Quitar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {categories.map((group) => {
                    const Icon = CATEGORY_ICONS[group.key] ?? categoryIcon(group.key) ?? Tag;
                    const isSelected = selectedCategory?.key === group.key;
                    return (
                      <button
                        key={group.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => openCategory(group)}
                        className={`ficha flex items-center gap-2 px-3 min-h-12 rounded-xl text-left ${
                          isSelected ? `${theme.border} ${theme.soft} ${theme.text}` : 'border-stone-200 bg-white hover:bg-stone-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1 min-w-0 capitalize font-bold text-sm leading-tight truncate lg:whitespace-normal">{group.key}</span>
                        <span className="text-xs font-bold text-stone-500 tabular-nums">{group.count}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </aside>

          {/* ==================== BÚSQUEDA Y RESULTADOS ==================== */}
          <div className="min-w-0 order-1 lg:order-2">
            <section className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${theme.gradient} p-6 sm:p-8 text-white shadow-lg mb-6`} role="search">
              <span className="brillo-liquido" aria-hidden="true" />
              <label htmlFor="buscar-palabra" className="relative block text-2xl sm:text-3xl font-black mb-1">
                ¿Qué palabra buscas?
              </label>
              <p className="relative mb-4 text-white/85">En {language.nombre.toLowerCase()} o en español. Puedes usar cualquier apóstrofo: p'unchay o p’unchay.</p>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 w-6 h-6" aria-hidden="true" />
                <input
                  id="buscar-palabra"
                  type="search"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setTab('buscar');
                    if (selectedCategory) setSelectedCategory(null);
                  }}
                  placeholder="hola, familia, yaku…"
                  className="w-full min-h-16 pl-14 pr-14 rounded-2xl border-4 border-white/40 bg-white text-stone-900 text-xl font-semibold shadow-inner focus:outline-none focus:border-white [&::-webkit-search-cancel-button]:hidden"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Borrar búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center hover:bg-stone-100 rounded-xl text-stone-600 toque"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                )}
              </div>
              {recent.length > 0 && (
                <div className="relative mt-4 flex flex-wrap items-center gap-2">
                  <History className="w-4 h-4 text-white/80" aria-label="Búsquedas recientes" />
                  {recent.map((q) => (
                    <button key={q} type="button" onClick={() => setSearchTerm(q)} className="rounded-full bg-white/15 hover:bg-white/25 px-3 py-1 text-sm font-bold toque">
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Pestañas: buscar o ver las favoritas */}
            <div className="mb-5 flex gap-2" role="tablist" aria-label="Vista">
              {[
                ['buscar', 'Explorar', Sparkles],
                ['favoritas', `Favoritas (${favList.length})`, Heart],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`ficha inline-flex items-center gap-2 min-h-11 px-4 rounded-xl font-black ${tab === id ? 'border-stone-800 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>

            <section aria-live="polite" aria-busy={loading}>
              {tab === 'favoritas' ? (
                favList.length > 0 ? (
                  <ul className="grid gap-4 md:grid-cols-2">
                    {favList.map((word) => (
                      <WordCard key={word.id} word={word} language={language} theme={theme} favorite onFavorite={toggleFavorite} />
                    ))}
                  </ul>
                ) : (
                  <EmptyState pose="carino" icon={Heart} title="Aún no tienes favoritas" text="Toca el corazón de cualquier palabra para guardarla aquí y repasarla cuando quieras." />
                )
              ) : loading ? (
                <ul className="grid gap-4 md:grid-cols-2" aria-label="Buscando…">
                  {Array.from({ length: 4 }, (_, i) => (
                    <li key={i} className="h-36 rounded-3xl bg-white/70 border border-white animate-pulse motion-reduce:animate-none" />
                  ))}
                </ul>
              ) : error ? (
                <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center" role="alert">
                  <AlertCircle className="w-10 h-10 text-red-700 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-lg font-semibold mb-1">No pudimos buscar en el diccionario</p>
                  <p className="text-stone-600 mb-5">Revisa tu conexión. Si es tu primera visita del día, el servidor puede tardar hasta un minuto.</p>
                  <button type="button" onClick={retry} className={`inline-flex items-center gap-2 px-6 min-h-11 ${theme.solid} ${theme.hover} text-white font-bold rounded-lg toque`}>
                    <RefreshCw className="w-5 h-5" aria-hidden="true" />
                    Reintentar
                  </button>
                </div>
              ) : showingResults && results.length > 0 ? (
                <div>
                  <h2 className="text-xl font-black mb-4">
                    {selectedCategory ? (
                      <>
                        Categoría <span className="capitalize">{selectedCategory.key}</span>: {results.length} palabras
                      </>
                    ) : (
                      `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'} para “${searchTerm.trim()}”`
                    )}
                  </h2>
                  <ul className="grid gap-4 md:grid-cols-2">
                    {results.map((word, i) => (
                      <WordCard key={word.id} word={word} language={language} theme={theme} query={searchTerm} favorite={isFavorite(word)} onFavorite={toggleFavorite} index={i} />
                    ))}
                  </ul>
                </div>
              ) : hasQuery ? (
                <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center">
                  <Mascot mood="think" pose="pensando" size="w-28" className="justify-center mb-3" />
                  <h2 className="text-xl font-bold mb-2">Sin resultados para “{searchTerm.trim()}”</h2>
                  <p className="text-stone-600 mb-5">Prueba con otra palabra, en español o en {language.nombre.toLowerCase()}, o elige una categoría.</p>
                  <button type="button" onClick={clearSearch} className="px-6 min-h-11 border-2 border-stone-300 font-bold rounded-xl hover:bg-stone-50 toque">
                    Borrar búsqueda
                  </button>
                </div>
              ) : (
                // Sin búsqueda: palabras para descubrir
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="text-xl font-black flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" aria-hidden="true" /> Descubre palabras
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        setDiscover(shuffle(allWords).slice(0, 8));
                      }}
                      className="ficha inline-flex items-center gap-2 min-h-11 px-4 rounded-xl border-stone-300 bg-white font-bold hover:bg-stone-50"
                    >
                      <Shuffle className="w-4 h-4" aria-hidden="true" /> Otra tanda
                    </button>
                  </div>
                  {discover.length > 0 ? (
                    <ul className="grid gap-4 md:grid-cols-2">
                      {discover.map((word, i) => (
                        <WordCard key={word.id} word={word} language={language} theme={theme} favorite={isFavorite(word)} onFavorite={toggleFavorite} index={i} />
                      ))}
                    </ul>
                  ) : (
                    <EmptyState pose="leyendo" icon={BookOpen} title={`Explora el vocabulario de ${language.nombre.toLowerCase()}`} text="Busca una palabra o elige una categoría para empezar." />
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

const EmptyState = ({ pose, icon: Icon, title, text }) => (
  <div className="bg-white/90 rounded-3xl border border-white shadow-sm p-10 text-center">
    {pose ? <Mascot pose={pose} size="w-32" className="justify-center mb-3" /> : <Icon className="w-10 h-10 text-stone-400 mx-auto mb-3" aria-hidden="true" />}
    <h2 className="text-xl font-bold mb-2">{title}</h2>
    <p className="text-stone-600">{text}</p>
  </div>
);

// ==================== TARJETA DE PALABRA ====================
// La misma palabra con el mismo significado puede estar en varias lecciones: en el diccionario sale una vez
const plainKey = (w) =>
  `${String(w.palabra_objetivo ?? '').trim().toLowerCase().normalize('NFC').replace(/[’‘´`ʼ]/g, "'")}|${String(w.palabra_espanol ?? '').trim().toLowerCase().normalize('NFC')}`;
const uniqueWords = (list) => {
  const seen = new Set();
  return list.filter((w) => {
    const k = plainKey(w);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
const exKey = (w) => `${String(w.palabra_objetivo ?? '').trim().toLowerCase().normalize('NFC')}|${String(w.palabra_espanol ?? '').trim().toLowerCase().normalize('NFC')}`;

// Ejemplo de la palabra: el de la base (con su traducción) o el de YachAru
const exampleOf = (word, idioma) => {
  const ex = EJEMPLOS[idioma]?.[exKey(word)];
  if (word.ejemplo_uso) return [word.ejemplo_uso, word.traduccion_ejemplo || (ex && ex[0] === word.ejemplo_uso.trim() ? ex[1] : null)];
  return ex || null;
};

const WordCard = ({ word, language, theme, query, favorite, onFavorite, index = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const Icon = wordIcon(word);
  const swatch = colorOf(word);
  const numeral = numberOf(word);
  const example = exampleOf(word, language.id);
  const part = parteDePalabra(word.palabra_objetivo, word.palabra_espanol, language.id);
  const [popup, setPopup] = useState(null); // 'hablar' | 'cuerpo'

  const play = (text = word.palabra_objetivo, url = word.audio_url) => {
    setIsPlaying(true);
    speak(text, { url, idioma: language.id, lang: language.voz?.respaldo });
    setTimeout(() => setIsPlaying(false), 1300);
  };

  return (
    <m.li
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ type: 'spring', bounce: 0.3, duration: 0.6, delay: Math.min(index, 8) * 0.04 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm hover:shadow-xl hover:shadow-stone-900/10 transition-shadow"
    >
      <span className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br ${theme.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`} aria-hidden="true" />
      <div className="relative flex items-start gap-4">
        {/* Ícono de la palabra (o el color mismo) */}
        <m.span
          whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
          transition={{ duration: 0.5 }}
          className={`relative shrink-0 w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white ${swatch ? '' : `bg-gradient-to-br ${theme.gradient}`}`}
          style={swatch ? { background: swatch } : undefined}
          aria-hidden="true"
        >
          {!swatch && <span className="brillo-liquido" aria-hidden="true" />}
          {numeral ? (
            <span className={`relative font-black text-white drop-shadow tabular-nums leading-none ${numeral.length > 5 ? 'text-sm' : numeral.length > 3 ? 'text-lg' : 'text-2xl sm:text-3xl'}`}>{numeral}</span>
          ) : (
            <Icon className={`relative w-9 h-9 sm:w-10 sm:h-10 ${swatch && /^#(f|e|d)/i.test(swatch) ? 'text-stone-800' : 'text-white'} drop-shadow`} />
          )}
        </m.span>
        <div className="flex-1 min-w-0">
          <p className={`text-2xl sm:text-3xl font-black break-words leading-tight ${theme.text}`} lang={language.lang}>
            <Highlight text={word.palabra_objetivo} query={query} />
          </p>
          {word.pronunciacion && <p className="text-stone-600 mt-1">/{word.pronunciacion}/</p>}
          <p className="text-lg font-bold mt-0.5 text-stone-800">
            <Highlight text={word.palabra_espanol} query={query} />
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={() => play()}
            aria-label={`Escuchar ${word.palabra_objetivo} (${AUDIO_LABELS[audioSource(word.audio_url)]})`}
            className={`ficha w-11 h-11 flex items-center justify-center ${theme.solid} border-black/20 text-white rounded-xl`}
          >
            <Volume2 className={`w-5 h-5 ${isPlaying ? 'anim-latido' : ''}`} aria-hidden="true" />
          </button>
          <MicButton label={`Decir ${word.palabra_objetivo} al micrófono`} onClick={() => setPopup('hablar')} />
          <button
            type="button"
            onClick={() => {
              playTap();
              onFavorite(word);
            }}
            aria-pressed={!!favorite}
            aria-label={favorite ? `Quitar ${word.palabra_objetivo} de favoritas` : `Guardar ${word.palabra_objetivo} en favoritas`}
            className={`ficha w-11 h-11 flex items-center justify-center rounded-xl ${favorite ? 'border-rose-600 bg-rose-500 text-white' : 'border-stone-300 bg-white text-stone-500 hover:text-rose-600'}`}
          >
            <Heart key={favorite ? 'si' : 'no'} className={`w-5 h-5 ${favorite ? 'fill-white anim-latido' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-2 mt-4">
        {word.categoria && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-700 text-sm font-semibold rounded-full capitalize">
            <Tag className="w-3.5 h-3.5" aria-hidden="true" />
            {word.categoria}
          </span>
        )}
        {word.tipo && <span className="px-3 py-1 bg-stone-100 text-stone-700 text-sm font-semibold rounded-full">{word.tipo}</span>}
        {word.audio_url && <span className="px-3 py-1 bg-green-50 text-green-800 text-sm font-semibold rounded-full">{AUDIO_LABELS[audioSource(word.audio_url)]}</span>}
        {part && <BodyChip onClick={() => setPopup('cuerpo')} className="ml-auto" />}
      </div>
      {popup === 'hablar' && <SpeakModal text={word.palabra_objetivo} meaning={word.palabra_espanol} url={word.audio_url} language={language} theme={theme} onClose={() => setPopup(null)} />}
      {popup === 'cuerpo' && part && <BodyPeek part={part} word={word.palabra_objetivo} url={word.audio_url} idioma={language.id} language={language} theme={theme} onClose={() => setPopup(null)} />}

      {example && (
        <div className={`relative mt-4 rounded-2xl border-l-4 ${theme.border} ${theme.soft} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-stone-500 mb-1">Ejemplo</p>
              <p className="font-semibold text-stone-900 italic" lang={language.lang}>
                {/^["«“¡¿]/.test(example[0]) ? example[0] : `“${example[0]}”`}
              </p>
              {example[1] && <p className="text-stone-600 mt-1">{example[1]}</p>}
            </div>
            <button
              type="button"
              onClick={() => play(example[0], null)}
              aria-label="Escuchar el ejemplo"
              className="shrink-0 w-9 h-9 rounded-full bg-white/80 ring-1 ring-black/5 flex items-center justify-center text-stone-600 hover:text-stone-900"
            >
              <Volume2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {word.leccion_nombre && (
        <p className="relative mt-4 flex items-center gap-2 text-sm text-stone-600">
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          De la lección <span className="font-semibold text-stone-800">{word.leccion_nombre}</span>
        </p>
      )}
    </m.li>
  );
};

export default Dictionary;
