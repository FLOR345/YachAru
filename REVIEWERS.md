# Verifying YachAru in five minutes

This guide lets a reviewer check the three main claims of YachAru on a fresh clone: neural speech synthesis trained on the languages, learner-level data export, and extensibility through language packs.

## 0. Start the platform (one command)

Requirements: Docker with Docker Compose.

```bash
git clone https://github.com/FLOR345/simiaru.git
cd simiaru
docker compose up --build
```

- App: http://localhost:8080 (use "Try without an account").
- API health: http://localhost:5000/health

The database is created from the real schema, the migrations and a dump of the full content (no personal data).

## 1. Neural speech synthesis trained on the languages

```bash
curl -s http://localhost:5000/api/validation/cobertura
```

The coverage endpoint returns, per language, the number of vocabulary rows, unique entries, rows with MMS audio, rows with human recordings, rows without audio, the MMS model used (`facebook/mms-tts-quz`, `facebook/mms-tts-ayr`) and the definition of every figure. The same figures are in `docs/cifras.md`.

In the app, open any lesson and press the speaker button: the audio is a file generated once with the MMS model of the language (not the browser's Spanish voice). Human recordings are labelled "Voz grabada".

The pipeline is in `tools/tts/generate_audio.py` and runs in GitHub Actions (`.github/workflows/audio-mms.yml`). Its tests: `cd tools/tts && python -m unittest -v test_generate_audio.py`.

## 2. Learner-level data export

- Schema and format: `backend/src/controllers/researchController.js` (`EXPORT_COLUMNS`).
- Synthetic sample with the exact export format: `database/samples/eventos_sinteticos.csv` and `.json`.
- In the app (with an account): Profile → "Mis datos" lets a learner give or withdraw consent, download their own events (CSV/JSON) and delete them.
- Researchers (accounts listed in `ADMIN_EMAILS`): `GET /api/research/export?format=csv|json`, pseudonymized (HMAC-SHA256), never with names, e-mails or internal ids.

## 3. Extensibility through language packs

With Node.js 22 on the host, while the platform is running:

```bash
cd backend && npm ci
node scripts/import-language.js ../languages/awajun --dry-run          # validates the pack only
DATABASE_URL=postgres://simiaru:simiaru@localhost:5433/simiaru DATABASE_SSL=false   node scripts/import-language.js ../languages/awajun                 # loads it into the Docker database
```

Check it through the API, with no code change:

```bash
curl -s "http://localhost:5000/api/lessons/units?idioma=awajun"
```

The importer also writes `frontend/src/languages/awajun.json`; rebuild the client (`docker compose up --build frontend`) to see the language in the interface.

`languages/awajun/paquete.json` is a complete pack for a third language (Awajún, data from the Intercontinental Dictionary Series, CC BY 4.0). The importer validates it, loads its unit, lessons and vocabulary, and writes the client configuration; no code changes. The template is `languages/plantilla/`, documented in `docs/paquete-de-idioma.md`. Continuous integration imports the pack on every commit and checks the resulting row count.

## Tests

```bash
cd backend && npm ci && npm test        # unit tests; API tests run when DATABASE_URL points to a database
cd frontend && npm ci && npm test       # normalizer, audio, voice grader, body/number data
```

All suites run in CI on every commit (`.github/workflows/ci.yml`), against a PostgreSQL instance loaded with the real schema, migrations and content.

## Licenses

- Code: MIT (`LICENSE`).
- Generated audio: CC BY-NC 4.0, inherited from the MMS models (`LICENSE-AUDIO.md`).
- Visual effects in `frontend/src/components/fx/` were written for this project and are MIT like the rest of the code.
