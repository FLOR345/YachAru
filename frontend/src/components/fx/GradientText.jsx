// Texto con un degradado que se desliza. Implementación propia de YachAru (MIT).
const GradientText = ({ children, colors = ['#15803d', '#0ea5e9', '#7c3aed', '#15803d'], animationSpeed = 8, glow = 0, className = '' }) => (
  <span
    className={`fx-gradiente inline-block bg-clip-text text-transparent ${className}`}
    style={{
      backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
      backgroundSize: '300% 100%',
      animationDuration: `${animationSpeed}s`,
      filter: glow ? `drop-shadow(0 0 ${Math.round(glow * 16)}px ${colors[0]}66)` : undefined,
    }}
  >
    {children}
  </span>
);

export default GradientText;
