import { Link, useNavigate } from 'react-router-dom';
import { Mountain, Heart, BookOpen, Globe, Trophy, Zap, Target, CheckCircle, ArrowRight, Play, Shield, UserX, Github, Menu, X, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { preloadOn, Register, Login, Dashboard, Dictionary } from '../routes';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import Reveal from '../ui/Reveal';
// Efectos visuales propios de SimiAru (components/fx, licencia MIT del proyecto)
import { CountUp, SpotlightCard, TiltedCard, BlurText, AnimatedContent, RotatingText } from '../ui/lazyBits';
import Magnet from '../components/fx/Magnet';
import ShinyText from '../components/fx/ShinyText';
import StarBorder from '../components/fx/StarBorder';
import logo from '../assets/logo.webp';
import llamaHero from '../assets/llama/bienvenida-sticker.webp';
import { LlamaImage } from '../components/Mascot';
import LlamaGallery from '../components/LlamaGallery';
import fotoUros from '../assets/fotos/uros-puno.webp';
import fotoPuno from '../assets/fotos/puno-titicaca.webp';
import fotoTari from '../assets/fotos/tari-aymara.webp';
import fotoSikuris from '../assets/fotos/sikuris-puno.webp';
import fotoPapas from '../assets/fotos/papas-nativas.webp';
import fotoLlamas from '../assets/fotos/llamas-litografia.webp';
import videoLago from '../assets/video/titicaca-timelapse.webm';
import miniTari from '../assets/fotos/tari-aymara-sm.webp';
import miniPapas from '../assets/fotos/papas-nativas-sm.webp';
import miniSikuris from '../assets/fotos/sikuris-puno-sm.webp';
import posterLago from '../assets/video/titicaca-timelapse.webp';

// Paleta con significado (ver PRODUCT.md):
// - verde = quechua y acción principal, azul lago = aymara, terracota = probar sin cuenta
// - neutros cálidos (stone) para todo lo demás

const LANGUAGES = {
  quechua: {
    label: 'Quechua',
    region: 'Cusco - Puno (Collao)',
    Icon: Globe,
    description:
      'La lengua del Tahuantinsuyo, hablada hoy por millones de personas en los Andes. SimiAru enseña la variedad Cusco-Collao, la que se habla en Puno.',
    facts: ['6 unidades temáticas', '13 lecciones interactivas', 'Voz sintetizada', '31 textos culturales'],
    units: [
      ['Saludos y presentaciones', 'Rimaykullayki (hola)'],
      ['La familia', 'Tayta, Mama, Wawqiy, Ñaña'],
      ['Números del 1 al 20', 'Huk, Iskay, Kimsa...'],
      ['Colores, animales y comidas', 'Puka, Kuntur, Sara'],
    ],
    tabOn: 'bg-gradient-to-r from-green-600 to-green-800 border-transparent text-white shadow-xl shadow-green-600/40',
    panel: 'bg-gradient-to-br from-green-700 to-green-900',
    soft: 'text-green-100',
    secondaryBtn: 'bg-green-700 hover:bg-green-600',
    primaryText: 'text-green-800',
    dot: 'bg-green-100 text-green-800',
  },
  aymara: {
    label: 'Aymara',
    region: 'Altiplano puneño',
    Icon: Mountain,
    description:
      'La lengua del lago Titicaca, hablada por alrededor de 2 millones de personas en Perú, Bolivia y Chile. SimiAru enseña el aymara central.',
    facts: ['6 unidades temáticas', '13 lecciones interactivas', 'Voz sintetizada', '38 textos culturales'],
    units: [
      ['Saludos y presentaciones', 'Kamisaraki (¿cómo estás?)'],
      ['La familia', 'Awki, Tayka, Jilata, Kullaka'],
      ['Números del 1 al 10', 'Maya, Paya, Kimsa...'],
      ['Colores, animales y comidas', "Qarwa, Kunturi, Ch'uqi"],
    ],
    tabOn: 'bg-gradient-to-r from-blue-600 to-blue-800 border-transparent text-white shadow-xl shadow-blue-600/40',
    panel: 'bg-gradient-to-br from-blue-800 to-indigo-950',
    soft: 'text-blue-100',
    secondaryBtn: 'bg-blue-800 hover:bg-blue-700',
    primaryText: 'text-blue-900',
    dot: 'bg-blue-100 text-blue-900',
  },
};

// Colores de la primera versión: verde, azul y morado, en tonos que mantienen el contraste
const STEP_COLORS = [
  { circle: 'from-green-600 to-green-800', glow: 'bg-green-200' },
  { circle: 'from-blue-600 to-blue-800', glow: 'bg-blue-200' },
  { circle: 'from-purple-600 to-purple-800', glow: 'bg-purple-200' },
];
const CARD_COLORS = [
  { card: 'from-blue-50 to-blue-100/60', deco: 'bg-blue-600/10', icon: 'from-blue-600 to-blue-800', tag: 'text-blue-800', spot: '#3b82f6' },
  { card: 'from-green-50 to-green-100/60', deco: 'bg-green-600/10', icon: 'from-green-600 to-green-800', tag: 'text-green-800', spot: '#22c55e' },
  { card: 'from-purple-50 to-purple-100/60', deco: 'bg-purple-600/10', icon: 'from-purple-600 to-purple-800', tag: 'text-purple-800', spot: '#a855f7' },
  { card: 'from-amber-50 to-orange-100/60', deco: 'bg-orange-600/10', icon: 'from-orange-600 to-orange-800', tag: 'text-orange-800', spot: '#f97316' },
  { card: 'from-pink-50 to-rose-100/60', deco: 'bg-rose-600/10', icon: 'from-rose-600 to-pink-700', tag: 'text-rose-800', spot: '#f43f5e' },
];

const STEP_POSES = ['bienvenida', 'escribiendo', 'leyendo'];

const STEPS = [
  ['Elige tu idioma', 'Comienza con Quechua o Aymara, con vocabulario y contenido cultural de fuentes documentadas'],
  ['Practica diariamente', 'Unos minutos al día bastan para mantener tu racha, ganar puntos y avanzar de lección'],
  ['Conecta con la cultura', 'Suma vocabulario mientras lees cuentos, proverbios, adivinanzas y canciones'],
];

const HIGHLIGHTS = [
  [CheckCircle, 'Progreso guardado', 'Retoma donde lo dejaste'],
  [Zap, 'Lecciones cortas', 'Vocabulario por temas cotidianos'],
  [Heart, 'Contenido cultural', 'Cuentos, proverbios y canciones'],
  [UserX, 'Sin cuenta', 'Prueba la Unidad 1 sin registrarte'],
];

const FEATURES = [
  [BookOpen, 'Lecciones interactivas', 'Ejercicios con voz sintetizada y corrección al instante', '92 lecciones disponibles'],
  [Heart, 'Cultura viva', 'Cuentos, proverbios, adivinanzas y canciones en quechua y aymara, con su traducción', '69 contenidos culturales'],
  [Trophy, 'Rachas e insignias', 'Gana Ayni Points por cada lección, mantén tu racha diaria y desbloquea insignias', '7 insignias desbloqueables'],
  [Target, 'Tu progreso, guardado', 'Cada lección registra tus aciertos para que veas tu avance y retomes donde lo dejaste', 'Progreso por lección'],
  [Shield, 'Sin publicidad', 'Aprende sin anuncios ni interrupciones', 'Gratis y de código abierto'],
];

// [número, sufijo, etiqueta]: los números suben con Count Up al aparecer en pantalla
const PROJECT_STATS = [
  [92, '', 'Lecciones'],
  [1500, '+', 'Palabras en el diccionario'],
  [285, '', 'Ejercicios'],
  [69, '', 'Contenidos culturales'],
];
// Entrada del inicio con Motion: el contenedor reparte el turno a cada bloque
const HERO_LIST = { oculto: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } };
const HERO_ITEM = {
  oculto: { opacity: 0, y: 28, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] } },
};

