import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validation.js';
import {
  createClassroom,
  myClassrooms,
  classroomProgress,
  exportClassroom,
  joinClassroom,
  studentLogin,
  myClassroomAsStudent,
} from '../controllers/classroomController.js';
import { createTest, listTests, testResults, updateTest, deleteTest, myTests, studyTest, startTest, submitTest } from '../controllers/testsController.js';

const router = express.Router();

// Estudiante: su aula (va antes de las rutas con :id)
router.get('/student/me', protect, myClassroomAsStudent);
router.get('/student/tests', protect, myTests);
router.get('/student/tests/:testId/study', protect, studyTest);
router.post('/student/tests/:testId/start', protect, startTest);
router.post('/student/tests/:testId/attempts/:attemptId', protect, submitTest);

// Docente
router.post('/', protect, validate(schemas.classroom), createClassroom);
router.get('/mine', protect, myClassrooms);
router.get('/:id/progress', protect, classroomProgress);
router.get('/:id/export', protect, exportClassroom);
// Pruebas del aula: unidad completa o sesión breve
router.post('/:id/tests', protect, createTest);
router.get('/:id/tests', protect, listTests);
router.get('/:id/tests/:testId', protect, testResults);
router.patch('/:id/tests/:testId', protect, updateTest);
router.delete('/:id/tests/:testId', protect, deleteTest);   // ?format=csv | json

// Estudiante (sin correo)
router.post('/join', validate(schemas.joinClassroom), joinClassroom);
router.post('/login', studentLogin);

export default router;
