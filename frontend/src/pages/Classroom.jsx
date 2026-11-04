// Modo aula para estudiantes: entrar con el código del aula y un alias, sin correo ni datos personales.
// Al entrar se muestra un código personal para volver a entrar desde otro dispositivo.
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as m from 'motion/react-m';
import { KeyRound, Users, User, Copy, Check, ArrowRight } from 'lucide-react';
import { toast } from '../utils/notify';
import { AuthLayout, ErrorMessage, Field, SubmitButton } from '../components/auth/AuthLayout';
import { api } from '../services/api';
import { STUDENT_CODE_KEY } from './StudentClassroom';

const TABS = [
  ['unirme', 'Unirme a un aula'],
  ['volver', 'Ya tengo mi código'],
];

const storeSession = (data) => {
  try {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.removeItem('isGuest');
  } catch {
    // sin almacenamiento: la sesión dura solo esta visita
  }
};

const Classroom = ({ setUser, setIsGuest }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // El enlace que comparte el docente trae el código: /aula?codigo=ABC123
  const invited = String(params.get('codigo') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const [tab, setTab] = useState('unirme');
  const [codigo, setCodigo] = useState(invited);
  const [alias, setAlias] = useState('');
  const [codigoEstudiante, setCodigoEstudiante] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(null); // { codigoEstudiante, aula, data }
  const [copied, setCopied] = useState(false);

  const finish = (data) => {
    storeSession(data);
    setIsGuest?.(false);
    setUser?.(data.user);
    // El estudiante entra a su aula, no al panel general
    navigate('/mi-aula');
  };

  const join = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.joinClassroom({ codigo: codigo.trim(), alias: alias.trim() });
      setJoined({ codigoEstudiante: data.codigoEstudiante, aula: data.aula, data });
      try {
        localStorage.setItem(STUDENT_CODE_KEY, data.codigoEstudiante);
      } catch {
        // sin almacenamiento: el código se muestra en pantalla para anotarlo
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos unirte al aula. Revisa el código e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.studentLogin(codigoEstudiante.trim());
      finish(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos entrar. Revisa tu código.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joined.codigoEstudiante);
      setCopied(true);
      toast.success('Código copiado');
    } catch {
      toast('Anótalo a mano', { description: 'Tu navegador no permitió copiarlo.' });
    }
  };

  // Paso final: mostrar el código personal antes de entrar
  if (joined) {
    return (
      <AuthLayout pose="celebrando" title="¡Ya estás en el aula!" subtitle={`${joined.aula.nombre} · ${joined.aula.idioma === 'aymara' ? 'Aymara' : 'Quechua'}`}>
        <div className="text-center">
          <p className="text-stone-700 mb-3">Este es tu código de estudiante. Guárdalo: lo necesitas para entrar desde otro celular o computadora.</p>
          <p className="anim-pop text-3xl sm:text-4xl font-black tracking-widest bg-stone-50 border-2 border-dashed border-stone-300 rounded-2xl py-5 mb-4 tabular-nums" aria-live="polite">
            {joined.codigoEstudiante}
          </p>
          <button type="button" onClick={copy} className="inline-flex items-center gap-2 min-h-11 px-5 mb-6 border-2 border-stone-300 rounded-xl font-bold hover:bg-stone-50 toque">
            {copied ? <Check className="w-5 h-5 text-green-700" aria-hidden="true" /> : <Copy className="w-5 h-5" aria-hidden="true" />}
            {copied ? 'Copiado' : 'Copiar código'}
          </button>
          <p className="text-sm text-stone-600 mb-6">Tu cuenta no tiene correo ni datos personales: tu docente solo ve tu alias y tu avance.</p>
          <button type="button" onClick={() => finish(joined.data)} className="w-full min-h-12 boton-degradado font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
            Ya lo guardé, empezar
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      pose="hablando"
      title="Modo aula"
      subtitle="Para estudiantes de un curso: sin correo ni datos personales"
      footer={
        <p className="text-center mt-6 text-stone-700">
          ¿Tienes una cuenta normal?{' '}
          <Link to="/login" className="font-bold text-green-800 underline underline-offset-4">
            Inicia sesión
          </Link>
        </p>
      }
    >
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-100 rounded-2xl mb-6" role="tablist" aria-label="Cómo entrar">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setError('');
            }}
            className={`relative min-h-11 rounded-xl font-bold text-sm toque ${tab === id ? 'text-stone-900' : 'text-stone-600 hover:text-stone-900'}`}
          >
            {tab === id && (
              <m.span layoutId="aula-pestana" className="absolute inset-0 rounded-xl bg-white shadow" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {invited && tab === 'unirme' && (
        <p className="mb-5 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-900 ring-1 ring-green-200">
          Te invitaron a un aula: el código ya está puesto. Solo escribe tu alias.
        </p>
      )}
      <ErrorMessage>{error}</ErrorMessage>

      {tab === 'unirme' ? (
        <form onSubmit={join} className="space-y-5" noValidate>
          <Field
            id="codigo-aula"
            label="Código del aula"
            icon={Users}
            hint="Te lo da tu docente. Por ejemplo: K7MQ2P"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            required
            maxLength={12}
          />
          <Field
            id="alias"
            autoFocus={!!invited}
            label="Tu alias"
            icon={User}
            hint="Un nombre corto con el que tu docente te reconozca. No uses tu nombre completo si no quieres."
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            autoComplete="nickname"
            required
            maxLength={40}
          />
          <SubmitButton loading={loading} loadingText="Uniéndote…">
            Unirme al aula
          </SubmitButton>
        </form>
      ) : (
        <form onSubmit={login} className="space-y-5" noValidate>
          <Field
            id="codigo-estudiante"
            label="Tu código de estudiante"
            icon={KeyRound}
            hint="El que recibiste al unirte, con la forma XXXXXX-XXXX"
            value={codigoEstudiante}
            onChange={(e) => setCodigoEstudiante(e.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            required
            maxLength={12}
          />
          <SubmitButton loading={loading} loadingText="Entrando…">
            Entrar
          </SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
};

export default Classroom;
