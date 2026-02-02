import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// URLs desde app.config.js extra (variables de entorno en .env)
// API_URL_DEV: para Expo Go. En dispositivo físico usa tu IP (ej: http://192.168.1.x:3001/api) o Railway
// API_URL_PROD: para builds de producción
const extra = Constants.expoConfig?.extra || {};
const API_URL_DEV = extra.apiUrlDev || 'http://localhost:3001/api';
const API_URL_PROD = extra.apiUrlProd || 'https://soldeser-production.up.railway.app/api';

const API_URL = __DEV__ ? API_URL_DEV : API_URL_PROD;

console.log('🔗 API URL:', API_URL, __DEV__ ? '(dev)' : '(prod)');

const api = axios.create({
  baseURL: API_URL,
  timeout: 45000, // 45s - Railway puede tardar en despertar (cold start)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error obteniendo token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el token expiró
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Limpiar token y redirigir a login
      await SecureStore.deleteItemAsync('authToken');
    }

    return Promise.reject(error);
  }
);

export { api, API_URL };
