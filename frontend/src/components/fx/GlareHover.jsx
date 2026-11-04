// Reflejo de luz que cruza la tarjeta al pasar el mouse. Implementación propia (MIT).
const GlareHover = ({ children, width = '100%', height = '100%', borderRadius = '1rem', borderColor = 'transparent', glareOpacity = 0.5, glareSize = 40, className = '' }) => (
  <div
    className={`fx-reflejo relative overflow-hidden ${className}`}
    style={{ width, height, borderRadius, border: `1px solid ${borderColor}`, '--fx-reflejo-opacidad': glareOpacity, '--fx-reflejo-ancho': `${glareSize}%` }}
  >
    {children}
    <span className="fx-reflejo-luz pointer-events-none absolute inset-0" aria-hidden="true" />
  </div>
);

export default GlareHover;
