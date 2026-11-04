// Tarjeta con un foco de luz que sigue al mouse. Implementación propia (MIT).
import { useRef } from 'react';

const SpotlightCard = ({ children, className = '', spotlightColor = 'rgba(255, 255, 255, 0.25)', intensity = 1 }) => {
  const ref = useRef(null);
  const move = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    ref.current.style.setProperty('--fx-x', `${e.clientX - r.left}px`);
    ref.current.style.setProperty('--fx-y', `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} onPointerMove={move} className={`fx-foco relative isolate overflow-hidden rounded-3xl ${className}`} style={{ '--fx-foco-color': spotlightColor, '--fx-foco-intensidad': intensity }}>
      <span className="fx-foco-luz pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      {children}
    </div>
  );
};

export default SpotlightCard;
