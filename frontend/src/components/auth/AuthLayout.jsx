// Piezas compartidas por las pantallas de inicio de sesión y registro.
// Siguen la paleta de la portada: neutros cálidos (stone), verde = acción principal.
import { Link } from 'react-router-dom';
import { LlamaImage } from '../Mascot';
import Decor from '../Decor';
import GradientText from '../fx/GradientText';
import StaggerIn from '../../ui/StaggerIn';
import { Magnet } from '../../ui/lazyBits';

export const AuthLayout = ({ title, subtitle, children, footer, pose = 'bienvenida' }) => (
  // Mismo fondo de la portada: degradado suave con burbujas de color difuminadas
  <div className="fondo-burbujas min-h-screen flex items-center justify-center px-4 py-12 text-stone-900">
    <span className="burbuja burbuja-verde" aria-hidden="true" />
    <span className="burbuja burbuja-azul" aria-hidden="true" />
    <span className="burbuja burbuja-morada" aria-hidden="true" />
    <Decor />
    <main className="w-full max-w-md anim-entra">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white shadow-2xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <Magnet padding={50} magnetStrength={6} wrapperClassName="inline-block" innerClassName="block">
            <Link to="/" aria-label="YachAru, volver al inicio" className="inline-flex justify-center mb-3">
              <span className="block w-32 aspect-square llama llama-reposo" aria-hidden="true">
                <LlamaImage pose={pose} sticker eager sizes="8rem" />
              </span>
            </Link>
          </Magnet>
          <h1 className="text-3xl font-black">
            <GradientText colors={['#15803d', '#0ea5e9', '#7c3aed', '#db2777', '#15803d']} animationSpeed={6}>{title}</GradientText>
          </h1>
          <p className="text-stone-600 mt-2">{subtitle}</p>
        </div>
        <StaggerIn stagger={0.08} y={14} delay={0.15}>{children}</StaggerIn>
      </div>
      {footer}
    </main>
  </div>
);

export const GoogleButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full min-h-12 px-4 border-2 border-stone-300 rounded-xl font-bold text-stone-800 hover:bg-stone-50 hover:border-stone-400 toque flex items-center justify-center gap-3"
  >
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
    Continuar con Google
  </button>
);

export const Divider = ({ children }) => (
  <div className="flex items-center gap-4 my-6" role="separator">
    <span className="flex-1 border-t border-stone-200" />
    <span className="text-sm text-stone-600 font-semibold">{children}</span>
    <span className="flex-1 border-t border-stone-200" />
  </div>
);

// El mensaje se anuncia a lectores de pantalla en cuanto aparece y entra con una sacudida suave
export const ErrorMessage = ({ children }) =>
  children ? (
    <p role="alert" className="anim-sacude bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl mb-6 font-semibold">
      {children}
    </p>
  ) : null;

export const Field = ({ id, label, icon: Icon, hint, ...inputProps }) => (
  <div>
    <label htmlFor={id} className="block font-bold mb-2">
      {label}
    </label>
    <div className="campo relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" aria-hidden="true" />
      <input
        id={id}
        aria-describedby={hint ? `${id}-ayuda` : undefined}
        className="w-full min-h-12 pl-12 pr-4 border-2 border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-green-700 focus:border-green-700 focus:outline-none toque"
        {...inputProps}
      />
    </div>
    {hint && (
      <p id={`${id}-ayuda`} className="text-sm text-stone-600 mt-1.5">
        {hint}
      </p>
    )}
  </div>
);

export const SubmitButton = ({ loading, loadingText, children }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full min-h-12 py-3 boton-degradado font-bold rounded-xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {loading ? (
      <>
        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" aria-hidden="true" />
        {loadingText}
      </>
    ) : (
      children
    )}
  </button>
);
