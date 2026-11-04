// Texto con un brillo que lo recorre. Implementación propia de SimiAru (MIT).
const ShinyText = ({ text, color = '#78716c', shineColor = '#ffffff', speed = 3, delay = 0, className = '' }) => (
  <span
    className={`fx-brillo inline-block bg-clip-text text-transparent ${className}`}
    style={{
      backgroundImage: `linear-gradient(110deg, ${color} 35%, ${shineColor} 50%, ${color} 65%)`,
      backgroundSize: '250% 100%',
      animationDuration: `${speed}s`,
      animationDelay: `${delay}s`,
    }}
  >
    {text}
  </span>
);

export default ShinyText;
