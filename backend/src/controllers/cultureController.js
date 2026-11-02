import { pool } from '../config/database.js';
import { isKnownLanguage } from '../utils/languages.js';
import { AppError } from '../middleware/errorHandler.js';

// ==========================================
// OBTENER CONTENIDO CULTURAL
// ==========================================

/**
 * Obtener contenido cultural con filtros avanzados
 * GET /api/culture?tipo=proverbio&idioma=quechua&dificultad=principiante
 */
export const getCulturalContent = async (req, res, next) => {
  try {
    const { tipo, idioma, dificultad, page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;
    
    // Validar idioma si se proporciona
    if (idioma) {
      if (!(await isKnownLanguage(idioma.toLowerCase()))) {
        throw new AppError('Idioma no soportado', 400);
      }
    }

    // Validar tipo si se proporciona
    if (tipo) {
      const validTypes = ['proverbio', 'cancion', 'cuento', 'adivinanza', 'refrán'];
      if (!validTypes.includes(tipo.toLowerCase())) {
        throw new AppError('Tipo no válido. Opciones: proverbio, cancion, cuento, adivinanza, refrán', 400);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construir query dinámica
    let query = `
      SELECT 
        c.*,
        ${userId ? `COALESCE(f.id IS NOT NULL, false) as es_favorito` : 'false as es_favorito'}
      FROM contenido_cultural c
      ${userId ? 'LEFT JOIN favoritos_cultura f ON c.id = f.contenido_id AND f.usuario_id = $1' : ''}
      WHERE 1=1
    `;

    const params = userId ? [userId] : [];
    
    if (tipo) {
      params.push(tipo.toLowerCase());
      query += ` AND c.tipo = $${params.length}`;
    }
    
    if (idioma) {
      params.push(idioma.toLowerCase());
      query += ` AND c.idioma = $${params.length}`;
    }

    if (dificultad) {
      params.push(dificultad.toLowerCase());
      query += ` AND c.dificultad = $${params.length}`;
    }
    
    query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET ${offset}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    // Contar total para paginación
    let countQuery = `SELECT COUNT(*) as total FROM contenido_cultural WHERE 1=1`;
    const countParams = [];
    
    if (tipo) {
      countParams.push(tipo.toLowerCase());
      countQuery += ` AND tipo = $${countParams.length}`;
    }
    if (idioma) {
      countParams.push(idioma.toLowerCase());
      countQuery += ` AND idioma = $${countParams.length}`;
    }
    if (dificultad) {
      countParams.push(dificultad.toLowerCase());
      countQuery += ` AND dificultad = $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({ 
      success: true,
      count: result.rows.length,
      content: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener contenido cultural por ID
 * GET /api/culture/:id
 */
export const getContentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id || isNaN(parseInt(id))) {
      throw new AppError('ID de contenido inválido', 400);
    }

    const result = await pool.query(
      `SELECT 
        c.*,
        ${userId ? `COALESCE(f.id IS NOT NULL, false) as es_favorito,` : ''}
        ${userId ? `f.fecha_agregado` : 'NULL as fecha_agregado'}
      FROM contenido_cultural c
      ${userId ? 'LEFT JOIN favoritos_cultura f ON c.id = f.contenido_id AND f.usuario_id = $2' : ''}
      WHERE c.id = $1`,
      userId ? [id, userId] : [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Contenido cultural no encontrado', 404);
    }

    // Incrementar contador de vistas
    await pool.query(
      'UPDATE contenido_cultural SET vistas = vistas + 1 WHERE id = $1',
      [id]
    );

    res.json({ 
      success: true, 
      content: result.rows[0] 
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener contenido cultural aleatorio (para "Contenido del día")
 * GET /api/culture/random?idioma=quechua&tipo=proverbio
 */
export const getRandomContent = async (req, res, next) => {
  try {
    const { idioma, tipo } = req.query;
    const userId = req.user?.id;

    // Validar idioma
    if (!idioma) {
      throw new AppError('El parámetro "idioma" es requerido', 400);
    }

    if (!(await isKnownLanguage(idioma.toLowerCase()))) {
      throw new AppError('Idioma no soportado', 400);
    }

    let query = `
      SELECT 
        c.*,
        ${userId ? `COALESCE(f.id IS NOT NULL, false) as es_favorito` : 'false as es_favorito'}
      FROM contenido_cultural c
      ${userId ? 'LEFT JOIN favoritos_cultura f ON c.id = f.contenido_id AND f.usuario_id = $2' : ''}
      WHERE c.idioma = $1
    `;

    const params = [idioma.toLowerCase()];

    if (tipo) {
      params.push(tipo.toLowerCase());
      query += ` AND c.tipo = $${params.length}`;
    }

    if (userId && !tipo) {
      params.push(userId);
    }

    query += ` ORDER BY RANDOM() LIMIT 1`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new AppError('No hay contenido cultural disponible', 404);
    }

    // Incrementar vistas
    await pool.query(
      'UPDATE contenido_cultural SET vistas = vistas + 1 WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({ 
      success: true, 
      content: result.rows[0] 
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Buscar contenido cultural
 * GET /api/culture/search?query=pacha&idioma=quechua
 */
export const searchCulturalContent = async (req, res, next) => {
  try {
    const { query, idioma, tipo } = req.query;
    const userId = req.user?.id;

    if (!query || query.trim().length < 2) {
      return res.json({ 
        success: true, 
        content: [], 
        message: 'Escribe al menos 2 caracteres' 
      });
    }

    if (!idioma) {
      throw new AppError('El parámetro "idioma" es requerido', 400);
    }

    let sqlQuery = `
      SELECT 
        c.*,
        ${userId ? `COALESCE(f.id IS NOT NULL, false) as es_favorito` : 'false as es_favorito'}
      FROM contenido_cultural c
      ${userId ? 'LEFT JOIN favoritos_cultura f ON c.id = f.contenido_id AND f.usuario_id = $3' : ''}
      WHERE c.idioma = $1
      AND (
        c.titulo ILIKE $2
        OR c.contenido_original ILIKE $2
        OR c.traduccion ILIKE $2
        OR c.explicacion ILIKE $2
      )
    `;

    const params = [idioma.toLowerCase(), `%${query.trim()}%`];

    if (tipo) {
      params.push(tipo.toLowerCase());
      sqlQuery += ` AND c.tipo = $${params.length}`;
    }

    if (userId) {
      if (!tipo) {
        params.push(userId);
      }
    }

    sqlQuery += ` ORDER BY c.vistas DESC LIMIT 50`;

    const result = await pool.query(sqlQuery, params);

    res.json({ 
      success: true, 
      count: result.rows.length,
      content: result.rows 
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener tipos de contenido disponibles con conteos
 * GET /api/culture/types?idioma=aymara
 */
export const getContentTypes = async (req, res, next) => {
  try {
    const { idioma } = req.query;

    if (!idioma) {
      throw new AppError('El parámetro "idioma" es requerido', 400);
    }

    const result = await pool.query(
      `SELECT 
        tipo,
        COUNT(*) as count,
        to_json((array_agg(json_build_object('id', id, 'titulo', titulo, 'vistas', vistas) ORDER BY vistas DESC))[1:3]) as mas_populares
      FROM contenido_cultural
      WHERE idioma = $1
      GROUP BY tipo
      ORDER BY count DESC`,
      [idioma.toLowerCase()]
    );

    res.json({
      success: true,
      count: result.rows.length,
      types: result.rows
    });

  } catch (error) {
    next(error);
  }
};

// ==========================================
// FAVORITOS CULTURALES
// ==========================================

/**
 * Agregar contenido a favoritos
 * POST /api/culture/favorites/:contentId
 */
export const addToFavorites = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Usuario no autenticado', 401);
    }

    if (!contentId || isNaN(parseInt(contentId))) {
      throw new AppError('ID de contenido inválido', 400);
    }

    // Verificar que el contenido existe
    const contentCheck = await pool.query(
      'SELECT id FROM contenido_cultural WHERE id = $1',
      [contentId]
    );

    if (contentCheck.rows.length === 0) {
      throw new AppError('Contenido cultural no encontrado', 404);
    }

    // Insertar favorito (ignorar si ya existe)
    await pool.query(
      `INSERT INTO favoritos_cultura (usuario_id, contenido_id, fecha_agregado)
       VALUES ($1, $2, NOW())
       ON CONFLICT (usuario_id, contenido_id) DO NOTHING`,
      [userId, contentId]
    );

    res.status(201).json({
      success: true,
      message: 'Contenido agregado a favoritos'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Quitar contenido de favoritos
 * DELETE /api/culture/favorites/:contentId
 */
export const removeFromFavorites = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Usuario no autenticado', 401);
    }

    await pool.query(
      'DELETE FROM favoritos_cultura WHERE usuario_id = $1 AND contenido_id = $2',
      [userId, contentId]
    );

    res.json({
      success: true,
      message: 'Contenido quitado de favoritos'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener favoritos del usuario
 * GET /api/culture/favorites?idioma=quechua&tipo=cancion
 */
export const getFavorites = async (req, res, next) => {
  try {
    const { idioma, tipo } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Usuario no autenticado', 401);
    }

    let query = `
      SELECT 
        c.*,
        f.fecha_agregado,
        true as es_favorito
      FROM favoritos_cultura f
      JOIN contenido_cultural c ON f.contenido_id = c.id
      WHERE f.usuario_id = $1
    `;

    const params = [userId];

    if (idioma) {
      params.push(idioma.toLowerCase());
      query += ` AND c.idioma = $${params.length}`;
    }

    if (tipo) {
      params.push(tipo.toLowerCase());
      query += ` AND c.tipo = $${params.length}`;
    }

    query += ` ORDER BY f.fecha_agregado DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      favorites: result.rows
    });

  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMINISTRACIÓN (SOLO ADMIN)
// ==========================================

/**
 * Crear nuevo contenido cultural
 * POST /api/culture
 */
export const createCulturalContent = async (req, res, next) => {
  try {
    const {
      tipo,
      titulo,
      contenido_original,
      traduccion,
      explicacion,
      idioma,
      audio_url,
      imagen_url,
      autor,
      region,
      dificultad,
      tags
    } = req.body;

    // Validaciones
    if (!tipo || !titulo || !contenido_original || !idioma) {
      throw new AppError('Campos requeridos: tipo, titulo, contenido_original, idioma', 400);
    }

    const validTypes = ['proverbio', 'cancion', 'cuento', 'adivinanza', 'refrán'];
    if (!validTypes.includes(tipo.toLowerCase())) {
      throw new AppError('Tipo no válido. Opciones: proverbio, cancion, cuento, adivinanza, refrán', 400);
    }

    if (!(await isKnownLanguage(idioma.toLowerCase()))) {
      throw new AppError('Idioma no soportado', 400);
    }

    const result = await pool.query(
      `INSERT INTO contenido_cultural (
        tipo, titulo, contenido_original, traduccion, explicacion,
        idioma, audio_url, imagen_url, autor, region, dificultad, 
        tags, vistas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)
      RETURNING *`,
      [
        tipo.toLowerCase(),
        titulo,
        contenido_original,
        traduccion || null,
        explicacion || null,
        idioma.toLowerCase(),
        audio_url || null,
        imagen_url || null,
        autor || null,
        region || null,
        dificultad || 'intermedio',
        tags || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Contenido cultural creado exitosamente',
      content: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Importación masiva de contenido cultural
 * POST /api/culture/bulk
 */
export const bulkImportContent = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const { content } = req.body;

    if (!Array.isArray(content) || content.length === 0) {
      throw new AppError('Debes proporcionar un array de contenido', 400);
    }

    await client.query('BEGIN');

    let insertedCount = 0;
    let errors = [];

    for (let i = 0; i < content.length; i++) {
      const item = content[i];
      
      try {
        // Validar campos requeridos
        if (!item.tipo || !item.titulo || !item.contenido_original || !item.idioma) {
          errors.push({
            index: i,
            item: item,
            error: 'Faltan campos requeridos'
          });
          continue;
        }

        await client.query(
          `INSERT INTO contenido_cultural (
            tipo, titulo, contenido_original, traduccion, explicacion,
            idioma, audio_url, imagen_url, autor, region, dificultad, 
            tags, vistas
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)`,
          [
            item.tipo.toLowerCase(),
            item.titulo,
            item.contenido_original,
            item.traduccion || null,
            item.explicacion || null,
            item.idioma.toLowerCase(),
            item.audio_url || null,
            item.imagen_url || null,
            item.autor || null,
            item.region || null,
            item.dificultad || 'intermedio',
            item.tags || null
          ]
        );

        insertedCount++;
      } catch (error) {
        errors.push({
          index: i,
          item: item,
          error: error.message
        });
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `${insertedCount} contenidos importados exitosamente`,
      inserted: insertedCount,
      total: content.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Actualizar contenido cultural
 * PUT /api/culture/:id
 */
export const updateCulturalContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id || isNaN(parseInt(id))) {
      throw new AppError('ID de contenido inválido', 400);
    }

    // Verificar que existe
    const contentCheck = await pool.query(
      'SELECT id FROM contenido_cultural WHERE id = $1',
      [id]
    );

    if (contentCheck.rows.length === 0) {
      throw new AppError('Contenido cultural no encontrado', 404);
    }

    // Campos permitidos para actualizar
    const allowedFields = [
      'tipo', 'titulo', 'contenido_original', 'traduccion', 'explicacion',
      'audio_url', 'imagen_url', 'autor', 'region', 'dificultad', 'tags'
    ];

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new AppError('No hay campos para actualizar', 400);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE contenido_cultural 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json({
      success: true,
      message: 'Contenido actualizado exitosamente',
      content: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar contenido cultural
 * DELETE /api/culture/:id
 */
export const deleteCulturalContent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new AppError('ID de contenido inválido', 400);
    }

    const result = await pool.query(
      'DELETE FROM contenido_cultural WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Contenido cultural no encontrado', 404);
    }

    res.json({
      success: true,
      message: 'Contenido eliminado exitosamente'
    });

  } catch (error) {
    next(error);
  }
};

// ==========================================
// ESTADÍSTICAS
// ==========================================

/**
 * Obtener estadísticas del contenido cultural
 * GET /api/culture/stats?idioma=quechua
 */
export const getCulturalStats = async (req, res, next) => {
  try {
    const { idioma } = req.query;

    if (!idioma) {
      throw new AppError('El parámetro "idioma" es requerido', 400);
    }

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_contenido,
        COUNT(DISTINCT tipo) as tipos_diferentes,
        SUM(vistas) as total_vistas,
        json_object_agg(tipo, count_tipo) as contenido_por_tipo,
        (
          SELECT json_agg(popular)
          FROM (
            SELECT id, titulo, tipo, vistas
            FROM contenido_cultural
            WHERE idioma = $1
            ORDER BY vistas DESC
            LIMIT 5
          ) popular
        ) as mas_populares
      FROM contenido_cultural
      CROSS JOIN LATERAL (
        SELECT COUNT(*) as count_tipo
        FROM contenido_cultural c2
        WHERE c2.tipo = contenido_cultural.tipo AND c2.idioma = $1
      ) counts
      WHERE idioma = $1`,
      [idioma.toLowerCase()]
    );

    res.json({
      success: true,
      stats: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener contenido más popular
 * GET /api/culture/popular?idioma=aymara&limit=10
 */
export const getPopularContent = async (req, res, next) => {
  try {
    const { idioma, tipo, limit = 10 } = req.query;

    if (!idioma) {
      throw new AppError('El parámetro "idioma" es requerido', 400);
    }

    let query = `
      SELECT *
      FROM contenido_cultural
      WHERE idioma = $1
    `;

    const params = [idioma.toLowerCase()];

    if (tipo) {
      params.push(tipo.toLowerCase());
      query += ` AND tipo = $${params.length}`;
    }

    params.push(parseInt(limit));
    query += ` ORDER BY vistas DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      content: result.rows
    });

  } catch (error) {
    next(error);
  }
};