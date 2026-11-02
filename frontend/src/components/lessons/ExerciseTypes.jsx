import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as m from 'motion/react-m';
import { Volume2, Check, X, Snail, Delete } from 'lucide-react';
import { classifyAnswer } from '../../utils/normalizer';
import { getLanguage, languageStyle } from '../../languages';
import { playTap, playMatch, playWrong } from '../../utils/sounds';
import Mascot from '../Mascot';
import { speak } from '../../utils/speech';
import { layoutBox } from '../GameFx';

// ==================== COMPARACIÓN DE RESPUESTAS ====================
// Acepta diferencias de escritura que no cambian la palabra:
// - mayúsculas, espacios y signos de puntuación al inicio o al final;
// - cualquier tipo de apóstrofo (' ’ ‘ ´ `), muy común en quechua y aymara (p'unchay, ch'uqi);
// - tildes en vocales (mamá = mama). La ñ se conserva porque es otra letra.
export const normalizeAnswer = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[’‘´`ʼ]/g, "'")
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/^[\s¿¡.,;:!?"]+|[\s¿¡.,;:!?"]+$/g, '')
    .replace(/\s+/g, ' ');

const sameAnswer = (a, b) => normalizeAnswer(a) === normalizeAnswer(b);

// Convierte JSON guardado como texto sin romperse si no lo es
const safeJsonParse = (value, defaultValue = []) => {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return Array.isArray(defaultValue) ? [value] : value;
  }
};

// Mezcla una copia de la lista (Fisher-Yates) para que la respuesta no esté siempre en la misma posición
const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Inserta un carácter donde está el cursor y deja el cursor justo después
const insertAtCursor = (el, value, setValue, ch) => {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  setValue(value.slice(0, start) + ch + value.slice(end));
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    el.setSelectionRange(start + ch.length, start + ch.length);
  });
};

// Qué hace la llamita mientras respondes cada tipo de ejercicio
const TYPE_POSES = {
  multiple_choice: 'pensando',
  true_false: 'sorprendida',
  listen_write: 'escuchando',
  translate: 'escribiendo',
  fill_blanks: 'escribiendo',
  matching: 'buscando',
  word_order: 'pensando',
  drag_words: 'pensando',
};

const TYPE_LABELS = {
  multiple_choice: 'Elige la respuesta',
  true_false: '¿Verdadero o falso?',
  listen_write: 'Escucha y escribe',
  translate: 'Traduce',
  fill_blanks: 'Completa la frase',
  matching: 'Empareja',
  word_order: 'Ordena la frase',
  drag_words: 'Ordena la frase',
};

// ==================== PIEZAS COMPARTIDAS ====================

// Estado visual de una ficha: reposo, elegida, correcta, incorrecta o apagada
const tileClass = (state, theme) => {
  const base = 'ficha w-full min-h-14 rounded-2xl px-4 py-3 flex items-center gap-3 text-left font-bold disabled:cursor-default';
  switch (state) {
    case 'selected':
      return `${base} ${theme.border} ${theme.soft} ${theme.text}`;
    case 'right':
      return `${base} border-green-600 bg-green-50 text-green-900`;
    case 'wrong':
      return `${base} border-red-500 bg-red-50 text-red-900 anim-sacude`;
    case 'done':
      return `${base} border-stone-200 bg-stone-50 text-stone-400`;
    case 'dim':
      return `${base} border-stone-200 bg-white text-stone-400`;
    default:
      return `${base} border-stone-300 bg-white text-stone-800 hover:bg-stone-50`;
  }
};

const KeyHint = ({ n, state }) => (
  <span
    className={`tecla hidden sm:inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-black ${
      state === 'selected' ? 'border-current' : 'border-stone-200 text-stone-500'
    }`}
    aria-hidden="true"
  >
    {n}
  </span>
);

// Colores de las parejas: cada pareja unida tiene su línea y su borde del mismo color
const PAIR_COLORS = ['#16a34a', '#2563eb', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#dc2626'];

// Dibuja una curva entre las fichas de cada pareja (mide su posición dentro del contenedor)
const MatchingLines = ({ containerRef, pairs, pairsKey }) => {
  const [lines, setLines] = useState([]);
  const measure = useCallback(() => {
    const box = containerRef.current;
    if (!box) return;
    setLines(
      pairs
        .map((p) => {
          const a = box.querySelector(`[data-tile="L-${p.l}"]`);
          const b = box.querySelector(`[data-tile="R-${p.r}"]`);
          if (!a || !b) return null;
          // Posición de diseño (offset): no la mueven las animaciones de entrada ni el "pop" de las fichas
          const A = layoutBox(a, box);
          const B = layoutBox(b, box);
          return { key: `${p.l}-${p.r}`, x1: A.x + A.w, y1: A.y + A.h / 2, x2: B.x, y2: B.y + B.h / 2, color: p.color };
        })
        .filter(Boolean)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairsKey]);
  useLayoutEffect(() => {
    measure();
    const box = containerRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [measure, containerRef]);
  return (
    <svg className="pointer-events-none absolute inset-0 w-full h-full overflow-visible z-10" aria-hidden="true">
      {lines.map((l) => {
        const mx = (l.x1 + l.x2) / 2;
        return (
          <g key={l.key}>
            <m.path
              d={`M ${l.x1} ${l.y1} C ${mx} ${l.y1}, ${mx} ${l.y2}, ${l.x2} ${l.y2}`}
              stroke={l.color}
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            />
            <m.circle cx={l.x1} cy={l.y1} r="7" fill={l.color} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6 }} />
            <m.circle cx={l.x2} cy={l.y2} r="7" fill={l.color} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6, delay: 0.3 }} />
          </g>
        );
      })}
    </svg>
  );
};

// Barra fija de abajo con "Verificar" (y "Saltar" cuando aplica), como en Duolingo.
// Va directo al <body>: dentro de la pregunta que se desliza, "fixed" se movería con ella.
const CheckBar = (props) => createPortal(<CheckBarInner {...props} />, document.body);
const CheckBarInner = ({ disabled, onCheck, onSkip, skipLabel }) => (
  <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-stone-100 bg-white/95 backdrop-blur">
    <div className="container mx-auto max-w-3xl py-4 flex items-center gap-3">
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="ficha min-h-12 px-5 rounded-2xl border-stone-300 bg-white font-black text-stone-600 uppercase tracking-wide text-sm hover:bg-stone-50"
        >
          {skipLabel}
        </button>
      )}
      <p className="hidden md:block text-sm text-stone-500 mr-auto">
        <kbd className="px-1.5 py-0.5 rounded border border-stone-300 font-sans text-xs">Enter</kbd> para verificar
      </p>
      <button
        type="button"
        onClick={onCheck}
        disabled={disabled}
        className={`ficha flex-1 sm:flex-none sm:min-w-52 min-h-12 px-8 rounded-2xl font-black uppercase tracking-wide ${
          disabled ? 'border-stone-200 bg-stone-200 text-stone-500 cursor-not-allowed' : 'border-green-800 bg-green-600 text-white hover:bg-green-500'
        }`}
      >
        Verificar
      </button>
    </div>
  </div>
);

// Botones para las letras que no están en todos los teclados (apóstrofo de las glotalizadas, ñ, ä…)
const LetterKeys = ({ keys, onKey, disabled }) => (
  <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Letras especiales">
    {keys.map((k) => (
      <button
        key={k}
        type="button"
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onKey(k)}
        aria-label={k === "'" ? 'Escribir apóstrofo' : `Escribir ${k}`}
        className="ficha min-w-11 min-h-11 px-3 rounded-xl border-stone-300 bg-white text-lg font-bold hover:bg-stone-50"
      >
        {k}
      </button>
    ))}
  </div>
);

/**
 * Muestra un ejercicio y llama a onAnswer(esCorrecta, respuestaCorrectaLegible, detalle).
 * detalle = { resultado: 'correcto' | 'variante' | 'incorrecto', fenomenos, respuesta } (normalizador dialectal).
 * Con answered=true queda bloqueado mientras se muestra la corrección.
 * mood/beat animan a la llamita (la lección le dice si se acertó o no).
 */
const ExerciseTypes = ({
  exercise,
  onAnswer,
  onSkip,
  answered = false,
  languageLabel = 'Quechua',
  languageId = 'quechua',
  mood = 'idle',
  beat = 0,
  vocabulary = [],
}) => {
  const [selected, setSelected] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [fillBlanks, setFillBlanks] = useState({});
  const [order, setOrder] = useState([]); // índices de las fichas elegidas, en orden
  const [pick, setPick] = useState(null); // emparejar: { side: 'L' | 'R', value }
  const [matched, setMatched] = useState({}); // emparejar: izquierda → derecha
  const [wrongPair, setWrongPair] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fillMode, setFillMode] = useState('fichas'); // completar: 'fichas' (arrastrar) o 'escribir'
  const [placed, setPlaced] = useState({}); // completar: espacio → índice de la ficha
  const [hoverSlot, setHoverSlot] = useState(null);
  const matchBoxRef = useRef(null);
  const draggingRef = useRef(false);

  const inputRef = useRef(null);
  const blankRefs = useRef([]);
  const lastBlank = useRef(0);
  const errorsRef = useRef(0);
  const submitRef = useRef(() => {});
  const numberRef = useRef(null);
  const backRef = useRef(null);

  const language = getLanguage(languageId);
  const theme = languageStyle(languageId);
  const letterKeys = language?.teclado ?? ["'"];
  const voice = { url: exercise?.audio_url, idioma: language?.id, lang: language?.voz?.respaldo };

  // Orden aleatorio, fijo mientras dure cada ejercicio
  const shuffled = useMemo(() => {
    if (!exercise) return {};
    const opciones = safeJsonParse(exercise.opciones, exercise.tipo === 'multiple_choice' ? [] : {});
    if (exercise.tipo === 'multiple_choice') return { options: shuffle(Array.isArray(opciones) ? opciones : []) };
    if (exercise.tipo === 'matching') {
      let left = opciones.columna_izquierda || [];
      let right = opciones.columna_derecha || [];
      const correct = safeJsonParse(exercise.respuesta_correcta, {});
      if (left.length === 0) {
        left = Object.keys(correct);
        right = Object.values(correct);
      }
      return { left: shuffle(left), right: shuffle(right), pairs: correct };
    }
    if (exercise.tipo === 'word_order' || exercise.tipo === 'drag_words') {
      const words = opciones.palabras || (Array.isArray(opciones) ? opciones : []);
      return { words: shuffle(words) };
    }
    if (exercise.tipo === 'fill_blanks') {
      const answers = safeJsonParse(exercise.respuesta_correcta, []);
      const list = Array.isArray(answers) ? answers.map(String) : [String(answers)];
      const taken = new Set(list.map((w) => w.toLowerCase()));
      const distractors = shuffle(
        [...new Set(vocabulary.map((w) => String(w).trim()))].filter((w) => w && !w.includes(' ') && w.length <= 16 && !taken.has(w.toLowerCase()))
      ).slice(0, Math.max(2, 4 - list.length));
      return { chips: shuffle([...list, ...distractors]) };
    }
    return {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id]);

  // En "escucha y escribe" el audio suena solo al aparecer
  useEffect(() => {
    if (exercise?.tipo !== 'listen_write') return undefined;
    const t = setTimeout(() => speak(exercise.respuesta_correcta, voice), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id]);

  // Teclado: Enter verifica, 1-9 elige, Retroceso quita la última ficha
  useEffect(() => {
    if (answered) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      const onOption = !!e.target?.closest?.('[data-opcion]');
      // Los campos de texto manejan su propio Enter; en otros botones Enter los activa
      if (typing) return;
      if (e.key === 'Enter') {
        if (tag === 'BUTTON' && !onOption) return;
        e.preventDefault();
        submitRef.current();
        return;
      }
      if (e.key === 'Backspace' && backRef.current) {
        e.preventDefault();
        backRef.current();
        return;
      }
      const n = e.key === '0' ? 10 : Number(e.key);
      if (n >= 1 && n <= 10 && numberRef.current) numberRef.current(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered]);

  if (!exercise) {
    return <p className="text-center text-stone-600 p-6">No hay ejercicio disponible</p>;
  }

  const answer = (isCorrect, correctText, detail = {}) => {
    if (answered) return;
    onAnswer(isCorrect, correctText, { resultado: isCorrect ? 'correcto' : 'incorrecto', fenomenos: [], ...detail });
  };

  // Respuestas escritas: el normalizador dialectal acepta variantes (glotalizadas, q/k, e/o...) como correctas
  const answerWritten = (given, expected) => {
    const r = classifyAnswer(given, expected, languageId);
    answer(r.resultado !== 'incorrecto', expected, { resultado: r.resultado, fenomenos: r.fenomenos, respuesta: given });
  };

  const handleSubmit = () => {
    switch (exercise.tipo) {
      case 'multiple_choice':
        if (selected === null) return;
        answer(sameAnswer(selected, exercise.respuesta_correcta), exercise.respuesta_correcta, { respuesta: selected });
        break;

      case 'listen_write':
      case 'translate':
        if (!userAnswer.trim()) return;
        answerWritten(userAnswer, exercise.respuesta_correcta);
        break;

      case 'true_false': {
        if (selected === null) return;
        const correctBool = exercise.respuesta_correcta === 'true' || exercise.respuesta_correcta === true;
        answer(selected === correctBool, correctBool ? 'Verdadero' : 'Falso', { respuesta: selected ? 'Verdadero' : 'Falso' });
        break;
      }

      case 'fill_blanks': {
        const blanks = exercise.pregunta.split('___').length - 1;
        const answers = Array.from({ length: blanks }, (_, i) => fillBlanks[i] || '');
        if (answers.some((a) => !a.trim())) return;
        const correctAnswers = safeJsonParse(exercise.respuesta_correcta, []);
        const results = answers.map((ans, idx) => classifyAnswer(ans, correctAnswers[idx] || '', languageId));
        const resultado = results.some((r) => r.resultado === 'incorrecto')
          ? 'incorrecto'
          : results.some((r) => r.resultado === 'variante')
            ? 'variante'
            : 'correcto';
        answer(resultado !== 'incorrecto', correctAnswers.join(', '), {
          resultado,
          fenomenos: [...new Set(results.flatMap((r) => r.fenomenos))],
          respuesta: answers.join(', '),
        });
        break;
      }

      case 'word_order':
      case 'drag_words': {
        if (order.length === 0) return;
        let correctOrder = safeJsonParse(exercise.respuesta_correcta, []);
        if (!Array.isArray(correctOrder)) correctOrder = [correctOrder];
        const given = order.map((i) => shuffled.words[i]);
        const isOrderCorrect = given.length === correctOrder.length && given.every((word, idx) => sameAnswer(word, correctOrder[idx] || ''));
        answer(isOrderCorrect, correctOrder.join(' '), { respuesta: given.join(' ') });
        break;
      }

      default:
        break;
    }
  };
  submitRef.current = handleSubmit;
  numberRef.current = null;
  backRef.current = null;

  const choose = (value) => {
    if (answered) return;
    playTap();
    setSelected(value);
  };

  const playAudio = (slow = false) => {
    setIsPlaying(true);
    speak(exercise.respuesta_correcta, { ...voice, slow });
    setTimeout(() => setIsPlaying(false), slow ? 2200 : 1400);
  };

  // Ordenar con una sola palabra correcta es, en realidad, "elegir la palabra"
  const oneWord =
    (exercise.tipo === 'word_order' || exercise.tipo === 'drag_words') &&
    (() => {
      const r = safeJsonParse(exercise.respuesta_correcta, []);
      return !Array.isArray(r) || r.length === 1;
    })();
  const label = oneWord ? 'Elige la palabra' : TYPE_LABELS[exercise.tipo] ?? 'Ejercicio';

  // La llamita con su globo: la consigna o la pregunta de cada ejercicio
  const prompt = (content) => (
    <div className="mb-6 sm:mb-8">
      <p className={`mb-3 text-sm font-black uppercase tracking-wider ${theme.text}`}>{label}</p>
      <Mascot mood={mood} pose={mood === 'idle' ? TYPE_POSES[exercise.tipo] : undefined} beat={beat} say={content} size="w-20 sm:w-28" eager />
    </div>
  );

  const questionId = `pregunta-${exercise.id}`;

  // ==================== 1. OPCIÓN MÚLTIPLE ====================
  if (exercise.tipo === 'multiple_choice') {
    const opciones = shuffled.options || [];
    numberRef.current = (i) => opciones[i] !== undefined && choose(opciones[i]);
    const stateOf = (op) => {
      if (!answered) return selected === op ? 'selected' : 'idle';
      if (sameAnswer(op, exercise.respuesta_correcta)) return 'right';
      return selected === op ? 'wrong' : 'dim';
    };
    return (
      <div className="max-w-2xl mx-auto py-2">
        {prompt(<p id={questionId} className="text-lg sm:text-xl font-bold">{exercise.pregunta}</p>)}
        <div className="grid gap-3 sm:grid-cols-2" role="group" aria-labelledby={questionId}>
          {opciones.map((opcion, index) => {
            const state = stateOf(opcion);
            return (
              <button
                key={opcion}
                data-opcion
                type="button"
                aria-pressed={selected === opcion}
                disabled={answered}
                onClick={() => choose(opcion)}
                className={`${tileClass(state, theme)} anim-entra`}
                style={{ '--i': index }}
              >
                <KeyHint n={index + 1} state={state} />
                <span className="flex-1 text-lg">{opcion}</span>
                {state === 'right' && <Check className="w-6 h-6 text-green-700" strokeWidth={3} aria-hidden="true" />}
                {state === 'wrong' && <X className="w-6 h-6 text-red-600" strokeWidth={3} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {!answered && <CheckBar onCheck={handleSubmit} disabled={selected === null} />}
      </div>
    );
  }

  // ==================== 2. VERDADERO O FALSO ====================
  if (exercise.tipo === 'true_false') {
    const correctBool = exercise.respuesta_correcta === 'true' || exercise.respuesta_correcta === true;
    const choices = [
      [true, 'Verdadero', Check, 'text-green-700'],
      [false, 'Falso', X, 'text-red-600'],
    ];
    numberRef.current = (i) => choices[i] && choose(choices[i][0]);
    return (
      <div className="max-w-2xl mx-auto py-2">
        {prompt(<p id={questionId} className="text-lg sm:text-xl font-bold">{exercise.pregunta}</p>)}
        <div className="grid grid-cols-2 gap-3 sm:gap-4" role="group" aria-labelledby={questionId}>
          {choices.map(([value, label, Icon, iconClass], index) => {
            const state = !answered ? (selected === value ? 'selected' : 'idle') : value === correctBool ? 'right' : selected === value ? 'wrong' : 'dim';
            return (
              <button
                key={label}
                data-opcion
                type="button"
                aria-pressed={selected === value}
                disabled={answered}
                onClick={() => choose(value)}
                style={{ '--i': index }}
                className={`${tileClass(state, theme)} anim-entra !flex-col justify-center min-h-32 sm:min-h-36`}
              >
                <Icon className={`w-10 h-10 ${state === 'dim' ? 'text-stone-300' : iconClass}`} strokeWidth={3} aria-hidden="true" />
                <span className="text-xl">{label}</span>
                <KeyHint n={index + 1} state={state} />
              </button>
            );
          })}
        </div>
        {!answered && <CheckBar onCheck={handleSubmit} disabled={selected === null} />}
      </div>
    );
  }

  // Campo de texto con las letras especiales debajo (escuchar y traducir)
  const writtenField = (label, placeholder) => (
    <div className="space-y-3">
      <label htmlFor={`${questionId}-campo`} className="sr-only">
        {label}
      </label>
      <textarea
        id={`${questionId}-campo`}
        ref={inputRef}
        rows={2}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={userAnswer}
        disabled={answered}
        onChange={(e) => setUserAnswer(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={placeholder}
        className={`w-full resize-none rounded-2xl border-2 bg-stone-50 px-4 py-4 text-xl font-semibold focus:outline-none focus:bg-white ${
          answered ? 'border-stone-200 text-stone-600' : 'border-stone-300 focus:border-stone-500'
        }`}
        lang={exercise.tipo === 'listen_write' ? language?.lang : undefined}
      />
      {!answered && <LetterKeys keys={letterKeys} onKey={(k) => insertAtCursor(inputRef.current, userAnswer, setUserAnswer, k)} />}
    </div>
  );

  // ==================== 3. ESCUCHAR Y ESCRIBIR ====================
  if (exercise.tipo === 'listen_write') {
    return (
      <div className="max-w-2xl mx-auto py-2">
        {prompt(<p className="text-lg sm:text-xl font-bold">¡Escucha bien y escribe lo que oyes!</p>)}
        <div className="flex items-end justify-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => playAudio(false)}
            aria-label="Escuchar"
            className={`ficha w-28 h-28 sm:w-32 sm:h-32 rounded-3xl ${theme.solid} border-black/25 text-white flex items-center justify-center shadow-lg`}
          >
            <Volume2 className={`w-14 h-14 ${isPlaying ? 'anim-latido' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => playAudio(true)}
            aria-label="Escuchar despacio"
            title="Despacio"
            className={`ficha w-16 h-16 rounded-2xl border-stone-300 bg-white ${theme.text} flex items-center justify-center`}
          >
            <Snail className="w-8 h-8" aria-hidden="true" />
          </button>
        </div>
        {writtenField('Lo que escuchaste', 'Escribe lo que escuchaste')}
        {!answered && <CheckBar onCheck={handleSubmit} disabled={!userAnswer.trim()} onSkip={onSkip} skipLabel="No puedo escuchar" />}
      </div>
    );
  }

  // ==================== 4. TRADUCIR ====================
  if (exercise.tipo === 'translate') {
    return (
      <div className="max-w-2xl mx-auto py-2">
        {prompt(
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => speak(exercise.pregunta, { idioma: language?.id, lang: language?.voz?.respaldo })}
              aria-label={`Escuchar ${exercise.pregunta}`}
              className={`ficha w-11 h-11 shrink-0 rounded-xl ${theme.solid} border-black/25 text-white flex items-center justify-center`}
            >
              <Volume2 className="w-5 h-5" aria-hidden="true" />
            </button>
            <p id={questionId} className="text-xl sm:text-2xl font-black underline decoration-dotted decoration-stone-300 underline-offset-8">
              {exercise.pregunta}
            </p>
          </div>
        )}
        {writtenField('Tu traducción', 'Escribe la traducción')}
        {!answered && <CheckBar onCheck={handleSubmit} disabled={!userAnswer.trim()} />}
      </div>
    );
  }

  // ==================== 5. COMPLETAR ESPACIOS ====================
  // Se arrastra una ficha hasta el espacio (o se toca y cae en el primer espacio libre).
  // Tocar una ficha ya puesta la devuelve. También se puede escribir la palabra.
  if (exercise.tipo === 'fill_blanks') {
    const parts = exercise.pregunta.split('___');
    const blanks = parts.length - 1;
    const incomplete = Array.from({ length: blanks }, (_, i) => fillBlanks[i] || '').some((v) => !v.trim());
    const setBlank = (i) => (value) => setFillBlanks((prev) => ({ ...prev, [i]: typeof value === 'function' ? value(prev[i] || '') : value }));
    const chips = shuffled.chips || [];
    const useChips = fillMode === 'fichas' && chips.length > 0;
    const usedChips = new Set(Object.values(placed));

    const place = (chipIndex, slot) => {
      if (answered) return;
      const target = slot ?? Array.from({ length: blanks }, (_, i) => i).find((i) => placed[i] === undefined);
      if (target === undefined) return;
      playTap();
      setPlaced((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => next[k] === chipIndex && delete next[k]);
        next[target] = chipIndex;
        return next;
      });
      setFillBlanks((prev) => ({ ...prev, [target]: chips[chipIndex] }));
    };
    const unplace = (slot) => {
      if (answered || placed[slot] === undefined) return;
      playTap();
      setPlaced((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      setFillBlanks((prev) => ({ ...prev, [slot]: '' }));
    };
    // ¿Sobre qué espacio se soltó la ficha?
    const slotAt = (event, info) => {
      const x = event?.clientX ?? (info ? info.point.x - window.scrollX : 0);
      const y = event?.clientY ?? (info ? info.point.y - window.scrollY : 0);
      const el = document.elementsFromPoint(x, y).find((n) => n.dataset?.slot !== undefined);
      return el ? Number(el.dataset.slot) : null;
    };
    if (useChips) {
      numberRef.current = (i) => i < chips.length && !usedChips.has(i) && place(i);
      backRef.current = () => {
        const filled = Object.keys(placed).map(Number);
        if (filled.length) unplace(Math.max(...filled));
      };
    }

    return (
      <div className="max-w-2xl mx-auto py-2">
        {prompt(<p className="text-lg sm:text-xl font-bold">{useChips ? 'Arrastra la palabra que falta' : 'Escribe la palabra que falta'}</p>)}
        <p className="relative rounded-3xl border-2 border-stone-200 bg-white p-5 sm:p-7 mb-5 text-xl sm:text-2xl leading-[2.8] font-semibold shadow-sm">
          {parts.map((part, index) => (
            <span key={index}>
              {part}
              {index < blanks &&
                (useChips ? (
                  <span
                    data-slot={index}
                    className={`inline-flex align-middle mx-1.5 min-w-[7rem] min-h-12 items-center justify-center rounded-2xl border-2 border-dashed px-2 transition-all duration-150 ${
                      hoverSlot === index ? `${theme.border} ${theme.soft} scale-105` : placed[index] !== undefined ? 'border-transparent' : 'border-stone-300 bg-stone-50'
                    }`}
                  >
                    {placed[index] !== undefined ? (
                      <m.button
                        type="button"
                        layoutId={answered ? undefined : `chip-${exercise.id}-${placed[index]}`}
                        transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                        onClick={() => unplace(index)}
                        disabled={answered}
                        aria-label={`Quitar ${chips[placed[index]]} del espacio ${index + 1}`}
                        className={`ficha min-h-11 px-4 rounded-xl text-lg font-black ${theme.border} ${theme.soft} ${theme.text}`}
                        lang={language?.lang}
                      >
                        {chips[placed[index]]}
                      </m.button>
                    ) : (
                      <span className="text-base text-stone-400" aria-label={`Espacio ${index + 1} vacío`}>
                        &nbsp;
                      </span>
                    )}
                  </span>
                ) : (
                  <input
                    ref={(el) => {
                      blankRefs.current[index] = el;
                    }}
                    type="text"
                    aria-label={`Espacio ${index + 1} de ${blanks}`}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={fillBlanks[index] || ''}
                    disabled={answered}
                    onFocus={() => {
                      lastBlank.current = index;
                    }}
                    onChange={(e) => setBlank(index)(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < blanks - 1) blankRefs.current[index + 1]?.focus();
                        else handleSubmit();
                      }
                    }}
                    size={Math.max(6, (fillBlanks[index] || '').length + 2)}
                    className={`inline-block mx-1.5 px-3 py-0.5 rounded-xl border-2 border-b-4 bg-stone-50 text-center font-bold focus:outline-none focus:bg-white ${theme.text} border-stone-300 focus:border-stone-500`}
                  />
                ))}
            </span>
          ))}
        </p>

        {useChips ? (
          <div className="flex flex-wrap justify-center gap-3" lang={language?.lang} role="group" aria-label="Palabras para completar">
            {chips.map((word, i) =>
              usedChips.has(i) ? (
                <span key={i} className="ficha min-h-12 px-4 rounded-xl border-stone-200 bg-stone-200 text-transparent text-lg font-black select-none" aria-hidden="true">
                  {word}
                </span>
              ) : (
                <m.button
                  key={i}
                  type="button"
                  data-opcion
                  layoutId={answered ? undefined : `chip-${exercise.id}-${i}`}
                  drag={!answered}
                  dragSnapToOrigin
                  dragElastic={0.9}
                  whileDrag={{ scale: 1.12, rotate: -3, zIndex: 50, boxShadow: '0 16px 30px rgba(28,25,23,0.25)' }}
                  whileHover={{ y: -3 }}
                  onDragStart={() => {
                    draggingRef.current = true;
                  }}
                  onDrag={(e, info) => setHoverSlot(slotAt(e, info))}
                  onDragEnd={(e, info) => {
                    const slot = slotAt(e, info);
                    setHoverSlot(null);
                    if (slot !== null) place(i, slot);
                    setTimeout(() => {
                      draggingRef.current = false;
                    }, 0);
                  }}
                  onClick={() => !draggingRef.current && place(i)}
                  disabled={answered}
                  transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                  className="ficha relative z-20 min-h-12 px-4 rounded-xl border-stone-300 bg-white text-lg font-black text-stone-800 hover:bg-stone-50 cursor-grab active:cursor-grabbing touch-none"
                >
                  {word}
                </m.button>
              )
            )}
          </div>
        ) : (
          !answered && (
            <LetterKeys
              keys={letterKeys}
              onKey={(k) => {
                const i = lastBlank.current;
                insertAtCursor(blankRefs.current[i], fillBlanks[i] || '', setBlank(i), k);
              }}
            />
          )
        )}

        {!answered && chips.length > 0 && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setFillMode((m0) => (m0 === 'fichas' ? 'escribir' : 'fichas'));
                setPlaced({});
                setFillBlanks({});
              }}
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl text-stone-600 hover:bg-stone-100 font-bold toque"
            >
              {useChips ? 'Prefiero escribir' : 'Usar fichas'}
            </button>
          </div>
        )}
        {!answered && <CheckBar onCheck={handleSubmit} disabled={incomplete} />}
      </div>
    );
  }

  // ==================== 6. EMPAREJAR ====================
  // Se toca una ficha de cada columna: si son pareja se quedan verdes, si no, tiemblan.
  // Al completar todas las parejas, el ejercicio se corrige solo.
  if (exercise.tipo === 'matching') {
    const leftItems = shuffled.left || [];
    const rightItems = shuffled.right || [];
    const pairs = shuffled.pairs || {};
    const usedRight = Object.values(matched);
    const pairsText = Object.keys(pairs)
      .map((key) => `${key} = ${pairs[key]}`)
      .join('; ');

    const tap = (side, value) => {
      if (answered || wrongPair) return;
      if (side === 'L' ? matched[value] : usedRight.includes(value)) return;
      if (!pick || pick.side === side) {
        playTap();
        setPick(pick?.side === side && pick.value === value ? null : { side, value });
        return;
      }
      const L = side === 'L' ? value : pick.value;
      const R = side === 'R' ? value : pick.value;
      setPick(null);
      if (pairs[L] === R) {
        playMatch();
        const next = { ...matched, [L]: R };
        setMatched(next);
        if (Object.keys(next).length === leftItems.length) {
          const errors = errorsRef.current;
          setTimeout(
            () => answer(true, pairsText, { respuesta: errors === 0 ? 'sin errores' : `${errors} ${errors === 1 ? 'error' : 'errores'}` }),
            450
          );
        }
      } else {
        playWrong();
        errorsRef.current += 1;
        setWrongPair({ L, R });
        setTimeout(() => setWrongPair(null), 600);
      }
    };
    numberRef.current = (i) => {
      if (i < leftItems.length) tap('L', leftItems[i]);
      else if (rightItems[i - leftItems.length] !== undefined) tap('R', rightItems[i - leftItems.length]);
    };

    // Orden en que se unieron las parejas → color de cada una
    const order = Object.keys(matched);
    const colorOf = (side, value) => {
      const left = side === 'L' ? value : order.find((k) => matched[k] === value);
      const idx = order.indexOf(left);
      return idx >= 0 ? PAIR_COLORS[idx % PAIR_COLORS.length] : null;
    };
    const linePairs = order.map((L, idx) => ({ l: leftItems.indexOf(L), r: rightItems.indexOf(matched[L]), color: PAIR_COLORS[idx % PAIR_COLORS.length] }));

    const stateOf = (side, value) => {
      const done = side === 'L' ? !!matched[value] : usedRight.includes(value);
      if (done) return 'done';
      if (wrongPair && wrongPair[side] === value) return 'wrong';
      if (pick?.side === side && pick.value === value) return 'selected';
      return 'idle';
    };

    const column = (side, items, title, offset) => (
      <div className="space-y-3">
        <h3 className="text-center text-sm font-black uppercase tracking-wider text-stone-500">{title}</h3>
        {items.map((item, index) => {
          const state = stateOf(side, item);
          const color = state === 'done' ? colorOf(side, item) : null;
          return (
            <button
              key={item}
              data-opcion
              data-tile={`${side}-${index}`}
              type="button"
              onClick={() => tap(side, item)}
              aria-pressed={state === 'selected'}
              disabled={answered || state === 'done'}
              lang={side === 'L' ? language?.lang : undefined}
              className={`${tileClass(state === 'done' ? 'idle' : state, theme)} justify-center !text-center anim-entra ${state === 'done' ? 'anim-brilla' : ''}`}
              style={{ '--i': index + (side === 'R' ? 2 : 0), ...(color ? { borderColor: color, backgroundColor: `${color}14`, color } : {}) }}
            >
              <KeyHint n={(offset + index + 1) % 10} state={state} />
              <span className="flex-1 text-base sm:text-lg">{item}</span>
              {state === 'done' && <Check className="w-5 h-5" strokeWidth={3} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    );

    return (
      <div className="max-w-3xl mx-auto py-2">
        {prompt(<p className="text-lg sm:text-xl font-bold">{exercise.pregunta || 'Toca las parejas'}</p>)}
        {/* Las parejas unidas se conectan con una línea de su color */}
        <div ref={matchBoxRef} className="relative grid grid-cols-2 gap-x-10 sm:gap-x-24 gap-y-3">
          {column('L', leftItems, languageLabel, 0)}
          {column('R', rightItems, 'Español', leftItems.length)}
          <MatchingLines containerRef={matchBoxRef} pairs={linePairs} pairsKey={linePairs.map((p) => `${p.l}-${p.r}`).join('|')} />
        </div>
        <div className="mt-6 flex items-center gap-3" aria-live="polite">
          <div className="flex-1 h-3 rounded-full bg-stone-200 overflow-hidden" aria-hidden="true">
            <div
              className={`barra h-full w-full rounded-full ${theme.solid}`}
              style={{ transform: `scaleX(${leftItems.length ? Object.keys(matched).length / leftItems.length : 0})` }}
            />
          </div>
          <span className="text-sm font-bold text-stone-600 tabular-nums">
            {Object.keys(matched).length} de {leftItems.length} parejas
          </span>
        </div>
      </div>
    );
  }

  // ==================== 7. ORDENAR PALABRAS ====================
  // Las fichas vuelan de la reserva a la línea de respuesta (y de vuelta al tocarlas)
  if (exercise.tipo === 'word_order' || exercise.tipo === 'drag_words') {
    const words = shuffled.words || [];
    const add = (i) => {
      if (answered || order.includes(i)) return;
      playTap();
      setOrder((o) => [...o, i]);
    };
    const remove = (i) => {
      if (answered) return;
      playTap();
      setOrder((o) => o.filter((x) => x !== i));
    };
    numberRef.current = (n) => {
      if (n < words.length) add(n);
    };
    backRef.current = () => order.length && remove(order[order.length - 1]);
    const chip = 'ficha min-h-12 px-4 rounded-xl text-lg font-bold';
    const spring = { type: 'spring', bounce: 0.2, duration: 0.4 };

    return (
      <div className="max-w-2xl mx-auto py-2">
        {prompt(<p className="text-lg sm:text-xl font-bold">{exercise.pregunta}</p>)}

        <div
          className="min-h-[7.5rem] flex flex-wrap content-start gap-2 py-2 mb-8"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 58px, #e7e5e4 58px 60px)' }}
          aria-label="Tu respuesta"
          aria-live="polite"
          lang={language?.lang}
        >
          {order.map((i) => (
            <m.button
              key={i}
              layoutId={answered ? undefined : `ficha-${exercise.id}-${i}`}
              transition={spring}
              type="button"
              disabled={answered}
              onClick={() => remove(i)}
              aria-label={`Quitar ${words[i]}`}
              className={`${chip} border-stone-300 bg-white text-stone-800`}
            >
              {words[i]}
            </m.button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2" lang={language?.lang}>
          {words.map((word, i) =>
            order.includes(i) ? (
              <span key={i} className={`${chip} border-stone-200 bg-stone-200 text-transparent select-none`} aria-hidden="true">
                {word}
              </span>
            ) : (
              <m.button
                key={i}
                layoutId={answered ? undefined : `ficha-${exercise.id}-${i}`}
                transition={spring}
                type="button"
                data-opcion
                disabled={answered}
                onClick={() => add(i)}
                className={`${chip} border-stone-300 bg-white text-stone-800 hover:bg-stone-50`}
              >
                {word}
              </m.button>
            )
          )}
        </div>

        {!answered && order.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setOrder([])}
              className="inline-flex items-center gap-2 px-4 min-h-11 rounded-xl text-stone-600 hover:bg-stone-100 font-bold toque"
            >
              <Delete className="w-4 h-4" aria-hidden="true" />
              Borrar todo
            </button>
          </div>
        )}
        {!answered && <CheckBar onCheck={handleSubmit} disabled={order.length === 0} />}
      </div>
    );
  }

  // ==================== TIPO NO SOPORTADO ====================
  return (
    <div className="p-6">
      <p className="bg-red-50 border border-red-300 rounded-xl p-6 text-red-800 font-bold mb-4" role="alert">
        Este tipo de ejercicio todavía no se puede mostrar ({exercise.tipo}).
      </p>
      {onSkip && (
        <button type="button" onClick={onSkip} className="w-full min-h-12 border-2 border-stone-300 rounded-xl font-bold hover:bg-stone-50 toque">
          Saltar este ejercicio
        </button>
      )}
    </div>
  );
};

export default ExerciseTypes;
