// Evaluación perceptual del audio: hablantes externos al proyecto califican su inteligibilidad del 1 al 5.
// Se entra con un código, sin cuenta ni datos personales. Cada persona recibe su propio orden.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from '../utils/notify';
import { api } from '../services/api';
import { getLanguage } from '../languages';

const SCALE = [
  [1, 'No se entiende'],
  [2, 'Casi no se entiende'],
  [3, 'Se entiende con esfuerzo'],
  [4, 'Se entiende bien'],
  [5, 'Se entiende perfectamente'],
];

const card = 'bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8';
const primary = 'ficha min-h-12 px-6 rounded-2xl bg-green-700 border-black/20 text-white font-black disabled:opacity-50';

const Evaluation = () => {
  const [params] = useSearchParams();
  const [codigo, setCodigo] = useState(params.get('codigo') ?? '');
  const [askConsent, setAskConsent] = useState(false);
  const [idioma, setIdioma] = useState(null);
  const [items, setItems] = useState(null);
  const [position, setPosition] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const audio = useRef(null);

  const enter = async (consiente) => {
    setBusy(true);
    try {
      const { data } = await api.enterEvaluation({ codigo, ...(consiente ? { consiente } : {}) });
      setIdioma(data.idioma);
      setAskConsent(Boolean(data.necesitaConsentimiento));
      if (data.items) {
        setItems(data.items);
        setPosition(Math.max(0, data.items.findIndex((i) => !i.puntaje)));
      }
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'No pudimos entrar');
    } finally {
      setBusy(false);
    }
  };

  const current = items?.[position];
  const pending = items?.filter((i) => !i.puntaje).length ?? 0;

  useEffect(() => {
    audio.current?.pause();
    setComment('');
  }, [position]);

  const play = () => {
    audio.current = new Audio(current.url);
    audio.current.play().catch(() => toast.error('No se pudo reproducir el audio'));
  };

  const rate = async (puntaje) => {
    setBusy(true);
    try {
      await api.answerEvaluation({ codigo, audioId: current.id, puntaje, ...(comment.trim() ? { comentario: comment.trim() } : {}) });
      setItems(items.map((i) => (i.id === current.id ? { ...i, puntaje } : i)));
      setPosition(position + 1);
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'No se guardó tu respuesta');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-black text-stone-900 mb-2">Evaluación de la voz</h1>
        <p className="text-stone-600 mb-6">Escucha cada palabra y dinos qué tan bien se entiende.</p>

        {!askConsent && !items && (
          <form
            className={card}
            onSubmit={(e) => {
              e.preventDefault();
              enter(false);
            }}
          >
            <label htmlFor="evaluacion-codigo" className="block font-bold text-stone-800 mb-2">Tu código de evaluación</label>
            <input
              id="evaluacion-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              autoComplete="off"
              className="w-full min-h-12 px-4 rounded-xl border border-stone-300 text-lg tracking-widest font-bold mb-4"
            />
            <button type="submit" disabled={busy || codigo.trim().length < 8} className={primary}>Entrar</button>
          </form>
        )}

        {askConsent && (
          <section className={card}>
            <ShieldCheck className="w-8 h-8 text-green-700 mb-3" aria-hidden="true" />
            <h2 className="text-xl font-black mb-3">Antes de empezar</h2>
            <ul className="list-disc pl-5 space-y-2 text-stone-700 mb-6">
              <li>Vas a escuchar unas 50 palabras en {getLanguage(idioma)?.nombre} dichas por una <strong>voz sintética</strong>, no por una persona.</li>
              <li>Toma unos 15 minutos. Puedes dejarlo cuando quieras y volver con tu mismo código.</li>
              <li>Solo guardamos tu código, tus puntajes y tus comentarios. No pedimos nombre, correo ni tu voz.</li>
              <li>Los resultados se publican de forma agregada en un artículo científico.</li>
              <li>Si participaste en construir SimiAru, no debes evaluar: avísale a quien te dio el código.</li>
            </ul>
            <button type="button" disabled={busy} onClick={() => enter(true)} className={primary}>Acepto participar</button>
          </section>
        )}

        {items && current && (
          <section className={card}>
            <p className="text-sm font-bold text-stone-500 mb-4">Palabra {position + 1} de {items.length}</p>
            <div className="flex items-center gap-4 mb-6">
              <button type="button" onClick={play} aria-label={`Escuchar ${current.texto}`} className="ficha w-14 h-14 shrink-0 rounded-2xl bg-green-700 border-black/20 text-white flex items-center justify-center">
                <Play className="w-6 h-6" aria-hidden="true" />
              </button>
              <p className="text-3xl font-black text-stone-900 break-words" lang={getLanguage(idioma)?.lang}>{current.texto}</p>
            </div>
            <div className="grid gap-2 mb-5">
              {SCALE.map(([value, label]) => (
                <button key={value} type="button" disabled={busy} onClick={() => rate(value)} className="ficha min-h-12 px-4 rounded-xl border-stone-300 bg-white text-left font-bold text-stone-800 disabled:opacity-50">
                  {value} · {label}
                </button>
              ))}
            </div>
            <label htmlFor="evaluacion-comentario" className="block text-sm font-bold text-stone-700 mb-1">Comentario (opcional): ¿qué sonido falla?</label>
            <textarea id="evaluacion-comentario" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={2} className="w-full rounded-xl border border-stone-300 p-3" />
          </section>
        )}

        {items && !current && (
          <section className={`${card} text-center`}>
            <CheckCircle2 className="w-12 h-12 text-green-700 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-xl font-black">{pending === 0 ? '¡Terminaste! Gracias por tu ayuda.' : `Te quedan ${pending} palabras sin calificar.`}</h2>
            {items.length === 0 && <p className="text-stone-600 mt-2">La evaluación todavía no tiene palabras cargadas.</p>}
          </section>
        )}
      </div>
    </main>
  );
};

export default Evaluation;
