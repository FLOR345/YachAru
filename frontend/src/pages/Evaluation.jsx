// Evaluación perceptual del audio: hablantes externos al proyecto califican, del 1 al 5, qué tan bien se entiende la voz.
// Se entra con el QR: la persona elige su lengua, acepta en pantalla y recibe un código propio (sin cuenta ni datos personales).
// Son 20 palabras, unos 5 minutos. Cada persona recibe su propio orden, y puede volver con su código.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play, ShieldCheck, CheckCircle2, ArrowLeft, Share2, Headphones } from 'lucide-react';
import { toast } from '../utils/notify';
import { api } from '../services/api';
import { getLanguage } from '../languages';

const SCALE = [
  [1, 'No se entiende', 'bg-rose-50 border-rose-300 text-rose-900'],
  [2, 'Casi no se entiende', 'bg-orange-50 border-orange-300 text-orange-900'],
  [3, 'Se entiende con esfuerzo', 'bg-amber-50 border-amber-300 text-amber-900'],
  [4, 'Se entiende bien', 'bg-lime-50 border-lime-400 text-lime-900'],
  [5, 'Se entiende perfectamente', 'bg-green-50 border-green-500 text-green-900'],
];

const STORE = 'yacharu-evaluacion-codigo';
const remember = (codigo) => {
  try {
    localStorage.setItem(STORE, codigo);
  } catch {
    // sin almacenamiento: puede volver escribiendo su código
  }
};
const remembered = () => {
  try {
    return localStorage.getItem(STORE) ?? '';
  } catch {
    return '';
  }
};

const card = 'bg-white rounded-3xl border border-stone-200 shadow-sm p-5 sm:p-8';
const primary = 'ficha w-full min-h-14 px-6 rounded-2xl bg-green-700 border-black/20 text-white text-lg font-black disabled:opacity-50';
const message = (error, fallback) => error.response?.data?.message ?? fallback;