const HERO_STATS = [
  [100, '%', 'Gratis'],
  [2, '', 'Idiomas'],
  [92, '', 'Lecciones'],
];

const NAV_LINKS = [
  ['#how-it-works', 'Cómo funciona'],
  ['#features', 'Qué incluye'],
  ['#languages', 'Idiomas'],
  ['#proyecto', 'El proyecto'],
];

const REPO = 'https://github.com/FLOR345/simiaru';

// Fotos y video de Wikimedia Commons (créditos en el pie de página)
const FOTOS_CULTURA = [
  [fotoSikuris, 'Sikuris con zampoñas y bombo bailando en una fiesta de Puno', 'Sikuris en Puno', 1100, 875, '-rotate-3'],
  [fotoTari, 'Tari, una bolsa tejida aymara, junto a una laguna de altura', 'Tari aymara', 900, 1599, 'rotate-2'],
  [fotoLlamas, 'Litografía de 1853: llamas cargadas cruzando los Andes', 'Llamas en los Andes, 1853', 1260, 640, '-rotate-1'],
];

// ==================== LA PALABRA VIVA ====================
// Palabras de ejemplo: se muestran al instante, sin esperar al servidor
const EJEMPLOS = {
  agua: ['yaku', 'uma'],
  sol: ['inti', 'inti'],
  casa: ['wasi', 'uta'],
  lago: ['qucha', 'quta'],
  palabra: ['simi', 'aru'],
  papa: ['papa', "ch'uqi"],
};

// Quita tildes y mayúsculas para comparar lo escrito con el diccionario (conserva la ñ)
const normalizar = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/(?!̃)[̀-ͯ]/g, '')
    .normalize('NFC')
    .trim();

// De todas las coincidencias, la palabra exacta primero; si no, la que empieza igual
const elegirTraduccion = (palabras, termino) => {
  if (!Array.isArray(palabras) || palabras.length === 0) return null;
  const t = normalizar(termino);
  const exacta = palabras.find((p) => normalizar(p.palabra_espanol) === t);
  const empieza = palabras.find((p) => normalizar(p.palabra_espanol).startsWith(t));
  return (exacta || empieza || palabras[0]).palabra_objetivo || null;
};

const PalabraViva = () => {
  const [palabra, setPalabra] = useState('agua');
  const [resultado, setResultado] = useState({ estado: 'listo', quechua: 'yaku', aymara: 'uma' });
  const consulta = useRef(0);

  useEffect(() => {
    const termino = normalizar(palabra);
    const id = ++consulta.current;

    if (EJEMPLOS[termino]) {
      const [quechua, aymara] = EJEMPLOS[termino];
      setResultado({ estado: 'listo', quechua, aymara });
      return undefined;
    }
    if (termino.length < 2) {
      setResultado({ estado: 'vacio' });
      return undefined;
    }

    setResultado((previo) => ({ ...previo, estado: 'buscando' }));
    // El servidor gratuito se duerme: si tarda más de 10 s, se avisa en vez de dejar esperando
    const corte = new AbortController();
    let limite;
    const espera = setTimeout(async () => {
      limite = setTimeout(() => corte.abort(), 10000);
      try {
        const buscar = async (idioma) => {
          const url = `${API_URL}/api/dictionary/search?query=${encodeURIComponent(termino)}&idioma=${idioma}`;
          const respuesta = await fetch(url, { signal: corte.signal });
          if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
          const datos = await respuesta.json();
          return elegirTraduccion(datos.words, termino);
        };
        const [quechua, aymara] = await Promise.all([buscar('quechua'), buscar('aymara')]);
        if (id !== consulta.current) return;
        setResultado(quechua || aymara ? { estado: 'listo', quechua, aymara } : { estado: 'sin-resultado' });
      } catch {
        if (id === consulta.current) setResultado({ estado: 'error' });
      } finally {
        clearTimeout(limite);
      }
    }, 300);

    return () => {
      clearTimeout(espera);
      clearTimeout(limite);
      corte.abort();
    };
  }, [palabra]);

  const sinDato = <span className="text-stone-500 font-semibold">(aún no está)</span>;

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 border-2 border-white rounded-3xl p-6 sm:p-12 text-center shadow-xl">
      <p className="text-2xl sm:text-4xl font-bold leading-snug">
        <label htmlFor="palabra-viva" className="sr-only">
          Escribe una palabra en castellano
        </label>
        <input
          id="palabra-viva"
          type="text"
          value={palabra}
          maxLength={24}
          autoComplete="off"
          spellCheck="false"
          onChange={(e) => setPalabra(e.target.value)}
          style={{ width: `${Math.max(palabra.length, 3) + 1.5}ch` }}
          className="max-w-full px-2 text-center font-extrabold text-stone-900 bg-white border-b-4 border-green-700 rounded-t-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-green-200"
        />{' '}
        <span aria-live="polite" aria-atomic="true">
          {resultado.estado === 'listo' && (
            <>
              en quechua es{' '}
              <strong lang="qu" className="text-green-700">{resultado.quechua || sinDato}</strong>; en aymara,{' '}
              <strong lang="ay" className="text-blue-800">{resultado.aymara || sinDato}</strong>.
            </>
          )}
          {resultado.estado === 'buscando' && <span className="text-stone-500">lo busco en el diccionario…</span>}
          {resultado.estado === 'vacio' && <span className="text-stone-500">escribe una palabra en castellano.</span>}
          {resultado.estado === 'sin-resultado' && (
            <span className="text-stone-500">no está en el diccionario todavía. Prueba otra.</span>
          )}
          {resultado.estado === 'error' && (
            <span className="text-stone-500 text-xl sm:text-2xl">
              no pude consultar el diccionario; el servidor puede tardar en despertar. Prueba de nuevo en un momento.
            </span>
          )}
        </span>
      </p>

      <div className="mt-8 flex flex-wrap justify-center items-center gap-2">
        <span className="text-stone-600 font-semibold mr-1">Prueba con:</span>
        {Object.keys(EJEMPLOS).map((ejemplo) => (
          <button
            key={ejemplo}
            type="button"
            onClick={() => setPalabra(ejemplo)}
            className={`toque min-h-11 px-4 rounded-full border-2 font-semibold ${
              normalizar(palabra) === ejemplo
                ? 'bg-green-700 border-green-700 text-white'
                : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
            }`}
          >
            {ejemplo}
          </button>
        ))}
      </div>
      <p className="mt-6 text-sm text-stone-600">
        Las traducciones salen del diccionario de SimiAru, con más de 1,500 palabras.
      </p>
    </div>
  );
};

