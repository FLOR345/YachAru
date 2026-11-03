import { useState, useEffect, useRef, useCallback } from 'react';
import { speak, audioSource, keepAudioOffline } from '../utils/speech';
import VoicePicker from '../components/VoicePicker';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from '../utils/notify';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { api } from '../services/api';
import ExerciseTypes from '../components/lessons/ExerciseTypes';
import Mascot from '../components/Mascot';
import { Stars } from '../components/GameFx';
import { Volume2, VolumeX, X, Check, ArrowRight, Star, AlertCircle, RefreshCw, UserX, Flame, Zap, Target, Clock, RotateCcw } from 'lucide-react';
import { getLanguage, languageStyle } from '../languages';
import { PHENOMENON_LABELS } from '../utils/normalizer';
import { track, flush } from '../services/telemetry';
import { queueProgress } from '../services/offlineSync';
import { playCorrect, playWrong, playComplete, soundEnabled, setSoundEnabled } from '../utils/sounds';
import GradientText from '../components/reactbits/GradientText';
import Decor from '../components/Decor';
import { saveMistakes } from '../utils/difficultWords';

const PASS_PERCENT = 80;
const XP_CORRECT = 10;
const XP_VARIANT = 8;
const XP_REVIEW = 4;

// Elogios que rotan al acertar (como en Duolingo, para que no se sienta repetitivo)
const PRAISE = ['¡Excelente!', '¡Muy bien!', '¡Perfecto!', '¡Así se hace!', '¡Genial!', '¡Lo lograste!'];

// Colores de la celebración: los de la app (verde quechua, azul aymara) y el dorado de las estrellas
const CONFETTI_COLORS = ['#15803d', '#1e40af', '#f59e0b', '#c2410c', '#16a34a', '#2563eb'];
// Trayectorias fijas (no aleatorias): la misma celebración cada vez, sin saltos al volver a renderizar
const CONFETTI = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  const distance = 90 + (i % 4) * 28;
  return {
    x: `${Math.round(Math.cos(angle) * distance)}px`,
    y: `${Math.round(Math.sin(angle) * distance * 0.8 + 60)}px`,
    r: `${(i % 2 ? 1 : -1) * (180 + i * 15)}deg`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  };
});

// Los números de los resultados suben de 0 a su valor una sola vez (con movimiento reducido, directo)
const useCountUp = (target, duration = 900) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
};

const CountNumber = ({ value, suffix = '' }) => {
  const shown = useCountUp(value);
  return (
    <>
      <span aria-hidden="true">
        {shown}
        {suffix}
      </span>
      <span className="sr-only">
        {value}
        {suffix}
      </span>
    </>
  );
};

const formatTime = (ms) => {
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
};

