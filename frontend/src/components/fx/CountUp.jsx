// Número que sube hasta su valor al aparecer en pantalla. Implementación propia (MIT).
import { useEffect, useRef, useState } from 'react';
import { useInView } from 'motion/react';

const format = (n, separator) => (separator ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, separator) : String(n));

const CountUp = ({ to = 0, from = 0, duration = 1.2, delay = 0, separator = '', prefix = '', suffix = '', className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!inView) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(to);
      return undefined;
    }
    let frame;
    const start = performance.now() + delay * 1000;
    const tick = (now) => {
      const t = Math.max(0, Math.min(1, (now - start) / (duration * 1000)));
      setValue(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, from, duration, delay]);
  return (
    <span ref={ref} className={className}>
      {prefix}
      {format(value, separator)}
      {suffix}
    </span>
  );
};

export default CountUp;
