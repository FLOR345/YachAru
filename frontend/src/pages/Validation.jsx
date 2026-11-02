// Panel de validación para administradores: revisión del léxico por hablantes y evaluación perceptual del audio.
// Todo se guarda en línea. Las cifras que se muestran son las que luego se reportan en el artículo.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, RefreshCw } from 'lucide-react';
import { toast } from '../utils/notify';
import { api } from '../services/api';
import { LANGUAGES, getLanguage } from '../languages';

const STATES = [
  ['correcto', 'Correcto'],
  ['variante', 'Variante'],
  ['error', 'Error'],
];
const input = 'min-h-11 px-3 rounded-xl border border-stone-300 bg-white';
const button = 'ficha min-h-11 px-4 rounded-xl border-stone-300 bg-white font-bold text-stone-800 inline-flex items-center gap-2 disabled:opacity-50';
const panel = 'bg-white rounded-3xl border border-stone-200 shadow-sm p-5 sm:p-6';

const messageOf = (error, fallback) => error.response?.data?.message ?? fallback;

const WordRow = ({ word, onSaved }) => {
  const [fix, setFix] = useState(word.correccion ?? '');
  const [note, setNote] = useState(word.nota ?? '');

  const save = async (estado) => {
    try {
      await api.reviewWord(word.id, { estado, ...(fix.trim() ? { correccion: fix.trim() } : {}), ...(note.trim() ? { nota: note.trim() } : {}) });
      onSaved();
    } catch (error) {
      toast.error(messageOf(error, 'No se guardó la revisión'));
    }
  };

  return (
    <li className="py-4 border-b border-stone-100 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <p className="text-lg font-black text-stone-900">{word.palabra_objetivo}</p>
        <p className="text-stone-600">{word.palabra_espanol}</p>
        <p className="text-sm text-stone-500">{word.leccion}</p>
        {word.estado && <span className="text-sm font-bold text-green-800">Revisada: {word.estado}</span>}
      </div>
      {word.valor_original && word.valor_original !== word.palabra_objetivo && <p className="text-sm text-stone-500">Antes: {word.valor_original}</p>}
      {word.ejemplo_uso && <p className="text-sm italic text-stone-600">{word.ejemplo_uso}</p>}
      <div className="mt-2 grid sm:grid-cols-2 gap-2">
        <input aria-label={`Forma correcta de ${word.palabra_objetivo}`} placeholder="Forma correcta (si hay error)" value={fix} onChange={(e) => setFix(e.target.value)} className={input} />
        <input aria-label={`Nota sobre ${word.palabra_objetivo}`} placeholder="Nota (variedad, uso…)" value={note} onChange={(e) => setNote(e.target.value)} className={input} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {STATES.map(([value, label]) => (
          <button key={value} type="button" onClick={() => save(value)} className={button} aria-pressed={word.estado === value}>
            {word.estado === value && <Check className="w-4 h-4" aria-hidden="true" />} {label}
          </button>
        ))}
      </div>
    </li>
  );
};

const LexiconReview = ({ idioma, onChange }) => {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [onlyPending, setOnlyPending] = useState(true);
  const [missing, setMissing] = useState({ palabra_objetivo: '', palabra_espanol: '', nota: '' });

  const load = useCallback(async () => {
    try {
      const { data: result } = await api.getLexicon({ idioma, page, ...(onlyPending ? { pendientes: true } : {}), ...(search.trim() ? { q: search.trim() } : {}) });
      setData(result);
    } catch (error) {
      toast.error(messageOf(error, 'No pudimos cargar el léxico'));
    }
  }, [idioma, page, onlyPending, search]);

  useEffect(() => {
    load();
  }, [load]);

  const addMissing = async (e) => {
    e.preventDefault();
    try {
      await api.addMissingWord({ idioma, palabra_objetivo: missing.palabra_objetivo, palabra_espanol: missing.palabra_espanol, ...(missing.nota.trim() ? { nota: missing.nota } : {}) });
      setMissing({ palabra_objetivo: '', palabra_espanol: '', nota: '' });
      toast.success('Palabra faltante anotada');
    } catch (error) {
      toast.error(messageOf(error, 'No se guardó'));
    }
  };

  return (
    <section className={panel}>
      <h2 className="text-xl font-black mb-3">Revisión del léxico</h2>
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <input aria-label="Buscar palabra" placeholder="Buscar" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className={input} />
        <label className="inline-flex items-center gap-2 font-bold text-stone-700">
          <input type="checkbox" checked={onlyPending} onChange={(e) => { setPage(1); setOnlyPending(e.target.checked); }} /> Solo pendientes
        </label>
        <span className="text-stone-600">{data?.total ?? '…'} palabras</span>
      </div>
      <ul>
        {data?.palabras.map((word) => (
          <WordRow key={`${word.id}-${word.estado}`} word={word} onSaved={() => { load(); onChange(); }} />
        ))}
      </ul>
      <div className="flex gap-2 mt-3">
        <button type="button" className={button} disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
        <button type="button" className={button} disabled={!data || page * 30 >= data.total} onClick={() => setPage(page + 1)}>Siguiente</button>
      </div>

      <form onSubmit={addMissing} className="mt-6 pt-5 border-t border-stone-200 grid sm:grid-cols-3 gap-2">
        <h3 className="sm:col-span-3 font-black">Anotar una palabra que falta</h3>
        <input required aria-label="Palabra en la lengua" placeholder="Palabra en la lengua" value={missing.palabra_objetivo} onChange={(e) => setMissing({ ...missing, palabra_objetivo: e.target.value })} className={input} />
        <input required aria-label="Significado" placeholder="Significado" value={missing.palabra_espanol} onChange={(e) => setMissing({ ...missing, palabra_espanol: e.target.value })} className={input} />
        <input aria-label="Nota" placeholder="Nota" value={missing.nota} onChange={(e) => setMissing({ ...missing, nota: e.target.value })} className={input} />
        <button type="submit" className={`${button} sm:col-span-3 justify-center`}>Anotar</button>
      </form>
    </section>
  );
};

