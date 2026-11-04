# SimiAru

**An open-source, extensible web platform for teaching and studying Quechua and Aymara, with neural speech synthesis and learner-level data export.**

*Simi* means "word/language" in Quechua and *aru* means the same in Aymara. SimiAru was built in Puno, Peru, by Quechua speakers of the region, as a tool the language community can inspect, modify and reuse.

[Versión en español](README.es.md) · Live demo: https://simiaru-3j6b.vercel.app

---

## What makes it different

| | SimiAru |
| --- | --- |
| **Open and auditable** | MIT-licensed code; anyone can inspect, modify and deploy it. |
| **Speech trained on the language** | Audio is pre-generated once with Meta's MMS models (`facebook/mms-tts-quz` for Cusco-Collao Quechua, `facebook/mms-tts-ayr` for Central Aymara) instead of a Spanish synthesizer that erases glottalized and aspirated consonants. |
| **Research instrument** | Learning events (answer, result, response time, audio plays) are recorded **only with explicit consent**, pseudonymized, and exportable as CSV/JSON. |
| **Extensible by language packs** | A new language is one configuration file and one command. No application code changes. |
| **Works offline** | Installable PWA; opened lessons work without connection and progress syncs later. |
| **Classroom mode** | Student accounts by code, with no email or personal data. |

## Run it in one command

Requirements: Docker.

```bash
docker compose up --build
```

- App: http://localhost:8080
- API: http://localhost:5000/health
- PostgreSQL: `localhost:5433` (user/password/db: `simiaru`)

The database is created from the real schema (`database/schema.sql`), the migrations (`database/migrations/`) and the content seed (`database/seed/contenido.sql`: 25 units, 92 lessons, 1,521 vocabulary rows, 879 exercises, 69 cultural texts; no personal data; current figures in `docs/cifras.md`).

## Verify the three claims in five minutes

**1. Neural speech synthesis**

Coverage is computed live from the database, with the counting criteria included in the response:

```bash
curl https://simiaru.onrender.com/api/validation/cobertura
```

Open any dictionary entry: each one states its voice source (*MMS synthetic voice*, *Recorded voice* or *Browser voice*). The audio is generated online by the [`Audio MMS`](.github/workflows/audio-mms.yml) GitHub Actions workflow, against the production database and Cloudinary. Human recordings already in the platform are registered as such and never replaced. See [`tools/tts/README.md`](tools/tts/README.md).

**2. Learner-level data export**

Create an account in the app, accept the consent dialog, complete a lesson, then open *Profile → My learning data → Download CSV/JSON*. A synthetic example with the same format is in [`database/samples/`](database/samples/). Export format: `participante` (HMAC pseudonym), `sesion`, `tipo`, `idioma`, `leccion_id`, `ejercicio_id`, `vocabulario_id`, `tipo_ejercicio`, `resultado` (`correcto` / `variante` / `incorrecto`), `respuesta`, `esperado`, `intento`, `duracion_ms`, `ocurrido_en`.

**3. Extensibility by language packs**

```bash
cd backend
npm run import-language -- ../languages/plantilla --dry-run   # the template is rejected until completed
npm run import-language -- ../languages/awajun --dry-run      # a third language in a single file
```

[`languages/awajun`](languages/awajun) is a technical demonstration built from the Intercontinental Dictionary Series (CC BY 4.0) with its MMS voice model declared in the pack. CI imports it on every push. It has not been reviewed by Awajún speakers, so it is not published on the live platform. See [`docs/paquete-de-idioma.md`](docs/paquete-de-idioma.md).

## Validation evidence

Everything is collected online and computed from the database. No result is written by hand.

- **Lexicon review by speakers:** `/validacion` (administrators) records each decision with its original value.

See [`docs/softwarex.md`](docs/softwarex.md) for the submission status and [`docs/etica-e-ia.md`](docs/etica-e-ia.md) for the AI decisions.

## Tests

```bash
cd backend && npm test      # unit tests; integration tests run when TEST_DATABASE_URL points to a local/CI database
cd frontend && npm test     # dialect normalizer, voice selection
cd tools/tts && python -m unittest test_generate_audio.py   # audio pipeline, protection of recordings
```

CI (`.github/workflows/ci.yml`) loads the real schema and content into PostgreSQL, runs all test suites, imports a third language, builds the frontend and starts the full stack with Docker Compose.

## Architecture

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS, Motion, Mantine 8, Sonner; PWA (manifest + service worker) |
| Backend | Node.js 22, Express, Passport (JWT; Google/Facebook optional), helmet, rate limiting |
| Database | PostgreSQL (Neon in production) |
| Speech | Meta MMS (VITS) via Hugging Face Transformers; audio stored in Cloudinary |

```
frontend/        React app (src/languages: language packs; src/utils/normalizer.js: dialect normalizer)
backend/         Express API (src/app.js), scripts (migrate, import-language, dump-schema, dump-content)
database/        schema.sql, migrations/, seed/contenido.sql, samples/ (synthetic dataset)
languages/       language pack template
tools/tts/       MMS audio generation pipeline
docs/            documentation
```

**Dialect normalizer.** Written answers are classified as *correct*, *correct with a variant* or *incorrect*. Variant rules (trivocalic e/o → i/u, q/k alternation, unmarked glottalized and aspirated consonants, Spanish-style spellings such as *hu-*, *c-*, *qu-*) live in each language pack and were written from knowledge of the variety, not generated by a language model.

## Design decisions and limitations

- MMS audio is **synthetic**, not recorded by native speakers; a few entries keep human recordings, labelled as such. No Puno-specific model exists; `quz` (Cusco-Collao) is the closest variety.
- A language model was deliberately **not** used to generate Quechua or Aymara content (invented morphology, mixed varieties), and speech recognition was **not** used to grade pronunciation (high error rates in these languages make false negatives discouraging).
- Learning data is collected only with consent, can be downloaded and deleted by the learner, and is exported only under a pseudonym.

## Licenses

- **Code:** [MIT](LICENSE).
- **Generated audio:** [CC BY-NC 4.0](LICENSE-AUDIO.md), inherited from the MMS models.
- **Visual effects** (`frontend/src/components/fx/`): written for SimiAru, MIT like the rest of the code.
- **Linguistic content:** not covered by the MIT license. Part of the Aymara vocabulary comes from dictionaries of Chile's Ministry of Education; redistribution terms are pending confirmation.

## Cite

See [`CITATION.cff`](CITATION.cff).

## Author

Developed by [FLOR345](https://github.com/FLOR345) in Puno, Peru.
