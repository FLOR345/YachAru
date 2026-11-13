// Modo aula para docentes: crear aulas, compartir el código (o proyectarlo en clase),
// seguir el avance de cada estudiante por alias y exportar los datos.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { ArrowLeft, Plus, Users, Copy, Download, RefreshCw, School, ShieldCheck, Share2, Maximize2, X, Search, Trophy, Flame, BookOpen, Clock, Sparkles, ChevronDown, Check, UserPlus, BarChart3 } from 'lucide-react';
import { toast } from '../utils/notify';
import { api } from '../services/api';
import { LANGUAGES, getLanguage, languageStyle } from '../languages';
import { LlamaImage } from '../components/Mascot';
import Decor from '../components/Decor';
import { playTap } from '../utils/sounds';
import ClassroomTests from '../components/ClassroomTests';

const DAY = 86400000;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : '—');
const daysSince = (value) => (value ? Math.floor((Date.now() - new Date(value).getTime()) / DAY) : Infinity);
const joinUrl = (codigo) => `${window.location.origin}/aula${codigo ? `?codigo=${codigo}` : ''}`;

const STEPS = [
  { Icon: Plus, title: 'Crea un aula', text: 'Ponle un nombre y elige la lengua.' },
  { Icon: Share2, title: 'Comparte el código', text: 'Proyéctalo en clase o envíalo por mensaje.' },
  { Icon: BarChart3, title: 'Sigue el avance', text: 'Mira quién avanza y a quién apoyar.' },
];

