// Aplicación Express de YachAru (sin conectar ni escuchar): la usan server.js y las pruebas.
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import dictionaryRoutes from './routes/dictionaryRoutes.js';
import cultureRoutes from './routes/cultureRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import researchRoutes from './routes/researchRoutes.js';
import classroomRoutes from './routes/classroomRoutes.js';
import validationRoutes from './routes/validationRoutes.js';

const app = express();

// Render (y otros servicios) ponen un proxy delante: necesario para cookies seguras
app.set('trust proxy', 1);

// Middleware CORS configurado
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://simiaru-3j6b.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

// Cabeceras de seguridad (la API no sirve HTML, así que la política de contenido es mínima)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Límite de peticiones: generoso para el uso normal, estricto para el inicio de sesión y el registro
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false });
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
});
// En pruebas automáticas no se limita (las pruebas hacen muchas peticiones seguidas)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api', apiLimiter);
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/change-password', '/api/classroom/join', '/api/classroom/login', '/api/validation/evaluacion/entrar'], authLimiter);
}

app.use(express.json({ limit: '200kb' }));

// ===== CONFIGURAR SESIONES (para Passport) =====
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ===== IMPORTAR E INICIALIZAR PASSPORT DE FORMA DINÁMICA =====
const passportModule = await import('./config/passport.js');
const passport = passportModule.default;

app.use(passport.initialize());
app.use(passport.session());

// ===== RUTAS =====
app.use('/api/auth', authRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/culture', cultureRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/classroom', classroomRoutes);
app.use('/api/validation', validationRoutes);

// ===== RUTA DE SALUD (para verificar que el servidor funciona) =====
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// ===== RUTAS INEXISTENTES Y ERRORES (errorHandler existía pero nunca se montaba) =====
app.use(notFound);
app.use(errorHandler);

export default app;
