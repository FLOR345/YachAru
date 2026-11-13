import { pool } from '../config/database.js';
import cloudinary from '../config/cloudinary.js';
import { audioKey } from '../utils/phonology.js';

export const searchWord = async (req, res) => {
  try {
    const { query, idioma } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json({ success: true, words: [] });
    }
    
    // % y _ se buscan como texto, no como comodines de LIKE
    const like = (text) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const term = query.trim();
    // En la palabra originaria se ignoran los apóstrofos: p'unchay, p’unchay y punchay se encuentran entre sí
    const termWithoutApostrophes = term.replace(/['’‘´`ʼ]/g, '');

    const result = await pool.query(
      `SELECT v.*, l.titulo as leccion_nombre, u.nombre as unidad_nombre
       FROM vocabulario v
       JOIN lecciones l ON v.leccion_id = l.id
       JOIN unidades u ON l.unidad_id = u.id
       WHERE (v.palabra_espanol ILIKE $1
              OR translate(v.palabra_objetivo, '''’‘´\`ʼ', '') ILIKE $3)
       AND u.idioma = $2
       ORDER BY v.palabra_espanol
       LIMIT 50`,
      [like(term), idioma, like(termWithoutApostrophes)]
    );
    
    res.json({ success: true, words: result.rows });
  } catch (error) {
    console.error('Error en searchWord:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { idioma } = req.query;
    
    const result = await pool.query(
      `SELECT v.categoria, COUNT(*) as count
       FROM vocabulario v
       JOIN lecciones l ON v.leccion_id = l.id
       JOIN unidades u ON l.unidad_id = u.id
       WHERE u.idioma = $1 AND v.categoria IS NOT NULL
       GROUP BY v.categoria
       ORDER BY count DESC`,
      [idioma]
    );
    
    res.json({ success: true, categories: result.rows });
  } catch (error) {
    console.error('Error en getCategories:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getWordsByCategory = async (req, res) => {
  try {
    const { categoria, idioma } = req.query;
    
    const result = await pool.query(
      `SELECT v.*
       FROM vocabulario v
       JOIN lecciones l ON v.leccion_id = l.id
       JOIN unidades u ON l.unidad_id = u.id
       WHERE v.categoria = $1 AND u.idioma = $2
       ORDER BY v.palabra_espanol`,
      [categoria, idioma]
    );
    
    res.json({ success: true, words: result.rows });
  } catch (error) {
    console.error('Error en getWordsByCategory:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllWords = async (req, res) => {
  try {
    const { idioma } = req.query;
    
    const result = await pool.query(
      `SELECT v.*, l.titulo as leccion_nombre, u.nombre as unidad_nombre
       FROM vocabulario v 
       JOIN lecciones l ON v.leccion_id = l.id
       JOIN unidades u ON l.unidad_id = u.id
       WHERE u.idioma = $1
       ORDER BY v.palabra_espanol
       LIMIT 200`,
      [idioma]
    );
    
    res.json({ success: true, words: result.rows });
  } catch (error) {
    console.error('Error en getAllWords:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== NUEVAS FUNCIONES PARA AUDIO ====================

// Subir la grabación de una persona para una palabra.
// Vale para todas las filas de esa palabra en la lengua (la misma palabra puede estar en varias lecciones)
// y entra al índice de audio como voz grabada, que siempre va antes que la voz sintética.
export const uploadAudio = async (req, res) => {
  try {
    const { wordId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se envió ningún archivo de audio' });
    }
    const word = (
      await pool.query(
        `SELECT v.palabra_objetivo, u.idioma FROM vocabulario v
           JOIN lecciones l ON l.id = v.leccion_id JOIN unidades u ON u.id = l.unidad_id WHERE v.id = $1`,
        [wordId]
      )
    ).rows[0];
    if (!word) return res.status(404).json({ success: false, message: 'Palabra no encontrada' });
    const key = audioKey(word.palabra_objetivo);

    // Fuera de la carpeta del proceso MMS (simiaru/audio/): así la app la reconoce como grabación
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: `simiaru/grabaciones/${word.idioma}`, public_id: `palabra_${wordId}_${Date.now()}`, format: 'mp3' },
        (error, uploaded) => (error ? reject(error) : resolve(uploaded))
      );
      uploadStream.end(req.file.buffer);
    });
    const url = result.secure_url;

    // Todas las filas con la misma palabra (normalizada) en esa lengua
    const same = await pool.query(
      `SELECT v.id, v.palabra_objetivo FROM vocabulario v
         JOIN lecciones l ON l.id = v.leccion_id JOIN unidades u ON u.id = l.unidad_id WHERE u.idioma = $1`,
      [word.idioma]
    );
    const ids = same.rows.filter((r) => audioKey(r.palabra_objetivo) === key).map((r) => r.id);
    await pool.query('UPDATE vocabulario SET audio_url = $1 WHERE id = ANY($2)', [url, ids]);
    await pool.query(
      `INSERT INTO audios (idioma, clave, texto, url, fuente, voz) VALUES ($1, $2, $3, $4, 'grabado', 'unica')
       ON CONFLICT (idioma, clave, voz) DO UPDATE SET url = EXCLUDED.url, fuente = 'grabado', texto = EXCLUDED.texto`,
      [word.idioma, key, word.palabra_objetivo, url]
    );
    res.json({ success: true, message: 'Grabación guardada', audioUrl: url, filas: ids.length });
  } catch (error) {
    console.error('Error al subir audio:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar audio de una palabra
export const deleteAudio = async (req, res) => {
  try {
    const { wordId } = req.params;

    // Obtener la URL actual del audio
    const word = await pool.query('SELECT audio_url FROM vocabulario WHERE id = $1', [wordId]);
    
    if (word.rows[0]?.audio_url) {
      // Extraer el public_id de la URL de Cloudinary
      const urlParts = word.rows[0].audio_url.split('/');
      const publicId = urlParts.slice(-2).join('/').replace('.mp3', '');
      
      // Eliminar de Cloudinary
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    }

    // Actualizar la base de datos
    await pool.query('UPDATE vocabulario SET audio_url = NULL WHERE id = $1', [wordId]);

    res.json({ success: true, message: 'Audio eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar audio:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener audio de una palabra específica
export const getWordAudio = async (req, res) => {
  try {
    const { wordId } = req.params;
    
    const result = await pool.query(
      'SELECT id, palabra_objetivo, audio_url FROM vocabulario WHERE id = $1',
      [wordId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Palabra no encontrada' });
    }

    res.json({ success: true, word: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener audio:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};