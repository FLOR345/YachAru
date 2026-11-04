// Camino de aprendizaje: cada unidad es un sendero sobre islas ilustradas (assets/ruta), con las lecciones
// y las estaciones (juegos) sobre las piedras del camino y el trofeo al final.
// - Completadas: doradas con estrellas; la siguiente: anillos que laten, "¡Empieza aquí!" y la llamita;
//   bloqueadas: grises con candado (al tocarlas tiemblan y avisan qué falta).
// - Si una unidad tiene más pasos que piedras, se encadenan varias islas.
// - El contador de cada unidad cuenta todos los pasos que se ven (lecciones y estaciones).
// - Efectos: las islas flotan, pasan nubes, un cóndor y mariposas; el trofeo brilla al completar.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../utils/notify';
import { Check, Lock, Star, RefreshCw, Trophy, Sparkle, Mic, CloudRain, Puzzle, ThumbsUp, Play, ArrowDown } from 'lucide-react';
import { Tooltip } from '@mantine/core';
import * as m from 'motion/react-m';
import { useReducedMotion } from 'motion/react';
import { API_URL } from '../config.js';
import Mascot, { LlamaImage } from './Mascot';
import { languageStyle } from '../languages';
import { GiCondorEmblem, GiFamilyHouse, GiAbacus, GiKnifeFork, GiVitruvianMan, GiClothes, GiHouse, GiPlantsAndAnimals, GiMusicalNotes, GiEarthAmerica, GiCalendar, GiRunningShoe, GiPencilRuler, GiSparkles } from 'react-icons/gi';
import { PiHandWaving, PiIdentificationCard, PiPalette, PiPawPrint, PiChatsCircle, PiQuestion } from 'react-icons/pi';
import { LessonView, Practice, preloadOn } from '../routes';
import { playTap, playWrong } from '../utils/sounds';
import ISLANDS from '../assets/ruta/islas.json';

const ISLAND_IMAGES = import.meta.glob('../assets/ruta/isla-*.webp', { eager: true, import: 'default' });
const islandSrc = (key) => ISLAND_IMAGES[`../assets/ruta/${key}.webp`];
// Islas que terminan en trofeo (por cuántas piedras tienen) y la isla de paso (sin trofeo dibujado)
const FINAL_ISLANDS = ['isla-4', 'isla-1', 'isla-2', 'isla-3', 'isla-5'];
const MIDDLE_ISLAND = 'isla-6';
const slotsOf = (key) => ISLANDS[key].plataformas.length;

// Reparte los pasos de una unidad en islas: de 6 en 6 en las de paso y la última con trofeo
const planIslands = (count, unitIndex) => {
  const plan = [];
  let left = count;
  while (left > 6) {
    const take = left - 6 >= 4 ? 6 : left - 4;
    plan.push({ key: MIDDLE_ISLAND, take, flip: plan.length % 2 === 1 });
    left -= take;
  }
  const fits = FINAL_ISLANDS.filter((k) => slotsOf(k) >= left);
  const sameSize = fits.filter((k) => slotsOf(k) === slotsOf(fits[0]));
  plan.push({ key: sameSize[unitIndex % sameSize.length] ?? fits[0], take: left, flip: unitIndex % 2 === 1, final: true });
  return plan;
};

// Estaciones ya visitadas (en este dispositivo)
const VISITED_KEY = 'simiaru-estaciones';
const readVisited = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(VISITED_KEY) || '[]'));
  } catch {
    return new Set();
  }
};
const markVisited = (key) => {
  try {
    const set = readVisited();
    set.add(key);
    localStorage.setItem(VISITED_KEY, JSON.stringify([...set]));
  } catch {
    // sin almacenamiento
  }
};

// Un consejo distinto cada día
const TIPS = [
  'Unos minutos cada día valen más que una hora una vez a la semana.',
  'Repite en voz alta cada palabra después de escucharla.',
  'Usa los juegos para repasar las palabras de las lecciones que ya hiciste.',
  'En quechua, el apóstrofo cambia el sonido: p\'unchay no es lo mismo que punchay.',
  'Las adivinanzas de Cultura son una forma divertida de aprender vocabulario.',
  'Si fallas, la pregunta vuelve al final de la lección: ¡es para repasarla!',
];

const UNIT_POSES = ['bienvenida', 'carino', 'escuchando', 'leyendo', 'escribiendo', 'hablando', 'pensando', 'buscando'];