// Código en grande, para proyectar en la pizarra
const Projector = ({ aula, onClose }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const theme = languageStyle(aula.idioma);
  return createPortal(
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`fixed inset-0 z-[70] flex flex-col items-center justify-center bg-gradient-to-br ${theme.gradient} p-6 text-center text-white`} role="dialog" aria-modal="true" aria-label={`Código del aula ${aula.codigo}`}>
      <span className="brillo-liquido" aria-hidden="true" />
      <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur hover:bg-white/30">
        <X className="h-7 w-7" aria-hidden="true" />
      </button>
      <p className="relative text-xl sm:text-3xl font-bold text-white/90">{aula.nombre}</p>
      <p className="relative mt-6 text-lg sm:text-2xl font-semibold">Entra en</p>
      <p className="relative mt-1 text-2xl sm:text-5xl font-black break-all">{joinUrl().replace(/^https?:\/\//, '')}</p>
      <p className="relative mt-8 text-lg sm:text-2xl font-semibold">y escribe el código</p>
      <div className="relative mt-3 flex flex-wrap justify-center gap-2 sm:gap-4">
        {aula.codigo.split('').map((ch, i) => (
          <m.span
            key={i}
            initial={{ y: 40, opacity: 0, rotate: -8 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.2 + i * 0.08, type: 'spring', bounce: 0.5 }}
            className="flex h-20 w-14 sm:h-36 sm:w-28 items-center justify-center rounded-2xl sm:rounded-3xl bg-white/90 text-5xl sm:text-8xl font-black text-stone-900 shadow-2xl"
          >
            {ch}
          </m.span>
        ))}
      </div>
      <p className="relative mt-8 max-w-xl text-white/90">Con un alias, sin correo ni datos personales.</p>
      <span className="relative mt-6 w-28 sm:w-40 aspect-square">
        <LlamaImage pose="bienvenida" sticker eager />
      </span>
    </m.div>,
    document.body
  );
};

const Stat = ({ Icon, label, value, color }) => (
  <li className="vidrio rounded-2xl p-3 sm:p-4">
    <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow`} aria-hidden="true">
      <Icon className="h-5 w-5" />
    </span>
    <p className="text-2xl sm:text-3xl font-black tabular-nums leading-none">{value}</p>
    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-stone-600">{label}</p>
  </li>
);

const SORTS = [
  ['lecciones', 'Lecciones'],
  ['puntos', 'Puntos'],
  ['racha', 'Racha'],
  ['reciente', 'Última vez'],
];

const ClassroomCard = ({ aula, startOpen }) => {
  const [open, setOpen] = useState(startOpen);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('lecciones');
  const [copied, setCopied] = useState(false);
  const language = getLanguage(aula.idioma);
  const theme = languageStyle(aula.idioma);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.getClassroomProgress(aula.id);
      setDetail(data);
    } catch {
      toast.error('No pudimos cargar el avance del aula');
    } finally {
      setLoading(false);
    }
  }, [aula.id]);

  useEffect(() => {
    if (open && !detail) load();
  }, [open, detail, load]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(aula.codigo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success(`Código ${aula.codigo} copiado`);
    } catch {
      toast(`El código es ${aula.codigo}`);
    }
  };
  const share = async () => {
    const text = `Únete a mi aula "${aula.nombre}" en YachAru: abre ${joinUrl(aula.codigo)} y escribe tu alias (el código del aula es ${aula.codigo}).`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'YachAru · Modo aula', text });
      } catch {
        // la persona cerró el menú de compartir
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    }
  };
  const download = (format) =>
    api.download(`/api/classroom/${aula.id}/export?format=${format}`, `yacharu-aula-${aula.codigo}.${format}`).catch(() => toast.error('No pudimos descargar los datos'));

  const students = detail?.estudiantes ?? [];
  const summary = useMemo(() => {
    const n = students.length;
    const lessons = students.reduce((a, s) => a + (s.lecciones_completadas || 0), 0);
    return {
      n,
      avg: n ? (lessons / n).toFixed(1) : '0',
      active: students.filter((s) => daysSince(s.ultima_actividad) <= 7).length,
      streak: Math.max(0, ...students.map((s) => s.racha_actual || 0)),
    };
  }, [students]);
  const podium = useMemo(() => [...students].sort((a, b) => (b.puntos_totales || 0) - (a.puntos_totales || 0)).filter((s) => s.puntos_totales > 0).slice(0, 3), [students]);
  const maxLessons = Math.max(1, ...students.map((s) => s.lecciones_completadas || 0));
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const key = {
      lecciones: (s) => s.lecciones_completadas || 0,
      puntos: (s) => Number(s.puntos_totales || 0),
      racha: (s) => s.racha_actual || 0,
      reciente: (s) => (s.ultima_actividad ? new Date(s.ultima_actividad).getTime() : 0),
    }[sort];
    return students.filter((s) => !q || String(s.alias).toLowerCase().includes(q)).sort((a, b) => key(b) - key(a));
  }, [students, query, sort]);

  return (
    <m.li layout className="vidrio overflow-hidden rounded-[2rem]">
      {/* Cabecera del aula */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${theme.gradient} p-5 sm:p-6 text-white`}>
        <span className="brillo-liquido" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/25 ring-1 ring-white/50 backdrop-blur" aria-hidden="true">
            <School className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl sm:text-2xl font-black">{aula.nombre}</h3>
            <p className="text-sm text-white/85">
              {language.nombre} · {aula.estudiantes} {aula.estudiantes === 1 ? 'estudiante' : 'estudiantes'}
            </p>
          </div>
          <button type="button" onClick={copy} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white/90 px-4 text-lg font-black tracking-[0.25em] text-stone-900 shadow-md hover:bg-white" aria-label={`Copiar código del aula ${aula.codigo}`}>
            {aula.codigo}
            {copied ? <Check className="h-5 w-5 text-green-600" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setProjecting(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/20 px-4 font-bold ring-1 ring-white/40 backdrop-blur hover:bg-white/30">
            <Maximize2 className="h-4 w-4" aria-hidden="true" /> Proyectar en clase
          </button>
          <button type="button" onClick={share} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/20 px-4 font-bold ring-1 ring-white/40 backdrop-blur hover:bg-white/30">
            <Share2 className="h-4 w-4" aria-hidden="true" /> Compartir
          </button>
          <button
            type="button"
            onClick={() => {
              playTap();
              setOpen((o) => !o);
            }}
            aria-expanded={open}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-black text-stone-900 shadow hover:bg-stone-50"
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" /> {open ? 'Ocultar' : 'Avance y pruebas'}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="space-y-5 p-4 sm:p-6">
              <ClassroomTests aula={aula} />
              {loading && !detail && (
                <p className="flex items-center gap-2 text-stone-600" role="status">
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Cargando el avance…
                </p>
              )}
              {detail && students.length === 0 && (
                <div className="flex flex-col items-center gap-3 rounded-3xl bg-white/70 p-6 text-center sm:flex-row sm:text-left">
                  <span className="w-24 shrink-0 aspect-square">
                    <LlamaImage pose="esperando" sticker />
                  </span>
                  <div>
                    <p className="text-lg font-black">Todavía no hay estudiantes</p>
                    <p className="text-stone-700">
                      Proyecta el código <strong>{aula.codigo}</strong> en clase: cada estudiante entra en <strong>/aula</strong> con un alias.
                    </p>
                    <button type="button" onClick={() => setProjecting(true)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl boton-degradado px-4 font-bold">
                      <Maximize2 className="h-4 w-4" aria-hidden="true" /> Proyectar el código
                    </button>
                  </div>
                </div>
              )}
              {students.length > 0 && (
                <>
                  <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Stat Icon={Users} label="Estudiantes" value={summary.n} color="from-sky-500 to-blue-700" />
                    <Stat Icon={BookOpen} label="Lecciones por estudiante" value={summary.avg} color="from-emerald-500 to-green-700" />
                    <Stat Icon={Clock} label="Activos esta semana" value={summary.active} color="from-violet-500 to-purple-700" />
                    <Stat Icon={Flame} label="Mejor racha" value={summary.streak} color="from-orange-400 to-red-600" />
                  </ul>

                  {podium.length > 0 && (
                    <div className="rounded-3xl bg-gradient-to-b from-amber-50 to-white p-4 sm:p-5 ring-1 ring-amber-200">
                      <p className="mb-4 flex items-center gap-2 font-black text-amber-900">
                        <Trophy className="h-5 w-5" aria-hidden="true" /> Podio de Ayni Points
                      </p>
                      <ol className="flex items-end justify-center gap-2 sm:gap-4">
                        {[1, 0, 2].map((rank) => {
                          const s = podium[rank];
                          if (!s) return <li key={rank} className="w-24 sm:w-32" />;
                          const height = ['h-28', 'h-20', 'h-14'][rank];
                          const color = ['from-amber-300 to-amber-500', 'from-stone-200 to-stone-400', 'from-orange-300 to-orange-500'][rank];
                          return (
                            <m.li key={rank} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 * (2 - rank), type: 'spring', bounce: 0.4 }} className="flex w-24 sm:w-32 flex-col items-center">
                              <span className="mb-1 max-w-full truncate text-sm sm:text-base font-black">{s.alias}</span>
                              <span className="mb-2 text-xs font-bold text-stone-600 tabular-nums">{Number(s.puntos_totales).toLocaleString('es-PE')} pts</span>
                              <span className={`flex w-full ${height} items-start justify-center rounded-t-2xl bg-gradient-to-b ${color} pt-2 text-2xl font-black text-white shadow-inner`}>{rank + 1}</span>
                            </m.li>
                          );
                        })}
                      </ol>
                    </div>
                  )}

                  {/* Buscar y ordenar */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label className="relative flex-1">
                      <span className="sr-only">Buscar por alias</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por alias" className="min-h-12 w-full rounded-2xl border-2 border-stone-200 bg-white/90 pl-10 pr-4 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700" />
                    </label>
                    <div className="flex gap-1 overflow-x-auto rounded-2xl bg-stone-100 p-1" role="group" aria-label="Ordenar por">
                      {SORTS.map(([id, label]) => (
                        <button key={id} type="button" aria-pressed={sort === id} onClick={() => setSort(id)} className={`relative min-h-10 shrink-0 rounded-xl px-3 text-sm font-bold ${sort === id ? 'text-stone-900' : 'text-stone-600'}`}>
                          {sort === id && <m.span layoutId={`orden-${aula.id}`} className="absolute inset-0 rounded-xl bg-white shadow" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />}
                          <span className="relative">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cada estudiante con su barra de lecciones */}
                  <ul className="space-y-2">
                    {list.map((s, i) => {
                      const idle = daysSince(s.ultima_actividad);
                      return (
                        <m.li layout key={`${s.alias}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="rounded-2xl bg-white/90 p-3 sm:p-4 ring-1 ring-stone-200">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${theme.gradient} font-black text-white`} aria-hidden="true">
                              {String(s.alias).charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="flex flex-wrap items-center gap-2 font-black">
                                <span className="truncate">{s.alias}</span>
                                {idle > 7 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">{idle === Infinity ? 'Aún no empieza' : `Sin entrar hace ${idle} días`}</span>}
                                {idle <= 1 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">Activo hoy</span>}
                              </p>
                              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-stone-100" title={`${s.lecciones_completadas} lecciones`}>
                                <m.div className={`h-full rounded-full bg-gradient-to-r ${theme.gradient}`} initial={{ width: 0 }} animate={{ width: `${((s.lecciones_completadas || 0) / maxLessons) * 100}%` }} transition={{ duration: 0.7, delay: 0.1 }} />
                              </div>
                            </div>
                            <dl className="grid grid-cols-4 gap-3 text-center text-xs sm:text-sm">
                              <div>
                                <dt className="text-stone-500">Lecc.</dt>
                                <dd className="font-black tabular-nums">{s.lecciones_completadas}</dd>
                              </div>
                              <div>
                                <dt className="text-stone-500">Puntos</dt>
                                <dd className="font-black tabular-nums">{Number(s.puntos_totales || 0).toLocaleString('es-PE')}</dd>
                              </div>
                              <div>
                                <dt className="text-stone-500">Racha</dt>
                                <dd className="font-black tabular-nums">{s.racha_actual || 0}</dd>
                              </div>
                              <div>
                                <dt className="text-stone-500">Última</dt>
                                <dd className="font-black">{formatDate(s.ultima_actividad)}</dd>
                              </div>
                            </dl>
                          </div>
                        </m.li>
                      );
                    })}
                    {list.length === 0 && <li className="p-4 text-center text-stone-600">Nadie con ese alias.</li>}
                  </ul>
                </>
              )}
              {detail && (
                <div className="flex flex-wrap items-center gap-3 border-t border-stone-200/70 pt-4">
                  <button type="button" onClick={() => download('csv')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-stone-300 bg-white px-4 font-bold hover:bg-stone-50">
                    <Download className="h-4 w-4" aria-hidden="true" /> Exportar CSV
                  </button>
                  <button type="button" onClick={() => download('json')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-stone-300 bg-white px-4 font-bold hover:bg-stone-50">
                    <Download className="h-4 w-4" aria-hidden="true" /> Exportar JSON
                  </button>
                  <button type="button" onClick={load} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-bold text-stone-700 hover:bg-white">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Actualizar
                  </button>
                  <p className="flex w-full items-start gap-2 text-xs text-stone-600">
                    <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                    La exportación solo incluye a quienes aceptaron compartir sus datos, con un seudónimo en lugar del alias.
                  </p>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
      {projecting && <Projector aula={aula} onClose={() => setProjecting(false)} />}
    </m.li>
  );
};

const Teacher = () => {
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nombre, setNombre] = useState('');
  const [idioma, setIdioma] = useState('quechua');
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState(null); // aula recién creada: se abre y se ofrece proyectar

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.getMyClassrooms();
      setAulas(data.aulas || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.createClassroom({ nombre: nombre.trim(), idioma });
      setAulas((list) => [{ ...data.aula, estudiantes: 0 }, ...list]);
      setFresh(data.aula.id);
      setNombre('');
      toast.success(`Aula creada: ${data.aula.codigo}`, { description: 'Proyéctala o compártela con tus estudiantes.' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'No pudimos crear el aula');
    } finally {
      setCreating(false);
    }
  };

  const total = aulas.reduce((a, x) => a + (x.estudiantes || 0), 0);
  const theme = languageStyle(idioma);

  return (
    <div className="fondo-burbujas min-h-screen text-stone-900">
      <span className="burbuja burbuja-verde" aria-hidden="true" />
      <span className="burbuja burbuja-azul" aria-hidden="true" />
      <span className="burbuja burbuja-morada" aria-hidden="true" />
      <main className="relative isolate container mx-auto max-w-5xl py-6 sm:py-8">
        <Decor palette="frio" />
        <Link to="/profile" className="inline-flex min-h-11 items-center gap-2 font-semibold text-stone-700 hover:text-stone-900">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Volver al perfil
        </Link>

        {/* Portada */}
        <section className="vidrio relative mt-3 overflow-hidden rounded-[2rem] p-5 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <m.span initial={{ rotate: -8, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }} className="mx-auto w-28 sm:mx-0 sm:w-36 aspect-square shrink-0" aria-hidden="true">
              <LlamaImage pose="leyendo" sticker eager />
            </m.span>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs font-black uppercase tracking-widest text-stone-500">Para docentes</p>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
                <span className="texto-degradado">Modo aula</span>
              </h1>
              <p className="mt-2 max-w-2xl text-stone-700">Tus estudiantes entran con un alias, sin correo ni datos personales. Tú ves su avance aquí.</p>
              {aulas.length > 0 && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-bold ring-1 ring-stone-200">
                  <School className="h-4 w-4" aria-hidden="true" /> {aulas.length} {aulas.length === 1 ? 'aula' : 'aulas'} · <Users className="h-4 w-4" aria-hidden="true" /> {total} {total === 1 ? 'estudiante' : 'estudiantes'}
                </p>
              )}
            </div>
          </div>
          {/* Los 3 pasos */}
          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {STEPS.map(({ Icon, title, text }, i) => (
              <m.li key={title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }} className="flex items-start gap-3 rounded-2xl bg-white/70 p-3 ring-1 ring-white">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-blue-700 text-white shadow" aria-hidden="true">
                  <Icon className="h-5 w-5" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-amber-950">{i + 1}</span>
                </span>
                <span>
                  <span className="block font-black">{title}</span>
                  <span className="block text-sm text-stone-600">{text}</span>
                </span>
              </m.li>
            ))}
          </ol>
        </section>

        {/* Crear un aula, con vista previa */}
        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-labelledby="crear-titulo">
          <form onSubmit={create} className="vidrio rounded-[2rem] p-5 sm:p-6">
            <h2 id="crear-titulo" className="mb-4 flex items-center gap-2 text-xl font-black">
              <UserPlus className="h-5 w-5" aria-hidden="true" /> Crear un aula
            </h2>
            <label htmlFor="nombre-aula" className="mb-2 block font-bold">
              Nombre del aula
            </label>
            <input
              id="nombre-aula"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={80}
              placeholder="Por ejemplo: Quechua I — Grupo B"
              className="min-h-12 w-full rounded-2xl border-2 border-stone-200 bg-white/90 px-4 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700"
            />
            <p className="mb-2 mt-4 font-bold">Lengua</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Lengua del aula">
              {LANGUAGES.map((l) => {
                const active = l.id === idioma;
                const t = languageStyle(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      playTap();
                      setIdioma(l.id);
                    }}
                    className={`relative min-h-12 overflow-hidden rounded-2xl px-4 font-black transition ${active ? 'text-white shadow-lg' : 'bg-white/90 text-stone-700 ring-1 ring-stone-200 hover:ring-stone-400'}`}
                  >
                    {active && <m.span layoutId="lengua-aula" className={`absolute inset-0 bg-gradient-to-br ${t.gradient}`} transition={{ type: 'spring', bounce: 0.25, duration: 0.45 }} />}
                    {active && <span className="brillo-liquido" aria-hidden="true" />}
                    <span className="relative">{l.nombre}</span>
                  </button>
                );
              })}
            </div>
            <button type="submit" disabled={creating || !nombre.trim()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl boton-degradado px-6 font-black shadow-lg disabled:opacity-50">
              {creating ? <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}
              Crear aula
            </button>
          </form>
          {/* Así la verán tus estudiantes */}
          <div className={`relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br ${theme.gradient} p-6 text-white shadow-xl lg:block`} aria-hidden="true">
            <span className="brillo-liquido" />
            <p className="relative text-xs font-black uppercase tracking-widest text-white/80">Vista previa</p>
            <p className="relative mt-3 text-2xl font-black break-words">{nombre.trim() || 'Tu aula'}</p>
            <p className="relative text-white/85">{getLanguage(idioma).nombre}</p>
            <div className="relative mt-6 flex gap-1.5">
              {'ABC123'.split('').map((ch, i) => (
                <span key={i} className="flex h-12 w-9 items-center justify-center rounded-xl bg-white/85 text-xl font-black text-stone-400">
                  {ch}
                </span>
              ))}
            </div>
            <p className="relative mt-3 flex items-center gap-1 text-sm text-white/85">
              <Sparkles className="h-4 w-4" /> El código se crea al guardar.
            </p>
          </div>
        </section>

        <h2 className="mb-4 mt-8 flex items-center gap-2 text-xl font-black">
          <Users className="h-5 w-5" aria-hidden="true" /> Tus aulas
        </h2>
        {loading ? (
          <ul className="space-y-4" aria-label="Cargando">
            {[0, 1].map((i) => (
              <li key={i} className="h-32 animate-pulse rounded-[2rem] bg-white/60" />
            ))}
          </ul>
        ) : error ? (
          <div role="alert" className="vidrio rounded-2xl p-6">
            <p className="mb-3 font-semibold">No pudimos cargar tus aulas.</p>
            <button type="button" onClick={load} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-stone-300 px-4 font-bold">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar
            </button>
          </div>
        ) : aulas.length === 0 ? (
          <div className="vidrio flex flex-col items-center gap-3 rounded-[2rem] p-8 text-center">
            <span className="w-28 aspect-square">
              <LlamaImage pose="pensando" sticker />
            </span>
            <p className="text-lg font-black">Todavía no creaste ningún aula</p>
            <p className="text-stone-600">Escribe un nombre arriba y pulsa «Crear aula».</p>
          </div>
        ) : (
          <ul className="space-y-5">
            {aulas.map((aula) => (
              <ClassroomCard key={aula.id} aula={aula} startOpen={aula.id === fresh} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default Teacher;
