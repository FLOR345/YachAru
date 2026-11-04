// "Mi aula": la casa del estudiante que entró con el código de su docente.
// Muestra su aula (nombre, lengua y docente), su avance y su puesto, el avance de la clase,
// un podio por alias y su código personal para volver a entrar desde otro dispositivo.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as m from 'motion/react-m';
import { Play, School, Trophy, Flame, BookOpen, Users, Clock, KeyRound, Copy, Check, RefreshCw, Star, LogOut } from 'lucide-react';
import { api } from '../services/api';
import { getLanguage, languageStyle } from '../languages';
import { LlamaImage } from '../components/Mascot';
import Decor from '../components/Decor';
import { toast } from '../utils/notify';
import { playTap } from '../utils/sounds';
import { Dashboard, preloadOn } from '../routes';

export const STUDENT_CODE_KEY = 'simiaru-codigo-estudiante';
const readCode = () => {
  try {
    return localStorage.getItem(STUDENT_CODE_KEY) || '';
  } catch {
    return '';
  }
};

const Stat = ({ Icon, label, value, color, delay }) => (
  <m.li initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="vidrio rounded-2xl p-4">
    <span className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow`} aria-hidden="true">
      <Icon className="h-5 w-5" />
    </span>
    <p className="text-3xl font-black tabular-nums leading-none">{value}</p>
    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-stone-600">{label}</p>
  </m.li>
);

const StudentClassroom = ({ user, onLogout }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = readCode();

  const load = useCallback(async () => {
    setError(false);
    try {
      const { data: d } = await api.getMyClassroomAsStudent();
      setData(d);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast(`Tu código es ${code}`);
    }
  };

  const idioma = data?.aula.idioma ?? user?.idioma_objetivo ?? 'quechua';
  const language = getLanguage(idioma);
  const theme = languageStyle(idioma);

  return (
    <div className="fondo-burbujas min-h-screen text-stone-900">
      <span className="burbuja burbuja-verde" aria-hidden="true" />
      <span className="burbuja burbuja-azul" aria-hidden="true" />
      <span className="burbuja burbuja-morada" aria-hidden="true" />
      <main className="relative isolate container mx-auto max-w-4xl py-6 sm:py-10">
        <Decor />
        {error ? (
          <div className="vidrio rounded-[2rem] p-8 text-center" role="alert">
            <p className="text-lg font-black">No pudimos cargar tu aula.</p>
            <p className="text-stone-600">Revisa tu conexión; si es la primera visita del día, el servidor tarda hasta un minuto.</p>
            <button type="button" onClick={load} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-stone-300 px-5 font-bold">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar
            </button>
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center py-20" role="status">
            <span className="w-32 aspect-square llama llama-piensa">
              <LlamaImage pose="esperando" eager />
            </span>
            <p className="mt-3 font-bold text-stone-700">Abriendo tu aula…</p>
          </div>
        ) : (
          <>
            {/* Portada del aula */}
            <m.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.7 }}
              className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${theme.gradient} p-6 sm:p-8 text-white shadow-xl`}
            >
              <span className="brillo-liquido" aria-hidden="true" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-widest ring-1 ring-white/40 backdrop-blur">
                    <School className="h-4 w-4" aria-hidden="true" /> Mi aula · {language.nombre}
                  </p>
                  <h1 className="mt-3 text-3xl sm:text-5xl font-black leading-tight">{data.aula.nombre}</h1>
                  <p className="mt-1 text-white/90">
                    Docente: <strong>{data.aula.docente}</strong> · Tú eres <strong>{data.yo.alias}</strong>
                  </p>
                  <Link
                    to={`/dashboard?idioma=${idioma}`}
                    {...preloadOn(Dashboard)}
                    onClick={playTap}
                    className="mt-5 inline-flex min-h-14 items-center gap-3 rounded-full bg-white pl-2 pr-6 font-black text-stone-900 shadow-lg transition hover:scale-105 active:scale-95"
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-full ${theme.solid} text-white`}>
                      <Play className="h-5 w-5 translate-x-0.5 fill-current" aria-hidden="true" />
                    </span>
                    Seguir aprendiendo {language.nombre.toLowerCase()}
                  </Link>
                </div>
                <m.span className="mx-auto w-32 sm:w-40 aspect-square shrink-0" animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} aria-hidden="true">
                  <LlamaImage pose="bienvenida" sticker eager />
                </m.span>
              </div>
            </m.section>

            {/* Mi avance */}
            <h2 className="mb-3 mt-8 flex items-center gap-2 text-xl font-black">
              <Star className="h-5 w-5 text-amber-500" aria-hidden="true" /> Tu avance
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat Icon={Trophy} label="Tu puesto" value={`${data.yo.puesto}.º de ${data.clase.estudiantes}`} color="from-amber-400 to-orange-600" delay={0.05} />
              <Stat Icon={BookOpen} label="Lecciones" value={data.yo.lecciones} color="from-emerald-500 to-green-700" delay={0.1} />
              <Stat Icon={Star} label="Ayni Points" value={data.yo.puntos.toLocaleString('es-PE')} color="from-sky-500 to-blue-700" delay={0.15} />
              <Stat Icon={Flame} label="Racha" value={data.yo.racha} color="from-rose-500 to-red-700" delay={0.2} />
            </ul>

            {/* La clase */}
            <h2 className="mb-3 mt-8 flex items-center gap-2 text-xl font-black">
              <Users className="h-5 w-5" aria-hidden="true" /> Tu clase
            </h2>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <ul className="grid grid-cols-2 gap-3 content-start">
                <Stat Icon={Users} label="Estudiantes" value={data.clase.estudiantes} color="from-violet-500 to-purple-700" delay={0.25} />
                <Stat Icon={BookOpen} label="Lecciones de la clase" value={data.clase.lecciones} color="from-teal-400 to-emerald-700" delay={0.3} />
                <Stat Icon={Clock} label="Activos esta semana" value={data.clase.activos_semana} color="from-fuchsia-500 to-pink-700" delay={0.35} />
              </ul>
              <div className="vidrio rounded-[2rem] p-5">
                <p className="mb-4 flex items-center gap-2 font-black text-amber-900">
                  <Trophy className="h-5 w-5" aria-hidden="true" /> Podio de Ayni Points
                </p>
                {data.podio.length === 0 ? (
                  <p className="text-stone-600">Todavía nadie suma puntos. ¡Completa una lección y sé la primera persona del podio!</p>
                ) : (
                  <ol className="flex items-end justify-center gap-2 sm:gap-4">
                    {[1, 0, 2].map((rank) => {
                      const s = data.podio[rank];
                      if (!s) return <li key={rank} className="w-24" />;
                      return (
                        <m.li key={rank} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 * (2 - rank), type: 'spring', bounce: 0.4 }} className="flex w-24 flex-col items-center">
                          <span className={`mb-1 max-w-full truncate text-sm font-black ${s.soy_yo ? theme.text : ''}`}>{s.soy_yo ? `${s.alias} (tú)` : s.alias}</span>
                          <span className="mb-2 text-xs font-bold tabular-nums text-stone-600">{s.puntos.toLocaleString('es-PE')} pts</span>
                          <span className={`flex w-full ${['h-28', 'h-20', 'h-14'][rank]} items-start justify-center rounded-t-2xl bg-gradient-to-b ${['from-amber-300 to-amber-500', 'from-stone-200 to-stone-400', 'from-orange-300 to-orange-500'][rank]} pt-2 text-2xl font-black text-white shadow-inner`}>
                            {rank + 1}
                          </span>
                        </m.li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>

            {/* Código personal */}
            <section className="vidrio mt-8 flex flex-col gap-4 rounded-[2rem] p-5 sm:flex-row sm:items-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow" aria-hidden="true">
                <KeyRound className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-black">Tu código de estudiante</p>
                <p className="text-sm text-stone-600">Con él entras desde otro celular o computadora, en la página del aula, pestaña «Ya tengo mi código».</p>
              </div>
              {code ? (
                <button type="button" onClick={copy} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-4 text-lg font-black tracking-widest ring-1 ring-stone-200 hover:bg-stone-50">
                  {code} {copied ? <Check className="h-5 w-5 text-green-600" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
                </button>
              ) : (
                <p className="text-sm font-bold text-stone-500">Lo recibiste al unirte (no se guarda en este dispositivo).</p>
              )}
            </section>

            {onLogout && (
              <p className="mt-6 text-center">
                <button type="button" onClick={onLogout} className="inline-flex min-h-11 items-center gap-2 font-bold text-stone-600 hover:text-stone-900">
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Salir de esta cuenta
                </button>
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default StudentClassroom;
