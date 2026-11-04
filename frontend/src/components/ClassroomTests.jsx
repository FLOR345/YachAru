// Pruebas de un aula, del lado del docente. Dos tipos:
//  - Prueba de unidad: todas las sesiones de una unidad (la evaluación de siempre del programa).
//  - Sesión breve: algunas sesiones de una unidad o una miscelánea de varias unidades.
// El docente elige, ve quién la dio y su mejor nota, y puede abrirla, cerrarla o borrarla.
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { ClipboardCheck, Plus, Layers, Zap, Check, ChevronDown, Trash2, Lock, Unlock, Loader2, BarChart3 } from 'lucide-react';
import { api } from '../services/api';
import { toast } from '../utils/notify';
import { playTap } from '../utils/sounds';

const TYPES = [
  { id: 'unidad', title: 'Prueba de unidad', text: 'Toda una unidad, como la evaluación del programa.', Icon: Layers, color: 'from-indigo-500 to-blue-700', preguntas: 15 },
  { id: 'breve', title: 'Sesión breve', text: 'Solo las sesiones que elijas: de una unidad o una miscelánea.', Icon: Zap, color: 'from-amber-400 to-orange-600', preguntas: 8 },
];

const Creator = ({ aula, onCreated, onCancel }) => {
  const [tipo, setTipo] = useState('breve');
  const [units, setUnits] = useState(null);
  const [lessons, setLessons] = useState({}); // unidad → lecciones
  const [openUnit, setOpenUnit] = useState(null);
  const [unitPick, setUnitPick] = useState(null);
  const [picked, setPicked] = useState([]); // ids de lecciones (breve)
  const [preguntas, setPreguntas] = useState(8);
  const [titulo, setTitulo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getUnits(aula.idioma)
      .then(async ({ data }) => {
        const list = data.units || [];
        setUnits(list);
        const entries = await Promise.all(list.map((u) => api.getLessonsByUnit(u.id).then((r) => [u.id, r.data.lessons || []]).catch(() => [u.id, []])));
        setLessons(Object.fromEntries(entries));
      })
      .catch(() => setUnits([]));
  }, [aula.idioma]);

  const choose = (t) => {
    playTap();
    setTipo(t.id);
    setPreguntas(t.preguntas);
  };
  const toggleLesson = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleWholeUnit = (u) => {
    const ids = (lessons[u.id] || []).map((l) => l.id);
    const all = ids.every((id) => picked.includes(id));
    setPicked((p) => (all ? p.filter((x) => !ids.includes(x)) : [...new Set([...p, ...ids])]));
  };
  const ids = tipo === 'unidad' ? (lessons[unitPick] || []).map((l) => l.id) : picked;
  const unitsInMix = new Set(Object.entries(lessons).filter(([, ls]) => ls.some((l) => picked.includes(l.id))).map(([u]) => u)).size;

  const create = async () => {
    if (!ids.length) return;
    setSaving(true);
    try {
      const auto = tipo === 'unidad' ? `Prueba: ${units.find((u) => u.id === unitPick)?.nombre ?? 'unidad'}` : unitsInMix > 1 ? 'Sesión breve: miscelánea' : 'Sesión breve';
      const { data } = await api.createClassroomTest(aula.id, { tipo, leccion_ids: ids, preguntas, titulo: titulo.trim() || auto });
      toast.success('Prueba creada', { description: 'Tus estudiantes ya la ven en «Mi aula».' });
      onCreated(data.prueba);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No pudimos crear la prueba');
    } finally {
      setSaving(false);
    }
  };

  return (
    <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 rounded-3xl bg-white/80 p-4 sm:p-5 ring-1 ring-stone-200">
      {/* 1. Tipo */}
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de prueba">
        {TYPES.map((t) => {
          const active = tipo === t.id;
          return (
            <button key={t.id} type="button" role="radio" aria-checked={active} onClick={() => choose(t)} className={`relative overflow-hidden rounded-2xl p-4 text-left transition ${active ? `bg-gradient-to-br ${t.color} text-white shadow-lg` : 'bg-white ring-1 ring-stone-200 hover:ring-stone-400'}`}>
              {active && <span className="brillo-liquido" aria-hidden="true" />}
              <span className="relative flex items-center gap-2 text-lg font-black">
                <t.Icon className="h-5 w-5" aria-hidden="true" /> {t.title}
                {active && <Check className="ml-auto h-5 w-5" aria-hidden="true" />}
              </span>
              <span className={`relative mt-1 block text-sm ${active ? 'text-white/90' : 'text-stone-600'}`}>{t.text}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Qué entra */}
      {!units ? (
        <p className="flex items-center gap-2 text-stone-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Cargando unidades…
        </p>
      ) : tipo === 'unidad' ? (
        <div>
          <p className="mb-2 font-bold">Elige la unidad</p>
          <div className="flex flex-wrap gap-2">
            {units.map((u, i) => (
              <button key={u.id} type="button" aria-pressed={unitPick === u.id} onClick={() => setUnitPick(u.id)} className={`min-h-11 rounded-full px-4 text-sm font-bold ${unitPick === u.id ? 'bg-indigo-600 text-white shadow' : 'bg-white ring-1 ring-stone-200 hover:ring-stone-400'}`}>
                {i + 1}. {u.nombre} <span className="opacity-70">· {(lessons[u.id] || []).length} sesiones</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-2 font-bold">
            Elige las sesiones <span className="font-normal text-stone-600">(de una o de varias unidades)</span>
          </p>
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {units.map((u, i) => {
              const ls = lessons[u.id] || [];
              const count = ls.filter((l) => picked.includes(l.id)).length;
              const open = openUnit === u.id;
              return (
                <li key={u.id} className="rounded-2xl bg-white ring-1 ring-stone-200">
                  <button type="button" onClick={() => setOpenUnit(open ? null : u.id)} aria-expanded={open} className="flex w-full min-h-12 items-center gap-3 px-4 text-left font-bold">
                    <span className="flex-1">
                      {i + 1}. {u.nombre}
                    </span>
                    {count > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900">{count} elegidas</span>}
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <m.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="space-y-1 px-4 pb-3">
                          <button type="button" onClick={() => toggleWholeUnit(u)} className="mb-1 text-sm font-bold text-indigo-700 underline underline-offset-4">
                            {ls.length && ls.every((l) => picked.includes(l.id)) ? 'Quitar toda la unidad' : 'Elegir toda la unidad'}
                          </button>
                          {ls.map((l) => (
                            <label key={l.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-stone-50">
                              <input type="checkbox" checked={picked.includes(l.id)} onChange={() => toggleLesson(l.id)} className="h-5 w-5 accent-amber-500" />
                              <span className="font-semibold">{l.titulo}</span>
                            </label>
                          ))}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
          {picked.length > 0 && (
            <p className="mt-2 text-sm font-bold text-amber-800">
              {picked.length} {picked.length === 1 ? 'sesión' : 'sesiones'}
              {unitsInMix > 1 ? ` de ${unitsInMix} unidades: miscelánea` : ''}
            </p>
          )}
        </div>
      )}

      {/* 3. Tamaño y nombre */}
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <label className="block">
          <span className="mb-1 block font-bold">Nombre (opcional)</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={100} placeholder="Por ejemplo: Repaso del viernes" className="min-h-12 w-full rounded-2xl border-2 border-stone-200 bg-white px-4 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700" />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">
            Preguntas: <span className="tabular-nums">{preguntas}</span>
          </span>
          <input type="range" min={3} max={30} value={preguntas} onChange={(e) => setPreguntas(Number(e.target.value))} className="h-12 w-full accent-green-600" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={create} disabled={!ids.length || saving} className="inline-flex min-h-12 items-center gap-2 rounded-2xl boton-degradado px-6 font-black shadow disabled:opacity-50">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Check className="h-5 w-5" aria-hidden="true" />} Crear prueba
        </button>
        <button type="button" onClick={onCancel} className="min-h-12 px-4 font-bold text-stone-600">
          Cancelar
        </button>
      </div>
    </m.div>
  );
};

const TestRow = ({ aula, test, onChange, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState(null);
  const type = TYPES.find((t) => t.id === test.tipo) ?? TYPES[1];
  useEffect(() => {
    if (!open || results) return;
    api
      .getClassroomTestResults(aula.id, test.id)
      .then(({ data }) => setResults(data.estudiantes))
      .catch(() => setResults([]));
  }, [open, results, aula.id, test.id]);
  const toggleOpen = async () => {
    try {
      const { data } = await api.updateClassroomTest(aula.id, test.id, { abierta: !test.abierta });
      onChange(data.prueba);
    } catch {
      toast.error('No pudimos cambiar la prueba');
    }
  };
  const remove = async () => {
    if (!window.confirm(`¿Borrar «${test.titulo}» y sus resultados?`)) return;
    try {
      await api.deleteClassroomTest(aula.id, test.id);
      onDelete(test.id);
    } catch {
      toast.error('No pudimos borrarla');
    }
  };
  return (
    <li className="rounded-2xl bg-white/90 p-3 sm:p-4 ring-1 ring-stone-200">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${type.color} text-white`} aria-hidden="true">
          <type.Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black">{test.titulo}</p>
          <p className="text-xs text-stone-600">
            {type.title} · {test.leccion_ids.length} {test.leccion_ids.length === 1 ? 'sesión' : 'sesiones'} · {test.preguntas} preguntas · {test.estudiantes ?? 0} la dieron
            {test.promedio != null && ` · promedio ${test.promedio}%`}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-black ${test.abierta ? 'bg-green-100 text-green-800' : 'bg-stone-200 text-stone-600'}`}>{test.abierta ? 'Abierta' : 'Cerrada'}</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} title="Resultados" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-stone-100">
            <BarChart3 className="h-5 w-5" aria-label="Ver resultados" />
          </button>
          <button type="button" onClick={toggleOpen} title={test.abierta ? 'Cerrar' : 'Abrir'} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-stone-100">
            {test.abierta ? <Lock className="h-5 w-5" aria-label="Cerrar prueba" /> : <Unlock className="h-5 w-5" aria-label="Abrir prueba" />}
          </button>
          <button type="button" onClick={remove} title="Borrar" className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50">
            <Trash2 className="h-5 w-5" aria-label="Borrar prueba" />
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {!results ? (
              <p className="mt-3 text-sm text-stone-600">Cargando…</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {results.map((r) => (
                  <li key={r.alias} className="flex items-center gap-3 text-sm">
                    <span className="w-28 truncate font-bold">{r.alias}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                      <span className={`block h-full rounded-full ${r.mejor == null ? '' : r.mejor >= 70 ? 'bg-green-500' : r.mejor >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${r.mejor ?? 0}%` }} />
                    </span>
                    <span className="w-24 text-right tabular-nums text-stone-600">{r.mejor == null ? 'Pendiente' : `${r.mejor}% · ${r.intentos}×`}</span>
                  </li>
                ))}
              </ul>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </li>
  );
};

const ClassroomTests = ({ aula }) => {
  const [tests, setTests] = useState(null);
  const [creating, setCreating] = useState(false);
  const load = useCallback(() => {
    api
      .getClassroomTests(aula.id)
      .then(({ data }) => setTests(data.pruebas || []))
      .catch(() => setTests([]));
  }, [aula.id]);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <section className="space-y-3" aria-label="Pruebas del aula">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-lg font-black">
          <ClipboardCheck className="h-5 w-5" aria-hidden="true" /> Pruebas
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-600 px-4 font-black text-white shadow">
            <Plus className="h-5 w-5" aria-hidden="true" /> Nueva prueba
          </button>
        )}
      </div>
      {creating && (
        <Creator
          aula={aula}
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      {tests === null ? null : tests.length === 0 ? (
        !creating && <p className="text-sm text-stone-600">Aún no hay pruebas. Crea una de unidad o una sesión breve: tus estudiantes podrán estudiar primero lo que puede salir.</p>
      ) : (
        <ul className="space-y-2">
          {tests.map((t) => (
            <TestRow key={t.id} aula={aula} test={t} onChange={(p) => setTests((list) => list.map((x) => (x.id === p.id ? { ...x, ...p } : x)))} onDelete={(id) => setTests((list) => list.filter((x) => x.id !== id))} />
          ))}
        </ul>
      )}
    </section>
  );
};

export default ClassroomTests;
