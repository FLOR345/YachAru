import { useEffect, useRef, useState } from 'react';
import Reveal from '../ui/Reveal';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Flame, Star, TrendingUp, BookOpen, Lock, CheckCircle, Sparkles, Award, ChevronDown, Play, UserX, AlertCircle, RefreshCw, XCircle, Gamepad2, ArrowRight, School } from 'lucide-react';
import axios from 'axios';
import logo from '../assets/logo.webp';

// URL del backend
import { API_URL } from '../config.js';
import { getLevel } from '../utils/levels.js';
import { RingProgress, Tooltip } from '@mantine/core';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import MantineShell from '../ui/MantineShell';
import { CountUp } from '../ui/lazyBits';
import ConsentDialog from '../components/ConsentDialog';
import LearningPath from '../components/LearningPath';
import Mascot from '../components/Mascot';
import { Practice, preloadOn } from '../routes';
import { LANGUAGES, languageStyle, getLanguage } from '../languages';
import WeekActivity from '../components/WeekActivity';
import GradientText from '../components/fx/GradientText';
import Decor from '../components/Decor';
import SplitText from '../components/fx/SplitText';
import LanguagePicker from '../components/LanguagePicker';

// Misma paleta que la portada: verde = quechua, azul lago = aymara, terracota = invitado
// Idiomas desde los paquetes de src/languages: una lengua nueva con contenido aparece sola en el selector
const LANGUAGE_STYLE = Object.fromEntries(
  LANGUAGES.map((pack) => {
    const style = languageStyle(pack.id);
    return [pack.id, { label: pack.nombre, region: `${pack.variedad} · ${pack.region}`, accent: style.text, bar: style.solid, hex: style.hex }];
  })
);

