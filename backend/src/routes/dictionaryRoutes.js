import express from 'express';
import multer from 'multer';
import { 
  searchWord, 
  getCategories, 
  getWordsByCategory, 
  getAllWords,
  uploadAudio,
  deleteAudio,
  getWordAudio
} from '../controllers/dictionaryController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configurar multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
  fileFilter: (req, file, cb) => {
    // Solo permitir archivos de audio
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
    if (allowedTypes.includes(String(file.mimetype).split(';')[0])) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten archivos de audio.'), false);
    }
  }
});

// Rutas existentes
router.get('/search', searchWord);
router.get('/categories', getCategories);
router.get('/category', getWordsByCategory);
router.get('/all', getAllWords);

// ==================== NUEVAS RUTAS PARA AUDIO ====================
// Subir o borrar audio modifica Cloudinary y la base: solo administradores
router.post('/audio/:wordId', protect, isAdmin, upload.single('audio'), uploadAudio);
router.delete('/audio/:wordId', protect, isAdmin, deleteAudio);
router.get('/audio/:wordId', getWordAudio);

// Ruta para stats
router.get('/stats', async (req, res) => {
  try {
    const { idioma } = req.query;
    const { pool } = await import('../config/database.js');
    
    const result = await pool.query(`
      SELECT COUNT(*) as total
      FROM vocabulario v
      JOIN lecciones l ON v.leccion_id = l.id
      JOIN unidades u ON l.unidad_id = u.id
      WHERE u.idioma = $1
    `, [idioma]);
    
    res.json({ 
      success: true, 
      totalWords: parseInt(result.rows[0].total) 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;