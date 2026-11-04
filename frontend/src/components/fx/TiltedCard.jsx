// Imagen que se inclina siguiendo al mouse. Implementación propia (MIT).
import { useRef } from 'react';
import { useMotionValue, useSpring } from 'motion/react';
import * as m from 'motion/react-m';

const TiltedCard = ({ imageSrc, altText = '', containerHeight = '300px', containerWidth = '100%', imageHeight = '300px', imageWidth = '100%', radius = 16, rotateAmplitude = 12, scaleOnHover = 1.05 }) => {
  const ref = useRef(null);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 180, damping: 16 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 180, damping: 16 });
  const scale = useSpring(1, { stiffness: 180, damping: 16 });
  const move = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    rotateX.set(-((e.clientY - r.top) / r.height - 0.5) * 2 * rotateAmplitude);
    rotateY.set(((e.clientX - r.left) / r.width - 0.5) * 2 * rotateAmplitude);
  };
  const leave = () => {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  };
  return (
    <figure ref={ref} className="relative [perspective:800px]" style={{ height: containerHeight, width: containerWidth }} onPointerMove={move} onPointerEnter={() => scale.set(scaleOnHover)} onPointerLeave={leave}>
      <m.img src={imageSrc} alt={altText} loading="lazy" className="w-full object-cover shadow-xl" style={{ height: imageHeight, width: imageWidth, borderRadius: radius, rotateX, rotateY, scale }} />
    </figure>
  );
};

export default TiltedCard;
