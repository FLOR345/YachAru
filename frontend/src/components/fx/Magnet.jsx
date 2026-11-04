// El contenido se acerca un poco al mouse cuando está cerca. Implementación propia (MIT).
import { useRef } from 'react';
import { useMotionValue, useSpring } from 'motion/react';
import * as m from 'motion/react-m';

const Magnet = ({ children, padding = 100, magnetStrength = 2, wrapperClassName = '', innerClassName = '' }) => {
  const ref = useRef(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const move = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const near = Math.abs(dx) < r.width / 2 + padding && Math.abs(dy) < r.height / 2 + padding;
    x.set(near ? dx / magnetStrength / 4 : 0);
    y.set(near ? dy / magnetStrength / 4 : 0);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <div ref={ref} className={`relative ${wrapperClassName}`} onPointerMove={move} onPointerLeave={reset}>
      <m.div className={innerClassName} style={{ x, y }}>
        {children}
      </m.div>
    </div>
  );
};

export default Magnet;
