import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from '../utils/notify';
import { ArrowLeft, Award, Flame, Star, BookOpen, Target, CheckCircle, Lock, X, Edit3, AlertCircle, RefreshCw, Calendar, Download, Trash2, School, ArrowRight } from 'lucide-react';
import axios from 'axios';
import logo from '../assets/logo.webp';
import { API_URL } from '../config.js';
import { getLevel } from '../utils/levels.js';
import { RingProgress } from '@mantine/core';
import MantineShell from '../ui/MantineShell';
import Reveal from '../ui/Reveal';
import { api } from '../services/api';
import { LANGUAGES, getLanguage } from '../languages';
import { clearQueue, flush } from '../services/telemetry';
import { saveConsentLocally } from '../components/ConsentDialog';
import { LlamaImage } from '../components/Mascot';
import Decor from '../components/Decor';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

// Ventana modal con el <dialog> nativo: encierra el foco y se cierra con Escape
const Modal = ({ id, open, onClose, title, children }) => {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-titulo`}
      className="modal w-[calc(100%-2rem)] max-w-md rounded-3xl p-0 backdrop:bg-stone-900/60 text-stone-900"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <h2 id={`${id}-titulo`} className="text-2xl font-bold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="toque w-11 h-11 -mt-2 -mr-2 flex items-center justify-center rounded-full hover:bg-stone-100">
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
};

const Message = ({ message }) =>
  message ? (
    <p
      role={message.type === 'error' ? 'alert' : 'status'}
      className={`anim-entra p-4 rounded-xl mb-5 font-semibold ${message.type === 'success' ? 'bg-green-50 text-green-900 border border-green-300' : 'bg-red-50 text-red-800 border border-red-300'}`}
    >
      {message.text}
    </p>
  ) : null;

const fieldClass = 'w-full min-h-12 px-4 border-2 border-stone-300 rounded-xl focus:ring-2 focus:ring-green-700 focus:border-green-700 focus:outline-none bg-white';
const primaryButton = 'w-full min-h-12 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl toque flex items-center justify-center gap-2 disabled:opacity-60';

// Datos de aprendizaje: ver el permiso, cambiarlo, descargar y borrar (soberanía de los datos)
// Correos de progreso: al terminar una lección llega el resultado al correo de la cuenta.
// El botón envía un correo de prueba y, si falla, dice por qué (clave de Brevo, remitente, límite diario…).
const EmailCheck = ({ email }) => {
  const [state, setState] = useState({ status: 'idle', message: '' });
  const send = async () => {
    setState({ status: 'sending', message: '' });
    try {
      const { data } = await api.sendTestEmail();
      setState({ status: 'ok', message: data.message });
      toast.success('Correo enviado', { description: data.message });
    } catch (error) {
      const message = error.response?.data?.message || 'No pudimos conectar con el servidor. Inténtalo en un momento.';
      setState({ status: 'error', message });
    }
  };
  return (
    <Reveal as="section" y={28} className="mt-6 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8" aria-labelledby="correos-titulo">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="w-20 aspect-square shrink-0" aria-hidden="true">
          <LlamaImage pose="escribiendo" sticker sizes="5rem" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 id="correos-titulo" className="text-2xl font-bold">
            Correos de progreso
          </h2>
          <p className="text-stone-600">
            Cuando terminas una lección te enviamos tu resultado a <strong className="text-stone-800 break-all">{email}</strong>. También recibes recordatorios de racha.
          </p>
        </div>
        <button
          type="button"
          onClick={send}
          disabled={state.status === 'sending'}
          className="ficha min-h-12 px-5 rounded-2xl border-stone-300 bg-white font-bold hover:bg-stone-50 disabled:opacity-60 whitespace-nowrap"
        >
          {state.status === 'sending' ? 'Enviando…' : 'Enviarme un correo de prueba'}
        </button>
      </div>
      {state.status === 'ok' && <p className="mt-4 rounded-2xl bg-green-50 border border-green-200 p-3 text-green-900 font-semibold" role="status">{state.message}</p>}
      {state.status === 'error' && (
        <p className="mt-4 rounded-2xl bg-amber-50 border border-amber-300 p-3 text-amber-900 font-semibold" role="alert">
          No se pudo enviar: {state.message}
        </p>
      )}
    </Reveal>
  );
};

const LearningData = ({ profile, onConsentChange }) => {
  const [busy, setBusy] = useState(false);
  const consent = profile?.consentimiento_datos;

  const change = async (value) => {
    setBusy(true);
    try {
      await api.setConsent(value);
      onConsentChange(value);
      if (!value) clearQueue();
      toast.success(value ? 'Gracias: tus datos ayudarán a investigar' : 'Ya no se registran tus datos de aprendizaje');
    } catch {
      toast.error('No pudimos guardar el cambio');
    } finally {
      setBusy(false);
    }
  };

  const download = async (format) => {
    try {
      await flush();
      await api.download(`/api/research/export/me?format=${format}`, `yacharu-mis-eventos.${format}`);
    } catch {
      toast.error('No pudimos descargar tus datos');
    }
  };

  const remove = async () => {
    if (!window.confirm('¿Borrar todos tus datos de aprendizaje? No se puede deshacer. Tu avance en las lecciones se conserva.')) return;
    setBusy(true);
    try {
      clearQueue();
      const { data } = await api.deleteMyEvents();
      toast.success(`Se borraron ${data.borrados} registros`);
    } catch {
      toast.error('No pudimos borrar tus datos');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Reveal as="section" y={28} className="mt-6 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8" aria-labelledby="datos-titulo">
      <div className="flex items-start gap-4 mb-5">
        <span className="w-20 aspect-square shrink-0" aria-hidden="true">
          <LlamaImage pose="carino" />
        </span>
        <div>
          <h2 id="datos-titulo" className="text-2xl font-bold">
            Mis datos de aprendizaje
          </h2>
          <p className="text-stone-600">
            {consent === true
              ? 'Aceptaste que se registre cómo practicas, con un seudónimo, para investigar estas lenguas.'
              : consent === false
                ? 'No se registra cómo practicas. Puedes cambiarlo cuando quieras.'
                : 'Todavía no elegiste. Mientras tanto no se registra nada.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {consent === true ? (
          <button type="button" disabled={busy} onClick={() => change(false)} className="min-h-11 px-4 rounded-xl border-2 border-stone-300 font-bold hover:bg-stone-50 toque disabled:opacity-60">
            Dejar de compartir
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => change(true)} className="min-h-11 px-4 rounded-xl boton-degradado font-bold shadow disabled:opacity-60">
            Acepto contribuir
          </button>
        )}
        <button type="button" onClick={() => download('csv')} className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl border-2 border-stone-300 font-bold hover:bg-stone-50 toque">
          <Download className="w-4 h-4" aria-hidden="true" />
          Descargar CSV
        </button>
        <button type="button" onClick={() => download('json')} className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl border-2 border-stone-300 font-bold hover:bg-stone-50 toque">
          <Download className="w-4 h-4" aria-hidden="true" />
          Descargar JSON
        </button>
        <button type="button" disabled={busy} onClick={remove} className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl text-red-800 font-bold hover:bg-red-50 toque disabled:opacity-60">
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          Borrar mis datos
        </button>
      </div>
    </Reveal>
  );
};

const Profile = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(user);
  const [progress, setProgress] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [modal, setModal] = useState(null); // 'edit' | 'password' | null
  const [editForm, setEditForm] = useState({ nombre: '', idioma_objetivo: 'quechua' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [profileRes, progressRes, badgesRes] = await Promise.all([
        axios.get(`${API_URL}/api/auth/profile`, authHeaders()),
        axios.get(`${API_URL}/api/progress`, authHeaders()),
        axios.get(`${API_URL}/api/progress/badges/all`, authHeaders()).catch(() => ({ data: { badges: [] } })),
      ]);
      const fresh = { ...user, ...profileRes.data.user };
      setProfile(fresh);
      // Solo se avisa a App si algo cambió (evita volver a dibujar todo sin motivo)
      if (setUser && JSON.stringify(fresh) !== JSON.stringify(user)) setUser(fresh);
      try {
        localStorage.setItem('user', JSON.stringify(fresh));
      } catch {
        // almacenamiento bloqueado: se usa solo en esta visita
      }
      setProgress(Array.isArray(progressRes.data.progress) ? progressRes.data.progress : []);
      setBadges(badgesRes.data.badges || []);
    } catch (error) {
      console.error('Error loading profile:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = () => {
    setMessage(null);
    setEditForm({ nombre: profile?.nombre || '', idioma_objetivo: profile?.idioma_objetivo || LANGUAGES[0].id });
    setModal('edit');
  };

  const openPassword = () => {
    setMessage(null);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setModal('password');
  };

  const closeModal = () => {
    setModal(null);
    setMessage(null);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`${API_URL}/api/auth/profile`, editForm, authHeaders());
      const updated = { ...profile, ...editForm, nombre: editForm.nombre.trim() };
      setProfile(updated);
      if (setUser) setUser(updated);
      try {
        localStorage.setItem('user', JSON.stringify(updated));
      } catch {
        // sin almacenamiento: se actualiza solo en esta visita
      }
      closeModal();
      toast.success('Perfil actualizado');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'No pudimos guardar los cambios. Inténtalo de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  const hasPassword = profile?.hasPassword !== false;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await axios.put(
        `${API_URL}/api/auth/change-password`,
        { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
        authHeaders(),
      );
      closeModal();
      toast.success(data.message || 'Contraseña actualizada');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setProfile((p) => ({ ...p, hasPassword: true }));
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'No pudimos cambiar la contraseña. Inténtalo de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  // Cada lección cuenta una sola vez, aunque se haya repetido
  const completedIds = new Set(progress.filter((p) => p?.completado === true || p?.completado === 't' || p?.completado === 1).map((p) => p.leccion_id));
  const completedRows = progress.filter((p) => completedIds.has(p.leccion_id));
  const averageScore =
    completedRows.length > 0 ? Math.round(completedRows.reduce((sum, p) => sum + (Number(p.porcentaje_aciertos) || 0), 0) / completedRows.length) : 0;
  const level = getLevel(profile);
  const obtainedBadges = badges.filter((b) => b.obtenida).length;

  const stats = [
    { Icon: Flame, iconClass: 'text-orange-700', label: 'Racha', value: profile?.racha_actual || 0, detail: 'días seguidos' },
    { Icon: Star, iconClass: 'text-amber-600', label: 'Ayni Points', value: profile?.puntos_totales || 0, detail: 'puntos ganados' },
    { Icon: BookOpen, iconClass: 'text-green-700', label: 'Lecciones', value: completedIds.size, detail: 'completadas' },
    { Icon: Target, iconClass: 'text-blue-800', label: 'Precisión', value: `${averageScore}%`, detail: 'promedio de aciertos' },
  ];

  return (
    <MantineShell>
    <div className="min-h-screen bg-gradient-to-br from-green-50/70 via-stone-50 to-purple-50/70 text-stone-900">
      {/* ==================== ENCABEZADO ==================== */}
      <header className="bg-white sticky top-0 z-40 border-b border-stone-200">
        <div className="container mx-auto py-3 flex items-center gap-3">
          <Link to="/dashboard" aria-label="Volver al panel" className="w-11 h-11 flex items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100 toque">
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
          </Link>
          <img src={logo} alt="" width="160" height="160" className="h-10 w-auto" />
          <h1 className="text-xl sm:text-2xl font-bold">Tu perfil</h1>
        </div>
      </header>

      <main className="relative isolate container mx-auto py-8 max-w-5xl">
        <Decor />
        {loading ? (
          <p className="text-center py-20 text-lg font-semibold text-stone-700" role="status">
            Cargando tu perfil…
          </p>
        ) : loadError ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center" role="alert">
            <AlertCircle className="w-10 h-10 text-red-700 mx-auto mb-3" aria-hidden="true" />
            <p className="text-lg font-semibold mb-1">No pudimos cargar tu perfil</p>
            <p className="text-stone-600 mb-5">Revisa tu conexión. Si es tu primera visita del día, el servidor puede tardar hasta un minuto.</p>
            <button type="button" onClick={loadAll} className="inline-flex items-center gap-2 px-6 min-h-11 bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg toque">
              <RefreshCw className="w-5 h-5" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {/* ==================== DATOS DE LA CUENTA ==================== */}
            <section className="vidrio rounded-[2rem] p-6 sm:p-8 mb-6" aria-labelledby="nombre-usuario">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <span className="relative w-28 h-28 shrink-0" aria-hidden="true">
                  <span className="block w-full h-full llama llama-reposo">
                    <LlamaImage pose="logro" eager />
                  </span>
                  <span className="absolute -bottom-1 -right-1 w-10 h-10 rounded-xl bg-green-700 text-white text-xl font-black flex items-center justify-center shadow-md ring-4 ring-white">
                    {profile?.nombre?.charAt(0).toUpperCase() || '?'}
                  </span>
                </span>
                <div className="flex-1 min-w-0">
                  <h2 id="nombre-usuario" className="text-3xl font-bold">
                    {profile?.nombre || 'Usuario'}
                  </h2>
                  <p className="text-stone-600 break-all">{profile?.email}</p>
                  <ul className="flex flex-wrap gap-2 mt-3 text-sm font-semibold">
                    <li className={`px-3 py-1 rounded-full ${profile?.idioma_objetivo === 'aymara' ? 'bg-blue-50 text-blue-900' : 'bg-green-50 text-green-900'}`}>
                      Aprende {getLanguage(profile?.idioma_objetivo)?.nombre.toLowerCase()}
                    </li>
                    <li className="px-3 py-1 rounded-full bg-stone-100 text-stone-800">
                      Nivel {level.number}: {level.name} ({level.subtitle.toLowerCase()})
                    </li>
                    {profile?.isGoogleUser && <li className="px-3 py-1 rounded-full bg-stone-100 text-stone-800">Cuenta de Google</li>}
                    {profile?.es_cuenta_aula && <li className="px-3 py-1 rounded-full bg-amber-50 text-amber-900">Cuenta de aula</li>}
                  </ul>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-6">
                <button type="button" onClick={openEdit} className="inline-flex items-center gap-2 px-5 min-h-11 border-2 border-stone-300 rounded-xl font-bold hover:bg-stone-50 toque">
                  <Edit3 className="w-4 h-4" aria-hidden="true" />
                  Editar perfil
                </button>
                {!profile?.es_cuenta_aula && (
                <button type="button" onClick={openPassword} className="inline-flex items-center gap-2 px-5 min-h-11 border-2 border-stone-300 rounded-xl font-bold hover:bg-stone-50 toque">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  {hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
                </button>
                )}
              </div>
            </section>

            {/* ==================== ESTADÍSTICAS ==================== */}
            <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
              {stats.map(({ Icon, iconClass, label, value, detail }) => (
                <li key={label} className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-6 h-6 ${iconClass}`} aria-hidden="true" />
                    <span className="text-sm font-bold text-stone-600">{label}</span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold mb-1">{value}</p>
                  <p className="text-sm text-stone-600">{detail}</p>
                </li>
              ))}
            </ul>

            {/* ==================== INSIGNIAS ==================== */}
            {badges.length > 0 && (
              <Reveal as="section" y={28} className="vidrio rounded-[2rem] p-6 sm:p-8 mb-6" aria-labelledby="insignias-titulo">
                <div className="flex items-center gap-4 mb-5">
                  {/* Mantine RingProgress: cuántas insignias llevas, de un vistazo */}
                  <RingProgress
                    size={84}
                    thickness={9}
                    roundCaps
                    rootColor="#e7e5e4"
                    sections={[{ value: badges.length ? (obtainedBadges / badges.length) * 100 : 0, color: 'yellow.6' }]}
                    label={<Award className="w-7 h-7 text-amber-600 mx-auto" aria-hidden="true" />}
                  />
                  <div>
                    <h2 id="insignias-titulo" className="text-2xl font-black">
                      Insignias
                    </h2>
                    <p className="text-stone-600">
                      {obtainedBadges} de {badges.length} obtenidas
                    </p>
                  </div>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {badges.map((badge, i) => (
                    <Reveal
                      as="li"
                      key={badge.id}
                      delay={Math.min(i, 8) * 0.05}
                      y={12}
                      className={`tarjeta-viva flex items-start gap-3 p-4 rounded-2xl border-2 ${badge.obtenida ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-100 shadow-md' : 'border-stone-200 bg-stone-50'}`}
                    >
                      {badge.obtenida ? (
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md shrink-0" aria-hidden="true">
                          <Award className="w-6 h-6 text-white" />
                        </span>
                      ) : (
                        <Lock className="w-8 h-8 text-stone-400 shrink-0" aria-hidden="true" />
                      )}
                      <div>
                        <p className="font-bold">
                          {badge.nombre}
                          <span className="sr-only">{badge.obtenida ? ' (obtenida)' : ' (pendiente)'}</span>
                        </p>
                        {badge.descripcion && <p className="text-sm text-stone-600">{badge.descripcion}</p>}
                        {badge.obtenida && badge.fecha_obtencion && <p className="text-sm text-amber-900 mt-1">Obtenida el {formatDate(badge.fecha_obtencion)}</p>}
                      </div>
                    </Reveal>
                  ))}
                </ul>
              </Reveal>
            )}

            {/* ==================== HISTORIAL ==================== */}
            <Reveal as="section" y={28} className="vidrio rounded-[2rem] p-6 sm:p-8" aria-labelledby="historial-titulo">
              <h2 id="historial-titulo" className="text-2xl font-bold">
                Historial de lecciones
              </h2>
              <p className="text-stone-600 mb-5">Tus últimos 10 intentos</p>

              {progress.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="w-10 h-10 text-stone-400 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-lg font-semibold mb-4">Todavía no completaste ninguna lección</p>
                  <Link to="/dashboard" className="inline-flex items-center px-6 min-h-12 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl toque">
                    Empezar la primera lección
                  </Link>
                </div>
              ) : (
                <ol className="space-y-3">
                  {progress.slice(0, 10).map((p, index) => {
                    const score = Number(p.porcentaje_aciertos) || 0;
                    const passed = score >= 80;
                    return (
                      <li key={`${p.id || p.leccion_id}-${index}`} className="flex items-center gap-4 p-4 rounded-2xl border border-stone-200">
                        <span
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${p.completado ? 'bg-green-700 text-white' : 'bg-stone-200 text-stone-600'}`}
                          aria-hidden="true"
                        >
                          <CheckCircle className="w-6 h-6" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg">{p.leccion_titulo || `Lección ${p.leccion_id}`}</p>
                          {formatDate(p.fecha_completado) && (
                            <p className="flex items-center gap-1.5 text-sm text-stone-600">
                              <Calendar className="w-4 h-4" aria-hidden="true" />
                              {formatDate(p.fecha_completado)}
                            </p>
                          )}
                        </div>
                        <p className={`text-2xl font-extrabold ${passed ? 'text-green-800' : 'text-orange-800'}`}>
                          {score}%<span className="sr-only"> de aciertos</span>
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Reveal>

            {/* ==================== MIS DATOS DE APRENDIZAJE ==================== */}
            <LearningData
              profile={profile}
              onConsentChange={(consiente) => {
                const updated = saveConsentLocally(profile, consiente);
                setProfile(updated);
                if (setUser) setUser(updated);
              }}
            />

            {/* ==================== CORREOS DE PROGRESO ==================== */}
            {!profile?.es_cuenta_aula && profile?.email && <EmailCheck email={profile.email} />}

            {/* ==================== MODO AULA (DOCENTES) ==================== */}
            {!profile?.es_cuenta_aula && (
              <Link
                to="/docente"
                className="tarjeta-viva mt-6 flex items-center gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-blue-50 to-purple-100/60 border border-white shadow-sm"
              >
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center shadow-md shrink-0" aria-hidden="true">
                  <School className="w-6 h-6 text-white" />
                </span>
                <span className="flex-1">
                  <span className="block text-lg font-black">¿Enseñas quechua o aymara?</span>
                  <span className="block text-stone-700">Crea un aula: tus estudiantes entran con un código, sin correo ni datos personales.</span>
                </span>
                <ArrowRight className="w-5 h-5 text-stone-600" aria-hidden="true" />
              </Link>
            )}
          </>
        )}
      </main>

      {/* ==================== EDITAR PERFIL ==================== */}
      <Modal id="editar" open={modal === 'edit'} onClose={closeModal} title="Editar perfil">
        <Message message={message} />
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div>
            <label htmlFor="perfil-nombre" className="block font-bold mb-2">
              Nombre
            </label>
            <input
              id="perfil-nombre"
              type="text"
              autoComplete="name"
              required
              maxLength={80}
              value={editForm.nombre}
              onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="perfil-idioma" className="block font-bold mb-2">
              Lengua que estás aprendiendo
            </label>
            <select
              id="perfil-idioma"
              value={editForm.idioma_objetivo}
              onChange={(e) => setEditForm({ ...editForm, idioma_objetivo: e.target.value })}
              className={fieldClass}
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </Modal>

      {/* ==================== CONTRASEÑA ==================== */}
      <Modal id="contrasena" open={modal === 'password'} onClose={closeModal} title={hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}>
        {!hasPassword && (
          <p className="p-4 rounded-xl mb-5 bg-stone-50 border border-stone-200 text-stone-800">
            Entraste con Google. Si creas una contraseña, también podrás iniciar sesión con tu correo.
          </p>
        )}
        <Message message={message} />
        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Campo oculto para que el gestor de contraseñas asocie la cuenta */}
          <input type="email" autoComplete="username" value={profile?.email || ''} readOnly hidden />
          {hasPassword && (
            <div>
              <label htmlFor="pass-actual" className="block font-bold mb-2">
                Contraseña actual
              </label>
              <input
                id="pass-actual"
                type="password"
                autoComplete="current-password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className={fieldClass}
              />
            </div>
          )}
          <div>
            <label htmlFor="pass-nueva" className="block font-bold mb-2">
              Nueva contraseña
            </label>
            <input
              id="pass-nueva"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              aria-describedby="pass-nueva-ayuda"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className={fieldClass}
            />
            <p id="pass-nueva-ayuda" className="text-sm text-stone-600 mt-1.5">
              Al menos 6 caracteres
            </p>
          </div>
          <div>
            <label htmlFor="pass-confirmar" className="block font-bold mb-2">
              Confirmar nueva contraseña
            </label>
            <input
              id="pass-confirmar"
              type="password"
              autoComplete="new-password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className={fieldClass}
            />
          </div>
          <button type="submit" disabled={saving} className={primaryButton}>
            <Lock className="w-5 h-5" aria-hidden="true" />
            {saving ? 'Guardando…' : hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
          </button>
        </form>
      </Modal>
    </div>
    </MantineShell>
  );
};

export default Profile;