const authHeaders = () => {
  try {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

// Ícono del tema de cada lección (según su título), para que el camino se lea de un vistazo
const LESSON_ICONS = [
  [/salud|napay|hola|bienven/i, PiHandWaving],
  [/present|nombre|suti/i, PiIdentificationCard],
  [/despedid|tupananchik/i, PiHandWaving],
  [/famil|padre|madre|herman|hij|abuel|ayllu/i, GiFamilyHouse],
  [/n[uú]mer|cont|yupa|jakhu/i, GiAbacus],
  [/color|llimp|sami/i, PiPalette],
  [/animal|uywa/i, PiPawPrint],
  [/comida|aliment|mikhu|manq/i, GiKnifeFork],
  [/cuerpo|kurku/i, GiVitruvianMan],
  [/ropa|vest|p'acha/i, GiClothes],
  [/casa|hogar|wasi|uta/i, GiHouse],
  [/naturaleza|pacha|tierra/i, GiEarthAmerica],
  [/m[uú]sica|canci|taki/i, GiMusicalNotes],
  [/tiempo|d[ií]a|semana|mes/i, GiCalendar],
  [/acci[oó]n|acciones|verbo/i, GiRunningShoe],
  [/cantidad|medida/i, GiPencilRuler],
  [/c[oó]mo es|caracter/i, GiSparkles],
  [/cultura|m[uú]sica/i, GiMusicalNotes],
  [/pregunt/i, PiQuestion],
  [/conversa|di[aá]log|frase/i, PiChatsCircle],
  [/planta|chacra|campo/i, GiPlantsAndAnimals],
];
const lessonIcon = (lesson) => LESSON_ICONS.find(([re]) => re.test(`${lesson?.titulo ?? ''} ${lesson?.descripcion ?? ''}`))?.[1] || Star;

// ==================== Estaciones del camino ====================
// Entre las lecciones aparecen actividades: hablar al micrófono a mitad de la unidad, el cuerpo en 3D
// y los números junto a las lecciones de esos temas, y un juego de repaso antes del trofeo.
// Se abren al completar la lección anterior y llevan al juego en la página de Juegos.
const STATIONS = {
  hablar: { title: '¡Dilo tú!', Icon: Mic, color: 'from-rose-500 to-fuchsia-600', shadow: '#a21caf' },
  cuerpo: { title: 'Mi cuerpo 3D', Icon: GiVitruvianMan, color: 'from-emerald-500 to-teal-600', shadow: '#0f766e' },
  numeros: { title: 'Los números', Icon: GiAbacus, color: 'from-amber-400 to-orange-500', shadow: '#c2410c' },
  lluvia: { title: 'Lluvia de palabras', Icon: CloudRain, color: 'from-sky-400 to-indigo-600', shadow: '#3730a3' },
  armar: { title: 'Arma la palabra', Icon: Puzzle, color: 'from-lime-500 to-emerald-600', shadow: '#047857' },
  sino: { title: '¿Sí o no?', Icon: ThumbsUp, color: 'from-violet-500 to-purple-700', shadow: '#581c87' },
};
const REVIEWS = ['lluvia', 'armar', 'sino'];
const BODY_LANGS = ['quechua', 'aymara'];

const trailItems = (lessons, unitIndex, langId) => {
  const items = [];
  const mid = Math.max(0, Math.ceil(lessons.length / 2) - 1);
  lessons.forEach((lesson, i) => {
    items.push({ type: 'lesson', lesson, i });
    const text = `${lesson.titulo ?? ''} ${lesson.descripcion ?? ''}`;
    if (BODY_LANGS.includes(langId) && /cuerpo|kurku|ukhu|janchi/i.test(text)) items.push({ type: 'station', id: 'cuerpo', after: lesson });
    if (BODY_LANGS.includes(langId) && /n[uú]mer|cont[aá]r|yupa|jakhu/i.test(text)) items.push({ type: 'station', id: 'numeros', after: lesson });
    if (i === mid && lessons.length > 1) items.push({ type: 'station', id: 'hablar', after: lesson });
  });
  if (lessons.length) items.push({ type: 'station', id: REVIEWS[unitIndex % REVIEWS.length], after: lessons[lessons.length - 1] });
  return items;
};

const StationNode = ({ id, open, done, langId, reduceMotion, index, step, onVisit }) => {
  const [shake, setShake] = useState(0);
  const st = STATIONS[id];
  const tile = (
    <span
      key={shake}
      className={`relative flex h-[4.5rem] w-[4.5rem] rotate-45 items-center justify-center rounded-[1.4rem] transition-transform duration-150 hover:-translate-y-1 ${shake ? 'anim-sacude' : ''} ${open ? `bg-gradient-to-br ${st.color} text-white` : 'bg-gradient-to-br from-stone-200 to-stone-300 text-stone-400'}`}
      style={{ boxShadow: `0 6px 0 ${open ? st.shadow : '#a8a29e'}` }}
    >
      {open && <span className="brillo-liquido" aria-hidden="true" />}
      <span className="-rotate-45">{open ? <st.Icon className="h-8 w-8 drop-shadow" aria-hidden="true" /> : <Lock className="h-7 w-7" aria-hidden="true" />}</span>
      <span className={`absolute -bottom-2 -right-2 flex h-7 w-7 -rotate-45 items-center justify-center rounded-full text-xs font-black ring-2 ring-white shadow ${done ? 'bg-amber-500 text-white' : open ? 'bg-white text-stone-800' : 'bg-stone-300 text-stone-500'}`} aria-hidden="true">
        {done ? <Check className="h-4 w-4" strokeWidth={3.5} /> : step}
      </span>
    </span>
  );
  return (
    <m.div
      className="group/estacion relative flex flex-col items-center"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', bounce: 0.5, duration: 0.6, delay: Math.min(index, 4) * 0.06 }}
    >
      {open ? (
        <Link
          to={`/practica?idioma=${langId}&juego=${id}`}
          onClick={() => {
            playTap();
            onVisit?.();
          }}
          {...preloadOn(Practice)} aria-label={`Estación: ${st.title}`} className="rounded-[1.4rem] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300">
          {tile}
        </Link>
      ) : (
        <button
          type="button"
          aria-label={`Estación ${st.title}: bloqueada`}
          onClick={() => {
            playWrong();
            setShake((s) => s + 1);
            toast('Esta estación aún está bloqueada', { id: 'estacion', description: 'Completa la lección anterior para abrirla.' });
          }}
          className="rounded-[1.4rem]"
        >
          {tile}
        </button>
      )}
      <span className={`pointer-events-none absolute top-full opacity-0 transition-opacity group-hover/estacion:opacity-100 group-focus-within/estacion:opacity-100 mt-3 w-max max-w-[9rem] rounded-2xl px-3 py-1 text-center text-xs sm:text-sm font-bold leading-tight shadow-md ring-1 ring-black/5 ${done ? 'bg-amber-50 text-amber-900' : open ? 'bg-white text-stone-800' : 'bg-white/80 text-stone-400'}`}>
        <span className="block text-[10px] font-black uppercase tracking-widest text-amber-600">Estación</span>
        {st.title}
      </span>
    </m.div>
  );
};

const LessonNode = ({ lesson, state, styleSet, isFirstAvailable, reduceMotion, index, step }) => {
  const [shake, setShake] = useState(0);
  const base = 'relative w-20 h-20 rounded-full flex items-center justify-center transition-transform duration-150 ease-out hover:-translate-y-1';
  const visuals = {
    done: `${base} bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-white shadow-[0_6px_0_#b45309] active:translate-y-1 active:shadow-[0_2px_0_#b45309] overflow-hidden`,
    current: `${base} bg-gradient-to-b ${styleSet.gradient} text-white shadow-[0_6px_0_rgba(0,0,0,0.25)] active:translate-y-1 active:shadow-[0_2px_0_rgba(0,0,0,0.25)]`,
    open: `${base} bg-gradient-to-b ${styleSet.gradient} text-white opacity-90 shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-1`,
    locked: `${base} bg-gradient-to-b from-stone-200 to-stone-300 text-stone-400 shadow-[0_6px_0_#a8a29e] cursor-not-allowed`,
  };
  const Icon = state === 'done' ? Check : state === 'locked' ? Lock : lessonIcon(lesson);
  const label = `${lesson.titulo}: ${state === 'done' ? 'completada' : state === 'locked' ? 'bloqueada' : 'disponible'}`;

  const node = (
    <span key={shake} className={`${visuals[state]} ${shake ? 'anim-sacude' : ''}`}>
      {/* Anillos que laten alrededor de la lección que toca hacer */}
      {state === 'current' && !reduceMotion && (
        <>
          <m.span
            className={`absolute -inset-2 rounded-full border-4 ${styleSet.border}`}
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          />
          <m.span
            className={`absolute -inset-2 rounded-full border-4 ${styleSet.border}`}
            animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            aria-hidden="true"
          />
        </>
      )}
      {state === 'done' && <span className="brillo-nodo" aria-hidden="true" />}
      {Icon === Star ? (
        <Icon className="relative w-9 h-9 drop-shadow" strokeWidth={2.5} fill={state === 'current' || state === 'open' ? 'currentColor' : 'none'} aria-hidden="true" />
      ) : (
        <Icon className="relative w-9 h-9 drop-shadow" strokeWidth={state === 'done' ? 3.5 : undefined} aria-hidden="true" />
      )}
      {/* Número de la lección */}
      <span className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full text-xs font-black flex items-center justify-center ring-2 ring-white shadow ${state === 'locked' ? 'bg-stone-300 text-stone-500' : state === 'done' ? 'bg-amber-600 text-white' : 'bg-white text-stone-800'}`} aria-hidden="true">
        {step ?? index + 1}
      </span>
    </span>
  );

  return (
    <m.div
      className="relative flex flex-col items-center"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.4, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', bounce: 0.5, duration: 0.6, delay: Math.min(index, 4) * 0.06 }}
    >
      {/* Estrellas sobre las lecciones completadas */}
      {state === 'done' && (
        <span className="absolute -top-4 flex gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Star key={i} className={`w-4 h-4 text-amber-400 fill-amber-400 ${i === 1 ? '-mt-1.5' : ''}`} />
          ))}
        </span>
      )}
      <Tooltip label={state === 'locked' ? 'Completa la lección anterior' : lesson.titulo} withArrow position="right" openDelay={150}>
        {state === 'locked' ? (
          <button
            type="button"
            aria-label={label}
            onClick={() => {
              playWrong();
              setShake((s) => s + 1);
              toast('Esta lección aún está bloqueada', { id: 'bloqueada', description: 'Completa la lección anterior para abrirla.' });
            }}
            className="rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-300"
          >
            {node}
          </button>
        ) : (
          <Link
            to={`/lesson/${lesson.id}`}
            aria-label={label}
            onClick={playTap}
            {...preloadOn(LessonView)}
            className="rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300"
          >
            {node}
          </Link>
        )}
      </Tooltip>
      {/* Nombre de la lección; la que toca rebota y dice "¡Empieza!" */}
      <m.span
        aria-hidden={!isFirstAvailable}
        className={`${isFirstAvailable ? '' : 'pointer-events-none absolute top-full opacity-0 transition-opacity group-hover/paso:opacity-100 group-focus-within/paso:opacity-100'} mt-2 w-max max-w-[9rem] rounded-2xl px-3 py-1 text-center text-xs sm:text-sm font-bold leading-tight shadow-md ring-1 ring-black/5 ${
          isFirstAvailable
            ? `bg-gradient-to-r ${styleSet.gradient} text-white shadow-md`
            : state === 'locked'
              ? 'bg-white/70 text-stone-400'
              : state === 'done'
                ? 'bg-amber-50 text-amber-900'
                : 'bg-white text-stone-800'
        }`}
        animate={isFirstAvailable && !reduceMotion ? { y: [0, -4, 0] } : undefined}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {isFirstAvailable && <span className="block text-[10px] font-black uppercase tracking-widest opacity-90">¡Empieza aquí!</span>}
        {lesson.titulo}
      </m.span>
    </m.div>
  );
};

// ==================== Efectos del paisaje ====================
// Mariposas, destellos, nubes y un cóndor que cruza: puro adorno, sin interacción
const Butterfly = ({ style, delay, color }) => (
  <span className="mariposa pointer-events-none absolute z-20" style={{ ...style, animationDelay: `${delay}s` }} aria-hidden="true">
    <svg viewBox="0 0 24 20" className="h-5 w-6">
      <g className="mariposa-alas" style={{ transformOrigin: '12px 10px' }}>
        <path d="M12 10 C7 0 0 2 2 9 C3 13 8 13 12 10Z" fill={color} />
        <path d="M12 10 C17 0 24 2 22 9 C21 13 16 13 12 10Z" fill={color} />
        <path d="M12 10 C8 14 4 19 8 19 C11 19 12 14 12 10Z" fill={color} opacity="0.8" />
        <path d="M12 10 C16 14 20 19 16 19 C13 19 12 14 12 10Z" fill={color} opacity="0.8" />
      </g>
      <rect x="11.3" y="6" width="1.4" height="9" rx="0.7" fill="#44403c" />
    </svg>
  </span>
);

const Clouds = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <span key={i} className="nube absolute" style={{ top: `${12 + i * 31}%`, animationDuration: `${38 + i * 14}s`, animationDelay: `${-i * 13}s` }}>
        <svg viewBox="0 0 120 50" className="w-28 sm:w-36 drop-shadow-sm">
          <path d="M20 42 Q2 42 6 30 Q8 20 22 22 Q26 6 46 10 Q58 0 72 10 Q92 6 96 22 Q116 22 114 34 Q112 44 96 42Z" fill="white" opacity="0.92" />
        </svg>
      </span>
    ))}
    <span className="condor absolute" style={{ top: '22%' }}>
      <GiCondorEmblem className="h-10 w-10 text-stone-700/70" />
    </span>
  </div>
);

// Una isla: la ilustración, y encima los pasos sobre sus piedras (y el trofeo si es la última)
const Island = ({ island, children, flip, index, reduceMotion }) => {
  const meta = ISLANDS[island];
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // Los botones miden 80 px en una isla de 560 px y se achican con ella
    const update = () => setScale(Math.max(0.58, Math.min(1, el.clientWidth / 560)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <m.div
      ref={ref}
      className="relative mx-auto w-full max-w-[560px]"
      style={{ aspectRatio: `${meta.w} / ${meta.h}`, '--s': scale }}
      initial={reduceMotion ? false : { opacity: 0, y: 40, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ type: 'spring', bounce: 0.3, duration: 0.8 }}
    >
      <div className={`isla-flota absolute inset-0 ${index % 2 ? 'isla-flota-b' : ''}`}>
        <img src={islandSrc(island)} alt="" draggable="false" loading={index === 0 ? 'eager' : 'lazy'} decoding="async" className={`pointer-events-none absolute inset-0 h-full w-full select-none drop-shadow-[0_24px_30px_rgba(30,41,59,0.22)] ${flip ? '-scale-x-100' : ''}`} />
        {children}
      </div>
    </m.div>
  );
};

const at = (p, flip) => ({ left: `${(flip ? 1 - p.x : p.x) * 100}%`, top: `${p.y * 100}%` });

const UnitIslands = ({ unit, items, unitIndex, lockedUnit, styleSet, stateOf, firstPending, reduceMotion, startIndex, langId, isLessonCompleted, visited, onVisit, complete }) => {
  const plan = useMemo(() => planIslands(items.length, unitIndex), [items.length, unitIndex]);
  let offset = 0;
  return (
    <div className="relative pt-14 sm:pt-16">
      <Clouds />
      {plan.map((part, n) => {
        const meta = ISLANDS[part.key];
        const slice = items.slice(offset, offset + part.take);
        const first = offset;
        offset += part.take;
        // Las piedras que sobran quedan libres; los pasos ocupan las primeras
        return (
          <div key={n} className={n > 0 ? '-mt-6 sm:-mt-10' : ''}>
            <Island island={part.key} flip={part.flip} index={n} reduceMotion={reduceMotion}>
              {slice.map((item, k) => {
                const p = meta.plataformas[k];
                const step = first + k + 1;
                const style = { ...at(p, part.flip), transform: 'translate(-50%, -72%) scale(var(--s))', transformOrigin: '50% 72%' };
                if (item.type === 'station') {
                  const key = `${langId}:${unit.id}:${item.id}`;
                  return (
                    <div key={`estacion-${item.id}-${item.after.id}`} className="absolute z-10 w-20" style={style}>
                      <StationNode id={item.id} open={!lockedUnit && isLessonCompleted(item.after.id)} done={visited.has(key)} onVisit={() => onVisit(key)} langId={langId} reduceMotion={reduceMotion} index={step} step={step} />
                    </div>
                  );
                }
                const { lesson, i } = item;
                const state = stateOf(lesson, unitIndex, startIndex + i);
                const isFirst = firstPending?.lesson.id === lesson.id;
                const right = (part.flip ? 1 - p.x : p.x) < 0.5;
                return (
                  <div key={lesson.id} id={isFirst ? 'leccion-actual' : undefined} className={`group/paso absolute w-20 ${isFirst ? 'z-30' : 'z-10 hover:z-30'}`} style={style}>
                    <LessonNode lesson={lesson} state={state} styleSet={styleSet} isFirstAvailable={isFirst} reduceMotion={reduceMotion} index={i} step={step} />
                    {isFirst && (
                      <div className={`pointer-events-none absolute -top-6 ${right ? 'left-full ml-1' : 'right-full mr-1'} w-20 sm:w-28`}>
                        <Mascot pose="ayuda" sticker size="w-20 sm:w-28" />
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Piedras libres de la última isla: un brillo suave */}
              {part.final &&
                meta.plataformas.slice(slice.length).map((p, k) => (
                  <span key={`libre-${k}`} className="destello absolute z-10 -translate-x-1/2 -translate-y-1/2" style={at(p, part.flip)} aria-hidden="true">
                    <Sparkle className="h-5 w-5 fill-amber-200 text-amber-300" />
                  </span>
                ))}
              {/* Trofeo: brilla y salta si la unidad está completa; si no, espera con candado */}
              {part.final ? (
                <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={at(meta.trofeo, part.flip)}>
                  <m.div
                    className="relative flex flex-col items-center"
                    animate={complete && !reduceMotion ? { y: [0, -8, 0] } : undefined}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {complete && <span className="rayos-trofeo absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />}
                    {meta.trofeo.pedestal ? (
                      <span className={`relative flex h-20 w-20 items-center justify-center rounded-[1.6rem] ${complete ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-[0_6px_0_#c2410c]' : 'bg-white/90 text-amber-400 ring-4 ring-dashed ring-amber-300'}`}>
                        {complete ? <span className="block w-16 aspect-square"><LlamaImage pose="logro" sticker sizes="4rem" /></span> : <Trophy className="h-10 w-10" />}
                      </span>
                    ) : (
                      !complete && (
                        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/55 backdrop-blur-[2px] ring-2 ring-white">
                          <Lock className="h-6 w-6 text-stone-600" aria-hidden="true" />
                        </span>
                      )
                    )}
                    <span className={`relative mt-1 rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-wider shadow ${complete ? 'bg-amber-400 text-amber-950' : 'bg-white/90 text-stone-500'}`}>
                      {complete ? '¡Unidad lista!' : 'Trofeo'}
                    </span>
                  </m.div>
                  {complete &&
                    [0, 1, 2, 3].map((k) => (
                      <span key={k} className="destello absolute" style={{ left: `${[-30, 70, -10, 90][k]}%`, top: `${[-20, -10, 80, 70][k]}%`, animationDelay: `${-k * 0.4}s` }} aria-hidden="true">
                        <Sparkle className="h-5 w-5 fill-yellow-200 text-yellow-400" />
                      </span>
                    ))}
                </div>
              ) : (
                <span className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={at(meta.trofeo, part.flip)} aria-hidden="true">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md ring-2 ring-white">
                    <ArrowDown className="h-6 w-6 text-stone-600 anim-flotar" />
                  </span>
                  <span className="mt-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-stone-500 shadow">Sigue</span>
                </span>
              )}
              <Butterfly style={{ left: '12%', top: `${30 + n * 7}%` }} delay={-n * 1.7} color="#f472b6" />
              <Butterfly style={{ right: '10%', top: `${60 - n * 5}%` }} delay={-2.4 - n} color="#facc15" />
            </Island>
          </div>
        );
      })}
    </div>
  );
};

