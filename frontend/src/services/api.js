// frontend/src/services/api.js
import axios from 'axios';

// ==================== CONFIGURACIÓN BASE ====================
import { API_URL } from '../config.js'; // ver src/config.js

console.log('🌐 API URL configurada:', API_URL);

// ==================== INSTANCIA DE AXIOS ====================
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ==================== INTERCEPTOR DE REQUEST ====================
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Error en request:', error);
    return Promise.reject(error);
  }
);

// ==================== INTERCEPTOR DE RESPONSE ====================
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method.toUpperCase()} ${response.config.url} - OK`);
    return response;
  },
  (error) => {
    console.error('❌ Error en response:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    // Si el token expiró o es inválido, redirigir al login
    if (error.response?.status === 401) {
      console.warn('🔐 Token inválido o expirado');
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ==================== API ENDPOINTS ====================
export const api = {
  // ===== AUTH =====
  login: (credentials) => 
    axiosInstance.post('/api/auth/login', credentials),
  
  register: (data) => 
    axiosInstance.post('/api/auth/register', data),
  
  getProfile: () => 
    axiosInstance.get('/api/auth/profile'),
  
  updateProfile: (data) => 
    axiosInstance.put('/api/auth/profile', data),
  
  changePassword: (data) => 
    axiosInstance.put('/api/auth/change-password', data),
  
  hasPassword: () => 
    axiosInstance.get('/api/auth/has-password'),

  // ===== LESSONS =====
  getUnits: (idioma) => 
    axiosInstance.get(`/api/lessons/units?idioma=${idioma}`),
  
  getLessonsByUnit: (unitId) => 
    axiosInstance.get(`/api/lessons/units/${unitId}/lessons`),
  
  // 🔥 CORRECCIÓN: Eliminar "lessons" duplicado
  getLessonContent: (lessonId) => 
    axiosInstance.get(`/api/lessons/${lessonId}`),

  // ===== PROGRESS =====
  saveProgress: (data) => 
    axiosInstance.post('/api/progress/save', data),
  
  getProgress: () => 
    axiosInstance.get('/api/progress'),
  
  updateStreak: () => 
    axiosInstance.post('/api/progress/streak'),
  
  getUserBadges: () => 
    axiosInstance.get('/api/progress/badges'),
  
  getAllBadges: () => 
    axiosInstance.get('/api/progress/badges/all'),

  // ===== DICTIONARY =====
  searchWord: (query, idioma) => 
    axiosInstance.get(`/api/dictionary/search?query=${query}&idioma=${idioma}`),
  
  getCategories: (idioma) => 
    axiosInstance.get(`/api/dictionary/categories?idioma=${idioma}`),

  // ===== CULTURE =====
  getCulturalContent: (tipo, idioma) => 
    axiosInstance.get(`/api/culture?tipo=${encodeURIComponent(tipo)}&idioma=${encodeURIComponent(idioma)}`),

  // ===== DATOS DE APRENDIZAJE (consentimiento y exportación) =====
  // Correo de prueba al usuario de la sesión (para comprobar que llegan los correos de progreso)
  sendTestEmail: () => axiosInstance.post('/api/notifications/test'),
  getConsent: () => axiosInstance.get('/api/research/consent'),
  setConsent: (consiente) => axiosInstance.put('/api/research/consent', { consiente }),
  deleteMyEvents: () => axiosInstance.delete('/api/research/events/me'),
  // Descarga un archivo autenticado (CSV o JSON) y lo guarda con su nombre
  download: async (path, filename) => {
    const res = await axiosInstance.get(path, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  // ===== MODO AULA =====
  createClassroom: (data) => axiosInstance.post('/api/classroom', data),
  getMyClassrooms: () => axiosInstance.get('/api/classroom/mine'),
  getClassroomProgress: (id) => axiosInstance.get(`/api/classroom/${id}/progress`),
  joinClassroom: (data) => axiosInstance.post('/api/classroom/join', data),
  studentLogin: (codigoEstudiante) => axiosInstance.post('/api/classroom/login', { codigoEstudiante }),
  getMyClassroomAsStudent: () => axiosInstance.get('/api/classroom/student/me'),
  // Pruebas del aula (docente)
  createClassroomTest: (aulaId, data) => axiosInstance.post(`/api/classroom/${aulaId}/tests`, data),
  getClassroomTests: (aulaId) => axiosInstance.get(`/api/classroom/${aulaId}/tests`),
  getClassroomTestResults: (aulaId, testId) => axiosInstance.get(`/api/classroom/${aulaId}/tests/${testId}`),
  updateClassroomTest: (aulaId, testId, data) => axiosInstance.patch(`/api/classroom/${aulaId}/tests/${testId}`, data),
  deleteClassroomTest: (aulaId, testId) => axiosInstance.delete(`/api/classroom/${aulaId}/tests/${testId}`),
  // Pruebas del aula (estudiante)
  getMyTests: () => axiosInstance.get('/api/classroom/student/tests'),
  studyTest: (testId) => axiosInstance.get(`/api/classroom/student/tests/${testId}/study`),
  startTest: (testId) => axiosInstance.post(`/api/classroom/student/tests/${testId}/start`),
  submitTest: (testId, attemptId, respuestas) => axiosInstance.post(`/api/classroom/student/tests/${testId}/attempts/${attemptId}`, { respuestas }),

  // ===== VALIDACIÓN (cobertura, evaluación perceptual y revisión del léxico) =====
  getCoverage: () => axiosInstance.get('/api/validation/cobertura'),
  getEvaluationLanguages: () => axiosInstance.get('/api/validation/evaluacion/lenguas'),
  joinEvaluation: (data) => axiosInstance.post('/api/validation/evaluacion/unirse', data),
  enterEvaluation: (data) => axiosInstance.post('/api/validation/evaluacion/entrar', data),
  answerEvaluation: (data) => axiosInstance.post('/api/validation/evaluacion/responder', data),
  createEvaluationSample: (data) => axiosInstance.post('/api/validation/muestra', data),
  createEvaluators: (data) => axiosInstance.post('/api/validation/evaluadores', data),
  getEvaluators: (idioma) => axiosInstance.get('/api/validation/evaluadores', { params: { idioma } }),
  getEvaluationResults: (idioma) => axiosInstance.get('/api/validation/resultados', { params: { idioma } }),
  getLexicon: (params) => axiosInstance.get('/api/validation/lexico', { params }),
  reviewWord: (id, data) => axiosInstance.put(`/api/validation/lexico/${id}`, data),
  // Grabación de una hablante para una palabra (reemplaza la voz sintética en toda la app)
  uploadWordRecording: (id, blob) => {
    const form = new FormData();
    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    form.append('audio', blob, `grabacion.${ext}`);
    // multipart: con el JSON por defecto, axios convertiría el archivo en texto
    return axiosInstance.post(`/api/dictionary/audio/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  addMissingWord: (data) => axiosInstance.post('/api/validation/lexico-faltante', data),
};

// ==================== EXPORT DEFAULT ====================
export default axiosInstance;