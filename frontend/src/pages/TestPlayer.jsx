// Una prueba del aula, del lado del estudiante (/mi-aula/prueba/:id):
//  - Estudiar: las sesiones que pueden salir, con cada palabra, su audio y el micrófono;
//    "Pon a prueba tu memoria" oculta los significados.
//  - Dar la prueba: preguntas de una en una (qué significa, cómo se dice, escucha y elige,
//    verdadero o falso). Al entregar se ve la nota y la revisión de cada pregunta.
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { ArrowLeft, BookOpen, ClipboardCheck, Volume2, Eye, EyeOff, Check, X, RotateCcw, Zap, Layers, Loader2, Play } from 'lucide-react';
import { api } from '../services/api';
import { getLanguage, languageStyle } from '../languages';
import { speak } from '../utils/speech';
import { playCorrect, playWrong, playTap, playComplete } from '../utils/sounds';
import { MicButton, SpeakModal } from '../components/SpeakPractice';
import Mascot from '../components/Mascot';
import { Stars, Confetti } from '../components/GameFx';
import Decor from '../components/Decor';

const TYPE = {
  unidad: { label: 'Prueba de unidad', Icon: Layers, color: 'from-indigo-500 to-blue-700' },
  breve: { label: 'Sesión breve', Icon: Zap, color: 'from-amber-400 to-orange-600' },
};

