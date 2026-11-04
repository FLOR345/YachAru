import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy } from 'react';
import { LazyMotion, MotionConfig } from 'motion/react';
// React Bits: chispas verdes en cada clic o toque, en toda la app (sin chispas con "reducir movimiento")
import ClickSpark from './components/reactbits/ClickSpark';

// Motion: los componentes "m" son livianos; el motor (con layout) llega aparte, sin frenar la primera pantalla
const loadMotionFeatures = () => import('./ui/motionFeatures').then((mod) => mod.default);

// Sonner llega en su propio archivo, después de la primera pantalla: los avisos siempre
// responden a una acción posterior (guardar, marcar un favorito), así que ninguno se pierde
// Notificaciones (React-Toastify): se descargan aparte, después de la primera pantalla
const Notifications = lazy(() => import('./components/Notifications'));
import Home from './pages/Home';
import { Login, Register, Dashboard, LessonView, Profile, Dictionary, CultureModule, Classroom, Teacher, Practice, NotFound, Evaluation, Validation } from './routes';
import { LlamaImage } from './components/Mascot';
import { startTelemetry } from './services/telemetry';
import PageFade from './ui/PageFade';
import OfflineBanner from './components/OfflineBanner';

// Pantalla de espera: mismo fondo claro que la app y solo visible si la carga pasa de 0,3 s
// (las cargas rápidas no muestran un destello de "Cargando")
const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-stone-50 text-stone-600" role="status">
    <span className="block w-32 aspect-square llama llama-piensa" aria-hidden="true">
      <LlamaImage pose="esperando" eager />
    </span>
    <span className="espera flex items-center gap-3 font-semibold">
      <span className="espera-punto" aria-hidden="true" />
      Cargando…
    </span>
  </div>
);

// URL del backend
import { API_URL } from './config.js';

// Ruta protegida que permite usuarios Y invitados.
// Va fuera de App: si se define dentro, cada cambio de estado de App la crea de nuevo
// y React vuelve a montar la pantalla entera (eso provocaba un bucle de peticiones).
const ProtectedRoute = ({ children, auth, guestAllowed = true }) => {
  if (auth.loading) {
    return <LoadingScreen />;
  }

  // Si hay usuario O es invitado (y está permitido), dar acceso
  if (auth.user || (auth.isGuest && guestAllowed)) {
    return children;
  }

  return <Navigate to="/login" />;
};

// El cuerpo y los números ya no son una sección aparte: sus juegos están en Juegos
// y las partes del cuerpo aparecen en las lecciones y el diccionario. Los enlaces viejos llevan ahí.
const OldBodyPage = () => {
  const params = new URLSearchParams(useLocation().search);
  const idioma = params.get('idioma') || 'quechua';
  const tema = params.get('tema') === 'numeros' ? 'numeros' : 'cuerpo';
  return <Navigate to={`/practica?idioma=${idioma}&juego=cuerpo-numeros&tema=${tema}`} replace />;
};

function App() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay token en la URL (viene de Google OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
      // Guardar el token de Google
      localStorage.setItem('token', tokenFromUrl);
      localStorage.removeItem('isGuest');
      
      // Limpiar la URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Obtener datos del usuario desde el backend
      fetch(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${tokenFromUrl}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            setIsGuest(false);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error getting user:', err);
          setLoading(false);
        });
    } else {
      // Login normal (sin Google)
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      const guestMode = localStorage.getItem('isGuest');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
      if (guestMode === 'true') {
        setIsGuest(true);
      }
      setLoading(false);
    }
  }, []);

  const auth = { loading, user, isGuest };

  // Envío diferido de eventos de aprendizaje (solo con consentimiento; ver services/telemetry.js)
  useEffect(() => {
    startTelemetry();
  }, []);
  const hasSession = Boolean(user) || isGuest;

  // Con sesión, lo más probable es ir al panel y a una lección:
  // se descargan cuando el navegador está libre, para que abran sin espera
  useEffect(() => {
    if (loading || !hasSession) return undefined;
    const preload = () => {
      Dashboard.preload();
      LessonView.preload();
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(preload, 1500);
    return () => clearTimeout(id);
  }, [loading, hasSession]);

  return (
    <LazyMotion features={loadMotionFeatures}>
    {/* reducedMotion="user": con "reducir movimiento" del sistema, Motion quita desplazamientos y deja los fundidos */}
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      {/* Avisos de toda la app (progreso guardado, insignias, favoritos, perfil).
          Arriba a la derecha (debajo del encabezado): nunca tapa el botón "Continuar" de las lecciones, que va abajo */}
      <OfflineBanner />
      <Suspense fallback={null}>
        <Notifications />
      </Suspense>
      <ClickSpark sparkColor="#16a34a" sparkCount={10} sparkRadius={26} sparkSize={12} duration={450}>
      <Suspense fallback={<LoadingScreen />}>
      <PageFade>
      <Routes>
        <Route path="/" element={<Home enableGuestMode={() => setIsGuest(true)} />} />
        <Route path="/login" element={<Login setUser={setUser} setIsGuest={setIsGuest} />} />
        <Route path="/register" element={<Register setUser={setUser} />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute auth={auth}>
              <Dashboard user={user} setUser={setUser} isGuest={isGuest} setIsGuest={setIsGuest} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/lesson/:lessonId" 
          element={
            <ProtectedRoute auth={auth}>
              <LessonView user={user} isGuest={isGuest} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute auth={auth} guestAllowed={false}>
              <Profile user={user} setUser={setUser} />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/practica"
          element={
            <ProtectedRoute auth={auth}>
              <Practice user={user} isGuest={isGuest} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cuerpo-numeros"
          element={<OldBodyPage />}
        />
        <Route path="/dictionary" element={<Dictionary />} />
        <Route path="/aula" element={<Classroom setUser={setUser} setIsGuest={setIsGuest} />} />
        <Route path="/evaluacion" element={<Evaluation />} />
        <Route
          path="/validacion"
          element={
            <ProtectedRoute auth={auth} guestAllowed={false}>
              <Validation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docente"
          element={
            <ProtectedRoute auth={auth} guestAllowed={false}>
              <Teacher />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/culture" 
          element={
            <ProtectedRoute auth={auth}>
              <CultureModule user={user} setUser={setUser} isGuest={isGuest} />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </PageFade>
      </Suspense>
      </ClickSpark>
    </BrowserRouter>
    </MotionConfig>
    </LazyMotion>
  );
}

export default App;