const Evaluation = () => {
  const [params] = useSearchParams();
  const [info, setInfo] = useState(null); // { meta, palabras, lenguas }
  const [idioma, setIdioma] = useState(params.get('lengua') ?? '');
  const [accepts, setAccepts] = useState(false);
  const [outsider, setOutsider] = useState(false);
  const [variedad, setVariedad] = useState('');
  const [codigo, setCodigo] = useState(params.get('codigo') ?? '');
  const [showCode, setShowCode] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [items, setItems] = useState(null);
  const [position, setPosition] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const audio = useRef(null);

  const play = (item) => {
    if (!item) return;
    audio.current?.pause();
    audio.current = new Audio(item.url);
    audio.current.play().catch(() => {});
  };

  const open = (data, code) => {
    setIdioma(data.idioma);
    if (data.necesitaConsentimiento) {
      setNeedsConsent(true);
      return;
    }
    setNeedsConsent(false);
    setCodigo(code);
    remember(code);
    setItems(data.items);
    const next = Math.max(0, data.items.findIndex((i) => !i.puntaje));
    setPosition(data.items.every((i) => i.puntaje) ? data.items.length : next);
    play(data.items[next]);
  };

  const enter = async (code, consiente = false, silent = false) => {
    setBusy(true);
    try {
      const { data } = await api.enterEvaluation({ codigo: code, ...(consiente ? { consiente } : {}) });
      open(data, code);
    } catch (error) {
      if (silent) remember('');
      else toast.error(message(error, 'No pudimos entrar'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    api.getEvaluationLanguages().then(({ data }) => setInfo(data)).catch(() => setInfo({ meta: 10, palabras: 20, lenguas: [] }));
    const code = params.get('codigo') || remembered();
    if (code) enter(code.toUpperCase(), false, !params.get('codigo'));
    // solo al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = async () => {
    setBusy(true);
    try {
      const { data } = await api.joinEvaluation({ idioma, consiente: accepts, ajeno: outsider, ...(variedad.trim() ? { variedad: variedad.trim() } : {}) });
      open(data, data.codigo);
    } catch (error) {
      toast.error(message(error, 'No pudimos empezar'));
    } finally {
      setBusy(false);
    }
  };

  const current = items?.[position];
  const done = items?.filter((i) => i.puntaje).length ?? 0;
  const language = getLanguage(idioma);
  const available = useMemo(() => (info?.lenguas ?? []).filter((l) => getLanguage(l.idioma)), [info]);

  useEffect(() => setComment(''), [position]);

  const rate = async (puntaje) => {
    const item = current;
    const next = position + 1;
    // Avanza al instante y suena la siguiente palabra (dentro del toque: así también suena en iPhone)
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, puntaje } : i)));
    setPosition(next);
    play(items[next]);
    try {
      await api.answerEvaluation({ codigo, audioId: item.id, puntaje, ...(comment.trim() ? { comentario: comment.trim() } : {}) });
    } catch (error) {
      toast.error(message(error, 'No se guardó tu respuesta. Vuelve a calificarla.'));
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, puntaje: null } : i)));
      setPosition(position);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/evaluacion`;
    const text = 'Ayúdanos a evaluar la voz de YachAru: 20 palabras, 5 minutos.';
    if (navigator.share) await navigator.share({ title: 'YachAru', text, url }).catch(() => {});
    else await navigator.clipboard.writeText(`${text} ${url}`).then(() => toast.success('Enlace copiado'), () => toast(url));
  };

  const header = (
    <header className="mb-5">
      <p className="text-sm font-black uppercase tracking-widest text-green-700">YachAru</p>
      <h1 className="text-3xl font-black text-stone-900">Evalúa la voz</h1>
      <p className="text-stone-600 mt-1">{info?.palabras ?? 20} palabras · unos 5 minutos · sin cuenta</p>
    </header>
  );

  // 1. Elegir lengua y aceptar
  if (!items && !needsConsent) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="max-w-xl mx-auto">
          {header}
          <section className={`${card} space-y-6`}>
            <div>
              <h2 className="font-black text-stone-900 mb-3">¿Qué lengua hablas?</h2>
              <div className="grid grid-cols-2 gap-3">
                {available.map((l) => {
                  const lang = getLanguage(l.idioma);
                  return (
                    <button
                      key={l.idioma}
                      type="button"
                      disabled={!l.disponible}
                      onClick={() => setIdioma(l.idioma)}
                      aria-pressed={idioma === l.idioma}
                      className={`ficha min-h-20 rounded-2xl p-3 text-left ${idioma === l.idioma ? 'bg-green-700 text-white border-black/20' : 'bg-white border-stone-300 text-stone-900'} disabled:opacity-50`}
                    >
                      <span className="block text-lg font-black">{lang.nombre}</span>
                      <span className={`block text-sm ${idioma === l.idioma ? 'text-green-100' : 'text-stone-600'}`}>
                        {l.disponible ? `${l.terminaron} de ${info.meta} personas` : 'Muy pronto'}
                      </span>
                    </button>
                  );
                })}
                {!info && <p className="col-span-2 text-stone-500">Cargando…</p>}
              </div>
            </div>

            <ul className="space-y-2 text-stone-700">
              <li className="flex gap-2"><Headphones className="w-5 h-5 shrink-0 text-green-700" aria-hidden="true" /> <span>Escucharás palabras dichas por una <strong>voz de computadora</strong>. Mejor con audífonos.</span></li>
              <li className="flex gap-2"><ShieldCheck className="w-5 h-5 shrink-0 text-green-700" aria-hidden="true" /> <span>No pedimos nombre, correo ni tu voz. Solo guardamos tus puntajes con un código.</span></li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 shrink-0 text-green-700" aria-hidden="true" /> <span>Es voluntario. Los resultados se publican en conjunto en un artículo científico.</span></li>
            </ul>

            <div>
              <label htmlFor="evaluacion-variedad" className="block font-bold text-stone-800 mb-1">¿De dónde es tu {language?.nombre?.toLowerCase() ?? 'lengua'}? <span className="font-normal text-stone-500">(opcional)</span></label>
              <input id="evaluacion-variedad" value={variedad} onChange={(e) => setVariedad(e.target.value)} maxLength={80} placeholder="Ej.: Puno, Huancané" className="w-full min-h-12 px-4 rounded-xl border border-stone-300" />
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 font-bold text-stone-800">
                <input type="checkbox" checked={accepts} onChange={(e) => setAccepts(e.target.checked)} className="mt-1 w-5 h-5 accent-green-700" />
                Acepto participar
              </label>
              <label className="flex items-start gap-3 font-bold text-stone-800">
                <input type="checkbox" checked={outsider} onChange={(e) => setOutsider(e.target.checked)} className="mt-1 w-5 h-5 accent-green-700" />
                No participé en crear YachAru
              </label>
            </div>

            <button type="button" onClick={join} disabled={busy || !idioma || !accepts || !outsider} className={primary}>
              {busy ? 'Preparando…' : 'Empezar'}
            </button>
          </section>

          <div className="mt-5 text-center">
            {showCode ? (
              <form
                className={`${card} text-left`}
                onSubmit={(e) => {
                  e.preventDefault();
                  enter(codigo.trim());
                }}
              >
                <label htmlFor="evaluacion-codigo" className="block font-bold text-stone-800 mb-2">Tu código</label>
                <input id="evaluacion-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} autoComplete="off" className="w-full min-h-12 px-4 rounded-xl border border-stone-300 text-lg tracking-widest font-bold mb-3" />
                <button type="submit" disabled={busy || codigo.trim().length < 8} className={primary}>Continuar</button>
              </form>
            ) : (
              <button type="button" onClick={() => setShowCode(true)} className="font-bold text-green-800 underline underline-offset-4">Ya empecé y tengo un código</button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Código repartido a mano que aún no aceptó
  if (needsConsent) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="max-w-xl mx-auto">
          {header}
          <section className={card}>
            <ShieldCheck className="w-8 h-8 text-green-700 mb-3" aria-hidden="true" />
            <ul className="list-disc pl-5 space-y-2 text-stone-700 mb-6">
              <li>Escucharás {info?.palabras ?? 20} palabras en {language?.nombre} dichas por una <strong>voz de computadora</strong>.</li>
              <li>No pedimos nombre, correo ni tu voz. Solo guardamos tus puntajes con tu código.</li>
              <li>Si participaste en crear YachAru, no debes evaluar.</li>
            </ul>
            <button type="button" disabled={busy} onClick={() => enter(codigo, true)} className={primary}>Acepto participar</button>
          </section>
        </div>
      </main>
    );
  }

  // 3. Fin
  if (!current) {
    const pending = items.length - done;
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="max-w-xl mx-auto">
          {header}
          <section className={`${card} text-center`}>
            <CheckCircle2 className="w-14 h-14 text-green-700 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-2xl font-black">{pending === 0 ? '¡Listo! Gracias por tu ayuda' : `Te faltan ${pending} palabras`}</h2>
            {items.length === 0 && <p className="text-stone-600 mt-2">La evaluación todavía no tiene palabras cargadas.</p>}
            {pending > 0 && (
              <button type="button" onClick={() => setPosition(items.findIndex((i) => !i.puntaje))} className={`${primary} mt-5`}>Calificarlas</button>
            )}
            <p className="text-stone-600 mt-4">Tu código es <strong className="tracking-widest">{codigo}</strong>.</p>
            <button type="button" onClick={share} className="ficha mt-5 inline-flex items-center gap-2 min-h-12 px-5 rounded-2xl bg-white border-stone-300 font-bold text-stone-800">
              <Share2 className="w-5 h-5" aria-hidden="true" /> Invita a otro hablante
            </button>
          </section>
        </div>
      </main>
    );
  }

  // 2. Calificar
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-2 text-sm font-bold text-stone-600">
          <button type="button" onClick={() => setPosition(Math.max(0, position - 1))} disabled={position === 0} className="inline-flex items-center gap-1 min-h-11 disabled:opacity-30">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Anterior
          </button>
          <span>{position + 1} de {items.length}</span>
        </div>
        <div className="h-2 rounded-full bg-stone-200 mb-5 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done}>
          <div className="h-full bg-green-600 transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
        </div>

        <section className={card}>
          <div className="flex items-center gap-4 mb-6">
            <button type="button" onClick={() => play(current)} aria-label={`Escuchar ${current.texto}`} className="ficha w-16 h-16 shrink-0 rounded-2xl bg-green-700 border-black/20 text-white flex items-center justify-center">
              <Play className="w-7 h-7" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="text-3xl font-black text-stone-900 break-words" lang={language?.lang}>{current.texto}</p>
              <p className="text-sm text-stone-500">Toca ▶ para escuchar otra vez</p>
            </div>
          </div>

          <h2 className="font-black text-stone-800 mb-2">¿Qué tan bien se entiende?</h2>
          <div className="grid gap-2 mb-4">
            {SCALE.map(([value, label, style]) => (
              <button
                key={value}
                type="button"
                onClick={() => rate(value)}
                aria-pressed={current.puntaje === value}
                className={`ficha min-h-14 px-4 rounded-2xl border-2 text-left font-bold flex items-center gap-3 ${style} ${current.puntaje === value ? 'ring-4 ring-green-700/40' : ''}`}
              >
                <span className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center font-black tabular-nums">{value}</span>
                {label}
              </button>
            ))}
          </div>

          <details>
            <summary className="cursor-pointer font-bold text-stone-700 min-h-11 flex items-center">¿Algún sonido falla? (opcional)</summary>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={2} placeholder="Ej.: la k' suena como k" aria-label="Comentario" className="w-full rounded-xl border border-stone-300 p-3 mt-1" />
            <p className="text-xs text-stone-500 mt-1">Se guarda junto con el puntaje que elijas.</p>
          </details>
        </section>
      </div>
    </main>
  );
};

export default Evaluation;
