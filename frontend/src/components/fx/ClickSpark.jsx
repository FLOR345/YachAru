// Chispas que salen de donde se hace clic o se toca. Implementación propia (MIT).
import { useCallback } from 'react';

const ClickSpark = ({ children, sparkColor = '#16a34a', sparkCount = 8, sparkRadius = 24, sparkSize = 10, duration = 450 }) => {
  const spark = useCallback(
    (e) => {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const layer = document.createElement('div');
      layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;pointer-events:none;z-index:9999`;
      for (let i = 0; i < sparkCount; i++) {
        const angle = (360 / sparkCount) * i;
        const line = document.createElement('span');
        line.style.cssText = `position:absolute;left:0;top:-1px;width:${sparkSize}px;height:2px;border-radius:2px;background:${sparkColor};transform-origin:0 50%`;
        line.animate(
          [
            { transform: `rotate(${angle}deg) translateX(4px) scaleX(1)`, opacity: 1 },
            { transform: `rotate(${angle}deg) translateX(${sparkRadius}px) scaleX(0.2)`, opacity: 0 },
          ],
          { duration, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' }
        );
        layer.appendChild(line);
      }
      document.body.appendChild(layer);
      setTimeout(() => layer.remove(), duration + 60);
    },
    [sparkColor, sparkCount, sparkRadius, sparkSize, duration]
  );
  return <div onPointerDown={spark}>{children}</div>;
};

export default ClickSpark;
