// Una luz que recorre el borde de un botón o enlace. Implementación propia (MIT).
// eslint-disable-next-line no-unused-vars
const StarBorder = ({ as: Component = 'button', children, className = '', style, color = '#ffffff', borderColor = 'rgba(255,255,255,0.4)', backgroundColor, textColor, thickness = 2, radius = 16, duration = 4, glow = 0.6, theme, ...rest }) => (
  <Component
    className={`relative inline-flex items-center justify-center px-6 py-3 ${className}`}
    style={{ borderRadius: radius, background: backgroundColor, color: textColor, boxShadow: `0 0 0 1px ${borderColor}`, ...style }}
    {...rest}
  >
    <span
      className="fx-estrella-borde pointer-events-none absolute inset-0"
      style={{ borderRadius: radius, padding: thickness, '--fx-estrella-color': color, '--fx-estrella-tiempo': `${duration}s`, filter: glow ? `drop-shadow(0 0 ${Math.round(glow * 8)}px ${color})` : undefined }}
      aria-hidden="true"
    />
    {children}
  </Component>
);

export default StarBorder;
