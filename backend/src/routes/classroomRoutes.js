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

const router = express.Router();

// Estudiante: su aula (va antes de las rutas con :id)
router.get('/student/me', protect, myClassroomAsStudent);

// Docente
router.post('/', protect, validate(schemas.classroom), createClassroom);
router.get('/mine', protect, myClassrooms);
router.get('/:id/progress', protect, classroomProgress);
router.get('/:id/export', protect, exportClassroom);   // ?format=csv | json

// Estudiante (sin correo)
router.post('/join', validate(schemas.joinClassroom), joinClassroom);
router.post('/login', studentLogin);

export default router;
