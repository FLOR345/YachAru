// Marcador con dígitos que ruedan al cambiar. Implementación propia (MIT).
import * as m from 'motion/react-m';

const Digit = ({ digit, size, duration }) => {
  const row = size * 1.15;
  return (
    <span className="relative inline-block overflow-hidden tabular-nums" style={{ height: row, width: '0.62em' }}>
      <m.span className="absolute left-0 top-0 flex w-full flex-col" animate={{ y: -digit * row }} transition={{ type: 'spring', bounce: 0.2, duration }}>
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n} className="block text-center" style={{ height: row, lineHeight: `${row}px` }}>
            {n}
          </span>
        ))}
      </m.span>
    </span>
  );
};

const Counter = ({ value = 0, fontSize = 24, fontWeight = 800, duration = 0.5 }) => {
  const digits = String(Math.max(0, Math.round(value))).split('');
  return (
    <span className="inline-flex align-baseline" style={{ fontSize, fontWeight }} role="img" aria-label={String(value)}>
      {digits.map((d, i) => (
        <Digit key={digits.length - i} digit={Number(d)} size={fontSize} duration={duration} />
      ))}
    </span>
  );
};

export default Counter;
