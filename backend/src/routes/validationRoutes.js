import express from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validation.js';
import {
  getAudioIndex,
  getCoverage,
  createSample,
  createEvaluators,
  listEvaluators,
  enterEvaluation,
  answerEvaluation,
  getResults,
  listLexicon,
  reviewWord,
  addMissingWord,
} from '../controllers/validationController.js';

const router = express.Router();
const admin = [protect, isAdmin];

// Públicas
router.get('/audios/:idioma', getAudioIndex);
router.get('/cobertura', getCoverage);

// Quien evalúa entra con su código, sin cuenta ni datos personales
router.post('/evaluacion/entrar', validate(schemas.evaluationEnter), enterEvaluation);
router.post('/evaluacion/responder', validate(schemas.evaluationAnswer), answerEvaluation);

// Administración
router.post('/muestra', admin, validate(schemas.evaluationSample), createSample);
router.post('/evaluadores', admin, validate(schemas.evaluators), createEvaluators);
router.get('/evaluadores', admin, validate(schemas.byLanguage, 'query'), listEvaluators);
router.get('/resultados', admin, validate(schemas.byLanguage, 'query'), getResults); // ?format=csv
router.get('/lexico', admin, validate(schemas.byLanguage, 'query'), listLexicon);
router.put('/lexico/:id', admin, validate(schemas.wordReview), reviewWord);
router.post('/lexico-faltante', admin, validate(schemas.missingWord), addMissingWord);

export default router;