const LessonView = ({ user, isGuest }) => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showVocab, setShowVocab] = useState(true);
  const [learnedWords, setLearnedWords] = useState([]);
  const [hideMeanings, setHideMeanings] = useState(false); // práctica: ocultar los significados
  const [revealed, setRevealed] = useState([]);

  // Cola de la lección: los ejercicios y, al final, los que se fallaron (repaso)
  const [queue, setQueue] = useState([]);
  const [position, setPosition] = useState(0);
  const [feedback, setFeedback] = useState(null); // { correct, correctText, resultado, fenomenos, praise }
  const [firstTry, setFirstTry] = useState({}); // ejercicio_id → 'correcto' | 'variante' | 'incorrecto'
  const [xp, setXp] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [mistakes, setMistakes] = useState([]); // respuestas correctas de lo que se falló, para repasar
  const [showResults, setShowResults] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [serverResult, setServerResult] = useState(null);
  const [sound, setSound] = useState(soundEnabled);
  const [xpGain, setXpGain] = useState(null); // { amount, key } para el +XP que sube

  const savedRef = useRef(false);
  const continueRef = useRef(null);
  const questionStart = useRef(Date.now());
  const lessonStart = useRef(Date.now());
  const lessonEnd = useRef(0);

  const language = getLanguage(lesson?.idioma);
  const theme = languageStyle(lesson?.idioma);
  const fallbackLang = language?.voz?.respaldo;

  const total = exercises.length;
  const answeredFirst = Object.values(firstTry);
  const goodFirst = answeredFirst.filter((r) => r !== 'incorrecto').length;
  const percentage = total > 0 ? Math.round((goodFirst / total) * 100) : 100;

  const loadLesson = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.getLessonContent(lessonId);
      setLesson(data.lesson);
      setVocabulary(data.vocabulary || []);
      keepAudioOffline((data.vocabulary || []).map((w) => w.audio_url));
      setExercises(data.exercises || []);
      setQueue((data.exercises || []).map((exercise) => ({ exercise, review: false })));
    } catch (error) {
      console.error('Error loading lesson:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  // El progreso se guarda al ver los resultados, pulse el botón que pulse la persona
  const saveProgress = async () => {
    if (isGuest || !user) return;
    setSaveState('saving');
    try {
      const { data } = await api.saveProgress({ leccionId: parseInt(lessonId, 10), porcentajeAciertos: percentage });
      setSaveState('saved');
      setServerResult(data);
      if (data?.puntos > 0) toast.success(`+${data.puntos} Ayni Points`, { description: 'Tu progreso quedó guardado.' });
      (data?.insignias || []).forEach((insignia, i) => {
        setTimeout(() => toast(`¡Nueva insignia! ${insignia}`, { description: 'Mírala en tu perfil.' }), 500 + i * 400);
      });
    } catch (error) {
      console.error('Error saving progress:', error);
      // Sin conexión (o servidor dormido): el resultado queda en este dispositivo y se envía después
      if (!error.response) {
        queueProgress({ leccionId: parseInt(lessonId, 10), porcentajeAciertos: percentage });
        setSaveState('queued');
      } else {
        setSaveState('error');
      }
    }
  };

  useEffect(() => {
    if (showResults && !savedRef.current) {
      savedRef.current = true;
      lessonEnd.current = Date.now();
      saveMistakes(lesson?.idioma, mistakes, vocabulary);
      playComplete();
      track('lesson_completed', {
        idioma: lesson?.idioma,
        leccion_id: Number(lessonId),
        duracion_ms: lessonEnd.current - lessonStart.current,
        metadatos: { porcentaje: percentage, xp, mejor_racha: bestCombo, ejercicios: total, repasos: mistakes.length },
      });
      flush();
      saveProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults]);

  // Al corregir, el foco pasa a "Continuar"; Enter continúa
  useEffect(() => {
    if (feedback) continueRef.current?.focus();
  }, [feedback]);

  const toggleSound = () => {
    setSoundEnabled(!sound);
    setSound(!sound);
  };

  const startExercises = () => {
    setShowVocab(false);
    lessonStart.current = Date.now();
    questionStart.current = Date.now();
    track('lesson_started', { idioma: lesson?.idioma, leccion_id: Number(lessonId), metadatos: { ejercicios: total } });
    window.scrollTo(0, 0);
  };

  const toggleLearnedWord = (word) => {
    setLearnedWords((prev) => {
      const learned = prev.includes(word.id);
      if (!learned) track('word_marked', { idioma: lesson?.idioma, leccion_id: Number(lessonId), vocabulario_id: word.id });
      return learned ? prev.filter((id) => id !== word.id) : [...prev, word.id];
    });
  };

  const current = queue[position];

  const handleAnswer = (isCorrect, correctText, detail = {}) => {
    const { exercise, review } = current;
    const resultado = detail.resultado ?? (isCorrect ? 'correcto' : 'incorrecto');

    if (!review) setFirstTry((prev) => ({ ...prev, [exercise.id]: resultado }));
    if (isCorrect) {
      playCorrect();
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      const gained = review ? XP_REVIEW : resultado === 'variante' ? XP_VARIANT : XP_CORRECT;
      setXp((v) => v + gained);
      setXpGain({ amount: gained, key: Date.now() });
    } else {
      playWrong();
      setCombo(0);
      if (!review) {
        // El ejercicio fallado vuelve al final de la lección
        setQueue((q) => [...q, { exercise, review: true }]);
        setMistakes((list) => [...list, correctText]);
      }
    }

    track('exercise_answered', {
      idioma: lesson?.idioma,
      leccion_id: Number(lessonId),
      ejercicio_id: exercise.id,
      tipo_ejercicio: exercise.tipo,
      resultado,
      respuesta: detail.respuesta != null ? String(detail.respuesta) : null,
      esperado: correctText,
      intento: review ? 2 : 1,
      duracion_ms: Date.now() - questionStart.current,
      metadatos: detail.fenomenos?.length ? { fenomenos: detail.fenomenos } : {},
    });

    setFeedback({
      correct: isCorrect,
      correctText,
      resultado,
      fenomenos: detail.fenomenos || [],
      praise: PRAISE[Math.floor(Math.random() * PRAISE.length)],
      combo: isCorrect ? combo + 1 : 0,
    });
  };

  const goToNext = () => {
    setFeedback(null);
    if (position < queue.length - 1) {
      setPosition((p) => p + 1);
      questionStart.current = Date.now();
    } else {
      setShowResults(true);
    }
    window.scrollTo(0, 0);
  };

  const skipExercise = () => {
    track('exercise_skipped', { idioma: lesson?.idioma, leccion_id: Number(lessonId), ejercicio_id: current?.exercise?.id, tipo_ejercicio: current?.exercise?.tipo });
    if (!current.review) setFirstTry((prev) => ({ ...prev, [current.exercise.id]: 'correcto' }));
    goToNext();
  };

  const repeatLesson = () => {
    savedRef.current = false;
    setSaveState('idle');
    setServerResult(null);
    setQueue(exercises.map((exercise) => ({ exercise, review: false })));
    setPosition(0);
    setFirstTry({});
    setXp(0);
    setCombo(0);
    setBestCombo(0);
    setMistakes([]);
    setFeedback(null);
    setShowResults(false);
    setShowVocab(true);
    window.scrollTo(0, 0);
  };

  const leaveLesson = () => {
    const started = !showVocab && !showResults && position > 0;
    if (started && !window.confirm('¿Salir de la lección? Perderás el avance de esta lección.')) return;
    navigate('/dashboard');
  };

  // ==================== CARGANDO ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="flex flex-col items-center" role="status">
          <Mascot mood="think" pose="esperando" size="w-32" eager />
          <p className="text-stone-700 font-bold mt-4">Cargando lección…</p>
        </div>
      </div>
    );
  }

  // ==================== ERROR AL CARGAR ====================
  if (loadError || !lesson) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center bg-white border border-stone-200 p-8 rounded-3xl max-w-md" role="alert">
          <AlertCircle className="w-12 h-12 text-red-700 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-xl font-bold mb-2">No pudimos cargar esta lección</h1>
          <p className="text-stone-600 mb-6">Revisa tu conexión. Si es tu primera visita del día, el servidor puede tardar hasta un minuto.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={loadLesson} className="inline-flex items-center gap-2 px-6 min-h-11 bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg toque">
              <RefreshCw className="w-5 h-5" aria-hidden="true" />
              Reintentar
            </button>
            <Link to="/dashboard" className="inline-flex items-center px-6 min-h-11 border-2 border-stone-300 font-bold rounded-lg hover:bg-stone-50 toque">
              Volver al panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RESULTADOS ====================
  if (showResults) {
    const passed = percentage >= PASS_PERCENT;
    const duration = (lessonEnd.current || Date.now()) - lessonStart.current;
    const stats = [
      { Icon: Zap, label: 'XP ganados', value: xp, suffix: '', color: 'from-amber-400 to-orange-600' },
      { Icon: Target, label: 'Precisión', value: percentage, suffix: '%', color: passed ? 'from-green-500 to-green-700' : 'from-orange-500 to-orange-700' },
      { Icon: Flame, label: 'Mejor racha', value: bestCombo, suffix: '', color: 'from-rose-500 to-red-700' },
    ];
    return (
      <div className="fondo-burbujas min-h-screen text-stone-900 py-8">
        <Decor palette="calido" />
        <span className="burbuja burbuja-verde" aria-hidden="true" />
        <span className="burbuja burbuja-azul" aria-hidden="true" />
        <span className="burbuja burbuja-morada" aria-hidden="true" />
        <main className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white shadow-2xl p-6 sm:p-8 text-center anim-entra">
            <div className="relative w-40 mx-auto mb-2" aria-hidden="true">
              {passed &&
                CONFETTI.map((piece, i) => (
                  <span key={i} className="papelito" style={{ '--x': piece.x, '--y': piece.y, '--r': piece.r, '--i': i, background: piece.color }} />
                ))}
              <Mascot mood={passed ? 'cheer' : 'happy'} pose={percentage === 100 ? 'logro' : passed ? 'celebrando' : 'reintentar'} sticker size="w-40" eager />
            </div>
            <div className="mb-4">
              <Stars count={percentage === 100 ? 3 : percentage >= PASS_PERCENT ? 2 : percentage >= 50 ? 1 : 0} />
            </div>

            <h1 className="text-3xl font-black mb-2 anim-entra" style={{ '--i': 3 }}>
              {passed ? <GradientText colors={['#15803d', '#0ea5e9', '#7c3aed', '#db2777', '#15803d']} animationSpeed={5} glow={0.35}>¡Lección completada!</GradientText> : '¡Buen intento!'}
            </h1>
            <p className="text-stone-600 mb-6 anim-entra" style={{ '--i': 4 }}>
              {passed
                ? `${language.frases?.felicitacion ?? '¡Bien hecho!'} (¡Bien hecho!)`
                : `${language.frases?.animo ?? '¡Ánimo!'} (¡Ánimo!) Con ${PASS_PERCENT}% o más se considera aprobada. Puedes repetirla cuando quieras.`}
            </p>

            {/* Tarjetas de resultados, como al final de una lección de Duolingo */}
            <ul className="grid grid-cols-3 gap-3 mb-4">
              {stats.map(({ Icon, label, value, suffix, color }, i) => (
                <li key={label} className="anim-pop rounded-2xl border-2 border-stone-100 bg-white p-3 shadow-sm" style={{ '--i': 5 + i }}>
                  <span className={`mx-auto mb-2 w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`} aria-hidden="true">
                    <Icon className="w-5 h-5 text-white" />
                  </span>
                  <p className="text-2xl font-black tabular-nums">
                    <CountNumber value={value} suffix={suffix} />
                  </p>
                  <p className="text-xs font-bold text-stone-600 uppercase tracking-wide">{label}</p>
                </li>
              ))}
            </ul>
            <p className="flex items-center justify-center gap-2 text-sm text-stone-600 mb-6">
              <Clock className="w-4 h-4" aria-hidden="true" />
              {goodFirst} de {total} al primer intento · {formatTime(duration)}
            </p>

            {mistakes.length > 0 && (
              <section className="text-left bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 anim-entra" style={{ '--i': 8 }} aria-labelledby="repasar-titulo">
                <h2 id="repasar-titulo" className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  Para repasar
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {[...new Set(mistakes)].map((text) => (
                    <li key={text} className="px-3 py-1 bg-white rounded-full border border-orange-200 text-sm font-semibold" lang={language.lang}>
                      {text}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {isGuest ? (
              <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 mb-6 text-left flex items-start gap-3">
                <UserX className="w-5 h-5 text-orange-800 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-orange-900 font-semibold">Estás en modo invitado: tu progreso no se guarda.</p>
                  <Link to="/register" className="inline-flex items-center min-h-11 text-orange-900 font-bold underline underline-offset-4">
                    Crear cuenta gratis
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mb-6 text-sm font-semibold min-h-5" role="status">
                {saveState === 'saving' && <span className="text-stone-600">Guardando tu progreso…</span>}
                {saveState === 'saved' && (
                  <span className="text-green-800">
                    Progreso guardado{serverResult?.racha ? ` · Racha de ${serverResult.racha} ${serverResult.racha === 1 ? 'día' : 'días'} 🔥` : ''}
                    {serverResult?.correo?.enviado === true && (
                      <span className="block mt-1 text-stone-600">📧 Te enviamos tu resultado a {serverResult.correo.email}</span>
                    )}
                    {serverResult?.correo?.enviado === false && serverResult.correo.motivo && (
                      <span className="block mt-1 text-amber-800">No pudimos enviarte el correo con tu resultado: {serverResult.correo.motivo}</span>
                    )}
                  </span>
                )}
                {saveState === 'queued' && (
                  <span className="text-stone-700">Sin conexión: tu resultado quedó guardado en este dispositivo y se enviará al volver internet.</span>
                )}
                {saveState === 'error' && (
                  <span className="text-red-800">
                    No pudimos guardar tu progreso.{' '}
                    <button type="button" onClick={saveProgress} className="underline underline-offset-4 min-h-11">
                      Intentar de nuevo
                    </button>
                  </span>
                )}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 anim-entra" style={{ '--i': 9 }}>
              <button type="button" onClick={repeatLesson} className="flex-1 min-h-12 px-6 border-2 border-stone-300 rounded-xl font-bold hover:bg-stone-50 toque">
                Repetir lección
              </button>
              <button type="button" onClick={() => navigate('/dashboard')} className="flex-1 min-h-12 px-6 boton-degradado font-bold rounded-xl shadow-lg">
                Continuar
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==================== VOCABULARIO ====================
  if (showVocab) {
    const learnedPercent = vocabulary.length > 0 ? Math.round((learnedWords.length / vocabulary.length) * 100) : 0;
    const missingAudio = vocabulary.filter((w) => !w.audio_url).length;
    const voices = new Set(vocabulary.filter((w) => w.audio_url).map((w) => audioSource(w.audio_url)));
    const startButton =
      total > 0 ? (
        <button type="button" onClick={startExercises} className="w-full min-h-14 boton-degradado font-black text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3">
          ¡Empezar! ({total} ejercicios)
          <ArrowRight className="w-6 h-6" aria-hidden="true" />
        </button>
      ) : (
        <p className="text-center text-stone-700">Esta lección todavía no tiene ejercicios.</p>
      );
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-100 text-stone-900">
        <header className={`relative overflow-hidden bg-gradient-to-br ${theme.gradient} text-white`}>
          <span className="pointer-events-none absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/10" aria-hidden="true" />
          <span className="pointer-events-none absolute right-40 -bottom-32 w-64 h-64 rounded-full bg-white/10" aria-hidden="true" />
          <div className="container relative mx-auto py-6 max-w-7xl">
            <button type="button" onClick={leaveLesson} className={`mb-4 inline-flex items-center gap-2 min-h-11 font-semibold ${theme.headerSoft} hover:text-white`}>
              <X className="w-5 h-5" aria-hidden="true" />
              Volver al panel
            </button>
            <p className={`${theme.headerSoft} font-semibold`}>{language.nombre}</p>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h1 className="text-3xl sm:text-4xl font-black">{lesson.titulo}</h1>
              <p className={theme.headerSoft}>
                <span className="text-3xl font-black text-white">{vocabulary.length}</span> palabras · {total} ejercicios
              </p>
            </div>
          </div>
        </header>

        <main className="relative isolate container mx-auto py-8 max-w-7xl">
          <Decor sparks={false} />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            {/* Columna fija: la llamita, qué se aprende, avance y el botón de empezar */}
            <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
              <Mascot
                pose="leyendo"
                sticker
                bubble="top"
                size="w-36 sm:w-44"
                eager
                say={
                  <p className="font-semibold">
                    <span className="font-black" lang={language.lang}>
                      ¡{(language.frases?.saludo ?? 'Hola').replace(/[¡!]/g, '')}!
                    </span>{' '}
                    Hoy conocerás {vocabulary.length} palabras. Toca el parlante para escucharlas y la estrella cuando ya te sepas una.
                  </p>
                }
              />
              {lesson.contenido_teorico && (
                <section className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm anim-entra" aria-labelledby="teoria-titulo">
                  <h2 id="teoria-titulo" className="font-black mb-2 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-400" aria-hidden="true" />
                    Qué aprenderás
                  </h2>
                  <p className="text-stone-700 leading-relaxed">{lesson.contenido_teorico}</p>
                </section>
              )}

              <section className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm" aria-label="Palabras aprendidas">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="font-bold text-stone-700">Palabras que ya sabes</p>
                  <p className="font-black tabular-nums">
                    {learnedWords.length}
                    <span className="text-stone-500 font-bold">/{vocabulary.length}</span>
                  </p>
                </div>
                <div className="h-3 bg-stone-200 rounded-full overflow-hidden" aria-hidden="true">
                  <div className={`barra h-full w-full bg-gradient-to-r ${theme.gradient}`} style={{ transform: `scaleX(${learnedPercent / 100})` }} />
                </div>
                <label className="mt-4 flex items-center justify-between gap-3 cursor-pointer select-none">
                  <span>
                    <span className="block font-bold">Pon a prueba tu memoria</span>
                    <span className="block text-sm text-stone-600">Oculta los significados y toca cada tarjeta para verlos</span>
                  </span>
                  <input type="checkbox" className="sr-only peer" checked={hideMeanings} onChange={(e) => setHideMeanings(e.target.checked)} />
                  <span
                    className={`relative w-12 h-7 shrink-0 rounded-full transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-stone-300 ${hideMeanings ? theme.solid : 'bg-stone-300'}`}
                    aria-hidden="true"
                  >
                    <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${hideMeanings ? 'translate-x-5' : ''}`} />
                  </span>
                </label>
              </section>

              {voices.has('mms') && <VoicePicker className="w-fit" />}
              <p className="text-sm text-stone-600">
                {voices.has('mms') && 'Voz sintética entrenada en la lengua (modelo MMS de Meta), no la de un hablante nativo. Una de las dos voces es una transformación de la otra. '}
                {voices.has('grabado') && 'Algunas palabras tienen voz grabada. '}
                {missingAudio > 0 && 'Las que aún no tienen audio usan la voz del navegador, que no distingue glotalizadas ni aspiradas.'}
              </p>
              <div className="hidden lg:block">{startButton}</div>
            </aside>

            {/* Tarjetas de vocabulario en cuadrícula */}
            <ol className="grid gap-3 sm:grid-cols-2 content-start mb-28 lg:mb-8">
              {vocabulary.map((word, index) => {
                const learned = learnedWords.includes(word.id);
                const hidden = hideMeanings && !revealed.includes(word.id);
                return (
                  <li
                    key={word.id}
                    className={`anim-entra relative bg-white rounded-2xl border-2 tarjeta-viva ${learned ? `${theme.border} ${theme.soft}` : 'border-stone-200'}`}
                    style={{ '--i': Math.min(index, 12) }}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <span className={`w-10 h-10 bg-gradient-to-br ${theme.gradient} rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-md`} aria-hidden="true">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={!hideMeanings}
                        onClick={() => setRevealed((r) => (r.includes(word.id) ? r.filter((x) => x !== word.id) : [...r, word.id]))}
                        className="flex-1 min-w-0 text-left disabled:cursor-default"
                        aria-label={hideMeanings ? `${word.palabra_objetivo}: ${hidden ? 'mostrar significado' : word.palabra_espanol}` : undefined}
                      >
                        <span className="block text-lg sm:text-xl font-black break-words" lang={language.lang}>
                          {word.palabra_objetivo}
                        </span>
                        {hidden ? (
                          <span className="mt-1 inline-block rounded-lg bg-stone-200 px-3 py-0.5 text-sm font-bold text-stone-500">Toca para ver</span>
                        ) : (
                          <span className={`block text-stone-700 ${hideMeanings ? 'anim-pop' : ''}`}>{word.palabra_espanol}</span>
                        )}
                        {word.ejemplo_uso && !hidden && <span className="block text-sm text-stone-600 mt-1 italic">“{word.ejemplo_uso}”</span>}
                      </button>
                      <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            speak(word.palabra_objetivo, { url: word.audio_url, idioma: lesson.idioma, lang: fallbackLang });
                            track('audio_played', { idioma: lesson.idioma, leccion_id: Number(lessonId), vocabulario_id: word.id, metadatos: { fuente: audioSource(word.audio_url) } });
                          }}
                          aria-label={`Escuchar ${word.palabra_objetivo}`}
                          className={`ficha w-11 h-11 flex items-center justify-center ${theme.solid} border-black/20 text-white rounded-xl`}
                        >
                          <Volume2 className="w-5 h-5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleLearnedWord(word)}
                          aria-pressed={learned}
                          aria-label={`Marcar ${word.palabra_objetivo} como aprendida`}
                          className={`ficha w-11 h-11 flex items-center justify-center rounded-xl ${learned ? 'bg-amber-400 border-amber-600 text-white' : 'bg-white border-stone-300 text-stone-500 hover:bg-stone-50'}`}
                        >
                          <Star key={learned ? 'si' : 'no'} className={`w-5 h-5 ${learned ? 'fill-white anim-latido' : ''}`} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-stone-200 p-4 z-10">
            <div className="container mx-auto">{startButton}</div>
          </div>
        </main>
      </div>
    );
  }

  // ==================== EJERCICIOS ====================
  const progress = queue.length > 0 ? (position + (feedback ? 1 : 0)) / queue.length : 0;
  const isLast = position === queue.length - 1;
  const variantText =
    feedback?.resultado === 'variante' && feedback.fenomenos.length > 0
      ? `Aceptamos tu respuesta (${feedback.fenomenos.map((f) => PHENOMENON_LABELS[f] ?? f).join('; ')}). La forma estándar es:`
      : null;

  return (
    <div className="relative isolate min-h-screen bg-white text-stone-900 pb-48 overflow-x-clip">
      <Decor className="opacity-70" />
      {/* Barra superior: cerrar, avance y racha de aciertos */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur">
        <div className="container mx-auto max-w-3xl py-4 flex items-center gap-3 sm:gap-4">
          <button type="button" onClick={leaveLesson} aria-label="Salir de la lección" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 toque">
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
          <div
            className="flex-1 h-4 bg-stone-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Avance de la lección"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="relative h-full w-full origin-left barra overflow-hidden rounded-full" style={{ transform: `scaleX(${progress})` }}>
              <div className={`h-full w-full rounded-full bg-gradient-to-r ${theme.gradient}`} />
              {progress > 0.05 && <span className="barra-brillo" aria-hidden="true" />}
            </div>
          </div>
          <AnimatePresence>
            {combo >= 2 && (
              <m.p
                key={combo}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
                className="flex items-center gap-1 font-black text-orange-600 tabular-nums"
                aria-live="polite"
              >
                <Flame className="w-5 h-5 fill-orange-500" aria-hidden="true" />
                {combo}
                <span className="sr-only">aciertos seguidos</span>
              </m.p>
            )}
          </AnimatePresence>
          <p className="relative hidden sm:flex items-center gap-1 font-black text-amber-600 tabular-nums" title="XP de esta lección">
            <Zap className="w-5 h-5 fill-amber-400" aria-hidden="true" />
            {xp}
            {xpGain && (
              <span key={xpGain.key} className="anim-xp absolute -top-5 right-0 text-sm font-black text-amber-500" aria-hidden="true">
                +{xpGain.amount}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={sound ? 'Silenciar sonidos' : 'Activar sonidos'}
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 toque"
          >
            {sound ? <Volume2 className="w-5 h-5" aria-hidden="true" /> : <VolumeX className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl pt-4">
        {current?.review && (
          <p className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-900 text-sm font-bold">
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Repasemos este
          </p>
        )}

        {/* Cada pregunta nueva entra por la derecha y la anterior sale por la izquierda */}
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={`${position}-${current?.exercise?.id}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <ExerciseTypes
              exercise={current?.exercise}
              onAnswer={handleAnswer}
              onSkip={skipExercise}
              answered={!!feedback}
              languageLabel={language.nombre}
              languageId={lesson.idioma}
              vocabulary={vocabulary.map((v) => v.palabra_objetivo)}
              mood={feedback ? (feedback.correct ? (feedback.combo >= 3 ? 'cheer' : 'happy') : 'sad') : 'idle'}
              beat={feedback ? 1 : 0}
            />
          </m.div>
        </AnimatePresence>
      </main>

      {/* Hoja de corrección que sube desde abajo (al estilo Duolingo) */}
      <div role="status" aria-live="polite">
        <AnimatePresence>
          {feedback && (
            <m.div
              key="hoja"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              className={`fixed inset-x-0 bottom-0 z-30 border-t-4 ${feedback.correct ? 'bg-green-50 border-green-600' : 'bg-red-50 border-red-600'}`}
            >
              <div className="container mx-auto max-w-3xl py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 flex items-start gap-3">
                  <span
                    className={`${feedback.correct ? 'anim-pop bg-green-600' : 'anim-sacude bg-red-600'} w-12 h-12 shrink-0 rounded-full text-white flex items-center justify-center shadow-md`}
                    aria-hidden="true"
                  >
                    {feedback.correct ? <Check className="w-7 h-7" strokeWidth={3} /> : <X className="w-7 h-7" strokeWidth={3} />}
                  </span>
                  <div>
                    <p className={`text-xl font-black ${feedback.correct ? 'text-green-800' : 'text-red-800'}`}>
                      {feedback.correct ? (feedback.resultado === 'variante' ? '¡Correcto, con una variante!' : feedback.praise) : 'Respuesta correcta:'}
                    </p>
                    {variantText && (
                      <p className="text-green-900 mt-1">
                        {variantText} <strong lang={language.lang}>{feedback.correctText}</strong>
                      </p>
                    )}
                    {!feedback.correct && (
                      <p className="text-red-900 font-bold text-lg mt-0.5" lang={language.lang}>
                        {feedback.correctText}
                      </p>
                    )}
                    {feedback.correct && feedback.combo >= 3 && (
                      <p className="text-orange-700 font-bold mt-1 flex items-center gap-1">
                        <Flame className="w-4 h-4 fill-orange-500" aria-hidden="true" />
                        ¡{feedback.combo} seguidas!
                      </p>
                    )}
                  </div>
                </div>
                <button
                  ref={continueRef}
                  type="button"
                  onClick={goToNext}
                  className={`min-h-12 sm:min-w-44 px-8 text-white font-black rounded-2xl toque shadow-lg flex items-center justify-center gap-2 ${
                    feedback.correct ? 'bg-green-700 hover:bg-green-800' : 'bg-red-700 hover:bg-red-800'
                  }`}
                >
                  {isLast ? 'Ver resultados' : 'Continuar'}
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LessonView;