const Study = ({ data, language, theme, onStart }) => {
  const [hide, setHide] = useState(false);
  const [shown, setShown] = useState({});
  const [saying, setSaying] = useState(null);
  const total = data.sesiones.reduce((a, s) => a + s.palabras.length, 0);
  return (
    <div className="space-y-6">
      <div className="vidrio flex flex-col gap-3 rounded-[2rem] p-5 sm:flex-row sm:items-center">
        <Mascot pose="leyendo" size="w-20" eager say={<p className="font-semibold">Estas son las {total} palabras que pueden salir. Escúchalas, dilas y, cuando estés listo, ¡a la prueba!</p>} />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button type="button" onClick={() => setHide((h) => !h)} aria-pressed={hide} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 font-bold ring-1 ring-stone-200">
            {hide ? <Eye className="h-5 w-5" aria-hidden="true" /> : <EyeOff className="h-5 w-5" aria-hidden="true" />} {hide ? 'Mostrar significados' : 'Pon a prueba tu memoria'}
          </button>
          {data.prueba.abierta && (
            <button type="button" onClick={onStart} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-700 px-5 font-black text-white shadow">
              <Play className="h-4 w-4 fill-current" aria-hidden="true" /> Dar la prueba
            </button>
          )}
        </div>
      </div>
      {data.sesiones.map((s, si) => (
        <section key={s.id}>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm text-white ${theme.solid}`}>{si + 1}</span> {s.titulo}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.palabras.map((w, i) => {
              const hidden = hide && !shown[w.id];
              return (
                <m.li key={w.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 8) * 0.03 }} className="vidrio flex items-center gap-3 rounded-2xl p-3">
                  <button type="button" onClick={() => setShown((x) => ({ ...x, [w.id]: !x[w.id] }))} disabled={!hide} className="min-w-0 flex-1 text-left disabled:cursor-default">
                    <span className={`block text-lg font-black ${theme.text}`} lang={language.lang}>
                      {w.palabra}
                    </span>
                    {hidden ? <span className="mt-1 inline-block rounded-lg bg-stone-200 px-3 py-0.5 text-sm font-bold text-stone-500">Toca para ver</span> : <span className="block text-stone-700">{w.significado}</span>}
                  </button>
                  <button type="button" onClick={() => speak(w.palabra, { url: w.audio, idioma: language.id, lang: language.voz?.respaldo })} aria-label={`Escuchar ${w.palabra}`} className={`ficha flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-black/20 text-white ${theme.solid}`}>
                    <Volume2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <MicButton label={`Decir ${w.palabra}`} onClick={() => setSaying(w)} className="shrink-0" />
                </m.li>
              );
            })}
          </ul>
        </section>
      ))}
      {saying && (
        <SpeakModal
          text={saying.palabra}
          meaning={saying.significado}
          url={saying.audio}
          cohort={data.sesiones.flatMap((s) => s.palabras).map((w) => ({ text: w.palabra, url: w.audio }))}
          language={language}
          theme={theme}
          onClose={() => setSaying(null)}
        />
      )}
    </div>
  );
};

const Quiz = ({ testId, language, theme, onStudy }) => {
  const [state, setState] = useState({ loading: true });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);

  const start = async () => {
    setState({ loading: true });
    setIndex(0);
    setAnswers([]);
    setResult(null);
    try {
      const { data } = await api.startTest(testId);
      setState({ attempt: data.intento, questions: data.preguntas });
    } catch (e) {
      setState({ error: e.response?.data?.message || 'No pudimos empezar la prueba.' });
    }
  };
  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const q = state.questions?.[index];
  useEffect(() => {
    if (q?.tipo === 'escucha') {
      const t = setTimeout(() => speak('', { url: q.audio, idioma: language.id }), 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [q, language.id]);

  const choose = async (option) => {
    playTap();
    const next = [...answers];
    next[index] = option;
    setAnswers(next);
    if (index + 1 < state.questions.length) {
      setTimeout(() => setIndex((i) => i + 1), 220);
      return;
    }
    setSending(true);
    try {
      const { data } = await api.submitTest(testId, state.attempt, next);
      setResult(data);
      if (data.porcentaje >= 70) playComplete();
      else playWrong();
    } catch (e) {
      setState((s) => ({ ...s, error: e.response?.data?.message || 'No pudimos entregar la prueba. Revisa tu conexión.' }));
    } finally {
      setSending(false);
    }
  };

  if (state.loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 font-bold text-stone-600" role="status">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> Preparando tus preguntas…
      </p>
    );
  }
  if (state.error) {
    return (
      <div className="vidrio rounded-[2rem] p-8 text-center" role="alert">
        <p className="text-lg font-black">{state.error}</p>
        <button type="button" onClick={onStudy} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-stone-300 px-5 font-bold">
          <BookOpen className="h-4 w-4" aria-hidden="true" /> Volver a estudiar
        </button>
      </div>
    );
  }
  if (result) {
    const stars = result.porcentaje >= 90 ? 3 : result.porcentaje >= 70 ? 2 : result.porcentaje >= 40 ? 1 : 0;
    return (
      <div className="space-y-6">
        <div className="vidrio relative overflow-hidden rounded-[2rem] p-6 text-center">
          {stars >= 2 && <Confetti />}
          <Mascot mood={stars >= 2 ? 'cheer' : 'happy'} pose={stars >= 2 ? 'celebrando' : 'reintentar'} sticker bubble="top" size="w-32" className="mx-auto" eager say={<p className="text-xl font-black">{stars >= 2 ? '¡Muy bien!' : '¡Sigue practicando!'}</p>} />
          <div className="mt-3">
            <Stars count={stars} />
          </div>
          <p className="mt-2 text-6xl font-black tabular-nums">{result.porcentaje}%</p>
          <p className="font-semibold text-stone-600">
            {result.aciertos} de {result.total} correctas · tu docente ve tu mejor intento
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onStudy} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-stone-300 bg-white px-5 font-bold">
              <BookOpen className="h-5 w-5" aria-hidden="true" /> Estudiar otra vez
            </button>
            <button type="button" onClick={start} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-700 px-5 font-black text-white shadow">
              <RotateCcw className="h-5 w-5" aria-hidden="true" /> Intentar de nuevo
            </button>
          </div>
        </div>
        <ol className="space-y-2">
          {result.revision.map((r, i) => (
            <li key={i} className={`flex items-start gap-3 rounded-2xl p-3 ring-1 ${r.correcta ? 'bg-green-50 ring-green-200' : 'bg-rose-50 ring-rose-200'}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${r.correcta ? 'bg-green-600' : 'bg-rose-600'}`}>{r.correcta ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}</span>
              <div className="min-w-0">
                <p className="font-bold">{r.enunciado}</p>
                <p className="text-sm">
                  {!r.correcta && r.dada && (
                    <>
                      Respondiste <strong>{r.dada}</strong> ·{' '}
                    </>
                  )}
                  Correcta: <strong lang={language.lang}>{r.respuesta}</strong>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const progress = index / state.questions.length;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la prueba">
          <m.div className={`h-full rounded-full bg-gradient-to-r ${theme.gradient}`} animate={{ width: `${progress * 100}%` }} />
        </div>
        <span className="font-black tabular-nums text-stone-600">
          {index + 1}/{state.questions.length}
        </span>
      </div>
      <AnimatePresence mode="wait">
        <m.div key={index} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="vidrio rounded-[2rem] p-5 sm:p-7">
          <p className="text-2xl font-black leading-tight" lang={q.tipo === 'traduccion' ? undefined : language.lang}>
            {q.enunciado}
          </p>
          {q.tipo === 'escucha' && (
            <button type="button" onClick={() => speak('', { url: q.audio, idioma: language.id })} className={`ficha mt-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl border-black/20 text-white shadow-lg ${theme.solid}`} aria-label="Escuchar otra vez">
              <Volume2 className="h-10 w-10" aria-hidden="true" />
            </button>
          )}
          <div className={`mt-5 grid gap-3 ${q.opciones.length === 2 ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
            {q.opciones.map((o, i) => (
              <m.button
                key={o}
                type="button"
                disabled={sending}
                onClick={() => choose(o)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.96 }}
                className={`ficha min-h-16 rounded-2xl px-4 text-left text-lg font-black ${answers[index] === o ? `${theme.border} ${theme.soft} ${theme.text}` : 'border-stone-300 bg-white hover:bg-stone-50'}`}
                lang={q.tipo === 'traduccion' || q.tipo === 'escucha' ? language.lang : undefined}
              >
                {o}
              </m.button>
            ))}
          </div>
        </m.div>
      </AnimatePresence>
      {sending && (
        <p className="mt-4 flex items-center justify-center gap-2 font-bold text-stone-600" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Calificando…
        </p>
      )}
    </div>
  );
};

const TestPlayer = ({ user }) => {
  const { testId } = useParams();
  const [params, setParams] = useSearchParams();
  const mode = params.get('modo') === 'prueba' ? 'prueba' : 'estudiar';
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api
      .studyTest(testId)
      .then(({ data: d }) => setData(d))
      .catch((e) => setError(e.response?.data?.message || 'No pudimos abrir la prueba.'));
  }, [testId]);
  const idioma = user?.idioma_objetivo ?? 'quechua';
  const language = getLanguage(idioma);
  const theme = languageStyle(idioma);
  const type = TYPE[data?.prueba.tipo] ?? TYPE.breve;

  return (
    <div className="fondo-burbujas min-h-screen text-stone-900">
      <span className="burbuja burbuja-verde" aria-hidden="true" />
      <span className="burbuja burbuja-azul" aria-hidden="true" />
      <main className="relative isolate container mx-auto max-w-4xl py-6 sm:py-8">
        <Decor />
        <Link to="/mi-aula" className="inline-flex min-h-11 items-center gap-2 font-semibold text-stone-700 hover:text-stone-900">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Mi aula
        </Link>
        {error ? (
          <p className="vidrio mt-4 rounded-2xl p-6 font-bold" role="alert">
            {error}
          </p>
        ) : !data ? (
          <p className="flex items-center gap-2 py-16 font-bold text-stone-600" role="status">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> Abriendo la prueba…
          </p>
        ) : (
          <>
            <section className={`relative mt-3 overflow-hidden rounded-[2rem] bg-gradient-to-br ${type.color} p-5 sm:p-7 text-white shadow-xl`}>
              <span className="brillo-liquido" aria-hidden="true" />
              <p className="relative inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-widest ring-1 ring-white/40">
                <type.Icon className="h-4 w-4" aria-hidden="true" /> {type.label}
              </p>
              <h1 className="relative mt-2 text-3xl sm:text-4xl font-black">{data.prueba.titulo}</h1>
              <p className="relative text-white/90">
                {data.prueba.preguntas} preguntas · {data.sesiones.length} {data.sesiones.length === 1 ? 'sesión' : 'sesiones'}
                {!data.prueba.abierta && ' · cerrada por tu docente'}
              </p>
            </section>
            {/* Pestañas: estudiar primero, después la prueba */}
            <div className="my-5 grid grid-cols-2 gap-2 rounded-3xl bg-white/80 p-1.5 shadow-sm ring-1 ring-stone-200 backdrop-blur sm:w-fit" role="tablist">
              {[
                ['estudiar', 'Estudiar', BookOpen],
                ['prueba', 'Dar la prueba', ClipboardCheck],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  disabled={id === 'prueba' && !data.prueba.abierta}
                  onClick={() => setParams({ modo: id })}
                  className={`relative flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 font-black disabled:opacity-40 ${mode === id ? 'text-white' : 'text-stone-600'}`}
                >
                  {mode === id && <m.span layoutId="pestana-prueba" className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${theme.gradient}`} />}
                  <Icon className="relative h-5 w-5" aria-hidden="true" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
            {mode === 'estudiar' ? (
              <Study data={data} language={language} theme={theme} onStart={() => setParams({ modo: 'prueba' })} />
            ) : (
              <Quiz testId={testId} language={language} theme={theme} onStudy={() => setParams({ modo: 'estudiar' })} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default TestPlayer;