// Time-lapse del Titicaca en miniatura, dentro de la frase. Con movimiento reducido queda quieto.
const MiniaturaLago = ({ className }) => {
  const video = useRef(null);

  useEffect(() => {
    const consulta = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const aplicar = () => {
      const el = video.current;
      if (!el) return;
      if (consulta?.matches) el.pause();
      else el.play?.().catch(() => {});
    };
    aplicar();
    consulta?.addEventListener?.('change', aplicar);
    return () => consulta?.removeEventListener?.('change', aplicar);
  }, []);

  return (
    <video
      ref={video}
      className={className}
      src={videoLago}
      poster={posterLago}
      width="854"
      height="480"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  );
};

// Miniatura en línea con el texto, pegada a su palabra para que nunca abra una línea
const miniatura = 'inline-block h-[0.95em] w-[1.5em] mx-1 align-[-0.15em] object-cover rounded-md';

const Home = ({ enableGuestMode }) => {
  const [activeTab, setActiveTab] = useState('quechua');
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  const headerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  // El borde del encabezado aparece solo cuando hay contenido pasando por debajo
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // ¿Dónde estoy? El menú marca la sección que ocupa el centro de la pantalla
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    document.querySelectorAll('main section[id]').forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // El menú de celular se cierra con Escape, al tocar fuera del encabezado
  // y si la ventana crece hasta mostrar el menú de escritorio
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onPointerDown = (e) => {
      if (!headerRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 1280px)');
    const onDesktop = (e) => {
      if (e.matches) setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    desktop.addEventListener?.('change', onDesktop);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
      desktop.removeEventListener?.('change', onDesktop);
    };
  }, [menuOpen]);

  // Entrar como invitado: avisa a App (estado) y lo recuerda para la próxima visita
  const handleGuestMode = () => {
    enableGuestMode?.();
    try {
      localStorage.setItem('isGuest', 'true');
    } catch {
      // Navegación privada o almacenamiento bloqueado: el modo invitado dura solo esta visita
    }
    navigate('/dashboard');
  };

  // Pestañas de idioma: flechas izquierda/derecha cambian de pestaña (patrón ARIA tabs)
  const languageKeys = Object.keys(LANGUAGES);
  const handleTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = languageKeys[(languageKeys.indexOf(activeTab) + 1) % languageKeys.length];
    setActiveTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  const footerLink = 'inline-flex items-center min-h-11 text-stone-400 hover:text-white transition-colors';

  return (
    <div className="min-h-screen bg-white text-stone-900 overflow-hidden">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-3 focus:bg-white focus:text-stone-900 focus:font-bold focus:rounded-lg focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      {/* ==================== ENCABEZADO ==================== */}
      {/* Material translúcido: el contenido pasa por debajo; el borde aparece solo cuando hay contenido detrás */}
      <header ref={headerRef} data-scrolled={scrolled} className="material-cabecera fixed top-0 w-full z-50">
        <div className="container mx-auto py-3 sm:py-4">
          <div className="flex justify-between items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="" width="160" height="160" className="h-10 sm:h-12 w-auto" />
              <span className="text-xl sm:text-2xl font-black texto-degradado">SimiAru</span>
            </Link>

            <nav className="hidden xl:flex items-center gap-8 whitespace-nowrap">
              {NAV_LINKS.map(([href, label]) => {
                const current = activeSection === href.slice(1);
                return (
                  <a
                    key={href}
                    href={href}
                    aria-current={current ? 'location' : undefined}
                    className={`enlace-seccion font-semibold transition-colors ${
                      current ? 'text-green-800' : 'text-stone-700 hover:text-green-800'
                    }`}
                  >
                    {label}
                  </a>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* En escritorio: invitado e inicio de sesión a la vista; en celular y tablet van en el menú */}
              <button
                type="button"
                onClick={handleGuestMode} {...preloadOn(Dashboard)}
                className="hidden lg:flex items-center gap-2 px-5 py-2.5 whitespace-nowrap text-stone-700 font-semibold hover:text-orange-800 hover:bg-orange-50 rounded-full toque"
              >
                <UserX className="w-4 h-4" />
                Probar sin cuenta
              </button>
              <Link
                to="/login" {...preloadOn(Login)}
                className="hidden lg:block px-6 py-2.5 whitespace-nowrap text-stone-700 font-bold hover:text-green-800 transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/register" {...preloadOn(Register)}
                className="min-h-11 px-4 py-2.5 text-sm sm:px-7 sm:py-3 sm:text-base whitespace-nowrap boton-degradado font-bold rounded-full shadow-md flex items-center gap-2"
              >
                Empezar gratis
                <ArrowRight className="hidden sm:block w-5 h-5" />
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="menu-movil"
                aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
                className="xl:hidden w-11 h-11 flex items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 toque"
              >
                {/* key: el ícono nuevo entra con un cambio corto en vez de saltar */}
                {menuOpen ? (
                  <X key="cerrar" className="icono-cambio w-6 h-6" aria-hidden="true" />
                ) : (
                  <Menu key="abrir" className="icono-cambio w-6 h-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Menú de celular y tablet */}
          {/* Motion: el menú baja al abrirse y vuelve a subir al cerrarse (mismo camino de ida y vuelta) */}
          <AnimatePresence initial={false}>
          {menuOpen && (
            <m.nav
              id="menu-movil"
              aria-label="Menú"
              className="xl:hidden mt-3 pt-2 pb-2 border-t border-stone-900/10 overflow-hidden"
              initial={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
              exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
              transition={{ duration: reduceMotion ? 0.15 : 0.25, ease: [0.23, 1, 0.32, 1] }}
            >
              <ul>
                {NAV_LINKS.map(([href, label]) => (
                  <li key={href}>
                    <a
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={activeSection === href.slice(1) ? 'location' : undefined}
                      className={`toque flex items-center min-h-12 px-2 font-semibold rounded-lg ${
                        activeSection === href.slice(1) ? 'text-green-800 bg-green-50' : 'text-stone-800 hover:bg-stone-50'
                      }`}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleGuestMode} {...preloadOn(Dashboard)}
                  className="toque min-h-12 px-3 flex items-center justify-center gap-2 border-2 border-orange-700 text-orange-800 text-sm font-bold whitespace-nowrap rounded-xl"
                >
                  <UserX className="w-4 h-4" />
                  Probar sin cuenta
                </button>
                <Link
                  to="/login" {...preloadOn(Login)}
                  className="toque min-h-12 px-3 flex items-center justify-center border-2 border-stone-300 text-stone-800 text-sm font-bold whitespace-nowrap rounded-xl"
                >
                  Iniciar sesión
                </Link>
              </div>
            </m.nav>
          )}
          </AnimatePresence>
        </div>
      </header>

      <main id="contenido">
        {/* ==================== INICIO ==================== */}
        {/* Fondo de la primera versión: degradado suave con burbujas de color difuminadas que flotan */}
        <section className="fondo-burbujas pt-28 sm:pt-32 pb-24 lg:pb-28">
          <span className="burbuja burbuja-verde" aria-hidden="true" />
          <span className="burbuja burbuja-azul" aria-hidden="true" />
          <span className="burbuja burbuja-morada" aria-hidden="true" />
          <div className="container mx-auto">
            <div className="grid lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-10 items-center">
              {/* Motion: cada bloque entra después del anterior (stagger), subiendo y saliendo de un leve desenfoque */}
              <m.div className="space-y-8" initial="oculto" animate="visible" variants={HERO_LIST}>
                <m.p variants={HERO_ITEM} className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-green-700/20 rounded-full text-sm font-bold">
                  <Sparkles className="w-4 h-4 text-green-700" aria-hidden="true" />
                  {/* Shiny Text: un brillo que cruza la etiqueta cada pocos segundos */}
                  <ShinyText text="Gratis • Sin publicidad • Código abierto" color="#166534" shineColor="#86efac" speed={3} delay={2} />

                </m.p>

                <m.div variants={HERO_ITEM} className="space-y-5">
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
                    <span className="text-stone-900">Aprende</span>
                    <br />
                    <span className="texto-degradado texto-vivo">Quechua y Aymara</span>
                  </h1>
                  {/* Texto que rota: la forma de aprender cambia sola */}
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-2xl sm:text-3xl font-black text-stone-800">
                    <span>con</span>
                    <RotatingText
                      texts={['juegos', 'canciones', 'cuentos', 'adivinanzas', 'tu llamita']}
                      effect="flip"
                      rotationInterval={2200}
                      staggerDuration={0.025}
                      mainClassName="px-3 py-1 rounded-2xl bg-gradient-to-r from-green-600 via-sky-600 to-purple-600 text-white shadow-lg overflow-hidden"
                    />
                  </p>
                  <p className="text-xl sm:text-2xl text-stone-600 leading-relaxed max-w-xl">
                    Lecciones cortas, un diccionario y textos culturales para empezar a aprender las lenguas del altiplano
                  </p>
                </m.div>

                <m.div variants={HERO_ITEM} className="flex flex-col sm:flex-row gap-4">
                  {/* Magnet: el botón principal se acerca un poco al mouse (en pantallas táctiles no hace nada) */}
                  <Magnet padding={60} magnetStrength={5} wrapperClassName="block sm:inline-block" innerClassName="block">
                    <Link
                      to="/register" {...preloadOn(Register)}
                      className="group px-9 py-4 boton-degradado font-bold rounded-2xl shadow-lg text-center text-lg flex items-center justify-center gap-3"
                    >
                      Empezar gratis
                      <ArrowRight className="w-6 h-6 motion-safe:group-hover:translate-x-1 transition-transform duration-200 ease-out" />
                    </Link>
                  </Magnet>
                  {/* Luz en el borde: una luz naranja recorre el borde del botón de invitado */}
                  <StarBorder
                    as="button"
                    type="button"
                    onClick={handleGuestMode}
                    {...preloadOn(Dashboard)}
                    theme="light"
                    color="#ea580c"
                    borderColor="rgba(194, 65, 12, 0.45)"
                    textColor="#9a3412"
                    radius={16}
                    thickness={2}
                    duration={3.5}
                    glow={0.8}
                    className="toque !px-9 !py-4 text-lg font-bold gap-3 hover:bg-orange-50"
                  >
                    <UserX className="w-6 h-6" />
                    Probar sin cuenta
                  </StarBorder>
                </m.div>

                <m.p variants={HERO_ITEM} className="flex items-center gap-2 text-sm text-stone-600">
                  <CheckCircle className="w-4 h-4 text-orange-700 shrink-0" />
                  El modo invitado te permite explorar la Unidad 1 sin crear una cuenta
                </m.p>

                <m.div variants={HERO_ITEM} className="grid grid-cols-3 gap-6 pt-8 border-t-2 border-stone-200/70">
                  {HERO_STATS.map(([value, suffix, label], i) => (
                    <div key={label}>
                      <div className="text-2xl min-[375px]:text-3xl sm:text-4xl font-black texto-degradado-corto mb-1 tabular-nums">
                        <CountUp to={value} suffix={suffix} duration={1.5} delay={0.8 + i * 0.15} />
                      </div>
                      <div className="text-sm text-stone-600 font-semibold">{label}</div>
                    </div>
                  ))}
                </m.div>
              </m.div>

              {/* La llama es la imagen principal (como en la primera versión); el Titicaca va detrás como una foto impresa */}
              <m.div
                className="relative isolate mx-auto w-full max-w-xl py-6 sm:py-8 lg:self-stretch lg:flex lg:items-center"
                initial={{ opacity: 0, x: 60, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.25 }}
              >
                {/* Resplandores de color detrás, como en la primera versión */}
                <span className="absolute -z-10 -top-6 -right-10 w-72 h-72 rounded-full bg-gradient-to-br from-green-400 to-blue-500 blur-3xl opacity-30" aria-hidden="true" />
                <span className="absolute -z-10 -bottom-6 -left-10 w-72 h-72 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 blur-3xl opacity-25" aria-hidden="true" />

                {/* Foto de Puno (islas flotantes de los Uros) como copia impresa, en la esquina de abajo a la izquierda */}
                <m.figure
                  className="absolute z-20 -left-2 sm:-left-6 bottom-2 sm:bottom-4 w-28 sm:w-36 bg-white p-2 pb-3 rounded-2xl shadow-2xl -rotate-6"
                  initial={{ opacity: 0, rotate: -18, y: 20 }}
                  animate={{ opacity: 1, rotate: -6, y: 0 }}
                  transition={{ type: 'spring', bounce: 0.35, duration: 0.9, delay: 0.7 }}
                >
                  <img
                    src={fotoUros}
                    alt="Arco de totora en las islas flotantes de los Uros, en el lago Titicaca (Puno)"
                    width="640"
                    height="482"
                    className="w-full aspect-[4/3] object-cover rounded-xl"
                  />
                  <figcaption className="mt-1.5 text-center text-xs font-bold text-stone-600">Islas de los Uros · Puno</figcaption>
                </m.figure>

                {/* Tarjeta principal con la llama */}
                <div className="relative z-10 w-full rounded-[2.5rem] border border-white/90 bg-white/80 shadow-2xl shadow-indigo-950/10 px-4 sm:px-6 pt-4 sm:pt-6 pb-16 sm:pb-20 text-center backdrop-blur-sm">
                  {/* Motion: la llama entra con un rebote y luego "respira" arriba y abajo */}
                  <m.img
                    src={llamaHero}
                    alt="Mascota de SimiAru: una llamita con su chalina andina de colores, saludando"
                    width="560"
                    height="560"
                    fetchpriority="high"
                    className="w-full max-w-[31rem] h-auto mx-auto drop-shadow-[0_20px_24px_rgba(120,70,25,0.12)]"
                    initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, y: [0, -10, 0] }}
                    transition={{
                      opacity: { duration: 0.4, delay: 0.5 },
                      scale: { type: 'spring', bounce: 0.45, duration: 0.8, delay: 0.5 },
                      rotate: { type: 'spring', bounce: 0.45, duration: 0.8, delay: 0.5 },
                      y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 1.4 },
                    }}
                  />
                  <p className="mt-1 text-2xl sm:text-3xl font-black texto-degradado">¡Rimaykullayki!<br />¡Kamisaraki!</p>
                  <p className="mt-1 text-sm font-semibold text-stone-600">"Hola" en quechua y en aymara</p>
                </div>

                {/* Etiquetas flotantes de la primera versión, con lo que SimiAru sí tiene */}
                {/* Motion: las etiquetas flotan arriba y abajo, cada una a su ritmo */}
                <m.div className="etiqueta-flotante absolute z-20 top-8 -right-2 sm:-right-4 rotate-6 bg-gradient-to-br from-green-600 to-green-800 text-white px-4 sm:px-5 py-2.5 rounded-2xl shadow-lg" aria-hidden="true" animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                  <span className="flex items-center gap-2 font-bold text-sm sm:text-base">
                    <Trophy className="w-5 h-5" />
                    Ayni Points
                  </span>
                </m.div>
                <m.div className="etiqueta-flotante absolute z-20 bottom-4 right-0 sm:-right-4 rotate-3 bg-gradient-to-br from-blue-700 to-purple-700 text-white px-4 sm:px-5 py-2.5 rounded-2xl shadow-lg" aria-hidden="true" animate={{ y: [0, -10, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}>
                  <span className="flex items-center gap-2 font-bold text-sm sm:text-base">
                    <Zap className="w-5 h-5" />
                    Racha diaria
                  </span>
                </m.div>
              </m.div>
            </div>
          </div>

          {/* Ola que separa el inicio de la sección siguiente (primera versión) */}
          <svg className="absolute bottom-0 left-0 w-full h-auto" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
            <path
              fill="#ffffff"
              d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L0,120Z"
            />
          </svg>
        </section>

        {/* ==================== LA PALABRA VIVA ==================== */}
        <section id="palabra" className="py-24 bg-white">
          <div className="container mx-auto">
            <Reveal className="text-center mb-12 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Prueba una <span className="texto-degradado-corto">palabra</span>
              </h2>
              <p className="text-xl text-stone-600 max-w-3xl mx-auto leading-relaxed">
                Aprende las palabras del{' '}
                <span className="whitespace-nowrap">lago<MiniaturaLago className={miniatura} />,</span> del{' '}
                <span className="whitespace-nowrap">tejido<img className={miniatura} src={miniTari} alt="" width="900" height="1599" loading="lazy" />,</span> de la{' '}
                <span className="whitespace-nowrap">chacra<img className={miniatura} src={miniPapas} alt="" width="1300" height="747" loading="lazy" /></span> y de la{' '}
                <span className="whitespace-nowrap">fiesta<img className={miniatura} src={miniSikuris} alt="" width="1100" height="875" loading="lazy" />,</span> en quechua y en aymara
              </p>
            </Reveal>
            <PalabraViva />
          </div>
        </section>

        {/* ==================== CÓMO FUNCIONA ==================== */}
        <section id="how-it-works" className="py-24 bg-stone-50">
          <div className="container mx-auto">
            <Reveal className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Aprende en <span className="texto-degradado-corto">3 pasos</span>
              </h2>
              <BlurText text="Tu viaje hacia las lenguas andinas comienza aquí" className="text-xl text-stone-600 max-w-3xl mx-auto" delay={60} stepDuration={0.3} />
            </Reveal>

            <AnimatedContent distance={60} duration={0.8} threshold={0.15} tilt={12}>
            <ol className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="text-center group">
                  {/* Círculo en degradado con un resplandor detrás (primera versión) */}
                  <div className="relative mx-auto mb-2 w-40 aspect-square transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-2" aria-hidden="true">
                    <LlamaImage pose={STEP_POSES[i]} />
                  </div>
                  <div className="relative mb-8 -mt-6">
                    <div
                      className={`relative z-10 w-20 h-20 bg-gradient-to-br ${STEP_COLORS[i].circle} rounded-full flex items-center justify-center mx-auto text-white text-3xl font-black shadow-xl transition-transform duration-300 ease-out motion-safe:group-hover:scale-110`}
                    >
                      {i + 1}
                    </div>
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 ${STEP_COLORS[i].glow} rounded-full blur-2xl opacity-60`} aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{title}</h3>
                  <p className="text-stone-600 leading-relaxed">{text}</p>
                </li>
              ))}
            </ol>
            </AnimatedContent>

            <ul className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {HIGHLIGHTS.map(([Icon, title, text]) => (
                <li key={title} className="flex items-start gap-3">
                  <Icon className="w-6 h-6 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold mb-1">{title}</h3>
                    <p className="text-sm text-stone-600">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ==================== LA LLAMITA ==================== */}
        <section id="llamita" className="py-24 bg-gradient-to-b from-white via-green-50/40 to-white overflow-hidden">
          <div className="container mx-auto">
            <Reveal className="text-center mb-14 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Tu compañera de <span className="texto-degradado-corto">aprendizaje</span>
              </h2>
              <p className="text-xl text-stone-600 max-w-3xl mx-auto">Una llamita con su chalina de colores te acompaña en cada lección. Tócala para conocerla.</p>
            </Reveal>
            <AnimatedContent distance={80} duration={0.9} ease="back.out(1.4)" scale={0.92} blur={6} threshold={0.15}>
              <LlamaGallery />
            </AnimatedContent>
          </div>
        </section>

        {/* ==================== QUÉ INCLUYE ==================== */}
        <section id="features" className="py-24 bg-white">
          <div className="container mx-auto">
            <Reveal className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Qué incluye <span className="texto-degradado-corto">SimiAru</span>
              </h2>
              <BlurText text="Vocabulario, ejercicios y cultura del altiplano en un solo lugar, gratis y sin publicidad" className="text-xl text-stone-600 max-w-3xl mx-auto" delay={60} stepDuration={0.3} />
            </Reveal>

            <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map(([Icon, title, text, tag], i) => {
                const color = CARD_COLORS[i % CARD_COLORS.length];
                return (
                <Reveal as="li" key={title} delay={(i % 3) * 0.08}>
                {/* Spotlight Card: una luz de color sigue al mouse dentro de la tarjeta */}
                <SpotlightCard
                  theme="light"
                  spotlightColor={color.spot}
                  intensity={0.35}
                  className={`tarjeta-viva group h-full bg-gradient-to-br ${color.card} !p-7 sm:!p-8`}
                >
                  {/* Cuadro decorativo inclinado que se endereza al pasar el mouse */}
                  <span className={`absolute top-6 right-6 w-16 h-16 ${color.deco} rounded-2xl rotate-12 transition-transform duration-300 ease-out motion-safe:group-hover:rotate-0`} aria-hidden="true" />
                  <div className={`relative w-14 h-14 bg-gradient-to-br ${color.icon} rounded-2xl flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="relative text-2xl font-black mb-3">{title}</h3>
                  <p className="relative text-stone-700 leading-relaxed mb-4">{text}</p>
                  <p className={`relative flex items-center gap-2 ${color.tag} font-bold text-sm`}>
                    <CheckCircle className="w-4 h-4" aria-hidden="true" />
                    {tag}
                  </p>
                </SpotlightCard>
                </Reveal>
                );
              })}

              <li className="tarjeta-viva relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100/60 rounded-3xl p-7 sm:p-8 border-2 border-orange-700">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                  <UserX className="w-7 h-7 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black mb-3">Prueba sin cuenta</h3>
                <p className="text-stone-700 leading-relaxed mb-4">
                  Explora la Unidad 1 sin crear una cuenta. Para guardar tu progreso, regístrate gratis
                </p>
                <button
                  type="button"
                  onClick={handleGuestMode} {...preloadOn(Dashboard)}
                  className="toque min-h-11 flex items-center gap-2 text-orange-800 font-bold text-sm hover:text-orange-900"
                >
                  <Play className="w-5 h-5" />
                  <span>Probar sin cuenta <span aria-hidden="true">→</span></span>
                </button>
              </li>
            </ul>
          </div>
        </section>

        {/* ==================== IDIOMAS ==================== */}
        <section id="languages" className="py-24 bg-stone-50">
          <div className="container mx-auto">
            <Reveal className="text-center mb-12 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">Elige tu idioma</h2>
              <BlurText text="Dos lenguas del altiplano, cada una con 6 unidades y 13 lecciones" className="text-xl text-stone-600 max-w-3xl mx-auto" delay={60} stepDuration={0.3} />
            </Reveal>

            <figure className="max-w-5xl mx-auto mb-12">
              <div className="rounded-3xl overflow-hidden aspect-[16/9] sm:aspect-[21/9]">
                <img
                  src={fotoPuno}
                  alt="Puno desde un cerro: casas de ladrillo hasta la orilla del lago Titicaca y los cerros al fondo"
                  width="1600"
                  height="642"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <figcaption className="mt-4 text-center text-stone-600">
                <strong className="text-stone-900">Dos lenguas, un mismo lago.</strong> En Puno, el quechua y el aymara
                conviven en la misma calle, a veces en la misma familia.
              </figcaption>
            </figure>

            <div className="flex justify-center gap-4 mb-10" role="tablist" aria-label="Idioma">
              {languageKeys.map((key) => {
                const selected = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    id={`tab-${key}`}
                    aria-selected={selected}
                    aria-controls={`panel-${key}`}
                    tabIndex={selected ? 0 : -1}
                    onKeyDown={handleTabKey}
                    onClick={() => setActiveTab(key)}
                    className={`relative px-8 py-3.5 rounded-2xl font-bold text-lg border-2 toque ${
                      selected ? 'border-transparent text-white' : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    {/* Motion layoutId: el fondo de color se desliza de una pestaña a la otra */}
                    {selected && (
                      <m.span
                        layoutId="pestana-idioma"
                        className={`absolute -inset-0.5 rounded-2xl ${LANGUAGES[key].tabOn}`}
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.18, duration: 0.45 }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative">{LANGUAGES[key].label}</span>
                  </button>
                );
              })}
            </div>

            {languageKeys.map((key) => {
              const lang = LANGUAGES[key];
              const { Icon } = lang;
              return (
                <div
                  key={key}
                  id={`panel-${key}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${key}`}
                  hidden={activeTab !== key}
                  className="max-w-5xl mx-auto rounded-3xl overflow-hidden border border-stone-200"
                >
                  <div className="grid md:grid-cols-2">
                    <div className={`${lang.panel} p-8 sm:p-12 text-white`}>
                      <div className="flex items-center gap-4 mb-8">
                        <Icon className="w-14 h-14" aria-hidden="true" />
                        <div>
                          <h3 className="text-4xl font-bold">{lang.label}</h3>
                          <p className={`${lang.soft} text-lg`}>{lang.region}</p>
                        </div>
                      </div>
                      <p className={`text-xl ${lang.soft} mb-8 leading-relaxed`}>{lang.description}</p>
                      <ul className="space-y-4">
                        {lang.facts.map((fact) => (
                          <li key={fact} className="flex items-center gap-3">
                            <CheckCircle className="w-6 h-6" aria-hidden="true" />
                            <span className="text-lg">{fact}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-3 mt-8">
                        <Link to="/register" {...preloadOn(Register)} className={`px-6 py-3 bg-white ${lang.primaryText} font-bold rounded-xl hover:bg-stone-100 toque`}>
                          Empezar <span aria-hidden="true">→</span>
                        </Link>
                        <button
                          type="button"
                          onClick={handleGuestMode} {...preloadOn(Dashboard)}
                          className={`px-6 py-3 ${lang.secondaryBtn} text-white font-bold rounded-xl toque flex items-center gap-2`}
                        >
                          <UserX className="w-4 h-4" />
                          Probar
                        </button>
                      </div>
                    </div>
                    <div className="p-8 sm:p-12 bg-white">
                      <h4 className="text-2xl font-bold mb-6">Lo que aprenderás</h4>
                      <ol className="space-y-5">
                        {lang.units.map(([title, examples], i) => (
                          <li key={title} className="flex items-start gap-3">
                            <span className={`w-8 h-8 rounded-full ${lang.dot} flex items-center justify-center shrink-0 font-bold`}>{i + 1}</span>
                            <div>
                              <h5 className="font-bold">{title}</h5>
                              <p className="text-stone-600 text-sm">{examples}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ==================== CULTURA VIVA ==================== */}
        <section id="cultura" className="py-24 bg-white overflow-hidden">
          <div className="container mx-auto">
            <Reveal className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Cultura <span className="texto-degradado-corto">viva</span>
              </h2>
              <BlurText text="69 cuentos, proverbios, adivinanzas y canciones, en quechua y en aymara, cada uno con su traducción" className="text-xl text-stone-600 max-w-3xl mx-auto" delay={60} stepDuration={0.3} />
            </Reveal>

            <ul className="grid sm:grid-cols-3 gap-10 sm:gap-6 max-w-5xl mx-auto items-center">
              {FOTOS_CULTURA.map(([src, alt, caption, , , giro], i) => (
                <Reveal as="li" key={caption} delay={i * 0.1}>
                  <figure className={`copia ${giro} bg-white p-3 pb-4 rounded-2xl border border-stone-200 shadow-lg`}>
                    {/* Tilted Card: la foto se inclina en 3D hacia el mouse, con un reflejo de luz */}
                    <TiltedCard
                      imageSrc={src}
                      altText={alt}
                      containerHeight="220px"
                      containerWidth="100%"
                      imageHeight="220px"
                      imageWidth="100%"
                      rotateAmplitude={10}
                      scaleOnHover={1.04}
                      showTooltip={false}
                      flipOnClick={false}
                      gyroscope={false}
                      radius={12}
                      glare={0.35}
                    />
                    <figcaption className="mt-3 text-center font-semibold text-stone-700">{caption}</figcaption>
                  </figure>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ==================== EL PROYECTO ==================== */}
        <section id="proyecto" className="py-24 bg-stone-50">
          <div className="container mx-auto">
            <Reveal className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Una herramienta <span className="texto-degradado-corto">abierta</span> para lenguas originarias
              </h2>
              <BlurText text="SimiAru es un proyecto gratuito y de código abierto para aprender quechua y aymara. Su contenido sigue creciendo y cualquier persona puede revisar y mejorar el código." className="text-xl text-stone-600 max-w-3xl mx-auto" delay={60} stepDuration={0.3} />
            </Reveal>

            <ul className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
              {PROJECT_STATS.map(([value, suffix, label], i) => (
                <li key={label}>
                  <div className="text-4xl sm:text-5xl font-black texto-degradado mb-2 tabular-nums">
                    <CountUp to={value} suffix={suffix} separator="," duration={2} delay={i * 0.12} />
                  </div>
                  <div className="text-stone-600 font-semibold">{label}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ==================== LLAMADA FINAL ==================== */}
        {/* Degradado completo con burbujas blancas difuminadas, como el cierre de la primera versión */}
        <section className="relative isolate overflow-hidden py-24 bg-gradient-to-br from-green-700 via-blue-700 to-purple-700">
          <span className="burbuja -z-10 bg-white opacity-15 top-[-6rem] left-[-6rem]" aria-hidden="true" />
          <span className="burbuja -z-10 bg-white opacity-10 bottom-[-8rem] right-[-6rem] [animation-delay:-6s]" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-0 left-[4%] hidden lg:block w-56 xl:w-64 aspect-square anim-flotar" aria-hidden="true">
            <LlamaImage pose="celebrando" />
          </div>
          <div className="pointer-events-none absolute bottom-0 right-[4%] hidden lg:block w-48 xl:w-56 aspect-square anim-flotar [animation-delay:-2s]" aria-hidden="true">
            <LlamaImage pose="bienvenida" />
          </div>
          <div className="container mx-auto text-center">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="mx-auto w-32 aspect-square lg:hidden" aria-hidden="true">
                <LlamaImage pose="celebrando" />
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
                Empieza con la <span className="text-yellow-300">Unidad 1</span>
              </h2>
              <p className="text-xl md:text-2xl text-green-50 leading-relaxed">
                Crea tu cuenta para guardar tu progreso, o pruébala sin registrarte
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Link
                  to="/register" {...preloadOn(Register)}
                  className="px-10 py-5 bg-white text-green-800 font-bold rounded-2xl hover:bg-green-50 toque text-xl"
                >
                  Empezar gratis
                </Link>
                <button
                  type="button"
                  onClick={handleGuestMode} {...preloadOn(Dashboard)}
                  className="px-10 py-5 border-2 border-white text-white font-bold rounded-2xl hover:bg-green-700 toque text-xl flex items-center gap-3"
                >
                  <UserX className="w-6 h-6" />
                  Probar sin cuenta
                </button>
              </div>
              <ul className="text-green-50 text-sm pt-2 space-y-2">
                <li className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-200" aria-hidden="true" />
                  <span className="font-semibold">Gratis y sin publicidad</span>
                </li>
                <li className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-200" aria-hidden="true" />
                  <span className="font-semibold">Sin cuenta, explora la Unidad 1 completa</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* ==================== PIE DE PÁGINA ==================== */}
      <footer className="bg-stone-900 text-white py-16">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img src={logo} alt="" width="160" height="160" loading="lazy" decoding="async" className="h-12 w-auto rounded-lg" />
                <span className="text-2xl font-extrabold">SimiAru</span>
              </div>
              <p className="text-stone-400 leading-relaxed">
                Preservando y difundiendo las lenguas ancestrales de los Andes para las futuras generaciones.
              </p>
              <a
                href={REPO}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Código de SimiAru en GitHub (se abre en otra pestaña)"
                className="inline-flex w-11 h-11 bg-stone-800 hover:bg-stone-700 rounded-full items-center justify-center toque"
              >
                <Github className="w-5 h-5" aria-hidden="true" />
              </a>
            </div>

            <nav aria-label="Aprende">
              <h2 className="text-lg font-bold mb-2">Aprende</h2>
              <ul>
                <li><a href="#languages" className={footerLink}>Quechua y aymara</a></li>
                <li><a href="#how-it-works" className={footerLink}>Cómo funciona</a></li>
                <li><Link to="/dictionary" {...preloadOn(Dictionary)} className={footerLink}>Diccionario</Link></li>
                <li>
                  <button type="button" onClick={handleGuestMode} {...preloadOn(Dashboard)} className={footerLink}>
                    Probar sin cuenta
                  </button>
                </li>
              </ul>
            </nav>

            <nav aria-label="Proyecto">
              <h2 className="text-lg font-bold mb-2">Proyecto</h2>
              <ul>
                <li><a href="#proyecto" className={footerLink}>Sobre SimiAru</a></li>
                <li><a href={REPO} target="_blank" rel="noopener noreferrer" className={footerLink}>Código en GitHub</a></li>
                <li><a href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer" className={footerLink}>Reportar un problema</a></li>
                <li><a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" className={footerLink}>Licencia MIT</a></li>
              </ul>
            </nav>
          </div>

          <div className="border-t border-stone-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-stone-400 text-sm">© 2026 SimiAru</p>
            <p className="text-stone-400 text-sm">Hecho para preservar lenguas ancestrales</p>
          </div>

          <p className="mt-8 text-stone-400 text-sm leading-relaxed max-w-4xl [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-white">
            Fotos y video de Wikimedia Commons, recortados para esta página:{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Isla_Uros,_Puno_16.jpg">islas de los Uros</a>, de Ordzonhyd Rudyard Tarco Palomino (
            <a href="https://creativecommons.org/licenses/by/4.0">CC BY 4.0</a>);{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Vista_de_Puno_y_el_Titicaca,_Per%C3%BA,_2015-08-01,_DD_53-54_PAN.JPG">vista de Puno</a>, de Diego Delso;{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Tari_textil_Aymara.jpg">tari aymara</a>, de Jhulis (las dos{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a>);{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Types_of_Potatoes_in_Peru.jpg">papas nativas</a>, de Cathetovar (
            <a href="https://creativecommons.org/licenses/by/4.0">CC BY 4.0</a>);{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Sikuris,_Puno-Peru.jpg">sikuris de Puno</a> (CC0);{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Llamas_traversing_the_Andes_laden_with_silver_Titicaca_balsa_off_Puno_-_-_sketched_by_L._Gibbon_;_JQ_;_lith._of_P.S._Duval_%26_Co._Philada._LCCN2014649307.tif">litografía de L. Gibbon, 1853</a> (dominio público) y{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Lake_Titicaca_time-lapse.webm">time-lapse del Titicaca</a>, de Jemma Saunders (
            <a href="https://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>).
          </p>
        </div>
      </footer>

      <style>{`
        html {
          scroll-behavior: smooth;
        }
        p {
          text-wrap: pretty;
        }
        h1, h2, h3 {
          text-wrap: balance;
        }
        /* Momento propio: una línea "tejida" bajo cada lengua, en su color */
        .lengua-subrayado {
          position: relative;
          display: inline-block;
        }
        .lengua-subrayado::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -0.04em;
          height: 0.09em;
          border-radius: 999px;
          background: currentColor;
          opacity: 0.35;
          animation: tejido 700ms cubic-bezier(0.16, 1, 0.3, 1) 150ms both;
        }
        .lengua-segunda::after {
          animation-delay: 330ms;
        }
        @keyframes tejido {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0 0 0); }
        }
        /* El cambio de pestaña es instantáneo: también se hace con las flechas del teclado */
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        /* Encabezado como material translúcido (Apple): el contenido se ve pasar por debajo */
        .material-cabecera {
          background: rgba(255, 255, 255, 0.72);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          backdrop-filter: saturate(180%) blur(20px);
          box-shadow: 0 1px 0 rgba(28, 25, 23, 0);
          transition: box-shadow 200ms ease, background-color 200ms ease;
        }
        /* Borde de desplazamiento: solo cuando hay contenido detrás */
        .material-cabecera[data-scrolled='true'] {
          box-shadow: 0 1px 0 rgba(28, 25, 23, 0.08), 0 10px 24px -18px rgba(28, 25, 23, 0.35);
        }
        /* Navegadores sin desenfoque: fondo casi sólido para que el texto siga legible */
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .material-cabecera {
            background: rgba(255, 255, 255, 0.97);
          }
        }
        @media (prefers-reduced-transparency: reduce) {
          .material-cabecera {
            background: #fff;
            -webkit-backdrop-filter: none;
            backdrop-filter: none;
          }
        }
        @media (prefers-contrast: more) {
          .material-cabecera {
            background: #fff;
            -webkit-backdrop-filter: none;
            backdrop-filter: none;
            box-shadow: 0 1px 0 #44403c;
          }
        }
        /* Dónde estoy: una línea corta bajo la sección actual del menú */
        .enlace-seccion {
          position: relative;
          display: inline-flex;
          align-items: center;
          min-height: 44px;
        }
        .enlace-seccion::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 6px;
          height: 2px;
          border-radius: 999px;
          background: currentColor;
          transform: scaleX(0);
          transition: transform 250ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .enlace-seccion[aria-current]::after {
          transform: scaleX(1);
        }
        /* Menú del celular: baja desde el encabezado y se materializa (desenfoque + posición) */
        @keyframes menu-entrada {
          from { opacity: 0; transform: translateY(-8px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .menu-entrada {
          transform-origin: top;
          animation: menu-entrada 180ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        /* Foto de inicio: se abre de abajo hacia arriba una sola vez, al cargar */
        @keyframes foto-entrada {
          from { clip-path: inset(100% 0 0 0); }
          to { clip-path: inset(0 0 0 0); }
        }
        .foto-entrada {
          animation: foto-entrada 900ms cubic-bezier(0.77, 0, 0.175, 1) 100ms both;
        }
        /* Fotos de cultura: con mouse, la copia se endereza y sube un poco */
        .copia {
          transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        @media (hover: hover) and (pointer: fine) {
          .copia:hover {
            transform: rotate(0deg) translateY(-4px);
          }
        }
        /* Ícono de menú / cerrar: entra un poco más pequeño, nunca desde cero */
        @keyframes icono-cambio {
          from { opacity: 0; transform: scale(0.9) rotate(-45deg); }
          to { opacity: 1; transform: none; }
        }
        .icono-cambio {
          animation: icono-cambio 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        /* Movimiento reducido: sin desplazamientos; se conservan color y opacidad */
        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
          .lengua-subrayado::after {
            animation: none;
          }
          .menu-entrada,
          .icono-cambio,
          .foto-entrada {
            animation: fade-in 150ms ease-out;
          }
          .copia {
            transition: none;
          }
          .enlace-seccion::after {
            transition: opacity 150ms ease;
          }
          .enlace-seccion:not([aria-current])::after {
            opacity: 0;
          }
        }
        /* Ajuste para el encabezado fijo */
        section {
          scroll-margin-top: 80px;
        }
      `}</style>
    </div>
  );
};

export default Home;