const PerceptualPanel = ({ idioma }) => {
  const [data, setData] = useState(null);
  const [results, setResults] = useState(null);

  const load = useCallback(async () => {
    try {
      const [evaluators, summary] = await Promise.all([api.getEvaluators(idioma), api.getEvaluationResults(idioma)]);
      setData(evaluators.data);
      setResults(summary.data);
    } catch (error) {
      toast.error(messageOf(error, 'No pudimos cargar la evaluación'));
    }
  }, [idioma]);

  useEffect(() => {
    load();
  }, [load]);

  const run = (action) => async () => {
    try {
      await action();
      await load();
    } catch (error) {
      toast.error(messageOf(error, 'No se pudo completar'));
    }
  };

  const copyLink = async (codigo) => {
    const link = `${window.location.origin}/evaluacion?codigo=${codigo}`;
    await navigator.clipboard.writeText(link).then(() => toast.success('Enlace copiado'), () => toast(link));
  };

  return (
    <section className={panel}>
      <h2 className="text-xl font-black mb-3">Evaluación perceptual del audio</h2>
      <p className="text-stone-600 mb-4">Muestra de {data?.muestra ?? 0} palabras. Se necesitan al menos 8 evaluadores externos al proyecto.</p>
      <div className="flex flex-wrap gap-2 mb-5">
        <button type="button" className={button} onClick={run(() => api.createEvaluationSample({ idioma, tamano: 50 }))}>Preparar muestra de 50</button>
        <button type="button" className={button} onClick={run(() => api.createEvaluators({ idioma, cantidad: 10 }))}>Crear 10 códigos</button>
        <button type="button" className={button} onClick={load}><RefreshCw className="w-4 h-4" aria-hidden="true" /> Actualizar</button>
        <button type="button" className={button} onClick={() => api.download(`/api/validation/resultados?idioma=${idioma}&format=csv`, `simiaru-evaluacion-${idioma}.csv`).catch(() => toast.error('No pudimos descargar'))}>
          <Download className="w-4 h-4" aria-hidden="true" /> Datos CSV
        </button>
      </div>

      {results && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            ['Evaluadores', results.evaluadores],
            ['Juicios', results.juicios],
            ['Media (1 a 5)', results.media ?? '—'],
            ['α de Krippendorff', results.alfa_krippendorff_ordinal ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-stone-50 p-3">
              <dt className="text-sm text-stone-600">{label}</dt>
              <dd className="text-2xl font-black tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {results?.aviso && <p className="mb-4 font-bold text-orange-800">{results.aviso}</p>}
      {results && Object.keys(results.por_fenomeno).length > 0 && (
        <table className="w-full text-left mb-5">
          <caption className="text-left font-black mb-1">Por fenómeno fonológico</caption>
          <thead>
            <tr className="text-sm text-stone-600"><th className="py-1">Fenómeno</th><th>Juicios</th><th>Media</th></tr>
          </thead>
          <tbody>
            {Object.entries(results.por_fenomeno).map(([name, row]) => (
              <tr key={name} className="border-t border-stone-100"><td className="py-1 capitalize">{name}</td><td className="tabular-nums">{row.juicios}</td><td className="tabular-nums">{row.media}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <ul className="divide-y divide-stone-100">
        {data?.evaluadores.map((e) => (
          <li key={e.codigo} className="py-2 flex flex-wrap items-center gap-3">
            <code className="font-bold tracking-wider">{e.codigo}</code>
            <span className="text-stone-600">{e.consentimiento_en ? `${e.respondidas} respondidas` : 'Sin empezar'}</span>
            <button type="button" className={`${button} ml-auto`} onClick={() => copyLink(e.codigo)}><Copy className="w-4 h-4" aria-hidden="true" /> Enlace</button>
          </li>
        ))}
      </ul>
    </section>
  );
};

const Validation = () => {
  const [idioma, setIdioma] = useState(LANGUAGES[0]?.id);
  const [coverage, setCoverage] = useState(null);

  const loadCoverage = useCallback(() => {
    api.getCoverage().then(({ data }) => setCoverage(data.idiomas[idioma])).catch(() => setCoverage(null));
  }, [idioma]);

  useEffect(() => {
    loadCoverage();
  }, [loadCoverage]);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-5">
        <Link to="/dashboard" className="inline-flex items-center gap-2 font-bold text-stone-700"><ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver</Link>
        <h1 className="text-3xl font-black text-stone-900">Validación</h1>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button key={l.id} type="button" aria-pressed={idioma === l.id} onClick={() => setIdioma(l.id)} className={`${button} ${idioma === l.id ? 'ring-2 ring-green-700' : ''}`}>{l.nombre}</button>
          ))}
        </div>
        {coverage && (
          <section className={panel} aria-label={`Cobertura de ${getLanguage(idioma)?.nombre}`}>
            <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                ['Entradas únicas', coverage.entradas_unicas],
                ['Cobertura de audio', `${coverage.cobertura_audio_pct} %`],
                ['Con voz MMS', coverage.audio.mms],
                ['Con voz grabada', coverage.audio.grabado],
                ['Revisadas', coverage.revision.revisadas],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-stone-600">{label}</dt>
                  <dd className="text-2xl font-black tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <PerceptualPanel key={`e-${idioma}`} idioma={idioma} />
        <LexiconReview key={`l-${idioma}`} idioma={idioma} onChange={loadCoverage} />
      </div>
    </main>
  );
};

export default Validation;
