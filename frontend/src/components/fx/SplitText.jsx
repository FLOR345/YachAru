// Texto que entra letra por letra (onda, salto o giro) y se mueve al pasar el mouse. Implementación propia (MIT).
import * as m from 'motion/react-m';

const EFFECTS = {
  wave: { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } },
  pop: { hidden: { opacity: 0, scale: 0.4 }, show: { opacity: 1, scale: 1 } },
  flip: { hidden: { opacity: 0, rotateX: -90 }, show: { opacity: 1, rotateX: 0 } },
};

const SplitText = ({ text = '', tag = 'p', effect = 'wave', delay = 40, duration = 0.6, textAlign = 'center', hoverEffect, className = '' }) => {
  const Tag = m[tag] ?? m.p;
  const variants = EFFECTS[effect] ?? EFFECTS.wave;
  return (
    <Tag className={`inline-block ${className}`} style={{ textAlign }} initial="hidden" whileInView="show" viewport={{ once: true }} aria-label={text}>
      {[...text].map((ch, i) => (
        <m.span
          key={i}
          className="inline-block"
          aria-hidden="true"
          variants={variants}
          transition={{ type: 'spring', bounce: 0.45, duration, delay: (i * delay) / 1000 }}
          whileHover={hoverEffect ? { y: -6, transition: { type: 'spring', stiffness: 500, damping: 12 } } : undefined}
        >
          {ch === ' ' ? ' ' : ch}
        </m.span>
      ))}
    </Tag>
  );
};

export default SplitText;