// Saludo con el primer nombre: el nombre completo vive en el perfil
const firstName = (nombre) => String(nombre || '').trim().split(/\s+/)[0] || 'amigo';
// Números con separador de miles (9,999,999) para que se lean de un vistazo
const formatNumber = (value) => Number(value || 0).toLocaleString('es-PE');
const Dashboard = ({ user, setUser, isGuest, setIsGuest }) => {
  const [units, setUnits] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('quechua');
  const [langTotals, setLangTotals] = useState({}); // lecciones de cada lengua

  // Total de lecciones de cada lengua (para el avance en las tarjetas de idioma)
  useEffect(() => {
    Promise.all(
      LANGUAGES.map((l) =>
        axios
          .get(`${API_URL}/api/lessons/units?idioma=${l.id}`)
          .then((r) => [l.id, (r.data.units || []).reduce((a, u) => a + (u.lecciones_count || 0), 0)])
          .catch(() => [l.id, 0])
      )
    ).then((entries) => setLangTotals(Object.fromEntries(entries)));
  }, []);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      // Si es invitado, solo cargar unidades sin autenticación
      if (isGuest) {
        const unitsRes = await axios.get(`${API_URL}/api/lessons/units?idioma=${selectedLanguage}`);
        setUnits(unitsRes.data.units);
        setProgress([]); // Invitados no tienen progreso
      } else {
        const token = localStorage.getItem('token');
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        const [unitsRes, progressRes, profileRes] = await Promise.all([
          axios.get(`${API_URL}/api/lessons/units?idioma=${selectedLanguage}`),
          axios.get(`${API_URL}/api/progress`),
          // Racha, puntos y nivel actualizados (los guardados al iniciar sesión pueden estar viejos)
          axios.get(`${API_URL}/api/auth/profile`).catch(() => null),
        ]);

        setUnits(unitsRes.data.units);
        setProgress(progressRes.data.progress);
        const fresh = profileRes?.data?.user;
        // Solo se avisa a App si algo cambió (evita volver a dibujar todo sin motivo)
        if (fresh && setUser && JSON.stringify({ ...user, ...fresh }) !== JSON.stringify(user)) {
          const merged = { ...user, ...fresh };
          setUser(merged);
          try {
            localStorage.setItem('user', JSON.stringify(merged));
          } catch {
            // almacenamiento bloqueado: se usa solo en esta visita
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      if (error.response?.status === 401 && !isGuest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isGuest');
    if (setUser) setUser(null);
    if (setIsGuest) setIsGuest(false);
    navigate('/');
  };

  const isLessonCompleted = (lessonId) => {
    if (isGuest) return false; // Invitados nunca tienen lecciones completadas
    return progress.some((p) => p.leccion_id === lessonId && p.completado);
  };

  // Solo las lecciones del idioma elegido (el progreso trae las de todas las lenguas)
  const langStats = Object.fromEntries(
    LANGUAGES.filter((l) => langTotals[l.id] !== undefined).map((l) => [
      l.id,
      { total: langTotals[l.id], done: isGuest ? 0 : progress.filter((p) => p.completado && p.idioma === l.id).length },
    ])
  );

  const completedLessons = progress.filter((p) => p.completado && (!p.idioma || p.idioma === selectedLanguage)).length;
  const totalLessons = units.reduce((acc, unit) => acc + (unit.lecciones_count || 0), 0);
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const displayUser = isGuest ? { nombre: 'Invitado', racha_actual: 0, puntos_totales: 0, nivel_actual: 1 } : user;
  const lang = LANGUAGE_STYLE[selectedLanguage];
  const lockedUnits = Math.max(units.length - 1, 0);

  const stats = [
    {
      Icon: Flame,
      iconClass: 'text-orange-700',
      card: 'from-orange-50 to-amber-100/70',
      icon: 'from-orange-500 to-orange-700',
      label: 'Racha',
      value: formatNumber(displayUser?.racha_actual),
      count: isGuest ? undefined : Number(displayUser?.racha_actual || 0),
      detail: isGuest ? 'Regístrate para guardar tu racha' : 'días seguidos',
    },
    {
      Icon: Star,
      iconClass: 'text-amber-600',
      card: 'from-amber-50 to-yellow-100/70',
      icon: 'from-amber-500 to-amber-700',
      label: 'Ayni Points',
      value: formatNumber(displayUser?.puntos_totales),
      count: isGuest ? undefined : Number(displayUser?.puntos_totales || 0),
      detail: isGuest ? 'Regístrate para ganar puntos' : 'puntos ganados',
    },
    {
      Icon: TrendingUp,
      iconClass: 'text-green-700',
      card: 'from-green-50 to-green-100/70',
      icon: 'from-green-600 to-green-800',
      label: 'Progreso',
      value: isGuest ? '—' : `${overallProgress}%`,
      detail: isGuest ? 'Regístrate para guardarlo' : `${completedLessons} de ${totalLessons} lecciones`,
    },
    {
      Icon: Award,
      iconClass: 'text-blue-800',
      card: 'from-blue-50 to-purple-100/70',
      icon: 'from-blue-600 to-purple-700',
      label: 'Nivel',
      value: getLevel(displayUser).number,
      detail: isGuest ? 'Modo invitado' : `${getLevel(displayUser).name} (${getLevel(displayUser).subtitle.toLowerCase()})`,
    },
  ];

  const navLink = 'flex items-center gap-2 min-h-11 px-2 text-stone-700 hover:text-green-800 font-semibold rounded-lg toque';

  return (
    <MantineShell>
    <div className="min-h-screen bg-gradient-to-br from-green-50/70 via-stone-50 to-purple-50/70 text-stone-900">
      {/* Pregunta única de consentimiento para los datos de aprendizaje */}
      {!isGuest && <ConsentDialog user={user} setUser={setUser} />}
      {/* ==================== AVISO MODO INVITADO ==================== */}
      {isGuest && (
        <div className="relative z-10 bg-orange-800 text-white py-3 px-4 sm:px-6">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="flex items-center gap-3 font-semibold">
              <UserX className="w-5 h-5 shrink-0" aria-hidden="true" />
              Estás en modo invitado: solo puedes acceder a la Unidad 1
            </p>
            <div className="flex items-center gap-3">
              <Link to="/register" className="px-4 py-2 min-h-11 inline-flex items-center bg-white text-orange-800 font-bold rounded-lg hover:bg-orange-50 toque">
                Crear cuenta gratis
              </Link>
              <Link to="/login" className="px-4 py-2 min-h-11 inline-flex items-center border-2 border-white text-white font-bold rounded-lg hover:bg-orange-900 toque">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ENCABEZADO ==================== */}
      <header className="bg-white sticky top-0 z-50 border-b border-stone-200">
        <div className="container mx-auto py-3">
          <div className="flex justify-between items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-3" aria-label="YachAru, ir al panel">
              <img src={logo} alt="" width="160" height="160" className="h-10 w-auto" />
              <span className="text-2xl font-black texto-degradado hidden md:block">YachAru</span>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-3" aria-label="Principal">
              {/* Mantine Tooltip: en pantallas medianas los íconos dicen qué son al pasar el mouse o enfocarlos */}
              {user?.es_cuenta_aula && (
                <Tooltip label="Mi aula" withArrow openDelay={300} transitionProps={{ transition: 'pop', duration: 150 }}>
                  <Link to="/mi-aula" className={navLink} aria-label="Mi aula">
                    <School className="w-5 h-5" aria-hidden="true" />
                    <span className="hidden lg:inline">Mi aula</span>
                  </Link>
                </Tooltip>
              )}
              <Tooltip label="Diccionario" withArrow openDelay={300} transitionProps={{ transition: 'pop', duration: 150 }}>
                <Link to="/dictionary" className={navLink} aria-label="Diccionario">
                  <BookOpen className="w-5 h-5" aria-hidden="true" />
                  <span className="hidden lg:inline">Diccionario</span>
                </Link>
              </Tooltip>
              <Tooltip label="Juegos" withArrow openDelay={300} transitionProps={{ transition: 'pop', duration: 150 }}>
                <Link to={`/practica?idioma=${selectedLanguage}`} className={navLink} aria-label="Juegos de práctica" {...preloadOn(Practice)}>
                  <Gamepad2 className="w-5 h-5" aria-hidden="true" />
                  <span className="hidden lg:inline">Juegos</span>
                </Link>
              </Tooltip>
              <Tooltip label="Cultura" withArrow openDelay={300} transitionProps={{ transition: 'pop', duration: 150 }}>
                <Link to="/culture" className={navLink} aria-label="Cultura">
                  <Sparkles className="w-5 h-5" aria-hidden="true" />
                  <span className="hidden lg:inline">Cultura</span>
                </Link>
              </Tooltip>

              {!isGuest ? (
                <Link to="/profile" className={navLink} aria-label={`Tu perfil, ${displayUser?.nombre || ''}`}>
                  <span className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white font-bold" aria-hidden="true">
                    {displayUser?.nombre?.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden xl:inline">{displayUser?.nombre}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-2 text-orange-800 font-semibold">
                  <span className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center" aria-hidden="true">
                    <UserX className="w-5 h-5" />
                  </span>
                  <span className="hidden xl:inline">Invitado</span>
                </span>
              )}

              <Tooltip label={isGuest ? 'Salir del modo invitado' : 'Cerrar sesión'} withArrow openDelay={300} transitionProps={{ transition: 'pop', duration: 150 }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label={isGuest ? 'Salir del modo invitado' : 'Cerrar sesión'}
                  className="w-11 h-11 flex items-center justify-center text-red-700 hover:bg-red-50 rounded-lg toque"
                >
                  <LogOut className="w-5 h-5" aria-hidden="true" />
                </button>
              </Tooltip>
            </nav>
          </div>
        </div>
      </header>

      <main className="relative isolate container mx-auto py-8 max-w-7xl">
        <Decor />
        {/* ==================== SALUDO + ESTADÍSTICAS ==================== */}
        {/* Izquierda: la llamita saluda en grande. Derecha: racha y puntos arriba, progreso y nivel abajo */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-stretch mb-8">
          <section className="relative overflow-hidden rounded-[2rem] bg-white/80 backdrop-blur border border-white shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 anim-entra" aria-labelledby="saludo-titulo">
            <span className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full bg-gradient-to-br from-green-200/60 to-blue-200/40 blur-2xl" aria-hidden="true" />
            <Mascot pose="bienvenida" sticker size="w-40 sm:w-48 lg:w-56" eager className="shrink-0 relative" />
            <div className="relative min-w-0 text-center sm:text-left">
              <h1 id="saludo-titulo" className="text-[clamp(2rem,2.8vw,2.75rem)] font-black tracking-tight leading-tight mb-3">
                {isGuest ? (
                  <span className="texto-degradado">¡Bienvenido!</span>
                ) : (
                  <>
                    <span className="whitespace-nowrap">¡Rimaykullayki,</span>
                    <br />
                    <GradientText colors={['#15803d', '#0ea5e9', '#7c3aed', '#db2777', '#15803d']} animationSpeed={6} className="align-baseline">{firstName(displayUser?.nombre)}</GradientText>!
                  </>
                )}
              </h1>
              <p className="text-lg sm:text-xl text-stone-700 mb-5">
                {isGuest
                  ? 'Explora la Unidad 1 gratis. Regístrate para guardar tu progreso.'
                  : completedLessons === 0
                    ? 'Empieza con la primera lección de la Unidad 1. ¡Yo te acompaño!'
                    : `Llevas ${completedLessons} ${completedLessons === 1 ? 'lección completada' : 'lecciones completadas'}. ¡Sigamos!`}
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                <a href="#ruta-titulo" className="ficha inline-flex items-center gap-2 min-h-12 px-6 rounded-2xl border-green-800 bg-green-600 hover:bg-green-500 text-white font-black">
                  <Play className="w-5 h-5 fill-white" aria-hidden="true" />
                  {completedLessons === 0 ? 'Empezar' : 'Continuar'}
                </a>
                <Link
                  to={`/practica?idioma=${selectedLanguage}`}
                  {...preloadOn(Practice)}
                  className="ficha inline-flex items-center gap-2 min-h-12 px-6 rounded-2xl border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-black"
                >
                  <Gamepad2 className="w-5 h-5" aria-hidden="true" />
                  Jugar
                </Link>
              </div>
            </div>
          </section>

          <ul className="grid grid-cols-2 gap-4 sm:gap-5">
            {stats.map(({ Icon, card, icon, label, value, count, detail }, i) => (
              <li key={label} className={`tarjeta-viva anim-entra bg-gradient-to-br ${isGuest ? "from-white to-stone-100" : card} rounded-3xl border border-white shadow-sm p-5 sm:p-6 flex flex-col justify-between`} style={{ "--i": i + 1 }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${isGuest ? "from-stone-300 to-stone-400" : icon}`} aria-hidden="true">
                    <Icon className="w-5 h-5 text-white" />
                  </span>
                  <span className="text-sm sm:text-base font-bold text-stone-700">{label}</span>
                </div>
                <div>
                  <p className="text-[clamp(1.5rem,7vw,2.25rem)] sm:text-5xl font-black mb-1 tabular-nums whitespace-nowrap [overflow-wrap:normal]">
                    {/* Count Up: los números suben al aparecer */}
                    {typeof count === "number" ? <CountUp to={count} separator="," duration={1.4} delay={i * 0.1} /> : value}
                  </p>
                  <p className="text-sm text-stone-600">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* ==================== META DIARIA Y SEMANA ==================== */}
        {!isGuest && (
          <div className="mb-8">
            <WeekActivity progress={progress} theme={languageStyle(selectedLanguage)} />
          </div>
        )}

        {/* ==================== QUÉ INCLUYE EL MODO INVITADO ==================== */}
        {isGuest && (
          <section className="mb-8 bg-white border-2 border-orange-700 rounded-2xl p-6" aria-labelledby="invitado-titulo">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-orange-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <h2 id="invitado-titulo" className="text-lg font-bold mb-3">Qué puedes hacer como invitado</h2>
                <ul className="space-y-2 mb-5">
                  {[
                    [true, 'Explorar la Unidad 1 de quechua y de aymara'],
                    [true, 'Usar el diccionario y la sección de cultura'],
                    [false, 'Guardar tu progreso'],
                    [false, `Acceder a las otras ${lockedUnits || 5} unidades`],
                    [false, 'Ganar puntos e insignias'],
                  ].map(([ok, text]) => (
                    <li key={text} className="flex items-center gap-2 text-stone-700">
                      {ok ? (
                        <CheckCircle className="w-5 h-5 text-green-700 shrink-0" aria-label="Sí:" />
                      ) : (
                        <XCircle className="w-5 h-5 text-stone-500 shrink-0" aria-label="No:" />
                      )}
                      {text}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Link to="/register" className="px-6 min-h-11 inline-flex items-center bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg toque">
                    Crear cuenta gratis <span aria-hidden="true">&nbsp;→</span>
                  </Link>
                  <Link to="/login" className="px-6 min-h-11 inline-flex items-center border-2 border-stone-300 text-stone-800 font-bold rounded-lg hover:bg-stone-50 toque">
                    Ya tengo cuenta
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== IDIOMA ==================== */}
        <Reveal as="section" y={28} className="vidrio rounded-[2rem] p-6 sm:p-8 mb-8" aria-labelledby="idioma-titulo">
          <h2 id="idioma-titulo" className="text-2xl font-black">¿Qué lengua quieres aprender?</h2>
          <p className="text-stone-600 mb-5">Puedes cambiar cuando quieras: tu avance de cada una se guarda aparte</p>

          <LanguagePicker value={selectedLanguage} onChange={setSelectedLanguage} stats={langStats} />
        </Reveal>

        {/* ==================== RUTA DE APRENDIZAJE ==================== */}
        <Reveal as="section" y={28} className="py-2" aria-labelledby="ruta-titulo" aria-busy={loading}>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 id="ruta-titulo" className="text-2xl sm:text-3xl font-black">
                <SplitText text="Tu ruta de aprendizaje" tag="span" effect="pop" delay={30} duration={0.6} textAlign="left" rootMargin="0px" />
              </h2>
              <p className="text-stone-600">Aprende {lang.label.toLowerCase()} paso a paso</p>
            </div>

            {!isGuest && overallProgress > 0 && (
              // Mantine RingProgress: el avance del idioma como un anillo con el porcentaje al centro
              <div
                role="progressbar"
                aria-label={`Progreso en ${lang.label}`}
                aria-valuenow={overallProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <RingProgress
                  size={104}
                  thickness={10}
                  roundCaps
                  rootColor="#e7e5e4"
                  sections={[{ value: overallProgress, color: LANGUAGE_STYLE[selectedLanguage]?.hex }]}
                  label={<p className="text-center text-xl font-black tabular-nums">{overallProgress}%</p>}
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-16" role="status">
              <Mascot mood="think" pose="esperando" sticker size="w-32" className="justify-center mb-4" />
              <p className="text-lg font-semibold text-stone-700">Cargando tus unidades…</p>
              <p className="text-sm text-stone-600 mt-1">La primera vez puede tardar hasta un minuto mientras el servidor se activa.</p>
            </div>
          ) : loadError ? (
            <div className="text-center py-16" role="alert">
              <AlertCircle className="w-12 h-12 text-red-700 mx-auto mb-4" aria-hidden="true" />
              <p className="text-lg font-semibold mb-1">No pudimos cargar tus unidades</p>
              <p className="text-stone-600 mb-6">Revisa tu conexión. Si es tu primera visita del día, el servidor puede tardar en responder.</p>
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-2 px-6 min-h-11 bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg toque"
              >
                <RefreshCw className="w-5 h-5" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          ) : units.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-stone-400 mx-auto mb-4" aria-hidden="true" />
              <p className="text-lg font-semibold">Todavía no hay unidades de {lang.label.toLowerCase()}</p>
            </div>
          ) : (
            // Camino de aprendizaje al estilo Duolingo (components/LearningPath.jsx)
            <LearningPath units={units} langId={selectedLanguage} isGuest={isGuest} isLessonCompleted={isLessonCompleted} />
          )}
        </Reveal>

        {/* ==================== JUEGOS ==================== */}
        <Link
          to={`/practica?idioma=${selectedLanguage}`}
          {...preloadOn(Practice)}
          className="ficha tarjeta-viva mt-8 flex items-center gap-4 sm:gap-6 rounded-3xl border-amber-300 bg-gradient-to-br from-amber-50 to-orange-100 p-5 sm:p-6 hover:border-amber-400"
        >
          <span className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md" aria-hidden="true">
            <Gamepad2 className="w-9 h-9 text-white" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-xl sm:text-2xl font-black">Practica jugando</span>
            <span className="block text-stone-700">Parejas relámpago y tarjetas con las palabras que ya aprendiste.</span>
          </span>
          <ArrowRight className="w-7 h-7 text-orange-700 shrink-0" aria-hidden="true" />
        </Link>

        {/* ==================== CIERRE ==================== */}
        {!isGuest && completedLessons > 0 && (
          <section className="mt-8 bg-green-800 rounded-3xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">¡Sigue así!</h2>
            <p className="text-lg text-green-50">
              Has completado {completedLessons} {completedLessons === 1 ? 'lección' : 'lecciones'}. La siguiente te espera cuando quieras.
            </p>
          </section>
        )}

        {isGuest && (
          <section className="mt-8 bg-green-800 rounded-3xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">¿Te gustó la experiencia?</h2>
            <p className="text-lg text-green-50 mb-6">
              Crea tu cuenta gratis para guardar tu progreso, ganar puntos y acceder a todas las unidades
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="px-8 min-h-12 inline-flex items-center bg-white text-green-800 font-bold rounded-xl hover:bg-green-50 toque">
                Crear cuenta gratis
              </Link>
              <Link to="/login" className="px-8 min-h-12 inline-flex items-center border-2 border-white text-white font-bold rounded-xl hover:bg-green-700 toque">
                Ya tengo cuenta
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
    </MantineShell>
  );
};

export default Dashboard;

