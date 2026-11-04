// Adornos de fondo: manchas de color difuminadas que derivan despacio y destellos que titilan.
// Van detrás del contenido (el contenedor padre debe ser "relative isolate").
import { Sparkle } from 'lucide-react';

const PALETTES = {
  vivo: ['bg-green-300', 'bg-sky-300', 'bg-fuchsia-300', 'bg-amber-200'],
  calido: ['bg-amber-200', 'bg-rose-200', 'bg-orange-200', 'bg-yellow-200'],
  frio: ['bg-sky-200', 'bg-indigo-200', 'bg-teal-200', 'bg-violet-200'],
};

const SPOTS = [
  { cls: '-top-24 -left-24 w-80 h-80', delay: '0s' },
  { cls: 'top-1/3 -right-28 w-96 h-96', delay: '-7s' },
  { cls: 'bottom-0 left-1/4 w-72 h-72', delay: '-14s' },
  { cls: '-bottom-24 -right-10 w-64 h-64', delay: '-4s' },
];

const SPARKS = [
  ['top-[12%] left-[8%]', 'w-5 h-5 text-amber-300', '0s'],
  ['top-[22%] right-[12%]', 'w-4 h-4 text-pink-300', '-1.2s'],
  ['top-[55%] left-[4%]', 'w-6 h-6 text-sky-300', '-0.6s'],
  ['top-[70%] right-[6%]', 'w-5 h-5 text-violet-300', '-2s'],
  ['top-[40%] left-[48%]', 'w-3 h-3 text-green-300', '-1.6s'],
  ['top-[85%] left-[30%]', 'w-4 h-4 text-amber-300', '-0.3s'],
];

const Decor = ({ palette = 'vivo', sparks = true, className = '' }) => (
  <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`} aria-hidden="true">
    {SPOTS.map(({ cls, delay }, i) => (
      <span key={i} className={`mancha ${cls} ${PALETTES[palette][i % 4]}`} style={{ animationDelay: delay }} />
    ))}
    {sparks &&
      SPARKS.map(([pos, cls, delay], i) => <Sparkle key={i} className={`absolute destello fill-current ${pos} ${cls}`} style={{ animationDelay: delay }} />)}
  </div>
);

export default Decor;
