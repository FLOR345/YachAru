// Palabras que pasan de borrosas a nítidas una tras otra al aparecer. Implementación propia (MIT).
import * as m from 'motion/react-m';

const BlurText = ({ text = '', delay = 100, stepDuration = 0.35, className = '' }) => (
  <p className={`flex flex-wrap ${className}`} aria-label={text}>
    {text.split(' ').map((word, i) => (
      <m.span
        key={i}
        aria-hidden="true"
        className="mr-[0.25em] inline-block"
        initial={{ opacity: 0, filter: 'blur(10px)', y: -12 }}
        whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: stepDuration * 2, delay: (i * delay) / 1000 }}
      >
        {word}
      </m.span>
    ))}
  </p>
);

export default BlurText;
