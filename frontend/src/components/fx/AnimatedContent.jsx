// El contenido entra deslizándose (con desenfoque o giro opcional) al aparecer en pantalla. Implementación propia (MIT).
import * as m from 'motion/react-m';

const BACK = [0.34, 1.56, 0.64, 1];
const SMOOTH = [0.23, 1, 0.32, 1];

const AnimatedContent = ({ children, distance = 80, direction = 'vertical', reverse = false, duration = 0.8, ease = 'power3.out', scale = 1, blur = 0, tilt = 0, threshold = 0.1, delay = 0 }) => {
  const offset = reverse ? -distance : distance;
  const from = direction === 'horizontal' ? { x: offset } : { y: offset };
  return (
    <m.div
      initial={{ opacity: 0, ...from, scale, filter: `blur(${blur}px)`, rotateX: tilt }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)', rotateX: 0 }}
      viewport={{ once: true, amount: threshold }}
      transition={{ duration, delay, ease: String(ease).startsWith('back') ? BACK : SMOOTH }}
    >
      {children}
    </m.div>
  );
};

export default AnimatedContent;