// Cabecera de la unidad: verde oscuro con cordillera, nieve, sol y cóndor
const UnitHeader = ({ unit, unitIndex, lockedUnit, styleSet, done, total, here, onContinue, reduceMotion }) => {
  const pct = total ? done / total : 0;
  const dark = lockedUnit ? ['#57534e', '#44403c', '#292524'] : styleSet.hex === '#1e40af' ? ['#1e3a8a', '#172554', '#0b1437'] : ['#166534', '#14532d', '#052e16'];
  return (
    <m.div
      className="relative overflow-hidden rounded-[2rem] p-5 sm:p-7 pr-24 sm:pr-44 text-white shadow-xl"
      style={{ background: `linear-gradient(180deg, ${dark[0]}, ${dark[1]} 70%, ${dark[2]})` }}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', bounce: 0.25, duration: 0.6 }}
    >
      {/* Cordillera en capas, con nieve en las cumbres */}
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 w-full" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
        <circle cx="330" cy="34" r="16" fill="#fde68a" opacity="0.85" />
        <path d="M0 120 L0 70 L40 40 L70 62 L110 22 L150 58 L190 30 L230 64 L270 26 L310 60 L350 34 L400 66 L400 120Z" fill="#ffffff" opacity="0.09" />
        <path d="M0 120 L0 84 L50 56 L90 80 L140 46 L180 76 L230 50 L270 82 L320 54 L360 78 L400 60 L400 120Z" fill="#000000" opacity="0.18" />
        <path d="M140 46 L128 56 L136 55 L141 60 L146 54 L152 57Z M230 50 L219 59 L227 58 L232 63 L237 57 L242 59Z M50 56 L41 64 L48 63 L52 67 L56 62 L60 64Z" fill="#ffffff" opacity="0.75" />
        <path d="M0 120 L0 98 L60 82 L120 100 L190 84 L250 102 L320 86 L400 98 L400 120Z" fill="#000000" opacity="0.22" />
      </svg>
      {!reduceMotion && (
        <span className="condor-cabecera pointer-events-none absolute top-4" aria-hidden="true">
          <GiCondorEmblem className="h-8 w-8 text-white/50" />
        </span>
      )}
      <span className="brillo-liquido" aria-hidden="true" />
      <p className="relative text-sm font-black uppercase tracking-widest opacity-90">Unidad {unitIndex + 1}</p>
      <h3 id={`unidad-${unit.id}-titulo`} className="relative text-2xl sm:text-3xl font-black drop-shadow">
        {unit.nombre}
      </h3>
      {unit.descripcion && <p className="relative opacity-90">{unit.descripcion}</p>}
      {total > 0 && !lockedUnit && (
        <div className="relative mt-4 max-w-xs">
          <div className="mb-1 flex items-center justify-between gap-2 whitespace-nowrap text-sm font-bold">
            <span className="inline-flex items-center gap-1.5">
              {done === total ? <Trophy className="h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              {done} de {total} pasos
            </span>
            <span>{Math.round(pct * 100)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
            <m.div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-200"
              initial={reduceMotion ? false : { width: 0 }}
              whileInView={{ width: `${pct * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1], delay: 0.3 }}
            />
          </div>
        </div>
      )}
      {here && (
        <button type="button" onClick={onContinue} className="relative mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-black text-stone-900 shadow-lg transition hover:scale-105 active:scale-95">
          <Play className="h-4 w-4 fill-current" aria-hidden="true" /> Continuar
        </button>
      )}
      {lockedUnit && (
        <p className="relative mt-3 inline-flex items-center gap-2 text-sm font-bold">
          <Lock className="h-4 w-4" aria-hidden="true" /> Regístrate gratis para desbloquearla
        </p>
      )}
      <span className="pointer-events-none absolute right-2 sm:right-6 top-1/2 w-24 sm:w-36 aspect-square -translate-y-1/2" aria-hidden="true">
        <span className="block h-full w-full llama llama-reposo">
          <LlamaImage pose={lockedUnit ? 'descansando' : UNIT_POSES[unitIndex % UNIT_POSES.length]} sticker sizes="10rem" />
        </span>
      </span>
    </m.div>
  );
};

const LearningPath = ({ units, langId, isGuest, isLessonCompleted }) => {
  const styleSet = languageStyle(langId);
  const reduceMotion = useReducedMotion();
  const [lessonsByUnit, setLessonsByUnit] = useState({});
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [visited, setVisited] = useState(readVisited);
  const visit = (key) => {
    markVisited(key);
    setVisited(readVisited());
  };

  // Todas las lecciones de una vez: el sendero necesita saber cuál toca
  useEffect(() => {
    let cancelled = false;
    setError(false);
    Promise.all(
      units.map((unit) =>
        axios
          .get(`${API_URL}/api/lessons/units/${unit.id}/lessons`, { headers: authHeaders() })
          .then(({ data }) => [unit.id, data.lessons || []])
          .catch(() => [unit.id, null])
      )
    ).then((entries) => {
      if (cancelled) return;
      if (entries.some(([, lessons]) => lessons === null)) setError(true);
      setLessonsByUnit(Object.fromEntries(entries.map(([id, lessons]) => [id, lessons || []])));
    });
    return () => {
      cancelled = true;
    };
  }, [units, reload]);

  // Orden global para saber cuál es la siguiente lección (las cuentas avanzan en orden; invitados, toda la Unidad 1)
  const ordered = units.flatMap((unit, unitIndex) => (lessonsByUnit[unit.id] || []).map((lesson) => ({ lesson, unitIndex })));
  const firstPending = ordered.find(({ lesson, unitIndex }) => !isLessonCompleted(lesson.id) && (!isGuest || unitIndex === 0));

  const stateOf = (lesson, unitIndex, indexInOrder) => {
    if (isLessonCompleted(lesson.id)) return 'done';
    if (isGuest) return unitIndex === 0 ? (firstPending?.lesson.id === lesson.id ? 'current' : 'open') : 'locked';
    const previous = ordered[indexInOrder - 1];
    if (!previous || isLessonCompleted(previous.lesson.id)) return firstPending?.lesson.id === lesson.id ? 'current' : 'open';
    return 'locked';
  };

  // Pasos de cada unidad (lecciones y estaciones) y cuántos están hechos
  const stepsOf = (unit, unitIndex) => {
    const items = trailItems(lessonsByUnit[unit.id] || [], unitIndex, langId);
    const done = items.filter((it) => (it.type === 'lesson' ? isLessonCompleted(it.lesson.id) : visited.has(`${langId}:${unit.id}:${it.id}`))).length;
    return { items, done, total: items.length };
  };
  const goToCurrent = () => {
    playTap();
    document.getElementById('leccion-actual')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  };

  let globalIndex = 0;
  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-3">
          No pudimos cargar algunas lecciones.
          <button type="button" onClick={() => setReload((r) => r + 1)} className="inline-flex items-center gap-1 font-bold underline underline-offset-4">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Reintentar
          </button>
        </p>
      )}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem] items-start">
      <ol className="space-y-12 min-w-0">
        {units.map((unit, unitIndex) => {
          const lessons = lessonsByUnit[unit.id];
          const startIndex = globalIndex;
          globalIndex += lessons?.length || 0;
          const lockedUnit = isGuest && unitIndex > 0;
          const steps = stepsOf(unit, unitIndex);
          return (
            <li key={unit.id} id={`unidad-${unit.id}`} className="scroll-mt-24" aria-labelledby={`unidad-${unit.id}-titulo`}>
              <UnitHeader
                unit={unit}
                unitIndex={unitIndex}
                lockedUnit={lockedUnit}
                styleSet={styleSet}
                done={steps.done}
                total={steps.total}
                here={firstPending?.unitIndex === unitIndex}
                onContinue={goToCurrent}
                reduceMotion={reduceMotion}
              />

              {lessons === undefined ? (
                <p className="text-center text-stone-600 py-8" role="status">
                  Cargando lecciones…
                </p>
              ) : lessons.length === 0 ? (
                <p className="text-center text-stone-600 py-8">Esta unidad todavía no tiene lecciones.</p>
              ) : (
                <div>
                  <UnitIslands
                    unit={unit}
                    items={steps.items}
                    unitIndex={unitIndex}
                    lockedUnit={lockedUnit}
                    styleSet={styleSet}
                    stateOf={stateOf}
                    firstPending={firstPending}
                    reduceMotion={reduceMotion}
                    startIndex={startIndex}
                    langId={langId}
                    isLessonCompleted={isLessonCompleted}
                    visited={visited}
                    onVisit={visit}
                    complete={steps.total > 0 && steps.done === steps.total}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Botón flotante: lleva a la lección que toca */}
      {firstPending && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center sm:justify-end sm:px-8">
          <Link
            to={`/lesson/${firstPending.lesson.id}`}
            onClick={playTap}
            {...preloadOn(LessonView)}
            className={`pointer-events-auto group inline-flex min-h-14 max-w-[92vw] items-center gap-3 rounded-full bg-gradient-to-r ${styleSet.gradient} pl-2 pr-6 text-white shadow-2xl ring-4 ring-white/70 transition hover:scale-105 active:scale-95`}
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-stone-900 shadow">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/60" aria-hidden="true" />
              <Play className="relative h-5 w-5 translate-x-0.5 fill-current" aria-hidden="true" />
            </span>
            <span className="min-w-0 text-left leading-tight">
              <span className="block text-[11px] font-black uppercase tracking-widest text-white/80">Continuar</span>
              <span className="block truncate font-black">{firstPending.lesson.titulo}</span>
            </span>
          </Link>
        </div>
      )}

      {/* Mapa de la ruta: todas las unidades con su avance; tocar una lleva hasta ella */}
      <aside className="hidden xl:block sticky top-24 space-y-5" aria-label="Mapa de tu ruta">
        <div className="rounded-3xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-5 shadow-sm">
          <h3 className="font-black mb-3">Mapa de tu ruta</h3>
          <ol className="space-y-2">
            {units.map((unit, unitIndex) => {
              const { done, total } = stepsOf(unit, unitIndex);
              const pct = total ? done / total : 0;
              const locked = isGuest && unitIndex > 0;
              const here = firstPending?.unitIndex === unitIndex;
              return (
                <li key={unit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      document.getElementById(`unidad-${unit.id}`)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
                    }}
                    className={`group w-full flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors ${here ? `${styleSet.soft} ring-2 ${styleSet.ring}` : 'hover:bg-stone-100'}`}
                  >
                    <span
                      className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-black text-white transition-transform group-hover:scale-110 ${
                        locked ? 'bg-stone-300' : pct === 1 ? 'bg-gradient-to-br from-amber-300 to-orange-500' : `bg-gradient-to-br ${styleSet.gradient}`
                      }`}
                    >
                      {locked ? <Lock className="w-4 h-4" aria-hidden="true" /> : pct === 1 ? <Trophy className="w-4 h-4" aria-hidden="true" /> : unitIndex + 1}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold truncate">{unit.nombre}</span>
                      <span className="mt-1 block h-1.5 rounded-full bg-stone-200 overflow-hidden" aria-hidden="true">
                        <span className={`block h-full rounded-full ${pct === 1 ? 'bg-amber-400' : styleSet.solid}`} style={{ width: `${pct * 100}%` }} />
                      </span>
                    </span>
                    <span className="text-xs font-bold text-stone-500 tabular-nums">
                      {done}/{total}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="relative rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 pt-4 shadow-sm overflow-hidden">
          <span className="block w-24 aspect-square mx-auto llama llama-reposo" aria-hidden="true">
            <LlamaImage pose="ayuda" sticker sizes="6rem" />
          </span>
          <p className="mt-2 text-sm font-semibold text-amber-950 text-center">{TIPS[Math.floor(Date.now() / 86400000) % TIPS.length]}</p>
        </div>
      </aside>
      </div>
    </div>
  );
};

export default LearningPath;
