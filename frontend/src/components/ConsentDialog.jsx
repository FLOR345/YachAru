// Pregunta una sola vez si la persona acepta que se registren sus datos de aprendizaje.
// Sin respuesta (o con "Ahora no") no se registra nada. Se puede cambiar y borrar todo desde el perfil.
import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Download, Trash2, EyeOff } from 'lucide-react';
import { toast } from '../utils/notify';
import { api } from '../services/api';
import { clearQueue, flush } from '../services/telemetry';
import { LlamaImage } from './Mascot';

const POINTS = [
  [EyeOff, 'Con un seudónimo', 'Nunca se exporta tu nombre ni tu correo: solo un código que no te identifica.'],
  [Download, 'Tuyos para descargar', 'Puedes descargar tus datos en CSV o JSON cuando quieras.'],
  [Trash2, 'Tuyos para borrar', 'Puedes retirar tu permiso y borrar todo desde tu perfil.'],
];

export const saveConsentLocally = (user, consiente) => {
  const updated = { ...user, consentimiento_datos: consiente };
  try {
    localStorage.setItem('user', JSON.stringify(updated));
  } catch {
    // sin almacenamiento: vale para esta visita
  }
  return updated;
};

const ConsentDialog = ({ user, setUser }) => {
  const ref = useRef(null);
  const [saving, setSaving] = useState(false);
  const open = Boolean(user) && user.consentimiento_datos === null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const answer = async (consiente) => {
    setSaving(true);
    try {
      await api.setConsent(consiente);
      setUser?.(saveConsentLocally(user, consiente));
      if (consiente) {
        toast.success('¡Gracias por contribuir!', { description: 'Tu aprendizaje ayudará a investigar el quechua y el aymara.' });
        flush();
      } else {
        clearQueue();
      }
    } catch {
      toast.error('No pudimos guardar tu respuesta', { description: 'Inténtalo de nuevo en un momento.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="consentimiento-titulo"
      // Escape cuenta como "Ahora no" para no dejar la pregunta abierta sin respuesta
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) answer(false);
      }}
      className="modal w-[calc(100%-2rem)] max-w-lg rounded-3xl p-0 backdrop:bg-stone-900/60 text-stone-900"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-end gap-3 mb-5" aria-hidden="true">
          <div className="w-28 aspect-square llama llama-salta">
            <LlamaImage pose="ayuda" eager />
          </div>
          <span className="mb-2 w-12 h-12 rounded-2xl bg-gradient-to-br from-green-600 to-blue-700 flex items-center justify-center shadow-lg anim-pop">
            <ShieldCheck className="w-7 h-7 text-white" />
          </span>
        </div>
        <h2 id="consentimiento-titulo" className="text-2xl font-black mb-2">
          ¿Ayudas a investigar el quechua y el aymara?
        </h2>
        <p className="text-stone-700 leading-relaxed mb-5">
          Si aceptas, YachAru guardará cómo practicas (qué respondes, cuánto tardas, qué palabras escuchas) para estudiar cómo se
          aprenden estas lenguas. Es opcional: la app funciona igual si dices que no.
        </p>
        <ul className="space-y-3 mb-6">
          {POINTS.map(([Icon, title, text]) => (
            <li key={title} className="flex gap-3">
              <Icon className="w-5 h-5 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                <strong>{title}.</strong> <span className="text-stone-700">{text}</span>
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button type="button" disabled={saving} onClick={() => answer(false)} className="flex-1 min-h-12 px-5 border-2 border-stone-300 rounded-xl font-bold hover:bg-stone-50 toque disabled:opacity-60">
            Ahora no
          </button>
          <button type="button" disabled={saving} onClick={() => answer(true)} className="flex-1 min-h-12 px-5 boton-degradado rounded-xl font-bold shadow-lg disabled:opacity-60">
            Acepto contribuir
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default ConsentDialog;
