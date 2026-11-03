// Elegir la voz sintética (mujer u hombre). Las grabaciones de personas suenan siempre igual.
import { useEffect, useState } from 'react';
import { getVoice, setVoice, VOICE_EVENT } from '../utils/speech';

const OPTIONS = [
  ['mujer', 'Mujer'],
  ['hombre', 'Hombre'],
];

const VoicePicker = ({ className = '' }) => {
  const [voice, setLocal] = useState(getVoice);

  useEffect(() => {
    const sync = () => setLocal(getVoice());
    window.addEventListener(VOICE_EVENT, sync);
    return () => window.removeEventListener(VOICE_EVENT, sync);
  }, []);

  return (
    <div className={`flex rounded-full bg-stone-100 p-1 ${className}`} role="group" aria-label="Voz">
      {OPTIONS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={voice === id}
          onClick={() => setVoice(id)}
          className={`min-h-9 px-3 rounded-full text-sm font-bold toque ${voice === id ? 'bg-stone-800 text-white' : 'text-stone-600 hover:text-stone-900'}`}
        >
          Voz de {label.toLowerCase()}
        </button>
      ))}
    </div>
  );
};

export default VoicePicker;
