# SimiAru 🦙

[English version](README.md)

**SimiAru** es una aplicación web para aprender **quechua** y **aymara**, las lenguas originarias de los Andes. Ofrece lecciones por unidades, un diccionario, contenido cultural, seguimiento de progreso y notificaciones.

> *Simi* significa "lengua/palabra" en quechua y *Aru* significa lo mismo en aymara.

## Demo

- Frontend: https://simiaru-3j6b.vercel.app

## Tecnologías

| Parte | Tecnologías |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS, Axios, Motion, Mantine 8, Sonner y efectos visuales propios |
| Backend | Node.js, Express, Passport (Google, Facebook, JWT) |
| Base de datos | PostgreSQL (Neon) |
| Servicios | Cloudinary (imágenes), Brevo (correos), node-cron |
| Despliegue | Vercel (frontend), Render (backend) |

## Estructura

```
SIMIARU/
├── backend/        API en Express
│   └── src/
│       ├── config/       base de datos, passport, cloudinary
│       ├── controllers/
│       ├── middleware/
│       ├── routes/       auth, lessons, progress, dictionary, culture, notifications
│       └── utils/
├── frontend/       App en React + Vite
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── context/
└── database/       migraciones y datos iniciales (SQL)
```

## Cómo ejecutarlo en tu computadora

**La forma más rápida (un comando, necesita Docker):**

```bash
docker compose up --build
```

La app queda en http://localhost:8080 y la API en http://localhost:5000, con la base creada desde `database/schema.sql`, las migraciones y el contenido real (sin datos de personas). Para agregar una lengua, ver [docs/paquete-de-idioma.md](docs/paquete-de-idioma.md); para el audio MMS, [tools/tts/README.md](tools/tts/README.md).

**Sin Docker:**

### Requisitos

- Node.js 18 o superior
- Una base de datos PostgreSQL (local o gratuita en [Neon](https://neon.tech))

### 1. Base de datos

Crea la base de datos y ejecuta los scripts de `database/migrations` y luego `database/seeds`.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env    # luego completa los valores
npm run dev
```

El servidor queda en `http://localhost:5000` (prueba `http://localhost:5000/health`).

Variables obligatorias en `backend/.env`: `DATABASE_URL`, `JWT_SECRET` y `SESSION_SECRET`. El resto (Google, Facebook, Cloudinary, Resend) solo hace falta para esas funciones. Mira `backend/.env.example`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

La app queda en `http://localhost:5173`.

## Publicar en internet

- **Backend → Render (gratis):** en Render elige *New → Blueprint* y selecciona este repositorio. El archivo `render.yaml` configura todo; solo hay que pegar los valores de `backend/.env.example`. En el plan gratuito el servidor se duerme tras 15 minutos sin uso y tarda unos segundos en despertar.
- **Frontend → Vercel:** carpeta `frontend`, ya apunta al backend de Render (ver `frontend/src/config.js`).

## Seguridad

Las contraseñas y claves **nunca** se escriben en el código: van en archivos `.env`, que están en `.gitignore`.

## Autor

Proyecto desarrollado por [FLOR345](https://github.com/FLOR345) para el curso de Desarrollo de Software II.

## Licencia

- **Código:** [MIT](LICENSE). Puedes usarlo, modificarlo y redistribuirlo, manteniendo el aviso de copyright.
- **Efectos visuales** (`frontend/src/components/fx/`): escritos para SimiAru, con la misma licencia MIT del código.
- **Contenido lingüístico** (vocabulario, ejercicios y textos culturales): no está cubierto por la licencia MIT. Parte del vocabulario proviene de diccionarios del Ministerio de Educación de Chile, y su licencia de redistribución está pendiente de confirmar.

## Voz, evidencia y publicación

- **Voz:** el flujo en línea [`Audio MMS`](.github/workflows/audio-mms.yml) genera el audio con los modelos de Meta (`quz`, `ayr`) contra Neon y Cloudinary. Las voces grabadas no se reemplazan.
- **Cobertura en vivo:** https://simiaru.onrender.com/api/validation/cobertura
- **Validación:** `/validacion` (administradores) para revisar el léxico.
- **Estado del envío a SoftwareX:** [`docs/softwarex.md`](docs/softwarex.md). **Decisiones sobre IA:** [`docs/etica-e-ia.md`](docs/etica-e-ia.md).
